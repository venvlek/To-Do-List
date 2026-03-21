// hooks/useInstallPrompt.js
// Captures the browser's "beforeinstallprompt" event so we can show
// a custom "Install App" button instead of the default browser banner.

import { useState, useEffect } from "react";

export default function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [isIOS,         setIsIOS]         = useState(false);

  useEffect(() => {
    // Check if already installed (running in standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Capture the install prompt event (Chrome / Android / Edge)
    const handler = (e) => {
      e.preventDefault(); // Don't show the default browser mini-infobar
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  // Show the install button if:
  // - Not already installed AND
  // - Either: browser gave us a prompt (Chrome/Android) OR it's iOS
  const canInstall = !isInstalled && (!!installPrompt || isIOS);

  return { canInstall, isInstalled, isIOS, promptInstall };
}
