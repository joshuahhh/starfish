import { useContext, useEffect, useState } from "react";
import { FileMetadata } from "./FileAccess.js";
import { FileAccessContext } from "./FileAccessContext.js";
import { ImgFromFileAccess } from "./ImgFromFileAccess.js";
import { SouvenirImage, SouvenirImageCenterer } from "./Souvenir.js";
import { useRefForCallback } from "./useRefForCallback.js";

export const WinScreen = ({
  starfishImgName,
  winningSnapDataUrl,
  onProgress = () => {},
  onReplay = () => {},
}: {
  starfishImgName: string;
  winningSnapDataUrl: string;
  onProgress: () => void;
  onReplay: () => void;
}) => {
  const fileAccess = useContext(FileAccessContext);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(2000);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRefForCallback(isPaused);

  const folder = `snaps/${starfishImgName}/`;

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
  }, [fileAccess, folder]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPausedRef.current) {
        setSecondsLeft((prev) => prev - 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPausedRef]);

  useEffect(() => {
    if (secondsLeft === 0) {
      onProgress();
    }
  }, [secondsLeft, onProgress]);

  const souvenirImage = (
    <SouvenirImage
      starfishImgName={starfishImgName}
      winImg={{ dataUrl: winningSnapDataUrl }}
      showDownloadButton={true}
    />
  );

  return (
    <div className="flex flex-col items-center h-screen bg-black text-gray-100">
      <style>{`html, body { background: black; }`}</style>
      {/* <ReactConfetti /> */}
      {files.length > 0 ? (
        <div className="w-full grid grid-cols-3">
          <div className="col-start-1 col-span-2 row-start-1 row-span-2">
            {souvenirImage}
          </div>
          {[...files].reverse().map((file) => (
            <ImgFromFileAccess
              key={file.filename}
              folder={folder}
              filename={file.filename}
              className=""
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-[calc(100vh-120px)] flex items-center justify-center">
          <SouvenirImageCenterer>{souvenirImage}</SouvenirImageCenterer>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 bg-black rounded-t-[3rem] px-6 py-3 text-center">
        <div className="dynapuff text-4xl whitespace-nowrap">
          🪸 ⭐{" "}
          <span
            style={{
              color: isPaused ? "#888" : "#00f",
              textShadow: isPaused
                ? "none"
                : "-4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff",
            }}
          >
            Next starfish in {secondsLeft}...
          </span>{" "}
          ⭐ 🪸
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            className="w-9 h-9 flex items-center justify-center bg-[#5a9ab0] hover:bg-[#6aacbe] rounded-full transition-colors"
            aria-label="Previous"
            onClick={onReplay}
          >
            <Icon d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center bg-[#5a9ab0] hover:bg-[#6aacbe] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Pause"
            disabled={isPaused}
            onClick={() => setIsPaused(true)}
          >
            <Icon d="M6 4h4v16H6zm8 0h4v16h-4z" />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center bg-[#5a9ab0] hover:bg-[#6aacbe] rounded-full transition-colors"
            aria-label="Next"
            onClick={onProgress}
          >
            <Icon d="M6 18l8.5-6L6 6zm10-12h2v12h-2z" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Icon = ({ d }: { d: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="black"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d={d} />
  </svg>
);
