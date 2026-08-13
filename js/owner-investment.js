// ============================================================
// SR AUTO FINANCE ERP
// OWNER INVESTMENT / BUSINESS CAPITAL
// File: js/owner-investment.js
//
// PURPOSE
// ------------------------------------------------------------
// Owner investment is the starting capital of the business.
//
// Investment
//      ↓
// Business Available Fund
//      ↓
// Loan Disbursement
//      ↓
// Customer Collection
//      ↓
// Fund comes back
//
// IMPORTANT
// ------------------------------------------------------------
// Collection is NOT treated as new investment/profit.
// Collection only returns deployed loan money back to
// business fund.
//
// This file manages:
// 1. Owner Investment
// 2. Investment ID
// 3. Investment history
// 4. Total Investment
// 5. Total Disbursed
// 6. Total Collection
// 7. Available Fund
//
// Firestore collections:
//      ownerInvestments
//      fundTransactions
// ============================================================


import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import {
    db,
    auth
} from "./firebase-config.js";


// ============================================================
// CONFIGURATION
// ============================================================

const INVESTMENT_COLLECTION =
    "ownerInvestments";

const FUND_TRANSACTION_COLLECTION =
    "fundTransactions";

const LOAN_COLLECTION =
    "loans";

const COLLECTIONS_COLLECTION =
    "collections";

const PAYMENTS_COLLECTION =
    "payments";


// ============================================================
// DOM ELEMENTS
// ============================================================

const form =
    document.getElementById(
        "investmentForm"
    );


const investmentIdInput =
    document.getElementById(
        "investmentId"
    );


const investmentDateInput =
    document.getElementById(
        "investmentDate"
    );


const ownerIdInput =
    document.getElementById(
        "ownerId"
    );


const ownerNameInput =
    document.getElementById(
        "ownerName"
    );


const investmentAmountInput =
    document.getElementById(
        "investmentAmount"
    );


const investmentModeInput =
    document.getElementById(
        "investmentMode"
    );


const referenceNumberInput =
    document.getElementById(
        "referenceNumber"
    );


const remarksInput =
    document.getElementById(
        "remarks"
    );


const saveInvestmentButton =
    document.getElementById(
        "saveInvestmentBtn"
    );


const resetButton =
    document.getElementById(
        "resetBtn"
    );


const backButton =
    document.getElementById(
        "backBtn"
    );


const messageElement =
    document.getElementById(
        "message"
    );


const investmentTableBody =
    document.getElementById(
        "investmentTableBody"
    );


// ============================================================
// SUMMARY ELEMENTS
// ============================================================

const totalInvestmentElement =
    document.getElementById(
        "totalInvestment"
    );


const totalDisbursedElement =
    document.getElementById(
        "totalDisbursed"
    );


const totalCollectionElement =
    document.getElementById(
        "totalCollection"
    );


const availableFundElement =
    document.getElementById(
        "availableFund"
    );


// ============================================================
// GLOBAL DATA
// ============================================================

let investmentRecords = [];

let loanRecords = [];

let collectionRecords = [];

let paymentRecords = [];


// ============================================================
// BASIC HELPERS
// ============================================================

function numberValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    const number =
        Number(
            String(value)
                .replace(/,/g, "")
                .replace(/[₹$]/g, "")
                .trim()
        );


    return Number.isFinite(number)
        ? number
        : 0;

}


// ============================================================
// CURRENCY
// ============================================================

function formatCurrency(
    value
) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(
        numberValue(value)
    );

}


// ============================================================
// NUMBER FORMAT
// ============================================================

function formatNumber(
    value
) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        numberValue(value)
    );

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(
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


// ============================================================
// DATE PARSER
// ============================================================

function parseDate(
    value
) {

    if (!value) {

        return null;

    }


    try {

        if (
            value &&
            typeof value.toDate ===
                "function"
        ) {

            return value.toDate();

        }


        if (
            value instanceof Date
        ) {

            return isNaN(
                value.getTime()
            )
                ? null
                : value;

        }


        const text =
            String(
                value
            ).trim();


        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(text)
        ) {

            const parts =
                text.split("-")
                    .map(Number);


            return new Date(
                parts[0],
                parts[1] - 1,
                parts[2]
            );

        }


        const date =
            new Date(
                text
            );


        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    } catch {

        return null;

    }

}


// ============================================================
// DATE KEY
// ============================================================

function dateKey(
    value
) {

    const date =
        parseDate(
            value
        );


    if (!date) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            date.getDate()
        )
            .padStart(
                2,
                "0"
            );


    return `${year}-${month}-${day}`;

}


