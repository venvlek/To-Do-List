import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// ── Mount React app ───────────────────────────────────────────────────────────
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ── Register Service Worker ───────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("✅ Service Worker registered:", reg.scope);

        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60000);

        // Notify user when a new version is available
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — show a non-intrusive update prompt
              const shouldUpdate = window.confirm(
                "🎉 A new version of DoIt is available! Refresh to update?"
              );
              if (shouldUpdate) window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.warn("Service Worker registration failed:", err));
  });
}
