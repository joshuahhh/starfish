import { useEffect, useState } from "react";
import { imgNames } from "./Game.js";
import { listFiles } from "./WinScreen.js";

export const Admin = () => {
  return (
    <div className="p-10">
      <div className="flex flex-col items-start gap-2">
        {imgNames.map((imgName) => (
          <PicsForStarfish key={imgName} imgName={imgName} />
        ))}
      </div>
    </div>
  );
};

export const PicsForStarfish = ({ imgName }: { imgName: string }) => {
  const [files, setFiles] = useState<string[] | null>(null);

  const folder = `./snaps/${imgName}/`;

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const files = await listFiles(folder);
        setFiles(files);
      } catch (error) {
        console.error("Failed to list files:", error);
      }
    };
    fetchFiles();
  }, [folder]);

  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-row justify-end min-w-48">
        <img
          key={imgName}
          src={`img/${imgName}`}
          alt={imgName}
          className="max-h-32"
        />
      </div>
      {files !== null ? (
        <div className="flex flex-row flex-wrap gap-2">
          {files.map((file) => (
            <a key={file} href="">
              <img
                src={`${folder}${file}`}
                className="max-h-32"
                style={{ transform: "scaleX(-1)" }}
              />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};
