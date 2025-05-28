
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import getStorage

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if the API key is missing or still the placeholder
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY_HERE") {
  console.error(
    "Firebase Error: API Key is missing, invalid, or still the placeholder value. " +
    "Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is correctly set in your .env file with your actual Firebase Web API key, " +
    "and then restart your development server. Without a valid API key, Firebase services will not initialize correctly."
  );
}

// Initialize Firebase
// To prevent reinitialization error on hot reloads/client-side navigation
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app); // Add this line

// Dynamically import and initialize Firebase Analytics only on the client side
let analytics;
if (typeof window !== 'undefined') {
  if (firebaseConfig.measurementId && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY_HERE") {
    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
      isSupported().then((supported) => {
        if (supported) {
          try {
            analytics = getAnalytics(app);
          } catch (e) {
            console.warn("Firebase Analytics could not be initialized (error during getAnalytics):", e);
          }
        } else {
          console.warn("Firebase Analytics is not supported in this browser environment.");
        }
      }).catch(e => {
          console.warn("Error checking Firebase Analytics support:", e);
      });
    }).catch(error => {
      console.warn("Firebase Analytics module could not be imported or initialized:", error);
    });
  } else if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY_HERE" && !firebaseConfig.measurementId) {
    // This case is fine, Analytics is optional
  } else if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY_HERE") {
    console.warn("Firebase Analytics not initialized due to missing or invalid API key.");
  }
}
