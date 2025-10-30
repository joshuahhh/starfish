import { useEffect, useState } from "react";
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
        onClick={handleSelectDirectory}
        disabled={!supportsRealFS}
        className={`fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all ${
          {
            opfs: "bg-blue-600 enabled:hover:bg-blue-700 text-white",
            realfs: "bg-green-600 enabled:hover:bg-green-700 text-white",
          }[fileAccess.type]
        }`}
        title={
          {
            opfs: `Storing pictures locally in browser.${supportsRealFS ? " Click to select a folder." : ""}`,
            realfs: "Storing pictures in selected folder. Click to change.",
          }[fileAccess.type]
        }
      >
        📁
      </button>
    </FileAccessContext.Provider>
  );
};
