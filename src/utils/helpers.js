export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export const formatDate = (dateStr) => {
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

  if (dateStr === today)     return "Today";
  if (dateStr === tomorrow)  return "Tomorrow";
  if (dateStr === yesterday) return "Yesterday";

  const task = new Date(dateStr + "T00:00:00");
  const now  = new Date(today  + "T00:00:00");
  const diff = Math.round((task - now) / 86400000);

  if (diff > 1  && diff <= 7)  return `In ${diff} days`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`;
  return task.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
};

/** Returns a human-readable due label including time if present */
export const formatDueDateTime = (dateStr, timeStr) => {
  const dateLabel = formatDate(dateStr);
  if (!timeStr) return dateLabel;
  // Format time nicely: "14:30" → "2:30 PM"
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  const mins   = String(m).padStart(2, "0");
  return `${dateLabel}, ${hour12}:${mins} ${period}`;
};

/** Returns true if a task is overdue (past its due date+time) */
export const isOverdue = (dateStr, timeStr) => {
  const now = new Date();
  const dueDate = new Date(`${dateStr}T${timeStr || "23:59"}:00`);
  return dueDate < now;
};

export const DEFAULT_TASKS = [];

export const PRIORITY_COLOR = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
export const CAT_COLOR = {
  Personal: "#6366f1", Work: "#0ea5e9", School: "#8b5cf6", Health: "#10b981",
};
