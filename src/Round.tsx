import * as poseDetection from "@tensorflow-models/pose-detection";
import { interpolateBuGn } from "d3-scale-chromatic";
import _ from "lodash";
import { useEffect, useState } from "react";
import { Starfish } from "./starfishes.js";
import { Webcam, WebcamStream } from "./webcam.js";

// these are all proximal -> distal
const network: [string, string][] = [
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "left_shoulder"],
  ["right_hip", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["center", "left_elbow"],
  ["center", "right_elbow"],
  ["center", "left_knee"],
  ["center", "right_knee"],
  ["center", "top_arm"],
];

export const Round = ({
  target,
  webcam,
  stream,
  pose,
  onWin,
}: {
  target: Starfish;
  webcam: Webcam;
  stream: WebcamStream;
  pose: poseDetection.Pose | null;
  onWin: () => void;
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (img) {
      img.onload = () => {
        setImgSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
    }
  }, [img]);

  const shiftedKeypoints =
    pose && shiftKeypoints(pose.keypoints, target.keypoints);

  const distanceToTarget =
    shiftedKeypoints &&
    _.sum(
      shiftedKeypoints.map((kp) => {
        const targetKeypoint = target.keypoints.find((t) => t.name === kp.name);
        if (!targetKeypoint) return NaN;
        const dist = Math.sqrt(
          Math.pow(kp.x - targetKeypoint.x, 2) +
            Math.pow(kp.y - targetKeypoint.y, 2),
        );
        // HACK
        (kp as any).dist = dist;
        return dist;
      }),
    );

  const winDistance = 500;

  useEffect(() => {
    if (distanceToTarget && distanceToTarget < winDistance) {
      console.log("win");
      onWin();
    }
  }, [distanceToTarget, onWin]);

  const [showTarget, setShowTarget] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "s") {
        setShowTarget((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      data-name="top guy"
      className="relative w-screen h-screen bg-black overflow-hidden"
    >
      <div
        data-name="centerer for image"
        className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
      >
        {/* center container in centerer */}
        <div
          data-name="image container"
          className="relative flex-1 max-w-fit max-h-fit"
        >
          <img
            ref={setImg}
            src={"img/" + target.imgName}
            className="max-w-screen max-h-screen"
          />
          {showTarget &&
            imgSize &&
            poseSvg(target.keypoints, imgSize.width, imgSize.height, {
              strokeWidth: 20,
              color: "turquoise",
            })}
          {shiftedKeypoints &&
            imgSize &&
            poseSvg(shiftedKeypoints, imgSize.width, imgSize.height, {
              color: "#88ff8888",
              strokeWidth: 80,
              style: { opacity: 1 },
            })}
        </div>
      </div>
      <div className="absolute top-8 left-8 w-1/6 border-[6px] border-white">
        <Webcam webcam={webcam} />
        {pose &&
          poseSvg(pose.keypoints, stream.width, stream.height, {
            strokeWidth: 10,
          })}
      </div>
      {/* bar on right-hand side showing progress to win */}
      <div className="absolute top-24 bottom-24 right-8 w-10 border-[6px] border-white bg-black">
        <div
          className="absolute bottom-0 left-0 right-0 bg-green-500"
          style={{
            height: `${Math.max(
              0,
              distanceToTarget ? 100 - (distanceToTarget - winDistance) / 8 : 0,
            )}%`,
            background:
              "linear-gradient(180deg, #08A200 0%, #0400FF 48.08%, #F00 100%), #000",
          }}
        />
      </div>
      {/* star above bar */}
      <div className="absolute top-6 right-5 text-6xl text-gray-100">⭐</div>
      {/* person below bar */}
      <div className="absolute bottom-5 right-6 text-6xl text-gray-100">🧍</div>
      {/* {distanceToTarget && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-4xl">
          {distanceToTarget.toFixed(0)}
        </div>
      )} */}
      {/* top center title */}
      <div
        className="dynapuff absolute top-10 left-1/2 transform -translate-x-1/2 text-7xl hidden xl:flex"
        style={{
          color: "#00f",
          textShadow:
            "-4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff",
        }}
      >
        Be the Starfish
      </div>
    </div>
  );
};

function poseSvg(
  keypoints: poseDetection.Keypoint[],
  coordWidth: number,
  coordHeight: number,
  {
    color = "red",
    strokeWidth = 50,
    style = {},
  }: {
    color?: string;
    strokeWidth?: number;
    style?: React.CSSProperties;
  } = {},
) {
  return (
    <svg
      viewBox={`0 0 ${coordWidth} ${coordHeight}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
        ...style,
      }}
    >
      {network.map(([from, to]) => {
        const fromKeypoint = keypoints.find((k) => k.name === from);
        const toKeypoint = keypoints.find((k) => k.name === to);
        if (!fromKeypoint || !toKeypoint) return null;
        if (fromKeypoint.score! < 0.3 || toKeypoint.score! < 0.3) return null;
        const dist = (toKeypoint as any).dist;
        const strokeColor = dist ? interpolateBuGn(1 - dist / 800) : color;
        return (
          <line
            key={`${from}-${to}`}
            x1={fromKeypoint.x}
            y1={fromKeypoint.y}
            x2={toKeypoint.x}
            y2={toKeypoint.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      })}
      {keypoints.map((keypoint) => {
        if (keypoint.score! < 0.3) return null;
        const dist = (keypoint as any).dist;
        const jointColor =
          dist !== undefined ? interpolateBuGn(1 - dist / 800) : color;
        const r = keypoint.name === "center" ? strokeWidth : strokeWidth / 2;
        return (
          <>
            <circle
              key={keypoint.name}
              cx={keypoint.x}
              cy={keypoint.y}
              r={r}
              fill={jointColor}
            />
            {/* {dist && (
              <text
                x={keypoint.x}
                y={keypoint.y - strokeWidth / 2}
                fill="white"
                fontSize={strokeWidth / 2}
                textAnchor="middle"
              >
                {dist.toFixed(0)}
              </text>
            )} */}
          </>
        );
      })}
    </svg>
  );
}

type Vec2 = { x: number; y: number };
function len(a: Vec2): number {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}
function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}
function mul(a: Vec2, b: number): Vec2 {
  return { x: a.x * b, y: a.y * b };
}
function makeSameLength(a: Vec2, b: Vec2): Vec2 {
  return mul(a, len(b) / len(a));
}
function transplant(
  measuredProximal: Vec2,
  measuredDistal: Vec2,
  targetProximal: Vec2,
  targetDistal: Vec2,
  base: Vec2,
): Vec2 {
  const measuredVector = sub(measuredDistal, measuredProximal);
  const targetVector = sub(targetDistal, targetProximal);
  const newVector = makeSameLength(measuredVector, targetVector);
  return add(base, newVector);
}
function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x * (1 - t) + b.x * t,
    y: a.y * (1 - t) + b.y * t,
  };
}

function shiftKeypoints(
  detected: poseDetection.Keypoint[],
  target: poseDetection.Keypoint[],
): poseDetection.Keypoint[] {
  const center = findKp(target, "center");
  const topArm = transplant(
    lerp(
      findKp(detected, "left_shoulder"),
      findKp(detected, "right_shoulder"),
      0.5,
    ),
    findKp(detected, "nose"),
    findKp(target, "center"),
    findKp(target, "top_arm"),
    center,
  );
  const leftElbow = transplant(
    findKp(detected, "left_shoulder"),
    findKp(detected, "left_elbow"),
    findKp(target, "center"),
    findKp(target, "left_elbow"),
    center,
  );
  const leftWrist = transplant(
    findKp(detected, "left_elbow"),
    findKp(detected, "left_wrist"),
    findKp(target, "left_elbow"),
    findKp(target, "left_wrist"),
    leftElbow,
  );
  const rightElbow = transplant(
    findKp(detected, "right_shoulder"),
    findKp(detected, "right_elbow"),
    findKp(target, "center"),
    findKp(target, "right_elbow"),
    center,
  );
  const rightWrist = transplant(
    findKp(detected, "right_elbow"),
    findKp(detected, "right_wrist"),
    findKp(target, "right_elbow"),
    findKp(target, "right_wrist"),
    rightElbow,
  );
  const leftKnee = transplant(
    findKp(detected, "left_hip"),
    findKp(detected, "left_knee"),
    findKp(target, "center"),
    findKp(target, "left_knee"),
    center,
  );
  const leftAnkle = transplant(
    findKp(detected, "left_knee"),
    findKp(detected, "left_ankle"),
    findKp(target, "left_knee"),
    findKp(target, "left_ankle"),
    leftKnee,
  );
  const rightKnee = transplant(
    findKp(detected, "right_hip"),
    findKp(detected, "right_knee"),
    findKp(target, "center"),
    findKp(target, "right_knee"),
    center,
  );
  const rightAnkle = transplant(
    findKp(detected, "right_knee"),
    findKp(detected, "right_ankle"),
    findKp(target, "right_knee"),
    findKp(target, "right_ankle"),
    rightKnee,
  );
  return [
    { name: "center", ...center, score: 1 },
    { name: "top_arm", ...topArm, score: 1 },
    { name: "left_elbow", ...leftElbow, score: 1 },
    { name: "left_wrist", ...leftWrist, score: 1 },
    { name: "right_elbow", ...rightElbow, score: 1 },
    { name: "right_wrist", ...rightWrist, score: 1 },
    { name: "left_knee", ...leftKnee, score: 1 },
    { name: "left_ankle", ...leftAnkle, score: 1 },
    { name: "right_knee", ...rightKnee, score: 1 },
    { name: "right_ankle", ...rightAnkle, score: 1 },
  ];
}

function findKp(
  keypoints: poseDetection.Keypoint[],
  name: string,
): poseDetection.Keypoint {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp) throw new Error(`Keypoint ${name} not found`);
  return kp;
}
