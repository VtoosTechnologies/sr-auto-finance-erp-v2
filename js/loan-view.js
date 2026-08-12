// =====================================================
// SR AUTO FINANCE ERP
// LOAN VIEW CONTROLLER
// File: js/loan-view.js
// =====================================================

import { auth, db } from "./firebase-config.js";

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
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// =====================================================
// GLOBAL STATE
// =====================================================

let currentLoan = null;
let currentCustomer = null;
let currentUser = null;
let loanDocuments = [];
let repaymentPayments = [];
let repaymentSchedule = [];


// =====================================================
// URL
// =====================================================

const urlParams = new URLSearchParams(
    window.location.search
);

const loanDocumentId =
    urlParams.get("id") ||
    urlParams.get("loanId");


// =====================================================
// HELPERS
// =====================================================

function getElement(id) {

    return document.getElementById(id);

}


function setText(
    id,
    value
) {

    const element =
        getElement(id);

    if (element) {

        element.textContent =
            value ?? "-";

    }

}


function showElement(id) {

    const element =
        getElement(id);

    if (element) {

        element.style.display =
            "";

    }

}


function hideElement(id) {

    const element =
        getElement(id);

    if (element) {

        element.style.display =
            "none";

    }

}


function getNumber(...values) {

    for (
        const value of values
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            continue;

        }


        const number =
            Number(
                String(value)
                    .replace(
                        /,/g,
                        ""
                    )
                    .replace(
                        /₹/g,
                        ""
                    )
                    .replace(
                        /\$/g,
                        ""
                    )
                    .trim()
            );


        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }


    return 0;

}


function firstValue(
    object,
    fields,
    fallback = ""
) {

    for (
        const field of fields
    ) {

        const value =
            object?.[field];


        if (
            value !== undefined &&
            value !== null &&
            String(
                value
            ).trim() !== ""
        ) {

            return value;

        }

    }


    return fallback;

}


function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0
        }
    ).format(
        getNumber(value)
    );

}


function formatDate(value) {

    if (!value) {

        return "-";

    }


    try {

        const date =
            value &&
            typeof value.toDate ===
                "function"

                ? value.toDate()

                : new Date(value);


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
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"
            }
        );

    } catch (
        error
    ) {

        return "-";

    }

}


function toScheduleDate(value) {

    if (!value) {

        return null;

    }


    try {

        const date =
            value &&
            typeof value.toDate ===
                "function"

                ? value.toDate()

                : new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

    } catch (
        error
    ) {

        return null;

    }

}


