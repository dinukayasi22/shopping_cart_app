// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmxaaJQMT_orMv_UmcV83ZZ0_nsNibCis",
  authDomain: "webapp-d9035.firebaseapp.com",
  databaseURL: "https://webapp-d9035-default-rtdb.firebaseio.com",
  projectId: "webapp-d9035",
  storageBucket: "webapp-d9035.firebasestorage.app",
  messagingSenderId: "589836440804",
  appId: "1:589836440804:web:ea0ddd81770a5637b988f1",
  measurementId: "G-WLKX39FMGD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services - only initialize what's supported in React Native
const realtimeDb = getDatabase(app);

// Test Firebase connection
console.log('Firebase initialized successfully');
console.log('Database URL:', firebaseConfig.databaseURL);

// Firebase Functions base URL
export const FIREBASE_FUNCTIONS_BASE_URL = "https://us-central1-webapp-d9035.cloudfunctions.net";

export { app, realtimeDb };
export default app;

