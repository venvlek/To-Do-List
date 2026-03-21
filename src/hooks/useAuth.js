// hooks/useAuth.js
// Subscribes to Firebase auth state and exposes sign-in / sign-up / sign-out helpers.

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider, appleProvider } from "../firebase";

export default function useAuth() {
  const [user,        setUser]        = useState(undefined); // undefined = loading
  const [authLoading, setAuthLoading] = useState(true);
  const [authError,   setAuthError]   = useState(null);

  // ── Subscribe to auth state changes ──────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);       // null = signed out, object = signed in
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const clearError = () => setAuthError(null);

  // ── Email / password sign-up ──────────────────────────────────────────────
  const signUp = async (email, password, displayName) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      return cred.user;
    } catch (err) {
      setAuthError(friendlyError(err.code));
      return null;
    }
  };

  // ── Email / password sign-in ──────────────────────────────────────────────
  const signIn = async (email, password) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      setAuthError(friendlyError(err.code));
      return null;
    }
  };

  // ── Google sign-in ────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(friendlyError(err.code));
      }
      return null;
    }
  };

  // ── Apple sign-in ─────────────────────────────────────────────────────────
  const signInWithApple = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, appleProvider);
      return cred.user;
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(friendlyError(err.code));
      }
      return null;
    }
  };

  // ── Guest (anonymous) sign-in ─────────────────────────────────────────────
  const signInAsGuest = async () => {
    setAuthError(null);
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (err) {
      setAuthError(friendlyError(err.code));
      return null;
    }
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      setAuthError(friendlyError(err.code));
      return false;
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const logOut = async () => {
    await signOut(auth);
  };

  return {
    user,
    authLoading,
    authError,
    clearError,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signInAsGuest,
    resetPassword,
    logOut,
  };
}

// ── Human-readable Firebase error messages ────────────────────────────────────
function friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":    return "An account with this email already exists.";
    case "auth/invalid-email":           return "Please enter a valid email address.";
    case "auth/weak-password":           return "Password must be at least 6 characters.";
    case "auth/user-not-found":          return "No account found with this email.";
    case "auth/wrong-password":          return "Incorrect password. Please try again.";
    case "auth/too-many-requests":       return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed":  return "Network error. Check your connection.";
    case "auth/popup-blocked":           return "Popup was blocked. Allow popups and try again.";
    case "auth/operation-not-allowed":   return "This sign-in method is not enabled.";
    default:                             return "Something went wrong. Please try again.";
  }
}
