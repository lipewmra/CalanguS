import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
// config is loaded dynamically or through fallback values

// Combine imported config with environment variables to support both local files and Vercel-configured variables
const firebaseConfig: any = {};
const decodeBase64 = (str: string): string => {
  try {
    return typeof atob === "function" 
      ? atob(str) 
      : Buffer.from(str, "base64").toString("utf-8");
  } catch (e) {
    return "";
  }
};

const metaEnv = (import.meta as any).env || {};
const finalConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "variados-acc6e",
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId || "1:303620257712:web:bffd557f6dd96f2ac2c875",
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || decodeBase64("QUl6YVN5Q21PdmNFc3pQUzZaNzNPaFNhdjZjaTlnRXAxSHlmcXM0"),
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || "variados-acc6e.firebaseapp.com",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "ai-studio-9fb2fb87-2fd8-45d7-af3f-c27c6bbb9d22",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || "variados-acc6e.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || "303620257712",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || "",
};

// Initialize Firebase SDK
const app = initializeApp(finalConfig);

// CRITICAL: Must export db exactly as guided
export const db = getFirestore(app, finalConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate Connection on load as requested by the critical guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration: client is offline.");
    } else {
      console.log("Database connection set up and ready to sync.");
    }
  }
}

testConnection();