// ============================================================
// DISPLAY DATE
// ============================================================

function displayDate(
    value
) {

    const date =
        parseDate(
            value
        );


    if (!date) {

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

}


// ============================================================
// TODAY
// ============================================================

function today() {

    return dateKey(
        new Date()
    );

}


// ============================================================
// FIELD VALUE HELPER
// ============================================================

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
            String(value).trim() !== ""
        ) {

            return value;

        }

    }


    return fallback;

}


// ============================================================
// GENERATE INVESTMENT ID
//
// Example:
//      INV-2026-000001
// ============================================================

function generateInvestmentId() {

    const year =
        new Date()
            .getFullYear();


    const sequence =
        investmentRecords.length + 1;


    const padded =
        String(
            sequence
        )
            .padStart(
                6,
                "0"
            );


    return `INV-${year}-${padded}`;

}


// ============================================================
// GENERATE FUND TRANSACTION ID
//
// Example:
//      FUND-INV-2026-000001
// ============================================================

function generateFundTransactionId(
    investmentId
) {

    return `FUND-${investmentId}`;

}


// ============================================================
// SHOW MESSAGE
// ============================================================

function showMessage(
    text,
    type = "success"
) {

    if (!messageElement) {

        return;

    }


    messageElement.textContent =
        text;


    messageElement.className =
        `message ${type}`;


    setTimeout(
        () => {

            if (
                messageElement
            ) {

                messageElement.className =
                    "message";

                messageElement.textContent =
                    "";

            }

        },
        5000
    );

}


// ============================================================
// SET DEFAULT DATE
// ============================================================

function setDefaultDate() {

    if (
        investmentDateInput &&
        !investmentDateInput.value
    ) {

        investmentDateInput.value =
            today();

    }

}


// ============================================================
// RESET FORM
// ============================================================

function resetForm() {

    if (!form) {

        return;

    }


    form.reset();


    if (
        investmentDateInput
    ) {

        investmentDateInput.value =
            today();

    }


    if (
        investmentIdInput
    ) {

        investmentIdInput.value =
            generateInvestmentId();

    }

}


// ============================================================
// LOAD INVESTMENTS
// ============================================================

async function loadInvestments() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    INVESTMENT_COLLECTION
                )
            );


        investmentRecords = [];


        snapshot.forEach(
            docSnap => {

                investmentRecords.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        investmentRecords.sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    parseDate(
                        first.investmentDate
                    );


                const secondDate =
                    parseDate(
                        second.investmentDate
                    );


                return (
                    (
                        secondDate?.getTime() ||
                        0
                    ) -
                    (
                        firstDate?.getTime() ||
                        0
                    )
                );

            }
        );


    } catch (
        error
    ) {

        console.error(
            "Investment loading error:",
            error
        );


        investmentRecords = [];

    }

}


// ============================================================
// LOAD LOANS
// ============================================================

async function loadLoans() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    LOAN_COLLECTION
                )
            );


        loanRecords = [];


        snapshot.forEach(
            docSnap => {

                loanRecords.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


    } catch (
        error
    ) {

        console.error(
            "Loan loading error:",
            error
        );


        loanRecords = [];

    }

}


// ============================================================
// LOAD COLLECTIONS
// ============================================================

async function loadCollections() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    COLLECTIONS_COLLECTION
                )
            );


        collectionRecords = [];


        snapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                const status =
                    String(
                        firstValue(
                            data,
                            [
                                "status"
                            ],
                            "success"
                        )
                    )
                        .toLowerCase();


                if (
                    status ===
                        "cancelled" ||
                    status ===
                        "canceled" ||
                    status ===
                        "deleted" ||
                    status ===
                        "reversed"
                ) {

                    return;

                }


                collectionRecords.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


    } catch (
        error
    ) {

        console.error(
            "Collection loading error:",
            error
        );


        collectionRecords = [];

    }

}


// ============================================================
// LOAD LEGACY PAYMENTS
//
// Used only to understand old loan disbursement / collection
// records if required.
//
// IMPORTANT:
// Do NOT add old payments again if same collection already
// exists inside collections.
// ============================================================

async function loadPayments() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    PAYMENTS_COLLECTION
                )
            );


        paymentRecords = [];


        snapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                paymentRecords.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


    } catch (
        error
    ) {

        console.error(
            "Payment loading error:",
            error
        );


        paymentRecords = [];

    }

}


// ============================================================
// CALCULATE TOTAL INVESTMENT
// ============================================================

