// =====================================================
// SR AUTO FINANCE ERP
// Loan View Controller
// File: js/loan-view.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const message =
    document.getElementById("message");

const documentTableBody =
    document.getElementById(
        "documentTableBody"
    );


// =====================================================
// URL LOAN ID
// =====================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const loanDocumentId =
    urlParams.get("id");


// =====================================================
// CURRENT USER
// =====================================================

let currentUser = null;

let currentLoan = null;

let loanDocuments = [];


// =====================================================
// HELPERS
// =====================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// CURRENCY
// =====================================================

function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value) || 0
    );

}


// =====================================================
// DATE
// =====================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }


    try {

        let date;


        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else {

            date =
                new Date(value);

        }


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return "-";

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch (error) {

        return "-";

    }

}


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


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "-";

}


// =====================================================
// LOAD LOAN
// =====================================================

async function loadLoan() {

    if (!loanDocumentId) {

        showMessage(
            "Loan information not found."
        );

        return;

    }


    try {

        const loanRef =
            doc(
                db,
                "loans",
                loanDocumentId
            );


        const loanSnap =
            await getDoc(
                loanRef
            );


        if (!loanSnap.exists()) {

            showMessage(
                "Loan not found."
            );

            return;

        }


        currentLoan = {

            id:
                loanSnap.id,

            ...loanSnap.data()

        };


        renderLoan();


        await loadDocuments();


    } catch (error) {

        console.error(
            "Loan loading error:",
            error
        );


        showMessage(
            "Unable to load loan details."
        );

    }

}


// =====================================================
// RENDER LOAN
// =====================================================

function renderLoan() {

    const loan =
        currentLoan;


    // ---------------------------------------------
    // LOAN
    // ---------------------------------------------

    setText(
        "loanId",
        loan.loanId ||
        loan.loanNumber ||
        loan.id
    );


    setText(
        "loanType",
        loan.loanType === "reloan"
            ? "ReLoan"
            : "New Loan"
    );


    setText(
        "loanDate",
        formatDate(
            loan.loanDate
        )
    );


    const statusElement =
        document.getElementById(
            "loanStatus"
        );


    if (statusElement) {

        const status =
            loan.status ||
            "Active";


        const statusLower =
            String(
                status
            ).toLowerCase();


        statusElement.innerHTML = `
            <span class="status ${
                statusLower ===
                "closed"
                    ? "closed"
                    : ""
            }">
                ${escapeHTML(status)}
            </span>
        `;

    }


    setText(
        "loanAmount",
        formatCurrency(
            loan.loanAmount ||
            loan.principalAmount ||
            0
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            loan.outstandingAmount ??
            loan.balanceAmount ??
            0
        )
    );


    setText(
        "installment",
        formatCurrency(
            loan.installmentAmount ||
            0
        )
    );


    setText(
        "firstDueDate",
        formatDate(
            loan.firstDueDate
        )
    );


    // ---------------------------------------------
    // CUSTOMER
    // ---------------------------------------------

    setText(
        "customerId",
        loan.customerId ||
        "-"
    );


    setText(
        "customerName",
        loan.customerName ||
        "-"
    );


    setText(
        "customerMobile",
        loan.customerMobile ||
        loan.mobile ||
        "-"
    );


    setText(
        "previousLoan",
        loan.previousLoanId ||
        "-"
    );


    // ---------------------------------------------
    // VEHICLE
    // ---------------------------------------------

    setText(
        "vehicleType",
        loan.vehicleType ||
        "-"
    );


    setText(
        "vehicleBrand",
        loan.vehicleBrand ||
        "-"
    );


    setText(
        "vehicleModel",
        loan.vehicleModel ||
        "-"
    );


    setText(
        "vehicleNumber",
        loan.vehicleNumber ||
        "-"
    );


    setText(
        "chassisNumber",
        loan.chassisNumber ||
        "-"
    );


    setText(
        "engineNumber",
        loan.engineNumber ||
        "-"
    );


    setText(
        "showroomName",
        loan.showroomName ||
        "-"
    );


    setText(
        "bookingId",
        loan.showroomBookingId ||
        "-"
    );

}


// =====================================================
// LOAD DOCUMENTS
// =====================================================

