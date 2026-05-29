import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Credenciais lidas a partir de variáveis de ambiente do Vite (import.meta.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Verifica se as credenciais necessárias foram fornecidas
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "SUA_API_KEY" &&
  firebaseConfig.projectId
);

let app;
let db = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
  } catch (error) {
    console.error("Erro ao inicializar o Firebase Firestore:", error);
  }
}

export { db };
