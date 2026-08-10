// =====================================================
// SR AUTO FINANCE ERP
// Staff Controller
// File: js/staff.js
// =====================================================

import {
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    runTransaction,
    serverTimestamp,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const addStaffBtn =
    document.getElementById("addStaffBtn");

const staffModal =
    document.getElementById("staffModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelStaffBtn =
    document.getElementById("cancelStaffBtn");

const staffForm =
    document.getElementById("staffForm");

const modalTitle =
    document.getElementById("modalTitle");

const saveStaffBtn =
    document.getElementById("saveStaffBtn");

const message =
    document.getElementById("message");

const staffTableBody =
    document.getElementById("staffTableBody");

const searchStaff =
    document.getElementById("searchStaff");

const totalStaff =
    document.getElementById("totalStaff");

const activeStaff =
    document.getElementById("activeStaff");

const inactiveStaff =
    document.getElementById("inactiveStaff");


// =====================================================
// FORM FIELDS
// =====================================================

const staffName =
    document.getElementById("staffName");

const staffMobile =
    document.getElementById("staffMobile");

const staffEmail =
    document.getElementById("staffEmail");

const staffRole =
    document.getElementById("staffRole");

const joiningDate =
    document.getElementById("joiningDate");

const staffStatus =
    document.getElementById("staffStatus");

const staffAddress =
    document.getElementById("staffAddress");

const staffRemarks =
    document.getElementById("staffRemarks");


// =====================================================
// DATA
// =====================================================

let currentUser = null;

let staffList = [];

let editingStaffId = null;


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    text,
    type = "error"
) {

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.className =
        `message ${type}`;
}


function clearMessage() {

    if (!message) {
        return;
    }

    message.textContent =
        "";

    message.className =
        "message";
}


// =====================================================
// TEXT NORMALIZE
// =====================================================

function normalizeText(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase();
}


// =====================================================
// EMAIL NORMALIZE
// =====================================================

function normalizeEmail(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();
}


// =====================================================
// DEFAULT DATE
// =====================================================

function setDefaultJoiningDate() {

    if (
        joiningDate &&
        !joiningDate.value
    ) {

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        joiningDate.value =
            today;
    }
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    if (
        typeof value === "object" &&
        value.toDate
    ) {

        return value
            .toDate()
            .toLocaleDateString(
                "en-IN"
            );
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );
    }


    return date.toLocaleDateString(
        "en-IN"
    );
}


// =====================================================
// OPEN MODAL
// =====================================================

function openModal(
    staff = null
) {

    clearMessage();


    if (!staff) {

        editingStaffId =
            null;

        modalTitle.textContent =
            "Add Staff";

        staffForm.reset();

        staffStatus.value =
            "Active";

        setDefaultJoiningDate();

        saveStaffBtn.textContent =
            "Save Staff";

    } else {

        editingStaffId =
            staff.id;

        modalTitle.textContent =
            "Edit Staff";


        staffName.value =
            staff.name || "";


        staffMobile.value =
            staff.mobile || "";


        staffEmail.value =
            staff.email || "";


        staffRole.value =
            staff.role || "";


        joiningDate.value =
            staff.joiningDate || "";


        staffStatus.value =
            staff.status || "Active";


        staffAddress.value =
            staff.address || "";


        staffRemarks.value =
            staff.remarks || "";


        saveStaffBtn.textContent =
            "Update Staff";
    }


    staffModal.classList.add(
        "show"
    );
}


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal() {

    staffModal.classList.remove(
        "show"
    );

    editingStaffId =
        null;

    clearMessage();
}


// =====================================================
// BUTTON EVENTS
// =====================================================

addStaffBtn.addEventListener(
    "click",
    function () {

        openModal();

    }
);


closeModalBtn.addEventListener(
    "click",
    closeModal
);


cancelStaffBtn.addEventListener(
    "click",
    closeModal
);


staffModal.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            staffModal
        ) {

            closeModal();
        }

    }
);


