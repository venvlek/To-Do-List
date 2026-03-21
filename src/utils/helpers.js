export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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

  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  if (dateStr === yesterday) return "Yesterday";

  const task = new Date(dateStr + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const diff = Math.round((task - now) / 86400000);

  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`;

  return task.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const DEFAULT_TASKS = [
  { id: 1, title: "Buy groceries", description: "", category: "School", priority: "high", dueDate: todayStr(), completed: false },
  { id: 2, title: "Finish project report", description: "", category: "Work", priority: "medium", dueDate: todayStr(), completed: false },
  { id: 3, title: "Call mom", description: "", category: "Personal", priority: "low", dueDate: todayStr(), completed: true },
  { id: 4, title: "Schedule dentist appointment", description: "", category: "Health", priority: "high", dueDate: todayStr(), completed: false },
  { id: 5, title: "Plan weekend trip", description: "", category: "Personal", priority: "low", dueDate: todayStr(), completed: false },
];

export const PRIORITY_COLOR = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

export const CAT_COLOR = {
  Personal: "#6366f1",
  Work: "#0ea5e9",
  School: "#8b5cf6",
  Health: "#10b981",
};
