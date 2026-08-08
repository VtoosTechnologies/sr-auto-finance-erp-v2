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

const headerCloseLoanBtn =
    document.getElementById(
        "headerCloseLoanBtn"
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
// STATE
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
// GET NUMBER FROM MULTIPLE FIELDS
// =====================================================

function getNumber(
    ...values
) {

    for (
        const value of values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(value);


            if (
                !isNaN(number)
            ) {

                return number;

            }

        }

    }


    return 0;

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


    // =================================================
    // BASIC LOAN
    // =================================================

    setText(
        "loanId",
        loan.loanId ||
        loan.loanNumber ||
        loan.id
    );


    setText(
        "loanType",
        String(
            loan.loanType ||
            "New Loan"
        ).toLowerCase() === "reloan"
            ? "ReLoan"
            : "New Loan"
    );


    setText(
        "loanDate",
        formatDate(
            loan.loanDate
        )
    );


    setText(
        "loanDuration",
        loan.duration ||
        loan.loanDuration ||
        loan.tenure
            ? `${loan.duration || loan.loanDuration || loan.tenure} Months`
            : "-"
    );


    const interestRate =
        getNumber(
            loan.interestRate,
            loan.rateOfInterest,
            loan.interest
        );


    setText(
        "interestRate",
        interestRate
            ? `${interestRate}%`
            : "-"
    );


    // =================================================
    // STATUS
    // =================================================

    const statusElement =
        document.getElementById(
            "loanStatus"
        );


    const status =
        loan.status ||
        "Active";


    if (statusElement) {

        const statusLower =
            String(
                status
            ).toLowerCase();


        statusElement.innerHTML = `
            <span class="status ${
                statusLower === "closed" ||
                statusLower === "completed"
                    ? "closed"
                    : ""
            }">
                ${escapeHTML(status)}
            </span>
        `;

    }


    // =================================================
    // CUSTOMER
    // =================================================

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
        loan.previousLoanNumber ||
        "-"
    );


    // =================================================
    // VEHICLE
    // =================================================

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
        loan.chassisNo ||
        "-"
    );


    setText(
        "engineNumber",
        loan.engineNumber ||
        loan.engineNo ||
        "-"
    );


    setText(
        "showroomName",
        loan.showroomName ||
        loan.showroom ||
        "-"
    );


    setText(
        "bookingId",
        loan.showroomBookingId ||
        loan.bookingId ||
        "-"
    );


    // =================================================
    // FINANCIAL
    // =================================================

    const loanAmount =
        getNumber(
            loan.loanAmount,
            loan.principalAmount,
            loan.amount
        );


    const installment =
        getNumber(
            loan.installmentAmount,
            loan.monthlyInstallment,
            loan.emi
        );


    const penalty =
        getNumber(
            loan.penaltyAmount,
            loan.penalty,
            loan.totalPenalty
        );


    const outstanding =
        getNumber(
            loan.outstandingAmount,
            loan.balanceAmount,
            loan.remainingAmount
        );


    setText(
        "loanAmount",
        formatCurrency(
            loanAmount
        )
    );


    setText(
        "installment",
        formatCurrency(
            installment
        )
    );


    setText(
        "penaltyAmount",
        formatCurrency(
            penalty
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            outstanding
        )
    );


    // =================================================
    // PAYMENT SUMMARY
    // =================================================

    const totalPaid =
        getNumber(
            loan.totalPaid,
            loan.paidAmount,
            loan.totalCollection
        );


    const totalInstallments =
        getNumber(
            loan.totalInstallments,
            loan.installments,
            loan.duration,
            loan.loanDuration,
            loan.tenure
        );


    const paidInstallments =
        getNumber(
            loan.paidInstallments,
            loan.installmentsPaid
        );


    const pendingInstallments =
        getNumber(
            loan.pendingInstallments,
            loan.installmentsPending
        );


    setText(
        "totalPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "totalInstallments",
        totalInstallments || 0
    );


    setText(
        "paidInstallments",
        paidInstallments || 0
    );


    setText(
        "pendingInstallments",
        pendingInstallments || 0
    );


    // =================================================
    // DUE INFORMATION
    // =================================================

    setText(
        "firstDueDate",
        formatDate(
            loan.firstDueDate
        )
    );


    setText(
        "nextDueDate",
        formatDate(
            loan.nextDueDate
        )
    );


    setText(
        "lastPaymentDate",
        formatDate(
            loan.lastPaymentDate
        )
    );


    const lastPaymentAmount =
        getNumber(
            loan.lastPaymentAmount,
            loan.lastPaidAmount
        );


    setText(
        "lastPaymentAmount",
        formatCurrency(
            lastPaymentAmount
        )
    );


    // =================================================
    // CLOSING SUMMARY
    // =================================================

    renderClosingSummary();


    // =================================================
    // CLOSE BUTTON
    // =================================================

    updateCloseButton();

}


