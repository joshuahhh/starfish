import { ReactNode, useContext, useEffect, useState } from "react";
import { FileAccessContext } from "./FileAccessContext.js";
import {
  downloadSvgAsJpeg,
  imageToDataUrl,
  SVGContainerElement,
} from "./svg-stuff.js";

export const SouvenirImage = (props: {
  starfishImgName: string;
  winImg: { filename: string } | { dataUrl: string };
  showDownloadButton?: boolean;
}) => {
  const { starfishImgName, winImg, showDownloadButton = false } = props;

  const [svgDiv, setSvgDiv] = useState<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<SVGContainerElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileAccess = useContext(FileAccessContext);

  useEffect(() => {
    if (!svgDiv) return;
    const go = async () => {
      // Load the starfish image to get its dimensions
      const starfishImg = new Image();
      starfishImg.src = `./img/${starfishImgName}`;
      await new Promise((resolve) => (starfishImg.onload = resolve));

      const isPortrait = starfishImg.height > starfishImg.width;

      const starfishDataUrl = await imageToDataUrl(`./img/${starfishImgName}`);

      let winUrl: string;
      if ("dataUrl" in winImg) {
        winUrl = winImg.dataUrl;
      } else {
        const blobUrl = await fileAccess.getFileContentsUrl(
          `snaps/${starfishImgName}`,
          winImg.filename,
        );
        // Convert blob URL to data URL for Chrome compatibility
        winUrl = await imageToDataUrl(blobUrl);
      }

      const text = await (await fetch("souvenir/template.svg")).text();
      const svg = new DOMParser().parseFromString(text, "image/svg+xml")
        .documentElement as SVGContainerElement;

      // the starfish is now reflected in the svg template
      svg.querySelector("#image2_77_4")!.setAttribute("href", starfishDataUrl);
      svg.querySelector("#image0_77_4")!.setAttribute("href", winUrl);

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
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.objectFit = "contain";

      svgDiv.replaceChildren(svg);

      setSvg(svg);
    };
    go();
  }, [starfishImgName, svgDiv, winImg, fileAccess]);

  const handleDownload = async () => {
    if (!svg) return;
    setIsDownloading(true);
    try {
      await downloadSvgAsJpeg(svg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative">
      <div ref={setSvgDiv} className="w-full h-full" />
      {showDownloadButton && (
        <button
          onClick={handleDownload}
          disabled={isDownloading || !svg}
          className="dynapuff absolute bottom-0 right-4 translate-y-1/2 bg-[#ff6b6b] hover:bg-[#ff5252] disabled:opacity-50 disabled:cursor-wait text-white text-xl px-6 py-2 rounded-[2rem] shadow-lg hover:scale-105 hover:rotate-2 transition-all"
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
        >
          {isDownloading ? "Downloading..." : "Download!"}
        </button>
      )}
    </div>
  );
};

export const SouvenirImageCenterer = (props: { children: ReactNode }) => {
  // this is where we spent like an hour figuring out how to do "max
  // size while preserving aspect ratio"; apparently this used to be
  // impossible before "container queries", whatever that means; ugh

  return (
    <div className="w-full h-full grid place-items-center [container-type:size]">
      <div className="relative aspect-[1522/1008] w-[min(100cqi,calc(100cqh*1522/1008))]">
        {props.children}
      </div>
    </div>
  );
};

export const Souvenir = (props: {
  starfishImgName: string;
  winImgName: string;
}) => {
  const { starfishImgName, winImgName } = props;

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#46828C]">
      <div className="w-full h-[80vh]">
        <SouvenirImageCenterer>
          <SouvenirImage
            starfishImgName={starfishImgName}
            winImg={{ filename: winImgName }}
            showDownloadButton={true}
          />
        </SouvenirImageCenterer>
      </div>
    </div>
  );
};
