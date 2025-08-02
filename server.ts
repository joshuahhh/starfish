import cors from "cors";
import express from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";

const app = express();
const upload = multer();

app.use(cors());

app.post("/upload", upload.single("file"), async (req, res) => {
  const folder = req.body.folder;
  const file = req.file;

  if (!folder || !file) {
    res.status(400).send("Missing folder or file");
    return;
  }

  const folderPath = path.resolve(folder);
  await fs.mkdir(folderPath, { recursive: true });

  // Find smallest unused number
  const entries = await fs.readdir(folderPath);
  const usedNumbers = new Set<number>();

  for (const entry of entries) {
    const match = entry.match(/^(\d{4})\.png$/);
    if (match) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  }

  let i = 1;
  while (usedNumbers.has(i)) i++;

  const filename = `${i.toString().padStart(4, "0")}.png`;
  const fullPath = path.join(folderPath, filename);

  await fs.writeFile(fullPath, file.buffer);
  res.send(`Uploaded as ${filename}`);
  console.log(`Uploaded as ${fullPath}`);
});

app.get("/list", async (req, res) => {
  const folder = req.query.folder as string;
  if (!folder) {
    res.status(400).send("Missing folder parameter");
    return;
  }

  const folderPath = path.resolve("public", folder);
  try {
    const entries = await fs.readdir(folderPath);
    const files = entries.filter((entry) => entry.endsWith(".png"));
    res.json(files);
  } catch (error) {
    console.error("Error reading folder:", error);
    res.status(500).send("Error reading folder");
  }
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
