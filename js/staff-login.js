// ============================================================
// SR AUTO FINANCE ERP
// STAFF LOGIN
// File: js/staff-login.js
// ============================================================

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
    collection,
    doc,
    getDocs,
    query,
    where,
    limit,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const loginForm =
    document.getElementById(
        "staffLoginForm"
    );


const emailInput =
    document.getElementById(
        "email"
    );


const passwordInput =
    document.getElementById(
        "password"
    );


const loginBtn =
    document.getElementById(
        "loginBtn"
    );


const createPasswordBtn =
    document.getElementById(
        "createPasswordBtn"
    );


const forgotPasswordBtn =
    document.getElementById(
        "forgotPasswordBtn"
    );


const messageElement =
    document.getElementById(
        "message"
    );


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    text,
    type = "error"
) {

    if (
        !messageElement
    ) {

        return;

    }


    messageElement.textContent =
        text;


    messageElement.className =
        `message ${type}`;

}


function clearMessage() {

    if (
        !messageElement
    ) {

        return;

    }


    messageElement.textContent =
        "";


    messageElement.className =
        "message";

}


// ============================================================
// NORMALIZE EMAIL
// ============================================================

function normalizeEmail(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}


// ============================================================
// VALIDATE EMAIL
// ============================================================

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            email
        );

}


// ============================================================
// FIND STAFF BY EMAIL
// ============================================================

async function findStaffByEmail(
    email
) {

    const staffRef =
        collection(
            db,
            "staff"
        );


    const snapshot =
        await getDocs(
            query(
                staffRef,

                where(
                    "email",
                    "==",
                    email
                ),

                limit(1)
            )
        );


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
// STAFF ACTIVE CHECK
// ============================================================

function isStaffActive(
    staff
) {

    const status =
        String(
            staff?.status ||
            "active"
        )
            .trim()
            .toLowerCase();


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
            staff.email ||
            firebaseUser?.email ||
            "",

        role:
            "staff",

        authUid:
            firebaseUser?.uid ||
            staff.authUid ||
            "",

        loginTime:
            new Date().toISOString()

    };


    sessionStorage.setItem(
        "srStaffSession",
        JSON.stringify(
            session
        )
    );


    if (
        firebaseUser?.uid
    ) {

        sessionStorage.setItem(
            "srStaffUid",
            firebaseUser.uid
        );

    }

}


// ============================================================
// LOGIN BUTTON STATE
// ============================================================

function setLoginLoading(
    loading
) {

    if (
        !loginBtn
    ) {

        return;

    }


    loginBtn.disabled =
        loading;


    loginBtn.textContent =
        loading
            ? "Checking..."
            : "Login";

}


// ============================================================
// LOGIN
// ============================================================

