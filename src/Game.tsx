import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { serverHost } from "./api.js";
import { Round } from "./Round.js";
import { Starfish } from "./starfishes.js";
import { useRefForCallback } from "./useRefForCallback.js";
import { onWebcamFrame, screenshotAsCanvas, useWebcam } from "./webcam.js";
import { WinScreen } from "./WinScreen.js";

// const starfishes = [starfish1, starfish2];

export const starfishImgNames = [
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

export const Game = () => {
  const [starfishes, setStarfishes] = useState<Starfish[] | null>(null);
  useEffect(() => {
    const loadStarfishes = async () => {
      const starfishes = _.shuffle(
        await Promise.all(
          starfishImgNames.map(async (imgName) => {
            const response = await fetch(`json/${imgName}.json`);
            if (!response.ok) {
              throw new Error(`Failed to fetch JSON for ${imgName}`);
            }
            const keypoints = await response.json();
            return { imgName, keypoints };
          }),
        ),
      );
      console.log("starfishes are", starfishes);
      setStarfishes(starfishes);
    };
    loadStarfishes();
  }, []);

  const [starfishIdx, setStarfishIdx] = useState(0);
  const target = starfishes ? starfishes[starfishIdx] : null;
  const [winMode, setWinMode] = useState(false);

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

  const [winningSnapDataUrl, setWinningSnapDataUrl] = useState<string | null>(
    null,
  );

  const streamRef = useRefForCallback(stream);
  const handleWin = useCallback(
    (saveSnap = true) => {
      if (!target) return;
      const stream = streamRef.current;
      setWinMode(true);
      const snapCanvas = screenshotAsCanvas(stream!);
      setWinningSnapDataUrl(snapCanvas.toDataURL());
      if (saveSnap) {
        const destPath = `./public/snaps/${target.imgName}/`;
        uploadCanvas(snapCanvas, destPath)
          .then(() => {
            console.log("Screenshot uploaded to", destPath);
          })
          .catch((error) => {
            console.error("Failed to upload screenshot:", error);
          });
      }
    },
    [streamRef, target],
  );

  const handleProgress = useCallback(() => {
    if (!starfishes) return;
    setStarfishIdx((starfishIdx + 1) % starfishes.length);
    setWinMode(false);
    setWinningSnapDataUrl(null);
  }, [starfishIdx, starfishes]);

  useEffect(() => {
    if (winMode) return;

    // "w" simulates a win, without saving
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "w") {
        handleWin(false);
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
      ...(stream ? [] : ["video"]),
      ...(detector ? [] : ["model"]),
      ...(starfishes ? [] : ["starfishes"]),
    ].join(" and ");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl">Loading {loadingMsg}...</div>
      </div>
    );
  }

  return winMode ? (
    <WinScreen
      target={target}
      winningSnapDataUrl={winningSnapDataUrl}
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

async function uploadCanvas(canvas: HTMLCanvasElement, folder: string) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve),
  );
  if (!blob) throw new Error("Failed to convert canvas to blob");

  const formData = new FormData();
  formData.append("file", blob, "image.png");
  formData.append("folder", folder);

  const res = await fetch(`http://${serverHost}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${await res.text()}`);
  }

  console.log(await res.text());
}