async function loadDocuments() {

    try {

        documentTableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty">
                        Loading documents...
                    </div>
                </td>
            </tr>
        `;


        /*
         * IMPORTANT
         *
         * Documents are linked using:
         *
         * loanDocumentId
         *
         * This prevents documents from
         * another loan appearing here.
         */


        const documentsRef =
            collection(
                db,
                "documents"
            );


        const documentsQuery =
            query(
                documentsRef,
                where(
                    "loanDocumentId",
                    "==",
                    loanDocumentId
                )
            );


        const snapshot =
            await getDocs(
                documentsQuery
            );


        loanDocuments = [];


        snapshot.forEach(
            documentSnap => {

                loanDocuments.push({

                    id:
                        documentSnap.id,

                    ...documentSnap.data()

                });

            }
        );


        // -----------------------------------------
        // SORT
        // -----------------------------------------

        loanDocuments.sort(
            (a, b) => {

                const order = {

                    "Aadhaar Card": 1,

                    "PAN Card": 2,

                    "RC Book": 3,

                    "Insurance": 4,

                    "Sale Invoice": 5

                };


                return (
                    (order[
                        a.documentType
                    ] || 99)
                    -
                    (order[
                        b.documentType
                    ] || 99)
                );

            }
        );


        renderDocuments();


    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );


        documentTableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty">
                        Unable to load loan documents.
                    </div>
                </td>
            </tr>
        `;

    }

}


// =====================================================
// DOCUMENT STATUS CLASS
// =====================================================

function getDocumentStatusClass(
    status
) {

    const value =
        String(
            status ||
            "Pending"
        )
        .toLowerCase();


    if (
        value ===
        "received"
    ) {

        return "received";

    }


    if (
        value ===
        "issued"
    ) {

        return "issued";

    }


    if (
        value ===
        "returned"
    ) {

        return "returned";

    }


    return "pending";

}


// =====================================================
// RENDER DOCUMENTS
// =====================================================

