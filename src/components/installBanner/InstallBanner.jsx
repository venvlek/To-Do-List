import { useState } from "react";
import useInstallPrompt from "../../hooks/useInstallPrompt";
import "./InstallBanner.css";

export default function InstallBanner({ visible }) {
  const { canInstall, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showIOS,   setShowIOS]   = useState(false);

  // Only show when dashboard is visible, not dismissed, and installable
  if (!visible || dismissed || !canInstall) return null;

  // ── iOS: show step-by-step instructions ──────────────────────────────────
  if (isIOS) {
    if (showIOS) {
      return (
        <div className="install-ios-sheet">
          <div className="install-ios-sheet__header">
            <h3 className="install-ios-sheet__title">Install DoIt on iOS</h3>
            <button className="install-ios-sheet__close" onClick={() => setDismissed(true)}>✕</button>
          </div>
          <div className="install-ios-steps">
            <div className="install-ios-step">
              <span className="install-ios-step__num">1</span>
              <span className="install-ios-step__icon">⬆️</span>
              <span>Tap the <strong>Share</strong> button in Safari's toolbar</span>
            </div>
            <div className="install-ios-step">
              <span className="install-ios-step__num">2</span>
              <span className="install-ios-step__icon">➕</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </div>
            <div className="install-ios-step">
              <span className="install-ios-step__num">3</span>
              <span className="install-ios-step__icon">✅</span>
              <span>Tap <strong>Add</strong> — DoIt will appear on your home screen</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="install-banner">
        <div className="install-banner__icon">✓</div>
        <div className="install-banner__text">
          <p className="install-banner__title">Install DoIt</p>
          <p className="install-banner__sub">Add to your home screen for the best experience</p>
        </div>
        <button className="install-banner__btn" onClick={() => setShowIOS(true)}>
          How to
        </button>
        <button className="install-banner__close" onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  // ── Chrome / Android / Edge: one-tap install ──────────────────────────────
  return (
    <div className="install-banner">
      <div className="install-banner__icon">✓</div>
      <div className="install-banner__text">
        <p className="install-banner__title">Install DoIt</p>
        <p className="install-banner__sub">Works offline · No app store needed</p>
      </div>
      <button className="install-banner__btn" onClick={promptInstall}>
        Install
      </button>
      <button className="install-banner__close" onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}
