import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection, doc,
  onSnapshot, setDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export default function useFirestore({ user }) {
  const uid         = user?.uid;
  const isAnonymous = user?.isAnonymous ?? true;
  const cacheKey    = uid && !isAnonymous ? `firestoreTasks_${uid}` : null;

  // ── Tasks — start from cache, then Firestore takes over ──────────────────
  const [tasks, setTasks] = useState(() => {
    if (!cacheKey) return [];
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [tasksReady, setTasksReady] = useState(isAnonymous); // guests are immediately "ready"
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [lastSynced, setLastSynced] = useState(null);

  // Track locally-added task IDs so onSnapshot doesn't drop them
  const pendingIds = useRef(new Set());

  // ── Firestore real-time listener ─────────────────────────────────────────
  useEffect(() => {
    if (!uid || isAnonymous) {
      setTasksReady(true);
      setSyncStatus("synced");
      return;
    }

    setSyncStatus("syncing");
    const tasksRef = collection(db, "users", uid, "tasks");

    const unsub = onSnapshot(
      tasksRef,
      (snapshot) => {
        const fromFirestore = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setTasks((prev) => {
          // Keep any locally-pending tasks that haven't reached Firestore yet
          const pending = prev.filter((t) => pendingIds.current.has(String(t.id)));
          const fromDB  = fromFirestore.filter((t) => !pendingIds.current.has(String(t.id)));
          const merged  = [...pending, ...fromDB];

          // Save merged result to cache
          if (cacheKey) {
            try { localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch { /* ignore */ }
          }
          return merged;
        });

        setTasksReady(true);
        setSyncStatus("synced");
        setLastSynced(new Date());
      },
      (err) => {
        console.error("Firestore tasks error:", err);
        setSyncStatus("error");
        setTasksReady(true); // show whatever we have from cache
      }
    );

    return unsub;
  }, [uid, isAnonymous, cacheKey]);

  // ── Settings ──────────────────────────────────────────────────────────────
  const settingsCacheKey = uid && !isAnonymous ? `firestoreSettings_${uid}` : null;

  const [settings, setSettings] = useState(() => {
    if (!settingsCacheKey) return null;
    try {
      const raw = localStorage.getItem(settingsCacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (!uid || isAnonymous) return;
    const ref = doc(db, "users", uid, "settings", "prefs");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings((prev) => ({ ...prev, ...data }));
        if (settingsCacheKey) {
          try { localStorage.setItem(settingsCacheKey, JSON.stringify(data)); } catch { /* ignore */ }
        }
      }
    }, (err) => { console.error("Firestore settings error:", err); });
    return unsub;
  }, [uid, isAnonymous, settingsCacheKey]);

  // ── Write helpers ─────────────────────────────────────────────────────────
  const saveTask = useCallback(async (task) => {
    if (!uid || isAnonymous) return;
    const taskId = String(task.id);
    pendingIds.current.add(taskId);
    setSyncStatus("syncing");
    try {
      await setDoc(doc(db, "users", uid, "tasks", taskId), {
        ...task,
        id:        taskId,
        createdAt: task.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("saveTask error:", err);
      setSyncStatus("error");
    } finally {
      setTimeout(() => pendingIds.current.delete(taskId), 5000);
    }
  }, [uid, isAnonymous]);

  const removeTask = useCallback(async (taskId) => {
    if (!uid || isAnonymous) return;
    setSyncStatus("syncing");
    try {
      await deleteDoc(doc(db, "users", uid, "tasks", String(taskId)));
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("removeTask error:", err);
      setSyncStatus("error");
    }
  }, [uid, isAnonymous]);

  const clearAllTasks = useCallback(async (currentTasks) => {
    if (!uid || isAnonymous) return;
    setSyncStatus("syncing");
    try {
      const batch    = writeBatch(db);
      const tasksRef = collection(db, "users", uid, "tasks");
      currentTasks.forEach((t) => batch.delete(doc(tasksRef, String(t.id))));
      await batch.commit();
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("clearAllTasks error:", err);
      setSyncStatus("error");
    }
  }, [uid, isAnonymous]);

  const saveSettings = useCallback(async (newSettings) => {
    if (!uid || isAnonymous) return;
    try {
      await setDoc(
        doc(db, "users", uid, "settings", "prefs"),
        { ...newSettings, updatedAt: Date.now() },
        { merge: true }
      );
      if (settingsCacheKey) {
        try { localStorage.setItem(settingsCacheKey, JSON.stringify(newSettings)); } catch { /* ignore */ }
      }
    } catch (err) { console.error("saveSettings error:", err); }
  }, [uid, isAnonymous, settingsCacheKey]);

  return {
    tasks, setTasks,
    settings, setSettings,
    tasksReady,
    syncStatus, lastSynced,
    isAnonymous,
    saveTask, removeTask, clearAllTasks, saveSettings,
  };
}
