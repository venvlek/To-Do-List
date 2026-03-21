import { useState } from "react";
import "./Login.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


// mode: "signin" | "signup" | "reset"
export default function Login({ visible, onSignIn, onSignUp, onGoogleSignIn, onAppleSignIn, onGuestSignIn, authError, clearError }) {
  const [mode,     setMode]     = useState("signin");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState("");

  const error = localError || authError;

  const resetForm = () => {
    setName(""); setEmail(""); setPassword(""); setConfirm("");
    setLocalError(""); setResetSent(false);
    if (clearError) clearError();
  };

  const switchMode = (m) => { resetForm(); setMode(m); };

  const handleSubmit = async () => {
    setLocalError("");
    if (clearError) clearError();

    // ── Validation ────────────────────────────────────────────────────
    if (!email.trim())    { setLocalError("Please enter your email.");    return; }
    if (mode !== "reset" && !password) { setLocalError("Please enter your password."); return; }

    if (mode === "signup") {
      if (!name.trim())           { setLocalError("Please enter your name.");             return; }
      if (password.length < 6)    { setLocalError("Password must be at least 6 characters."); return; }
      if (password !== confirm)   { setLocalError("Passwords do not match.");             return; }
    }

    // ── Call parent handler ───────────────────────────────────────────
    setLoading(true);
    try {
      if (mode === "signin") {
        await onSignIn(email.trim(), password);
      } else if (mode === "signup") {
        await onSignUp(email.trim(), password, name.trim());
      } else if (mode === "reset") {
        const ok = await onSignIn("__reset__", email.trim()); // triggers reset in App
        if (ok !== false) setResetSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try { await onGoogleSignIn(); } finally { setLoading(false); }
  };

  const handleApple = async () => {
    setLoading(true);
    try { await onAppleSignIn(); } finally { setLoading(false); }
  };

  const handleGuest = async () => {
    setLoading(true);
    try { await onGuestSignIn(); } finally { setLoading(false); }
  };

  const titles = {
    signin: { title: "Welcome back",       sub: "Sign in to your account"        },
    signup: { title: "Create account",     sub: "Start organising your day"      },
    reset:  { title: "Reset password",     sub: "We'll email you a reset link"   },
  };

  return (
    <div className={`login${visible ? "" : " login--hidden"}`}>

      {/* Logo */}
      <div className="login__logo">
        <div className="login__logo-mark">✓</div>
        <span className="login__logo-name">DoIt</span>
      </div>

      <h1 className="login__title">{titles[mode].title}</h1>
      <p className="login__subtitle">{titles[mode].sub}</p>

      <div className="login__form">

        {/* Error banner */}
        {error && (
          <div className="login__error">
            <span className="login__error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Reset success */}
        {resetSent && (
          <div className="login__success">
            ✅ Reset email sent! Check your inbox.
          </div>
        )}

        {/* Name field — signup only */}
        {mode === "signup" && (
          <div className="login__field">
            <label className="login__label">Your name</label>
            <input className="login__input" type="text" placeholder="Jane Smith"
              value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        )}

        {/* Email */}
        <div className="login__field">
          <label className="login__label">Email</label>
          <input className="login__input" type="email" placeholder="you@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        {/* Password — not on reset screen */}
        {mode !== "reset" && (
          <div className="login__field">
            <label className="login__label">Password</label>
            <input className={`login__input${error && mode === "signin" ? " login__input--error" : ""}`}
              type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
        )}

        {/* Confirm password — signup only */}
        {mode === "signup" && (
          <div className="login__field">
            <label className="login__label">Confirm password</label>
            <input className={`login__input${localError === "Passwords do not match." ? " login__input--error" : ""}`}
              type="password" placeholder="••••••••"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
        )}

        {/* Forgot password link — signin only */}
        {mode === "signin" && (
          <button className="login__forgot" onClick={() => switchMode("reset")}>
            Forgot password?
          </button>
        )}

        {/* Primary CTA */}
        <button className="login__btn" onClick={handleSubmit} disabled={loading || resetSent}>
          {loading && <span className="login__spinner" />}
          {mode === "signin" && !loading && "Sign in"}
          {mode === "signup" && !loading && "Create account"}
          {mode === "reset"  && !loading && "Send reset link"}
          {loading && "Please wait…"}
        </button>

        {/* Social + guest — only on signin / signup */}
        {mode !== "reset" && (
          <>
            <div className="login__divider">
              <span className="login__divider-line" />
              Or continue with
              <span className="login__divider-line" />
            </div>

            <button className="login__social login__social--google" onClick={handleGoogle} disabled={loading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              Continue with Google
            </button>

            <button className="login__social login__social--apple" onClick={handleApple} disabled={loading}>
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 384 512"
                  width="20"
                  height="20"
                  fill="white"
                  >
                  <path d="M318.7 268.7c-.2-49.6 40.5-73.4 42.3-74.5-23-33.6-58.9-38.2-71.6-38.7-30.5-3.1-59.6 17.9-75.1 17.9-15.5 0-39.4-17.4-64.8-17-33.4.5-64.2 19.4-81.4 49.4-34.7 60.1-8.9 149.2 24.9 198 16.5 23.9 36.1 50.7 61.9 49.7 24.8-1 34.2-16.1 64.2-16.1s38.6 16.1 64.8 15.6c26.8-.5 43.7-24.2 60-48.2 18.8-27.5 26.5-54.1 26.8-55.5-.6-.3-51.4-19.7-51.6-78.3zM259.1 121.6c13.6-16.5 22.8-39.5 20.3-62.6-19.6.8-43.3 13-57.3 29.5-12.6 14.6-23.6 37.9-20.6 60.2 21.9 1.7 44.3-11.2 57.6-27.1z" />
                  </svg>
               Continue with Apple
            </button>

            <button className="login__guest" onClick={handleGuest} disabled={loading}>
              Continue as Guest
            </button>
          </>
        )}

        {/* Mode toggle */}
        <div className="login__toggle">
          {mode === "signin" && (
            <>Don't have an account?
              <button className="login__toggle-btn" onClick={() => switchMode("signup")}>Sign up</button>
            </>
          )}
          {mode === "signup" && (
            <>Already have an account?
              <button className="login__toggle-btn" onClick={() => switchMode("signin")}>Sign in</button>
            </>
          )}
          {mode === "reset" && (
            <>Remember your password?
              <button className="login__toggle-btn" onClick={() => switchMode("signin")}>Sign in</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