function scheduleDateKey(value) {

    const date =
        toScheduleDate(
            value
        );


    if (!date) {

        return "";

    }


    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


function escapeHTML(value) {

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


function getTodayDate() {

    const date =
        new Date();


    return [

        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


function showMessage(text) {

    const element =
        getElement(
            "message"
        );


    if (!element) {

        alert(text);

        return;

    }


    element.textContent =
        text;


    element.style.display =
        "block";


    clearTimeout(
        showMessage.timer
    );


    showMessage.timer =
        setTimeout(
            () => {

                element.style.display =
                    "none";

            },
            3500
        );

}


// =====================================================
// AUTH / INITIAL LOAD
// =====================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        currentUser =
            user;


        await loadLoan();


        setupPageControls();

    }
);


// =====================================================
// LOAD LOAN
// =====================================================

async function loadLoan() {

    if (!loanDocumentId) {

        showMessage(
            "Loan ID is missing."
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


        if (
            !loanSnap.exists()
        ) {

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


        await loadCustomer();


        renderLoan();


    } catch (
        error
    ) {

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
// LOAD CUSTOMER
// =====================================================

async function loadCustomer() {

    if (!currentLoan) {

        return;

    }


    const customerDocumentId =
        firstValue(
            currentLoan,
            [
                "customerDocumentId",
                "customerId"
            ]
        );


    if (
        !customerDocumentId
    ) {

        return;

    }


    try {

        const customerRef =
            doc(
                db,
                "customers",
                customerDocumentId
            );


        const customerSnap =
            await getDoc(
                customerRef
            );


        if (
            customerSnap.exists()
        ) {

            currentCustomer = {

                id:
                    customerSnap.id,

                ...customerSnap.data()

            };

        }

    } catch (
        error
    ) {

        console.warn(
            "Customer loading error:",
            error
        );

    }

}


// =====================================================
// RENDER LOAN
// =====================================================

function renderLoan() {

    const loan =
        currentLoan || {};


    const customer =
        currentCustomer || {};


    const loanNumber =
        firstValue(
            loan,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ],
            loan.id || "-"
        );


    setText(
        "loanId",
        loanNumber
    );


    setText(
        "loanNumber",
        loanNumber
    );


    setText(
        "loanType",
        loan.loanType ===
            "reloan"

            ? "ReLoan"

            : (
                loan.loanType ||
                "New Loan"
            )
    );


    setText(
        "customerId",
        firstValue(
            loan,
            [
                "customerId",
                "customerCode"
            ],
            customer.id || "-"
        )
    );


    setText(
        "customerName",
        firstValue(
            loan,
            [
                "customerName"
            ],
            firstValue(
                customer,
                [
                    "name",
                    "customerName",
                    "fullName"
                ],
                "-"
            )
        )
    );


    setText(
        "customerMobile",
        firstValue(
            loan,
            [
                "customerMobile",
                "mobile",
                "phone"
            ],
            firstValue(
                customer,
                [
                    "mobile",
                    "phone",
                    "mobileNumber"
                ],
                "-"
            )
        )
    );


    setText(
        "loanDate",
        formatDate(
            firstValue(
                loan,
                [
                    "loanDate",
                    "createdAt"
                ]
            )
        )
    );


    setText(
        "status",
        firstValue(
            loan,
            [
                "status"
            ],
            "Active"
        )
    );


    renderVehicle();


    renderFinancialSummary();


    renderInterestDetails();


    renderLoanDates();


    renderClosingSummary();


    loadLoanDocuments();


    loadRepaymentSchedule();

}
// =====================================================
// CLOSE BUTTON
// =====================================================

function updateCloseButton() {

    const button =
        getElement(
            "headerCloseLoanBtn"
        );


    if (!button) {
        return;
    }


    const status =
        String(
            currentLoan?.status ||
            "Active"
        ).toLowerCase();


    button.style.display =
        status === "active"
            ? "block"
            : "none";

}


function setupCloseButton() {

    const button =
        getElement(
            "headerCloseLoanBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            if (!loanDocumentId) {
                return;
            }


            window.location.href =
                `loan-close.html?id=${encodeURIComponent(
                    loanDocumentId
                )}`;

        }
    );

}


// =====================================================
// CLOSING SUMMARY
// =====================================================

function renderClosingSummary() {

    const card =
        getElement(
            "closingSummaryCard"
        );


    if (
        !card ||
        !currentLoan
    ) {
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

        card.style.display =
            "none";

        return;

    }


    card.style.display =
        "block";


    setText(
        "calculatedOverallDue",
        formatCurrency(
            getNumber(
                currentLoan.calculatedOverallDue
            )
        )
    );


    setText(
        "closingPenalty",
        formatCurrency(
            getNumber(
                currentLoan.closingPenalty,
                currentLoan.penaltyAmount
            )
        )
    );


    setText(
        "closingWaiver",
        formatCurrency(
            getNumber(
                currentLoan.closingWaiver,
                currentLoan.waiverAmount
            )
        )
    );


    setText(
        "finalSettlement",
        formatCurrency(
            getNumber(
                currentLoan.finalSettlementAmount,
                currentLoan.agreedClosingAmount,
                currentLoan.settlementAmount
            )
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
        firstValue(
            currentLoan,
            [
                "closingRemarks",
                "closureRemarks"
            ],
            "-"
        )
    );


    setText(
        "documentReturnStatus",
        firstValue(
            currentLoan,
            [
                "documentReturnStatus"
            ],
            currentLoan.documentReturned
                ? "Returned"
                : "Not Returned"
        )
    );

}


// =====================================================
// DOCUMENTS
// TOP-LEVEL COLLECTION
// =====================================================
//
// IMPORTANT:
//
// loan-form.js creates documents in:
//
//     documents
//
// and links them using:
//
//     loanDocumentId
//
// Therefore DO NOT use:
//
//     loans/{loanId}/documents
//
// =====================================================

async function loadDocuments() {

    const tableBody =
        getElement(
            "documentTableBody"
        );


    const container =
        getElement(
            "loanDocuments"
        );


    if (
        !loanDocumentId
    ) {
        return;
    }


    if (
        tableBody
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty">
                        Loading documents...
                    </div>
                </td>
            </tr>
        `;

    } else if (
        container
    ) {

        container.innerHTML = `
            <div class="empty">
                Loading documents...
            </div>
        `;

    }


    try {

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


        loanDocuments =
            snapshot.docs.map(
                documentSnap => ({

                    id:
                        documentSnap.id,

                    ...documentSnap.data()

                })
            );


        const order = {

            "Aadhaar Card":
                1,

            "PAN Card":
                2,

            "RC Book":
                3,

            "Insurance":
                4,

            "Sale Invoice":
                5

        };


        loanDocuments.sort(
            (
                first,
                second
            ) => {

                return (
                    (
                        order[
                            first.documentType
                        ] ||
                        99
                    ) -
                    (
                        order[
                            second.documentType
                        ] ||
                        99
                    )
                );

            }
        );


        renderDocuments();


    } catch (
        error
    ) {

        console.error(
            "Documents loading error:",
            error
        );


        if (
            tableBody
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty">
                            Unable to load loan documents.
                        </div>
                    </td>
                </tr>
            `;

        } else if (
            container
        ) {

            container.innerHTML = `
                <div class="empty">
                    Unable to load loan documents.
                </div>
            `;

        }

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
                type="button"
                class="action-btn"
                onclick="receiveDocument('${documentItem.id}')"
            >
                Receive
            </button>
        `;

    }


    if (
        status === "issued"
    ) {

        return `
            <button
                type="button"
                class="action-btn"
                onclick="returnDocument('${documentItem.id}')"
            >
                Return
            </button>
        `;

    }


    if (
        status === "received"
    ) {

        return `
            <button
                type="button"
                class="action-btn"
                onclick="returnDocument('${documentItem.id}')"
            >
                Return
            </button>
        `;

    }


    return "-";

}


// =====================================================
// RENDER DOCUMENTS
// =====================================================

function renderDocuments() {

    const tableBody =
        getElement(
            "documentTableBody"
        );


    const container =
        getElement(
            "loanDocuments"
        );


    if (
        !loanDocuments.length
    ) {

        if (
            tableBody
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty">
                            No loan documents available.
                        </div>
                    </td>
                </tr>
            `;

        } else if (
            container
        ) {

            container.innerHTML = `
                <div class="empty">
                    No loan documents available.
                </div>
            `;

        }

        return;

    }


    if (
        tableBody
    ) {

        tableBody.innerHTML =
            loanDocuments
                .map(
                    documentItem => {

                        const status =
                            documentItem.status ||
                            "Pending";


                        const statusClass =
                            getDocumentStatusClass(
                                status
                            );


                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        documentItem.documentName ||
                                        documentItem.documentType ||
                                        "Document"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        documentItem.documentType ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    <span
                                        class="badge ${statusClass}"
                                    >
                                        ${escapeHTML(
                                            status
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        documentItem.currentHolder ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        documentItem.staffName ||
                                        "-"
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
                )
                .join("");

        return;

    }


    if (
        container
    ) {

        container.innerHTML =
            loanDocuments
                .map(
                    documentItem => {

                        const status =
                            documentItem.status ||
                            "Pending";


                        const statusClass =
                            getDocumentStatusClass(
                                status
                            );


                        return `
                            <div
                                class="document-item"
                            >

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            documentItem.documentName ||
                                            documentItem.documentType ||
                                            "Document"
                                        )}
                                    </strong>

                                    <div>
                                        ${escapeHTML(
                                            documentItem.documentType ||
                                            "-"
                                        )}
                                    </div>

                                    <div>
                                        <span
                                            class="badge ${statusClass}"
                                        >
                                            ${escapeHTML(
                                                status
                                            )}
                                        </span>
                                    </div>

                                </div>

                            </div>
                        `;

                    }
                )
                .join("");

    }

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
                    currentUser?.uid ||
                    ""

            }
        );


        await loadDocuments();


        showMessage(
            successMessage
        );


    } catch (
        error
    ) {

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

        const item =
            loanDocuments.find(
                document =>
                    document.id ===
                    documentId
            );


        if (!item) {

            return;

        }


        const status =
            String(
                item.status ||
                "Pending"
            ).toLowerCase();


        if (
            status === "returned"
        ) {

            showMessage(
                "This document has already been returned."
            );

            return;

        }


        if (
            status === "issued"
        ) {

            showMessage(
                "Document is currently with staff. Return it first."
            );

            return;

        }


        if (
            !confirm(
                `Receive ${
                    item.documentType ||
                    "document"
                }?`
            )
        ) {

            return;

        }


        const today =
            getTodayDate();


        const history =
            Array.isArray(
                item.history
            )
                ? [
                    ...item.history
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

                history

            },
            `${
                item.documentType ||
                "Document"
            } received successfully.`
        );

    };


// =====================================================
// RETURN DOCUMENT
// =====================================================

window.returnDocument =
    async function(
        documentId
    ) {

        const item =
            loanDocuments.find(
                document =>
                    document.id ===
                    documentId
            );


        if (!item) {

            return;

        }


        const status =
            String(
                item.status ||
                ""
            ).toLowerCase();


        if (
            status !== "received" &&
            status !== "issued"
        ) {

            showMessage(
                "Only received or issued documents can be returned."
            );

            return;

        }


        if (
            !confirm(
                `Return ${
                    item.documentType ||
                    "document"
                } to customer?`
            )
        ) {

            return;

        }


        const today =
            getTodayDate();


        const history =
            Array.isArray(
                item.history
            )
                ? [
                    ...item.history
                ]
                : [];


        history.push({

            action:
                "Document Returned to Customer",

            status:
                "Returned",

            currentHolder:
                "Customer",

            staffId:
                item.staffId ||
                "",

            staffCode:
                item.staffCode ||
                "",

            staffName:
                item.staffName ||
                "",

            date:
                today,

            remarks:
                "Document returned to customer."

        });


        await updateDocument(
            documentId,
            {

                status:
                    "Returned",

                currentHolder:
                    "Customer",

                returnedDate:
                    today,

                lastAction:
                    "Document Returned to Customer",

                lastActionDate:
                    today,

                history

            },
            `${
                item.documentType ||
                "Document"
            } returned to customer successfully.`
        );

    };
// =====================================================
// LOAN VEHICLE DETAILS
// =====================================================

function renderVehicle() {

    const loan =
        currentLoan || {};


    const vehicle =
        [
            firstValue(
                loan,
                [
                    "vehicleBrand",
                    "brand"
                ]
            ),

            firstValue(
                loan,
                [
                    "vehicleModel",
                    "model"
                ]
            )
        ]
        .filter(Boolean)
        .join(" ");


    setText(
        "vehicle",
        vehicle || "-"
    );


    setText(
        "vehicleNumber",
        firstValue(
            loan,
            [
                "vehicleNumber",
                "registrationNumber",
                "regNumber"
            ],
            "-"
        )
    );


    setText(
        "chassisNumber",
        firstValue(
            loan,
            [
                "chassisNumber",
                "chassisNo"
            ],
            "-"
        )
    );


    setText(
        "engineNumber",
        firstValue(
            loan,
            [
                "engineNumber",
                "engineNo"
            ],
            "-"
        )
    );


    setText(
        "vehicleYear",
        firstValue(
            loan,
            [
                "vehicleYear",
                "manufactureYear"
            ],
            "-"
        )
    );

}


// =====================================================
// FINANCIAL SUMMARY
// =====================================================

function renderFinancialSummary() {

    const loan =
        currentLoan || {};


    const loanAmount =
        getLoanPrincipal();


    const interestAmount =
        getLoanInterest();


    const totalPayable =
        getLoanTotalPayable();


    const paidAmount =
        getLoanPaidAmount();


    /*
     * IMPORTANT:
     *
     * Never use stored outstandingAmount /
     * balanceAmount as the primary source.
     *
     * Outstanding must be calculated:
     *
     * Total Payable - Actual Paid
     *
     * If repayment schedule is already available,
     * getLoanOutstanding() uses the schedule pending amount.
     */
    const outstanding =
        getLoanOutstanding();


    const installment =
        getNumber(
            loan.installmentAmount,
            loan.monthlyEMI,
            loan.emiAmount,
            loan.installment
        );


    setText(
        "loanAmount",
        formatCurrency(
            loanAmount
        )
    );


    setText(
        "principalAmount",
        formatCurrency(
            loanAmount
        )
    );


    setText(
        "interestAmount",
        formatCurrency(
            interestAmount
        )
    );


    setText(
        "totalInterest",
        formatCurrency(
            interestAmount
        )
    );


    setText(
        "totalPayable",
        formatCurrency(
            totalPayable
        )
    );


    setText(
        "totalAmount",
        formatCurrency(
            totalPayable
        )
    );


    setText(
        "totalPaid",
        formatCurrency(
            paidAmount
        )
    );


    setText(
        "paidAmount",
        formatCurrency(
            paidAmount
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "outstandingAmount",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "balanceAmount",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "installment",
        formatCurrency(
            installment
        )
    );


    setText(
        "installmentAmount",
        formatCurrency(
            installment
        )
    );

}


// =====================================================
// INTEREST DETAILS
// =====================================================

function renderInterestDetails() {

    const loan =
        currentLoan || {};


    const annualRate =
        getNumber(
            loan.interestRate
        );


    let monthlyRate =
        getNumber(
            loan.interestRateMonthly
        );


    /*
     * If monthly rate was not stored in the
     * loan document, calculate it from yearly rate.
     *
     * Example:
     *
     * 24% yearly
     * / 12
     * = 2% monthly
     */

    if (
        monthlyRate === 0 &&
        annualRate !== 0
    ) {

        monthlyRate =
            annualRate / 12;

    }


    const interestType =
        firstValue(
            loan,
            [
                "interestType"
            ],
            "Flat"
        );


    const rateText =
        annualRate > 0
            ? `${annualRate.toFixed(2)}% p.a.`
            : "0.00% p.a.";


    const monthlyText =
        monthlyRate > 0
            ? `${monthlyRate.toFixed(2)}% monthly`
            : "0.00% monthly";


    setText(
        "interestRate",
        rateText
    );


    setText(
        "interestRateMonthly",
        monthlyText
    );


    setText(
        "interestType",
        interestType
    );


    /*
     * Some HTML versions have a single
     * interest rate display field.
     */

    const combinedRate =
        `${rateText} (${monthlyText})`;


    const combinedElements = [

        "interestRateDisplay",

        "interestRateText",

        "rateDisplay"

    ];


    combinedElements.forEach(
        id => {

            const element =
                getElement(id);


            if (
                element &&
                !element.dataset.separateRate
            ) {

                element.textContent =
                    combinedRate;

            }

        }
    );

}


// =====================================================
// LOAN DATES
// =====================================================

function renderLoanDates() {

    const loan =
        currentLoan || {};


    setText(
        "firstDueDate",
        formatDate(
            firstValue(
                loan,
                [
                    "firstDueDate",
                    "firstInstallmentDate"
                ]
            )
        )
    );


    setText(
        "nextDueDate",
        formatDate(
            firstValue(
                loan,
                [
                    "nextDueDate",
                    "nextInstallmentDate"
                ]
            )
        )
    );


    setText(
        "maturityDate",
        formatDate(
            firstValue(
                loan,
                [
                    "maturityDate",
                    "endDate"
                ]
            )
        )
    );


    setText(
        "startDate",
        formatDate(
            firstValue(
                loan,
                [
                    "loanDate",
                    "startDate",
                    "createdAt"
                ]
            )
        )
    );


    setText(
        "loanDuration",
        firstValue(
            loan,
            [
                "loanDuration",
                "tenure",
                "duration"
            ],
            "-"
        )
    );

}


// =====================================================
// LOAD LOAN DOCUMENTS
// =====================================================

async function loadLoanDocuments() {

    await loadDocuments();

}


// =====================================================
// PAYMENT HELPERS
// =====================================================

function getPaymentDate(
    payment
) {

    return firstValue(
        payment,
        [
            "paymentDate",
            "collectionDate",
            "date",
            "paidDate",
            "createdAt"
        ]
    );

}


function getPaymentAmount(
    payment
) {

    /*
     * IMPORTANT:
     *
     * totalCollection is NOT used here.
     *
     * totalCollection may include penalty.
     *
     * Loan repayment should use only
     * actual EMI / loan payment amount.
     */

    return getNumber(
        payment.emiPaid,
        payment.amountReceived,
        payment.paidAmount,
        payment.paymentAmount,
        payment.amount
    );

}


function getPaymentPenalty(
    payment
) {

    return getNumber(
        payment.penalty,
        payment.penaltyAmount,
        payment.interestPenalty,
        payment.lateFee
    );

}


function getPaymentBalance(
    payment
) {

    return getNumber(
        payment.balanceAfterPayment,
        payment.outstandingAfterPayment,
        payment.balanceAmount,
        payment.outstandingAmount
    );

}


function getPaymentReceipt(
    payment
) {

    return firstValue(
        payment,
        [
            "receiptNo",
            "receiptNumber",
            "receiptId"
        ],
        "-"
    );

}


// =====================================================
// LOAD PAYMENTS
// =====================================================

async function loadPayments() {

    repaymentPayments = [];


    if (
        !loanDocumentId
    ) {

        return [];

    }


    try {

        const paymentsRef =
            collection(
                db,
                "payments"
            );


        const possibleQueries = [

            query(
                paymentsRef,
                where(
                    "loanDocumentId",
                    "==",
                    loanDocumentId
                )
            ),

            query(
                paymentsRef,
                where(
                    "loanId",
                    "==",
                    loanDocumentId
                )
            )

        ];


        const resultMap =
            new Map();


        for (
            const paymentQuery
            of possibleQueries
        ) {

            try {

                const snapshot =
                    await getDocs(
                        paymentQuery
                    );


                snapshot.forEach(
                    paymentSnap => {

                        resultMap.set(
                            paymentSnap.id,
                            {

                                id:
                                    paymentSnap.id,

                                ...paymentSnap.data()

                            }
                        );

                    }
                );

            } catch (
                queryError
            ) {

                console.warn(
                    "Payment query skipped:",
                    queryError
                );

            }

        }


        repaymentPayments =
            Array.from(
                resultMap.values()
            );


        /*
         * Sort oldest payment first.
         */

        repaymentPayments.sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    toScheduleDate(
                        getPaymentDate(
                            first
                        )
                    );


                const secondDate =
                    toScheduleDate(
                        getPaymentDate(
                            second
                        )
                    );


                if (
                    !firstDate &&
                    !secondDate
                ) {

                    return 0;

                }


                if (!firstDate) {

                    return 1;

                }


                if (!secondDate) {

                    return -1;

                }


                return (
                    firstDate -
                    secondDate
                );

            }
        );


        return repaymentPayments;

    } catch (
        error
    ) {

        console.error(
            "Payments loading error:",
            error
        );


        return [];

    }

}


// =====================================================
// INTEREST CALCULATION HELPERS
// =====================================================

function getAnnualRate() {

    return getNumber(
        currentLoan?.interestRate
    );

}


function getMonthlyRate() {

    let monthlyRate =
        getNumber(
            currentLoan?.interestRateMonthly
        );


    if (
        monthlyRate === 0
    ) {

        monthlyRate =
            getAnnualRate() /
            12;

    }


    return monthlyRate / 100;

}


function getInterestType() {

    return String(
        firstValue(
            currentLoan,
            [
                "interestType"
            ],
            "Flat"
        )
    ).toLowerCase();

}


// =====================================================
// BUILD REPAYMENT SCHEDULE
// =====================================================

function buildRepaymentSchedule() {

    const loan =
        currentLoan || {};


    const principal =
        getNumber(
            loan.loanAmount,
            loan.principalAmount,
            loan.amount
        );


    const totalPayable =
        getNumber(
            loan.totalPayable,
            loan.totalAmount
        );


    const interestAmount =
        getNumber(
            loan.interestAmount,
            loan.totalInterest
        );


    const tenure =
        Math.max(
            Math.round(
                getNumber(
                    loan.loanDuration,
                    loan.tenure,
                    loan.duration,
                    loan.numberOfInstallments
                )
            ),
            0
        );


    const installmentAmount =
        getNumber(
            loan.installmentAmount,
            loan.monthlyEMI,
            loan.emiAmount,
            loan.installment
        );


    if (
        tenure <= 0 ||
        principal <= 0
    ) {

        repaymentSchedule = [];

        return repaymentSchedule;

    }


    /*
     * First due date
     */

    const firstDueDate =
        toScheduleDate(
            firstValue(
                loan,
                [
                    "firstDueDate",
                    "firstInstallmentDate"
                ]
            )
        );


    const startDate =
        firstDueDate ||
        toScheduleDate(
            firstValue(
                loan,
                [
                    "loanDate",
                    "startDate",
                    "createdAt"
                ]
            )
        ) ||
        new Date();


   
    /*
     * Generate schedule when no saved
     * schedule exists.
     */

    const type =
        getInterestType();


    const monthlyRate =
        getMonthlyRate();


    const flatInterestPerMonth =
        tenure > 0
            ? interestAmount /
              tenure
            : 0;


    let balance =
        principal;


    let emi =
        installmentAmount;


    /*
     * Reducing balance EMI.
     */

    if (
        type.includes(
            "reducing"
        ) &&
        monthlyRate > 0
    ) {

        emi =
            principal *
            monthlyRate *
            Math.pow(
                1 +
                monthlyRate,
                tenure
            ) /
            (
                Math.pow(
                    1 +
                    monthlyRate,
                    tenure
                ) -
                1
            );

    }


    if (
        emi <= 0
    ) {

        emi =
            totalPayable /
            tenure;

    }


    repaymentSchedule =
        [];


    for (
        let index = 1;
        index <= tenure;
        index++
    ) {

        const dueDate =
            new Date(
                startDate
            );


        dueDate.setMonth(
            dueDate.getMonth() +
            index -
            1
        );


        let principalDue =
            0;


        let interestDue =
            0;


        if (
            type.includes(
                "reducing"
            )
        ) {

            interestDue =
                balance *
                monthlyRate;


            principalDue =
                Math.max(
                    emi -
                    interestDue,
                    0
                );


            if (
                index === tenure
            ) {

                principalDue =
                    Math.max(
                        balance,
                        0
                    );

            }

        } else {

            interestDue =
                flatInterestPerMonth;


            principalDue =
                Math.max(
                    emi -
                    interestDue,
                    0
                );


            if (
                index === tenure
            ) {

                principalDue =
                    Math.max(
                        principal -
                        (
                            principal -
                            Math.max(
                                balance -
                                principalDue,
                                0
                            )
                        ),
                        0
                    );

            }

        }


        principalDue =
            Math.min(
                principalDue,
                Math.max(
                    balance,
                    0
                )
            );


        const dueAmount =
            index === tenure
                ? (
                    principalDue +
                    interestDue
                )
                : emi;


        repaymentSchedule.push({

            installmentNo:
                index,

            dueDate:
                dueDate.toISOString(),

            dueAmount:
                dueAmount,

            principalDue:
                principalDue,

            interestDue:
                interestDue,

            paidAmount:
                0,

            pendingAmount:
                dueAmount,

            penalty:
                0,

            paidDate:
                "",

            status:
                "Pending"

        });


        balance =
            Math.max(
                balance -
                principalDue,
                0
            );

    }


    return applyPaymentsToSchedule();

}


// =====================================================
// APPLY PAYMENTS TO SCHEDULE
// =====================================================

function applyPaymentsToSchedule() {

    if (
        !Array.isArray(
            repaymentSchedule
        )
    ) {

        repaymentSchedule =
            [];

    }


    /*
     * Reset dynamic payment values.
     */

    repaymentSchedule =
        repaymentSchedule.map(
            row => ({

                ...row,

                paidAmount:
                    0,

                pendingAmount:
                    getNumber(
                        row.dueAmount
                    ),

                penalty:
                    0,

                paidDate:
                    "",

                status:
                    "Pending"

            })
        );


    /*
     * Allocate actual EMI payment
     * against oldest pending installment.
     *
     * Penalty is kept separate.
     */

    for (
        const payment
        of repaymentPayments
    ) {

        let remaining =
            getPaymentAmount(
                payment
            );


        const penalty =
            getPaymentPenalty(
                payment
            );


        const paymentDate =
            getPaymentDate(
                payment
            );


        if (
            remaining <= 0
        ) {

            continue;

        }


        for (
            const row
            of repaymentSchedule
        ) {

            if (
                remaining <= 0
            ) {

                break;

            }


            const due =
                getNumber(
                    row.dueAmount
                );


            const alreadyPaid =
                getNumber(
                    row.paidAmount
                );


            const pending =
                Math.max(
                    due -
                    alreadyPaid,
                    0
                );


            if (
                pending <= 0
            ) {

                continue;

            }


            const allocated =
                Math.min(
                    remaining,
                    pending
                );


            row.paidAmount +=
                allocated;


            row.pendingAmount =
                Math.max(
                    due -
                    row.paidAmount,
                    0
                );


            row.paidDate =
                paymentDate;


            row.status =
                row.pendingAmount <= 0
                    ? "Paid"
                    : "Partial";


            remaining -=
                allocated;


            if (
                penalty > 0
            ) {

                row.penalty +=
                    penalty;

            }

        }

    }


    /*
     * Final status cleanup.
     */

    repaymentSchedule =
        repaymentSchedule.map(
            row => {

                const due =
                    getNumber(
                        row.dueAmount
                    );


                const paid =
                    getNumber(
                        row.paidAmount
                    );


                const pending =
                    Math.max(
                        due -
                        paid,
                        0
                    );


                let status =
                    "Pending";


                if (
                    pending <= 0
                ) {

                    status =
                        "Paid";

                } else if (
                    paid > 0
                ) {

                    status =
                        "Partial";

                }


                return {

                    ...row,

                    pendingAmount:
                        pending,

                    status:
                        status

                };

            }
        );


    return repaymentSchedule;

}


// =====================================================
// LOAD REPAYMENT SCHEDULE
// =====================================================

async function loadRepaymentSchedule() {

    const body =
        getElement(
            "repaymentScheduleBody"
        );


    if (
        body
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty">
                        Loading repayment schedule...
                    </div>
                </td>
            </tr>
        `;

    }


    try {

        await loadPayments();


        buildRepaymentSchedule();


        renderRepaymentSchedule();


        renderRepaymentSummary();


    } catch (
        error
    ) {

        console.error(
            "Repayment schedule error:",
            error
        );


        if (
            body
        ) {

            body.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty">
                            Unable to load repayment schedule.
                        </div>
                    </td>
                </tr>
            `;

        }

    }

}
// =====================================================
// RENDER REPAYMENT SCHEDULE
// =====================================================

