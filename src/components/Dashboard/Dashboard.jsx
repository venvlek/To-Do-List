import { useState, useRef, useEffect } from "react";
import TaskItem from "../TaskItem/TaskItem";
import "./Dashboard.css";

const FILTER_LABELS = { today: "Today", upcoming: "Upcoming", all: "All Tasks" };

const SORT_OPTIONS = [
  { id: "default",   label: "Default",       icon: "↕️" },
  { id: "dueAsc",    label: "Due: soonest",  icon: "📅" },
  { id: "dueDesc",   label: "Due: latest",   icon: "📅" },
  { id: "priority",  label: "Priority",      icon: "🔥" },
  { id: "az",        label: "A → Z",         icon: "🔤" },
  { id: "completed", label: "Completed last", icon: "✅" },
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function sortTasks(tasks, sortId) {
  const t = [...tasks];
  switch (sortId) {
    case "dueAsc":    return t.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    case "dueDesc":   return t.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    case "priority":  return t.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
    case "az":        return t.sort((a, b) => a.title.localeCompare(b.title));
    case "completed": return t.sort((a, b) => Number(a.completed) - Number(b.completed));
    default:          return t;
  }
}

export default function Dashboard({
  visible,
  tasks,
  filter,
  stats,
  dateLabel,
  timeLabel,
  onFilterChange,
  onToggleTask,
  onDeleteTask,
  user,
}) {
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy,      setSortBy]      = useState("default");
  const [viewMode,    setViewMode]    = useState("list");    // "list" | "grouped"
  const [filterOpen,  setFilterOpen]  = useState(false);

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  // Display name + avatar
  const displayName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email ? user.email.split("@")[0] : "You";
  const photoURL = user?.photoURL || null;
  const initials  = displayName.slice(0, 2).toUpperCase();
  const today     = new Date().toISOString().split("T")[0];

  // Tab filter
  const tabFiltered = tasks.filter((t) => {
    if (filter === "today")    return t.dueDate === today;
    if (filter === "upcoming") return t.dueDate > today;
    return true;
  });

  // Search filter (searches all tasks when query active)
  const query = searchQuery.trim().toLowerCase();
  const searched = query
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(query)       ||
        t.category.toLowerCase().includes(query)    ||
        t.priority.toLowerCase().includes(query)    ||
        (t.description && t.description.toLowerCase().includes(query))
      )
    : tabFiltered;

  // Sort
  const visibleTasks = sortTasks(searched, sortBy);
  const isSearching  = query.length > 0;

  // Grouped view — group by priority
  const grouped = {
    high:   visibleTasks.filter((t) => t.priority === "high"   && !t.completed),
    medium: visibleTasks.filter((t) => t.priority === "medium" && !t.completed),
    low:    visibleTasks.filter((t) => t.priority === "low"    && !t.completed),
    done:   visibleTasks.filter((t) => t.completed),
  };
  const GROUP_META = [
    { key: "high",   label: "🔴 High Priority",   count: grouped.high.length   },
    { key: "medium", label: "🟠 Medium Priority",  count: grouped.medium.length },
    { key: "low",    label: "🟢 Low Priority",     count: grouped.low.length    },
    { key: "done",   label: "✅ Completed",        count: grouped.done.length   },
  ];

  const activeSortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Sort";

  return (
    <div className={`dashboard${visible ? "" : " dashboard--hidden"}`}>
      <div className="dashboard__content">

        {/* Header */}
        <div className="dashboard__header">
          <button
            className={`dashboard__search-btn${searchOpen ? " dashboard__search-btn--active" : ""}`}
            onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
            title={searchOpen ? "Close search" : "Search tasks"}
          >
            {searchOpen ? "✕" : "🔍"}
          </button>
          <div>
            <p className="dashboard__greeting">Hello, {displayName} 👋</p>
            <h1 className="dashboard__title">{isSearching ? "Results" : "Today"}</h1>
          </div>
          <div className="dashboard__avatar">
            {photoURL
              ? <img src={photoURL} alt={displayName} referrerPolicy="no-referrer" />
              : <span className="dashboard__avatar-initials">{initials}</span>
            }
          </div>
        </div>

        {/* Search bar */}
        <div className={`dashboard__search-bar${searchOpen ? " dashboard__search-bar--open" : ""}`}>
          <span className="dashboard__search-bar__icon">🔍</span>
          <input
            ref={inputRef}
            className="dashboard__search-input"
            type="text"
            placeholder="Search tasks, categories, priority…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
          />
          {searchQuery && (
            <button className="dashboard__search-clear" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>

        {/* Filter tabs */}
        {!isSearching && (
          <div className="dashboard__filters">
            {["today", "upcoming", "all"].map((f) => (
              <button key={f}
                className={`dashboard__filter-btn${filter === f ? " dashboard__filter-btn--active" : ""}`}
                onClick={() => onFilterChange(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        {!isSearching && (
          <div className="dashboard__stats">
            <div className="stat-card stat-card--today">
              <span className="stat-card__number">{stats.today}</span>
              <span className="stat-card__label">Task Today</span>
            </div>
            <div className="stat-card stat-card--pending">
              <span className="stat-card__number">{stats.pending}</span>
              <span className="stat-card__label">Pending</span>
            </div>
            <div className="stat-card stat-card--highrisk">
              <span className="stat-card__number">{stats.highRisk}</span>
              <span className="stat-card__label">High Risk</span>
            </div>
            <div className="stat-card stat-card--done">
              <span className="stat-card__number">{stats.completed}</span>
              <span className="stat-card__label">Done</span>
            </div>
          </div>
        )}

        {/* DateTime bar + functional icons */}
        <div className="dashboard__datetime-bar">
          {isSearching ? (
            <div>
              <div className="dashboard__datetime-bar__label">
                {visibleTasks.length} result{visibleTasks.length !== 1 ? "s" : ""} for "{searchQuery}"
              </div>
              <div className="dashboard__datetime-bar__date">Searching all tasks</div>
            </div>
          ) : (
            <div>
              <div className="dashboard__datetime-bar__label">{FILTER_LABELS[filter]}</div>
              <div className="dashboard__datetime-bar__date">{dateLabel}</div>
              <div className="dashboard__datetime-bar__time">{timeLabel}</div>
            </div>
          )}

          <div className="dashboard__datetime-bar__icons" ref={dropdownRef}>

            {/* ── Sort / Filter icon ── */}
            <div className="dashboard__icon-wrap">
              <button
                className={`dashboard__icon-btn${filterOpen ? " dashboard__icon-btn--active" : ""}${sortBy !== "default" ? " dashboard__icon-btn--on" : ""}`}
                onClick={() => setFilterOpen((o) => !o)}
                title="Sort tasks"
              >
                ⊟
                {sortBy !== "default" && <span className="dashboard__icon-dot" />}
              </button>

              {/* Sort dropdown */}
              {filterOpen && (
                <div className="dashboard__sort-dropdown">
                  <div className="dashboard__sort-dropdown__title">Sort by</div>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      className={`dashboard__sort-option${sortBy === opt.id ? " dashboard__sort-option--active" : ""}`}
                      onClick={() => { setSortBy(opt.id); setFilterOpen(false); }}
                    >
                      <span className="dashboard__sort-option__icon">{opt.icon}</span>
                      {opt.label}
                      {sortBy === opt.id && <span className="dashboard__sort-option__check">✓</span>}
                    </button>
                  ))}
                  {sortBy !== "default" && (
                    <button
                      className="dashboard__sort-reset"
                      onClick={() => { setSortBy("default"); setFilterOpen(false); }}
                    >
                      Reset sort
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── View mode icon ── */}
            <button
              className={`dashboard__icon-btn${viewMode === "grouped" ? " dashboard__icon-btn--on" : ""}`}
              onClick={() => setViewMode((v) => v === "list" ? "grouped" : "list")}
              title={viewMode === "list" ? "Switch to grouped view" : "Switch to list view"}
            >
              {viewMode === "list" ? "☰" : "⊞"}
            </button>

          </div>
        </div>

        {/* ── List view ── */}
        {viewMode === "list" && (
          <ul className="dashboard__task-list">
            {visibleTasks.length === 0 ? (
              <li className="dashboard__empty">
                {isSearching ? `No tasks match "${searchQuery}"` : "No tasks found"}
              </li>
            ) : (
              visibleTasks.map((task) => (
                <TaskItem key={task.id} task={task}
                  onToggle={onToggleTask} onDelete={onDeleteTask} highlight={query} />
              ))
            )}
          </ul>
        )}

        {/* ── Grouped view ── */}
        {viewMode === "grouped" && (
          <div className="dashboard__grouped">
            {GROUP_META.map(({ key, label, count }) =>
              count > 0 ? (
                <div key={key} className="dashboard__group">
                  <div className="dashboard__group__header">
                    <span className="dashboard__group__label">{label}</span>
                    <span className="dashboard__group__count">{count}</span>
                  </div>
                  <ul className="dashboard__task-list">
                    {grouped[key].map((task) => (
                      <TaskItem key={task.id} task={task}
                        onToggle={onToggleTask} onDelete={onDeleteTask} highlight={query} />
                    ))}
                  </ul>
                </div>
              ) : null
            )}
            {visibleTasks.length === 0 && (
              <p className="dashboard__empty">No tasks found</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
