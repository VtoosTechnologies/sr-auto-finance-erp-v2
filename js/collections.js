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
// FORMAT DATE
// =====================================================

function formatDate(
    value
) {

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
        Number(value);

    if (
        isNaN(number)
    ) {

        return 0;

    }

    return number;

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


    paymentHistoryBody.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="empty">
                    Search a loan to view collection history.
                </div>
            </td>
        </tr>
    `;

}


// =====================================================
// LOAD LOAN BY SEARCH
// =====================================================

async function searchLoan() {

    const searchValue =
        loanSearchInput.value.trim();


    if (!searchValue) {

        showMessage(
            "Enter Loan ID, Customer ID or Vehicle Number."
        );

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


        /*
         * First try exact Loan ID.
         */

        let snapshot =
            await getDocs(
                query(
                    loansRef,
                    where(
                        "loanId",
                        "==",
                        searchValue
                    )
                )
            );


        /*
         * If not found, try Customer ID.
         */

        if (
            snapshot.empty
        ) {

            snapshot =
                await getDocs(
                    query(
                        loansRef,
                        where(
                            "customerId",
                            "==",
                            searchValue
                        )
                    )
                );

        }


        /*
         * If not found, try Vehicle Number.
         */

        if (
            snapshot.empty
        ) {

            snapshot =
                await getDocs(
                    query(
                        loansRef,
                        where(
                            "vehicleNumber",
                            "==",
                            searchValue
                        )
                    )
                );

        }


        if (
            snapshot.empty
        ) {

            currentLoan =
                null;

            currentLoanId =
                null;

            resetLoanDisplay();

            disablePaymentEntry();

            showMessage(
                "Loan not found."
            );

            return;

        }


        /*
         * If multiple records match,
         * use the first exact result.
         *
         * Loan ID should normally be unique.
         */

        const loanDoc =
            snapshot.docs[0];


        currentLoanId =
            loanDoc.id;


        currentLoan = {

            id:
                loanDoc.id,

            ...loanDoc.data()

        };


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

        showMessage(
            "Unable to search loan."
        );

    } finally {

        searchLoanBtn.disabled =
            false;

        searchLoanBtn.textContent =
            "Search Loan";

    }

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


    const penalty =
        numberValue(
            currentLoan.penaltyAmount ??
            currentLoan.penalty ??
            currentLoan.totalPenalty
        );


    const outstanding =
        getOutstanding(
            currentLoan
        );


    const pendingInstallments =
        numberValue(
            currentLoan.pendingInstallments ??
            currentLoan.installmentsPending
        );


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
            penalty
        )
    );


    setText(
        "outstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "previousOutstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "newOutstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "nextDueDate",
        formatDate(
            currentLoan.nextDueDate
        )
    );


    setText(
        "pendingInstallments",
        pendingInstallments
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


    /*
     * Closed loans should not accept
     * new collections.
     */

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

    }

}


// =====================================================
// OUTSTANDING
// =====================================================

function getOutstanding(
    loan
) {

    /*
     * Current balance is always preferred.
     */

    if (
        loan.outstandingAmount !==
        undefined &&
        loan.outstandingAmount !==
        null
    ) {

        return Math.max(
            numberValue(
                loan.outstandingAmount
            ),
            0
        );

    }


    if (
        loan.balanceAmount !==
        undefined &&
        loan.balanceAmount !==
        null
    ) {

        return Math.max(
            numberValue(
                loan.balanceAmount
            ),
            0
        );

    }


    if (
        loan.remainingAmount !==
        undefined &&
        loan.remainingAmount !==
        null
    ) {

        return Math.max(
            numberValue(
                loan.remainingAmount
            ),
            0
        );

    }


    /*
     * Fallback calculation.
     */

    const loanAmount =
        numberValue(
            loan.loanAmount ??
            loan.principalAmount ??
            loan.amount
        );


    const totalPaid =
        numberValue(
            loan.totalPaid ??
            loan.paidAmount
        );


    return Math.max(
        loanAmount -
        totalPaid,
        0
    );

}


// =====================================================
// ENABLE PAYMENT
// =====================================================

function enablePaymentEntry() {

    if (!amountReceived) {
        return;
    }


    amountReceived.disabled =
        false;

    penaltyCollected.disabled =
        false;

    paymentMode.disabled =
        false;

    paymentDate.disabled =
        false;

    paymentRemarks.disabled =
        false;


    updatePaymentPreview();

}


// =====================================================
// DISABLE PAYMENT
// =====================================================

function disablePaymentEntry() {

    if (!amountReceived) {
        return;
    }


    amountReceived.disabled =
        true;

    penaltyCollected.disabled =
        true;

    paymentMode.disabled =
        true;

    paymentDate.disabled =
        true;

    paymentRemarks.disabled =
        true;

    savePaymentBtn.disabled =
        true;

}


// =====================================================
// PAYMENT PREVIEW
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

        return;

    }


    const outstanding =
        getOutstanding(
            currentLoan
        );


    const amount =
        Math.max(
            numberValue(
                amountReceived.value
            ),
            0
        );


    const penalty =
        Math.max(
            numberValue(
                penaltyCollected.value
            ),
            0
        );


    /*
     * Amount Received is treated as
     * payment against loan outstanding.
     *
     * Penalty is recorded separately.
     *
     * Therefore:
     *
     * New Outstanding =
     * Previous Outstanding - Amount Received
     */

    const newOutstanding =
        Math.max(
            outstanding -
            amount,
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


    validatePaymentForm();

}


// =====================================================
// VALIDATE PAYMENT
// =====================================================

function validatePaymentForm() {

    if (
        !currentLoan ||
        !currentLoanId
    ) {

        savePaymentBtn.disabled =
            true;

        return;

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

        savePaymentBtn.disabled =
            true;

        return;

    }


    const amount =
        numberValue(
            amountReceived.value
        );


    const penalty =
        numberValue(
            penaltyCollected.value
        );


    const outstanding =
        getOutstanding(
            currentLoan
        );


    const validAmount =
        amount > 0 &&
        amount <= outstanding;


    const validPenalty =
        penalty >= 0;


    const validDate =
        Boolean(
            paymentDate.value
        );


    const validMode =
        Boolean(
            paymentMode.value
        );


    savePaymentBtn.disabled =
        !(
            validAmount &&
            validPenalty &&
            validDate &&
            validMode
        );

}


// =====================================================
// LOAD PAYMENT HISTORY
// =====================================================

async function loadPaymentHistory() {

    if (!currentLoanId) {
        return;
    }


    paymentHistoryBody.innerHTML = `
        <tr>
            <td colspan="7">
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
                    "loanDocumentId",
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


        /*
         * Newest payment first.
         */

        payments.sort(
            (a, b) => {

                const dateA =
                    new Date(
                        a.paymentDate ||
                        a.createdAt?.toDate?.() ||
                        0
                    );

                const dateB =
                    new Date(
                        b.paymentDate ||
                        b.createdAt?.toDate?.() ||
                        0
                    );

                return (
                    dateB - dateA
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
                <td colspan="7">
                    <div class="empty">
                        Unable to load collection history.
                    </div>
                </td>
            </tr>
        `;

    }

}


// =====================================================
// RENDER HISTORY
// =====================================================

function renderPaymentHistory(
    payments
) {

    if (
        !payments.length
    ) {

        paymentHistoryBody.innerHTML = `
            <tr>
                <td colspan="7">
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
                                payment.paymentDate
                            )}
                        </td>


                        <td>
                            ${formatCurrency(
                                payment.amountReceived
                            )}
                        </td>


                        <td>
                            ${formatCurrency(
                                payment.penaltyCollected
                            )}
                        </td>


                        <td>

                            <span class="payment-mode">
                                ${escapeHTML(
                                    payment.paymentMode ||
                                    "-"
                                )}
                            </span>

                        </td>


                        <td>
                            ${formatCurrency(
                                payment.balanceAfterPayment
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                payment.remarks ||
                                "-"
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// =====================================================
// RECEIPT NUMBER
// =====================================================

function generateReceiptNumber(
    sequence
) {

    const year =
        new Date()
            .getFullYear();


    const number =
        String(
            sequence
        ).padStart(
            6,
            "0"
        );


    return `SR-RCP-${year}-${number}`;

}


// =====================================================
// SAVE PAYMENT
// =====================================================

async function savePayment() {

    if (!currentLoanId) {

        showMessage(
            "Please search and select a loan first."
        );

        return;

    }


    const status =
        String(
            currentLoan?.status ||
            ""
        ).toLowerCase();


    if (
        status === "closed" ||
        status === "completed"
    ) {

        showMessage(
            "Closed loan cannot receive a new payment."
        );

        return;

    }


    const amount =
        numberValue(
            amountReceived.value
        );


    const penalty =
        numberValue(
            penaltyCollected.value
        );


    const date =
        paymentDate.value;


    const mode =
        paymentMode.value;


    const remarks =
        paymentRemarks.value.trim();


    const outstanding =
        getOutstanding(
            currentLoan
        );


    // =================================================
    // VALIDATION
    // =================================================

    if (
        !date
    ) {

        showMessage(
            "Please select payment date."
        );

        return;

    }


    if (
        amount <= 0
    ) {

        showMessage(
            "Please enter a valid amount received."
        );

        return;

    }


    if (
        amount > outstanding
    ) {

        showMessage(
            `Amount cannot exceed current outstanding ${formatCurrency(
                outstanding
            )}.`
        );

        return;

    }


    if (
        penalty < 0
    ) {

        showMessage(
            "Penalty cannot be negative."
        );

        return;

    }


    if (
        !mode
    ) {

        showMessage(
            "Please select payment mode."
        );

        return;

    }


    savePaymentBtn.disabled =
        true;

    savePaymentBtn.textContent =
        "Saving...";


    try {

        /*
         * Payment document ID is deterministic
         * for this payment attempt.
         *
         * Double-click will therefore use
         * the same document ID.
         */

        const paymentId =
            `${currentLoanId}_${paymentToken}`;


        const paymentRef =
            doc(
                db,
                "payments",
                paymentId
            );


        const loanRef =
            doc(
                db,
                "loans",
                currentLoanId
            );


        let savedReceiptNumber =
            "";


        await runTransaction(
            db,
            async transaction => {

                // =====================================
                // RE-READ LOAN
                // =====================================

                const loanSnap =
                    await transaction.get(
                        loanRef
                    );


                if (
                    !loanSnap.exists()
                ) {

                    throw new Error(
                        "Loan not found."
                    );

                }


                const latestLoan =
                    loanSnap.data();


                const latestStatus =
                    String(
                        latestLoan.status ||
                        ""
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


                // =====================================
                // LATEST BALANCE
                // =====================================

                const latestOutstanding =
                    getOutstanding(
                        latestLoan
                    );


                if (
                    amount >
                    latestOutstanding
                ) {

                    throw new Error(
                        "Payment amount is greater than current outstanding."
                    );

                }


                const newOutstanding =
                    Math.max(
                        latestOutstanding -
                        amount,
                        0
                    );


                // =====================================
                // TOTAL PAID
                // =====================================

                const previousTotalPaid =
                    numberValue(
                        latestLoan.totalPaid ??
                        latestLoan.paidAmount ??
                        latestLoan.totalCollection
                    );


                const newTotalPaid =
                    previousTotalPaid +
                    amount;


                // =====================================
                // TOTAL PENALTY
                // =====================================

                const previousPenalty =
                    numberValue(
                        latestLoan.penaltyAmount ??
                        latestLoan.penalty ??
                        latestLoan.totalPenalty
                    );


                const newTotalPenalty =
                    previousPenalty +
                    penalty;


                // =====================================
                // PAYMENT SEQUENCE
                // =====================================

                const previousSequence =
                    numberValue(
                        latestLoan.paymentSequence
                    );


                const nextSequence =
                    previousSequence +
                    1;


                savedReceiptNumber =
                    generateReceiptNumber(
                        nextSequence
                    );


                // =====================================
                // INSTALLMENT CALCULATION
                // =====================================

                const monthlyInstallment =
                    numberValue(
                        latestLoan.installmentAmount ??
                        latestLoan.monthlyInstallment ??
                        latestLoan.emi
                    );


                const oldPaidInstallments =
                    numberValue(
                        latestLoan.paidInstallments ??
                        latestLoan.installmentsPaid
                    );


                /*
                 * Installment count is increased
                 * only when payment covers one
                 * full monthly installment.
                 *
                 * Partial payment does not
                 * automatically count as full
                 * installment.
                 */

                let newPaidInstallments =
                    oldPaidInstallments;


                if (
                    monthlyInstallment > 0 &&
                    amount >= monthlyInstallment
                ) {

                    const fullInstallments =
                        Math.floor(
                            amount /
                            monthlyInstallment
                        );


                    newPaidInstallments +=
                        fullInstallments;

                }


                // =====================================
                // PENDING INSTALLMENTS
                // =====================================

                const totalInstallments =
                    numberValue(
                        latestLoan.totalInstallments ??
                        latestLoan.installments ??
                        latestLoan.duration ??
                        latestLoan.loanDuration ??
                        latestLoan.tenure
                    );


                let newPendingInstallments =
                    numberValue(
                        latestLoan.pendingInstallments ??
                        latestLoan.installmentsPending
                    );


                if (
                    totalInstallments > 0
                ) {

                    newPendingInstallments =
                        Math.max(
                            totalInstallments -
                            newPaidInstallments,
                            0
                        );

                }


                // =====================================
                // PAYMENT DOCUMENT
                // =====================================

                transaction.set(
                    paymentRef,
                    {

                        paymentId:
                            paymentId,

                        loanDocumentId:
                            currentLoanId,

                        loanId:
                            latestLoan.loanId ||
                            latestLoan.loanNumber ||
                            currentLoanId,

                        customerId:
                            latestLoan.customerId ||
                            "",

                        customerName:
                            latestLoan.customerName ||
                            "",

                        vehicleNumber:
                            latestLoan.vehicleNumber ||
                            "",

                        receiptNumber:
                            savedReceiptNumber,

                        paymentDate:
                            date,

                        amountReceived:
                            amount,

                        penaltyCollected:
                            penalty,

                        totalCollection:
                            amount +
                            penalty,

                        paymentMode:
                            mode,

                        previousOutstanding:
                            latestOutstanding,

                        balanceAfterPayment:
                            newOutstanding,

                        remarks:
                            remarks,

                        createdBy:
                            currentUser.uid,

                        createdAt:
                            serverTimestamp()

                    }
                );


                // =====================================
                // UPDATE LOAN
                // =====================================

                transaction.update(
                    loanRef,
                    {

                        totalPaid:
                            newTotalPaid,

                        paidAmount:
                            newTotalPaid,

                        totalCollection:
                            newTotalPaid,

                        outstandingAmount:
                            newOutstanding,

                        balanceAmount:
                            newOutstanding,

                        remainingAmount:
                            newOutstanding,

                        penaltyAmount:
                            newTotalPenalty,

                        totalPenalty:
                            newTotalPenalty,

                        paymentSequence:
                            nextSequence,

                        lastPaymentDate:
                            date,

                        lastPaymentAmount:
                            amount,

                        lastPaymentMode:
                            mode,

                        lastReceiptNumber:
                            savedReceiptNumber,

                        paidInstallments:
                            newPaidInstallments,

                        installmentsPaid:
                            newPaidInstallments,

                        pendingInstallments:
                            newPendingInstallments,

                        installmentsPending:
                            newPendingInstallments,

                        updatedAt:
                            serverTimestamp(),

                        updatedBy:
                            currentUser.uid

                    }
                );

            }
        );


        /*
         * Update local loan state.
         */

        currentLoan.totalPaid =
            numberValue(
                currentLoan.totalPaid
            ) +
            amount;


        currentLoan.paidAmount =
            currentLoan.totalPaid;


        currentLoan.totalCollection =
            currentLoan.totalPaid;


        currentLoan.outstandingAmount =
            Math.max(
                outstanding -
                amount,
                0
            );


        currentLoan.balanceAmount =
            currentLoan.outstandingAmount;


        currentLoan.remainingAmount =
            currentLoan.outstandingAmount;


        currentLoan.penaltyAmount =
            numberValue(
                currentLoan.penaltyAmount
            ) +
            penalty;


        currentLoan.totalPenalty =
            currentLoan.penaltyAmount;


        currentLoan.lastPaymentDate =
            date;


        currentLoan.lastPaymentAmount =
            amount;


        currentLoan.lastPaymentMode =
            mode;


        currentLoan.lastReceiptNumber =
            savedReceiptNumber;


        renderLoan();


        await loadPaymentHistory();


        showMessage(
            `Collection saved successfully. Receipt: ${savedReceiptNumber}`,
            "success"
        );


        /*
         * New payment attempt gets a new token.
         */

        paymentToken =
            createPaymentToken();


        clearPaymentForm(
            false
        );


    } catch (error) {

        console.error(
            "Payment save error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to save collection."
        );

    } finally {

        savePaymentBtn.textContent =
            "Save Collection";


        validatePaymentForm();

    }

}


// =====================================================
// CLEAR PAYMENT FORM
// =====================================================

function clearPaymentForm(
    resetToken = true
) {

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


    if (resetToken) {

        paymentToken =
            createPaymentToken();

    }


    updatePaymentPreview();

}


// =====================================================
// EVENTS
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
        function(event) {

            if (
                event.key ===
                "Enter"
            ) {

                searchLoan();

            }

        }
    );

}


if (amountReceived) {

    amountReceived.addEventListener(
        "input",
        updatePaymentPreview
    );

}


if (penaltyCollected) {

    penaltyCollected.addEventListener(
        "input",
        updatePaymentPreview
    );

}


if (paymentDate) {

    paymentDate.addEventListener(
        "change",
        validatePaymentForm
    );

}


if (paymentMode) {

    paymentMode.addEventListener(
        "change",
        validatePaymentForm
    );

}


if (savePaymentBtn) {

    savePaymentBtn.addEventListener(
        "click",
        savePayment
    );

}


if (clearPaymentBtn) {

    clearPaymentBtn.addEventListener(
        "click",
        function() {

            clearPaymentForm();

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


        /*
         * Default payment date.
         */

        if (paymentDate) {

            paymentDate.value =
                getTodayDate();

        }


        disablePaymentEntry();

        resetLoanDisplay();


        /*
         * If collection page is opened
         * directly with ?id=LOAN_DOCUMENT_ID,
         * load that loan automatically.
         */

        const params =
            new URLSearchParams(
                window.location.search
            );


        const urlLoanId =
            params.get("id");


        if (urlLoanId) {

            try {

                const loanRef =
                    doc(
                        db,
                        "loans",
                        urlLoanId
                    );


                const loanSnap =
                    await getDoc(
                        loanRef
                    );


                if (
                    loanSnap.exists()
                ) {

                    currentLoanId =
                        loanSnap.id;


                    currentLoan = {

                        id:
                            loanSnap.id,

                        ...loanSnap.data()

                    };


                    renderLoan();


                    await loadPaymentHistory();


                    enablePaymentEntry();

                }

            } catch (error) {

                console.error(
                    "Direct loan loading error:",
                    error
                );

            }

        }

    }
);