function renderRepaymentSchedule() {

    const body =
        getElement(
            "repaymentScheduleBody"
        );


    if (!body) {

        return;

    }


    if (
        !repaymentSchedule.length
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty">
                        No repayment schedule available.
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        repaymentSchedule
            .map(
                row => {

                    const due =
                        getNumber(
                            row.dueAmount
                        );


                    const paid =
                        getNumber(
                            row.paidAmount
                        );


                    const pending =
                        Math.max(
                            due -
                            paid,
                            0
                        );


                    const penalty =
                        getNumber(
                            row.penalty
                        );


                    const status =
                        row.status ||
                        "Pending";


                    const statusClass =
                        String(
                            status
                        )
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            );


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(
                                    row.installmentNo
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    row.dueDate
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    due
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    paid
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    pending
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    penalty
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    row.paidDate
                                )}
                            </td>

                            <td>
                                <span
                                    class="status-badge ${statusClass}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="schedule-action-btn"
                                    onclick="downloadInstallment(${Number(
                                        row.installmentNo
                                    )})"
                                >
                                    Download
                                </button>
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// =====================================================
// REPAYMENT SUMMARY
// =====================================================

function renderRepaymentSummary() {

    const totalDue =
        repaymentSchedule.reduce(
            (
                total,
                row
            ) => {

                return (
                    total +
                    getNumber(
                        row.dueAmount
                    )
                );

            },
            0
        );


    const totalPaid =
        repaymentSchedule.reduce(
            (
                total,
                row
            ) => {

                return (
                    total +
                    getNumber(
                        row.paidAmount
                    )
                );

            },
            0
        );


    const totalPending =
        repaymentSchedule.reduce(
            (
                total,
                row
            ) => {

                return (
                    total +
                    Math.max(
                        getNumber(
                            row.pendingAmount
                        ),
                        0
                    )
                );

            },
            0
        );


    const totalPenalty =
        repaymentSchedule.reduce(
            (
                total,
                row
            ) => {

                return (
                    total +
                    getNumber(
                        row.penalty
                    )
                );

            },
            0
        );


    const paidInstallments =
        repaymentSchedule.filter(
            row =>
                String(
                    row.status
                ).toLowerCase() ===
                "paid"
        ).length;


    const partialInstallments =
        repaymentSchedule.filter(
            row =>
                String(
                    row.status
                ).toLowerCase() ===
                "partial"
        ).length;


    const pendingInstallments =
        repaymentSchedule.filter(
            row => {

                const pending =
                    Math.max(
                        getNumber(
                            row.pendingAmount
                        ),
                        0
                    );


                return (
                    pending > 0
                );

            }
        ).length;


    const totalInstallments =
        repaymentSchedule.length;


    /*
     * Repayment Schedule Summary
     */

    setText(
        "scheduleTotalDue",
        formatCurrency(
            totalDue
        )
    );


    setText(
        "scheduleTotalPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "scheduleTotalPending",
        formatCurrency(
            totalPending
        )
    );


    setText(
        "scheduleTotalPenalty",
        formatCurrency(
            totalPenalty
        )
    );


    /*
     * Payment Summary
     */

    setText(
        "paidInstallments",
        paidInstallments
    );


    setText(
        "partialInstallments",
        partialInstallments
    );


    setText(
        "pendingInstallments",
        pendingInstallments
    );


    setText(
        "totalInstallments",
        totalInstallments
    );


    /*
     * Common summary fields
     */

    setText(
        "totalPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "paidAmount",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            totalPending
        )
    );


    setText(
        "outstandingAmount",
        formatCurrency(
            totalPending
        )
    );


    setText(
        "balanceAmount",
        formatCurrency(
            totalPending
        )
    );

}