// =====================================================
// LOAD STAFF
// =====================================================

async function loadStaff() {

    try {

        staffTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="loading">
                        Loading staff...
                    </div>
                </td>
            </tr>
        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "staff"
                )
            );


        staffList = [];


        snapshot.forEach(
            staffDoc => {

                staffList.push({

                    id:
                        staffDoc.id,

                    ...staffDoc.data()

                });

            }
        );


        staffList.sort(
            function(a, b) {

                const nameA =
                    String(
                        a.name || ""
                    ).toLowerCase();


                const nameB =
                    String(
                        b.name || ""
                    ).toLowerCase();


                return nameA.localeCompare(
                    nameB
                );

            }
        );


        updateSummary();

        renderStaff();


    } catch (error) {

        console.error(
            "Staff loading error:",
            error
        );


        staffTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        Unable to load staff.
                    </div>
                </td>
            </tr>
        `;
    }
}


// =====================================================
// SUMMARY
// =====================================================

function updateSummary() {

    const total =
        staffList.length;


    const active =
        staffList.filter(
            staff =>
                String(
                    staff.status ||
                    "Active"
                ).toLowerCase() ===
                "active"
        ).length;


    const inactive =
        total - active;


    totalStaff.textContent =
        total;


    activeStaff.textContent =
        active;


    inactiveStaff.textContent =
        inactive;
}


// =====================================================
// RENDER STAFF
// =====================================================

function renderStaff(
    searchTerm = ""
) {

    const term =
        String(
            searchTerm || ""
        )
            .trim()
            .toLowerCase();


    const filtered =
        staffList.filter(
            staff => {

                if (!term) {
                    return true;
                }


                const searchable = [

                    staff.staffId,

                    staff.name,

                    staff.mobile,

                    staff.email,

                    staff.role,

                    staff.status

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return searchable.includes(
                    term
                );

            }
        );


    if (
        !filtered.length
    ) {

        staffTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">

                        <div class="empty-icon">
                            👥
                        </div>

                        <p>
                            No staff found.
                        </p>

                    </div>
                </td>
            </tr>
        `;

        return;
    }


    staffTableBody.innerHTML =
        filtered
            .map(
                staff => {

                    const status =
                        String(
                            staff.status ||
                            "Active"
                        ).toLowerCase();


                    const statusClass =
                        status === "active"
                            ? "active"
                            : "inactive";


                    const statusText =
                        status === "active"
                            ? "Active"
                            : "Inactive";


                    return `
                        <tr>

                            <td>

                                <div class="staff-name">
                                    ${escapeHtml(
                                        staff.name ||
                                        "-"
                                    )}
                                </div>

                                <div class="staff-id">
                                    ${escapeHtml(
                                        staff.staffId ||
                                        staff.id
                                    )}
                                </div>

                            </td>


                            <td>
                                ${escapeHtml(
                                    staff.mobile ||
                                    "-"
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    staff.role ||
                                    "-"
                                )}
                            </td>


                            <td>
                                ${formatDate(
                                    staff.joiningDate
                                )}
                            </td>


                            <td>

                                <span
                                    class="status ${statusClass}"
                                >
                                    ${statusText}
                                </span>

                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="action-btn"
                                    data-edit-id="${escapeHtml(
                                        staff.id
                                    )}"
                                >
                                    Edit
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");


    // =================================================
    // EDIT BUTTONS
    // =================================================

    staffTableBody
        .querySelectorAll(
            "[data-edit-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        const id =
                            this.dataset.editId;


                        const staff =
                            staffList.find(
                                item =>
                                    item.id ===
                                    id
                            );


                        if (staff) {

                            openModal(
                                staff
                            );

                        }

                    }
                );

            }
        );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// =====================================================
// SEARCH
// =====================================================

searchStaff.addEventListener(
    "input",
    function() {

        renderStaff(
            this.value
        );

    }
);


// =====================================================
// VALIDATE STAFF
// =====================================================

function validateStaff() {

    const name =
        staffName.value.trim();


    const mobile =
        staffMobile.value.trim();


    const email =
        normalizeEmail(
            staffEmail.value
        );


    const role =
        staffRole.value.trim();


    if (!name) {

        return (
            "Please enter staff name."
        );
    }


    if (!mobile) {

        return (
            "Please enter mobile number."
        );
    }


    if (
        !/^[0-9]{10}$/.test(
            mobile
        )
    ) {

        return (
            "Please enter a valid 10-digit mobile number."
        );
    }


    if (!email) {

        return (
            "Please enter staff email."
        );
    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email)
    ) {

        return (
            "Please enter a valid staff email address."
        );
    }


    if (!role) {

        return (
            "Please enter staff role/designation."
        );
    }


    return null;
}


// =====================================================
// DUPLICATE MOBILE CHECK
// =====================================================

function checkDuplicateMobile(
    mobile
) {

    const normalizedMobile =
        normalizeText(
            mobile
        );


    return staffList.find(
        staff => {

            const existingMobile =
                normalizeText(
                    staff.mobile
                );


            if (
                !existingMobile ||
                existingMobile !==
                normalizedMobile
            ) {

                return false;
            }


            if (
                editingStaffId &&
                staff.id ===
                editingStaffId
            ) {

                return false;
            }


            return true;

        }
    );
}


// =====================================================
// DUPLICATE EMAIL CHECK
// =====================================================

function checkDuplicateEmail(
    email
) {

    const normalizedEmail =
        normalizeEmail(
            email
        );


    return staffList.find(
        staff => {

            const existingEmail =
                normalizeEmail(
                    staff.email
                );


            if (
                !existingEmail ||
                existingEmail !==
                normalizedEmail
            ) {

                return false;
            }


            if (
                editingStaffId &&
                staff.id ===
                editingStaffId
            ) {

                return false;
            }


            return true;

        }
    );
}


// =====================================================
// GENERATE STAFF ID
// =====================================================

async function generateStaffId(
    transaction
) {

    const counterRef =
        doc(
            db,
            "counters",
            "staffNo"
        );


    const counterSnap =
        await transaction.get(
            counterRef
        );


    let nextNumber =
        1;


    if (
        counterSnap.exists()
    ) {

        const data =
            counterSnap.data();


        nextNumber =
            Number(
                data.current ??
                data.value ??
                data.number ??
                data.lastNumber ??
                0
            ) + 1;
    }


    transaction.set(
        counterRef,
        {

            current:
                nextNumber,

            updatedAt:
                serverTimestamp()

        },
        {
            merge: true
        }
    );


    return (
        "STF-" +
        String(
            nextNumber
        ).padStart(
            6,
            "0"
        )
    );
}


// =====================================================
// CREATE TEMP PASSWORD
// =====================================================

function createTemporaryPassword() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ" +
        "abcdefghijkmnopqrstuvwxyz" +
        "23456789" +
        "!@#$%";


    let password =
        "";


    for (
        let i = 0;
        i < 24;
        i++
    ) {

        const index =
            Math.floor(
                Math.random() *
                chars.length
            );


        password +=
            chars[index];
    }


    return password;
}


// =====================================================
// CREATE FIREBASE AUTH ACCOUNT
//
// IMPORTANT:
// We use Firebase Auth REST signup here instead of
// createUserWithEmailAndPassword() on the main auth
// instance.
//
// This keeps the owner logged in.
//
// The temporary password is NEVER stored.
// A password-reset email is sent immediately.
// Staff creates their own real password.
// =====================================================

async function createStaffAuthAccount(
    email
) {

    const apiKey =
        auth?.app?.options?.apiKey;


    if (!apiKey) {

        throw new Error(
            "Firebase API key could not be found."
        );
    }


    const temporaryPassword =
        createTemporaryPassword();


    const endpoint =
        "https://identitytoolkit.googleapis.com/v1/accounts:signUp" +
        `?key=${encodeURIComponent(
            apiKey
        )}`;


    const response =
        await fetch(
            endpoint,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        email:
                            email,

                        password:
                            temporaryPassword,

                        returnSecureToken:
                            true

                    })

            }
        );


    const result =
        await response.json();


    if (
        !response.ok
    ) {

        const code =
            result?.error?.message ||
            "";


        if (
            code ===
            "EMAIL_EXISTS"
        ) {

            throw new Error(
                "This email already has a Firebase login account."
            );
        }


        if (
            code ===
            "OPERATION_NOT_ALLOWED"
        ) {

            throw new Error(
                "Firebase Email/Password Authentication is not enabled."
            );
        }


        if (
            code ===
            "TOO_MANY_ATTEMPTS_TRY_LATER"
        ) {

            throw new Error(
                "Too many account creation attempts. Please try again later."
            );
        }


        throw new Error(
            `Firebase account creation failed: ${code || "Unknown error"}`
        );
    }


    if (
        !result.localId
    ) {

        throw new Error(
            "Firebase account was created but UID was not returned."
        );
    }


    return result.localId;
}


// =====================================================
// SEND FIRST-TIME PASSWORD EMAIL
// =====================================================

async function sendStaffPasswordSetupEmail(
    email
) {

    await sendPasswordResetEmail(
        auth,
        email
    );
}


// =====================================================
// SAVE / UPDATE STAFF
// =====================================================

staffForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        clearMessage();


        const validationError =
            validateStaff();


        if (validationError) {

            showMessage(
                validationError
            );

            return;
        }


        const duplicateMobile =
            checkDuplicateMobile(
                staffMobile.value
            );


        if (duplicateMobile) {

            showMessage(
                "This mobile number is already registered with another staff."
            );

            return;
        }


        const email =
            normalizeEmail(
                staffEmail.value
            );


        const duplicateEmail =
            checkDuplicateEmail(
                email
            );


        if (duplicateEmail) {

            showMessage(
                "This email address is already registered with another staff."
            );

            return;
        }


        saveStaffBtn.disabled =
            true;


        saveStaffBtn.textContent =
            editingStaffId
                ? "Updating..."
                : "Saving...";


        try {

            const name =
                staffName.value.trim();


            const mobile =
                staffMobile.value.trim();


            const role =
                staffRole.value.trim();


            const joining =
                joiningDate.value ||
                null;


            const status =
                staffStatus.value ||
                "Active";


            const address =
                staffAddress.value.trim();


            const remarks =
                staffRemarks.value.trim();


            // =================================================
            // UPDATE EXISTING STAFF
            // =================================================

            if (
                editingStaffId
            ) {

                const staffRef =
                    doc(
                        db,
                        "staff",
                        editingStaffId
                    );


                await runTransaction(
                    db,
                    async transaction => {

                        const snapshot =
                            await transaction.get(
                                staffRef
                            );


                        if (
                            !snapshot.exists()
                        ) {

                            throw new Error(
                                "Staff record not found."
                            );
                        }


                        const oldData =
                            snapshot.data();


                        transaction.update(
                            staffRef,
                            {

                                name,

                                mobile,

                                email,

                                role,

                                joiningDate:
                                    joining,

                                status,

                                address,

                                remarks,

                                updatedAt:
                                    serverTimestamp(),

                                updatedBy:
                                    currentUser.uid

                            }
                        );


                        /*
                         * If email is changed after the Auth
                         * account was already created, we do NOT
                         * automatically change Firebase Auth email
                         * from this screen.
                         *
                         * This prevents accidental login mismatch.
                         */

                        if (
                            oldData.email &&
                            normalizeEmail(
                                oldData.email
                            ) !==
                            email &&
                            oldData.authUid
                        ) {

                            console.warn(
                                "Staff email changed in Firestore, but Firebase Auth email was not changed automatically."
                            );
                        }

                    }
                );


                showMessage(
                    "Staff information updated successfully.",
                    "success"
                );


                await loadStaff();


                setTimeout(
                    function() {

                        closeModal();

                    },
                    700
                );


                return;
            }


            // =================================================
            // CREATE STAFF DOCUMENT
            // =================================================

            const staffRef =
                doc(
                    collection(
                        db,
                        "staff"
                    )
                );


            let generatedStaffId =
                "";


            await runTransaction(
                db,
                async transaction => {

                    generatedStaffId =
                        await generateStaffId(
                            transaction
                        );


                    transaction.set(
                        staffRef,
                        {

                            staffId:
                                generatedStaffId,

                            name,

                            mobile,

                            email,

                            role,

                            joiningDate:
                                joining,

                            status,

                            address,

                            remarks,

                            /*
                             * Authentication
                             *
                             * authUid will be added
                             * after Firebase Auth account
                             * is successfully created.
                             */

                            authUid:
                                null,

                            authEmail:
                                email,

                            authProvisioned:
                                false,

                            passwordSetupSent:
                                false,


                            // --------------------------------
                            // DOCUMENT RESPONSIBILITY
                            // --------------------------------

                            assignedDocuments:
                                [],


                            // --------------------------------
                            // META
                            // --------------------------------

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp(),

                            createdBy:
                                currentUser.uid

                        }
                    );

                }
            );


            // =================================================
            // CREATE FIREBASE AUTH ACCOUNT
            // =================================================

            let authUid =
                null;


            try {

                authUid =
                    await createStaffAuthAccount(
                        email
                    );


            } catch (
                authError
            ) {

                console.error(
                    "Staff Auth creation error:",
                    authError
                );


                /*
                 * Roll back the staff document because
                 * login account could not be provisioned.
                 */

                try {

                    await deleteDoc(
                        staffRef
                    );

                } catch (
                    rollbackError
                ) {

                    console.error(
                        "Staff rollback error:",
                        rollbackError
                    );
                }


                throw authError;
            }


            // =================================================
            // LINK AUTH UID
            // =================================================

            await updateDoc(
                staffRef,
                {

                    authUid:
                        authUid,

                    authEmail:
                        email,

                    authProvisioned:
                        true,

                    updatedAt:
                        serverTimestamp(),

                    updatedBy:
                        currentUser.uid

                }
            );


            // =================================================
            // SEND PASSWORD SETUP EMAIL
            // =================================================

            let passwordEmailSent =
                false;


            try {

                await sendStaffPasswordSetupEmail(
                    email
                );


                passwordEmailSent =
                    true;


            } catch (
                emailError
            ) {

                console.error(
                    "Password setup email error:",
                    emailError
                );

            }


            // =================================================
            // SAVE EMAIL STATUS
            // =================================================

            await updateDoc(
                staffRef,
                {

                    passwordSetupSent:
                        passwordEmailSent,

                    passwordSetupSentAt:
                        passwordEmailSent
                            ? serverTimestamp()
                            : null,

                    updatedAt:
                        serverTimestamp()

                }
            );


            // =================================================
            // SUCCESS MESSAGE
            // =================================================

            if (
                passwordEmailSent
            ) {

                showMessage(
                    `Staff ${generatedStaffId} added successfully. Password setup email sent to ${email}.`,
                    "success"
                );

            } else {

                showMessage(
                    `Staff ${generatedStaffId} added successfully, but the password setup email could not be sent. Use Forgot Password from Staff Login.`,
                    "success"
                );

            }


            await loadStaff();


            setTimeout(
                function() {

                    closeModal();

                },
                1800
            );


        } catch (
            error
        ) {

            console.error(
                "Staff save error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to save staff. Please try again."
            );


        } finally {

            saveStaffBtn.disabled =
                false;


            saveStaffBtn.textContent =
                editingStaffId
                    ? "Update Staff"
                    : "Save Staff";

        }

    }
);


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        currentUser =
            user;


        await loadStaff();

    }
);
