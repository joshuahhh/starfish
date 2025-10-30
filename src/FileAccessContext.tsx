import { createContext } from "react";
import { FileAccess } from "./FileAccess.js";

export const FileAccessContext = createContext<FileAccess>(
  null as any as FileAccess,
);