// =====================================================
// PAYMENT DATES
// =====================================================

function renderPaymentDates() {

    const paidRows =
        repaymentSchedule
            .filter(
                row =>
                    getNumber(
                        row.paidAmount
                    ) > 0 &&
                    row.paidDate
            );


    if (
        !paidRows.length
    ) {

        setText(
            "lastPaymentDate",
            "-"
        );


        setText(
            "lastPaymentAmount",
            formatCurrency(
                0
            )
        );


        setText(
            "nextDueDate",
            formatDate(
                firstValue(
                    currentLoan,
                    [
                        "nextDueDate",
                        "nextInstallmentDate"
                    ]
                )
            )
        );


        return;

    }


    const sortedRows =
        [
            ...paidRows
        ].sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    toScheduleDate(
                        first.paidDate
                    );


                const secondDate =
                    toScheduleDate(
                        second.paidDate
                    );


                return (
                    (secondDate?.getTime() || 0) -
                    (firstDate?.getTime() || 0)
                );

            }
        );


    const lastPayment =
        sortedRows[0];


    setText(
        "lastPaymentDate",
        formatDate(
            lastPayment.paidDate
        )
    );


    setText(
        "lastPaymentAmount",
        formatCurrency(
            lastPayment.paidAmount
        )
    );


    const nextRow =
        repaymentSchedule.find(
            row =>
                getNumber(
                    row.pendingAmount
                ) > 0
        );


    if (
        nextRow
    ) {

        setText(
            "nextDueDate",
            formatDate(
                nextRow.dueDate
            )
        );

    }

}


