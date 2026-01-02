import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;
const authDomain = import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.PUBLIC_FIREBASE_APP_ID;
const measurementId = import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID;

if (!apiKey || apiKey.trim().length === 0) {
  throw new Error(
    'Missing PUBLIC_FIREBASE_API_KEY. Check .env (local) and GitHub Actions Variables (prod).'
  );
}

if (import.meta.env.DEV) {
  console.log('[firebase] config', { apiKey, authDomain, projectId });
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
