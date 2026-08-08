// =====================================================
// SR AUTO FINANCE ERP
// Login Controller
// File: js/login.js
// =====================================================

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// -----------------------------------------------------
// Elements
// -----------------------------------------------------

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");


// -----------------------------------------------------
// Show Message
// -----------------------------------------------------

function showMessage(text, type = "error") {

    message.textContent = text;
    message.className = `message ${type}`;

}


// -----------------------------------------------------
// Login
// -----------------------------------------------------

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;


    if (!username || !password) {

        showMessage(
            "Please enter username/email and password."
        );

        return;
    }


    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";


    try {

        // -------------------------------------------------
        // Firebase Authentication
        // -------------------------------------------------

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                username,
                password
            );


        const user = userCredential.user;


        // -------------------------------------------------
        // Get User Profile
        // users/{uid}
        // -------------------------------------------------

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            await auth.signOut();

            showMessage(
                "User profile not found. Please contact administrator."
            );

            return;
        }


        const userData =
            userSnap.data();


        // -------------------------------------------------
        // Account Status Check
        // -------------------------------------------------

        const isActive =
            userData.active === true;

        const isStatusActive =
            String(userData.status || "")
                .toLowerCase() === "active";


        if (!isActive || !isStatusActive) {

            await auth.signOut();

            showMessage(
                "Your account is inactive. Please contact administrator."
            );

            return;
        }


        // -------------------------------------------------
        // Role
        // -------------------------------------------------

        const role =
            String(userData.role || "")
                .toLowerCase();


        // -------------------------------------------------
        // Save basic session information
        // -------------------------------------------------

        sessionStorage.setItem(
            "srUserRole",
            role
        );

        sessionStorage.setItem(
            "srUserUid",
            user.uid
        );

        sessionStorage.setItem(
            "srUserName",
            userData.name || ""
        );


        // -------------------------------------------------
        // Redirect
        // -------------------------------------------------

        showMessage(
            "Login successful. Redirecting...",
            "success"
        );


        setTimeout(function () {

            if (role === "owner") {

                window.location.href =
                    "dashboard.html";

            } else if (role === "staff") {

                window.location.href =
                    "dashboard.html";

            } else {

                auth.signOut();

                showMessage(
                    "Invalid user role. Please contact administrator."
                );

            }

        }, 700);


    } catch (error) {

        console.error(
            "Login Error:",
            error
        );


        let errorMessage =
            "Login failed. Please try again.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            errorMessage =
                "Invalid email or password.";

        } else if (
            error.code ===
            "auth/user-not-found"
        ) {

            errorMessage =
                "User account not found.";

        } else if (
            error.code ===
            "auth/wrong-password"
        ) {

            errorMessage =
                "Incorrect password.";

        } else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            errorMessage =
                "Too many attempts. Please try again later.";

        } else if (
            error.code ===
            "auth/network-request-failed"
        ) {

            errorMessage =
                "Network error. Please check your internet connection.";

        }


        showMessage(
            errorMessage
        );


    } finally {

        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";

    }

});
