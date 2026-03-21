// hooks/useFirestore.js
// Real-time Firestore sync for tasks and settings.
//
// Data structure in Firestore:
//   users/{uid}/tasks/{taskId}   — one document per task
//   users/{uid}/settings/prefs   — single settings document
//
// Strategy:
//   • onSnapshot keeps tasks in sync across all devices in real time
//   • Writes go straight to Firestore; localStorage is the offline cache
//   • Guest (anonymous) users only use localStorage, never Firestore

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export default function useFirestore({ user, localTasks, setTasks, setSettings }) {
  const [syncStatus, setSyncStatus] = useState("synced");
  const [lastSynced, setLastSynced] = useState(null);
  const isAnonymous = user?.isAnonymous ?? true;

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
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setTasks(firestoreTasks);
        setSyncStatus("synced");
        setLastSynced(new Date());

        try {
          localStorage.setItem(`todoTasks_${user.uid}`, JSON.stringify(firestoreTasks));
        } catch { /* ignore */ }
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
    setSyncStatus("syncing");
    try {
      await setDoc(
        doc(db, "users", user.uid, "tasks", String(task.id)),
        { ...task, updatedAt: Date.now() }
      );
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch (err) {
      console.error("saveTask error:", err);
      setSyncStatus("error");
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
