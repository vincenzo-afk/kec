import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence, disableNetwork } from 'firebase/firestore';
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

const EMULATOR_HOST = import.meta.env.VITE_EMULATOR_HOST || '127.0.0.1';
const EMULATOR_PORTS = {
  auth: Number(import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099),
  firestore: Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080),
  storage: Number(import.meta.env.VITE_STORAGE_EMULATOR_PORT || 9199),
  functions: Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001),
};
const EMULATOR_TIMEOUT_MS = Number(import.meta.env.VITE_EMULATOR_PING_TIMEOUT_MS || 350);
const SHOULD_TRY_EMULATORS =
  import.meta.env.DEV && String(import.meta.env.VITE_USE_EMULATORS || '').toLowerCase() === 'true';
const OPTIONAL_EMULATORS = {
  storage: String(import.meta.env.VITE_USE_STORAGE_EMULATOR || '').toLowerCase() === 'true',
  functions: String(import.meta.env.VITE_USE_FUNCTIONS_EMULATOR || '').toLowerCase() === 'true',
};

async function canReachEmulator(url) {
  if (typeof window === 'undefined') return false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), EMULATOR_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function resolveEmulatorState() {
  const defaultState = {
    ...firebaseBackend,
  };

  if (!SHOULD_TRY_EMULATORS) return defaultState;

  const urls = {
    auth: `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`,
    firestore: `http://${EMULATOR_HOST}:${EMULATOR_PORTS.firestore}`,
    storage: `http://${EMULATOR_HOST}:${EMULATOR_PORTS.storage}`,
    functions: `http://${EMULATOR_HOST}:${EMULATOR_PORTS.functions}`,
  };

  const [authReady, firestoreReady, storageReady, functionsReady] = await Promise.all([
    canReachEmulator(urls.auth),
    canReachEmulator(urls.firestore),
    OPTIONAL_EMULATORS.storage ? canReachEmulator(urls.storage) : Promise.resolve(false),
    OPTIONAL_EMULATORS.functions ? canReachEmulator(urls.functions) : Promise.resolve(false),
  ]);

  const coreReady = authReady && firestoreReady;

  return {
    ...defaultState,
    enabled: coreReady,
    mode: coreReady ? 'emulator' : 'live',
    services: {
      auth: coreReady,
      firestore: coreReady,
      storage: coreReady && OPTIONAL_EMULATORS.storage && storageReady,
      functions: coreReady && OPTIONAL_EMULATORS.functions && functionsReady,
    },
    reachable: {
      auth: authReady,
      firestore: firestoreReady,
      storage: storageReady,
      functions: functionsReady,
    },
  };
}

function safeGetAnalytics(app) {
  if (typeof window === 'undefined') return null;
  if (!firebaseConfig.measurementId || firebaseConfig.measurementId === 'your-measurement-id') return null;

  try {
    return getAnalytics(app);
  } catch (error) {
    console.warn('[Firebase] Analytics is unavailable in this environment.', error);
    return null;
  }
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Firestore settings for development
if (import.meta.env.DEV) {
  // Disable persistence to prevent connection issues in development
  // This forces all reads/writes to go directly to the server
  try {
    // Disable IndexedDB persistence
    db.settings = {
      cacheSizeBytes: 1048576, // 1MB
      mergeCacheAndNetwork: false,
      experimentalForceLongPolling: false,
    };
  } catch (e) {
    console.warn('[Firebase] Could not set Firestore settings:', e);
  }
}

export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');
export const analytics = safeGetAnalytics(app);
export const firebaseBackend = {
  requested: SHOULD_TRY_EMULATORS,
  enabled: false,
  mode: 'live',
  host: EMULATOR_HOST,
  services: {
    auth: false,
    firestore: false,
    storage: false,
    functions: false,
  },
};

async function configureFirebaseBackend() {
  const emulatorState = await resolveEmulatorState();
  Object.assign(firebaseBackend, emulatorState);

  if (emulatorState.services.auth) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORTS.firestore);

    if (emulatorState.services.storage) {
      connectStorageEmulator(storage, EMULATOR_HOST, EMULATOR_PORTS.storage);
    }

    if (emulatorState.services.functions) {
      connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions);
    }
  }

  if (import.meta.env.DEV && SHOULD_TRY_EMULATORS) {
    if (emulatorState.enabled) {
      const enabledServices = Object.entries(emulatorState.services)
        .filter(([, enabled]) => enabled)
        .map(([service]) => service)
        .join(', ');
      console.info(`[Firebase] Connected to local emulators: ${enabledServices}.`);
    } else {
      console.warn(
        '[Firebase] Emulator mode was requested, but Auth and Firestore emulators were not both reachable. ' +
        'Falling back to live Firebase services. Start them with `npm run dev:emu` or set `VITE_USE_EMULATORS=false`.'
      );
    }
  }

  return emulatorState;
}

export const firebaseReady = configureFirebaseBackend().catch((error) => {
  console.error('[Firebase] Backend configuration failed. Falling back to live services.', error);
  Object.assign(firebaseBackend, {
    requested: SHOULD_TRY_EMULATORS,
    enabled: false,
    mode: 'live',
    host: EMULATOR_HOST,
    services: {
      auth: false,
      firestore: false,
      storage: false,
      functions: false,
    },
  });
  return firebaseBackend;
});

if (import.meta.env.DEV && SHOULD_TRY_EMULATORS) {
  firebaseReady.then((state) => {
    if (state.enabled) return;
    const reachable = Object.entries(state.reachable || {})
      .filter(([, enabled]) => enabled)
      .map(([service]) => service);
    if (reachable.length > 0) {
      console.info(`[Firebase] Reachable emulator services: ${reachable.join(', ')}.`);
    }
  });
}

// FCM — only available in secure contexts
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (supported) return getMessaging(app);
  return null;
};

export default app;
