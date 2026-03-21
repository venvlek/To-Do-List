import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyCCxHnMveSM4E9vP7-J_LwC9t2w-gOzG-0",
  authDomain:        "to-do-list-53ea7.firebaseapp.com",
  projectId:         "to-do-list-53ea7",
  storageBucket:     "to-do-list-53ea7.firebasestorage.app",
  messagingSenderId: "464897288687",
  appId:             "1:464897288687:web:bcca119c49fd89b4672e1a",
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider  = new OAuthProvider("apple.com");

export default app;
