import { useState, useMemo } from "react";
import { PRIORITY_COLOR, CAT_COLOR, todayStr } from "../../utils/helpers";
import "./Calendar.css";

// ── tiny helpers ──────────────────────────────────────────────────────────────
const pad   = (n) => String(n).padStart(2, "0");
const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Build a 6-row calendar grid for a given year/month
function buildGrid(year, month) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const prevDays  = new Date(year, month, 0).getDate();

  const cells = [];

  // Trailing days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, current: false });
  }

  // Current month
  for (let d = 1; d <= daysInMon; d++) {
    cells.push({ day: d, month, year, current: true });
  }

  // Leading days of next month
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0  : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, month: m, year: y, current: false });
  }

  return cells;
}

// ── QuickAdd modal ────────────────────────────────────────────────────────────
function QuickAddModal({ visible, dateStr, onClose, onAdd }) {
  const [title,    setTitle]    = useState("");
  const [priority, setPriority] = useState("High");
  const [category, setCategory] = useState("Personal");
  const [desc,     setDesc]     = useState("");

  const handleSubmit = () => {
    if (!title.trim()) { alert("Please enter a task title"); return; }
    onAdd({ title: title.trim(), description: desc.trim(), dueDate: dateStr, priority, category });
    setTitle(""); setDesc(""); setPriority("High"); setCategory("Personal");
    onClose();
  };

  // Pretty-print the date
  const label = dateStr
    ? new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : "";

  return (
    <div className={`cal-modal-overlay${visible ? "" : " cal-modal-overlay--hidden"}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cal-modal">
        <div className="cal-modal__handle" />
        <h3 className="cal-modal__title">New Task</h3>
        <p className="cal-modal__subtitle">📅 {label}</p>

        <input
          className="cal-modal__input"
          type="text"
          placeholder="Task title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />

        <input
          className="cal-modal__input"
          type="text"
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="cal-modal__row">
          <select
            className="cal-modal__select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select
            className="cal-modal__select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Personal</option>
            <option>Work</option>
            <option>School</option>
            <option>Health</option>
          </select>
        </div>

        <div className="cal-modal__actions">
          <button className="cal-modal__cancel" onClick={onClose}>Cancel</button>
          <button className="cal-modal__submit" onClick={handleSubmit}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar component ───────────────────────────────────────────────────
export default function Calendar({ visible, tasks, onToggleTask, onDeleteTask, onAddTask }) {
  const now          = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected,  setSelected]  = useState(todayStr());
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(selected);

  // Build task lookup: dateKey → task[]
  const taskMap = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    });
    return map;
  }, [tasks]);

  const grid   = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today  = todayStr();

  // Navigate months
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Dot colours for a date's tasks (max 4)
  const dotsFor = (dateKey) => {
    const ts = taskMap[dateKey];
    if (!ts || ts.length === 0) return [];
    return ts.slice(0, 4).map((t) =>
      t.completed ? "done" : t.priority.toLowerCase()
    );
  };

  // Tasks for selected date
  const selectedTasks = taskMap[selected] || [];

  // Pretty label for selected date
  const selectedLabel = selected
    ? new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";

  const openAddForDate = (dateKey) => {
    setModalDate(dateKey);
    setShowModal(true);
  };

  const handleAddTask = (data) => {
    onAddTask({ ...data, priority: data.priority.toLowerCase() });
  };

  return (
    <>
      <div className={`calendar${visible ? "" : " calendar--hidden"}`}>
        <div className="calendar__inner">

          {/* ── Month nav ── */}
          <div className="calendar__topbar">
            <h2 className="calendar__month-title">
              <span>{MONTHS[viewMonth]}</span> {viewYear}
            </h2>
            <div className="calendar__nav">
              <button className="calendar__nav-btn" onClick={prevMonth}>‹</button>
              <button className="calendar__nav-btn" onClick={nextMonth}>›</button>
            </div>
          </div>

          {/* ── Weekday row ── */}
          <div className="calendar__weekdays">
            {DAYS.map((d) => (
              <div key={d} className="calendar__weekday">{d}</div>
            ))}
          </div>

          {/* ── Date grid ── */}
          <div className="calendar__grid">
            {grid.map((cell, i) => {
              const key      = toKey(cell.year, cell.month, cell.day);
              const isToday  = key === today;
              const isSel    = key === selected;
              const dots     = dotsFor(key);
              const hasTasks = dots.length > 0;

              let cls = "calendar__cell";
              if (!cell.current) cls += " calendar__cell--other-month";
              if (isToday)       cls += " calendar__cell--today";
              if (isSel && !isToday) cls += " calendar__cell--selected";
              if (hasTasks)      cls += " calendar__cell--has-tasks";

              return (
                <div
                  key={i}
                  className={cls}
                  onClick={() => { setSelected(key); }}
                  onDoubleClick={() => openAddForDate(key)}
                  title={hasTasks ? `${dots.length} task${dots.length > 1 ? "s" : ""}` : "Click to select, double-click to add task"}
                >
                  <span className="calendar__cell__num">{cell.day}</span>
                  {dots.length > 0 && (
                    <div className="calendar__cell__dots">
                      {dots.map((p, di) => (
                        <span key={di} className={`calendar__dot calendar__dot--${p}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Legend ── */}
          <div className="calendar__legend">
            {[
              { label: "High",   cls: "calendar__dot--high"   },
              { label: "Medium", cls: "calendar__dot--medium" },
              { label: "Low",    cls: "calendar__dot--low"    },
              { label: "Done",   cls: "calendar__dot--done"   },
            ].map(({ label, cls }) => (
              <div key={label} className="calendar__legend-item">
                <span className={`calendar__legend-dot calendar__dot ${cls}`} />
                {label}
              </div>
            ))}
          </div>

          {/* ── Day panel ── */}
          <div className="calendar__panel">
            <div className="calendar__panel__header">
              <span className="calendar__panel__date">{selectedLabel}</span>
              <button
                className="calendar__panel__add-btn"
                onClick={() => openAddForDate(selected)}
              >
                <span className="calendar__panel__add-btn__icon">＋</span>
                Add Task
              </button>
            </div>

            {selectedTasks.length === 0 ? (
              <p className="calendar__panel__empty">
                No tasks — double-click a date or press "Add Task"
              </p>
            ) : (
              <ul className="calendar__panel__tasks">
                {selectedTasks.map((task) => (
                  <li key={task.id} className="calendar__task-row">
                    {/* Completion toggle */}
                    <div
                      className={`calendar__task-row__check${task.completed ? " calendar__task-row__check--done" : ""}`}
                      onClick={() => onToggleTask(task.id)}
                      title={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      <span className="calendar__task-row__check__tick">✓</span>
                    </div>

                    {/* Info */}
                    <div className="calendar__task-row__info">
                      <div className={`calendar__task-row__title${task.completed ? " calendar__task-row__title--done" : ""}`}>
                        {task.title}
                      </div>
                      <div className="calendar__task-row__meta">
                        <span
                          className="calendar__task-row__badge"
                          style={{ background: CAT_COLOR[task.category] || "#6366f1" }}
                        >
                          {task.category}
                        </span>
                        <span
                          className="calendar__task-row__badge"
                          style={{ background: PRIORITY_COLOR[task.priority] || "#6b7280" }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      className="calendar__task-row__delete"
                      onClick={() => onDeleteTask(task.id)}
                      title="Delete task"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* ── Quick-add modal ── */}
      <QuickAddModal
        visible={showModal}
        dateStr={modalDate}
        onClose={() => setShowModal(false)}
        onAdd={handleAddTask}
      />
    </>
  );
}
