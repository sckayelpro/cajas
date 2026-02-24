// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD75euA8aJ5jimp4IPZPGJbOotuxtw9AHs",
  authDomain: "cajas-d7fb6.firebaseapp.com",
  projectId: "cajas-d7fb6",
  storageBucket: "cajas-d7fb6.firebasestorage.app",
  messagingSenderId: "745977582823",
  appId: "1:745977582823:web:97c515d45165557ff7be42",
  measurementId: "G-6D05GY6P38"
};

// Initialize Firebase
// Evita inicializar Firebase múltiples veces en Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);