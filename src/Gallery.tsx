import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileMetadata } from "./FileAccess.js";
import { FileAccessContext } from "./FileAccessContext.js";
import { starfishImgNames } from "./Game.js";
import { ImgFromFileAccess } from "./ImgFromFileAccess.js";

type SortMode = "starfish" | "date";

const Snap = ({
  starfishImgName,
  filename,
  timestamp,
  onDeleted,
  imgClassName,
}: {
  starfishImgName: string;
  filename: string;
  timestamp: string;
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
          {new Date(timestamp).toLocaleString()}
        </div>
      </a>
    </div>
  );
};

export const Gallery = () => {
  const fileAccess = useContext(FileAccessContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const sortMode: SortMode =
    (searchParams.get("sort") as SortMode | null) ?? "date";
  const setSortMode = (mode: SortMode) => {
    setSearchParams({ sort: mode });
  };

  const [allImages, setAllImages] = useState<
    Array<FileMetadata & { starfishImgName: string }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleDeleteAll = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ALL ${numWins} images? This cannot be undone!`
      )
    ) {
      return;
    }

    // Double confirmation for safety
    if (!confirm("This will permanently delete all snaps. Are you REALLY sure?")) {
      return;
    }

    setIsUploading(true);
    try {
      // Delete all images
      for (const image of allImages) {
        await fileAccess.deleteFile(
          `snaps/${image.starfishImgName}`,
          image.filename
        );
      }
      await fetchAllImages();
      alert("All images deleted successfully");
    } catch (error) {
      console.error("Failed to delete all images:", error);
      alert("Failed to delete all images");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadZip = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      alert("Please upload a ZIP file");
      return;
    }

    setIsUploading(true);
    try {
      await fileAccess.uploadFromZip(file);
      await fetchAllImages();
    } catch (error) {
      console.error("Failed to upload ZIP:", error);
      alert("Failed to upload ZIP file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find((f) => f.name.endsWith(".zip"));

    if (zipFile) {
      handleUploadZip(zipFile);
    } else {
      alert("Please drop a ZIP file");
    }
  };

  return (
    <div
      className="p-10 relative min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-8 shadow-2xl">
            <p className="text-2xl font-bold text-blue-600">
              Drop ZIP file to upload
            </p>
          </div>
        </div>
      )}
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl">
            <p className="text-xl font-bold">Processing...</p>
          </div>
        </div>
      )}
      <Link to="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← back to game
      </Link>
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
            onClick={handleDeleteAll}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white mr-12"
            title="Delete all snaps"
            disabled={numWins === 0}
          >
            Delete All
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
            const images = allImages
              .filter((img) => img.starfishImgName === starfishImgName)
              .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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
                  {images.map(({ filename, timestamp }) => (
                    <Snap
                      key={filename}
                      imgClassName="max-h-32"
                      starfishImgName={starfishImgName}
                      filename={filename}
                      timestamp={timestamp}
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
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .map(({ filename, starfishImgName, timestamp }) => (
              <Snap
                key={`${starfishImgName}/${filename}`}
                starfishImgName={starfishImgName}
                filename={filename}
                timestamp={timestamp}
                onDeleted={fetchAllImages}
              />
            ))}
        </div>
      )}
    </div>
  );
};
