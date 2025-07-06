import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Editor } from "./Editor.js";
import { Game } from "./Game.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
