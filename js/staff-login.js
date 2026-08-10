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
    document.getElementById("staffLoginForm");

const staffIdInput =
    document.getElementById("staffId");

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
    message,
    type = "error"
) {

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;

    messageElement.className =
        `message ${type}`;
}


function clearMessage() {

    if (!messageElement) {
        return;
    }

    messageElement.textContent = "";

    messageElement.className =
        "message";
}


// ============================================================
// FIND STAFF
// ============================================================

async function findStaff(staffId) {

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


            if (!snapshot.empty) {

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

async function findStaffByEmail(email) {

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


            if (!snapshot.empty) {

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
// CHECK STAFF STATUS
// ============================================================

function isStaffActive(staff) {

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

function saveStaffSession(staff) {

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
        staffIdInput
            ?.value
            ?.trim() ||
        "";


    const password =
        passwordInput
            ?.value ||
        "";


    if (!staffId) {

        showMessage(
            "Please enter Staff ID or Email."
        );

        staffIdInput?.focus();

        return;
    }


    if (!password) {

        showMessage(
            "Please enter password."
        );

        passwordInput?.focus();

        return;
    }


    if (loginBtn) {

        loginBtn.disabled =
            true;

        loginBtn.textContent =
            "Checking...";

    }


    try {

        // ====================================================
        // STEP 1
        // FIND STAFF
        // ====================================================

        let staff = null;


        // If user entered email
        if (
            staffId.includes("@")
        ) {

            staff =
                await findStaffByEmail(
                    staffId
                );

        }
        else {

            staff =
                await findStaff(
                    staffId
                );

        }


        // ====================================================
        // STEP 2
        // STAFF RECORD CHECK
        // ====================================================

        if (!staff) {

            showMessage(
                "Staff ID / Email not found."
            );

            return;
        }


        // ====================================================
        // STEP 3
        // STATUS CHECK
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
        // STEP 4
        // GET LOGIN EMAIL
        // ====================================================

        const loginEmail =
            String(
                staff.email ||
                staff.loginEmail ||
                ""
            )
            .trim()
            .toLowerCase();


        if (!loginEmail) {

            showMessage(
                "Staff login email is not configured. Please contact owner."
            );

            return;
        }


        // ====================================================
        // STEP 5
        // FIREBASE AUTH LOGIN
        // ====================================================

        const credential =
            await signInWithEmailAndPassword(
                auth,
                loginEmail,
                password
            );


        // ====================================================
        // STEP 6
        // SAVE SESSION
        // ====================================================

        saveStaffSession(
            staff
        );


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
                "Invalid email or password.";

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

        if (loginBtn) {

            loginBtn.disabled =
                false;

            loginBtn.textContent =
                "Login";

        }

    }

}


// ============================================================
// GET EMAIL FOR PASSWORD RESET
// ============================================================

async function getResetEmail() {

    const enteredValue =
        staffIdInput
            ?.value
            ?.trim() ||
        "";


    if (!enteredValue) {

        showMessage(
            "Please enter Staff ID or Email first."
        );

        staffIdInput?.focus();

        return null;
    }


    // --------------------------------------------------------
    // CASE 1: EMAIL ENTERED
    // --------------------------------------------------------

    if (
        enteredValue.includes("@")
    ) {

        const staff =
            await findStaffByEmail(
                enteredValue
            );


        if (!staff) {

            showMessage(
                "This email is not registered as a staff account."
            );

            return null;
        }


        if (
            !isStaffActive(
                staff
            )
        ) {

            showMessage(
                "This staff account is inactive."
            );

            return null;
        }


        return (
            staff.email ||
            staff.loginEmail ||
            enteredValue
        );

    }


    // --------------------------------------------------------
    // CASE 2: STAFF ID ENTERED
    // --------------------------------------------------------

    const staff =
        await findStaff(
            enteredValue
        );


    if (!staff) {

        showMessage(
            "Staff ID not found."
        );

        return null;
    }


    if (
        !isStaffActive(
            staff
        )
    ) {

        showMessage(
            "This staff account is inactive."
        );

        return null;
    }


    const email =
        String(
            staff.email ||
            staff.loginEmail ||
            ""
        )
        .trim();


    if (!email) {

        showMessage(
            "Email is not configured for this staff account."
        );

        return null;
    }


    return email;
}


// ============================================================
// SEND PASSWORD RESET EMAIL
// ============================================================

async function sendResetLink() {

    clearMessage();


    try {

        const email =
            await getResetEmail();


        if (!email) {

            return;
        }


        // ----------------------------------------------------
        // SEND FIREBASE RESET EMAIL
        // ----------------------------------------------------

        await sendPasswordResetEmail(
            auth,
            email
        );


        showMessage(
            `Password reset link sent to ${email}. Please check your email.`,
            "success"
        );


    }
    catch (error) {

        console.error(
            "Password reset error:",
            error
        );


        let message =
            "Unable to send password reset email.";


        if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Invalid email address.";

        }

        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "No Firebase Authentication user found for this email.";

        }

        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many requests. Please try again later.";

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

}


// ============================================================
// PASSWORD RESET MODAL
// ============================================================

function createPasswordResetModal() {

    // Already exists
    if (
        document.getElementById(
            "srPasswordResetModal"
        )
    ) {

        return;
    }


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

                <p>
                    Password create panna
                    unga registered Staff ID or Email use pannunga.
                </p>

                <label>
                    Staff ID / Email
                </label>

                <input
                    type="text"
                    id="srResetInput"
                    placeholder="Enter Staff ID or Email"
                    autocomplete="username"
                >

                <div
                    id="srResetMessage"
                    class="sr-reset-message"
                ></div>

                <button
                    type="button"
                    id="srSendResetBtn"
                    class="sr-reset-primary"
                >
                    Send Password Link
                </button>

                <button
                    type="button"
                    id="srCloseResetBtn"
                    class="sr-reset-secondary"
                >
                    Cancel
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    // ========================================================
    // MODAL CSS
    // ========================================================

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "srPasswordResetStyle";


    style.textContent = `

        .sr-reset-overlay {

            position: fixed;
            inset: 0;

            background:
                rgba(5, 15, 35, 0.72);

            display: flex;

            align-items: center;
            justify-content: center;

            z-index: 99999;

            padding: 20px;

        }


        .sr-reset-card {

            width: 100%;
            max-width: 420px;

            background: #ffffff;

            border-radius: 18px;

            padding: 28px;

            box-shadow:
                0 25px 70px
                rgba(0,0,0,0.25);

            font-family:
                Arial,
                Helvetica,
                sans-serif;

        }


        .sr-reset-icon {

            width: 55px;
            height: 55px;

            display: flex;

            align-items: center;
            justify-content: center;

            background: #eef5ff;

            border-radius: 15px;

            font-size: 27px;

            margin-bottom: 15px;

        }


        .sr-reset-card h2 {

            margin:
                0 0 8px;

            color:
                #0f172a;

            font-size:
                23px;

        }


        .sr-reset-card p {

            margin:
                0 0 20px;

            color:
                #64748b;

            font-size:
                14px;

            line-height:
                1.6;

        }


        .sr-reset-card label {

            display: block;

            margin-bottom: 7px;

            color:
                #334155;

            font-size:
                13px;

            font-weight:
                700;

        }


        .sr-reset-card input {

            width: 100%;

            box-sizing:
                border-box;

            padding:
                13px 14px;

            border:
                1px solid #cbd5e1;

            border-radius:
                10px;

            outline: none;

            font-size:
                15px;

            margin-bottom:
                12px;

        }


        .sr-reset-card input:focus {

            border-color:
                #2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,0.12);

        }


        .sr-reset-message {

            min-height:
                20px;

            margin:
                5px 0 12px;

            font-size:
                13px;

        }


        .sr-reset-primary {

            width: 100%;

            border: none;

            border-radius:
                10px;

            padding:
                13px;

            background:
                #2563eb;

            color: #ffffff;

            font-size:
                15px;

            font-weight:
                700;

            cursor: pointer;

            margin-bottom:
                9px;

        }


        .sr-reset-primary:hover {

            background:
                #1d4ed8;

        }


        .sr-reset-secondary {

            width: 100%;

            border:
                1px solid #cbd5e1;

            border-radius:
                10px;

            padding:
                12px;

            background:
                #ffffff;

            color:
                #334155;

            font-size:
                14px;

            cursor: pointer;

        }

    `;


    document.head.appendChild(
        style
    );


    // ========================================================
    // DEFAULT VALUE
    // ========================================================

    const resetInput =
        document.getElementById(
            "srResetInput"
        );


    if (
        staffIdInput &&
        staffIdInput.value.trim()
    ) {

        resetInput.value =
            staffIdInput.value.trim();

    }


    // ========================================================
    // SEND BUTTON
    // ========================================================

    const sendButton =
        document.getElementById(
            "srSendResetBtn"
        );


    sendButton.addEventListener(
        "click",
        async () => {

            const value =
                resetInput
                    .value
                    .trim();


            if (!value) {

                document.getElementById(
                    "srResetMessage"
                ).textContent =
                    "Please enter Staff ID or Email.";

                return;
            }


            sendButton.disabled =
                true;

            sendButton.textContent =
                "Sending...";


            try {

                const oldValue =
                    staffIdInput.value;


                staffIdInput.value =
                    value;


                clearMessage();


                const email =
                    await getResetEmail();


                staffIdInput.value =
                    oldValue;


                if (!email) {

                    return;
                }


                await sendPasswordResetEmail(
                    auth,
                    email
                );


                document.getElementById(
                    "srResetMessage"
                ).textContent =
                    `Reset link sent to ${email}. Check your email.`;


                document.getElementById(
                    "srResetMessage"
                ).style.color =
                    "#15803d";


                sendButton.textContent =
                    "Link Sent";


            }
            catch (error) {

                console.error(
                    "Reset email error:",
                    error
                );


                const resetMessage =
                    document.getElementById(
                        "srResetMessage"
                    );


                resetMessage.style.color =
                    "#dc2626";


                if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    resetMessage.textContent =
                        "Invalid email address.";

                }
                else if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    resetMessage.textContent =
                        "Firebase Authentication user not found.";

                }
                else if (
                    error.code ===
                    "auth/too-many-requests"
                ) {

                    resetMessage.textContent =
                        "Too many requests. Try again later.";

                }
                else {

                    resetMessage.textContent =
                        "Unable to send reset link.";

                }

            }
            finally {

                if (
                    sendButton.textContent !==
                    "Link Sent"
                ) {

                    sendButton.disabled =
                        false;

                    sendButton.textContent =
                        "Send Password Link";

                }

            }

        }
    );


    // ========================================================
    // CLOSE BUTTON
    // ========================================================

    document.getElementById(
        "srCloseResetBtn"
    )
    .addEventListener(
        "click",
        () => {

            modal.remove();

        }
    );


    // ========================================================
    // ENTER KEY
    // ========================================================

    resetInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                sendButton.click();

            }

        }
    );

}


// ============================================================
// FIND CREATE PASSWORD / FORGOT PASSWORD LINKS
// ============================================================

function bindPasswordLinks() {

    const elements =
        document.querySelectorAll(
            "a, button"
        );


    elements.forEach(
        element => {

            const text =
                (
                    element.textContent ||
                    ""
                )
                .trim()
                .toLowerCase();


            // ------------------------------------------------
            // CREATE PASSWORD
            // ------------------------------------------------

            if (
                text.includes(
                    "create password"
                )
            ) {

                element.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        createPasswordResetModal();

                    }
                );

            }


            // ------------------------------------------------
            // FORGOT PASSWORD
            // ------------------------------------------------

            if (
                text.includes(
                    "forgot password"
                )
            ) {

                element.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        createPasswordResetModal();

                    }
                );

            }

        }
    );

}


// ============================================================
// FORM SUBMIT
// ============================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            loginStaff();

        }
    );

}


// ============================================================
// PASSWORD LINK BINDING
// ============================================================

bindPasswordLinks();


// ============================================================
// IF OLD STAFF SESSION EXISTS
// ============================================================

const existingSession =
    sessionStorage.getItem(
        "srStaffSession"
    );


if (existingSession) {

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


// ============================================================
// END
// ============================================================
