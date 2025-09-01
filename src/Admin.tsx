import { useEffect, useState } from "react";
import { starfishImgNames } from "./Game.js";
import { listFiles } from "./WinScreen.js";
import {
  downloadSvgAsJpeg,
  imageToDataUri,
  SVGContainerElement,
} from "./svg-stuff.js";

export const Admin = () => {
  const [numStarfish, setNumStarfish] = useState(0);
  const [numWins, setNumWins] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNumStarfish(document.querySelectorAll(".starfish-pic").length);
      setNumWins(document.querySelectorAll(".win-pic").length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-10">
      <h2 className="text-lg font-bold pb-4">
        {numStarfish} happy starfish; {numWins} happy humans.
      </h2>
      <div className="flex flex-col items-start gap-2">
        {starfishImgNames.map((starfishImgName) => (
          <PicsForStarfish
            key={starfishImgName}
            starfishImgName={starfishImgName}
          />
        ))}
      </div>
    </div>
  );
};

export const PicsForStarfish = ({
  starfishImgName,
}: {
  starfishImgName: string;
}) => {
  const [winImgNames, setWinImgNames] = useState<string[] | null>(null);

  const folder = `./snaps/${starfishImgName}/`;

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const winImgNames = await listFiles(folder);
        setWinImgNames(winImgNames);
      } catch (error) {
        console.error("Failed to list files:", error);
      }
    };
    fetchFiles();
  }, [folder]);

  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-row justify-end min-w-48">
        <img
          key={starfishImgName}
          src={`img/${starfishImgName}`}
          alt={starfishImgName}
          className="starfish-pic max-h-32 scale-x-[-1]"
        />
      </div>
      {winImgNames !== null ? (
        <div className="flex flex-row flex-wrap gap-2">
          {winImgNames.map((winImgName) => (
            <a
              key={winImgName}
              href={`#souvenir/${starfishImgName}/${winImgName}`}
            >
              <img
                src={`${folder}${winImgName}`}
                className="win-pic max-h-32"
              />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const Souvenir = (props: {
  starfishImgName: string;
  winImgName: string;
}) => {
  const { starfishImgName, winImgName } = props;

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
    };
    go();
  }, [starfishImgName, svgDiv, winImgName]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#46828C]">
      <div className="flex flex-col items-center gap-4">
        <div ref={setSvgDiv} className="flex w-[50vw]" />
        <button
          onClick={async () => {
            const svg = svgDiv!.querySelector("svg")! as SVGContainerElement;
            await downloadSvgAsJpeg(svg);
          }}
        >
          Download Souvenir
        </button>
      </div>
    </div>
  );
};
