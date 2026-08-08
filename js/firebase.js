/* ==========================================================
   SR AUTO FINANCE ERP
   Firebase Configuration
   Developed By : VTOOS Software Solutions
========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

/* ==========================================================
   FIREBASE CONFIG
========================================================== */

const firebaseConfig = {

    apiKey: "AIzaSyDowU0rY4EYfTIU7v7frc5JhCTsr66IKo8",

    authDomain: "sr-auto-finance-erp.firebaseapp.com",

    projectId: "sr-auto-finance-erp",

    storageBucket: "sr-auto-finance-erp.firebasestorage.app",

    messagingSenderId: "947776836293",

    appId: "1:947776836293:web:831b8c651bb67842c616ac"

};

/* ==========================================================
   INITIALIZE
========================================================== */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);

/* ==========================================================
   EXPORT
========================================================== */

export {
    app,
    auth,
    db,
    storage,
    serverTimestamp
};
