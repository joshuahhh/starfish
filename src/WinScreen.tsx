import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
import { fileAccess, FileMetadata } from "./api.js";
import { SouvenirImage } from "./Souvenir.js";
import { Starfish } from "./starfishes.js";

export const WinScreen = ({
  target,
  winningSnapDataUrl,
  onProgress = () => {},
}: {
  target: Starfish;
  winningSnapDataUrl: string | null;
  onProgress: () => void;
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);

  const folder = `./snaps/${target.imgName}/`;

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const files = await fileAccess.listFiles(folder);
        console.log("Files in starfishes folder:", files);
        setFiles(files);
      } catch (error) {
        console.error("Failed to list files:", error);
      }
    };
    fetchFiles();
  }, [folder]);

  useEffect(() => {
    const cancelTimeout = setTimeout(() => {
      onProgress();
    }, 20000);
    return () => clearTimeout(cancelTimeout);
  }, [onProgress]);

  return (
    <div className="flex flex-col items-center h-screen bg-black text-gray-100">
      <ReactConfetti />
      <div className="grid grid-cols-3 mt-36">
        {winningSnapDataUrl && (
          <div className="col-start-1 col-span-2 row-start-1 row-span-2">
            <SouvenirImage
              starfishImgName={target.imgName}
              winDataUrl={winningSnapDataUrl}
            />
          </div>
        )}
        {[...files].reverse().map((file) => (
          <img
            key={file.filename}
            src={`${folder}${file.filename}`}
            className=""
          />
        ))}
      </div>

      <p className="text-lg mb-8">Space to continue</p>
      <div className="dynapuff absolute top-10 left-[20%] text-7xl">
        🪸 ⭐{" "}
        <span
          style={{
            color: "#00f",
            textShadow:
              "-4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff",
          }}
        >
          You are the Starfish!
        </span>{" "}
        ⭐ 🪸
      </div>
    </div>
  );
};
