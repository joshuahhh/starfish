import { useCallback, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileMetadata } from "./FileAccess.js";
import { FileAccessContext } from "./FileAccessContext.js";
import { starfishImgNames } from "./Game.js";
import { ImgFromFileAccess } from "./ImgFromFileAccess.js";

type SortMode = "starfish" | "date";

const Snap = ({
  starfishImgName,
  filename,
  mtime,
  onDeleted,
  imgClassName,
}: {
  starfishImgName: string;
  filename: string;
  mtime: string;
  onDeleted: () => void;
  imgClassName?: string;
}) => {
  const fileAccess = useContext(FileAccessContext);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }
    try {
      await fileAccess.deleteFile(`snaps/${starfishImgName}`, filename);
      onDeleted();
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Failed to delete image");
    }
  };

  return (
    <div className={`relative flex flex-col items-center gap-1`}>
      <a
        href={`#souvenir/${starfishImgName}/${filename}`}
        className="flex flex-col items-center gap-1"
      >
        <div className="relative">
          <ImgFromFileAccess
            folder={`snaps/${starfishImgName}`}
            filename={filename}
            className={imgClassName}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg"
            title="Delete image"
          >
            ×
          </button>
        </div>

        <div className="text-xs text-gray-600">
          {new Date(mtime).toLocaleString()}
        </div>
      </a>
    </div>
  );
};

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

  const fetchAllImages = useCallback(async () => {
    const allImagesPromises = starfishImgNames.map(async (starfishImgName) => {
      const folder = `snaps/${starfishImgName}/`;
      try {
        const files = await fileAccess.listFiles(folder);
        return files.map((file) => ({ ...file, starfishImgName }));
      } catch (error) {
        console.error("Failed to list files:", error);
        return [];
      }
    });
    const results = await Promise.all(allImagesPromises);
    const flattened = results.flat();
    setAllImages(flattened);
  }, [fileAccess]);

  useEffect(() => {
    fetchAllImages();
  }, [fetchAllImages, fileAccess]);

  const numStarfish = starfishImgNames.length;
  const numWins = allImages.length;

  const handleDownloadZip = async () => {
    try {
      await fileAccess.downloadAsZip();
    } catch (error) {
      console.error("Failed to download ZIP:", error);
      alert("Failed to download ZIP file");
    }
  };

  return (
    <div className="p-10">
      <div className="flex justify-between items-center pb-4">
        <h2 className="text-lg font-bold">
          {numStarfish} happy starfish; {numWins} happy humans.
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadZip}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
            title="Download all snaps as ZIP"
          >
            Download ZIP
          </button>
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
                  {images.map(({ filename, mtime }) => (
                    <Snap
                      key={filename}
                      imgClassName="max-h-32"
                      starfishImgName={starfishImgName}
                      filename={filename}
                      mtime={mtime}
                      onDeleted={fetchAllImages}
                    />
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
            .map(({ filename, starfishImgName, mtime }) => (
              <Snap
                key={`${starfishImgName}/${filename}`}
                starfishImgName={starfishImgName}
                filename={filename}
                mtime={mtime}
                onDeleted={fetchAllImages}
              />
            ))}
        </div>
      )}
    </div>
  );
};
