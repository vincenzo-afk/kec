// Firebase SDK initialisation
// Replace the config values with your actual Firebase project config
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kec-26.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kec-26',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kec-26.firebasestorage.app',
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

// Local emulator wiring (dev only). Opt-in via VITE_USE_EMULATORS=true.
if (import.meta.env.DEV && String(import.meta.env.VITE_USE_EMULATORS || '') === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // Storage/Functions emulators are optional; only connect if explicitly enabled.
  if (String(import.meta.env.VITE_USE_STORAGE_EMULATOR || '') === 'true') {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  if (String(import.meta.env.VITE_USE_FUNCTIONS_EMULATOR || '') === 'true') {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
}

// FCM — only available in secure contexts
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (supported) return getMessaging(app);
  return null;
};

export default app;
