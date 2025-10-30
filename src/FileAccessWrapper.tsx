import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileAccessContext } from "./FileAccessContext.js";
import {
  FileAccessFromFS,
  opfsFileAccess,
  restoreDirectoryHandle,
  selectLocalDirectory,
} from "./FileAccessFromFS.js";

export const FileAccessWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [fileAccess, setFileAccess] = useState<FileAccessFromFS | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function go() {
      // Try to restore previously selected directory
      const localAccess = await restoreDirectoryHandle();
      if (localAccess) {
        console.log("Directory handle restored");
        setFileAccess(localAccess);
      } else {
        console.log("Using server file access");
        setFileAccess(await opfsFileAccess());
      }
    }

    go();
  }, []);

  const handleSelectDirectory = async () => {
    try {
      let localAccess = await selectLocalDirectory();
      if (!localAccess) {
        localAccess = await opfsFileAccess();
      }
      setFileAccess(localAccess);
    } catch (err) {
      // User cancelled or error occurred
      console.error("Failed to select directory:", err);
    }
  };

  if (!fileAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <style>{`html, body { background: black; }`}</style>
        <div className="text-2xl text-white dynapuff">
          Loading file access...
        </div>
      </div>
    );
  }

  const supportsRealFS = !!window.showDirectoryPicker;

  return (
    <FileAccessContext.Provider value={fileAccess}>
      {children}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 left-4 z-50 text-3xl hover:scale-110 transition-transform"
        title="Settings"
      >
        ⚙️
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-gray-900 text-white rounded-lg p-6 max-w-md w-full mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Settings</h2>
            </div>
            <div className="space-y-4">
              {fileAccess.type === "opfs" ? (
                <>
                  <p className="text-gray-300">
                    Snaps are being saved locally, inside your browser.
                  </p>
                  {supportsRealFS ? (
                    <button
                      onClick={() => {
                        handleSelectDirectory();
                        setIsModalOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Pick a folder to save snaps in
                    </button>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Your browser doesn't support picking a folder.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-300">
                    Snaps are being saved in a folder you picked.
                  </p>
                  <button
                    onClick={async () => {
                      setFileAccess(await opfsFileAccess());
                      setIsModalOpen(false);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Switch to saving them locally, inside your browser
                  </button>
                </>
              )}
              <Link
                to="/gallery"
                className="block text-center text-blue-400 hover:text-blue-300 underline"
                onClick={() => setIsModalOpen(false)}
              >
                View gallery
              </Link>
            </div>
          </div>
        </div>
      )}
    </FileAccessContext.Provider>
  );
};
