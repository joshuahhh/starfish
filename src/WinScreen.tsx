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
  winningSnapDataUrl: string;
  onProgress: () => void;
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(2000);

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
    if (secondsLeft === 0) {
      onProgress();
      return;
    }

    const timeout = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [secondsLeft, onProgress]);

  const souvenirImage = (
    <SouvenirImage
      starfishImgName={target.imgName}
      winDataUrl={winningSnapDataUrl}
    />
  );

  return (
    <div className="flex flex-col items-center h-screen bg-black text-gray-100">
      <style>{`html, body { background: black; }`}</style>
      <ReactConfetti />
      {files.length > 0 ? (
        <div className="w-full grid grid-cols-3">
          <div className="col-start-1 col-span-2 row-start-1 row-span-2">
            {souvenirImage}
          </div>
          {[...files].reverse().map((file) => (
            <img
              key={file.filename}
              src={`${folder}${file.filename}`}
              className=""
            />
          ))}
        </div>
      ) : (
        <div className="w-[60vw] h-[80vh] mx-auto flex items-center justify-center">
          {souvenirImage}
        </div>
      )}

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-black rounded-lg px-6 py-3 text-center">
        <div className="dynapuff text-5xl">
          🪸 ⭐{" "}
          <span
            style={{
              color: "#00f",
              textShadow:
                "-4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff",
            }}
          >
            Next starfish in {secondsLeft}...
          </span>{" "}
          ⭐ 🪸
        </div>
        (or hit space)
      </div>
    </div>
  );
};
