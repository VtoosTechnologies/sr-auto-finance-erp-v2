// ============================================================
// SR AUTO FINANCE ERP
// STAFF LOGIN
// File: js/staff-login.js
// ============================================================

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const loginForm =
    document.getElementById("staffLoginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginBtn =
    document.getElementById("loginBtn");

const messageElement =
    document.getElementById("message");


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    text,
    type = "error"
) {

    if (!messageElement) {
        return;
    }

    messageElement.textContent =
        text;

    messageElement.className =
        `message ${type}`;
}


function clearMessage() {

    if (!messageElement) {
        return;
    }

    messageElement.textContent =
        "";

    messageElement.className =
        "message";
}


// ============================================================
// FIND STAFF AFTER AUTH
// ============================================================

async function findStaffByAuthUid(
    uid
) {

    const staffRef =
        collection(
            db,
            "staff"
        );


    const q =
        query(
            staffRef,
            where(
                "authUid",
                "==",
                uid
            ),
            limit(1)
        );


    const snapshot =
        await getDocs(q);


    if (
        snapshot.empty
    ) {

        return null;
    }


    const staffDoc =
        snapshot.docs[0];


    return {

        id:
            staffDoc.id,

        ...staffDoc.data()

    };
}


// ============================================================
// STAFF STATUS
// ============================================================

function isStaffActive(
    staff
) {

    const status =
        String(
            staff?.status ||
            "active"
        ).toLowerCase();


    return ![
        "inactive",
        "disabled",
        "blocked",
        "deleted"
    ].includes(
        status
    );
}


// ============================================================
// SAVE STAFF SESSION
// ============================================================

function saveStaffSession(
    staff,
    firebaseUser
) {

    const session = {

        staffDocumentId:
            staff.id,

        staffId:
            staff.staffId ||
            staff.staffCode ||
            staff.employeeId ||
            staff.id,

        staffName:
            staff.name ||
            staff.staffName ||
            staff.fullName ||
            "",

        email:
            firebaseUser.email ||
            staff.email ||
            "",

        mobile:
            staff.mobile ||
            "",

        designation:
            staff.role ||
            "",

        role:
            "staff",

        uid:
            firebaseUser.uid,

        loginTime:
            new Date().toISOString()

    };


    sessionStorage.setItem(
        "srStaffSession",
        JSON.stringify(
            session
        )
    );


    sessionStorage.setItem(
        "srStaffUid",
        firebaseUser.uid
    );
}


// ============================================================
// LOGIN
// ============================================================

async function loginStaff() {

    clearMessage();


    const email =
        emailInput.value
            .trim()
            .toLowerCase();


    const password =
        passwordInput.value;


    if (!email) {

        showMessage(
            "Please enter your email address."
        );

        emailInput.focus();

        return;
    }


    if (!password) {

        showMessage(
            "Please enter your password."
        );

        passwordInput.focus();

        return;
    }


    loginBtn.disabled =
        true;

    loginBtn.textContent =
        "Logging in...";


    try {

        // ====================================================
        // STEP 1
        // FIREBASE AUTHENTICATION
        // ====================================================

        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const firebaseUser =
            credential.user;


        // ====================================================
        // STEP 2
        // FIND STAFF USING AUTH UID
        // ====================================================

        const staff =
            await findStaffByAuthUid(
                firebaseUser.uid
            );


        if (!staff) {

            await signOut(
                auth
            );


            showMessage(
                "Staff profile is not linked with this login. Please contact owner."
            );

            return;
        }


        // ====================================================
        // STEP 3
        // STATUS
        // ====================================================

        if (
            !isStaffActive(
                staff
            )
        ) {

            await signOut(
                auth
            );


            showMessage(
                "This staff account is inactive."
            );

            return;
        }


        // ====================================================
        // STEP 4
        // SAVE SESSION
        // ====================================================

        saveStaffSession(
            staff,
            firebaseUser
        );


        // ====================================================
        // STEP 5
        // SUCCESS
        // ====================================================

        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );


        setTimeout(
            function() {

                window.location.href =
                    "staff-dashboard.html";

            },
            600
        );


    } catch (
        error
    ) {

        console.error(
            "Staff login error:",
            error
        );


        let errorMessage =
            "Unable to login. Please try again.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            errorMessage =
                "Invalid email or password.";

        }

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            errorMessage =
                "Please enter a valid email address.";

        }

        else if (
            error.code ===
            "auth/user-disabled"
        ) {

            errorMessage =
                "This login account has been disabled.";

        }

        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            errorMessage =
                "Too many login attempts. Please try again later.";

        }

        else if (
            error.code ===
            "permission-denied" ||
            error.code ===
            "firestore/permission-denied"
        ) {

            errorMessage =
                "Staff profile permission denied. Please check Firebase Rules.";

        }


        showMessage(
            errorMessage
        );


    } finally {

        loginBtn.disabled =
            false;

        loginBtn.textContent =
            "Login";

    }
}


// ============================================================
// FORM SUBMIT
// ============================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            loginStaff();

        }
    );

}
