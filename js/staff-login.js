// ============================================================
// SR AUTO FINANCE ERP
// STAFF LOGIN
// File: js/staff-login.js
// ============================================================

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where,
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
    document.getElementById(
        "staffLoginForm"
    );

const staffIdInput =
    document.getElementById(
        "staffId"
    );

const passwordInput =
    document.getElementById(
        "password"
    );

const loginBtn =
    document.getElementById(
        "loginBtn"
    );

const messageElement =
    document.getElementById(
        "message"
    );


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    message,
    type = "error"
) {

    if (!messageElement) {
        return;
    }

    messageElement.textContent =
        message;

    messageElement.className =
        `message ${type}`;
}


// ============================================================
// CLEAR MESSAGE
// ============================================================

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
// FIND STAFF BY STAFF ID
// ============================================================

async function findStaff(
    staffId
) {

    const staffRef =
        collection(
            db,
            "staff"
        );

    const possibleFields = [
        "staffId",
        "staffCode",
        "employeeId"
    ];

    for (
        const field
        of possibleFields
    ) {

        try {

            const snapshot =
                await getDocs(
                    query(
                        staffRef,
                        where(
                            field,
                            "==",
                            staffId
                        ),
                        limit(1)
                    )
                );


            if (
                !snapshot.empty
            ) {

                const staffDoc =
                    snapshot.docs[0];

                return {
                    id:
                        staffDoc.id,

                    ...staffDoc.data()
                };
            }

        }
        catch (error) {

            console.warn(
                `Staff lookup failed for ${field}:`,
                error
            );
        }
    }

    return null;
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

    const possibleFields = [
        "email",
        "loginEmail"
    ];

    for (
        const field
        of possibleFields
    ) {

        try {

            const snapshot =
                await getDocs(
                    query(
                        staffRef,
                        where(
                            field,
                            "==",
                            email
                        ),
                        limit(1)
                    )
                );


            if (
                !snapshot.empty
            ) {

                const staffDoc =
                    snapshot.docs[0];

                return {
                    id:
                        staffDoc.id,

                    ...staffDoc.data()
                };
            }

        }
        catch (error) {

            console.warn(
                `Email lookup failed for ${field}:`,
                error
            );
        }
    }

    return null;
}


// ============================================================
// FIND STAFF FOR PASSWORD RESET
// ============================================================
// User can enter:
// 1. Staff ID
// 2. Staff Code
// 3. Employee ID
// 4. Email
// ============================================================

async function findStaffForPasswordReset(
    value
) {

    const input =
        String(
            value || ""
        ).trim();

    if (!input) {
        return null;
    }


    // --------------------------------------------------------
    // FIRST TRY STAFF ID
    // --------------------------------------------------------

    const staff =
        await findStaff(
            input
        );

    if (staff) {
        return staff;
    }


    // --------------------------------------------------------
    // THEN TRY EMAIL
    // --------------------------------------------------------

    if (
        input.includes("@")
    ) {

        const staffByEmail =
            await findStaffByEmail(
                input
            );

        if (staffByEmail) {
            return staffByEmail;
        }
    }


    return null;
}


// ============================================================
// CHECK STAFF STATUS
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
// GET STAFF LOGIN EMAIL
// ============================================================

function getStaffLoginEmail(
    staff
) {

    return String(
        staff?.email ||
        staff?.loginEmail ||
        ""
    ).trim();
}


// ============================================================
// SAVE STAFF SESSION
// ============================================================

function saveStaffSession(
    staff
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
            staff.loginEmail ||
            "",

        role:
            "staff",

        loginTime:
            new Date().toISOString()
    };


    sessionStorage.setItem(
        "srStaffSession",
        JSON.stringify(
            session
        )
    );
}


// ============================================================
// LOGIN
// ============================================================

