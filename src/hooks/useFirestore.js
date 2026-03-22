// useFirestore.js — single source of truth for tasks + settings
// ALL mutations go through this hook. Nothing outside calls setTasks directly.

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection, doc,
  onSnapshot, setDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const DEFAULT_SETTINGS = {
  profileName: "", profileEmail: "", theme: "light",
  notifDueReminder: true, notifDailyDigest: false,
  notifWeeklyReport: false, notifReminderTime: "15 min",
  soundEnabled: false, compactView: false,
};

export default function useFirestore({ user }) {
  const uid         = user?.uid;
  const isAnonymous = !uid || (user?.isAnonymous ?? true);

  const tasksCacheKey    = uid && !isAnonymous ? `fc_tasks_${uid}`    : null;
  const settingsCacheKey = uid && !isAnonymous ? `fc_settings_${uid}` : null;

  // ── State ─────────────────────────────────────────────────────────────────
  const [tasks,      _setTasks]    = useState(() => loadCache(tasksCacheKey,    []));
  const [settings,   _setSettings] = useState(() => loadCache(settingsCacheKey, DEFAULT_SETTINGS));
  const [tasksReady, setTasksReady] = useState(isAnonymous);
  const [syncStatus, setSyncStatus] = useState(isAnonymous ? "synced" : "syncing");
  const [lastSynced, setLastSynced] = useState(null);

  // Internal ref holds the live tasks array so callbacks always see latest
  const tasksRef    = useRef(tasks);
  const pendingIds  = useRef(new Set()); // IDs we wrote locally but Firestore hasn't confirmed yet

  // Keep ref in sync
  const setTasks = useCallback((updater) => {
    _setTasks((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      tasksRef.current = next;
      if (tasksCacheKey) {
        try { localStorage.setItem(tasksCacheKey, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, [tasksCacheKey]);

  const setSettings = useCallback((updater) => {
    _setSettings((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (settingsCacheKey) {
        try { localStorage.setItem(settingsCacheKey, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, [settingsCacheKey]);

  // ── Firestore tasks listener ──────────────────────────────────────────────
  useEffect(() => {
    if (isAnonymous || !uid) {
      setTasksReady(true);
      setSyncStatus("synced");
      return;
    }

    setSyncStatus("syncing");
    const ref  = collection(db, "users", uid, "tasks");
    const unsub = onSnapshot(ref,
      (snapshot) => {
        const fromDB = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Merge: keep pending local tasks at top, add confirmed DB tasks below
        setTasks((prev) => {
          const pending   = prev.filter((t) => pendingIds.current.has(String(t.id)));
          const confirmed = fromDB.filter((t) => !pendingIds.current.has(String(t.id)));
          return [...pending, ...confirmed];
        });

        setTasksReady(true);
        setSyncStatus("synced");
        setLastSynced(new Date());
      },
      (err) => {
        console.error("Tasks listener error:", err);
        setSyncStatus("error");
        setTasksReady(true);
      }
    );
    return unsub;
  }, [uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Firestore settings listener ───────────────────────────────────────────
  useEffect(() => {
    if (isAnonymous || !uid) return;
    const ref   = doc(db, "users", uid, "settings", "prefs");
    const unsub = onSnapshot(ref,
      (snap) => {
        if (snap.exists()) setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...snap.data() }));
      },
      (err) => { console.error("Settings listener error:", err); }
    );
    return unsub;
  }, [uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── addTask — optimistic add + Firestore write ────────────────────────────
  const addTask = useCallback((taskData) => {
    const newTask = {
      id:          String(Date.now()),
      description: "",
      dueTime:     "",
      ...taskData,
      priority:    taskData.priority?.toLowerCase() || "medium",
      completed:   false,
      createdAt:   Date.now(),
    };

    // 1. Add to local state immediately
    setTasks((prev) => [newTask, ...prev]);

    // 2. Mark as pending so onSnapshot doesn't drop it
    pendingIds.current.add(newTask.id);

    // 3. Write to Firestore
    if (!isAnonymous && uid) {
      setSyncStatus("syncing");
      setDoc(doc(db, "users", uid, "tasks", newTask.id), {
        ...newTask,
        updatedAt: Date.now(),
      })
        .then(() => {
          setSyncStatus("synced");
          setLastSynced(new Date());
        })
        .catch((err) => {
          console.error("addTask error:", err);
          setSyncStatus("error");
        })
        .finally(() => {
          // Remove from pending after Firestore confirms (with buffer)
          setTimeout(() => pendingIds.current.delete(newTask.id), 8000);
        });
    }

    return newTask;
  }, [uid, isAnonymous, setTasks]);

  // ── toggleTask ────────────────────────────────────────────────────────────
  const toggleTask = useCallback((id) => {
    setTasks((prev) => {
      const next    = prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
      const changed = next.find((t) => t.id === id);
      if (changed && !isAnonymous && uid) {
        setSyncStatus("syncing");
        setDoc(doc(db, "users", uid, "tasks", String(id)), {
          ...changed, updatedAt: Date.now(),
        })
          .then(() => { setSyncStatus("synced"); setLastSynced(new Date()); })
          .catch((err) => { console.error("toggleTask error:", err); setSyncStatus("error"); });
      }
      return next;
    });
  }, [uid, isAnonymous, setTasks]);

  // ── deleteTask ────────────────────────────────────────────────────────────
  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (!isAnonymous && uid) {
      setSyncStatus("syncing");
      deleteDoc(doc(db, "users", uid, "tasks", String(id)))
        .then(() => { setSyncStatus("synced"); setLastSynced(new Date()); })
        .catch((err) => { console.error("deleteTask error:", err); setSyncStatus("error"); });
    }
  }, [uid, isAnonymous, setTasks]);

  // ── clearAllTasks ─────────────────────────────────────────────────────────
  const clearAllTasks = useCallback(() => {
    const current = [...tasksRef.current];
    setTasks([]);
    if (!isAnonymous && uid && current.length > 0) {
      const batch    = writeBatch(db);
      const colRef   = collection(db, "users", uid, "tasks");
      current.forEach((t) => batch.delete(doc(colRef, String(t.id))));
      batch.commit().catch((err) => console.error("clearAllTasks error:", err));
    }
  }, [uid, isAnonymous, setTasks]);

  // ── updateSettings ────────────────────────────────────────────────────────
  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    if (!isAnonymous && uid) {
      setDoc(
        doc(db, "users", uid, "settings", "prefs"),
        { ...newSettings, updatedAt: Date.now() },
        { merge: true }
      ).catch((err) => console.error("updateSettings error:", err));
    }
  }, [uid, isAnonymous, setSettings]);

  return {
    // State (read-only from outside)
    tasks, settings, tasksReady, syncStatus, lastSynced, isAnonymous,
    // Mutations (the ONLY way to change tasks/settings from outside)
    addTask, toggleTask, deleteTask, clearAllTasks, updateSettings,
  };
}

// ── helper ────────────────────────────────────────────────────────────────────
function loadCache(key, fallback) {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