// =====================================================
// NEXT DUE DETAILS
// =====================================================

function getNextDueRow() {

    if (
        !repaymentSchedule.length
    ) {

        return null;

    }


    return (
        repaymentSchedule.find(
            row =>
                getNumber(
                    row.pendingAmount
                ) > 0
        ) ||
        null
    );

}


// =====================================================
// UPDATE NEXT DUE CARD
// =====================================================

function renderNextDue() {

    const row =
        getNextDueRow();


    if (!row) {

        setText(
            "nextDueAmount",
            formatCurrency(
                0
            )
        );


        setText(
            "nextDueDate",
            "-"
        );


        return;

    }


    setText(
        "nextDueAmount",
        formatCurrency(
            row.pendingAmount
        )
    );


    setText(
        "nextDueDate",
        formatDate(
            row.dueDate
        )
    );


    setText(
        "nextInstallmentNo",
        row.installmentNo
    );

}


// =====================================================
// OVERDUE CALCULATION
// =====================================================

function getOverdueRows() {

    const today =
        toScheduleDate(
            getTodayDate()
        );


    if (!today) {

        return [];

    }


    return repaymentSchedule.filter(
        row => {

            const dueDate =
                toScheduleDate(
                    row.dueDate
                );


            const pending =
                getNumber(
                    row.pendingAmount
                );


            if (
                !dueDate ||
                pending <= 0
            ) {

                return false;

            }


            return (
                dueDate <
                today
            );

        }
    );

}