async function loginStaff() {

    clearMessage();


    const staffId =
        staffIdInput.value
            .trim();


    const password =
        passwordInput.value;


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!staffId) {

        showMessage(
            "Please enter Staff ID."
        );

        staffIdInput.focus();

        return;
    }


    if (!password) {

        showMessage(
            "Please enter password."
        );

        passwordInput.focus();

        return;
    }


    loginBtn.disabled =
        true;

    loginBtn.textContent =
        "Checking...";


    try {

        // ====================================================
        // STEP 1
        // FIND STAFF
        // ====================================================

        const staff =
            await findStaff(
                staffId
            );


        if (!staff) {

            showMessage(
                "Staff ID not found."
            );

            return;
        }


        // ====================================================
        // STEP 2
        // CHECK STATUS
        // ====================================================

        if (
            !isStaffActive(
                staff
            )
        ) {

            showMessage(
                "This staff account is inactive."
            );

            return;
        }


        // ====================================================
        // STEP 3
        // GET LOGIN EMAIL
        // ====================================================

        const loginEmail =
            getStaffLoginEmail(
                staff
            );


        if (!loginEmail) {

            showMessage(
                "Staff login email is not configured. Please contact owner."
            );

            return;
        }


        // ====================================================
        // STEP 4
        // FIREBASE AUTH LOGIN
        // ====================================================

        const credential =
            await signInWithEmailAndPassword(
                auth,
                loginEmail,
                password
            );


        // ====================================================
        // STEP 5
        // SAVE SESSION
        // ====================================================

        saveStaffSession(
            staff
        );


        // ====================================================
        // SAVE FIREBASE UID
        // ====================================================

        sessionStorage.setItem(
            "srStaffUid",
            credential.user.uid
        );


        // ====================================================
        // SUCCESS
        // ====================================================

        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );


        // ====================================================
        // REDIRECT
        // ====================================================

        setTimeout(
            () => {

                window.location.href =
                    "staff-dashboard.html";

            },
            500
        );

    }
    catch (error) {

        console.error(
            "Staff login error:",
            error
        );


        let message =
            "Unable to login.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Invalid Staff ID or password.";
        }

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Staff login email is invalid.";
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
                "Too many attempts. Please try again later.";
        }

        else if (
            error.code ===
            "auth/network-request-failed"
        ) {

            message =
                "Network error. Please check your internet connection.";
        }


        showMessage(
            message
        );

    }
    finally {

        loginBtn.disabled =
            false;

        loginBtn.textContent =
            "Login";
    }
}


// ============================================================
// PASSWORD RESET MODAL
// ============================================================

