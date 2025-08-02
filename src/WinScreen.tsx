import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
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
  const [files, setFiles] = useState<string[]>([]);

  const folder = `./snaps/${target.imgName}/`;

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const files = await listFiles(folder);
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
          <img
            src={winningSnapDataUrl}
            className="col-start-1 col-span-2 row-start-1 row-span-2 border-[6px] border-white"
            style={{ transform: "scaleX(-1)" }}
          />
        )}
        {[...files].reverse().map((file) => (
          <img
            key={file}
            src={`${folder}${file}`}
            className=""
            style={{ transform: "scaleX(-1)" }}
          />
        ))}
      </div>

      <p className="text-lg mb-8">Space to continue</p>
      <div className="absolute top-8 left-8 w-1/6 border-white border-[6px]">
        <img src={`/img/${target.imgName}`} className="max-w-full" />
      </div>
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

async function listFiles(folder: string): Promise<string[]> {
  const res = await fetch(
    `http://localhost:3000/list?folder=${encodeURIComponent(folder)}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to list files: ${await res.text()}`);
  }
  return await res.json();
}
