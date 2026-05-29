import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "maplibre-gl/dist/maplibre-gl.css";

const MIN_SPLASH_MS = 1200;
const startedAt = performance.now();

createRoot(document.getElementById("root")!).render(<App />);

requestAnimationFrame(() => {
  const splash = document.getElementById("tilo-splash");
  if (!splash) return;
  const elapsed = performance.now() - startedAt;
  const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
  window.setTimeout(() => {
    splash.classList.add("tilo-splash-hide");
    window.setTimeout(() => splash.remove(), 750);
  }, wait);
});
