import { openDB } from "idb";
import JSZip from "jszip";

export interface FileMetadata {
  filename: string;
  mtime: string;
}

export class FileAccess {
  constructor(
    private rootDir: FileSystemDirectoryHandle,
    public type: "realfs" | "opfs",
  ) {}

  async saveFile(file: Blob, folder: string): Promise<string> {
    const resolvedDir = await followPath(this.rootDir, folder, true);

    // Create file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `snap-${timestamp}.png`;
    const fileHandle = await resolvedDir.getFileHandle(filename, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    return `Saved to local directory: ${filename}`;
  }

  async listFiles(folder: string): Promise<FileMetadata[]> {
    const resolvedDir = await followPath(this.rootDir, folder);
    if (!resolvedDir) {
      return [];
    }

    // List files
    const files: FileMetadata[] = [];
    for await (const entry of resolvedDir.values()) {
      if (entry.kind === "file") {
        const file = await (entry as FileSystemFileHandle).getFile();
        files.push({
          filename: entry.name,
          mtime: new Date(file.lastModified).toISOString(),
        });
      }
    }

    return files;
  }

  // our policy is "don't clean up blobs, just cache 'em so we don't
  // make too many"
  private blobCache = new Map<string, string>();

  async getFileContentsUrl(folder: string, filename: string): Promise<string> {
    const cacheKey = `${folder}/${filename}`;
    if (!this.blobCache.has(cacheKey)) {
      const resolvedDir = await followPath(this.rootDir, folder);
      if (!resolvedDir) {
        throw new Error(`Folder not found: ${folder}`);
      }

      const fileHandle = await resolvedDir.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const blobUrl = URL.createObjectURL(file);
      this.blobCache.set(cacheKey, blobUrl);
    }
    return this.blobCache.get(cacheKey)!;
  }

  async deleteFile(folder: string, filename: string): Promise<void> {
    const resolvedDir = await followPath(this.rootDir, folder);
    if (!resolvedDir) {
      throw new Error(`Folder not found: ${folder}`);
    }

    await resolvedDir.removeEntry(filename);

    // Clear from blob cache if present
    const cacheKey = `${folder}/${filename}`;
    if (this.blobCache.has(cacheKey)) {
      const blobUrl = this.blobCache.get(cacheKey)!;
      URL.revokeObjectURL(blobUrl);
      this.blobCache.delete(cacheKey);
    }
  }

  async downloadAsZip(): Promise<void> {
    const zip = new JSZip();

    // Recursively add all files from the root directory
    await this.addDirectoryToZip(zip, this.rootDir, "");

    // Generate the ZIP file
    const blob = await zip.generateAsync({ type: "blob" });

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `starfish-snaps-${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async uploadFromZip(zipFile: File): Promise<void> {
    const zip = await JSZip.loadAsync(zipFile);

    // Process each file in the ZIP
    for (const relativePath in zip.files) {
      const zipEntry = zip.files[relativePath];

      // Skip directories (they'll be created automatically)
      if (zipEntry.dir) continue;

      // Get the file blob
      const blob = await zipEntry.async("blob");

      // Split path into folder and filename
      const pathParts = relativePath.split("/");
      const filename = pathParts.pop()!;
      const folder = pathParts.join("/");

      // Create the directory structure if needed
      const targetDir = await followPath(this.rootDir, folder, true);

      // Write the file
      const fileHandle = await targetDir.getFileHandle(filename, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    }
  }

  private async addDirectoryToZip(
    zip: JSZip,
    dirHandle: FileSystemDirectoryHandle,
    path: string,
  ): Promise<void> {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "file") {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        zip.file(entryPath, file);
      } else if (entry.kind === "directory") {
        const subDirHandle = entry as FileSystemDirectoryHandle;
        await this.addDirectoryToZip(zip, subDirHandle, entryPath);
      }
    }
  }
}

async function followPath(
  root: FileSystemDirectoryHandle,
  path: string,
  create: true,
): Promise<FileSystemDirectoryHandle>;
async function followPath(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle | null>;
async function followPath(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemDirectoryHandle | null> {
  const pathParts = path.split("/").filter((p) => p && p !== ".");
  let currentDir = root;
  try {
    for (const part of pathParts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }
  } catch (err) {
    return null as any;
  }
  return currentDir;
}

export async function selectLocalDirectory(): Promise<FileAccess | null> {
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    await saveDirectoryHandle(handle);
    return new FileAccess(handle, "realfs");
  } catch (err) {
    console.error("Directory selection cancelled or failed:", err);
    await saveDirectoryHandle(null);
    return null;
  }
}

export async function opfsFileAccess(): Promise<FileAccess> {
  const handle = await navigator.storage.getDirectory();
  return new FileAccess(handle, "opfs");
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle | null) {
  const db = await openDB("FileAccessDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    },
  });
  if (!handle) {
    await db.delete("handles", "directoryHandle");
  } else {
    await db.put("handles", handle, "directoryHandle");
  }
}

export async function restoreDirectoryHandle(): Promise<FileAccess | null> {
  try {
    const db = await openDB("FileAccessDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("handles")) {
          db.createObjectStore("handles");
        }
      },
    });

    const handle = (await db.get("handles", "directoryHandle")) as
      | FileSystemDirectoryHandle
      | undefined;
    if (!handle) return null;

    // Verify permission
    let permission = await handle.queryPermission({ mode: "readwrite" });
    while (permission === "prompt") {
      permission = await handle.requestPermission({ mode: "readwrite" });
    }
    if (permission === "denied") {
      await db.delete("handles", "directoryHandle");
      return null;
    }
    return new FileAccess(
      handle,
      (await isOPFSHandle(handle)) ? "opfs" : "realfs",
    );
  } catch (err) {
    console.error("Failed to restore directory handle:", err);
    return null;
  }
}

export async function isOPFSHandle(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opfsRoot = await navigator.storage.getDirectory();
  const pathFromOpfs = await opfsRoot.resolve(handle);
  return !!pathFromOpfs;
}
