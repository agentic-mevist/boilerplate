import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyJuice } from "./juices";
import { useStore } from "./store";
import "./styles.css";

// The chosen juice colors the page before the first paint, and again whenever it changes.
applyJuice(useStore.getState().juice);
useStore.subscribe((s, prev) => {
  if (s.juice !== prev.juice) applyJuice(s.juice);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
