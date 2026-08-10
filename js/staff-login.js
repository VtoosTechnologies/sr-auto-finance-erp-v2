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

    if (
        !messageElement
    ) {
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
// FIND STAFF
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

        } catch (
            error
        ) {

            console.warn(
                `Staff lookup failed for ${field}:`,
                error
            );

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


    if (
        !staffId
    ) {

        showMessage(
            "Please enter Staff ID."
        );

        staffIdInput.focus();

        return;

    }


    if (
        !password
    ) {

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
        // FIND STAFF RECORD
        // ====================================================

        const staff =
            await findStaff(
                staffId
            );


        if (
            !staff
        ) {

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
            staff.email ||
            staff.loginEmail;


        if (
            !loginEmail
        ) {

            showMessage(
                "Staff login email is not configured. Please contact owner."
            );

            return;

        }


        // ====================================================
        // STEP 4
        // FIREBASE AUTH
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


        // Save Firebase UID
        sessionStorage.setItem(
            "srStaffUid",
            credential.user.uid
        );


        showMessage(
            "Login successful. Opening dashboard...",
            "success"
        );


        // ====================================================
        // STEP 6
        // REDIRECT
        // ====================================================

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


        showMessage(
            message
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
// IF OLD STAFF SESSION EXISTS
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

            // Don't auto redirect
            // during first testing.

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