function calculateTotalInvestment() {

    return investmentRecords.reduce(
        (
            total,
            record
        ) => {

            const status =
                String(
                    firstValue(
                        record,
                        [
                            "status"
                        ],
                        "ACTIVE"
                    )
                )
                    .toUpperCase();


            if (
                status ===
                    "CANCELLED" ||
                status ===
                    "CANCELED" ||
                status ===
                    "DELETED"
            ) {

                return total;

            }


            return (
                total +
                numberValue(
                    firstValue(
                        record,
                        [
                            "investmentAmount",
                            "amount"
                        ],
                        0
                    )
                )
            );

        },
        0
    );

}


// ============================================================
// CALCULATE TOTAL DISBURSED
//
// Supports common fields from existing loan records.
//
// IMPORTANT:
// ReLoan / New Loan are both loans financially, so actual
// disbursed amount is counted once from each loan document.
// ============================================================

function calculateTotalDisbursed() {

    return loanRecords.reduce(
        (
            total,
            loan
        ) => {

            const status =
                String(
                    firstValue(
                        loan,
                        [
                            "status",
                            "loanStatus"
                        ],
                        ""
                    )
                )
                    .toLowerCase();


            if (
                status ===
                    "draft" ||
                status ===
                    "cancelled" ||
                status ===
                    "canceled" ||
                status ===
                    "rejected" ||
                status ===
                    "deleted"
            ) {

                return total;

            }


            const disbursed =
                numberValue(
                    firstValue(
                        loan,
                        [
                            "disbursedAmount",
                            "loanAmount",
                            "principalAmount",
                            "financeAmount",
                            "amount"
                        ],
                        0
                    )
                );


            return (
                total +
                disbursed
            );

        },
        0
    );

}


// ============================================================
// COLLECTION KEY
//
// Prevent duplicate calculation between collections and
// legacy payments.
//
// ============================================================

function collectionKey(
    record
) {

    const collectionId =
        firstValue(
            record,
            [
                "collectionId",
                "receiptNo",
                "receiptNumber"
            ]
        );


    if (
        collectionId
    ) {

        return String(
            collectionId
        );

    }


    const loanId =
        firstValue(
            record,
            [
                "loanId",
                "loanDocumentId"
            ]
        );


    const amount =
        firstValue(
            record,
            [
                "amount",
                "paidAmount",
                "paymentAmount"
            ],
            0
        );


    const date =
        dateKey(
            firstValue(
                record,
                [
                    "paymentDate",
                    "collectionDate",
                    "date",
                    "createdAt"
                ]
            )
        );


    return [
        loanId,
        amount,
        date
    ].join("|");

}


// ============================================================
// NORMALIZE COLLECTION AMOUNT
// ============================================================

function collectionAmount(
    record
) {

    return numberValue(
        firstValue(
            record,
            [
                "paidAmount",
                "amount",
                "paymentAmount",
                "amountReceived",
                "totalReceived"
            ],
            0
        )
    );

}


// ============================================================
// CALCULATE TOTAL COLLECTION
//
// PRIMARY SOURCE:
//      collections
//
// LEGACY:
//      payments only when that payment does not already
//      exist in collections.
// ============================================================

function calculateTotalCollection() {

    const keys =
        new Set();


    let total = 0;


    collectionRecords.forEach(
        record => {

            const status =
                String(
                    firstValue(
                        record,
                        [
                            "status"
                        ],
                        "success"
                    )
                )
                    .toLowerCase();


            if (
                status ===
                    "cancelled" ||
                status ===
                    "canceled" ||
                status ===
                    "deleted" ||
                status ===
                    "reversed"
            ) {

                return;

            }


            const key =
                collectionKey(
                    record
                );


            keys.add(
                key
            );


            total +=
                collectionAmount(
                    record
                );

        }
    );


    paymentRecords.forEach(
        record => {

            const key =
                collectionKey(
                    record
                );


            if (
                keys.has(
                    key
                )
            ) {

                return;

            }


            const status =
                String(
                    firstValue(
                        record,
                        [
                            "status"
                        ],
                        "success"
                    )
                )
                    .toLowerCase();


            if (
                status ===
                    "cancelled" ||
                status ===
                    "canceled" ||
                status ===
                    "deleted" ||
                status ===
                    "reversed"
            ) {

                return;

            }


            total +=
                collectionAmount(
                    record
                );

        }
    );


    return total;

}


// ============================================================
// CALCULATE AVAILABLE FUND
//
// CORE BUSINESS FORMULA:
//
// Available Fund
// = Total Investment
// - Total Loan Disbursed
// + Total Collection
//
// IMPORTANT:
// Collection is NOT added to Total Investment.
// It is only returning deployed money.
//
// ============================================================

