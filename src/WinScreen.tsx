import { useContext, useEffect, useState } from "react";
import { FileMetadata } from "./FileAccess.js";
import { FileAccessContext } from "./FileAccessContext.js";
import { ImgFromFileAccess } from "./ImgFromFileAccess.js";
import { SouvenirImage, SouvenirImageCenterer } from "./Souvenir.js";

export const WinScreen = ({
  starfishImgName,
  winningSnapDataUrl,
  onProgress = () => {},
}: {
  starfishImgName: string;
  winningSnapDataUrl: string;
  onProgress: () => void;
}) => {
  const fileAccess = useContext(FileAccessContext);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(2000);

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
              color: "#00f",
              textShadow:
                "-4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff",
            }}
          >
            Next starfish in {secondsLeft}...
          </span>{" "}
          ⭐ 🪸
        </div>
        or hit space
      </div>
    </div>
  );
};
