export interface FileMetadata {
  filename: string;
  mtime: string;
}

export interface FileAccess {
  type: "opfs" | "realfs";
  saveFile(file: Blob, folder: string): Promise<string>;
  listFiles(folder: string): Promise<FileMetadata[]>;
  getFileContentsUrl(folder: string, filename: string): Promise<string>;
}