function calculateAvailableFund(
    totalInvestment,
    totalDisbursed,
    totalCollection
) {

    return (
        totalInvestment -
        totalDisbursed +
        totalCollection
    );

}


// ============================================================
// UPDATE SUMMARY
// ============================================================

function updateSummary() {

    const totalInvestment =
        calculateTotalInvestment();


    const totalDisbursed =
        calculateTotalDisbursed();


    const totalCollection =
        calculateTotalCollection();


    const availableFund =
        calculateAvailableFund(
            totalInvestment,
            totalDisbursed,
            totalCollection
        );


    if (
        totalInvestmentElement
    ) {

        totalInvestmentElement.textContent =
            formatCurrency(
                totalInvestment
            );

    }


    if (
        totalDisbursedElement
    ) {

        totalDisbursedElement.textContent =
            formatCurrency(
                totalDisbursed
            );

    }


    if (
        totalCollectionElement
    ) {

        totalCollectionElement.textContent =
            formatCurrency(
                totalCollection
            );

    }


    if (
        availableFundElement
    ) {

        availableFundElement.textContent =
            formatCurrency(
                availableFund
            );

    }


    return {

        totalInvestment,

        totalDisbursed,

        totalCollection,

        availableFund

    };

}


// ============================================================
// RENDER INVESTMENT HISTORY
// ============================================================

