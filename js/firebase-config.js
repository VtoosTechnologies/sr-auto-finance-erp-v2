// =====================================================
// SR AUTO FINANCE ERP
// Firebase Configuration
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDowU0rY4EYfTIU7v7frc5JhCTsr66IKo8",
    authDomain: "sr-auto-finance-erp.firebaseapp.com",
    projectId: "sr-auto-finance-erp",
    storageBucket: "sr-auto-finance-erp.firebasestorage.app",
    messagingSenderId: "947776836293",
    appId: "1:947776836293:web:831b8c651bb67842c616ac"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
