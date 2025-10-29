import { ChangeEvent, useEffect, useState } from "react";
import DomNode from "./DomNode.js";
import { useLocalStorage } from "./useLocalStorage.js";
import { useRefForCallback } from "./useRefForCallback.js";
import { onVideoFrame } from "./util.js";

export type Webcam = {
  stream: WebcamStream | null;

  deviceId: string | null;
  devices: MediaDeviceInfo[];
  setDeviceId: (deviceId: string | null) => void;

  isMirrored: boolean;

  setImgOverride: (src: string | null) => void;
};

export type WebcamStream = {
  video: HTMLVideoElement | HTMLImageElement;
  width: number;
  height: number;
};

async function startStream(
  deviceId: string,
  width: number,
): Promise<WebcamStream> {
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  // const track = (
  //   await navigator.mediaDevices.getUserMedia({ video: true })
  // ).getVideoTracks()[0];
  // const caps = track.getCapabilities();
  // console.log(
  //   "we should be able to do:",
  //   caps.width!.max,
  //   "x",
  //   caps.height!.max,
  // );
  // track.stop();

  // const constraints: MediaStreamConstraints = {
  //   video: {
  //     width: { min: 1280, ideal: 1920, max: 1920 },
  //     height: { min: 720, ideal: 1080, max: 1080 },
  //   },
  // };

  const constraints: MediaStreamConstraints = {
    video: {
      deviceId,
      width: { exact: width }, // ask for the 720 p preset
      // height: { exact: 1080 }, // ask for the 1080 p preset
      // frameRate: { max: 30 }, // tell the solver “30 fps is enough”
      // leave height alone or pin aspectRatio, but DON’T make height exact
      // height will come back as 720 automatically
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  video.play();

  // wait for metadata to be loaded so we can get video size
  await new Promise<void>((resolve) => {
    video.onloadeddata = () => {
      resolve();
    };
  });

  console.log("loaded vid at", video.videoWidth, "x", video.videoHeight);

  return {
    video,
    width: video.videoWidth,
    height: video.videoHeight,
  };
}

function stopStream(stream: WebcamStream) {
  const { video } = stream;
  if (video instanceof HTMLImageElement) {
    return;
  }
  if (video.srcObject instanceof MediaStream) {
    for (const track of video.srcObject.getTracks()) {
      track.stop();
    }
  }
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

export const useWebcam = ({
  enabled = true,
  preference,
  width,
  isMirrored = false,
  imgOverrideExt,
  vidOverrideExt,
}: {
  enabled?: boolean;
  preference?: string;
  width: number;
  isMirrored?: boolean;
  imgOverrideExt?: string;
  vidOverrideExt?: string;
}): Webcam => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [stream, setStream] = useState<WebcamStream | null>(null);
  const streamRef = useRefForCallback(stream);

  const [imgOverride, setImgOverride] = useLocalStorage<string | null>(
    "webcam-imgOverride",
    () => null,
  );

  useEffect(() => {
    if (imgOverrideExt) {
      setImgOverride(imgOverrideExt);
    }
  }, [imgOverrideExt, setImgOverride]);

  // not used reactively
  const preferenceRef = useRefForCallback(preference);

  useEffect(() => {
    // enumerate cameras

    (async () => {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cams = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      const preference = preferenceRef.current;
      const preferredCamera =
        (preference && cams.find((cam) => cam.label.includes(preference))) ||
        cams[0];
      if (preferredCamera) {
        setDeviceId(preferredCamera.deviceId);
      }
    })();
  }, [deviceId, preferenceRef]);

  useEffect(() => {
    // update stream when deviceId changes

    if (imgOverride) {
      const img = new Image();
      img.src = imgOverride;
      img.onload = () => {
        setStream({
          video: img,
          width: img.width,
          height: img.height,
        });
      };
      return;
    }

    if (vidOverrideExt) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.src = vidOverrideExt;
      video.loop = true;
      video.onloadeddata = () => {
        setStream({
          video,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
      video.play();
      return;
    }

    if (streamRef.current) {
      stopStream(streamRef.current);
    }

    if (deviceId !== null && enabled) {
      startStream(deviceId, width).then((stream) => {
        setStream(stream);
      });
    } else {
      setStream(null);
    }
  }, [deviceId, enabled, imgOverride, streamRef, vidOverrideExt, width]);

  return {
    stream,

    devices,
    deviceId,
    setDeviceId,

    isMirrored,

    setImgOverride,
  };
};

export const WebcamSelect = ({
  webcam,
  className,
}: {
  webcam: Webcam;
  className?: string;
}) => {
  const { deviceId, devices, setDeviceId } = webcam;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDeviceId(e.target.value);
  };

  return (
    <select
      className={className}
      value={deviceId ?? ""}
      onChange={handleChange}
    >
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label || "Unnamed camera"}
        </option>
      ))}
    </select>
  );
};

export const Webcam = ({ webcam }: { webcam: Webcam }) => {
  const stream = webcam.stream;

  useEffect(() => {
    if (stream && stream.video instanceof HTMLVideoElement) {
      if (stream.video.paused) {
        stream.video.play();
      }
    }
  }, [stream]);

  if (!stream) {
    return <div className="text-2xl">No webcam stream available</div>;
  }

  return (
    <div
      style={{
        ...(webcam.isMirrored ? { transform: "scaleX(-1)" } : {}),
      }}
    >
      <DomNode node={stream.video} />
    </div>
  );
};

export function onWebcamFrame(
  stream: WebcamStream,
  callback: () => void,
): () => void {
  if (stream.video instanceof HTMLImageElement) {
    // if the video is an image, just call the callback once
    callback();
    return () => {};
  }

  return onVideoFrame(stream.video, callback);
}

export function screenshotAsCanvas(stream: WebcamStream) {
  const canvas = document.createElement("canvas");
  canvas.width = stream.width;
  canvas.height = stream.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(stream.video, 0, 0, canvas.width, canvas.height);
  return canvas;
}
