// =====================================================
// SR AUTO FINANCE ERP
// Firebase Configuration
// =====================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth
} from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore
} from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// -----------------------------------------------------
// Firebase Project Configuration
// -----------------------------------------------------

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT.firebaseapp.com",

    projectId: "YOUR_PROJECT_ID",

    storageBucket: "YOUR_PROJECT.firebasestorage.app",

    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",

    appId: "YOUR_APP_ID"

};


// -----------------------------------------------------
// Initialize Firebase
// -----------------------------------------------------

const app = initializeApp(firebaseConfig);


// -----------------------------------------------------
// Firebase Services
// -----------------------------------------------------

const auth = getAuth(app);

const db = getFirestore(app);


// -----------------------------------------------------
// Export
// -----------------------------------------------------

export {
    app,
    auth,
    db
};
