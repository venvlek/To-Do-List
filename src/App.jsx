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
  profileName: "", profileEmail: "", theme: "light",
  notifDueReminder: true, notifDailyDigest: false,
  notifWeeklyReport: false, notifReminderTime: "15 min",
  soundEnabled: false, compactView: false,
};

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || "light");
}

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    user, authLoading, authError, clearError,
    signIn, signUp, signInWithGoogle, signInWithApple,
    signInAsGuest, resetPassword, logOut,
  } = useAuth();

  // ── Splash ────────────────────────────────────────────────────────────────
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(t);
  }, []);

  // ── Firestore — owns ALL task + settings state ────────────────────────────
  const {
    tasks, settings: firestoreSettings,
    tasksReady, syncStatus, lastSynced, isAnonymous,
    addTask, toggleTask, deleteTask, clearAllTasks, updateSettings,
  } = useFirestore({ user });

  // Merge Firestore settings with defaults + live user profile
  const settings = {
    ...DEFAULT_SETTINGS,
    profileName:  user?.displayName || "",
    profileEmail: user?.email       || "",
    ...(firestoreSettings || {}),
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);
  useEffect(() => { applyTheme(settings.theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Screen logic ──────────────────────────────────────────────────────────
  const showSplash    = !splashDone || authLoading;
  const showLogin     = splashDone && !authLoading && !user;
  const showDashboard = splashDone && !authLoading && !!user && tasksReady;
  const showLoading   = splashDone && !authLoading && !!user && !tasksReady;

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
    highRisk:  tasks.filter((t) => t.priority === "high" && !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-US");

  // ── Task handlers — delegate entirely to useFirestore ─────────────────────
  const handleToggleTask = (id) => {
    playSound("complete");
    toggleTask(id);
  };

  const handleDeleteTask = (id) => {
    if (window.confirm("Delete this task?")) {
      playSound("delete");
      deleteTask(id);
    }
  };

  const handleAddTask = (data) => {
    playSound("add");
    const dueDate = data.dueDate || today;
    const task    = addTask({ ...data, dueDate });

    if (dueDate === today)    setFilter("today");
    else if (dueDate > today) setFilter("upcoming");
    else                      setFilter("all");

    return task;
  };

  const handleClearTasks = () => clearAllTasks();

  const handleSettingsChange = (newSettings) => updateSettings(newSettings);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleSignIn = async (email, password) => {
    if (email === "__reset__") { await resetPassword(password); return; }
    await signIn(email, password);
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
        onSignUp={(e, p, n) => signUp(e, p, n)}
        onGoogleSignIn={signInWithGoogle}
        onAppleSignIn={signInWithApple}
        onGuestSignIn={signInAsGuest}
        authError={authError}
        clearError={clearError}
      />

      {showLoading && (
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
        onSettingsChange={handleSettingsChange}
        onClearTasks={handleClearTasks}
        onLogOut={handleLogOut}
        onRequestPermission={requestPermission}
        user={user}
      />

      {showDashboard && activeNav === "home" && (
        <button className="app__fab" onClick={() => setShowAddTask(true)}>＋</button>
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