async function loginStaff() {

    clearMessage();


    const email =
        normalizeEmail(
            emailInput?.value
        );


    const password =
        passwordInput?.value ||
        "";


    if (
        !email
    ) {

        showMessage(
            "Please enter your email."
        );


        emailInput?.focus();


        return;

    }


    if (
        !isValidEmail(
            email
        )
    ) {

        showMessage(
            "Please enter a valid email address."
        );


        emailInput?.focus();


        return;

    }


    if (
        !password
    ) {

        showMessage(
            "Please enter your password."
        );


        passwordInput?.focus();


        return;

    }


    setLoginLoading(
        true
    );


    try {

        // ====================================================
        // STEP 1
        // FIND STAFF
        // ====================================================

        const staff =
            await findStaffByEmail(
                email
            );


        if (
            !staff
        ) {

            showMessage(
                "This email is not registered as a staff account."
            );


            return;

        }


        // ====================================================
        // STEP 2
        // ACTIVE CHECK
        // ====================================================

        if (
            !isStaffActive(
                staff
            )
        ) {

            showMessage(
                "Your staff account is inactive. Please contact the owner."
            );


            return;

        }


        // ====================================================
        // STEP 3
        // FIREBASE LOGIN
        // ====================================================

        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        // ====================================================
        // STEP 4
        // AUTH UID CHECK
        // ====================================================

        if (
            staff.authUid &&
            staff.authUid !==
                credential.user.uid
        ) {

            await signOut(
                auth
            );


            showMessage(
                "This login account is not linked with this staff record."
            );


            return;

        }


        // ====================================================
        // STEP 5
        // LINK UID IF NOT ALREADY SAVED
        // ====================================================

        if (
            !staff.authUid
        ) {

            const staffRef =
                doc(
                    db,
                    "staff",
                    staff.id
                );


            await updateDoc(
                staffRef,
                {

                    authUid:
                        credential.user.uid,

                    authEmail:
                        email,

                    authLinkedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );

        }


        // ====================================================
        // STEP 6
        // SAVE SESSION
        // ====================================================

        saveStaffSession(
            staff,
            credential.user
        );


        // ====================================================
        // SUCCESS
        // ====================================================

        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "staff-dashboard.html";

            },
            500
        );


    } catch (
        error
    ) {

        console.error(
            "Staff login error:",
            error
        );


        let message =
            "Unable to login. Please try again.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Invalid email or password.";

        }

        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "No login account found for this email. Please use Create Password first.";

        }

        else if (
            error.code ===
            "auth/wrong-password"
        ) {

            message =
                "Incorrect password.";

        }

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }

        else if (
            error.code ===
            "auth/user-disabled"
        ) {

            message =
                "This login account has been disabled.";

        }

        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many login attempts. Please try again later.";

        }


        showMessage(
            message
        );

    } finally {

        setLoginLoading(
            false
        );

    }

}


// ============================================================
// CREATE PASSWORD
// ============================================================

async function createStaffPassword() {

    clearMessage();


    const email =
        normalizeEmail(
            emailInput?.value
        );


    if (
        !email
    ) {

        showMessage(
            "Please enter your staff email first."
        );


        emailInput?.focus();


        return;

    }


    if (
        !isValidEmail(
            email
        )
    ) {

        showMessage(
            "Please enter a valid email address."
        );


        emailInput?.focus();


        return;

    }


    const newPassword =
        prompt(
            "Create your staff password.\n\nMinimum 6 characters."
        );


    if (
        newPassword ===
        null
    ) {

        return;

    }


    if (
        newPassword.length <
        6
    ) {

        showMessage(
            "Password must contain at least 6 characters."
        );


        return;

    }


    const confirmPassword =
        prompt(
            "Confirm your password."
        );


    if (
        confirmPassword ===
        null
    ) {

        return;

    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showMessage(
            "Passwords do not match."
        );


        return;

    }


    if (
        createPasswordBtn
    ) {

        createPasswordBtn.disabled =
            true;

    }


    try {

        // ====================================================
        // STEP 1
        // FIND STAFF
        // ====================================================

        const staff =
            await findStaffByEmail(
                email
            );


        if (
            !staff
        ) {

            showMessage(
                "This email is not registered in Staff Management."
            );


            return;

        }


        // ====================================================
        // STEP 2
        // ACTIVE CHECK
        // ====================================================

        if (
            !isStaffActive(
                staff
            )
        ) {

            showMessage(
                "This staff account is inactive. Please contact the owner."
            );


            return;

        }


        // ====================================================
        // STEP 3
        // CHECK EXISTING AUTH LINK
        // ====================================================

        if (
            staff.authUid
        ) {

            showMessage(
                "Password is already configured. Please use normal Login."
            );


            return;

        }


        // ====================================================
        // STEP 4
        // CREATE FIREBASE ACCOUNT
        // ====================================================

        const credential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                newPassword
            );


        // ====================================================
        // STEP 5
        // LINK AUTH UID
        // ====================================================

        const staffRef =
            doc(
                db,
                "staff",
                staff.id
            );


        await updateDoc(
            staffRef,
            {

                authUid:
                    credential.user.uid,

                authEmail:
                    email,

                authLinkedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        // ====================================================
        // STEP 6
        // SAVE SESSION
        // ====================================================

        saveStaffSession(
            staff,
            credential.user
        );


        showMessage(
            "Password created successfully. Opening dashboard...",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "staff-dashboard.html";

            },
            700
        );


    } catch (
        error
    ) {

        console.error(
            "Create password error:",
            error
        );


        let message =
            "Unable to create password.";


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            message =
                "This email already has a login account. Please use Forgot Password or Login.";

        }

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }

        else if (
            error.code ===
            "auth/weak-password"
        ) {

            message =
                "Password is too weak. Please use at least 6 characters.";

        }

        else if (
            error.code ===
            "auth/operation-not-allowed"
        ) {

            message =
                "Email/password login is not enabled in Firebase Authentication.";

        }


        showMessage(
            message
        );

    } finally {

        if (
            createPasswordBtn
        ) {

            createPasswordBtn.disabled =
                false;

        }

    }

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

