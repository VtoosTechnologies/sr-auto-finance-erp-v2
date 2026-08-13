// =====================================================
// SR AUTO FINANCE ERP
// Collection Controller
// File: js/collection.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
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

const message =
    document.getElementById("message");

const loanSearchInput =
    document.getElementById(
        "loanSearchInput"
    );

const searchLoanBtn =
    document.getElementById(
        "searchLoanBtn"
    );

const paymentDate =
    document.getElementById(
        "paymentDate"
    );

const amountReceived =
    document.getElementById(
        "amountReceived"
    );

const penaltyCollected =
    document.getElementById(
        "penaltyCollected"
    );

const paymentMode =
    document.getElementById(
        "paymentMode"
    );

const paymentRemarks =
    document.getElementById(
        "paymentRemarks"
    );

const savePaymentBtn =
    document.getElementById(
        "savePaymentBtn"
    );

const clearPaymentBtn =
    document.getElementById(
        "clearPaymentBtn"
    );

const paymentHistoryBody =
    document.getElementById(
        "paymentHistoryBody"
    );


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let currentLoan = null;

let currentLoanId = null;


/*
 * One token is kept for one payment attempt.
 *
 * If user double-clicks Save, both requests
 * use the same deterministic payment document ID.
 *
 * Therefore duplicate payment record will not
 * be created.
 */

let paymentToken =
    createPaymentToken();


// =====================================================
// TOKEN
// =====================================================

function createPaymentToken() {

    return (
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

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
// CURRENCY
// =====================================================

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
        Number(value) || 0
    );

}


// =====================================================
// DATE
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
// PARSE DATE
// =====================================================

