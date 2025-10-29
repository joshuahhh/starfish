import { useEffect, useState } from "react";
import { fileAccess, FileMetadata } from "./api.js";
import { starfishImgNames } from "./Game.js";
import {
  downloadSvgAsJpeg,
  imageToDataUri,
  SVGContainerElement,
} from "./svg-stuff.js";

type SortMode = "starfish" | "date";

export const Gallery = () => {
  const [sortMode, setSortMode] = useState<SortMode>("starfish");
  const [allImages, setAllImages] = useState<
    Array<FileMetadata & { starfishImgName: string }>
  >([]);

  useEffect(() => {
    const fetchAllImages = async () => {
      const allImagesPromises = starfishImgNames.map(
        async (starfishImgName) => {
          const folder = `./snaps/${starfishImgName}/`;
          try {
            const files = await fileAccess.listFiles(folder);
            return files.map((file) => ({ ...file, starfishImgName }));
          } catch (error) {
            console.error("Failed to list files:", error);
            return [];
          }
        }
      );
      const results = await Promise.all(allImagesPromises);
      const flattened = results.flat();
      setAllImages(flattened);
    };
    fetchAllImages();
  }, []);

  const numStarfish = new Set(allImages.map((img) => img.starfishImgName)).size;
  const numWins = allImages.length;

  return (
    <div className="p-10">
      <div className="flex justify-between items-center pb-4">
        <h2 className="text-lg font-bold">
          {numStarfish} happy starfish; {numWins} happy humans.
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortMode("starfish")}
            className={`px-4 py-2 rounded ${
              sortMode === "starfish"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Sort by Starfish
          </button>
          <button
            onClick={() => setSortMode("date")}
            className={`px-4 py-2 rounded ${
              sortMode === "date"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Sort by Date
          </button>
        </div>
      </div>
      {sortMode === "starfish" ? (
        <div className="flex flex-col items-start gap-2">
          {starfishImgNames.map((starfishImgName) => {
            const images = allImages.filter(
              (img) => img.starfishImgName === starfishImgName
            );
            if (images.length === 0) return null;
            return (
              <div key={starfishImgName} className="flex flex-row gap-2">
                <div className="flex flex-row justify-end min-w-48">
                  <img
                    src={`img/${starfishImgName}`}
                    alt={starfishImgName}
                    className="starfish-pic max-h-32 scale-x-[-1]"
                  />
                </div>
                <div className="flex flex-row flex-wrap gap-2">
                  {images.map((file) => (
                    <a
                      key={file.filename}
                      href={`#souvenir/${starfishImgName}/${file.filename}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <img
                        src={`./snaps/${starfishImgName}/${file.filename}`}
                        className="win-pic max-h-32"
                      />
                      <div className="text-xs text-gray-600">
                        {new Date(file.mtime).toLocaleString()}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {[...allImages]
            .sort((a, b) => b.mtime.localeCompare(a.mtime))
            .map((image) => (
              <a
                key={`${image.starfishImgName}/${image.filename}`}
                href={`#souvenir/${image.starfishImgName}/${image.filename}`}
                className="flex flex-col items-center gap-1"
              >
                <img
                  src={`./snaps/${image.starfishImgName}/${image.filename}`}
                  className="win-pic w-full"
                />
                <div className="text-xs text-gray-600">
                  {new Date(image.mtime).toLocaleString()}
                </div>
              </a>
            ))}
        </div>
      )}
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