async function forgotPassword() {

    clearMessage();


    const email =
        normalizeEmail(
            emailInput?.value
        );


    if (
        !email
    ) {

        showMessage(
            "Please enter your email first."
        );


        emailInput?.focus();


        return;

    }


    if (
        !isValidEmail(
            email
        )
    ) {

        showMessage(
            "Please enter a valid email address."
        );


        return;

    }


    if (
        forgotPasswordBtn
    ) {

        forgotPasswordBtn.disabled =
            true;

    }


    try {

        // ====================================================
        // CHECK STAFF RECORD FIRST
        // ====================================================

        const staff =
            await findStaffByEmail(
                email
            );


        if (
            !staff
        ) {

            showMessage(
                "This email is not registered as a staff account."
            );


            return;

        }


        if (
            !isStaffActive(
                staff
            )
        ) {

            showMessage(
                "This staff account is inactive. Please contact the owner."
            );


            return;

        }


        // ====================================================
        // SEND RESET EMAIL
        // ====================================================

        await sendPasswordResetEmail(
            auth,
            email
        );


        showMessage(
            "Password reset link has been sent to your email.",
            "success"
        );


    } catch (
        error
    ) {

        console.error(
            "Forgot password error:",
            error
        );


        let message =
            "Unable to send password reset email.";


        if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "No login account exists for this email. Please use Create Password first.";

        }

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }


        showMessage(
            message
        );

    } finally {

        if (
            forgotPasswordBtn
        ) {

            forgotPasswordBtn.disabled =
                false;

        }

    }

}


// ============================================================
// FORM SUBMIT
// ============================================================

if (
    loginForm
) {

    loginForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            loginStaff();

        }
    );

}


// ============================================================
// CREATE PASSWORD BUTTON
// ============================================================

if (
    createPasswordBtn
) {

    createPasswordBtn.addEventListener(
        "click",
        function() {

            createStaffPassword();

        }
    );

}


// ============================================================
// FORGOT PASSWORD BUTTON
// ============================================================

if (
    forgotPasswordBtn
) {

    forgotPasswordBtn.addEventListener(
        "click",
        function() {

            forgotPassword();

        }
    );

}


// ============================================================
// ENTER KEY SUPPORT
// ============================================================

if (
    emailInput
) {

    emailInput.addEventListener(
        "input",
        function() {

            clearMessage();

        }
    );

}


if (
    passwordInput
) {

    passwordInput.addEventListener(
        "input",
        function() {

            clearMessage();

        }
    );

}


// ============================================================
// EXISTING STAFF SESSION
// ============================================================

const existingSession =
    sessionStorage.getItem(
        "srStaffSession"
    );


if (
    existingSession
) {

    try {

        const session =
            JSON.parse(
                existingSession
            );


        if (
            session?.role ===
            "staff"
        ) {

            console.log(
                "Existing staff session:",
                session
            );

        }

    } catch {

        sessionStorage.removeItem(
            "srStaffSession"
        );

    }

}
