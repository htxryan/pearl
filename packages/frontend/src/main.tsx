import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found. Check index.html.");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
