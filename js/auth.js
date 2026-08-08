/* ==========================================================
   SR AUTO FINANCE ERP
   Authentication Module
   Developed By : VTOOS Software Solutions
========================================================== */

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    showLoader,
    hideLoader,
    showMessage,
    clearMessage
} from "./common.js";

import {
    isValidEmail,
    isValidPassword
} from "./validators.js";

/* ==========================================================
   DOM ELEMENTS
========================================================== */

const loginForm = document.getElementById("loginForm");

const email = document.getElementById("username");

const password = document.getElementById("password");

const rememberMe = document.getElementById("rememberMe");

const togglePassword = document.getElementById("togglePassword");

/* ==========================================================
   STORAGE KEY
========================================================== */

const STORAGE_KEY = "sr_auto_finance_email";

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeLogin();

});

/* ==========================================================
   INITIALIZE LOGIN
========================================================== */

function initializeLogin() {

    clearMessage();

    loadRememberedUser();

    setupPasswordToggle();

    setupLoginForm();

    checkExistingSession();

}
/* ==========================================================
   PASSWORD TOGGLE
========================================================== */

function setupPasswordToggle() {

    if (!togglePassword) return;

    togglePassword.addEventListener("click", () => {

        const isHidden = password.type === "password";

        password.type = isHidden ? "text" : "password";

        togglePassword.innerHTML = `
            <span class="material-symbols-rounded">
                ${isHidden ? "visibility_off" : "visibility"}
            </span>
        `;

    });

}

/* ==========================================================
   REMEMBER USER
========================================================== */

function loadRememberedUser() {

    const savedEmail = localStorage.getItem(STORAGE_KEY);

    if (!savedEmail) return;

    email.value = savedEmail;

    if (rememberMe) {

        rememberMe.checked = true;

    }

}

function saveRememberedUser() {

    if (!rememberMe) return;

    if (rememberMe.checked) {

        localStorage.setItem(

            STORAGE_KEY,

            email.value.trim()

        );

    } else {

        localStorage.removeItem(STORAGE_KEY);

    }

}

/* ==========================================================
   LOGIN FORM
========================================================== */

function setupLoginForm() {

    if (!loginForm) return;

    loginForm.addEventListener("submit", loginUser);

}

/* ==========================================================
   EXISTING SESSION
========================================================== */

function checkExistingSession() {

    onAuthStateChanged(auth, async (user) => {

        if (!user) return;

        try {

            const userRef = doc(db, "users", "owner");

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {

                await signOut(auth);

                return;

            }

            const userData = userSnap.data();

            if (user.uid === userData.uid) {

                window.location.href = "dashboard.html";

            }

        } catch (error) {

            console.error(error);

        }

    });

}
/* ==========================================================
   LOGIN USER
========================================================== */

async function loginUser(event) {

    event.preventDefault();

    clearMessage();

    const userEmail = email.value.trim();

    const userPassword = password.value.trim();

    if (!isValidEmail(userEmail)) {

        showMessage("Please enter a valid email address.", "error");

        email.focus();

        return;

    }

    if (!isValidPassword(userPassword)) {

        showMessage("Password must contain at least 6 characters.", "error");

        password.focus();

        return;

    }

    showLoader();

    try {

        const credential = await signInWithEmailAndPassword(

            auth,

            userEmail,

            userPassword

        );

        const firebaseUser = credential.user;

        const userRef = doc(db, "users", "owner");

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            throw new Error("User profile not found.");

        }

        const userData = userSnap.data();

        if (firebaseUser.uid !== userData.uid) {

            await signOut(auth);

            throw new Error("Unauthorized login.");

        }

        if (!userData.active) {

            await signOut(auth);

            throw new Error("User account is inactive.");

        }

        saveRememberedUser();

        hideLoader();

        showMessage(

            "Login Successful. Redirecting...",

            "success"

        );

        setTimeout(() => {

            window.location.href = "dashboard.html";

        }, 1000);

    }

    catch (error) {

        hideLoader();

        console.error(error);

        switch (error.code) {

            case "auth/invalid-credential":

                showMessage(

                    "Invalid email or password.",

                    "error"

                );

                break;

            case "auth/too-many-requests":

                showMessage(

                    "Too many attempts. Please try again later.",

                    "error"

                );

                break;

            case "auth/network-request-failed":

                showMessage(

                    "Network error. Check your internet connection.",

                    "error"

                );

                break;

            default:

                showMessage(

                    error.message,

                    "error"

                );

        }

    }

}
/* ==========================================================
   LOGOUT
========================================================== */

export async function logout() {

    try {

        await signOut(auth);

        localStorage.removeItem(STORAGE_KEY);

        sessionStorage.clear();

        window.location.href = "login.html";

    }

    catch (error) {

        console.error("Logout Error :", error);

    }

}

/* ==========================================================
   CURRENT USER
========================================================== */

export function getCurrentUser() {

    return auth.currentUser;

}

/* ==========================================================
   LOGIN SUCCESS
========================================================== */

export function isLoggedIn() {

    return auth.currentUser !== null;

}

/* ==========================================================
   ROLE CHECK
========================================================== */

export async function getCurrentUserProfile() {

    if (!auth.currentUser) {

        return null;

    }

    try {

        const userRef = doc(

            db,

            "users",

            "owner"

        );

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            return null;

        }

        return userSnap.data();

    }

    catch(error){

        console.error(error);

        return null;

    }

}

/* ==========================================================
   END OF AUTH MODULE
========================================================== */
