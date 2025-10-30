import { useEffect, useState } from "react";
import {
  downloadSvgAsJpeg,
  imageToDataUrl,
  SVGContainerElement,
} from "./svg-stuff.js";

export const SouvenirImage = (props: {
  starfishImgName: string;
  winImgName?: string;
  winDataUrl?: string;
  onSvgReady?: (svg: SVGContainerElement) => void;
}) => {
  const { starfishImgName, winImgName, winDataUrl, onSvgReady } = props;

  const [svgDiv, setSvgDiv] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgDiv) return;
    const go = async () => {
      // Load the starfish image to get its dimensions
      const starfishImg = new Image();
      starfishImg.src = `./img/${starfishImgName}`;
      await new Promise((resolve) => (starfishImg.onload = resolve));

      const isPortrait = starfishImg.height > starfishImg.width;

      const starfishDataUrl = await imageToDataUrl(`./img/${starfishImgName}`);
      const winDataUrlFinal =
        winDataUrl ??
        (await imageToDataUrl(`./snaps/${starfishImgName}/${winImgName}`));

      const text = await (await fetch("souvenir/template.svg")).text();
      const svg = new DOMParser().parseFromString(text, "image/svg+xml")
        .documentElement as SVGContainerElement;

      // the starfish is now reflected in the svg template
      svg.querySelector("#image2_77_4")!.setAttribute("href", starfishDataUrl);
      svg.querySelector("#image0_77_4")!.setAttribute("href", winDataUrlFinal);

      // Adjust the starfish rect if portrait mode
      if (isPortrait) {
        const rect = svg.querySelector(
          'rect[fill="url(#pattern3_77_4)"]',
        ) as SVGRectElement;
        if (rect) {
          const width = parseFloat(rect.getAttribute("width")!);
          const height = parseFloat(rect.getAttribute("height")!);
          const y = parseFloat(rect.getAttribute("y")!);

          // Swap dimensions and adjust y to keep bottom-left corner fixed
          rect.setAttribute("width", height.toString());
          rect.setAttribute("height", width.toString());
          rect.setAttribute("y", (y + height - width).toString());
        }
      }

      svg.removeAttribute("width");
      svg.removeAttribute("height");

      svgDiv.replaceChildren(svg);

      if (onSvgReady) {
        onSvgReady(svg);
      }
    };
    go();
  }, [starfishImgName, svgDiv, winImgName, winDataUrl, onSvgReady]);

  return <div ref={setSvgDiv} className="flex w-full" />;
};

export const Souvenir = (props: {
  starfishImgName: string;
  winImgName: string;
}) => {
  const { starfishImgName, winImgName } = props;

  const [svg, setSvg] = useState<SVGContainerElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#46828C]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-[50vw]">
          <SouvenirImage
            starfishImgName={starfishImgName}
            winImgName={winImgName}
            onSvgReady={setSvg}
          />
        </div>
        <button
          onClick={async () => {
            if (!svg) return;
            setIsDownloading(true);
            try {
              await downloadSvgAsJpeg(svg);
            } finally {
              setIsDownloading(false);
            }
          }}
          disabled={isDownloading || !svg}
          className={isDownloading ? "opacity-50 cursor-wait" : ""}
        >
          {isDownloading ? "Downloading..." : "Download Souvenir"}
        </button>
      </div>
    </div>
  );
};
