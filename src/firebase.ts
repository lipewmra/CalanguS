import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromCache 
} from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

const defaultFirebaseConfig = {
  projectId: "variados-acc6e",
  appId: "1:303620257712:web:bffd557f6dd96f2ac2c875",
  apiKey: "AIzaSyCmOvcEszPS6Z73OhSav6ci9gEp1Hyfqs4",
  authDomain: "variados-acc6e.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-9fb2fb87-2fd8-45d7-af3f-c27c6bbb9d22",
  storageBucket: "variados-acc6e.firebasestorage.app",
  messagingSenderId: "303620257712",
  measurementId: "zvbS8ZUsR9itAJClihDP5Q",
};

const metaEnv = (import.meta as any).env || {};
const finalConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || appletConfig?.projectId || defaultFirebaseConfig.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || appletConfig?.appId || defaultFirebaseConfig.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || appletConfig?.apiKey || defaultFirebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || appletConfig?.authDomain || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || appletConfig?.firestoreDatabaseId || defaultFirebaseConfig.firestoreDatabaseId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || appletConfig?.storageBucket || defaultFirebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig?.messagingSenderId || defaultFirebaseConfig.messagingSenderId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || appletConfig?.measurementId || defaultFirebaseConfig.measurementId,
};

// Initialize Firebase SDK
const app = initializeApp(finalConfig);

// Initialize Firestore with local persistent caching to preserve quota & provide offline resilience
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
  }, finalConfig.firestoreDatabaseId);
} catch (initErr) {
  console.warn("Falling back to standard Firestore initialization:", initErr);
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, finalConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Check cached connection without incurring forced server reads
async function checkCachedConnection() {
  try {
    await getDocFromCache(doc(db, "test", "connection"));
  } catch {
    // Expected on fresh load
  }
}
checkCachedConnection();