function parseDateValue(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value &&
        typeof value.toDate ===
        "function"
    ) {

        const date =
            value.toDate();

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    if (
        value instanceof Date
    ) {

        const date =
            new Date(
                value.getTime()
            );

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    const raw =
        String(
            value
        ).trim();


    let match =
        raw.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (match) {

        const date =
            new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    match =
        raw.match(
            /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/
        );


    if (match) {

        const date =
            new Date(
                Number(match[3]),
                Number(match[2]) - 1,
                Number(match[1])
            );

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    const date =
        new Date(
            raw
        );


    return isNaN(
        date.getTime()
    )
        ? null
        : date;

}


// =====================================================
// FORMAT DATE FOR STORAGE
// =====================================================

function formatDateForStorage(
    value
) {

    const date =
        parseDateValue(
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
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

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


    try {

        const date =
            parseDateValue(
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


    } catch (error) {

        return "-";

    }

}


// =====================================================
// ESCAPE HTML
// =====================================================

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


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "-";

}


// =====================================================
// NUMBER
// =====================================================

function numberValue(
    value
) {

    const number =
        Number(
            value
        );


    if (
        isNaN(
            number
        )
    ) {

        return 0;

    }


    return number;

}


// =====================================================
// PENALTY RULES
// =====================================================

const PENALTY_COOLING_DAYS =
    5;


function getPenaltyForInstallment(
    monthlyInstallment
) {

    const emi =
        numberValue(
            monthlyInstallment
        );


    if (emi <= 2500) {
        return 100;
    }


    if (emi <= 5000) {
        return 200;
    }


    if (emi < 7500) {
        return 300;
    }


    if (emi <= 10000) {
        return 400;
    }


    if (emi <= 15000) {
        return 500;
    }


    return 600;

}


// =====================================================
// DAYS BETWEEN
// =====================================================

function startOfDay(
    date
) {

    const result =
        new Date(
            date
        );

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;

}


function daysBetween(
    fromValue,
    toValue
) {

    const from =
        parseDateValue(
            fromValue
        );

    const to =
        parseDateValue(
            toValue
        );


    if (
        !from ||
        !to
    ) {

        return 0;

    }


    const difference =
        startOfDay(to).getTime() -
        startOfDay(from).getTime();


    return Math.max(
        Math.floor(
            difference /
            86400000
        ),
        0
    );

}


// =====================================================
// DUE DATE FOR INSTALLMENT
// =====================================================

function getDueDateForInstallment(
    loan,
    installmentNumber
) {

    const firstDueDate =
        loan.firstDueDate ||
        loan.dueDate ||
        loan.loanDate;


    const baseDate =
        parseDateValue(
            firstDueDate
        );


    if (!baseDate) {
        return null;
    }


    const frequency =
        String(
            loan.frequency ||
            loan.paymentFrequency ||
            "Monthly"
        ).toLowerCase();


    const periods =
        Math.max(
            Number(
                installmentNumber ||
                1
            ) - 1,
            0
        );


    const dueDate =
        new Date(
            baseDate.getTime()
        );


    if (
        frequency ===
        "weekly"
    ) {

        dueDate.setDate(
            dueDate.getDate() +
            (
                periods *
                7
            )
        );

    }

    else if (
        frequency ===
        "daily"
    ) {

        dueDate.setDate(
            dueDate.getDate() +
            periods
        );

    }

    else {

        dueDate.setMonth(
            dueDate.getMonth() +
            periods
        );

    }


    return dueDate;

}


// =====================================================
// PAID INSTALLMENTS
// =====================================================

function getPaidInstallments(
    loan,
    totalPaidOverride = null
) {

    const installmentAmount =
        numberValue(
            loan.installmentAmount ??
            loan.monthlyInstallment ??
            loan.emi
        );


    const totalPaid =
        totalPaidOverride !== null
            ? numberValue(
                totalPaidOverride
            )
            : numberValue(
                loan.totalPaid ??
                loan.paidAmount ??
                loan.totalCollection
            );


    const totalInstallments =
        numberValue(
            loan.totalInstallments ??
            loan.installments ??
            loan.duration ??
            loan.loanDuration ??
            loan.tenure
        );


    if (
        installmentAmount <= 0
    ) {

        return 0;

    }


    let paid =
        Math.floor(
            totalPaid /
            installmentAmount
        );


    if (
        totalInstallments > 0
    ) {

        paid =
            Math.min(
                paid,
                totalInstallments
            );

    }


    return Math.max(
        paid,
        0
    );

}


// =====================================================
// NEXT DUE DATE
// =====================================================

function getNextDueDate(
    loan,
    totalPaidOverride = null
) {

    const stored =
        loan.nextDueDate ||
        loan.nextPaymentDate;


    if (stored) {

        const storedDate =
            parseDateValue(
                stored
            );


        if (storedDate) {
            return storedDate;
        }

    }


    const paidInstallments =
        getPaidInstallments(
            loan,
            totalPaidOverride
        );


    return getDueDateForInstallment(
        loan,
        paidInstallments + 1
    );

}


// =====================================================
// AUTOMATIC PENALTY
// =====================================================

function calculateAutomaticPenalty(
    loan,
    paidDateValue,
    totalPaidBeforePayment = null
) {

    const paidDate =
        parseDateValue(
            paidDateValue
        );


    if (!paidDate) {

        return {
            amount: 0,
            daysDelayed: 0,
            coolingApplied: false,
            dueDate: null,
            penaltyCycles: 0
        };

    }


    const paidInstallments =
        getPaidInstallments(
            loan,
            totalPaidBeforePayment
        );


    const dueDate =
        getDueDateForInstallment(
            loan,
            paidInstallments + 1
        );


    if (!dueDate) {

        return {
            amount: 0,
            daysDelayed: 0,
            coolingApplied: false,
            dueDate: null,
            penaltyCycles: 0
        };

    }


    const delayDays =
        daysBetween(
            dueDate,
            paidDate
        );


    const daysAfterCooling =
        Math.max(
            delayDays -
            PENALTY_COOLING_DAYS,
            0
        );


    const monthlyPenalty =
        getPenaltyForInstallment(
            loan.installmentAmount ??
            loan.monthlyInstallment ??
            loan.emi
        );


    let penaltyCycles =
        0;


    if (
        daysAfterCooling > 0
    ) {

        penaltyCycles =
            Math.max(
                Math.ceil(
                    daysAfterCooling /
                    30
                ),
                1
            );

    }


    return {

        amount:
            monthlyPenalty *
            penaltyCycles,

        daysDelayed:
            delayDays,

        coolingApplied:
            delayDays >
            PENALTY_COOLING_DAYS,

        dueDate,

        penaltyCycles

    };

}


// =====================================================
// RESET SCREEN
// =====================================================

function resetLoanDisplay() {

    setText(
        "loanId",
        "-"
    );

    setText(
        "loanType",
        "-"
    );

    setText(
        "loanDate",
        "-"
    );

    setText(
        "loanStatus",
        "-"
    );

    setText(
        "customerId",
        "-"
    );

    setText(
        "customerName",
        "-"
    );

    setText(
        "customerMobile",
        "-"
    );

    setText(
        "vehicleNumber",
        "-"
    );

    setText(
        "monthlyInstallment",
        "₹0"
    );

    setText(
        "totalPaid",
        "₹0"
    );

    setText(
        "totalPenalty",
        "₹0"
    );

    setText(
        "outstanding",
        "₹0"
    );

    setText(
        "previousOutstanding",
        "₹0"
    );

    setText(
        "newOutstanding",
        "₹0"
    );

    setText(
        "nextDueDate",
        "-"
    );

    setText(
        "totalInstallments",
        "0"
    );

    setText(
        "paidInstallments",
        "0"
    );

    setText(
        "pendingInstallments",
        "0"
    );

    setText(
        "lastPaymentDate",
        "-"
    );

    setText(
        "lastPaymentAmount",
        "₹0"
    );

    setText(
        "currentPenalty",
        "₹0"
    );

    setText(
        "penaltyStatus",
        "No Penalty"
    );

    setText(
        "daysDelayed",
        "0"
    );


    paymentHistoryBody.innerHTML = `
        <tr>
            <td colspan="10">
                <div class="empty">
                    Search a loan to view collection history.
                </div>
            </td>
        </tr>
    `;

}

// =====================================================
// OUTSTANDING
// =====================================================
function getOutstanding(loan) {

    if (!loan) {
        return 0;
    }

    // Use the actual outstanding stored in the loan.
    // Penalty must NOT be added again.
    if (
        loan.outstanding !== undefined &&
        loan.outstanding !== null &&
        loan.outstanding !== ""
    ) {
        return Math.max(
            numberValue(loan.outstanding),
            0
        );
    }

    const totalPayable =
        numberValue(
            loan.totalPayable ??
            loan.totalAmount ??
            loan.totalLoanPayable
        );

    const totalPaid =
        numberValue(
            loan.totalPaid ??
            loan.paidAmount ??
            loan.totalCollection
        );

    /*
     * For old records where outstanding is not available,
     * calculate without adding penalty again.
     */
    if (totalPayable > 0) {

        return Math.max(
            totalPayable -
            totalPaid,
            0
        );

    }

    const loanAmount =
        numberValue(
            loan.loanAmount ??
            loan.principalAmount ??
            loan.amount
        );

    if (loanAmount > 0) {

        return Math.max(
            loanAmount -
            totalPaid,
            0
        );

    }

    return 0;
}

// =====================================================
// RENDER LOAN
// =====================================================

function renderLoan() {

    if (!currentLoan) {
        return;
    }


    setText(
        "loanId",
        currentLoan.loanId ||
        currentLoan.loanNumber ||
        currentLoan.id
    );


    setText(
        "loanType",
        String(
            currentLoan.loanType ||
            "New Loan"
        ).toLowerCase() ===
        "reloan"
            ? "ReLoan"
            : "New Loan"
    );


    setText(
        "loanDate",
        formatDate(
            currentLoan.loanDate
        )
    );


    setText(
        "loanStatus",
        currentLoan.status ||
        "Active"
    );


    setText(
        "customerId",
        currentLoan.customerId ||
        "-"
    );


    setText(
        "customerName",
        currentLoan.customerName ||
        "-"
    );


    setText(
        "customerMobile",
        currentLoan.customerMobile ||
        currentLoan.mobile ||
        "-"
    );


    setText(
        "vehicleNumber",
        currentLoan.vehicleNumber ||
        "-"
    );


    // =================================================
    // BASIC FINANCIAL VALUES
    // =================================================

    const monthlyInstallment =
        numberValue(
            currentLoan.installmentAmount ??
            currentLoan.monthlyInstallment ??
            currentLoan.emi
        );


    const totalPaid =
        numberValue(
            currentLoan.totalPaid ??
            currentLoan.paidAmount ??
            currentLoan.totalCollection
        );


    const totalPenalty =
        numberValue(
            currentLoan.penaltyAmount ??
            currentLoan.totalPenalty ??
            currentLoan.penalty
        );


    const outstanding =
        getOutstanding(
            currentLoan
        );


    // =================================================
    // INSTALLMENT SUMMARY
    // =================================================

    const totalInstallments =
        numberValue(
            currentLoan.totalInstallments ??
            currentLoan.installments ??
            currentLoan.duration ??
            currentLoan.loanDuration ??
            currentLoan.tenure
        );


    const paidInstallments =
        getPaidInstallments(
            currentLoan,
            totalPaid
        );


    const pendingInstallments =
        Math.max(
            totalInstallments -
            paidInstallments,
            0
        );


    // =================================================
    // NEXT DUE DATE
    // =================================================

    const nextDueDate =
        getNextDueDate(
            currentLoan,
            totalPaid
        );


    // =================================================
    // SUMMARY DISPLAY
    // =================================================

    setText(
        "monthlyInstallment",
        formatCurrency(
            monthlyInstallment
        )
    );


    setText(
        "totalPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "totalPenalty",
        formatCurrency(
            totalPenalty
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "totalInstallments",
        totalInstallments
    );


    setText(
        "paidInstallments",
        paidInstallments
    );


    setText(
        "pendingInstallments",
        pendingInstallments
    );


    setText(
        "nextDueDate",
        formatDate(
            nextDueDate
        )
    );


    setText(
        "lastPaymentDate",
        formatDate(
            currentLoan.lastPaymentDate
        )
    );


    setText(
        "lastPaymentAmount",
        formatCurrency(
            currentLoan.lastPaymentAmount
        )
    );


    // =================================================
    // PAYMENT ENTRY DEFAULTS
    // =================================================

    if (
        paymentDate &&
        !paymentDate.value
    ) {

        paymentDate.value =
            getTodayDate();

    }


    updatePaymentPreview();


    // =================================================
    // CLOSED LOAN
    // =================================================

    const status =
        String(
            currentLoan.status ||
            ""
        ).toLowerCase();


    if (
        status === "closed" ||
        status === "completed"
    ) {

        disablePaymentEntry();

        showMessage(
            "This loan is already closed. New collection is not allowed."
        );

        return;

    }


    enablePaymentEntry();

}


// =====================================================
// ENABLE PAYMENT ENTRY
// =====================================================

function enablePaymentEntry() {

    if (amountReceived) {
        amountReceived.disabled =
            false;
    }


    if (paymentDate) {
        paymentDate.disabled =
            false;
    }


    if (paymentMode) {
        paymentMode.disabled =
            false;
    }


    if (paymentRemarks) {
        paymentRemarks.disabled =
            false;
    }


    if (savePaymentBtn) {
        savePaymentBtn.disabled =
            false;
    }

}


// =====================================================
// DISABLE PAYMENT ENTRY
// =====================================================

function disablePaymentEntry() {

    if (amountReceived) {
        amountReceived.disabled =
            true;
    }


    if (paymentDate) {
        paymentDate.disabled =
            true;
    }


    if (paymentMode) {
        paymentMode.disabled =
            true;
    }


    if (paymentRemarks) {
        paymentRemarks.disabled =
            true;
    }


    if (savePaymentBtn) {
        savePaymentBtn.disabled =
            true;
    }

}


// =====================================================
// SEARCH LOAN
// =====================================================

async function searchLoan() {

    const searchValue =
        loanSearchInput?.value
            ?.trim()
            ?.toLowerCase() || "";


    if (!searchValue) {

        showMessage(
            "Enter Loan ID, Customer ID or Vehicle Number."
        );

        return;

    }


    if (!searchLoanBtn) {
        return;
    }


    searchLoanBtn.disabled =
        true;

    searchLoanBtn.textContent =
        "Searching...";


    try {

        const loansRef =
            collection(
                db,
                "loans"
            );


        const snapshot =
            await getDocs(
                loansRef
            );


        const matches = [];


        snapshot.forEach(
            loanDoc => {

                const data =
                    loanDoc.data();


                const loanId =
                    String(
                        data.loanId ||
                        data.loanNumber ||
                        loanDoc.id ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const customerId =
                    String(
                        data.customerId ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const vehicleNumber =
                    String(
                        data.vehicleNumber ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if (
                    loanId ===
                    searchValue ||

                    customerId ===
                    searchValue ||

                    vehicleNumber ===
                    searchValue
                ) {

                    matches.push({

                        id:
                            loanDoc.id,

                        ...data

                    });

                }

            }
        );


        // =================================================
        // NO MATCH
        // =================================================

        if (
            matches.length === 0
        ) {

            currentLoan =
                null;

            currentLoanId =
                null;


            resetLoanDisplay();

            disablePaymentEntry();


            showMessage(
                `No loan found for "${loanSearchInput.value.trim()}".`
            );


            return;

        }


        // =================================================
        // EXACT MATCH
        // =================================================

        const exactMatch =
            matches.find(
                loan => {

                    const loanId =
                        String(
                            loan.loanId ||
                            loan.loanNumber ||
                            loan.id ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    const customerId =
                        String(
                            loan.customerId ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    const vehicleNumber =
                        String(
                            loan.vehicleNumber ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    return (

                        loanId ===
                        searchValue ||

                        customerId ===
                        searchValue ||

                        vehicleNumber ===
                        searchValue

                    );

                }
            );


        const selectedLoan =
            exactMatch ||
            matches[0];


        // =================================================
        // SET CURRENT LOAN
        // =================================================

        currentLoanId =
            selectedLoan.id;


        currentLoan =
            selectedLoan;


        // =================================================
        // RENDER
        // =================================================

        renderLoan();


        await loadPaymentHistory();


        enablePaymentEntry();


        showMessage(
            "Loan loaded successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Loan search error:",
            error
        );


        currentLoan =
            null;

        currentLoanId =
            null;


        resetLoanDisplay();

        disablePaymentEntry();


        showMessage(
            "Unable to search loan. Please try again."
        );


    } finally {

        searchLoanBtn.disabled =
            false;

        searchLoanBtn.textContent =
            "Search Loan";

    }

}


// =====================================================
// UPDATE PAYMENT PREVIEW
// =====================================================

function updatePaymentPreview() {

    if (!currentLoan) {

        setText(
            "previousOutstanding",
            "₹0"
        );

        setText(
            "resultAmount",
            "₹0"
        );

        setText(
            "resultPenalty",
            "₹0"
        );

        setText(
            "newOutstanding",
            "₹0"
        );

        setText(
            "currentPenalty",
            "₹0"
        );

        setText(
            "penaltyStatus",
            "No Penalty"
        );

        setText(
            "daysDelayed",
            "0"
        );

        return;

    }


    const outstanding =
        getOutstanding(
            currentLoan
        );


    const amount =
        Math.max(
            numberValue(
                amountReceived?.value
            ),
            0
        );


    const totalPaid =
        numberValue(
            currentLoan.totalPaid ??
            currentLoan.paidAmount ??
            currentLoan.totalCollection
        );


    const automaticPenalty =
        calculateAutomaticPenalty(
            currentLoan,
            paymentDate?.value ||
            getTodayDate(),
            totalPaid
        );


    const penalty =
        automaticPenalty.amount;
const totalReceived =
    amount + penalty;

    if (penaltyCollected) {

        penaltyCollected.value =
            String(
                penalty
            );

    }


const newOutstanding =
    Math.max(
        outstanding -
        amount +
        penalty,
        0
    );


    setText(
        "previousOutstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "resultAmount",
        formatCurrency(
            amount
        )
    );


    setText(
        "resultPenalty",
        formatCurrency(
            penalty
        )
    );


    setText(
        "newOutstanding",
        formatCurrency(
            newOutstanding
        )
    );


    setText(
        "currentPenalty",
        formatCurrency(
            penalty
        )
    );


    setText(
        "daysDelayed",
        automaticPenalty.daysDelayed
    );


    setText(
        "penaltyStatus",
        penalty > 0
            ? `Penalty Applied (${automaticPenalty.penaltyCycles} month)`
            : "No Penalty"
    );


    validatePaymentForm();

}


// =====================================================
// VALIDATE PAYMENT
// =====================================================

function validatePaymentForm() {

    if (!currentLoan) {
        return false;
    }


    const amount =
        numberValue(
            amountReceived?.value
        );


    if (
        amount <= 0
    ) {

        if (savePaymentBtn) {
            savePaymentBtn.disabled =
                true;
        }

        return false;

    }


    if (
        !paymentDate?.value
    ) {

        if (savePaymentBtn) {
            savePaymentBtn.disabled =
                true;
        }

        return false;

    }


    if (
        !paymentMode?.value
    ) {

        if (savePaymentBtn) {
            savePaymentBtn.disabled =
                true;
        }

        return false;

    }


    const status =
        String(
            currentLoan.status ||
            ""
        ).toLowerCase();


    if (
        status === "closed" ||
        status === "completed"
    ) {

        if (savePaymentBtn) {
            savePaymentBtn.disabled =
                true;
        }

        return false;

    }


    if (savePaymentBtn) {

        savePaymentBtn.disabled =
            false;

    }


    return true;

}


// =====================================================
// CLEAR PAYMENT FORM
// =====================================================

function clearPaymentForm() {

    if (paymentDate) {

        paymentDate.value =
            getTodayDate();

    }


    if (amountReceived) {

        amountReceived.value =
            "";

    }


    if (penaltyCollected) {

        penaltyCollected.value =
            "0";

    }


    if (paymentMode) {

        paymentMode.value =
            "";

    }


    if (paymentRemarks) {

        paymentRemarks.value =
            "";

    }


    paymentToken =
        createPaymentToken();


    updatePaymentPreview();

}


// =====================================================
// PAYMENT PREVIEW EVENTS
// =====================================================

if (amountReceived) {

    amountReceived.addEventListener(
        "input",
        updatePaymentPreview
    );

}


if (paymentDate) {

    paymentDate.addEventListener(
        "change",
        updatePaymentPreview
    );

}


if (paymentMode) {

    paymentMode.addEventListener(
        "change",
        validatePaymentForm
    );

}


// =====================================================
// SEARCH EVENTS
// =====================================================

if (searchLoanBtn) {

    searchLoanBtn.addEventListener(
        "click",
        searchLoan
    );

}


if (loanSearchInput) {

    loanSearchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchLoan();

            }

        }
    );

}


// =====================================================
// CLEAR BUTTON
// =====================================================

if (clearPaymentBtn) {

    clearPaymentBtn.addEventListener(
        "click",
        clearPaymentForm
    );

}

// =====================================================
// GET PAYMENT PENALTY
// =====================================================

function getPaymentPenalty(
    loan,
    paymentDateValue,
    totalPaidBeforePayment
) {

    return calculateAutomaticPenalty(
        loan,
        paymentDateValue,
        totalPaidBeforePayment
    );

}


// =====================================================
// SAVE PAYMENT
// =====================================================

async function savePayment() {

    if (!currentLoan) {

        showMessage(
            "Please search and select a loan first."
        );

        return;

    }


    if (
        !validatePaymentForm()
    ) {

        showMessage(
            "Please enter valid payment details."
        );

        return;

    }


    const amount =
        numberValue(
            amountReceived?.value
        );


    const date =
        paymentDate?.value ||
        getTodayDate();


    const mode =
        paymentMode?.value?.trim() ||
        "";


    const remarks =
        paymentRemarks?.value?.trim() ||
        "";


    if (
        amount <= 0
    ) {

        showMessage(
            "Please enter a valid payment amount."
        );

        return;

    }


    if (!mode) {

        showMessage(
            "Please select payment mode."
        );

        return;

    }


    // =================================================
    // LOAN STATUS CHECK
    // =================================================

    const currentStatus =
        String(
            currentLoan.status ||
            "Active"
        ).toLowerCase();


    if (
        currentStatus === "closed" ||
        currentStatus === "completed"
    ) {

        showMessage(
            "This loan is already closed."
        );

        disablePaymentEntry();

        return;

    }


    // =================================================
    // BUTTON LOCK
    // =================================================

    if (savePaymentBtn) {

        savePaymentBtn.disabled =
            true;

        savePaymentBtn.textContent =
            "Saving...";

    }


    try {

        const loanRef =
            doc(
                db,
                "loans",
                currentLoanId
            );


        /*
         * Payment document ID is generated from
         * the current payment token.
         *
         * This prevents duplicate payment creation
         * if the Save button is clicked twice.
         */

        const paymentId =
            `${currentLoanId}_${paymentToken}`;


        const paymentRef =
            doc(
                db,
                "payments",
                paymentId
            );


        let savedReceiptNumber =
            "";


        let savedPayment = null;


        // =================================================
        // FIRESTORE TRANSACTION
        // =================================================

        await runTransaction(
            db,
            async transaction => {

                const loanSnap =
                    await transaction.get(
                        loanRef
                    );


                if (
                    !loanSnap.exists()
                ) {

                    throw new Error(
                        "Loan record not found."
                    );

                }


                const latestLoan =
                    loanSnap.data();


                const latestStatus =
                    String(
                        latestLoan.status ||
                        "Active"
                    ).toLowerCase();


                if (
                    latestStatus ===
                    "closed" ||

                    latestStatus ===
                    "completed"
                ) {

                    throw new Error(
                        "This loan is already closed."
                    );

                }


                // =================================================
                // CURRENT TOTALS
                // =================================================

                const previousTotalPaid =
                    numberValue(
                        latestLoan.totalPaid ??
                        latestLoan.paidAmount ??
                        latestLoan.totalCollection
                    );


                const previousTotalPenalty =
                    numberValue(
                        latestLoan.penaltyAmount ??
                        latestLoan.totalPenalty ??
                        latestLoan.penalty
                    );


                const previousOutstanding =
                    getOutstanding(
                        latestLoan
                    );


                // =================================================
                // AUTOMATIC PENALTY
                // =================================================

                const penaltyResult =
                    getPaymentPenalty(
                        latestLoan,
                        date,
                        previousTotalPaid
                    );


                const penalty =
                    penaltyResult.amount;


                // =================================================
                // NEW TOTALS
                // =================================================

                const newTotalPaid =
                    previousTotalPaid +
                    amount;


                const newTotalPenalty =
                    previousTotalPenalty +
                    penalty;


                /*
                 * Balance is calculated from the actual
                 * previous outstanding plus new penalty,
                 * then reduced by the principal payment.
                 */

               const balanceAfterPayment =
    Math.max(
        previousOutstanding -
        amount,
        0
    );


                // =================================================
                // INSTALLMENT SUMMARY
                // =================================================

                const monthlyInstallment =
                    numberValue(
                        latestLoan.installmentAmount ??
                        latestLoan.monthlyInstallment ??
                        latestLoan.emi
                    );


                const totalInstallments =
                    numberValue(
                        latestLoan.totalInstallments ??
                        latestLoan.installments ??
                        latestLoan.duration ??
                        latestLoan.loanDuration ??
                        latestLoan.tenure
                    );


                let newPaidInstallments =
                    0;


                if (
                    monthlyInstallment >
                    0
                ) {

                    newPaidInstallments =
                        Math.floor(
                            newTotalPaid /
                            monthlyInstallment
                        );

                }


                if (
                    totalInstallments >
                    0
                ) {

                    newPaidInstallments =
                        Math.min(
                            newPaidInstallments,
                            totalInstallments
                        );

                }


                const newPendingInstallments =
                    Math.max(
                        totalInstallments -
                        newPaidInstallments,
                        0
                    );


                // =================================================
                // NEXT DUE DATE
                // =================================================

                const calculatedNextDueDate =
                    getDueDateForInstallment(
                        latestLoan,
                        newPaidInstallments + 1
                    );


                const nextDueDate =
                    calculatedNextDueDate
                        ? formatDateForStorage(
                            calculatedNextDueDate
                        )
                        : "";


                // =================================================
                // RECEIPT NUMBER
                // =================================================

                const previousReceiptNumber =
                    numberValue(
                        latestLoan.receiptSequence
                    );


                const nextReceiptSequence =
                    previousReceiptNumber +
                    1;


                savedReceiptNumber =
                    `SR-RCP-${new Date().getFullYear()}-${String(
                        nextReceiptSequence
                    ).padStart(
                        6,
                        "0"
                    )}`;


                // =================================================
                // PAYMENT DOCUMENT
                // =================================================

                savedPayment = {

                    paymentId:
                        paymentId,

                    loanId:
                        currentLoanId,
                    loanDocumentId:
    latestLoan.id ||
    currentLoanId,

                    receiptNumber:
                        savedReceiptNumber,

                    customerId:
                        latestLoan.customerId ||
                        "",

                    customerName:
                        latestLoan.customerName ||
                        "",

                    customerMobile:
                        latestLoan.customerMobile ||
                        latestLoan.mobile ||
                        "",

                    vehicleNumber:
                        latestLoan.vehicleNumber ||
                        "",

                    paymentDate:
                        date,

                    dueDate:
                        penaltyResult.dueDate
                            ? formatDateForStorage(
                                penaltyResult.dueDate
                            )
                            : "",

                    daysDelayed:
                        penaltyResult.daysDelayed,

                    coolingDays:
                        PENALTY_COOLING_DAYS,

                    penaltyCycles:
                        penaltyResult.penaltyCycles,

                    previousOutstanding:
                        previousOutstanding,

                    previousTotalPaid:
                        previousTotalPaid,

                    amountReceived:
                        amount,

                    penaltyCollected:
                        penalty,

          totalReceived:
    amount + penalty,

                    balanceAfterPayment:
                        balanceAfterPayment,

                    paymentMode:
                        mode,

                    remarks:
                        remarks,

                    staffId:
                        currentUser?.uid ||
                        "",

                    staffName:
                        currentUser?.displayName ||
                        currentUser?.email ||
                        "",

                    collectedByName:
                        currentUser?.displayName ||
                        currentUser?.email ||
                        "",

                    paidInstallments:
                        newPaidInstallments,

                    pendingInstallments:
                        newPendingInstallments,

                    totalInstallments:
                        totalInstallments,

                    createdAt:
                        serverTimestamp()

                };


                transaction.set(
                    paymentRef,
                    savedPayment
                );


                // =================================================
                // UPDATE LOAN
                // =================================================

                transaction.update(
                    loanRef,
                    {

                        totalPaid:
                            newTotalPaid,

                        paidAmount:
                            newTotalPaid,

                        totalCollection:
                            newTotalPaid,

                        penaltyAmount:
                            newTotalPenalty,

                        totalPenalty:
                            newTotalPenalty,

                        paidInstallments:
                            newPaidInstallments,

                        installmentsPaid:
                            newPaidInstallments,

                        pendingInstallments:
                            newPendingInstallments,

                        installmentsPending:
                            newPendingInstallments,

                        previousOutstanding:
                            previousOutstanding,

                        outstanding:
                            balanceAfterPayment,

                        lastPaymentDate:
                            date,

                        lastPaymentAmount:
                            amount,

                        lastPaymentPenalty:
                            penalty,

                        lastPaymentMode:
                            mode,

                        lastPaymentRemarks:
                            remarks,

                        nextDueDate:
                            nextDueDate,

                        receiptSequence:
                            nextReceiptSequence,

                        lastReceiptNumber:
                            savedReceiptNumber,

                        updatedAt:
                            serverTimestamp()

                    }
                );

            }
        );


        // =================================================
        // UPDATE LOCAL LOAN
        // =================================================

        currentLoan.totalPaid =
            numberValue(
                currentLoan.totalPaid
            ) +
            amount;


        currentLoan.paidAmount =
            currentLoan.totalPaid;


        currentLoan.totalCollection =
            currentLoan.totalPaid;


        currentLoan.penaltyAmount =
            numberValue(
                currentLoan.penaltyAmount
            ) +
            numberValue(
                savedPayment?.penaltyCollected
            );


        currentLoan.totalPenalty =
            currentLoan.penaltyAmount;


        currentLoan.paidInstallments =
            getPaidInstallments(
                currentLoan,
                currentLoan.totalPaid
            );


        currentLoan.installmentsPaid =
            currentLoan.paidInstallments;


        const localTotalInstallments =
            numberValue(
                currentLoan.totalInstallments ??
                currentLoan.installments ??
                currentLoan.duration ??
                currentLoan.loanDuration ??
                currentLoan.tenure
            );


        currentLoan.pendingInstallments =
            Math.max(
                localTotalInstallments -
                currentLoan.paidInstallments,
                0
            );


        currentLoan.installmentsPending =
            currentLoan.pendingInstallments;


  currentLoan.outstanding =
    Math.max(
        numberValue(
            currentLoan.outstanding
        ) -
        amount +
        numberValue(
            savedPayment?.penaltyCollected
        ),
        0
    );

        currentLoan.lastPaymentDate =
            date;


        currentLoan.lastPaymentAmount =
            amount;


        currentLoan.lastPaymentPenalty =
            numberValue(
                savedPayment?.penaltyCollected
            );


        currentLoan.lastPaymentMode =
            mode;


        currentLoan.lastPaymentRemarks =
            remarks;


        currentLoan.lastReceiptNumber =
            savedReceiptNumber;


        currentLoan.nextDueDate =
            getDueDateForInstallment(
                currentLoan,
                currentLoan.paidInstallments + 1
            );


        // =================================================
        // RESET TOKEN
        // =================================================

        paymentToken =
            createPaymentToken();


        // =================================================
        // REFRESH UI
        // =================================================

        renderLoan();


        await loadPaymentHistory();


        clearPaymentForm();


        showMessage(
            `Payment saved successfully. Receipt No: ${savedReceiptNumber}`,
            "success"
        );


    } catch (error) {

        console.error(
            "Payment save error:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to save payment. Please try again."
        );


    } finally {

        if (savePaymentBtn) {

            savePaymentBtn.disabled =
                false;

            savePaymentBtn.textContent =
                "Save Payment";

        }

    }

}


// =====================================================
// SAVE PAYMENT EVENT
// =====================================================

if (savePaymentBtn) {

    savePaymentBtn.addEventListener(
        "click",
        savePayment
    );

}

// =====================================================
// PAYMENT HISTORY HEADER
// =====================================================

function updatePaymentHistoryHeader() {

    if (!paymentHistoryBody) {
        return;
    }


    const table =
        paymentHistoryBody.closest(
            "table"
        );


    const headerRow =
        table?.querySelector(
            "thead tr"
        );


    if (!headerRow) {
        return;
    }


    headerRow.innerHTML = `

        <th>Receipt</th>

        <th>Due Date</th>

        <th>Paid Date</th>

        <th>Previous Pending</th>

        <th>Paid Amount</th>

        <th>Penalty</th>

        <th>Mode</th>

        <th>Balance</th>

        <th>Remarks</th>

        <th>Action</th>

    `;

}


// =====================================================
// LOAD PAYMENT HISTORY
// =====================================================

async function loadPaymentHistory() {

    if (
        !currentLoanId ||
        !paymentHistoryBody
    ) {

        return;

    }


    paymentHistoryBody.innerHTML = `

        <tr>
            <td colspan="10">
                <div class="empty">
                    Loading collection history...
                </div>
            </td>
        </tr>

    `;


    try {

        const paymentsRef =
            collection(
                db,
                "payments"
            );


        const paymentQuery =
            query(
                paymentsRef,
                where(
                    "loanId",
                    "==",
                    currentLoanId
                )
            );


        const snapshot =
            await getDocs(
                paymentQuery
            );


        const payments = [];


        snapshot.forEach(
            paymentDoc => {

                payments.push({

                    id:
                        paymentDoc.id,

                    ...paymentDoc.data()

                });

            }
        );


        // =================================================
        // SORT BY PAYMENT DATE
        // =================================================

        payments.sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    parseDateValue(
                        first.paymentDate
                    );


                const secondDate =
                    parseDateValue(
                        second.paymentDate
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
                    secondDate.getTime() -
                    firstDate.getTime()
                );

            }
        );


        renderPaymentHistory(
            payments
        );


    } catch (error) {

        console.error(
            "Payment history error:",
            error
        );


        paymentHistoryBody.innerHTML = `

            <tr>
                <td colspan="10">

                    <div class="empty">
                        Unable to load collection history.
                    </div>

                </td>
            </tr>

        `;

    }

}


// =====================================================
// RENDER PAYMENT HISTORY
// =====================================================

function renderPaymentHistory(
    payments
) {

    if (
        !payments.length
    ) {

        paymentHistoryBody.innerHTML = `

            <tr>
                <td colspan="10">

                    <div class="empty">
                        No collection history found.
                    </div>

                </td>
            </tr>

        `;

        return;

    }


    paymentHistoryBody.innerHTML =
        payments.map(
            payment => {

                const previousPending =
                    numberValue(
                        payment.previousOutstanding
                    );


                const paidAmount =
                    numberValue(
                        payment.amountReceived
                    );


                const penalty =
                    numberValue(
                        payment.penaltyCollected
                    );


                const balance =
                    numberValue(
                        payment.balanceAfterPayment
                    );


                const paymentData =
                    encodeURIComponent(
                        JSON.stringify(
                            payment
                        )
                    );


                return `

                    <tr>

                        <td>

                            <span class="receipt">

                                ${escapeHTML(
                                    payment.receiptNumber ||
                                    payment.receiptNo ||
                                    "-"
                                )}

                            </span>

                        </td>


                        <td>

                            ${formatDate(
                                payment.dueDate
                            )}

                        </td>


                        <td>

                            ${formatDate(
                                payment.paymentDate
                            )}

                        </td>


                        <td>

                            ${formatCurrency(
                                previousPending
                            )}

                        </td>


                        <td>

                            ${formatCurrency(
                                paidAmount
                            )}

                        </td>


                        <td>

                            ${formatCurrency(
                                penalty
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                payment.paymentMode ||
                                "-"
                            )}

                        </td>


                        <td>

                            ${formatCurrency(
                                balance
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                payment.remarks ||
                                "-"
                            )}

                        </td>


                        <td>

                            <button
                                type="button"
                                class="view-payment-btn"
                                data-payment="${paymentData}"
                            >
                                View
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    bindPaymentViewButtons();

}


// =====================================================
// VIEW BUTTON
// =====================================================

function bindPaymentViewButtons() {

    const buttons =
        document.querySelectorAll(
            ".view-payment-btn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    try {

                        const payment =
                            JSON.parse(
                                decodeURIComponent(
                                    this.dataset.payment
                                )
                            );


                        showPaymentDetails(
                            payment
                        );


                    } catch (error) {

                        console.error(
                            "Payment details error:",
                            error
                        );


                        showMessage(
                            "Unable to open payment details."
                        );

                    }

                }
            );

        }
    );

}


// =====================================================
// PAYMENT DETAILS MODAL
// =====================================================

function showPaymentDetails(
    payment
) {

    const existingModal =
        document.getElementById(
            "paymentDetailsModal"
        );


    if (existingModal) {
        existingModal.remove();
    }


    const paidAmount =
        numberValue(
            payment.amountReceived
        );


    const penalty =
        numberValue(
            payment.penaltyCollected
        );


    const totalReceived =
    paidAmount;


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "paymentDetailsModal";


    modal.innerHTML = `

        <div class="payment-modal-backdrop">

            <div class="payment-modal">

                <div class="payment-modal-header">

                    <h3>
                        Collection Details
                    </h3>


                    <button
                        type="button"
                        id="closePaymentDetails"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="printablePaymentReceipt"
                    class="payment-receipt"
                >

                    <h2>
                        SR Auto Finance
                    </h2>


                    <h4>
                        Collection Receipt
                    </h4>


                    <div class="receipt-grid">


                        <div>

                            <strong>
                                Receipt No
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.receiptNumber ||
                                    payment.receiptNo ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Loan ID
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.loanId ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Customer
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.customerName ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Customer ID
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.customerId ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Vehicle No
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.vehicleNumber ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Due Date
                            </strong>

                            <span>
                                ${formatDate(
                                    payment.dueDate
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Paid Date
                            </strong>

                            <span>
                                ${formatDate(
                                    payment.paymentDate
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Days Delayed
                            </strong>

                            <span>
                                ${numberValue(
                                    payment.daysDelayed
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Previous Pending
                            </strong>

                            <span>
                                ${formatCurrency(
                                    payment.previousOutstanding
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Paid Amount
                            </strong>

                            <span>
                                ${formatCurrency(
                                    paidAmount
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Penalty
                            </strong>

                            <span>
                                ${formatCurrency(
                                    penalty
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Total Received
                            </strong>

                            <span>
                                ${formatCurrency(
                                    totalReceived
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Balance
                            </strong>

                            <span>
                                ${formatCurrency(
                                    payment.balanceAfterPayment
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Payment Mode
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.paymentMode ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                Collected By
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.staffName ||
                                    payment.collectedByName ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div class="receipt-remarks">

                            <strong>
                                Remarks
                            </strong>

                            <span>
                                ${escapeHTML(
                                    payment.remarks ||
                                    "-"
                                )}
                            </span>

                        </div>


                    </div>


                    <div class="receipt-footer">

                        Thank you.

                    </div>

                </div>


                <div class="payment-modal-actions">


                    <button
                        type="button"
                        id="printPaymentReceipt"
                    >
                        Print Receipt
                    </button>


                    <button
                        type="button"
                        id="downloadPaymentReceipt"
                    >
                        Download Receipt
                    </button>


                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    // =================================================
    // CLOSE
    // =================================================

    document
        .getElementById(
            "closePaymentDetails"
        )
        ?.addEventListener(
            "click",
            () => {

                modal.remove();

            }
        );


    // =================================================
    // PRINT
    // =================================================

    document
        .getElementById(
            "printPaymentReceipt"
        )
        ?.addEventListener(
            "click",
            () => {

                printPaymentReceipt();

            }
        );


    // =================================================
    // DOWNLOAD
    // =================================================

    document
        .getElementById(
            "downloadPaymentReceipt"
        )
        ?.addEventListener(
            "click",
            () => {

                downloadPaymentReceipt(
                    payment
                );

            }
        );

}


// =====================================================
// PRINT PAYMENT RECEIPT
// =====================================================

function printPaymentReceipt() {

    const receipt =
        document.getElementById(
            "printablePaymentReceipt"
        );


    if (!receipt) {
        return;
    }


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=800,height=900"
        );


    if (!printWindow) {

        showMessage(
            "Please allow pop-ups to print the receipt."
        );

        return;

    }


    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                SR Auto Finance Receipt
            </title>

            <meta
                charset="UTF-8"
            >

            <style>

                body {

                    font-family:
                        Arial,
                        sans-serif;

                    padding:
                        30px;

                    color:
                        #111;

                }


                h2,
                h4 {

                    text-align:
                        center;

                    margin:
                        4px 0;

                }


                .receipt-grid {

                    display:
                        grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap:
                        12px;

                    margin-top:
                        25px;

                }


                .receipt-grid > div {

                    border-bottom:
                        1px solid #ddd;

                    padding:
                        8px 0;

                }


                strong {

                    display:
                        block;

                    margin-bottom:
                        4px;

                }


                .receipt-remarks {

                    grid-column:
                        1 / -1;

                }


                .receipt-footer {

                    text-align:
                        center;

                    margin-top:
                        30px;

                }


                @media print {

                    body {

                        padding:
                            10px;

                    }

                }

            </style>

        </head>


        <body>

            ${receipt.innerHTML}

        </body>

        </html>

    `);


    printWindow.document.close();


    printWindow.focus();


    setTimeout(
        () => {

            printWindow.print();

            printWindow.close();

        },
        300
    );

}


// =====================================================
// DOWNLOAD PAYMENT RECEIPT
// =====================================================

function downloadPaymentReceipt(
    payment
) {

    const paidAmount =
        numberValue(
            payment.amountReceived
        );


    const penalty =
        numberValue(
            payment.penaltyCollected
        );


    const totalReceived =
    paidAmount;


    const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
SR Auto Finance Receipt
</title>


<style>

body {

    font-family:
        Arial,
        sans-serif;

    max-width:
        800px;

    margin:
        30px auto;

    padding:
        20px;

}


h2,
h4 {

    text-align:
        center;

}


table {

    width:
        100%;

    border-collapse:
        collapse;

    margin-top:
        25px;

}


td {

    border:
        1px solid #ddd;

    padding:
        10px;

}


td:first-child {

    font-weight:
        bold;

    width:
        35%;

}


.footer {

    text-align:
        center;

    margin-top:
        30px;

}

</style>

</head>


<body>


<h2>
SR Auto Finance
</h2>


<h4>
Collection Receipt
</h4>


<table>


<tr>

<td>
Receipt No
</td>

<td>
${escapeHTML(
    payment.receiptNumber ||
    payment.receiptNo ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Loan ID
</td>

<td>
${escapeHTML(
    payment.loanId ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Customer
</td>

<td>
${escapeHTML(
    payment.customerName ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Customer ID
</td>

<td>
${escapeHTML(
    payment.customerId ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Vehicle No
</td>

<td>
${escapeHTML(
    payment.vehicleNumber ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Due Date
</td>

<td>
${formatDate(
    payment.dueDate
)}
</td>

</tr>


<tr>

<td>
Paid Date
</td>

<td>
${formatDate(
    payment.paymentDate
)}
</td>

</tr>


<tr>

<td>
Days Delayed
</td>

<td>
${numberValue(
    payment.daysDelayed
)}
</td>

</tr>


<tr>

<td>
Previous Pending
</td>

<td>
${formatCurrency(
    payment.previousOutstanding
)}
</td>

</tr>


<tr>

<td>
Paid Amount
</td>

<td>
${formatCurrency(
    paidAmount
)}
</td>

</tr>


<tr>

<td>
Penalty
</td>

<td>
${formatCurrency(
    penalty
)}
</td>

</tr>


<tr>

<td>
Total Received
</td>

<td>
${formatCurrency(
    totalReceived
)}
</td>

</tr>


<tr>

<td>
Balance
</td>

<td>
${formatCurrency(
    payment.balanceAfterPayment
)}
</td>

</tr>


<tr>

<td>
Mode
</td>

<td>
${escapeHTML(
    payment.paymentMode ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Collected By
</td>

<td>
${escapeHTML(
    payment.staffName ||
    payment.collectedByName ||
    "-"
)}
</td>

</tr>


<tr>

<td>
Remarks
</td>

<td>
${escapeHTML(
    payment.remarks ||
    "-"
)}
</td>

</tr>


</table>


<div class="footer">

Thank you.

</div>


</body>

</html>

`;


    const blob =
        new Blob(
            [html],
            {
                type:
                    "text/html;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `SR-Auto-Finance-Receipt-${payment.receiptNumber || "receipt"}.html`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


// =====================================================
// INITIAL DATE
// =====================================================

if (paymentDate) {

    paymentDate.value =
        getTodayDate();

}


// =====================================================
// PAYMENT HISTORY HEADER
// =====================================================

updatePaymentHistoryHeader();


// =====================================================
// INITIAL SCREEN
// =====================================================

resetLoanDisplay();


// =====================================================
// AUTH
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


        updatePaymentHistoryHeader();


        resetLoanDisplay();


        // =================================================
        // COLLECTION PAGE
        // =================================================

        if (
            paymentDate &&
            !paymentDate.value
        ) {

            paymentDate.value =
                getTodayDate();

        }

    }
);
