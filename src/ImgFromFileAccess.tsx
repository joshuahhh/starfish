import { useContext, useEffect, useState } from "react";
import { FileAccessContext } from "./FileAccessContext.js";

export const ImgFromFileAccess = ({
  folder,
  filename,
  ...imgProps
}: {
  folder: string;
  filename: string;
} & React.ImgHTMLAttributes<HTMLImageElement>) => {
  const fileAccess = useContext(FileAccessContext);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fileAccess
      .getFileContentsUrl(folder, filename)
      .then(setUrl)
      .catch(console.error);
  }, [fileAccess, filename, folder]);

  return url && <img {...imgProps} src={url} />;
};