// =====================================================
// OVERDUE SUMMARY
// =====================================================

function renderOverdueSummary() {

    const overdueRows =
        getOverdueRows();


    const overdueAmount =
        overdueRows.reduce(
            (
                total,
                row
            ) => {

                return (
                    total +
                    getNumber(
                        row.pendingAmount
                    )
                );

            },
            0
        );


    setText(
        "overdueInstallments",
        overdueRows.length
    );


    setText(
        "overdueAmount",
        formatCurrency(
            overdueAmount
        )
    );


    /*
     * Some HTML versions use a generic
     * overdue card.
     */

    setText(
        "overdue",
        formatCurrency(
            overdueAmount
        )
    );

}


// =====================================================
// COLLECTION TOTAL
// =====================================================

function getTotalCollection() {

    return repaymentPayments.reduce(
        (
            total,
            payment
        ) => {

            return (
                total +
                getPaymentAmount(
                    payment
                )
            );

        },
        0
    );

}


// =====================================================
// TOTAL PENALTY
// =====================================================

function getTotalPenalty() {

    return repaymentPayments.reduce(
        (
            total,
            payment
        ) => {

            return (
                total +
                getPaymentPenalty(
                    payment
                )
            );

        },
        0
    );

}


// =====================================================
// UPDATE COLLECTION SUMMARY
// =====================================================

function renderCollectionSummary() {

    const collection =
        getTotalCollection();


    const penalty =
        getTotalPenalty();


    const totalReceived =
        collection +
        penalty;


    setText(
        "totalCollection",
        formatCurrency(
            collection
        )
    );


    setText(
        "collectionAmount",
        formatCurrency(
            collection
        )
    );


    setText(
        "totalPenalty",
        formatCurrency(
            penalty
        )
    );


    setText(
        "penaltyCollected",
        formatCurrency(
            penalty
        )
    );


    setText(
        "totalReceived",
        formatCurrency(
            totalReceived
        )
    );

}


// =====================================================
// STATUS SUMMARY
// =====================================================

function renderLoanStatusSummary() {

    const loan =
        currentLoan || {};


    const status =
        String(
            loan.status ||
            "Active"
        );


    const normalizedStatus =
        status.toLowerCase();


    setText(
        "loanStatus",
        status
    );


    const statusElement =
        getElement(
            "loanStatus"
        );


    if (
        statusElement
    ) {

        statusElement.classList.remove(
            "active",
            "closed",
            "pending",
            "overdue"
        );


        if (
            normalizedStatus ===
            "closed"
        ) {

            statusElement.classList.add(
                "closed"
            );

        } else if (
            normalizedStatus ===
            "active"
        ) {

            statusElement.classList.add(
                "active"
            );

        }

    }


    renderNextDue();


    renderOverdueSummary();


    renderCollectionSummary();

}


// =====================================================
// PAGE CONTROLS
// =====================================================

function setupPageControls() {

    setupCloseButton();


    updateCloseButton();


    renderNextDue();


    renderOverdueSummary();


    renderCollectionSummary();


    renderLoanStatusSummary();


    setupDocumentToggle();


    setupScheduleToggle();


    setupBackButton();


    setupPrintButton();


    setupDownloadButton();

}


// =====================================================
// DOCUMENT TOGGLE
// =====================================================

function setupDocumentToggle() {

    const button =
        getElement(
            "toggleDocumentsBtn"
        );


    const container =
        getElement(
            "loanDocuments"
        );


    if (
        !button ||
        !container
    ) {

        return;

    }


    button.addEventListener(
        "click",
        () => {

            const isHidden =
                container.style.display ===
                "none" ||
                !container.style.display;


            container.style.display =
                isHidden
                    ? "block"
                    : "none";


            button.textContent =
                isHidden
                    ? "Hide Loan Documents"
                    : "View Loan Documents";

        }
    );

}


// =====================================================
// SCHEDULE TOGGLE - FIXED
// =====================================================

function setupScheduleToggle() {

    /*
     * Support both versions of the HTML IDs.
     *
     * Older version:
     * toggleScheduleBtn
     * repaymentScheduleContainer
     *
     * Newer version:
     * toggleRepaymentBtn
     * repaymentScheduleSection
     */

    const button =
        getElement(
            "toggleScheduleBtn"
        ) ||
        getElement(
            "toggleRepaymentBtn"
        );


    const container =
        getElement(
            "repaymentScheduleContainer"
        ) ||
        getElement(
            "repaymentScheduleSection"
        );


    if (
        !button ||
        !container
    ) {

        console.error(
            "Repayment Schedule toggle elements not found."
        );

        return;

    }


    /*
     * Prevent duplicate click handlers
     * if setupPageControls() is called again.
     */

    if (
        button.dataset.scheduleToggleReady ===
        "true"
    ) {

        return;

    }


    button.dataset.scheduleToggleReady =
        "true";


    /*
     * Initial state
     */

    container.style.display =
        "none";

    button.textContent =
        "View Repayment Schedule";


    /*
     * CLICK
     */

    button.addEventListener(
        "click",
        function () {

            const isHidden =
                container.style.display ===
                    "none" ||
                container.style.display ===
                    "" ||
                !container.style.display;


            if (isHidden) {

                container.style.display =
                    "block";

                button.textContent =
                    "Hide Repayment Schedule";


                /*
                 * Make sure latest schedule
                 * is rendered when opened.
                 */

                if (
                    typeof loadRepaymentSchedule ===
                    "function"
                ) {

                    loadRepaymentSchedule()
                        .catch(
                            error => {

                                console.error(
                                    "Repayment schedule loading error:",
                                    error
                                );

                            }
                        );

                }

            } else {

                container.style.display =
                    "none";

                button.textContent =
                    "View Repayment Schedule";

            }

        }
    );

}
// =====================================================
// BACK BUTTON
// =====================================================

function setupBackButton() {

    const button =
        getElement(
            "backBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        () => {

            if (
                window.history.length >
                1
            ) {

                window.history.back();

            } else {

                window.location.href =
                    "loans.html";

            }

        }
    );

}


// =====================================================
// PRINT
// =====================================================

function setupPrintButton() {

    const button =
        getElement(
            "printBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        () => {

            window.print();

        }
    );

}


// =====================================================
// DOWNLOAD FULL LOAN DETAILS
// =====================================================

function setupDownloadButton() {

    const button =
        getElement(
            "downloadLoanBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        downloadLoanCSV
    );

}


// =====================================================
// DOWNLOAD CSV
// =====================================================

