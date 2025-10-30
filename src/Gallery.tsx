import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileMetadata } from "./FileAccess.js";
import { FileAccessContext } from "./FileAccessContext.js";
import { starfishImgNames } from "./Game.js";
import { ImgFromFileAccess } from "./ImgFromFileAccess.js";

type SortMode = "starfish" | "date";

export const Gallery = () => {
  const fileAccess = useContext(FileAccessContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const sortMode: SortMode =
    (searchParams.get("sort") as SortMode | null) ?? "starfish";
  const setSortMode = (mode: SortMode) => {
    setSearchParams({ sort: mode });
  };

  const [allImages, setAllImages] = useState<
    Array<FileMetadata & { starfishImgName: string }>
  >([]);

  useEffect(() => {
    const fetchAllImages = async () => {
      const allImagesPromises = starfishImgNames.map(
        async (starfishImgName) => {
          const folder = `snaps/${starfishImgName}/`;
          try {
            const files = await fileAccess.listFiles(folder);
            return files.map((file) => ({ ...file, starfishImgName }));
          } catch (error) {
            console.error("Failed to list files:", error);
            return [];
          }
        },
      );
      const results = await Promise.all(allImagesPromises);
      const flattened = results.flat();
      setAllImages(flattened);
    };
    fetchAllImages();
  }, [fileAccess]);

  const numStarfish = starfishImgNames.length;
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
              (img) => img.starfishImgName === starfishImgName,
            );
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
                      <ImgFromFileAccess
                        folder={`snaps/${starfishImgName}`}
                        filename={file.filename}
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
                <ImgFromFileAccess
                  folder={`snaps/${image.starfishImgName}`}
                  filename={image.filename}
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
