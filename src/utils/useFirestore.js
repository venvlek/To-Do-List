// hooks/useFirestore.js
import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection, doc,
  onSnapshot, setDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export default function useFirestore({ user, localTasks, setTasks, setSettings }) {
  const [syncStatus, setSyncStatus] = useState("synced");
  const [lastSynced, setLastSynced] = useState(null);
  const isAnonymous = user?.isAnonymous ?? true;

  // Track IDs of tasks we just wrote locally so onSnapshot
  // doesn't overwrite them before Firestore confirms the write
  const pendingIds = useRef(new Set());

  // ── Real-time tasks listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || isAnonymous) return;

    setSyncStatus("syncing");
    const tasksRef = collection(db, "users", user.uid, "tasks");

    const unsub = onSnapshot(
      tasksRef,
      (snapshot) => {
        const firestoreTasks = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          // Sort by createdAt first, fall back to id (which is Date.now())
          .sort((a, b) => {
            const ca = a.createdAt || Number(a.id) || 0;
            const cb = b.createdAt || Number(b.id) || 0;
            return cb - ca; // newest first
          });

        // Merge: keep locally-pending tasks that haven't reached Firestore yet
        setTasks((prev) => {
          if (pendingIds.current.size === 0) {
            // Nothing pending — use Firestore data directly
            return firestoreTasks;
          }

          // Keep pending tasks at the top, append the rest from Firestore
          const pending  = prev.filter((t) => pendingIds.current.has(String(t.id)));
          const fromDB   = firestoreTasks.filter((t) => !pendingIds.current.has(String(t.id)));
          return [...pending, ...fromDB];
        });

        setSyncStatus("synced");
        setLastSynced(new Date());
        // localStorage cache is updated AFTER merge so it always
        // reflects the true state (not just raw Firestore data)
      },
      (err) => {
        console.error("Firestore tasks error:", err);
        setSyncStatus("error");
      }
    );

    return unsub;
  }, [user?.uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time settings listener ───────────────────────────────────────────
  useEffect(() => {
    if (!user || isAnonymous) return;

    const settingsRef = doc(db, "users", user.uid, "settings", "prefs");

    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...snap.data() }));
        }
      },
      (err) => { console.error("Firestore settings error:", err); }
    );

    return unsub;
  }, [user?.uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Write a single task ───────────────────────────────────────────────────
  const saveTask = useCallback(async (task) => {
    if (!user || isAnonymous) return;

    const taskId = String(task.id);
    pendingIds.current.add(taskId);
    setSyncStatus("syncing");

    try {
      await setDoc(
        doc(db, "users", user.uid, "tasks", taskId),
        {
          ...task,
          id:        taskId,
          createdAt: task.createdAt || Date.now(),
          updatedAt: Date.now(),
        }
      );
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("saveTask error:", err);
      setSyncStatus("error");
    } finally {
      // Remove from pending after a short delay to let onSnapshot settle
      setTimeout(() => pendingIds.current.delete(taskId), 3000);
    }
  }, [user?.uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete a single task ──────────────────────────────────────────────────
  const removeTask = useCallback(async (taskId) => {
    if (!user || isAnonymous) return;
    setSyncStatus("syncing");
    try {
      await deleteDoc(doc(db, "users", user.uid, "tasks", String(taskId)));
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("removeTask error:", err);
      setSyncStatus("error");
    }
  }, [user?.uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Batch delete all tasks ────────────────────────────────────────────────
  const clearAllTasks = useCallback(async () => {
    if (!user || isAnonymous) return;
    setSyncStatus("syncing");
    try {
      const batch    = writeBatch(db);
      const tasksRef = collection(db, "users", user.uid, "tasks");
      localTasks.forEach((task) => {
        batch.delete(doc(tasksRef, String(task.id)));
      });
      await batch.commit();
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("clearAllTasks error:", err);
      setSyncStatus("error");
    }
  }, [user?.uid, isAnonymous, localTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save settings ─────────────────────────────────────────────────────────
  const saveSettings = useCallback(async (newSettings) => {
    if (!user || isAnonymous) return;
    try {
      await setDoc(
        doc(db, "users", user.uid, "settings", "prefs"),
        { ...newSettings, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.error("saveSettings error:", err);
    }
  }, [user?.uid, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncStatus, lastSynced, saveTask, removeTask, clearAllTasks, saveSettings, isAnonymous };
}