function downloadLoanCSV() {

    if (
        !currentLoan
    ) {

        showMessage(
            "Loan data is not available."
        );

        return;

    }


    const rows = [

        [
            "Loan ID",
            currentLoan.loanId ||
            currentLoan.id ||
            ""
        ],

        [
            "Customer",
            currentLoan.customerName ||
            currentCustomer?.name ||
            ""
        ],

        [
            "Loan Amount",
            getNumber(
                currentLoan.loanAmount,
                currentLoan.principalAmount
            )
        ],

        [
            "Interest Rate Yearly",
            getNumber(
                currentLoan.interestRate
            )
        ],

        [
            "Interest Rate Monthly",
            getNumber(
                currentLoan.interestRateMonthly,
                getNumber(
                    currentLoan.interestRate
                ) / 12
            )
        ],

        [
            "Interest Amount",
            getNumber(
                currentLoan.interestAmount,
                currentLoan.totalInterest
            )
        ],

        [
            "Total Payable",
            getNumber(
                currentLoan.totalPayable
            )
        ],

        [
            "Total Paid",
            getTotalCollection()
        ],

        [
            "Penalty Collected",
            getTotalPenalty()
        ],

        [
            "Outstanding",
            repaymentSchedule.reduce(
                (
                    total,
                    row
                ) =>
                    total +
                    getNumber(
                        row.pendingAmount
                    ),
                0
            )
        ]

    ];


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            value =>
                                `"${String(
                                    value
                                ).replace(
                                    /"/g,
                                    '""'
                                )}"`
                        )
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement(
            "a"
        );


    anchor.href =
        url;


    anchor.download =
        `${
            currentLoan.loanId ||
            currentLoan.id ||
            "loan"
        }-details.csv`;


    document.body.appendChild(
        anchor
    );


    anchor.click();


    anchor.remove();


    URL.revokeObjectURL(
        url
    );

}


// =====================================================
// UPDATE SUMMARY AFTER SCHEDULE
// =====================================================

function refreshCalculatedView() {

    renderRepaymentSummary();


    renderNextDue();


    renderOverdueSummary();


    renderCollectionSummary();


    renderLoanStatusSummary();

}


// =====================================================
// INITIAL REFRESH
// =====================================================

window.addEventListener(
    "load",
    () => {

        setTimeout(
            () => {

                if (
                    currentLoan
                ) {

                    refreshCalculatedView();

                }

            },
            500
        );

    }
);


// =====================================================
// EXPOSE DOWNLOAD FUNCTIONS
// =====================================================

window.downloadLoanCSV =
    downloadLoanCSV;


