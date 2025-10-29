import { useEffect, useState } from "react";
import {
  downloadSvgAsJpeg,
  imageToDataUri,
  SVGContainerElement,
} from "./svg-stuff.js";

export const SouvenirImage = (props: {
  starfishImgName: string;
  winImgName: string;
  onSvgReady?: (svg: SVGContainerElement) => void;
}) => {
  const { starfishImgName, winImgName, onSvgReady } = props;

  const [svgDiv, setSvgDiv] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgDiv) return;
    const go = async () => {
      const [flippedStarfishDataUri, winDataUri] = await Promise.all([
        imageToDataUri(`./img/${starfishImgName}`, { flipHorizontal: true }),
        imageToDataUri(`./snaps/${starfishImgName}/${winImgName}`),
      ]);

      const text = await (await fetch("souvenir/template.svg")).text();
      const svg = new DOMParser().parseFromString(text, "image/svg+xml")
        .documentElement as SVGContainerElement;
      svg
        .querySelector("#image2_77_4")!
        .setAttribute("href", flippedStarfishDataUri);
      svg.querySelector("#image0_77_4")!.setAttribute("href", winDataUri);

      svg.removeAttribute("width");
      svg.removeAttribute("height");

      svgDiv.replaceChildren(svg);

      if (onSvgReady) {
        onSvgReady(svg);
      }
    };
    go();
  }, [starfishImgName, svgDiv, winImgName, onSvgReady]);

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
