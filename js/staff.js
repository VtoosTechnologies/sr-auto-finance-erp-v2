// =====================================================
// SR AUTO FINANCE ERP
// Staff Controller
// File: js/staff.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    runTransaction,
    serverTimestamp
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


// Form fields

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

function normalizeText(value) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase();

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

function formatDate(value) {

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

        return String(value);

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


    if (!filtered.length) {

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


// Edit buttons

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

function escapeHtml(value) {

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


    const role =
        staffRole.value.trim();


    if (!name) {

        return "Please enter staff name.";

    }


    if (!mobile) {

        return "Please enter mobile number.";

    }


    if (!/^[0-9]{10}$/.test(mobile)) {

        return "Please enter a valid 10-digit mobile number.";

    }


    if (!role) {

        return "Please enter staff role/designation.";

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


        const duplicate =
            checkDuplicateMobile(
                staffMobile.value
            );


        if (duplicate) {

            showMessage(
                "This mobile number is already registered with another staff."
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


            const email =
                staffEmail.value.trim();


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


            // -----------------------------------------
            // UPDATE
            // -----------------------------------------

            if (editingStaffId) {

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

                    }
                );


                showMessage(
                    "Staff information updated successfully.",
                    "success"
                );


            }


            // -----------------------------------------
            // CREATE
            // -----------------------------------------

            else {

                const staffRef =
                    doc(
                        collection(
                            db,
                            "staff"
                        )
                    );


                const staffId =
                    await runTransaction(
                        db,
                        async transaction => {

                            const generatedStaffId =
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


                            return generatedStaffId;

                        }
                    );


                showMessage(
                    `Staff ${staffId} added successfully.`,
                    "success"
                );

            }


            await loadStaff();


            setTimeout(
                function() {

                    closeModal();

                },
                700
            );


        } catch (error) {

            console.error(
                "Staff save error:",
                error
            );


            showMessage(
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
