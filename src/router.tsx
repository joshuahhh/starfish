import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Gallery, Souvenir } from "./Gallery.js";
import { autoRoute } from "./autoRoute.js";
import { Editor } from "./Editor.js";
import { Game } from "./Game.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/gallery" element={<Gallery />} />
        {autoRoute("/souvenir/:starfishImgName/:winImgName", Souvenir)}
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
