// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCF9kGEKBk6L5btxclVsfyeHA3TNYGw_0U",
    authDomain: "projectpals-66223.firebaseapp.com",
    projectId: "projectpals-66223",
    storageBucket: "projectpals-66223.firebasestorage.app",
    messagingSenderId: "755356209640",
    appId: "1:755356209640:web:9da5a884f57c734d22945d",
    measurementId: "G-MNCC9NQ114"
};

// Initialize Firebase
// Note: We use the 'compat' libraries loaded in index.html, so we use the global 'firebase' object
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: Analytics
if (firebase.analytics) {
    firebase.analytics();
}

// Make services available globally for app.jsx
window.auth = auth;
window.db = db;

console.log("Firebase initialized with ProjectPals credentials");