function createPasswordResetModal() {

    // --------------------------------------------------------
    // Already created?
    // --------------------------------------------------------

    if (
        document.getElementById(
            "srPasswordResetModal"
        )
    ) {

        return;
    }


    // --------------------------------------------------------
    // MODAL HTML
    // --------------------------------------------------------

    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "srPasswordResetModal";


    modal.innerHTML = `

        <div class="sr-reset-overlay">

            <div class="sr-reset-card">

                <div class="sr-reset-icon">
                    🔐
                </div>

                <h2>
                    Create / Reset Password
                </h2>

                <p class="sr-reset-description">
                    Password create panna
                    registered Staff ID or Email
                    use pannunga.
                </p>


                <label>
                    Staff ID / Email
                </label>


                <input
                    type="text"
                    id="srResetStaffInput"
                    placeholder="Enter Staff ID or Email"
                    autocomplete="email"
                >


                <div
                    id="srResetMessage"
                    class="sr-reset-message"
                ></div>


                <button
                    type="button"
                    id="srSendResetBtn"
                    class="sr-send-reset-btn"
                >
                    Send Password Link
                </button>


                <button
                    type="button"
                    id="srCancelResetBtn"
                    class="sr-cancel-reset-btn"
                >
                    Cancel
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    // --------------------------------------------------------
    // MODAL CSS
    // --------------------------------------------------------

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "srPasswordResetStyle";


    style.textContent = `

        #srPasswordResetModal {
            position: fixed;
            inset: 0;
            z-index: 99999;
        }

        .sr-reset-overlay {
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.72);

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;
        }

        .sr-reset-card {
            width: min(430px, 100%);

            background: #ffffff;

            border-radius: 18px;

            padding: 28px;

            box-shadow:
                0 25px 70px
                rgba(0,0,0,0.30);

            font-family:
                Arial,
                Helvetica,
                sans-serif;
        }

        .sr-reset-icon {
            width: 54px;
            height: 54px;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #eef4ff;

            border-radius: 14px;

            font-size: 28px;

            margin-bottom: 14px;
        }

        .sr-reset-card h2 {
            margin: 0 0 8px;

            color: #0f172a;

            font-size: 24px;
        }

        .sr-reset-description {
            margin: 0 0 22px;

            color: #64748b;

            font-size: 14px;

            line-height: 1.5;
        }

        .sr-reset-card label {
            display: block;

            margin-bottom: 7px;

            color: #334155;

            font-size: 13px;

            font-weight: 700;
        }

        .sr-reset-card input {
            width: 100%;

            box-sizing: border-box;

            padding: 13px 14px;

            border:
                1px solid #cbd5e1;

            border-radius: 10px;

            font-size: 15px;

            outline: none;

            margin-bottom: 10px;
        }

        .sr-reset-card input:focus {
            border-color: #2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,0.10);
        }

        .sr-reset-message {
            min-height: 20px;

            margin: 4px 0 12px;

            font-size: 13px;

            line-height: 1.4;
        }

        .sr-reset-message.error {
            color: #dc2626;
        }

        .sr-reset-message.success {
            color: #15803d;
        }

        .sr-send-reset-btn {
            width: 100%;

            border: 0;

            border-radius: 10px;

            padding: 13px;

            background: #2563eb;

            color: #ffffff;

            font-size: 15px;

            font-weight: 700;

            cursor: pointer;
        }

        .sr-send-reset-btn:hover {
            background: #1d4ed8;
        }

        .sr-send-reset-btn:disabled {
            opacity: 0.65;

            cursor: not-allowed;
        }

        .sr-cancel-reset-btn {
            width: 100%;

            margin-top: 10px;

            padding: 12px;

            border:
                1px solid #cbd5e1;

            border-radius: 10px;

            background: #ffffff;

            color: #475569;

            font-size: 14px;

            cursor: pointer;
        }

        .sr-cancel-reset-btn:hover {
            background: #f8fafc;
        }

        @media (max-width: 480px) {

            .sr-reset-card {
                padding: 22px;
            }

            .sr-reset-card h2 {
                font-size: 21px;
            }
        }

    `;


    document.head.appendChild(
        style
    );


    // --------------------------------------------------------
    // ELEMENTS
    // --------------------------------------------------------

    const resetInput =
        document.getElementById(
            "srResetStaffInput"
        );


    const resetMessage =
        document.getElementById(
            "srResetMessage"
        );


    const sendBtn =
        document.getElementById(
            "srSendResetBtn"
        );


    const cancelBtn =
        document.getElementById(
            "srCancelResetBtn"
        );


    // --------------------------------------------------------
    // CLOSE MODAL
    // --------------------------------------------------------

    cancelBtn.addEventListener(
        "click",
        () => {

            modal.remove();

            const styleElement =
                document.getElementById(
                    "srPasswordResetStyle"
                );

            if (styleElement) {
                styleElement.remove();
            }
        }
    );


    // --------------------------------------------------------
    // SEND RESET LINK
    // --------------------------------------------------------

    sendBtn.addEventListener(
        "click",
        async () => {

            resetMessage.textContent =
                "";

            resetMessage.className =
                "sr-reset-message";


            const value =
                resetInput.value.trim();


            if (!value) {

                resetMessage.textContent =
                    "Staff ID / Email enter pannunga.";

                resetMessage.className =
                    "sr-reset-message error";

                resetInput.focus();

                return;
            }


            sendBtn.disabled =
                true;

            sendBtn.textContent =
                "Checking...";


            try {

                // ====================================================
                // FIND STAFF
                // ====================================================

                const staff =
                    await findStaffForPasswordReset(
                        value
                    );


                if (!staff) {

                    resetMessage.textContent =
                        "Staff ID / Email not found.";

                    resetMessage.className =
                        "sr-reset-message error";

                    return;
                }


                // ====================================================
                // CHECK STAFF STATUS
                // ====================================================

                if (
                    !isStaffActive(
                        staff
                    )
                ) {

                    resetMessage.textContent =
                        "This staff account is inactive.";

                    resetMessage.className =
                        "sr-reset-message error";

                    return;
                }


                // ====================================================
                // GET EMAIL
                // ====================================================

                const email =
                    getStaffLoginEmail(
                        staff
                    );


                if (!email) {

                    resetMessage.textContent =
                        "Staff email is not configured.";

                    resetMessage.className =
                        "sr-reset-message error";

                    return;
                }


                // ====================================================
                // SEND FIREBASE RESET EMAIL
                // ====================================================

                sendBtn.textContent =
                    "Sending...";


                await sendPasswordResetEmail(
                    auth,
                    email
                );


                // ====================================================
                // SUCCESS
                // ====================================================

                resetMessage.textContent =
                    `Password reset link sent to ${email}`;

                resetMessage.className =
                    "sr-reset-message success";


                resetInput.value =
                    "";


                sendBtn.textContent =
                    "Link Sent";


            }
            catch (error) {

                console.error(
                    "Password reset error:",
                    error
                );


                let message =
                    "Unable to send reset link.";


                if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    message =
                        "This email is not registered in Firebase Authentication.";
                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    message =
                        "Invalid email address.";
                }

                else if (
                    error.code ===
                    "auth/network-request-failed"
                ) {

                    message =
                        "Network error. Check your internet connection.";
                }

                else if (
                    error.code ===
                    "auth/too-many-requests"
                ) {

                    message =
                        "Too many requests. Please try again later.";
                }


                resetMessage.textContent =
                    message;

                resetMessage.className =
                    "sr-reset-message error";

            }
            finally {

                sendBtn.disabled =
                    false;


                if (
                    sendBtn.textContent ===
                    "Checking..." ||
                    sendBtn.textContent ===
                    "Sending..."
                ) {

                    sendBtn.textContent =
                        "Send Password Link";
                }
            }
        }
    );


    // --------------------------------------------------------
    // ENTER KEY
    // --------------------------------------------------------

    resetInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                sendBtn.click();
            }
        }
    );


    // --------------------------------------------------------
    // FOCUS
    // --------------------------------------------------------

    setTimeout(
        () => {

            resetInput.focus();

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
//
// HTML-la exact ID irundhaalum work aagum.
// ID illana text based-a Create Password / Forgot Password
// link-ai automatically detect pannum.
// ============================================================

function bindPasswordLinks() {

    const elements =
        document.querySelectorAll(
            "a, button"
        );


    elements.forEach(
        element => {

            const text =
                String(
                    element.textContent ||
                    ""
                )
                .trim()
                .toLowerCase();


            const isCreatePassword =
                text.includes(
                    "create password"
                );


            const isForgotPassword =
                text.includes(
                    "forgot password"
                );


            if (
                isCreatePassword ||
                isForgotPassword
            ) {

                // Prevent duplicate binding

                if (
                    element.dataset
                        .srPasswordBound ===
                    "true"
                ) {

                    return;
                }


                element.dataset
                    .srPasswordBound =
                    "true";


                element.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        openPasswordReset();

                    }
                );
            }

        }
    );


    // --------------------------------------------------------
    // ALSO SUPPORT COMMON IDS
    // --------------------------------------------------------

    const possibleIds = [
        "createPasswordBtn",
        "createPasswordLink",
        "forgotPasswordBtn",
        "forgotPasswordLink",
        "resetPasswordBtn",
        "resetPasswordLink"
    ];


    possibleIds.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return;
            }


            if (
                element.dataset
                    .srPasswordBound ===
                "true"
            ) {

                return;
            }


            element.dataset
                .srPasswordBound =
                "true";


            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openPasswordReset();

                }
            );

        }
    );
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
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        bindPasswordLinks();

    }
);


// ============================================================
// ALSO RUN IMMEDIATELY
// ============================================================
// Module script usually runs after HTML is parsed.
// This makes it safe in both cases.
// ============================================================

bindPasswordLinks();


// ============================================================
// OLD STAFF SESSION CHECK
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

    }
    catch {

        sessionStorage.removeItem(
            "srStaffSession"
        );

    }
}
