import _ from "lodash";
import { useEffect, useRef, useState } from "react";

const pointsList = [
  "left_wrist",
  "left_elbow",
  "right_elbow",
  "right_wrist",
  "left_knee",
  "left_ankle",
  "right_knee",
  "right_ankle",
  "center",
  "top_arm",
] as const;

type PointName = (typeof pointsList)[number];

type Points = {
  [key in PointName]: { x: number; y: number };
};

const connections: [PointName, PointName][] = [
  ["left_wrist", "left_elbow"],
  ["left_elbow", "center"],
  ["right_elbow", "center"],
  ["right_wrist", "right_elbow"],
  ["left_knee", "left_ankle"],
  ["left_knee", "center"],
  ["right_knee", "center"],
  ["right_knee", "right_ankle"],
  ["center", "top_arm"],
];

export const Editor = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [imageSrc, setImageSrc] = useState("/starfish2.JPG");
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [display, setDisplay] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [points, setPoints] = useState<Points | null>(null);

  const loadImageSize = (src: string) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  };

  useEffect(() => {
    loadImageSize(imageSrc);
  }, [imageSrc]);

  useEffect(() => {
    if (!containerRef.current || !imageSize) return;

    const resize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const containerRatio = rect.width / rect.height;
      const imageRatio = imageSize.width / imageSize.height;

      let displayWidth, displayHeight, offsetLeft, offsetTop;

      if (imageRatio > containerRatio) {
        displayWidth = rect.width;
        displayHeight = rect.width / imageRatio;
        offsetLeft = 0;
        offsetTop = (rect.height - displayHeight) / 2;
      } else {
        displayHeight = rect.height;
        displayWidth = rect.height * imageRatio;
        offsetTop = 0;
        offsetLeft = (rect.width - displayWidth) / 2;
      }

      setDisplay({
        left: offsetLeft,
        top: offsetTop,
        width: displayWidth,
        height: displayHeight,
      });
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [imageSize]);

  useEffect(() => {
    if (!imageSize) return;

    const cx = imageSize.width / 2;
    const cy = imageSize.height / 2;
    const radius = Math.min(imageSize.width, imageSize.height) / 4;

    const newPoints: Points = {
      center: { x: cx, y: cy },
      top_arm: { x: cx, y: cy - radius },
      left_wrist: {
        x: cx - radius * Math.cos(Math.PI / 4),
        y: cy - radius * Math.sin(Math.PI / 4),
      },
      left_elbow: {
        x: cx - (radius / 2) * Math.cos(Math.PI / 4),
        y: cy - (radius / 2) * Math.sin(Math.PI / 4),
      },
      right_elbow: {
        x: cx + (radius / 2) * Math.cos(Math.PI / 4),
        y: cy - (radius / 2) * Math.sin(Math.PI / 4),
      },
      right_wrist: {
        x: cx + radius * Math.cos(Math.PI / 4),
        y: cy - radius * Math.sin(Math.PI / 4),
      },
      left_knee: {
        x: cx - radius / 2,
        y: cy + radius / 2,
      },
      left_ankle: {
        x: cx - radius,
        y: cy + radius,
      },
      right_knee: {
        x: cx + radius / 2,
        y: cy + radius / 2,
      },
      right_ankle: {
        x: cx + radius,
        y: cy + radius,
      },
    };

    setPoints(newPoints);
  }, [imageSize]);

  const downloadJSON = () => {
    if (!points || !imageFilename) return;
    const newFormat = _.map(points, (v, k) => ({
      name: k,
      x: Math.round(v.x),
      y: Math.round(v.y),
    }));
    const blob = new Blob([JSON.stringify(newFormat, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = imageFilename + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setImageFilename(file.name);
  };

  if (!points || !display)
    return (
      <div
        ref={containerRef}
        className="w-full h-screen bg-gray-200"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        Loading...
      </div>
    );

  const toDisplay = (p: { x: number; y: number }) => ({
    x: display.left + (p.x / imageSize!.width) * display.width,
    y: display.top + (p.y / imageSize!.height) * display.height,
  });

  const toImage = (x: number, y: number) => ({
    x: ((x - display.left) / display.width) * imageSize!.width,
    y: ((y - display.top) / display.height) * imageSize!.height,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-gray-200 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <img
        ref={imageRef}
        src={imageSrc}
        alt="starfish"
        className="absolute w-full h-full object-contain"
      />
      <svg className="absolute w-full h-full pointer-events-none">
        {connections.map(([p1, p2]) => {
          const d1 = toDisplay(points[p1]);
          const d2 = toDisplay(points[p2]);
          return (
            <line
              key={`${p1}-${p2}`}
              x1={d1.x}
              y1={d1.y}
              x2={d2.x}
              y2={d2.y}
              stroke="red"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      {pointsList.map((name) => {
        const disp = toDisplay(points[name]);
        return (
          <div
            key={name}
            className="absolute bg-blue-500 rounded-full w-4 h-4 cursor-pointer"
            style={{
              left: disp.x - 8,
              top: disp.y - 8,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const move = (moveEvent: MouseEvent) => {
                const rect = containerRef.current!.getBoundingClientRect();
                const x = moveEvent.clientX - rect.left;
                const y = moveEvent.clientY - rect.top;
                const imgCoords = toImage(x, y);
                setPoints((prev) => ({
                  ...prev!,
                  [name]: imgCoords,
                }));
              };
              const up = () => {
                window.removeEventListener("mousemove", move);
                window.removeEventListener("mouseup", up);
              };
              window.addEventListener("mousemove", move);
              window.addEventListener("mouseup", up);
            }}
          />
        );
      })}
      {imageFilename && (
        <div className="absolute top-4 left-4 bg-white text-black px-2 py-1 rounded shadow">
          {imageFilename}
        </div>
      )}
      <button
        onClick={downloadJSON}
        className="absolute bottom-4 left-4 bg-green-500 text-white px-4 py-2 rounded"
      >
        Download JSON
      </button>
    </div>
  );
};
