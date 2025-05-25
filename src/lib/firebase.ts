
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Added Firestore import

// Initialize Firebase

const firebaseConfig = {
  apiKey: "AIzaSyAOYDqL-D4PvQgpcAkuY-KtKK3C9VeIizg",
  authDomain: "aidoc-aid.firebaseapp.com",
  projectId: "aidoc-aid",
  storageBucket: "aidoc-aid.firebasestorage.app",
  messagingSenderId: "996891262146",
  appId: "1:996891262146:web:300a889d4d6548732e0f5b",
  measurementId: "G-HTLDB4P98J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app); // Added Firestore export

// Dynamically import and initialize Firebase Analytics only on the client side
let analytics;
if (typeof window !== 'undefined') {
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}
