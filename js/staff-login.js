// ============================================================
// SR AUTO FINANCE ERP
// STAFF LOGIN
// File: js/staff-login.js
// ============================================================

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// CONSTANTS
// ============================================================

const STAFF_SESSION_KEY = "srStaffSession";
const STAFF_UID_KEY = "srStaffUid";

const STAFF_DASHBOARD = "staff-dashboard.html";
const COMMON_LOGIN = "login.html";


// ============================================================
// ELEMENT HELPER
// ============================================================

function getElement(...ids) {

    for (const id of ids) {

        const element =
            document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}


// ============================================================
// LOGIN ELEMENTS
// ============================================================

const loginForm =
    getElement(
        "staffLoginForm",
        "loginForm"
    );

const emailInput =
    getElement(
        "email",
        "staffEmail",
        "loginEmail",
        "username",
        "loginIdentifier"
    );

const passwordInput =
    getElement(
        "password",
        "staffPassword",
        "loginPassword"
    );

const loginButton =
    getElement(
        "loginBtn",
        "staffLoginBtn",
        "loginButton"
    );

const messageBox =
    getElement(
        "message",
        "loginMessage",
        "errorMessage"
    );


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    message,
    type = "error"
) {

    if (!messageBox) {

        alert(message);

        return;
    }

    messageBox.textContent =
        message;

    messageBox.className =
        `message ${type}`;
}


// ============================================================
// CLEAR MESSAGE
// ============================================================

function clearMessage() {

    if (!messageBox) {
        return;
    }

    messageBox.textContent = "";

    messageBox.className =
        "message";
}


// ============================================================
// GET EXISTING STAFF SESSION
// ============================================================

function getStaffSession() {

    const raw =
        sessionStorage.getItem(
            STAFF_SESSION_KEY
        );

    if (!raw) {
        return null;
    }

    try {

        const session =
            JSON.parse(raw);

        if (
            !session ||
            session.role !== "staff"
        ) {

            sessionStorage.removeItem(
                STAFF_SESSION_KEY
            );

            sessionStorage.removeItem(
                STAFF_UID_KEY
            );

            return null;
        }

        return session;

    } catch (error) {

        console.warn(
            "Invalid staff session. Clearing it.",
            error
        );

        sessionStorage.removeItem(
            STAFF_SESSION_KEY
        );

        sessionStorage.removeItem(
            STAFF_UID_KEY
        );

        return null;
    }
}


// ============================================================
// CLEAR STAFF SESSION
// ============================================================

function clearStaffSession() {

    sessionStorage.removeItem(
        STAFF_SESSION_KEY
    );

    sessionStorage.removeItem(
        STAFF_UID_KEY
    );
}


// ============================================================
// FIND STAFF BY EMAIL
// ============================================================

