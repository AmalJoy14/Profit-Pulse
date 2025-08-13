// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRc9kAE7emDKY8HoyFfY_DDSbWuhJGamE",
  authDomain: "canteen-portal-8feba.firebaseapp.com",
  projectId: "canteen-portal-8feba",
  storageBucket: "canteen-portal-8feba.firebasestorage.app",
  messagingSenderId: "727876346424",
  appId: "1:727876346424:web:c336fe08c6cdcb2ffbfccd",
  measurementId: "G-KNPKEYFNGQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Auth and export it
export const auth = getAuth(app);

// Initialize Firestore and export it
export const db = getFirestore(app);