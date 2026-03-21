// hooks/useNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages browser push notifications using the Notification API.
// Handles:
//   • Permission request
//   • Due-date reminders (checks every minute)
//   • Daily digest (fires once at 8 AM)
//   • Weekly report (fires once on Sunday at 9 AM)
//   • Sound effects on task actions
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";

// ── Reminder offset in minutes ────────────────────────────────────────────────
const REMINDER_OFFSETS = {
  "5 min":  5,
  "15 min": 15,
  "30 min": 30,
  "1 hour": 60,
  "1 day":  1440,
};

// ── Send a notification (noop if permission not granted) ──────────────────────
function notify(title, body, icon = "/favicon.ico", tag = "") {
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon, tag, silent: false });
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
  } catch {
    /* ignore — some browsers block in certain contexts */
  }
}

// ── Format a date string nicely ───────────────────────────────────────────────
function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export default function useNotifications({ tasks, settings }) {
  const {
    notifDueReminder,
    notifDailyDigest,
    notifWeeklyReport,
    notifReminderTime,
    soundEnabled,
  } = settings;

  // Track which notifications have already fired this session
  const firedRef    = useRef(new Set());
  // Track last day/week digest was sent
  const lastDigest  = useRef(null);
  const lastWeekly  = useRef(null);

  // ── Request permission ──────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted")  return "granted";
    if (Notification.permission === "denied")   return "denied";
    const result = await Notification.requestPermission();
    return result;
  }, []);

  // ── Play a soft sound (uses Web Audio API) ──────────────────────────────────
  const playSound = useCallback((type = "complete") => {
    if (!soundEnabled) return;
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "complete") {
        osc.frequency.setValueAtTime(523, ctx.currentTime);       // C5
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "add") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(550, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "delete") {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      /* Web Audio not available */
    }
  }, [soundEnabled]);

  // ── Due-date reminder checker ───────────────────────────────────────────────
  useEffect(() => {
    if (!notifDueReminder) return;
    if (!("Notification" in window)) return;

    const offsetMins = REMINDER_OFFSETS[notifReminderTime] ?? 15;

    const check = () => {
      if (Notification.permission !== "granted") return;

      const now = new Date();

      tasks.forEach((task) => {
        if (task.completed) return;
        if (!task.dueDate)  return;

        // Build a due datetime — if no time component, treat as end of day (23:59)
        const dueDate = new Date(task.dueDate + "T23:59:00");
        const diffMs  = dueDate - now;
        const diffMin = diffMs / 60000;

        // Fire when within the reminder window (±1 min tolerance)
        if (diffMin > 0 && diffMin <= offsetMins + 1) {
          const key = `due_${task.id}_${notifReminderTime}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            const timeLeft = diffMin <= 60
              ? `${Math.round(diffMin)} min`
              : diffMin <= 1440
              ? `${Math.round(diffMin / 60)} hr`
              : "tomorrow";
            notify(
              `⏰ Task due in ${timeLeft}`,
              `"${task.title}" is due ${fmtDate(task.dueDate)}`,
              "/favicon.ico",
              `due_${task.id}`
            );
          }
        }

        // Overdue notification (fires once per task per session)
        if (diffMs < 0 && diffMs > -3600000) {
          const key = `overdue_${task.id}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            notify(
              `🚨 Overdue task`,
              `"${task.title}" was due ${fmtDate(task.dueDate)}`,
              "/favicon.ico",
              `overdue_${task.id}`
            );
          }
        }
      });
    };

    // Check immediately then every 60 seconds
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [tasks, notifDueReminder, notifReminderTime]);

  // ── Daily digest ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!notifDailyDigest) return;
    if (!("Notification" in window)) return;

    const check = () => {
      if (Notification.permission !== "granted") return;

      const now   = new Date();
      const today = now.toISOString().split("T")[0];
      const hour  = now.getHours();

      // Fire at 8 AM, once per day
      if (hour === 8 && lastDigest.current !== today) {
        lastDigest.current = today;

        const todayTasks   = tasks.filter((t) => t.dueDate === today && !t.completed);
        const overdueTasks = tasks.filter((t) => t.dueDate < today  && !t.completed);

        if (todayTasks.length > 0 || overdueTasks.length > 0) {
          const lines = [];
          if (todayTasks.length)   lines.push(`📋 ${todayTasks.length} task${todayTasks.length > 1 ? "s" : ""} due today`);
          if (overdueTasks.length) lines.push(`⚠️ ${overdueTasks.length} overdue`);
          notify(
            "☀️ Good morning! Daily digest",
            lines.join("  •  "),
            "/favicon.ico",
            "daily_digest"
          );
        } else {
          notify(
            "☀️ Good morning!",
            "You're all caught up — no tasks due today 🎉",
            "/favicon.ico",
            "daily_digest"
          );
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [tasks, notifDailyDigest]);

  // ── Weekly report ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!notifWeeklyReport) return;
    if (!("Notification" in window)) return;

    const check = () => {
      if (Notification.permission !== "granted") return;

      const now    = new Date();
      const isSun  = now.getDay() === 0;
      const hour   = now.getHours();
      const weekId = `${now.getFullYear()}-W${getWeekNumber(now)}`;

      // Fire Sunday at 9 AM, once per week
      if (isSun && hour === 9 && lastWeekly.current !== weekId) {
        lastWeekly.current = weekId;

        const weekAgo  = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];

        const weekTasks = tasks.filter((t) => t.dueDate >= weekAgoStr);
        const done      = weekTasks.filter((t) => t.completed).length;
        const total     = weekTasks.length;
        const rate      = total > 0 ? Math.round((done / total) * 100) : 0;

        notify(
          "📊 Your weekly report",
          `You completed ${done}/${total} tasks this week (${rate}%) 💪`,
          "/favicon.ico",
          "weekly_report"
        );
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [tasks, notifWeeklyReport]);

  return { requestPermission, playSound };
}

// ── ISO week number helper ────────────────────────────────────────────────────
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