async function findStaffByEmail(email) {

    try {

        const staffRef =
            collection(
                db,
                "staff"
            );

        const q =
            query(
                staffRef,

                where(
                    "email",
                    "==",
                    email
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
            id: staffDoc.id,
            ...staffDoc.data()
        };

    } catch (error) {

        console.warn(
            "Staff Firestore lookup failed:",
            error
        );

        /*
         * Authentication itself does not depend
         * on Firestore staff document.
         *
         * We return null so Firebase login
         * can continue.
         */

        return null;
    }
}


// ============================================================
// STAFF ACTIVE CHECK
// ============================================================

function isStaffActive(staff) {

    if (!staff) {

        /*
         * If staff document is unavailable,
         * do not block Firebase authentication.
         */

        return true;
    }

    const status =
        String(
            staff.status ||
            "active"
        )
            .trim()
            .toLowerCase();

    if (
        status === "inactive" ||
        status === "disabled" ||
        status === "blocked" ||
        status === "deleted"
    ) {

        return false;
    }

    if (
        staff.active === false
    ) {

        return false;
    }

    return true;
}


// ============================================================
// SAVE STAFF SESSION
// ============================================================

function saveStaffSession(
    firebaseUser,
    staff
) {

    const session = {

        uid:
            firebaseUser.uid,

        staffDocumentId:
            staff?.id || "",

        staffId:
            staff?.staffId ||
            staff?.staffCode ||
            staff?.employeeId ||
            firebaseUser.uid,

        name:
            staff?.name ||
            staff?.staffName ||
            staff?.fullName ||
            firebaseUser.displayName ||
            "",

        email:
            firebaseUser.email ||
            staff?.email ||
            "",

        role:
            "staff",

        loginTime:
            new Date().toISOString()
    };


    sessionStorage.setItem(
        STAFF_SESSION_KEY,
        JSON.stringify(session)
    );


    sessionStorage.setItem(
        STAFF_UID_KEY,
        firebaseUser.uid
    );
}


// ============================================================
// LOGIN PAGE CACHE / HISTORY PROTECTION
// ============================================================

function protectLoginPageHistory() {

    try {

        /*
         * Replace current login history entry.
         * This reduces accidental return to the
         * previous Owner page through browser history.
         */

        window.history.replaceState(
            {
                staffLoginPage: true
            },
            "",
            window.location.href
        );


        window.history.pushState(
            {
                staffLoginPage: true
            },
            "",
            window.location.href
        );


        window.addEventListener(
            "popstate",
            function () {

                /*
                 * Keep the user on the login page
                 * instead of allowing a direct history
                 * jump into the previous application page.
                 */

                window.history.pushState(
                    {
                        staffLoginPage: true
                    },
                    "",
                    window.location.href
                );

            }
        );

    } catch (error) {

        console.warn(
            "Login history protection skipped:",
            error
        );
    }
}


// ============================================================
// PAGE CACHE PROTECTION
// ============================================================

function protectLoginPageCache() {

    window.addEventListener(
        "pageshow",
        function(event) {

            if (
                event.persisted
            ) {

                window.location.reload();
            }

        }
    );
}


// ============================================================
// ALREADY LOGGED-IN STAFF CHECK
// ============================================================

function handleExistingStaffSession() {

    const session =
        getStaffSession();

    if (!session) {
        return;
    }


    /*
     * If a valid staff session already exists,
     * do not show the login form again.
     */

    if (
        session.role === "staff" &&
        session.uid
    ) {

        console.log(
            "Existing staff session found. Opening dashboard."
        );

        window.location.replace(
            STAFF_DASHBOARD
        );
    }
}


// ============================================================
// LOGIN
// ============================================================

async function loginStaff() {

    clearMessage();


    // --------------------------------------------------------
    // CHECK ELEMENTS
    // --------------------------------------------------------

    if (!emailInput) {

        console.error(
            "Email input not found."
        );

        showMessage(
            "Login email field not found. Please check staff-login.html."
        );

        return;
    }


    if (!passwordInput) {

        console.error(
            "Password input not found."
        );

        showMessage(
            "Password field not found. Please check staff-login.html."
        );

        return;
    }


    // --------------------------------------------------------
    // READ VALUES
    // --------------------------------------------------------

    const email =
        String(
            emailInput.value || ""
        )
            .trim()
            .toLowerCase();

    const password =
        String(
            passwordInput.value || ""
        );


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!email) {

        showMessage(
            "Please enter your email."
        );

        emailInput.focus();

        return;
    }


    if (!email.includes("@")) {

        showMessage(
            "Please enter a valid email address."
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


    // --------------------------------------------------------
    // BUTTON
    // --------------------------------------------------------

    if (loginButton) {

        loginButton.disabled =
            true;

        loginButton.textContent =
            "Logging in...";
    }


    try {

        // ====================================================
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


        console.log(
            "Firebase staff login successful:",
            firebaseUser.uid
        );


        // ====================================================
        // STAFF DOCUMENT
        // ====================================================

        let staff = null;


        try {

            staff =
                await findStaffByEmail(
                    email
                );

        } catch (error) {

            console.warn(
                "Staff document lookup failed:",
                error
            );

            staff = null;
        }


        // ====================================================
        // ACTIVE CHECK
        // ====================================================

        if (
            staff &&
            !isStaffActive(staff)
        ) {

            await signOut(
                auth
            );

            clearStaffSession();

            showMessage(
                "Your staff account is inactive. Please contact administrator."
            );

            return;
        }


        // ====================================================
        // SAVE STAFF SESSION
        // ====================================================

        saveStaffSession(
            firebaseUser,
            staff
        );


        // ====================================================
        // SUCCESS
        // ====================================================

        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );


        // ====================================================
        // DASHBOARD REDIRECT
        // ====================================================

        setTimeout(
            () => {

                window.location.replace(
                    STAFF_DASHBOARD
                );

            },
            400
        );


    } catch (error) {

        console.error(
            "Staff login error:",
            error
        );


        // ====================================================
        // FIREBASE ERROR HANDLING
        // ====================================================

        let message =
            "Unable to login.";


        switch (
            error.code
        ) {

            case "auth/invalid-credential":

                message =
                    "Invalid email or password.";

                break;


            case "auth/invalid-email":

                message =
                    "Invalid email address.";

                break;


            case "auth/user-not-found":

                message =
                    "This email is not registered.";

                break;


            case "auth/wrong-password":

                message =
                    "Incorrect password.";

                break;


            case "auth/user-disabled":

                message =
                    "This Firebase account is disabled.";

                break;


            case "auth/too-many-requests":

                message =
                    "Too many login attempts. Please try again later.";

                break;


            case "auth/network-request-failed":

                message =
                    "Network error. Please check your internet connection.";

                break;


            default:

                message =
                    error.message ||
                    "Login failed.";
        }


        showMessage(
            message
        );


    } finally {

        if (loginButton) {

            loginButton.disabled =
                false;

            loginButton.textContent =
                "Login";
        }
    }
}


// ============================================================
// LOGIN FORM
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


// ============================================================
// LOGIN BUTTON FALLBACK
// ============================================================

if (
    loginButton &&
    !loginForm
) {

    loginButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            loginStaff();

        }
    );
}


