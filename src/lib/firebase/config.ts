import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Initialize Firebase safely (fallback to stub config when env vars are unset in test or build environments)
const activeConfig = firebaseConfig.apiKey ? firebaseConfig : {
  apiKey: "mock-key",
  authDomain: "localhost",
  projectId: "curacircle-app",
  storageBucket: "curacircle-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:mockapp"
};

export const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
