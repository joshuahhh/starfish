import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import _ from "lodash";
import { useCallback, useContext, useEffect, useState } from "react";
import { FileAccess } from "./FileAccess.js";
import { FileAccessContext } from "./FileAccessContext.js";
import { Round } from "./Round.js";
import { Starfish } from "./starfishes.js";
import { useRefForCallback } from "./useRefForCallback.js";
import { onWebcamFrame, screenshotAsCanvas, useWebcam } from "./webcam.js";
import { WinScreen } from "./WinScreen.js";

export let starfishImgNames = [
  "P6300331.JPG",
  "P6300370.JPG",
  "P6300376.JPG",
  "P6300415.JPG",
  "P6300419.JPG",
  "P6300421.JPG",
  "P6300441.JPG",
  "P6300443.JPG",
  "P6300448.JPG",
  "P6300449.JPG",
  "P6300457.JPG",
  "P7030585.JPG",
  "P7030586.JPG",
  "P7030588.JPG",
  "P7030590.JPG",
  "P7030592.JPG",
  "P7030593.JPG",
  "P7030595.JPG",
  "P7030596.JPG",
  "P7030598.JPG",
  "P7030599.JPG",
  "P7030608.JPG",
  "P7030609.JPG",
  "P7030610.JPG",
  "P7030644.JPG",
  "P7030725.JPG",
  "P7040741.JPG",
  "P7040809.JPG",
  "P7040815.JPG",
  "P7040838.JPG",
  "P7040840.JPG",
  "P7040849.JPG",
  "P7040854.JPG",
  "P7040856.JPG",
  "P7040858.JPG",
  "P7040859.JPG",
  "P7040984.JPG",
  "P7040985.JPG",
  "P7040986.JPG",
  "P7040989.JPG",
  "P7040990.JPG",
  "P7041007.JPG",
  "P7041048.JPG",
  "P7041051.JPG",
];

// asymmetric starfish, for testing flips
if (false) {
  starfishImgNames = ["P6300419.JPG"];
}

// portrait-mode starfish, for testing aspect ratios
if (false) {
  starfishImgNames = ["P7040809.JPG"];
}

type WinMode = false | { winningSnapDataUrl: string };

export const Game = () => {
  const fileAccess = useContext(FileAccessContext);
  const [starfishes, setStarfishes] = useState<Starfish[] | null>(null);
  useEffect(() => {
    const loadStarfishes = async () => {
      const orderedStarfishes = await Promise.all(
        starfishImgNames.map(async (imgName) => {
          const response = await fetch(`json/${imgName}.json`);
          if (!response.ok) {
            throw new Error(`Failed to fetch JSON for ${imgName}`);
          }
          const keypoints = await response.json();
          return { imgName, keypoints };
        }),
      );
      const shuffledStarfishes = _.shuffle(orderedStarfishes);
      console.log("starfishes are", shuffledStarfishes);
      setStarfishes(shuffledStarfishes);
    };
    loadStarfishes();
  }, []);

  const [starfishIdx, setStarfishIdx] = useState(0);
  const target = starfishes ? starfishes[starfishIdx] : null;
  const [winMode, setWinMode] = useState<WinMode>(false);

  const webcam = useWebcam({
    // imgOverrideExt: "/josh-star-1.png",

    // preference: "Iriun",
    preference: "FaceTime",
    width: 1280,
    isMirrored: true,
    // imgOverrideExt: "/josh-star-1.png",
  });
  const stream = webcam.stream;

  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
    null,
  );

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      setDetector(
        await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelUrl: "movenet_singlepose_lightning/model.json" },
        ),
      );
    };
    loadModel();
  }, []);

  const streamRef = useRefForCallback(stream);
  const handleWin = useCallback(
    async (saveSnap = true) => {
      if (!target) return;
      const stream = streamRef.current;
      const snapCanvas = screenshotAsCanvas(stream!);
      setWinMode({ winningSnapDataUrl: snapCanvas.toDataURL() });
      if (saveSnap) {
        const destPath = `snaps/${target.imgName}/`;
        uploadCanvas(fileAccess, snapCanvas, destPath)
          .then(() => {
            console.log("Screenshot uploaded to", destPath);
          })
          .catch((error) => {
            console.error("Failed to upload screenshot:", error);
          });
      }
    },
    [streamRef, target, fileAccess],
  );

  const handleProgress = useCallback(() => {
    if (!starfishes) return;
    setStarfishIdx((starfishIdx + 1) % starfishes.length);
    setWinMode(false);
  }, [starfishIdx, starfishes]);

  useEffect(() => {
    if (winMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // "w" simulates a win, without saving
      if (event.key === "w") {
        handleWin(false);
      }

      // "W" forces a win, with saving
      if (event.key === "W") {
        handleWin(true);
      }

      if (event.key === " ") {
        handleProgress();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleProgress, handleWin, winMode]);

  useEffect(() => {
    if (!winMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        handleProgress();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleProgress, winMode]);

  const [pose, setPose] = useState<poseDetection.Pose | null>(null);
  useEffect(() => {
    if (!stream || !detector) {
      return;
    }
    const cancel = onWebcamFrame(stream, async () => {
      const poses = await detector.estimatePoses(stream.video, {
        flipHorizontal: true,
      });
      const pose = poses[0];
      if (!pose) {
        setPose(null);
        return;
      }
      pose.keypoints.forEach((keypoint) => {
        keypoint.x = stream.width - keypoint.x;
      });
      setPose(poses[0]);
    });
    return () => {
      cancel();
    };
  }, [detector, stream]);

  if (!stream || !detector || !starfishes || !target) {
    const loadingMsg = [
      ...(stream ? [] : ["webcam"]),
      ...(detector ? [] : ["model"]),
      ...(starfishes ? [] : ["starfishes"]),
    ].join(" and ");
    return (
      <div className="flex items-center justify-center h-screen">
        <style>{`html, body { background: black; }`}</style>
        <div className="text-2xl text-white">Loading {loadingMsg}...</div>
      </div>
    );
  }

  return winMode ? (
    <WinScreen
      starfishImgName={target.imgName}
      winningSnapDataUrl={winMode.winningSnapDataUrl}
      onProgress={handleProgress}
    />
  ) : (
    <Round
      key={starfishIdx}
      webcam={webcam}
      stream={stream}
      pose={pose}
      target={target}
      onWin={handleWin}
    />
  );
};

async function uploadCanvas(
  fileAccess: FileAccess,
  canvas: HTMLCanvasElement,
  folder: string,
) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve),
  );
  if (!blob) throw new Error("Failed to convert canvas to blob");

  const result = await fileAccess.saveFile(blob, folder);
  console.log(result);
}