// ============================================================
// PASSWORD RESET MODAL
// ============================================================

function createPasswordResetModal() {

    const existing =
        document.getElementById(
            "srPasswordResetModal"
        );


    if (existing) {

        existing.style.display =
            "flex";

        const input =
            document.getElementById(
                "srResetEmail"
            );

        if (input) {
            input.focus();
        }

        return;
    }


    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "srPasswordResetModal";


    modal.innerHTML = `

        <div style="
            position:fixed;
            inset:0;
            background:rgba(15,23,42,.65);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:99999;
            padding:20px;
        ">

            <div style="
                width:min(420px,100%);
                background:#ffffff;
                border-radius:18px;
                padding:28px;
                box-shadow:0 20px 60px rgba(0,0,0,.25);
            ">

                <div style="
                    font-size:32px;
                    margin-bottom:10px;
                ">
                    🔐
                </div>

                <h2 style="
                    margin:0 0 8px;
                    color:#0f172a;
                ">
                    Create / Reset Password
                </h2>

                <p style="
                    margin:0 0 20px;
                    color:#64748b;
                    font-size:14px;
                    line-height:1.5;
                ">
                    Registered staff email use pannunga.
                </p>

                <label style="
                    display:block;
                    margin-bottom:7px;
                    font-weight:600;
                    font-size:14px;
                ">
                    Staff Email
                </label>

                <input
                    id="srResetEmail"
                    type="email"
                    placeholder="staff@gmail.com"
                    autocomplete="email"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        border:1px solid #cbd5e1;
                        border-radius:9px;
                        font-size:14px;
                        outline:none;
                    "
                >

                <div
                    id="srResetMessage"
                    style="
                        margin-top:10px;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:18px;
                ">

                    <button
                        id="srSendReset"
                        type="button"
                        style="
                            flex:1;
                            border:0;
                            border-radius:9px;
                            padding:12px;
                            background:#2563eb;
                            color:#fff;
                            font-weight:700;
                            cursor:pointer;
                        "
                    >
                        Send Password Link
                    </button>

                    <button
                        id="srCancelReset"
                        type="button"
                        style="
                            flex:1;
                            border:1px solid #cbd5e1;
                            border-radius:9px;
                            padding:12px;
                            background:#fff;
                            color:#334155;
                            font-weight:600;
                            cursor:pointer;
                        "
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    // ========================================================
    // MODAL ELEMENTS
    // ========================================================

    const resetEmail =
        document.getElementById(
            "srResetEmail"
        );

    const sendButton =
        document.getElementById(
            "srSendReset"
        );

    const cancelButton =
        document.getElementById(
            "srCancelReset"
        );

    const resetMessage =
        document.getElementById(
            "srResetMessage"
        );


    // ========================================================
    // CANCEL
    // ========================================================

    cancelButton.addEventListener(
        "click",
        function() {

            modal.remove();

        }
    );


    // ========================================================
    // SEND RESET EMAIL
    // ========================================================

    sendButton.addEventListener(
        "click",
        async function() {

            const email =
                String(
                    resetEmail.value || ""
                )
                    .trim()
                    .toLowerCase();


            resetMessage.textContent =
                "";


            if (!email) {

                resetMessage.textContent =
                    "Please enter your registered email.";

                resetMessage.style.color =
                    "#dc2626";

                resetEmail.focus();

                return;
            }


            if (!email.includes("@")) {

                resetMessage.textContent =
                    "Please enter a valid email.";

                resetMessage.style.color =
                    "#dc2626";

                resetEmail.focus();

                return;
            }


            sendButton.disabled =
                true;

            sendButton.textContent =
                "Sending...";


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                resetMessage.textContent =
                    "Password reset link sent. Please check your email.";

                resetMessage.style.color =
                    "#16a34a";


                sendButton.textContent =
                    "Link Sent";


            } catch (error) {

                console.error(
                    "Password reset error:",
                    error
                );


                let message =
                    "Unable to send reset email.";


                switch (
                    error.code
                ) {

                    case "auth/user-not-found":

                        message =
                            "This email is not registered in Firebase Authentication.";

                        break;


                    case "auth/invalid-email":

                        message =
                            "Invalid email address.";

                        break;


                    case "auth/network-request-failed":

                        message =
                            "Network error. Please check internet connection.";

                        break;


                    case "auth/too-many-requests":

                        message =
                            "Too many requests. Please try again later.";

                        break;


                    default:

                        message =
                            error.message ||
                            "Unable to send reset email.";
                }


                resetMessage.textContent =
                    message;

                resetMessage.style.color =
                    "#dc2626";


                sendButton.textContent =
                    "Send Password Link";
            }


            sendButton.disabled =
                false;

        }
    );


    // ========================================================
    // ENTER KEY
    // ========================================================

    resetEmail.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                sendButton.click();
            }

        }
    );


    // ========================================================
    // FOCUS
    // ========================================================

    setTimeout(
        () => {

            resetEmail.focus();

        },
        100
    );
}


// ============================================================
// OPEN PASSWORD RESET
// ============================================================

function openPasswordReset() {

    createPasswordResetModal();
}


// ============================================================
// BIND PASSWORD RESET LINKS
// ============================================================

function bindPasswordResetLinks() {

    const elements =
        document.querySelectorAll(
            "a, button"
        );


    elements.forEach(
        function(element) {

            const text =
                String(
                    element.textContent ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const isPasswordLink =
                text.includes(
                    "create password"
                ) ||
                text.includes(
                    "forgot password"
                ) ||
                text.includes(
                    "reset password"
                );


            if (
                !isPasswordLink
            ) {

                return;
            }


            if (
                element.dataset
                    .srResetBound ===
                "true"
            ) {

                return;
            }


            element.dataset
                .srResetBound =
                "true";


            element.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    openPasswordReset();

                }
            );

        }
    );


    // ========================================================
    // SUPPORT COMMON IDS
    // ========================================================

    const possibleIds = [

        "createPasswordBtn",

        "createPasswordLink",

        "forgotPasswordBtn",

        "forgotPasswordLink",

        "resetPasswordBtn",

        "resetPasswordLink"

    ];


    possibleIds.forEach(
        function(id) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return;
            }


            if (
                element.dataset
                    .srResetBound ===
                "true"
            ) {

                return;
            }


            element.dataset
                .srResetBound =
                "true";


            element.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    openPasswordReset();

                }
            );

        }
    );
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

function initializeStaffLoginPage() {

    /*
     * Protect login page from browser cache/history issues.
     */

    protectLoginPageHistory();

    protectLoginPageCache();


    /*
     * Bind password buttons.
     */

    bindPasswordResetLinks();


    /*
     * Check if an old staff session exists.
     */

    const existingSession =
        getStaffSession();


    if (
        existingSession &&
        existingSession.role === "staff"
    ) {

        /*
         * Dashboard will perform the final Firebase
         * authentication/session validation.
         */

        window.location.replace(
            STAFF_DASHBOARD
        );

        return;
    }


    console.log(
        "SR Auto Finance Staff Login initialized."
    );
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    function(user) {

        /*
         * IMPORTANT:
         *
         * If Firebase user exists but there is NO valid
         * staff session, do not automatically treat the
         * user as staff.
         *
         * This prevents Owner authentication from being
         * reused as Staff authentication.
         */

        const session =
            getStaffSession();


        if (
            user &&
            session &&
            session.role === "staff" &&
            session.uid === user.uid
        ) {

            /*
             * Staff already logged in.
             */

            window.location.replace(
                STAFF_DASHBOARD
            );

            return;
        }


        /*
         * If Firebase has another user logged in
         * but this is the Staff Login page, leave the
         * login form usable.
         *
         * The next successful Staff login will replace
         * the Firebase user.
         */

        if (
            user &&
            (
                !session ||
                session.role !== "staff" ||
                session.uid !== user.uid
            )
        ) {

            console.log(
                "Different Firebase user detected. Staff login remains available."
            );
        }

    }
);


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            initializeStaffLoginPage();

        }
    );

} else {

    initializeStaffLoginPage();

}
