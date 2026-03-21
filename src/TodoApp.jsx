import { useState, useEffect, useRef } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (dateStr) => {
  const today = todayStr();
  const tomorrow = (() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();
  const yesterday = (() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  if (dateStr === yesterday) return "Yesterday";

  const task = new Date(dateStr + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const diff = Math.round((task - now) / 86400000);
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`;
  return task.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const DEFAULT_TASKS = [
  { id: 1, title: "Buy groceries", description: "", category: "School", priority: "high", dueDate: todayStr(), completed: false },
  { id: 2, title: "Finish project report", description: "", category: "Work", priority: "medium", dueDate: todayStr(), completed: false },
  { id: 3, title: "Call mom", description: "", category: "Personal", priority: "low", dueDate: todayStr(), completed: true },
  { id: 4, title: "Schedule dentist appointment", description: "", category: "Health", priority: "high", dueDate: todayStr(), completed: false },
  { id: 5, title: "Plan weekend trip", description: "", category: "Personal", priority: "low", dueDate: todayStr(), completed: false },
];

const PRIORITY_COLOR = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
const CAT_COLOR = { Personal: "#6366f1", Work: "#0ea5e9", School: "#8b5cf6", Health: "#10b981" };

// ── styles ────────────────────────────────────────────────────────────────────
const S = {
  root: {
    fontFamily: "'Poppins', sans-serif",
    height: "100vh",
    width: "100%",
    overflow: "hidden",
    position: "relative",
    background: "#f0f4ff",
  },
  // Splash
  splash: (visible) => ({
    position: "fixed", inset: 0, background: "#1a1aff",
    display: "flex", flexDirection: "column", justifyContent: "center",
    alignItems: "center", gap: 30, zIndex: 1000,
    transition: "opacity 1s ease",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "all" : "none",
  }),
  logo: {
    background: "#f5f5f5", height: 120, width: 120, borderRadius: "50%",
    display: "flex", justifyContent: "center", alignItems: "center",
    position: "relative",
  },
  // Login
  loginWrap: (visible) => ({
    position: "fixed", inset: 0, background: "rgb(2,2,43)",
    display: "flex", flexDirection: "column", justifyContent: "center",
    alignItems: "center", padding: 20, zIndex: 100,
    transition: "opacity .5s ease, visibility .5s ease",
    opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden",
  }),
  loginForm: {
    width: "100%", maxWidth: 420, display: "flex",
    flexDirection: "column", gap: 14,
  },
  input: {
    background: "transparent", color: "#f5f5f5",
    padding: "10px 12px", border: "2px solid rgba(255,255,255,.6)",
    borderRadius: 10, fontSize: 15, outline: "none", width: "100%",
  },
  // Dashboard
  dashWrap: (visible) => ({
    position: "fixed", inset: 0,
    display: "flex", flexDirection: "column", alignItems: "center",
    overflowY: "auto", background: "#f0f4ff",
    transition: "opacity .5s ease, visibility .5s ease",
    opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden",
    paddingBottom: 80,
  }),
  statCard: (bg) => ({
    background: bg, color: "#fff", borderRadius: 10,
    padding: "10px 14px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4, flex: 1, minWidth: 60,
  }),
  taskItem: {
    background: "#fff", borderRadius: 12, padding: "14px 16px",
    marginBottom: 10, display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", boxShadow: "0 2px 8px rgba(0,0,0,.07)",
    transition: "transform .15s",
  },
  badge: (color) => ({
    background: color, color: "#fff", fontSize: 11,
    padding: "2px 8px", borderRadius: 20, fontWeight: 600,
  }),
  fab: {
    position: "fixed", bottom: 70, right: 24,
    background: "#1a1aff", color: "#fff", border: "none",
    borderRadius: "50%", width: 56, height: 56, fontSize: 26,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(26,26,255,.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 20,
  },
  footerNav: {
    position: "fixed", bottom: 0, left: 0, width: "100%",
    background: "#fff", display: "flex", justifyContent: "space-around",
    padding: "10px 0", boxShadow: "0 -2px 10px rgba(0,0,0,.08)", zIndex: 10,
  },
  navBtn: (sel) => ({
    background: "transparent", border: "none",
    display: "flex", flexDirection: "column", alignItems: "center",
    color: sel ? "#1a1aff" : "#9ca3af", fontSize: 12, gap: 3, cursor: "pointer",
    fontWeight: sel ? 700 : 400,
  }),
  // AddTask
  modalOverlay: (visible) => ({
    position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
    display: "flex", flexDirection: "column", alignItems: "center",
    zIndex: 100, transition: "opacity .3s ease, visibility .3s ease",
    opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden",
    overflowY: "auto",
  }),
  modalBox: {
    background: "#fff", width: "100%", maxWidth: 520,
    minHeight: "100vh", display: "flex", flexDirection: "column",
  },
  modalHeader: {
    background: "#f3f4f6", padding: "16px 20px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  optionRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 0", borderBottom: "1px solid #eaeaea",
  },
  select: {
    padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd",
    fontSize: 14, cursor: "pointer", outline: "none",
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Splash({ visible }) {
  return (
    <div style={S.splash(visible)}>
      <div style={S.logo}>
        <span style={{ position: "absolute", fontSize: 56, color: "red" }}>✓</span>
        <span style={{
          fontSize: 56, color: "#1a1aff", position: "relative", zIndex: 1,
          animation: "fadeInOut 2s ease-in-out infinite",
        }}>✓</span>
      </div>
      <div style={{ textAlign: "center", color: "#f5f5f5" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Organize your day.</h2>
        <h3 style={{ fontSize: 18, fontWeight: 400 }}>Get more done.</h3>
      </div>
      <style>{`@keyframes fadeInOut{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

function Login({ visible, onLogin }) {
  return (
    <div style={S.loginWrap(visible)}>
      <h1 style={{ color: "#f5f5f5", marginBottom: 20, fontSize: 28 }}>Sign In</h1>
      <div style={S.loginForm}>
        <label style={{ color: "#f5f5f5", fontSize: 14 }}>Email</label>
        <input style={S.input} type="email" placeholder="you@email.com" />
        <label style={{ color: "#f5f5f5", fontSize: 14 }}>Password</label>
        <input style={S.input} type="password" placeholder="••••••••" />
        <button onClick={onLogin} style={{
          padding: "12px", background: "#1a1aff", color: "#fff",
          border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}>Login</button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f5f5f5", fontSize: 13 }}>
          <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.3)" }} />
          Or continue with
          <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.3)" }} />
        </div>

        <button onClick={onLogin} style={{
          padding: "10px", background: "#fff", color: "#333", border: "none",
          borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, fontSize: 14, cursor: "pointer",
        }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} alt="" />
          Continue with Google
        </button>

        <button onClick={onLogin} style={{
          padding: "10px", background: "#111", color: "#fff", border: "none",
          borderRadius: 8, fontSize: 14, cursor: "pointer",
        }}>
          🍎 Continue with Apple
        </button>

        <button onClick={onLogin} style={{
          padding: "10px", background: "transparent", color: "#f5f5f5",
          border: "1px solid rgba(255,255,255,.4)", borderRadius: 8, fontSize: 13, cursor: "pointer",
        }}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <li style={{ ...S.taskItem, transform: hovered ? "translateY(-1px)" : "none" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ flex: 1 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            style={{ width: 16, height: 16, accentColor: "#1a1aff", cursor: "pointer" }}
          />
          <span style={{
            fontSize: 15, fontWeight: 500,
            textDecoration: task.completed ? "line-through" : "none",
            color: task.completed ? "#9ca3af" : "#1f2937",
          }}>{task.title}</span>
        </label>
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={S.badge(CAT_COLOR[task.category] || "#6366f1")}>{task.category}</span>
          <span style={S.badge(PRIORITY_COLOR[task.priority] || "#6b7280")}>{task.priority}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, minWidth: 80 }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Due: {formatDate(task.dueDate)}</span>
        <button onClick={() => onDelete(task.id)} style={{
          background: "#fee2e2", color: "#ef4444", border: "none",
          padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
        }}>Delete</button>
      </div>
    </li>
  );
}

function AddTaskModal({ visible, onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("High");
  const [category, setCategory] = useState("Personal");
  const [dueDate, setDueDate] = useState("");
  const [dateDisplay, setDateDisplay] = useState(() => {
    const n = new Date();
    return `Today, ${n.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  });

  const handleDateChange = (val) => {
    setDueDate(val);
    if (!val) return;
    const sel = new Date(val);
    const now = new Date();
    const isToday = sel.toDateString() === now.toDateString();
    const time = sel.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setDateDisplay(isToday ? `Today, ${time}` : `${sel.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { alert("Please enter a task title"); return; }
    onAdd({
      title: title.trim(), description: desc.trim(),
      dueDate: dueDate ? dueDate.split("T")[0] : todayStr(),
      priority, category,
    });
    setTitle(""); setDesc(""); setDueDate(""); setPriority("High"); setCategory("Personal");
    const n = new Date();
    setDateDisplay(`Today, ${n.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    onClose();
  };

  return (
    <div style={S.modalOverlay(visible)}>
      <div style={S.modalBox}>
        <div style={S.modalHeader}>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, color: "#1a1aff", cursor: "pointer",
          }}>←</button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add New Task</h2>
          <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}>
            <img src="https://thispersondoesnotexist.com" alt="" width={40} height={40}
              style={{ objectFit: "cover", borderRadius: "50%" }} />
          </div>
        </div>

        <div style={{ background: "#f9fafb", padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Task Title" required
            style={{ padding: "10px 0", border: "none", borderBottom: "2px solid #d1d5db",
              background: "transparent", fontSize: 16, outline: "none", fontFamily: "inherit" }} />
          <input value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            style={{ padding: "10px 0", border: "none", borderBottom: "2px solid #e5e7eb",
              background: "transparent", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          <div style={S.optionRow}>
            <span style={{ fontWeight: 500, fontSize: 15 }}>Due Date:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#2f6fed", fontWeight: 500, fontSize: 14 }}>{dateDisplay}</span>
              <input type="datetime-local" value={dueDate}
                onChange={(e) => handleDateChange(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
            </div>
          </div>

          <div style={S.optionRow}>
            <span style={{ fontWeight: 500, fontSize: 15 }}>Priority:</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{
              ...S.select, color: "#b00020", fontWeight: 600,
            }}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>

          <div style={S.optionRow}>
            <span style={{ fontWeight: 500, fontSize: 15 }}>Category:</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.select}>
              <option>Personal</option><option>Work</option><option>School</option><option>Health</option>
            </select>
          </div>

          <button onClick={handleSubmit} style={{
            marginTop: 24, width: "100%", padding: "14px",
            background: "#1a1aff", color: "#fff", border: "none",
            borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash"); // splash | login | dashboard
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("todoTasks");
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch { return DEFAULT_TASKS; }
  });
  const [filter, setFilter] = useState("today"); // today | upcoming | all
  const [activeNav, setActiveNav] = useState("home");
  const [now, setNow] = useState(new Date());

  // Splash → Login transition
  useEffect(() => {
    const t = setTimeout(() => setScreen("login"), 2500);
    return () => clearTimeout(t);
  }, []);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist tasks
  useEffect(() => {
    try { localStorage.setItem("todoTasks", JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  const filteredTasks = tasks.filter((t) => {
    const today = todayStr();
    if (filter === "today") return t.dueDate === today;
    if (filter === "upcoming") return t.dueDate > today;
    return true;
  });

  const stats = {
    today: tasks.filter((t) => t.dueDate === todayStr()).length,
    pending: tasks.filter((t) => !t.completed).length,
    highRisk: tasks.filter((t) => t.priority.toLowerCase() === "high" && !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  const handleToggle = (id) =>
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));

  const handleDelete = (id) => {
    if (window.confirm("Delete this task?"))
      setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAdd = (data) => {
    setTasks((prev) => [{ id: Date.now(), ...data, priority: data.priority.toLowerCase(), completed: false }, ...prev]);
  };

  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeLabel = now.toLocaleTimeString("en-US");
  const filterLabels = { today: "Today", upcoming: "Upcoming", all: "All Tasks" };

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <Splash visible={screen === "splash"} />

      <Login visible={screen === "login"} onLogin={() => setScreen("dashboard")} />

      {/* Dashboard */}
      <div style={S.dashWrap(screen === "dashboard")}>
        <div style={{ width: "100%", maxWidth: 520 }}>

          {/* Header */}
          <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 22, color: "#9ca3af", cursor: "pointer" }}>🔍</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1f2937" }}>Today</h1>
            <div style={{ width: 46, height: 46, borderRadius: "50%", overflow: "hidden", border: "2px solid #1a1aff" }}>
              <img src="https://thispersondoesnotexist.com" alt="" width={46} height={46} style={{ objectFit: "cover" }} />
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", padding: "12px 16px", gap: 0 }}>
            {["today", "upcoming", "all"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "10px 0", background: filter === f ? "#1a1aff" : "#fff",
                color: filter === f ? "#fff" : "#374151", border: "1px solid #e5e7eb",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
            <div style={S.statCard("#16a34a")}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{stats.today}</span>
              <span style={{ fontSize: 11, textAlign: "center" }}>Task Today</span>
            </div>
            <div style={S.statCard("#1a1aff")}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{stats.pending}</span>
              <span style={{ fontSize: 11 }}>Pending</span>
            </div>
            <div style={S.statCard("#f97316")}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{stats.highRisk}</span>
              <span style={{ fontSize: 11, textAlign: "center" }}>High Risk</span>
            </div>
            <div style={S.statCard("#6b7280")}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{stats.completed}</span>
              <span style={{ fontSize: 11 }}>Done</span>
            </div>
          </div>

          {/* Date/Time bar */}
          <div style={{
            background: "#fff", margin: "0 16px 16px", borderRadius: 12, padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,.06)",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1f2937" }}>{filterLabels[filter]}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{dateLabel}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{timeLabel}</div>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 20, color: "#9ca3af" }}>
              <span style={{ cursor: "pointer" }}>⊟</span>
              <span style={{ cursor: "pointer" }}>☰</span>
            </div>
          </div>

          {/* Task list */}
          <ul style={{ listStyle: "none", padding: "0 16px", margin: 0 }}>
            {filteredTasks.length === 0 ? (
              <li style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 15 }}>
                No tasks found
              </li>
            ) : (
              filteredTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
              ))
            )}
          </ul>
        </div>
      </div>

      {/* FAB */}
      {screen === "dashboard" && (
        <button style={S.fab} onClick={() => setShowAddTask(true)}>＋</button>
      )}

      {/* Footer nav */}
      {screen === "dashboard" && (
        <div style={S.footerNav}>
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "calendar", icon: "📅", label: "Calendar" },
            { id: "stats", icon: "📈", label: "Stats" },
            { id: "settings", icon: "⚙️", label: "Settings" },
          ].map(({ id, icon, label }) => (
            <button key={id} style={S.navBtn(activeNav === id)} onClick={() => setActiveNav(id)}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