window.downloadInstallment =
    function(
        installmentNo
    ) {

        const row =
            repaymentSchedule.find(
                item =>
                    Number(
                        item.installmentNo
                    ) ===
                    Number(
                        installmentNo
                    )
            );


        if (!row) {

            showMessage(
                "Installment not found."
            );

            return;

        }


        const rows = [

            [
                "Loan ID",
                currentLoan?.loanId ||
                currentLoan?.id ||
                ""
            ],

            [
                "Customer",
                currentLoan?.customerName ||
                currentCustomer?.name ||
                ""
            ],

            [
                "Installment No",
                row.installmentNo
            ],

            [
                "Due Date",
                formatDate(
                    row.dueDate
                )
            ],

            [
                "Due Amount",
                getNumber(
                    row.dueAmount
                )
            ],

            [
                "Principal Due",
                getNumber(
                    row.principalDue
                )
            ],

            [
                "Interest Due",
                getNumber(
                    row.interestDue
                )
            ],

            [
                "Paid Amount",
                getNumber(
                    row.paidAmount
                )
            ],

            [
                "Pending Amount",
                getNumber(
                    row.pendingAmount
                )
            ],

            [
                "Penalty",
                getNumber(
                    row.penalty
                )
            ],

            [
                "Paid Date",
                formatDate(
                    row.paidDate
                )
            ],

            [
                "Status",
                row.status ||
                "Pending"
            ]

        ];


        const csv =
            rows
                .map(
                    row =>
                        row
                            .map(
                                value =>
                                    `"${String(
                                        value
                                    ).replace(
                                        /"/g,
                                        '""'
                                    )}"`
                            )
                            .join(",")
                )
                .join("\n");


        const blob =
            new Blob(
                [
                    csv
                ],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement(
                "a"
            );


        anchor.href =
            url;


        anchor.download =
            `${
                currentLoan?.loanId ||
                currentLoan?.id ||
                "loan"
            }-EMI-${
                row.installmentNo
            }.csv`;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        URL.revokeObjectURL(
            url
        );

    };
// =====================================================
// DOCUMENT TOGGLE - INITIAL STATE
// =====================================================

function initializeDocumentSection() {

    const container =
        getElement(
            "loanDocuments"
        );


    const button =
        getElement(
            "toggleDocumentsBtn"
        );


    if (
        container
    ) {

        container.style.display =
            "none";

    }


    if (
        button
    ) {

        button.textContent =
            "View Loan Documents";

    }

}


// =====================================================
// SCHEDULE TOGGLE - INITIAL STATE
// =====================================================

function initializeScheduleSection() {

    const container =
        getElement(
            "repaymentScheduleContainer"
        ) ||
        getElement(
            "repaymentScheduleSection"
        );


    const button =
        getElement(
            "toggleScheduleBtn"
        ) ||
        getElement(
            "toggleRepaymentBtn"
        );


    if (
        container
    ) {

        container.style.display =
            "none";

    }


    if (
        button
    ) {

        button.textContent =
            "View Repayment Schedule";

    }

}

// =====================================================
// LOAN INFORMATION HELPERS
// =====================================================

function getLoanPrincipal() {

    return getNumber(
        currentLoan?.loanAmount,
        currentLoan?.principalAmount,
        currentLoan?.amount
    );

}


function getLoanInterest() {

    return getNumber(
        currentLoan?.interestAmount,
        currentLoan?.totalInterest
    );

}

function getLoanTotalPayable() {

    const tenure =
        getLoanTenure();

    const emi =
        getInstallmentAmount();


    /*
     * Main calculation:
     * EMI × Total Installments
     *
     * Example:
     * ₹2,750 × 24 = ₹66,000
     */
    if (
        tenure > 0 &&
        emi > 0
    ) {

        return (
            emi *
            tenure
        );

    }


    /*
     * Fallback only when
     * EMI / tenure is unavailable.
     */
    return getNumber(
        currentLoan?.totalRepayable,
        currentLoan?.totalRepayment,
        currentLoan?.totalPayable,
        currentLoan?.totalDueAmount,
        currentLoan?.totalLoanPayable,
        currentLoan?.totalAmountPayable
    );

}
// =====================================================
// UPDATE FINANCIAL CARDS AFTER PAYMENT LOAD
// =====================================================

function refreshFinancialCards() {

    const principal =
        getLoanPrincipal();


    const interest =
        getLoanInterest();


    const totalPayable =
        getLoanTotalPayable();


    const paid =
        getLoanPaidAmount();


    const outstanding =
        getLoanOutstanding();


    setText(
        "loanAmount",
        formatCurrency(
            principal
        )
    );


    setText(
        "principalAmount",
        formatCurrency(
            principal
        )
    );


    setText(
        "interestAmount",
        formatCurrency(
            interest
        )
    );


    setText(
        "totalInterest",
        formatCurrency(
            interest
        )
    );


    setText(
        "totalPayable",
        formatCurrency(
            totalPayable
        )
    );


    setText(
        "totalPaid",
        formatCurrency(
            paid
        )
    );


    setText(
        "paidAmount",
        formatCurrency(
            paid
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "outstandingAmount",
        formatCurrency(
            outstanding
        )
    );


    renderNextDue();

}


// =====================================================
// PAYMENT HISTORY
// =====================================================

function renderPaymentHistory() {

    const container =
        getElement(
            "paymentHistory"
        );


    if (
        !container
    ) {

        return;

    }


    if (
        !repaymentPayments.length
    ) {

        container.innerHTML = `
            <div class="empty">
                No payment history available.
            </div>
        `;

        return;

    }


    container.innerHTML =
        repaymentPayments
            .map(
                payment => {

                    const amount =
                        getPaymentAmount(
                            payment
                        );


                    const penalty =
                        getPaymentPenalty(
                            payment
                        );


                    const date =
                        getPaymentDate(
                            payment
                        );


                    const receipt =
                        getPaymentReceipt(
                            payment
                        );


                    const balance =
                        getPaymentBalance(
                            payment
                        );


                    return `
                        <div
                            class="payment-history-row"
                        >

                            <div>

                                <div
                                    class="payment-date"
                                >
                                    ${formatDate(
                                        date
                                    )}
                                </div>

                                <div
                                    class="payment-receipt"
                                >
                                    Receipt:
                                    ${escapeHTML(
                                        receipt
                                    )}
                                </div>

                            </div>


                            <div
                                class="payment-amount"
                            >
                                ${formatCurrency(
                                    amount
                                )}
                            </div>


                            <div
                                class="payment-penalty"
                            >
                                Penalty:
                                ${formatCurrency(
                                    penalty
                                )}
                            </div>


                            <div
                                class="payment-balance"
                            >
                                Balance:
                                ${formatCurrency(
                                    balance
                                )}
                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// =====================================================
// CUSTOMER SUMMARY
// =====================================================

function renderCustomerSummary() {

    const customer =
        currentCustomer || {};


    setText(
        "customerName",
        firstValue(
            currentLoan,
            [
                "customerName"
            ],
            firstValue(
                customer,
                [
                    "name",
                    "customerName",
                    "fullName"
                ],
                "-"
            )
        )
    );


    setText(
        "customerMobile",
        firstValue(
            currentLoan,
            [
                "customerMobile",
                "mobile"
            ],
            firstValue(
                customer,
                [
                    "mobile",
                    "phone",
                    "mobileNumber"
                ],
                "-"
            )
        )
    );


    setText(
        "customerAddress",
        firstValue(
            currentLoan,
            [
                "customerAddress",
                "address"
            ],
            firstValue(
                customer,
                [
                    "address",
                    "customerAddress"
                ],
                "-"
            )
        )
    );


    setText(
        "customerCode",
        firstValue(
            currentLoan,
            [
                "customerId",
                "customerCode"
            ],
            customer.id || "-"
        )
    );

}


// =====================================================
// LOAN META INFORMATION
// =====================================================

function renderLoanMeta() {

    const loan =
        currentLoan || {};


    setText(
        "createdBy",
        firstValue(
            loan,
            [
                "createdByName",
                "staffName",
                "createdBy"
            ],
            "-"
        )
    );


    setText(
        "staffName",
        firstValue(
            loan,
            [
                "staffName",
                "createdByName"
            ],
            "-"
        )
    );


    setText(
        "loanSource",
        firstValue(
            loan,
            [
                "loanSource",
                "source"
            ],
            "-"
        )
    );


    setText(
        "remarks",
        firstValue(
            loan,
            [
                "remarks",
                "notes",
                "description"
            ],
            "-"
        )
    );


    setText(
        "createdDate",
        formatDate(
            firstValue(
                loan,
                [
                    "createdAt",
                    "loanDate"
                ]
            )
        )
    );

}


// =====================================================
// DOCUMENT SUMMARY
// =====================================================

function renderDocumentSummary() {

    const total =
        loanDocuments.length;


    const received =
        loanDocuments.filter(
            item =>
                String(
                    item.status ||
                    ""
                ).toLowerCase() ===
                "received"
        ).length;


    const returned =
        loanDocuments.filter(
            item =>
                String(
                    item.status ||
                    ""
                ).toLowerCase() ===
                "returned"
        ).length;


    const pending =
        loanDocuments.filter(
            item =>
                String(
                    item.status ||
                    "Pending"
                ).toLowerCase() ===
                "pending"
        ).length;


    setText(
        "documentTotal",
        total
    );


    setText(
        "documentReceived",
        received
    );


    setText(
        "documentReturned",
        returned
    );


    setText(
        "documentPending",
        pending
    );


    /*
     * Loan-level document status.
     */

    let overallStatus =
        "Pending";


    if (
        total > 0 &&
        returned === total
    ) {

        overallStatus =
            "Returned";

    } else if (
        total > 0 &&
        received +
        returned ===
        total
    ) {

        overallStatus =
            "Received";

    }


    setText(
        "documentsStatus",
        firstValue(
            currentLoan,
            [
                "documentsStatus"
            ],
            overallStatus
        )
    );

}


// =====================================================
// REPAID / BALANCE STATUS
// =====================================================

function renderRepaymentStatus() {

    const outstanding =
        getLoanOutstanding();


    let status =
        "Active";


    if (
        outstanding <= 0
    ) {

        status =
            "Fully Paid";

    } else {

        const overdue =
            getOverdueRows();


        if (
            overdue.length
        ) {

            status =
                "Overdue";

        }

    }


    setText(
        "repaymentStatus",
        status
    );

}


// =====================================================
// UPDATE ALL DERIVED DATA
// =====================================================

function refreshAllDerivedData() {

    renderCustomerSummary();


    renderLoanMeta();


    renderDocumentSummary();


    renderRepaymentStatus();


    refreshFinancialCards();


    renderPaymentHistory();


    renderRepaymentSummary();


    renderNextDue();


    renderOverdueSummary();


    renderCollectionSummary();


    renderLoanStatusSummary();

}


// =====================================================
// LOAD EVERYTHING AFTER AUTH
// =====================================================

async function loadEverything() {

    await loadLoanDocuments();


    /*
     * Payments are already loaded as part
     * of repayment schedule.
     */

    refreshAllDerivedData();

}


// =====================================================
// OVERRIDE INITIAL LOAD FLOW
// =====================================================
//
// The first loadLoan() already loads loan,
// customer and base sections.
//
// This additional flow makes sure all
// dependent calculations are refreshed
// after documents and payments are ready.
// =====================================================

// =====================================================
// SAFE REFRESH
// =====================================================

setTimeout(
    () => {

        if (
            currentLoan
        ) {

            refreshAllDerivedData();

        }

    },
    1200
);


// =====================================================
// WINDOW RESIZE
// =====================================================

window.addEventListener(
    "resize",
    () => {

        /*
         * Keep tables readable on resize.
         * No data recalculation required.
         */

        const table =
            getElement(
                "repaymentScheduleBody"
            );


        if (
            table
        ) {

            table.dispatchEvent(
                new Event(
                    "loanviewresize"
                )
            );

        }

    }
);


// =====================================================
// VISIBILITY CHANGE
// =====================================================

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;

        }


        /*
         * Refresh payment/document data
         * when the user comes back to this tab.
         */

        if (
            currentLoan
        ) {

            await loadLoanDocuments();


            await loadRepaymentSchedule();


            refreshAllDerivedData();

        }

    }
);


// =====================================================
// FINAL INITIALIZATION
// =====================================================

initializeDocumentSection();


initializeScheduleSection();


// =====================================================
// ERROR HANDLING
// =====================================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "Loan View Error:",
            event.error ||
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "Loan View Promise Error:",
            event.reason
        );

    }
);


// =====================================================
// END OF LOAN VIEW CONTROLLER
// =====================================================