function renderDocuments() {

    if (
        !loanDocuments.length
    ) {

        documentTableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty">
                        No documents found for this loan.
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    documentTableBody.innerHTML =
        loanDocuments.map(
            documentItem => {

                const status =
                    documentItem.status ||
                    "Pending";


                const statusClass =
                    getDocumentStatusClass(
                        status
                    );


                const staffName =
                    documentItem.staffName ||
                    "-";


                const holder =
                    documentItem.currentHolder ||
                    "-";


                return `

                    <tr>

                        <td>

                            <span class="doc-name">

                                ${escapeHTML(
                                    documentItem.documentType ||
                                    "-"
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="
                                badge
                                ${statusClass}
                            ">

                                ${escapeHTML(
                                    status
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="holder">

                                ${escapeHTML(
                                    holder
                                )}

                            </span>

                        </td>


                        <td>

                            ${escapeHTML(
                                staffName
                            )}

                        </td>


                        <td>

                            ${formatDate(
                                documentItem.receivedDate
                            )}

                        </td>


                        <td>

                            ${formatDate(
                                documentItem.issuedDate
                            )}

                        </td>


                        <td>

                            ${formatDate(
                                documentItem.returnedDate
                            )}

                        </td>


                        <td>

                            ${getDocumentActionButton(
                                documentItem
                            )}

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// =====================================================
// DOCUMENT ACTION BUTTON
// =====================================================

function getDocumentActionButton(
    documentItem
) {

    const status =
        String(
            documentItem.status ||
            "Pending"
        ).toLowerCase();


    /*
     * Current stage:
     *
     * Pending  -> Receive
     * Received -> Issue
     * Issued   -> Return
     * Returned -> Receive
     *
     * Staff selection will be added
     * in the next stage.
     */


    if (
        status ===
        "pending"
    ) {

        return `
            <button
                class="action-btn"
                onclick="receiveDocument(
                    '${documentItem.id}'
                )"
            >
                Receive
            </button>
        `;

    }


    if (
        status ===
        "received"
    ) {

        return `
            <button
                class="action-btn"
                onclick="issueDocument(
                    '${documentItem.id}'
                )"
            >
                Issue
            </button>
        `;

    }


    if (
        status ===
        "issued"
    ) {

        return `
            <button
                class="action-btn"
                onclick="returnDocument(
                    '${documentItem.id}'
                )"
            >
                Return
            </button>
        `;

    }


    if (
        status ===
        "returned"
    ) {

        return `
            <button
                class="action-btn"
                onclick="receiveDocument(
                    '${documentItem.id}'
                )"
            >
                Receive
            </button>
        `;

    }


    return "-";

}


// =====================================================
// UPDATE DOCUMENT
// =====================================================

async function updateDocument(
    documentId,
    data,
    successMessage
) {

    try {

        const documentRef =
            doc(
                db,
                "documents",
                documentId
            );


        await updateDoc(
            documentRef,
            {

                ...data,

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    currentUser.uid

            }
        );


        showMessage(
            successMessage,
            "success"
        );


        await loadDocuments();


    } catch (error) {

        console.error(
            "Document update error:",
            error
        );


        showMessage(
            "Unable to update document."
        );

    }

}


// =====================================================
// RECEIVE DOCUMENT
// =====================================================

window.receiveDocument =
    async function(
        documentId
    ) {

        const documentItem =
            loanDocuments.find(
                item =>
                    item.id ===
                    documentId
            );


        if (!documentItem) {
            return;
        }


        const confirmed =
            confirm(
                `Receive ${documentItem.documentType}?`
            );


        if (!confirmed) {
            return;
        }


        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        const history =
            Array.isArray(
                documentItem.history
            )
                ? [
                    ...documentItem.history
                ]
                : [];


        history.push({

            action:
                "Document Received",

            status:
                "Received",

            currentHolder:
                "Office",

            staffId:
                "",

            staffName:
                "",

            date:
                today,

            remarks:
                "Document received."

        });


        await updateDocument(

            documentId,

            {

                status:
                    "Received",

                currentHolder:
                    "Office",

                receivedDate:
                    today,

                returnedDate:
                    null,

                staffId:
                    "",

                staffCode:
                    "",

                staffName:
                    "",

                lastAction:
                    "Document Received",

                lastActionDate:
                    today,

                history:
                    history

            },

            `${documentItem.documentType} received successfully.`

        );

    };


// =====================================================
// ISSUE DOCUMENT
// =====================================================

// =====================================================
// STAFF DATA
// =====================================================

let staffList = [];

let selectedIssueDocumentId = null;


// =====================================================
// ISSUE MODAL ELEMENTS
// =====================================================

const documentIssueModal =
    document.getElementById(
        "documentIssueModal"
    );

const closeIssueModalBtn =
    document.getElementById(
        "closeIssueModalBtn"
    );

const cancelIssueBtn =
    document.getElementById(
        "cancelIssueBtn"
    );

const confirmIssueBtn =
    document.getElementById(
        "confirmIssueBtn"
    );

const issueStaffSelect =
    document.getElementById(
        "issueStaffSelect"
    );

const issueDateInput =
    document.getElementById(
        "issueDateInput"
    );

const issueDocumentName =
    document.getElementById(
        "issueDocumentName"
    );

const issueRemarksInput =
    document.getElementById(
        "issueRemarksInput"
    );


// =====================================================
// TODAY
// =====================================================

function getTodayDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;

}


// =====================================================
// LOAD ACTIVE STAFF
// =====================================================

async function loadActiveStaff() {

    try {

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

                const data =
                    staffDoc.data();


                const status =
                    String(
                        data.status ||
                        ""
                    ).toLowerCase();


                const active =
                    data.active !== false;


                if (
                    status &&
                    status !== "active"
                ) {

                    return;

                }


                if (!active) {

                    return;

                }


                staffList.push({

                    id:
                        staffDoc.id,

                    staffId:
                        data.staffId ||
                        data.employeeId ||
                        staffDoc.id,

                    name:
                        data.name ||
                        data.staffName ||
                        data.fullName ||
                        data.username ||
                        "Staff"

                });

            }
        );


        staffList.sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        );


        if (issueStaffSelect) {

            issueStaffSelect.innerHTML = `
                <option value="">
                    Select Staff
                </option>
            `;


            staffList.forEach(
                staff => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        staff.id;


                    option.textContent =
                        `${staff.name} (${staff.staffId})`;


                    issueStaffSelect.appendChild(
                        option
                    );

                }
            );

        }


    } catch (error) {

        console.error(
            "Staff loading error:",
            error
        );


        showMessage(
            "Unable to load active staff."
        );

    }

}


// =====================================================
// OPEN ISSUE MODAL
// =====================================================

window.issueDocument =
    async function(
        documentId
    ) {

        const documentItem =
            loanDocuments.find(
                item =>
                    item.id ===
                    documentId
            );


        if (!documentItem) {

            showMessage(
                "Document not found."
            );

            return;

        }


        /*
         * Only Received document can
         * be issued to staff.
         */

        if (
            String(
                documentItem.status ||
                ""
            ).toLowerCase() !==
            "received"
        ) {

            showMessage(
                "Only received documents can be issued to staff."
            );

            return;

        }


        selectedIssueDocumentId =
            documentId;


        if (issueDocumentName) {

            issueDocumentName.textContent =
                documentItem.documentType ||
                "Document";

        }


        if (issueDateInput) {

            issueDateInput.value =
                getTodayDate();

        }


        if (issueRemarksInput) {

            issueRemarksInput.value =
                "";

        }


        await loadActiveStaff();


        if (documentIssueModal) {

            documentIssueModal.style.display =
                "flex";

        }

    };


// =====================================================
// CLOSE ISSUE MODAL
// =====================================================

function closeIssueModal() {

    selectedIssueDocumentId =
        null;


    if (documentIssueModal) {

        documentIssueModal.style.display =
            "none";

    }


    if (issueStaffSelect) {

        issueStaffSelect.value =
            "";

    }


    if (issueRemarksInput) {

        issueRemarksInput.value =
            "";

    }

}


if (closeIssueModalBtn) {

    closeIssueModalBtn.addEventListener(
        "click",
        closeIssueModal
    );

}


if (cancelIssueBtn) {

    cancelIssueBtn.addEventListener(
        "click",
        closeIssueModal
    );

}


// =====================================================
// CONFIRM ISSUE
// =====================================================

if (confirmIssueBtn) {

    confirmIssueBtn.addEventListener(
        "click",
        async function() {

            if (
                !selectedIssueDocumentId
            ) {

                showMessage(
                    "Document not selected."
                );

                return;

            }


            const staffDocumentId =
                issueStaffSelect.value;


            if (!staffDocumentId) {

                showMessage(
                    "Please select staff."
                );

                return;

            }


            const staff =
                staffList.find(
                    item =>
                        item.id ===
                        staffDocumentId
                );


            if (!staff) {

                showMessage(
                    "Selected staff not found."
                );

                return;

            }


            const issueDate =
                issueDateInput.value ||
                getTodayDate();


            const remarks =
                issueRemarksInput.value.trim();


            const documentItem =
                loanDocuments.find(
                    item =>
                        item.id ===
                        selectedIssueDocumentId
                );


            if (!documentItem) {

                showMessage(
                    "Document not found."
                );

                return;

            }


            confirmIssueBtn.disabled =
                true;


            confirmIssueBtn.textContent =
                "Issuing...";


            try {

                const history =
                    Array.isArray(
                        documentItem.history
                    )
                        ? [
                            ...documentItem.history
                        ]
                        : [];


                history.push({

                    action:
                        "Document Issued to Staff",

                    status:
                        "Issued",

                    currentHolder:
                        "Staff",

                    staffId:
                        staff.id,

                    staffCode:
                        staff.staffId,

                    staffName:
                        staff.name,

                    date:
                        issueDate,

                    remarks:
                        remarks

                });


                const documentRef =
                    doc(
                        db,
                        "documents",
                        selectedIssueDocumentId
                    );


                await updateDoc(
                    documentRef,
                    {

                        status:
                            "Issued",

                        currentHolder:
                            "Staff",

                        staffId:
                            staff.id,

                        staffCode:
                            staff.staffId,

                        staffName:
                            staff.name,

                        issuedDate:
                            issueDate,

                        lastAction:
                            "Document Issued to Staff",

                        lastActionDate:
                            issueDate,

                        remarks:
                            remarks,

                        history:
                            history,

                        updatedAt:
                            serverTimestamp(),

                        updatedBy:
                            currentUser.uid

                    }
                );


                closeIssueModal();


                showMessage(
                    `${documentItem.documentType} issued to ${staff.name}.`,
                    "success"
                );


                await loadDocuments();


            } catch (error) {

                console.error(
                    "Document issue error:",
                    error
                );


                showMessage(
                    "Unable to issue document."
                );

            } finally {

                confirmIssueBtn.disabled =
                    false;

                confirmIssueBtn.textContent =
                    "Issue Document";

            }

        }
    );

}


// =====================================================
// CLOSE MODAL ON OUTSIDE CLICK
// =====================================================

if (documentIssueModal) {

    documentIssueModal.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                documentIssueModal
            ) {

                closeIssueModal();

            }

        }
    );

}

// =====================================================
// RETURN DOCUMENT
// =====================================================

window.returnDocument =
    async function(
        documentId
    ) {

        const documentItem =
            loanDocuments.find(
                item =>
                    item.id ===
                    documentId
            );


        if (!documentItem) {
            return;
        }


        const confirmed =
            confirm(
                `Return ${documentItem.documentType} from ${documentItem.staffName || "staff"}?`
            );


        if (!confirmed) {
            return;
        }


        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        const history =
            Array.isArray(
                documentItem.history
            )
                ? [
                    ...documentItem.history
                ]
                : [];


        history.push({

            action:
                "Document Returned",

            status:
                "Returned",

            currentHolder:
                "Office",

            staffId:
                documentItem.staffId ||
                "",

            staffName:
                documentItem.staffName ||
                "",

            date:
                today,

            remarks:
                "Document returned to office."

        });


        await updateDocument(

            documentId,

            {

                status:
                    "Returned",

                currentHolder:
                    "Office",

                returnedDate:
                    today,

                lastAction:
                    "Document Returned",

                lastActionDate:
                    today,

                history:
                    history

            },

            `${documentItem.documentType} returned successfully.`

        );

    };


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


        await loadLoan();

    }
);
