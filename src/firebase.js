// Firebase SDK initialisation
// Replace the config values with your actual Firebase project config
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kingstonconnect.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kingstonconnect',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kingstonconnect.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'your-app-id',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'your-measurement-id',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// FCM — only available in secure contexts
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (supported) return getMessaging(app);
  return null;
};

export default app;
