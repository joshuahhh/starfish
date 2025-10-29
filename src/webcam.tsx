import { useEffect, useRef, useState } from "react";
import { onVideoFrame } from "./util.js";

export type WebcamStream = {
  video: HTMLVideoElement;
  width: number;
  height: number;
};

export type Webcam = {
  stream: WebcamStream | null;
  deviceId: string | null;
  devices: MediaDeviceInfo[];
  setDeviceId: (id: string) => void;
  isMirrored: boolean;
};

export function useWebcam({
  enabled = true,
  preference,
  width,
  isMirrored = false,
}: {
  enabled?: boolean;
  preference?: string;
  width: number;
  isMirrored?: boolean;
}): Webcam {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [stream, setStream] = useState<WebcamStream | null>(null);

  // Get available cameras once on mount
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const cameras = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(cameras);

      if (cameras.length > 0) {
        const preferred =
          cameras.find((c) => preference && c.label.includes(preference)) ||
          cameras[0];
        setDeviceId(preferred.deviceId);
      }
    });
  }, [preference]);

  // Create stream when deviceId or width changes
  useEffect(() => {
    if (deviceId === null || !enabled) {
      setStream(null);
      return;
    }

    let cancelled = false;
    let currentStream: MediaStream | null = null;

    (async () => {
      try {
        let mediaStream: MediaStream;

        // If deviceId is empty string (Firefox bug), just request any camera
        if (deviceId === "") {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: width } },
          });
        } else {
          // Try exact width first, fall back to ideal if it fails
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: deviceId }, width: { exact: width } },
            });
          } catch (err) {
            // Firefox sometimes fails with exact constraints
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: deviceId }, width: { ideal: width } },
            });
          }
        }

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        currentStream = mediaStream;
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = mediaStream;

        await new Promise((resolve) => {
          video.onloadeddata = resolve;
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream({
          video,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      } catch (error) {
        console.error("Camera error:", error);
      }
    })();

    return () => {
      cancelled = true;
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [deviceId, enabled, width]);

  return { stream, deviceId, devices, setDeviceId, isMirrored };
}

export function Webcam({ webcam }: { webcam: Webcam }) {
  const { stream, isMirrored, deviceId } = webcam;
  const [showSelector, setShowSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update DOM when container ref or stream changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stream) return;

    // Re-append the video element
    if (stream.video.parentNode !== container) {
      container.appendChild(stream.video);
    }

    // Ensure video is playing after being re-attached
    if (stream.video.paused) {
      stream.video.play().catch(() => {});
    }
  });

  // Close selector when device changes
  useEffect(() => {
    setShowSelector(false);
  }, [deviceId]);

  if (!stream) {
    return <div className="text-2xl">No webcam stream</div>;
  }

  return (
    <div
      style={{
        position: "relative",
        transform: isMirrored ? "scaleX(-1)" : undefined,
      }}
      onClick={() => setShowSelector(!showSelector)}
    >
      <div ref={containerRef} />
      {showSelector && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: isMirrored ? "scaleX(-1)" : undefined,
          }}
        >
          <select
            value={webcam.deviceId ?? ""}
            onChange={(e) => webcam.setDeviceId(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="text-lg p-2"
          >
            {webcam.devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Camera"}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function onWebcamFrame(
  stream: WebcamStream,
  callback: () => void,
): () => void {
  return onVideoFrame(stream.video, callback);
}

export function screenshotAsCanvas(stream: WebcamStream): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = stream.width;
  canvas.height = stream.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(stream.video, 0, 0, canvas.width, canvas.height);
  return canvas;
}
