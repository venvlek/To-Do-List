import { useState, useEffect } from "react";

import Splash           from "./components/Splash/Splash";
import Login            from "./components/Login/Login";
import Dashboard        from "./components/Dashboard/Dashboard";
import AddTaskModal     from "./components/AddTaskModal/AddTaskModal";
import Calendar         from "./components/Calendar/Calendar";
import Stats            from "./components/Stats/Stats";
import Settings         from "./components/Settings/Settings";
import InstallBanner    from "./components/InstallBanner/InstallBanner";
import useAuth          from "./hooks/useAuth";
import useFirestore     from "./hooks/useFirestore";
import useNotifications from "./hooks/useNotifications";

import { todayStr } from "./utils/helpers";
import "./App.css";

const NAV_ITEMS = [
  { id: "home",     icon: "🏠", label: "Home"     },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "stats",    icon: "📈", label: "Stats"    },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

const DEFAULT_SETTINGS = {
  profileName:       "",
  profileEmail:      "",
  theme:             "light",
  notifDueReminder:  true,
  notifDailyDigest:  false,
  notifWeeklyReport: false,
  notifReminderTime: "15 min",
  soundEnabled:      false,
  compactView:       false,
};

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || "light");
}

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    user, authLoading,
    authError, clearError,
    signIn, signUp,
    signInWithGoogle, signInWithApple, signInAsGuest,
    resetPassword, logOut,
  } = useAuth();

  // ── Splash ────────────────────────────────────────────────────────────────
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(t);
  }, []);

  // ── Firestore — single source of truth for tasks + settings ──────────────
  const {
    tasks,    setTasks,
    settings: firestoreSettings,
    setSettings: setFirestoreSettings,
    tasksReady,
    syncStatus, lastSynced,
    isAnonymous,
    saveTask, removeTask, clearAllTasks, saveSettings,
  } = useFirestore({ user });

  // Merge Firestore settings with defaults + user profile info
  const settings = {
    ...DEFAULT_SETTINGS,
    profileName:  user?.displayName || "",
    profileEmail: user?.email       || "",
    ...(firestoreSettings || {}),
  };

  const setSettings = (newSettings) => {
    setFirestoreSettings(newSettings);
    saveSettings(newSettings);
  };

  // ── Apply theme ───────────────────────────────────────────────────────────
  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);
  useEffect(() => { applyTheme(settings.theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Screen logic ──────────────────────────────────────────────────────────
  const showSplash    = !splashDone || authLoading;
  const showLogin     = splashDone && !authLoading && !user;
  // Also wait for Firestore to load before showing dashboard
  const showDashboard = splashDone && !authLoading && !!user && tasksReady;

  // ── Notifications ─────────────────────────────────────────────────────────
  const { requestPermission, playSound } = useNotifications({ tasks, settings });

  // ── Nav / UI ──────────────────────────────────────────────────────────────
  const [activeNav,   setActiveNav]   = useState("home");
  const [showAddTask, setShowAddTask] = useState(false);
  const [filter,      setFilter]      = useState("today");
  const [now,         setNow]         = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const today = todayStr();
  const stats = {
    today:     tasks.filter((t) => t.dueDate === today).length,
    pending:   tasks.filter((t) => !t.completed).length,
    highRisk:  tasks.filter((t) => t.priority.toLowerCase() === "high" && !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-US");

  // ── Task handlers ─────────────────────────────────────────────────────────
  const handleToggleTask = (id) => {
    playSound("complete");
    setTasks((prev) => {
      const next    = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      const changed = next.find((t) => t.id === id);
      if (changed) saveTask(changed);
      return next;
    });
  };

  const handleDeleteTask = (id) => {
    if (window.confirm("Delete this task?")) {
      playSound("delete");
      setTasks((prev) => prev.filter((t) => t.id !== id));
      removeTask(id);
    }
  };

  const handleAddTask = (data) => {
    playSound("add");
    const dueDate = data.dueDate || today;
    const newTask = {
      id:          String(Date.now()),
      description: "",
      dueTime:     "",
      ...data,
      dueDate,
      priority:    data.priority.toLowerCase(),
      completed:   false,
      createdAt:   Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
    saveTask(newTask);

    if (dueDate === today)    setFilter("today");
    else if (dueDate > today) setFilter("upcoming");
    else                      setFilter("all");
  };

  const handleClearTasks = () => {
    const current = tasks;
    setTasks([]);
    clearAllTasks(current);
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleSignIn = async (email, password) => {
    if (email === "__reset__") { await resetPassword(password); return; }
    await signIn(email, password);
  };
  const handleSignUp = async (email, password, name) => {
    await signUp(email, password, name);
  };
  const handleLogOut = async () => {
    await logOut();
    setActiveNav("home");
    setFilter("today");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Splash visible={showSplash} />

      <Login
        visible={showLogin}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onGoogleSignIn={signInWithGoogle}
        onAppleSignIn={signInWithApple}
        onGuestSignIn={signInAsGuest}
        authError={authError}
        clearError={clearError}
      />

      {/* Loading state while Firestore loads */}
      {splashDone && !authLoading && !!user && !tasksReady && (
        <div className="app__loading">
          <div className="app__loading__spinner" />
          <p>Loading your tasks…</p>
        </div>
      )}

      <Dashboard
        visible={showDashboard && activeNav === "home"}
        tasks={tasks}
        filter={filter}
        stats={stats}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        user={user}
        syncStatus={syncStatus}
        lastSynced={lastSynced}
        isAnonymous={isAnonymous}
        onFilterChange={setFilter}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
      />

      <Calendar
        visible={showDashboard && activeNav === "calendar"}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleAddTask}
      />

      <Stats
        visible={showDashboard && activeNav === "stats"}
        tasks={tasks}
      />

      <Settings
        visible={showDashboard && activeNav === "settings"}
        settings={settings}
        onSettingsChange={setSettings}
        onClearTasks={handleClearTasks}
        onLogOut={handleLogOut}
        onRequestPermission={requestPermission}
        user={user}
      />

      {showDashboard && activeNav === "home" && (
        <button className="app__fab" onClick={() => setShowAddTask(true)} title="Add task">＋</button>
      )}

      {showDashboard && (
        <nav className="app__footer-nav">
          {NAV_ITEMS.map(({ id, icon, label }) => (
            <button key={id}
              className={`app__nav-btn${activeNav === id ? " app__nav-btn--active" : ""}`}
              onClick={() => setActiveNav(id)}>
              <span className="app__nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <AddTaskModal
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={handleAddTask}
        user={user}
      />

      <InstallBanner visible={showDashboard} />
    </div>
  );
}
