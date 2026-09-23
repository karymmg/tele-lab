import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./i18n";
import "./styles/global.css";
import "./styles/site-polish.css";

// Dismiss splash screen after React mounts
function dismissSplash() {
  const splash = document.getElementById("tl-splash");
  if (splash) {
    // Small delay so the app has time to paint first frame
    requestAnimationFrame(() => {
      setTimeout(() => {
        splash.classList.add("hide");
        // Remove from DOM after transition
        setTimeout(() => splash.remove(), 600);
      }, 300);
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// Dismiss after the app has rendered
dismissSplash();