function renderInvestmentHistory() {

    if (
        !investmentTableBody
    ) {

        return;

    }


    if (
        !investmentRecords.length
    ) {

        investmentTableBody.innerHTML =
            `
            <tr>

                <td
                    colspan="8"
                    class="empty-row"
                >
                    No investment records found.
                </td>

            </tr>
            `;

        return;

    }


    investmentTableBody.innerHTML =
        investmentRecords
            .map(
                record => {

                    const amount =
                        numberValue(
                            firstValue(
                                record,
                                [
                                    "investmentAmount",
                                    "amount"
                                ],
                                0
                            )
                        );


                    const investmentId =
                        firstValue(
                            record,
                            [
                                "investmentId"
                            ],
                            record.id
                        );


                    const ownerName =
                        firstValue(
                            record,
                            [
                                "ownerName",
                                "name"
                            ],
                            "-"
                        );


                    const ownerId =
                        firstValue(
                            record,
                            [
                                "ownerId"
                            ],
                            "-"
                        );


                    const mode =
                        firstValue(
                            record,
                            [
                                "investmentMode",
                                "paymentMode"
                            ],
                            "-"
                        );


                    const reference =
                        firstValue(
                            record,
                            [
                                "referenceNumber",
                                "referenceNo"
                            ],
                            "-"
                        );


                    const status =
                        String(
                            firstValue(
                                record,
                                [
                                    "status"
                                ],
                                "ACTIVE"
                            )
                        )
                            .toUpperCase();


                    return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                displayDate(
                                    record.investmentDate
                                )
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    investmentId
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                ownerName
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                ownerId
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatCurrency(
                                    amount
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                mode
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                reference
                            )}
                        </td>

                        <td>

                            <span
                                class="status status-active"
                            >
                                ${escapeHTML(
                                    status
                                )}
                            </span>

                        </td>

                    </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// CREATE INVESTMENT
// ============================================================

async function saveInvestment(
    event
) {

    event.preventDefault();


    if (
        !form
    ) {

        return;

    }


    const ownerId =
        ownerIdInput?.value
            ?.trim() ||
        "";


    const ownerName =
        ownerNameInput?.value
            ?.trim() ||
        "";


    const investmentDate =
        investmentDateInput?.value ||
        "";


    const amount =
        numberValue(
            investmentAmountInput?.value
        );


    const investmentMode =
        investmentModeInput?.value ||
        "";


    const referenceNumber =
        referenceNumberInput?.value
            ?.trim() ||
        "";


    const remarks =
        remarksInput?.value
            ?.trim() ||
        "";


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!investmentDate) {

        showMessage(
            "Investment date is required.",
            "error"
        );

        return;

    }


    if (!ownerId) {

        showMessage(
            "Owner ID is required.",
            "error"
        );

        return;

    }


    if (!ownerName) {

        showMessage(
            "Owner name is required.",
            "error"
        );

        return;

    }


    if (
        amount <= 0
    ) {

        showMessage(
            "Enter a valid investment amount.",
            "error"
        );

        return;

    }


    if (!investmentMode) {

        showMessage(
            "Please select investment mode.",
            "error"
        );

        return;

    }


    try {

        saveInvestmentButton.disabled =
            true;


        saveInvestmentButton.textContent =
            "Saving...";


        // ----------------------------------------------------
        // GENERATE IDs
        // ----------------------------------------------------

        const investmentId =
            generateInvestmentId();


        const fundTransactionId =
            generateFundTransactionId(
                investmentId
            );


        // ----------------------------------------------------
        // CURRENT USER
        // ----------------------------------------------------

        const currentUser =
            auth?.currentUser ||
            null;


        const createdByUid =
            currentUser?.uid ||
            "";


        const createdByEmail =
            currentUser?.email ||
            "";


        // ----------------------------------------------------
        // INVESTMENT DOCUMENT
        // ----------------------------------------------------

        const investmentData = {

            investmentId,

            ownerId,

            ownerName,

            investmentDate,

            investmentAmount:
                amount,

            amount,

            investmentMode,

            referenceNumber,

            remarks,

            status:
                "ACTIVE",

            source:
                "OWNER_INVESTMENT",

            transactionType:
                "CAPITAL_IN",

            fundTransactionId,

            createdByUid,

            createdByEmail,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        // ----------------------------------------------------
        // SAVE INVESTMENT
        // ----------------------------------------------------

        const investmentRef =
            await addDoc(
                collection(
                    db,
                    INVESTMENT_COLLECTION
                ),
                investmentData
            );


        // ----------------------------------------------------
        // FUND TRANSACTION
        //
        // This is the CENTRAL CAPITAL LEDGER ENTRY.
        //
        // Positive amount = money comes into business.
        // ----------------------------------------------------

        const fundTransactionData = {

            transactionId:
                fundTransactionId,

            referenceId:
                investmentId,

            referenceDocumentId:
                investmentRef.id,

            transactionType:
                "CAPITAL_IN",

            transactionCategory:
                "OWNER_INVESTMENT",

            source:
                "OWNER",

            ownerId,

            ownerName,

            amount,

            signedAmount:
                amount,

            direction:
                "IN",

            investmentMode,

            transactionDate:
                investmentDate,

            remarks,

            status:
                "POSTED",

            createdByUid,

            createdByEmail,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        await addDoc(
            collection(
                db,
                FUND_TRANSACTION_COLLECTION
            ),
            fundTransactionData
        );


        // ----------------------------------------------------
        // RELOAD
        // ----------------------------------------------------

        await loadAllData();


        resetForm();


        showMessage(
            `Investment saved successfully. Investment ID: ${investmentId}`,
            "success"
        );


    } catch (
        error
    ) {

        console.error(
            "Investment save error:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to save investment.",
            "error"
        );

    } finally {

        if (
            saveInvestmentButton
        ) {

            saveInvestmentButton.disabled =
                false;

            saveInvestmentButton.textContent =
                "Save Investment";

        }

    }

}


// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadAllData() {

    try {

        await Promise.all([

            loadInvestments(),

            loadLoans(),

            loadCollections(),

            loadPayments()

        ]);


        renderInvestmentHistory();

        updateSummary();


        console.log(
            "Owner Investment module loaded",
            {
                investments:
                    investmentRecords.length,

                loans:
                    loanRecords.length,

                collections:
                    collectionRecords.length,

                payments:
                    paymentRecords.length
            }
        );


    } catch (
        error
    ) {

        console.error(
            "Owner Investment data loading error:",
            error
        );

    }

}


// ============================================================
// FORM SUBMIT
// ============================================================

if (
    form
) {

    form.addEventListener(
        "submit",
        saveInvestment
    );

}


// ============================================================
// RESET BUTTON
// ============================================================

if (
    resetButton
) {

    resetButton.addEventListener(
        "click",
        () => {

            resetForm();

        }
    );

}


// ============================================================
// BACK BUTTON
// ============================================================

if (
    backButton
) {

    backButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );

}


// ============================================================
// INITIALIZE
// ============================================================

async function initialize() {

    setDefaultDate();

    await loadAllData();

    if (
        investmentIdInput &&
        !investmentIdInput.value
    ) {

        investmentIdInput.value =
            generateInvestmentId();

    }

}


// ============================================================
// START
// ============================================================

initialize();


// ============================================================
// GLOBAL API
// ============================================================

window.ownerInvestment = {

    reload:
        loadAllData,

    refresh:
        loadAllData,

    getSummary:
        updateSummary,

    getTotalInvestment:
        calculateTotalInvestment,

    getTotalDisbursed:
        calculateTotalDisbursed,

    getTotalCollection:
        calculateTotalCollection

};
