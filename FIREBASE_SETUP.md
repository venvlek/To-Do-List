# Firebase Auth Setup Guide

## 1. Install Firebase SDK

```bash
npm install firebase
```

---

## 2. Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `doit-todo`) → Create
3. On the project overview, click the **Web** icon `</>` → Register app → name it → **Register app**
4. Copy the `firebaseConfig` object shown — you'll need it in step 4

---

## 3. Enable Authentication sign-in methods

In the Firebase console:

1. Go to **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password** → Save
4. Enable **Google** → set your support email → Save
5. *(Optional)* Enable **Apple** → requires Apple Developer account

---

## 4. Paste your config into `firebase.js`

Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

---

## 5. Add your domain to Authorised Domains

In Firebase console → **Authentication → Settings → Authorised domains**:

- `localhost` is already there for local dev
- When you deploy, add your production domain (e.g. `myapp.vercel.app`)

---

## 6. Run the app

```bash
npm run dev
```

---

## What's wired up

| Feature | Status |
|---|---|
| Email + password sign-in | ✅ |
| Email + password sign-up (with name) | ✅ |
| Forgot password / reset email | ✅ |
| Google sign-in (popup) | ✅ |
| Apple sign-in (popup) | ✅ |
| Guest / anonymous sign-in | ✅ |
| Sign out (from Settings tab) | ✅ |
| Per-user task storage (`localStorage` keyed by uid) | ✅ |
| Per-user settings storage (keyed by uid) | ✅ |
| Profile name/email pre-filled from Firebase user | ✅ |
| Friendly error messages | ✅ |
| Loading spinner on all buttons | ✅ |

---

## File structure added

```
src/
├── firebase.js          ← Firebase init + auth providers
├── hooks/
│   └── useAuth.js       ← Auth state + all sign-in methods
├── components/
│   └── Login/
│       ├── Login.jsx    ← Sign-in, Sign-up, Reset password screens
│       └── Login.css
└── App.jsx              ← Uses useAuth(), passes handlers to Login
```
