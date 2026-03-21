import { useState, useEffect, useCallback } from "react";
import useInstallPrompt from "../../hooks/useInstallPrompt";
import "./Settings.css";

const THEMES = [
  { id: "light", name: "Light", bg: "#f0f4ff", bar: "#1a1aff" },
  { id: "dark",  name: "Dark",  bg: "#0f0f1a", bar: "#7c6fff" },
  { id: "warm",  name: "Warm",  bg: "#faf7f2", bar: "#e85d3f" },
];

const NOTIF_TIMES = ["5 min", "15 min", "30 min", "1 hour", "1 day"];

function Toggle({ checked, onChange }) {
  return (
    <label className="settings__toggle" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings__toggle-track" />
      <span className="settings__toggle-thumb" />
    </label>
  );
}

export default function Settings({ visible, settings, onSettingsChange, onClearTasks, onLogOut, onRequestPermission, syncStatus, lastSynced, isAnonymous, user }) {
  const {
    profileName, profileEmail, theme,
    notifDueReminder, notifDailyDigest, notifWeeklyReport,
    notifReminderTime, soundEnabled, compactView,
  } = settings;

  const [draftName,  setDraftName]  = useState(profileName);
  const [draftEmail, setDraftEmail] = useState(profileEmail);
  const [savedMsg,   setSavedMsg]   = useState(false);
  const [permStatus, setPermStatus] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  const handleRequestPermission = useCallback(async () => {
    const result = await onRequestPermission();
    setPermStatus(result);
  }, [onRequestPermission]);

  const permLabel = {
    granted:     "✅ Notifications enabled",
    denied:      "🚫 Blocked — enable in browser settings",
    default:     "🔔 Tap to enable notifications",
    unsupported: "⚠️ Not supported in this browser",
  }[permStatus] || "🔔 Enable notifications";

  useEffect(() => { setDraftName(profileName || user?.displayName || '');  }, [profileName, user]);
  useEffect(() => { setDraftEmail(profileEmail || user?.email || ''); }, [profileEmail, user]);

  const { canInstall, isIOS, promptInstall } = useInstallPrompt();

  const set = (key, value) => onSettingsChange({ ...settings, [key]: value });

  const handleSaveProfile = () => {
    onSettingsChange({ ...settings, profileName: draftName.trim() || "You", profileEmail: draftEmail.trim() });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleClearTasks = () => {
    if (window.confirm("Delete ALL tasks? This cannot be undone.")) onClearTasks();
  };

  return (
    <div className={`settings${visible ? "" : " settings--hidden"}`}>
      <div className="settings__inner">

        {/* Title */}
        <div className="settings__header">
          <h2 className="settings__title"><span>Settings</span></h2>
          <p className="settings__subtitle">Personalise your experience</p>
        </div>

        {/* Profile */}
        <div className="settings__profile-card">
          <div className="settings__avatar-wrap">
            {user?.photoURL
              ? <img className="settings__avatar" src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" />
              : <div className="settings__avatar settings__avatar--initials">
                  {(user?.displayName || user?.email || "?").slice(0,2).toUpperCase()}
                </div>
            }
            <div className="settings__avatar-badge">✏️</div>
          </div>
          <div className="settings__profile-fields">
            <div>
              <span className="settings__field-label">Display name</span>
              <input className="settings__field-input" type="text" value={draftName}
                onChange={(e) => setDraftName(e.target.value)} placeholder="Your name" maxLength={40} />
            </div>
            <div>
              <span className="settings__field-label">Email</span>
              <input className="settings__field-input" type="email" value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <button className="settings__save-btn" onClick={handleSaveProfile}>Save profile</button>
            {savedMsg && <div className="settings__save-success">✓ Profile saved!</div>}
          </div>
        </div>

        {/* Appearance */}
        <div className="settings__section">
          <span className="settings__section-label">Appearance</span>
          <div className="settings__list">
            <div className="settings__theme-grid">
              {THEMES.map((t) => (
                <button key={t.id}
                  className={`settings__theme-swatch${theme === t.id ? " settings__theme-swatch--active" : ""}`}
                  onClick={() => set("theme", t.id)}>
                  <div className="settings__theme-preview" style={{ background: t.bg }}>
                    <div className="settings__theme-bar" style={{ background: t.bar }} />
                  </div>
                  <span className="settings__theme-name">{t.name}</span>
                  {theme === t.id && <span className="settings__theme-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">🗜️</div>
                <div className="settings__row-text">
                  <div className="settings__row-title">Compact view</div>
                  <div className="settings__row-desc">Smaller task cards, more on screen</div>
                </div>
              </div>
              <Toggle checked={compactView} onChange={() => set("compactView", !compactView)} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings__section">
          <span className="settings__section-label">Notifications</span>
          <div className="settings__list">
            {/* Permission request banner */}
            {permStatus !== "granted" && (
              <div
                className="settings__row"
                style={{ cursor: permStatus === "denied" ? "default" : "pointer" }}
                onClick={permStatus !== "denied" ? handleRequestPermission : undefined}
              >
                <div className="settings__row-left">
                  <div className="settings__row-icon">🔔</div>
                  <div className="settings__row-text">
                    <div className="settings__row-title">Browser notifications</div>
                    <div className="settings__row-desc">{permLabel}</div>
                  </div>
                </div>
                {permStatus === "default" && (
                  <span style={{ fontSize: 12, color: "var(--t-accent)", fontWeight: 700 }}>Enable</span>
                )}
              </div>
            )}

            {permStatus === "granted" && (
              <div className="settings__row">
                <div className="settings__row-left">
                  <div className="settings__row-icon">🔔</div>
                  <div className="settings__row-text">
                    <div className="settings__row-title">Due date reminders</div>
                    <div className="settings__row-desc">Alert before a task is due</div>
                  </div>
                </div>
                <Toggle checked={notifDueReminder} onChange={() => set("notifDueReminder", !notifDueReminder)} />
              </div>
            )}
            {notifDueReminder && (
              <div className="settings__row" style={{ paddingLeft: 64 }}>
                <div className="settings__row-text">
                  <div className="settings__row-desc">Remind me</div>
                </div>
                <select className="settings__notif-select" value={notifReminderTime}
                  onChange={(e) => set("notifReminderTime", e.target.value)}>
                  {NOTIF_TIMES.map((t) => <option key={t} value={t}>{t} before</option>)}
                </select>
              </div>
            )}
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">📋</div>
                <div className="settings__row-text">
                  <div className="settings__row-title">Daily digest</div>
                  <div className="settings__row-desc">Morning summary of today's tasks</div>
                </div>
              </div>
              <Toggle checked={notifDailyDigest} onChange={() => set("notifDailyDigest", !notifDailyDigest)} />
            </div>
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">📊</div>
                <div className="settings__row-text">
                  <div className="settings__row-title">Weekly report</div>
                  <div className="settings__row-desc">Sunday summary of your week</div>
                </div>
              </div>
              <Toggle checked={notifWeeklyReport} onChange={() => set("notifWeeklyReport", !notifWeeklyReport)} />
            </div>
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">🔊</div>
                <div className="settings__row-text">
                  <div className="settings__row-title">Sound effects</div>
                  <div className="settings__row-desc">Play sounds on task actions</div>
                </div>
              </div>
              <Toggle checked={soundEnabled} onChange={() => set("soundEnabled", !soundEnabled)} />
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="settings__section">
          <span className="settings__section-label">Data</span>
          <div className="settings__list">
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">☁️</div>
                <div className="settings__row-text">
                  <div className="settings__row-title">Cloud sync</div>
                  <div className="settings__row-desc">
                    {isAnonymous
                      ? "Sign in to sync tasks across all your devices"
                      : syncStatus === "synced"  && lastSynced
                      ? `Last synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : syncStatus === "syncing"
                      ? "Syncing…"
                      : syncStatus === "error"
                      ? "Sync error — check your connection"
                      : "Synced with Firestore"}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isAnonymous ? "var(--t-muted)"
                  : syncStatus === "synced"  ? "#22c55e"
                  : syncStatus === "syncing" ? "#f59e0b"
                  : syncStatus === "error"   ? "var(--t-danger)"
                  : "#22c55e"
              }}>
                {isAnonymous ? "Off" : syncStatus === "syncing" ? "●" : syncStatus === "error" ? "Error" : "On"}
              </span>
            </div>
            <div className="settings__row" style={{ cursor: "pointer" }} onClick={handleClearTasks}>
              <div className="settings__row-left">
                <div className="settings__row-icon settings__row-icon--danger">🗑️</div>
                <div className="settings__row-text">
                  <div className="settings__row-title settings__row-title--danger">Clear all tasks</div>
                  <div className="settings__row-desc">Permanently delete all tasks</div>
                </div>
              </div>
              <span style={{ fontSize: 18, color: "var(--t-danger)" }}>›</span>
            </div>
          </div>
        </div>


        {/* Account */}
        <div className="settings__section">
          <span className="settings__section-label">Account</span>
          <div className="settings__list">
            {user && (
              <div className="settings__row">
                <div className="settings__row-left">
                  <div className="settings__row-icon">👤</div>
                  <div className="settings__row-text">
                    <div className="settings__row-title">{user.isAnonymous ? "Guest" : (user.displayName || user.email)}</div>
                    <div className="settings__row-desc">{user.isAnonymous ? "Not signed in" : user.email}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="settings__row" style={{ cursor: "pointer" }} onClick={onLogOut}>
              <div className="settings__row-left">
                <div className="settings__row-icon settings__row-icon--danger">🚪</div>
                <div className="settings__row-text">
                  <div className="settings__row-title settings__row-title--danger">Sign out</div>
                  <div className="settings__row-desc">Return to the login screen</div>
                </div>
              </div>
              <span style={{ fontSize: 18, color: "var(--t-danger)" }}>›</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="settings__section">
          <span className="settings__section-label">About</span>
          <div className="settings__list">
            {canInstall && (
              <div className="settings__row" style={{ cursor: "pointer" }}
                onClick={isIOS ? undefined : promptInstall}>
                <div className="settings__row-left">
                  <div className="settings__row-icon">📲</div>
                  <div className="settings__row-text">
                    <div className="settings__row-title">Install App</div>
                    <div className="settings__row-desc">
                      {isIOS ? "Add to Home Screen via Safari Share" : "Install as a native app"}
                    </div>
                  </div>
                </div>
                {!isIOS && <span style={{ fontSize: 12, color: "var(--t-accent)", fontWeight: 700 }}>Install</span>}
              </div>
            )}
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">📱</div>
                <div className="settings__row-text"><div className="settings__row-title">App version</div></div>
              </div>
              <span style={{ fontSize: 12, color: "var(--t-muted)", fontWeight: 600 }}>1.0.0</span>
            </div>
            <div className="settings__row">
              <div className="settings__row-left">
                <div className="settings__row-icon">⚡</div>
                <div className="settings__row-text"><div className="settings__row-title">Built with</div></div>
              </div>
              <span style={{ fontSize: 12, color: "var(--t-muted)", fontWeight: 600 }}>React</span>
            </div>
          </div>
        </div>

        <div className="settings__build">
          <span className="settings__build-version">To-Do App v1.0.0</span>
          <span>Made with ♥</span>
        </div>

      </div>
    </div>
  );
}
