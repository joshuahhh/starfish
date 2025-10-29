export interface FileAccess {
  uploadFile(file: Blob, folder: string): Promise<string>;
  listFiles(folder: string): Promise<string[]>;
}

export class FileAccessFromServer implements FileAccess {
  constructor(private baseUrl: string) {}

  async uploadFile(file: Blob, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file, "image.png");
    formData.append("folder", folder);

    const res = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${await res.text()}`);
    }

    return await res.text();
  }

  async listFiles(folder: string): Promise<string[]> {
    const res = await fetch(
      `${this.baseUrl}/list?folder=${encodeURIComponent(folder)}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to list files: ${await res.text()}`);
    }

    return await res.json();
  }
}

export const fileAccess = new FileAccessFromServer(
  `http://${window.location.host.replace(/:\d+$/, ":3000")}`,
);