// =====================================================
// CLOSING SUMMARY
// =====================================================

function renderClosingSummary() {

    const card =
        document.getElementById(
            "closingSummaryCard"
        );


    if (!currentLoan) {
        return;
    }


    const status =
        String(
            currentLoan.status ||
            ""
        ).toLowerCase();


    if (
        status !== "closed" &&
        status !== "completed"
    ) {

        if (card) {

            card.style.display =
                "none";

        }

        return;

    }


    if (card) {

        card.style.display =
            "block";

    }


    const calculatedOverallDue =
        getNumber(
            currentLoan.calculatedOverallDue
        );


    const closingPenalty =
        getNumber(
            currentLoan.closingPenalty,
            currentLoan.penaltyAmount
        );


    const closingWaiver =
        getNumber(
            currentLoan.closingWaiver,
            currentLoan.waiverAmount
        );


    const finalSettlement =
        getNumber(
            currentLoan.finalSettlementAmount,
            currentLoan.agreedClosingAmount,
            currentLoan.settlementAmount
        );


    setText(
        "calculatedOverallDue",
        formatCurrency(
            calculatedOverallDue
        )
    );


    setText(
        "closingPenalty",
        formatCurrency(
            closingPenalty
        )
    );


    setText(
        "closingWaiver",
        formatCurrency(
            closingWaiver
        )
    );


    setText(
        "finalSettlement",
        formatCurrency(
            finalSettlement
        )
    );


    setText(
        "closedDate",
        formatDate(
            currentLoan.closedDate ||
            currentLoan.closingDate
        )
    );


    setText(
        "closingRemarks",
        currentLoan.closingRemarks ||
        "-"
    );

}


// =====================================================
// CLOSE BUTTON
// =====================================================

function updateCloseButton() {

    if (!headerCloseLoanBtn) {
        return;
    }


    const status =
        String(
            currentLoan?.status ||
            "Active"
        ).toLowerCase();


    if (
        status === "active"
    ) {

        headerCloseLoanBtn.style.display =
            "block";

        return;

    }


    headerCloseLoanBtn.style.display =
        "none";

}


// =====================================================
// CLOSE LOAN NAVIGATION
// =====================================================

if (headerCloseLoanBtn) {

    headerCloseLoanBtn.addEventListener(
        "click",
        function() {

            if (!loanDocumentId) {
                return;
            }


            window.location.href =
                `loan-close.html?id=${
                    encodeURIComponent(
                        loanDocumentId
                    )
                }`;

        }
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


        const documentsRef =
            collection(
                db,
                "documents"
            );


        /*
         * IMPORTANT
         *
         * Only this loan's documents
         * are loaded.
         */

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


        // =================================================
        // SORT
        // =================================================

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
                    (
                        order[
                            a.documentType
                        ] || 99
                    )
                    -
                    (
                        order[
                            b.documentType
                        ] || 99
                    )
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
        ).toLowerCase();


    if (
        value === "received"
    ) {

        return "received";

    }


    if (
        value === "issued"
    ) {

        return "issued";

    }


    if (
        value === "returned"
    ) {

        return "returned";

    }


    return "pending";

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


    if (
        status === "pending"
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
        status === "received"
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
        status === "issued"
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
        status === "returned"
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

                            <span
                                class="
                                    badge
                                    ${statusClass}
                                "
                            >
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


        const status =
            String(
                documentItem.status ||
                "Pending"
            ).toLowerCase();


        if (
            status === "issued"
        ) {

            showMessage(
                "Document is currently with staff. Return it first."
            );

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

            staffCode:
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
// STAFF LIST
// =====================================================

let staffList = [];

let selectedIssueDocumentId =
    null;


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
                        "active"
                    ).toLowerCase();


                const active =
                    data.active !== false;


                if (
                    status !== "active" &&
                    data.status
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
// ISSUE DOCUMENT
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


        const status =
            String(
                documentItem.status ||
                ""
            ).toLowerCase();


        if (
            status !== "received"
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


        if (
            !staffList.length
        ) {

            showMessage(
                "No active staff available."
            );

            return;

        }


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
                issueStaffSelect?.value;


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
                issueDateInput?.value ||
                getTodayDate();


            const remarks =
                issueRemarksInput?.value.trim() ||
                "";


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


        const status =
            String(
                documentItem.status ||
                ""
            ).toLowerCase();


        if (
            status !== "issued"
        ) {

            showMessage(
                "Only issued documents can be returned."
            );

            return;

        }


        const confirmed =
            confirm(
                `Return ${documentItem.documentType} from ${
                    documentItem.staffName ||
                    "staff"
                }?`
            );


        if (!confirmed) {
            return;
        }


        const today =
            getTodayDate();


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

            staffCode:
                documentItem.staffCode ||
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
// MODAL OUTSIDE CLICK
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
