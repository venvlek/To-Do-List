# Firestore Setup Guide

## 1. Enable Firestore in Firebase console

1. Go to https://console.firebase.google.com → your project
2. Left sidebar → **Build → Firestore Database**
3. Click **Create database**
4. Choose **Start in production mode** → Next
5. Pick a region closest to you → **Enable**

---

## 2. Set Firestore security rules

In Firestore → **Rules** tab, replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each user can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

---

## 3. Update your firebase.js

Make sure your `src/firebase.js` has your real config values and exports `db`:

```js
import { getFirestore } from "firebase/firestore";
export const db = getFirestore(app);
```

This is already done in the updated `firebase.js` file.

---

## 4. Install Firestore (already included in firebase package)

No extra install needed — Firestore is part of the `firebase` package you already installed.

---

## Data structure

```
Firestore
└── users/
    └── {uid}/
        ├── tasks/
        │   ├── {taskId}   ← one doc per task
        │   └── {taskId}
        └── settings/
            └── prefs      ← single settings doc
```

---

## How sync works

| Action | Behaviour |
|---|---|
| Add task | Saved to Firestore instantly |
| Toggle complete | Updated in Firestore instantly |
| Delete task | Removed from Firestore instantly |
| Open app on new device | Tasks load from Firestore in real time |
| Go offline | App works from localStorage cache |
| Come back online | Firestore resumes syncing automatically |
| Guest user | localStorage only, no Firestore |

---

## Sync status indicator

A small dot appears at the bottom of the task list:
- 🟢 **Green** — synced
- 🟡 **Pulsing yellow** — syncing
- 🔴 **Red** — error (check console for details)
- ⚫ **Grey** — guest mode (sign in to enable sync)
