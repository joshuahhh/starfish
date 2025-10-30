import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { autoRoute } from "./autoRoute.js";
import { Editor } from "./Editor.js";
import { FileAccessWrapper } from "./FileAccessWrapper.js";
import { Gallery } from "./Gallery.js";
import { Game } from "./Game.js";
import "./index.css";
import { Souvenir } from "./Souvenir.js";
import { Test } from "./Test.js";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <FileAccessWrapper>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/gallery" element={<Gallery />} />
          {autoRoute("/souvenir/:starfishImgName/:winImgName", Souvenir)}
          <Route path="/test" element={<Test />} />
        </Routes>
      </FileAccessWrapper>
    </HashRouter>
  </React.StrictMode>,
);
