// =====================================================
// SR AUTO FINANCE ERP
// LOAN VIEW CONTROLLER
// =====================================================

import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// =====================================================
// GLOBAL
// =====================================================

let currentLoan = null;
let currentCustomer = null;
let currentUser = null;

let loanDocuments = [];

// =====================================================
// REPAYMENT SCHEDULE STATE
// =====================================================

let repaymentSchedule = [];
let repaymentPayments = [];


// =====================================================
// URL / LOAN ID
// =====================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const loanDocumentId =
    urlParams.get("id") ||
    urlParams.get("loanId");


// =====================================================
// ELEMENT HELPERS
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

    if (!element) {
        return;
    }

    element.textContent =
        value ??
        "-";

}


function setHTML(
    id,
    value
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.innerHTML =
        value ??
        "";

}


function showElement(id) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.style.display =
        "";

}


function hideElement(id) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.style.display =
        "none";

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
                    .replace(/,/g, "")
                    .replace(/[₹$]/g, "")
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
        getNumber(value)
    );

}


function formatNumber(
    value
) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        getNumber(value)
    );

}


function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    try {

        const date =
            value &&
            typeof value.toDate === "function"
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
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch (error) {

        return "-";

    }

}


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


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    message
) {

    const element =
        getElement(
            "message"
        );

    if (element) {

        element.textContent =
            message;

        element.style.display =
            "block";

        setTimeout(
            () => {

                element.style.display =
                    "none";

            },
            3000
        );

        return;
    }

    alert(message);

}


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

        await loadLoan();

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

        // IMPORTANT
        // Documents should NOT load when page opens.
        // Repayment should NOT load when page opens.

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

    if (!customerDocumentId) {
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

    } catch (error) {

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


    // -----------------------------------------------------
    // BASIC LOAN DETAILS
    // -----------------------------------------------------

    setText(
        "loanId",
        firstValue(
            loan,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ],
            loan.id
        )
    );


    setText(
        "loanType",
        firstValue(
            loan,
            [
                "loanType",
                "type"
            ],
            "New Loan"
        )
    );


    setText(
        "loanStatus",
        firstValue(
            loan,
            [
                "status"
            ],
            "Active"
        )
    );


    setText(
        "customerName",
        firstValue(
            loan,
            [
                "customerName"
            ]
        ) ||
        firstValue(
            customer,
            [
                "customerName",
                "name",
                "fullName"
            ],
            "-"
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
            ]
        ) ||
        firstValue(
            customer,
            [
                "mobile",
                "phone",
                "mobileNumber"
            ],
            "-"
        )
    );


    setText(
        "customerId",
        firstValue(
            loan,
            [
                "customerId",
                "customerDocumentId"
            ]
        ) ||
        customer.id ||
        "-"
    );


    // -----------------------------------------------------
    // LOAN AMOUNT
    // -----------------------------------------------------

    const loanAmount =
        getNumber(
            loan.loanAmount,
            loan.principalAmount,
            loan.amount
        );


    setText(
        "loanAmount",
        formatCurrency(
            loanAmount
        )
    );


    // -----------------------------------------------------
    // INSTALLMENT
    // -----------------------------------------------------

    const installmentAmount =
        getNumber(
            loan.installmentAmount,
            loan.monthlyInstallment,
            loan.emi
        );


    setText(
        "installmentAmount",
        formatCurrency(
            installmentAmount
        )
    );


    // -----------------------------------------------------
    // TENURE
    // -----------------------------------------------------

    const tenure =
        getNumber(
            loan.totalInstallments,
            loan.installments,
            loan.duration,
            loan.loanDuration,
            loan.tenure
        );


    setText(
        "tenure",
        tenure
            ? `${tenure} Months`
            : "-"
    );


    // -----------------------------------------------------
    // INTEREST
    // -----------------------------------------------------

    const interestRate =
        getNumber(
            loan.interestRate,
            loan.interestPercentage,
            loan.rate
        );


    setText(
        "interestRate",
        interestRate
            ? `${interestRate}%`
            : "-"
    );


    // -----------------------------------------------------
    // PAYMENT FREQUENCY
    // -----------------------------------------------------

    setText(
        "paymentFrequency",
        firstValue(
            loan,
            [
                "paymentFrequency",
                "frequency"
            ],
            "Monthly"
        )
    );


    // -----------------------------------------------------
    // LOAN DATE
    // -----------------------------------------------------

    setText(
        "loanDate",
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


    // -----------------------------------------------------
    // FIRST DUE DATE
    // -----------------------------------------------------

    setText(
        "firstDueDate",
        formatDate(
            firstValue(
                loan,
                [
                    "firstDueDate",
                    "dueDate"
                ]
            )
        )
    );


    // -----------------------------------------------------
    // VEHICLE
    // -----------------------------------------------------

    setText(
        "vehicleNumber",
        firstValue(
            loan,
            [
                "vehicleNumber",
                "vehicleNo"
            ],
            "-"
        )
    );


    setText(
        "vehicleModel",
        firstValue(
            loan,
            [
                "vehicleModel",
                "model"
            ],
            "-"
        )
    );


    setText(
        "vehicleType",
        firstValue(
            loan,
            [
                "vehicleType",
                "type"
            ],
            "-"
        )
    );


    // -----------------------------------------------------
    // STAFF
    // -----------------------------------------------------

    setText(
        "staffName",
        firstValue(
            loan,
            [
                "staffName",
                "createdByName",
                "assignedStaffName"
            ],
            "-"
        )
    );


    // -----------------------------------------------------
    // FINANCIAL VALUES
    // -----------------------------------------------------

    const totalPaid =
        getNumber(
            loan.totalPaid,
            loan.paidAmount,
            loan.amountPaid
        );


    const totalPenalty =
        getNumber(
            loan.totalPenalty,
            loan.penaltyCollected,
            loan.penaltyAmount
        );


    const balance =
        getNumber(
            loan.balanceAmount,
            loan.outstandingAmount,
            loan.balance,
            loan.pendingAmount
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
        "outstandingAmount",
        formatCurrency(
            balance
        )
    );


    // -----------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------

    setText(
        "summaryLoanAmount",
        formatCurrency(
            loanAmount
        )
    );


    setText(
        "summaryInstallment",
        formatCurrency(
            installmentAmount
        )
    );


    setText(
        "summaryPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "summaryPending",
        formatCurrency(
            balance
        )
    );


    setText(
        "summaryPenalty",
        formatCurrency(
            totalPenalty
        )
    );


    // -----------------------------------------------------
    // CLOSING STATUS
    // -----------------------------------------------------

    const status =
        String(
            firstValue(
                loan,
                [
                    "status"
                ],
                "Active"
            )
        ).toLowerCase();


    if (
        status === "closed" ||
        status === "completed"
    ) {

        showElement(
            "closingSummary"
        );

    } else {

        hideElement(
            "closingSummary"
        );

    }

}


// =====================================================
// LOAD LOAN DOCUMENTS
// =====================================================

async function loadDocuments() {

    const container =
        getElement(
            "loanDocuments"
        );

    if (!container) {

        return;

    }

    container.innerHTML = `
        <div class="empty">
            Loading documents...
        </div>
    `;

    try {

        const documentsRef =
            collection(
                db,
                "loans",
                loanDocumentId,
                "documents"
            );

        const snapshot =
            await getDocs(
                documentsRef
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

        renderDocuments();

    } catch (error) {

        console.error(
            "Documents loading error:",
            error
        );

        container.innerHTML = `
            <div class="empty">
                Unable to load documents.
            </div>
        `;

    }

}
// =====================================================
// RENDER DOCUMENTS
// =====================================================

function renderDocuments() {

    const container =
        getElement(
            "loanDocuments"
        );

    if (!container) {
        return;
    }


    if (
        !loanDocuments.length
    ) {

        container.innerHTML =
            `
            <div class="empty">
                No loan documents available.
            </div>
            `;

        return;
    }


    container.innerHTML =
        loanDocuments
            .map(
                documentItem => {

                    const documentName =
                        firstValue(
                            documentItem,
                            [
                                "documentName",
                                "name",
                                "title"
                            ],
                            "Loan Document"
                        );


                    const documentType =
                        firstValue(
                            documentItem,
                            [
                                "documentType",
                                "type"
                            ],
                            "-"
                        );


                    const documentStatus =
                        firstValue(
                            documentItem,
                            [
                                "status"
                            ],
                            "Available"
                        );


                    const fileUrl =
                        firstValue(
                            documentItem,
                            [
                                "fileUrl",
                                "url",
                                "downloadURL"
                            ]
                        );


                    return `
                        <div class="document-item">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        documentName
                                    )}
                                </strong>

                                <div>
                                    ${escapeHTML(
                                        documentType
                                    )}
                                </div>

                                <div>
                                    ${escapeHTML(
                                        documentStatus
                                    )}
                                </div>

                            </div>

                            ${
                                fileUrl
                                    ? `
                                        <a
                                            href="${escapeHTML(fileUrl)}"
                                            target="_blank"
                                            rel="noopener"
                                            class="action-btn"
                                        >
                                            View
                                        </a>
                                    `
                                    : ""
                            }

                        </div>
                    `;

                }
            )
            .join("");

}

// =====================================================
// DOCUMENT ISSUE / RETURN
// =====================================================

async function updateDocumentStatus(
    documentId,
    status
) {

    if (!documentId) {
        return;
    }


    try {

        const documentRef =
            doc(
                db,
                "loans",
                loanDocumentId,
                "documents",
                documentId
            );


        await updateDoc(
            documentRef,
            {

                status,

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    currentUser?.uid ||
                    ""

            }
        );


        await loadDocuments();


        showMessage(
            `Document marked as ${status}.`
        );


    } catch (error) {

        console.error(
            "Document status update error:",
            error
        );

        showMessage(
            "Unable to update document status."
        );

    }

}


// =====================================================
// REPAYMENT SCHEDULE STATE
// =====================================================
// =====================================================
// REPAYMENT SCHEDULE - HELPERS
// =====================================================

function getLoanTenure() {

    return Math.max(
        Math.floor(
            getNumber(
                currentLoan?.tenure,
                currentLoan?.totalInstallments,
                currentLoan?.installments,
                currentLoan?.duration,
                currentLoan?.loanDuration,
                currentLoan?.numberOfInstallments,
                currentLoan?.numberOfMonths,
                currentLoan?.months,
                currentLoan?.termMonths,
                currentLoan?.durationMonths
            )
        ),
        0
    );

}


function getInstallmentAmount() {

    const directAmount = getNumber(
        currentLoan?.installmentAmount,
        currentLoan?.monthlyInstallment,
        currentLoan?.emi,
        currentLoan?.emiAmount,
        currentLoan?.monthlyEmi,
        currentLoan?.monthlyEMI,
        currentLoan?.installment
    );

    if (directAmount > 0) {
        return directAmount;
    }

    // Fallback for older loan records
    const totalPayable = getNumber(
        currentLoan?.totalPayable,
        currentLoan?.totalLoanPayable,
        currentLoan?.repaymentAmount
    );

    const tenure = getNumber(
        currentLoan?.tenure,
        currentLoan?.totalInstallments,
        currentLoan?.installments,
        currentLoan?.duration,
        currentLoan?.loanDuration
    );

    if (totalPayable > 0 && tenure > 0) {
        return totalPayable / tenure;
    }

    return 0;
}


function getLoanStartDate() {

    const raw =
        currentLoan?.firstDueDate ||
        currentLoan?.loanDate ||
        currentLoan?.startDate ||
        currentLoan?.createdAt;

    if (!raw) {
        return null;
    }

    try {

        const date =
            raw &&
            typeof raw.toDate === "function"
                ? raw.toDate()
                : new Date(raw);

        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }

        return date;

    } catch (error) {

        return null;

    }

}


function addMonthsSafe(
    date,
    months
) {

    const result =
        new Date(
            date.getTime()
        );

    const originalDay =
        result.getDate();

    result.setDate(1);

    result.setMonth(
        result.getMonth() +
        months
    );

    const lastDay =
        new Date(
            result.getFullYear(),
            result.getMonth() + 1,
            0
        ).getDate();

    result.setDate(
        Math.min(
            originalDay,
            lastDay
        )
    );

    return result;

}


function getScheduleDueDate(
    installmentNo
) {

    const firstDueDate =
        getLoanStartDate();

    if (!firstDueDate) {
        return null;
    }

    const periods =
        Math.max(
            Number(
                installmentNo || 1
            ) - 1,
            0
        );

    const dueDate =
        new Date(
            firstDueDate.getTime()
        );

    const frequency =
        String(
            currentLoan?.paymentFrequency ||
            currentLoan?.frequency ||
            "Monthly"
        ).toLowerCase();


    if (
        frequency === "weekly"
    ) {

        dueDate.setDate(
            dueDate.getDate() +
            (
                periods * 7
            )
        );

        return dueDate;

    }


    if (
        frequency === "daily"
    ) {

        dueDate.setDate(
            dueDate.getDate() +
            periods
        );

        return dueDate;

    }


    return addMonthsSafe(
        dueDate,
        periods
    );

}


function toScheduleDate(
    value
) {

    if (!value) {
        return null;
    }

    try {

        const date =
            value &&
            typeof value.toDate === "function"
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

    } catch (error) {

        return null;

    }

}


function scheduleDateKey(
    value
) {

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


function getPaymentInstallmentNo(payment) {

    const number =
        getNumber(
            payment.installmentNo,
            payment.installmentNumber,
            payment.emiNumber,
            payment.emiNo,
            payment.emiIndex
        );

    return number > 0
        ? Math.floor(number)
        : 0;

}


function getPaymentAmount(payment) {

    return getNumber(
        payment.emiPaid,
        payment.amountReceived,
        payment.paidAmount,
        payment.paymentAmount,
        payment.amount,
        payment.collectionAmount
    );

}


function getPaymentPenalty(
    payment
) {

    return getNumber(
        payment.penaltyCollected,
        payment.penaltyAmount,
        payment.penalty
    );

}


function getPaymentDate(
    payment
) {

    return (
        payment.paymentDate ||
        payment.paidDate ||
        payment.collectionDate ||
        payment.createdAt ||
        null
    );

}


// =====================================================
// LOAD REPAYMENT PAYMENTS
// =====================================================

async function loadRepaymentSchedule() {

    const body =
        document.getElementById(
            "repaymentScheduleBody"
        );

    if (
        !body ||
        !currentLoan
    ) {
        return;
    }

    body.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty">
                    Loading repayment schedule...
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

        const paymentMap =
            new Map();


        // =================================================
        // 1. SEARCH BY LOAN DOCUMENT ID
        // =================================================

        try {

            const snapshot =
                await getDocs(
                    query(
                        paymentsRef,
                        where(
                            "loanDocumentId",
                            "==",
                            loanDocumentId
                        )
                    )
                );

            snapshot.forEach(
                paymentSnap => {

                    paymentMap.set(
                        paymentSnap.id,
                        {
                            id:
                                paymentSnap.id,

                            ...paymentSnap.data()

                        }
                    );

                }
            );

        } catch (error) {

            console.warn(
                "loanDocumentId payment query failed:",
                error
            );

        }


        // =================================================
        // 2. SEARCH BY CURRENT DOCUMENT ID AS loanId
        // =================================================

        try {

            const snapshot =
                await getDocs(
                    query(
                        paymentsRef,
                        where(
                            "loanId",
                            "==",
                            loanDocumentId
                        )
                    )
                );

            snapshot.forEach(
                paymentSnap => {

                    paymentMap.set(
                        paymentSnap.id,
                        {
                            id:
                                paymentSnap.id,

                            ...paymentSnap.data()

                        }
                    );

                }
            );

        } catch (error) {

            console.warn(
                "document ID loanId query failed:",
                error
            );

        }


        // =================================================
        // 3. SEARCH BY ACTUAL LOAN NUMBER
        // =================================================

        const actualLoanNumber =
            firstValue(
                currentLoan,
                [
                    "loanId",
                    "loanNumber",
                    "loanCode"
                ]
            );


        if (
            actualLoanNumber
        ) {

            try {

                const snapshot =
                    await getDocs(
                        query(
                            paymentsRef,
                            where(
                                "loanId",
                                "==",
                                actualLoanNumber
                            )
                        )
                    );

                snapshot.forEach(
                    paymentSnap => {

                        paymentMap.set(
                            paymentSnap.id,
                            {
                                id:
                                    paymentSnap.id,

                                ...paymentSnap.data()

                            }
                        );

                    }
                );

            } catch (error) {

                console.warn(
                    "actual loanId payment query failed:",
                    error
                );

            }

        }


        // =================================================
        // FINAL UNIQUE PAYMENT LIST
        // =================================================

        repaymentPayments =
            Array.from(
                paymentMap.values()
            );


        console.log(
            "Repayment payments found:",
            repaymentPayments
        );

    }
        // =================================================
        // BUILD EMI SCHEDULE
        // =================================================

        repaymentSchedule =
            buildRepaymentSchedule();


        renderRepaymentSchedule();


    } catch (error) {

        console.error(
            "Repayment schedule loading error:",
            error
        );

        repaymentPayments = [];

        repaymentSchedule =
            buildRepaymentSchedule();

        renderRepaymentSchedule();

    }

}
// =====================================================
// BUILD REPAYMENT SCHEDULE
// =====================================================

function buildRepaymentSchedule() {

    const tenure =
        getLoanTenure();

    const emi =
        getInstallmentAmount();

    if (
        tenure <= 0 ||
        emi <= 0
    ) {
        return [];
    }


    const schedule = [];

    const today =
        toScheduleDate(
            new Date()
        );


    // =================================================
    // SORT PAYMENTS BY PAYMENT DATE
    // =================================================

    const payments =
        [...repaymentPayments].sort(
            (a, b) => {

                const dateA =
                    toScheduleDate(
                        getPaymentDate(a)
                    );

                const dateB =
                    toScheduleDate(
                        getPaymentDate(b)
                    );

                return (
                    (dateA?.getTime() || 0) -
                    (dateB?.getTime() || 0)
                );

            }
        );


    // =================================================
    // EMI BALANCE
    // =================================================

    const emiBalances =
        Array.from(
            {
                length: tenure
            },
            () => emi
        );


    const emiPaidAmounts =
        Array.from(
            {
                length: tenure
            },
            () => 0
        );


    const emiPenalties =
        Array.from(
            {
                length: tenure
            },
            () => 0
        );


    const emiPaidDates =
        Array.from(
            {
                length: tenure
            },
            () => null
        );


    const emiReceipts =
        Array.from(
            {
                length: tenure
            },
            () => []
        );


    // =================================================
    // ALLOCATE PAYMENTS
    // OLDEST UNPAID EMI FIRST
    // =================================================

    payments.forEach(
        payment => {

            let remainingPayment =
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


            const explicitEMI =
                getPaymentInstallmentNo(
                    payment
                );


            // =========================================
            // IF PAYMENT HAS EMI NUMBER
            // =========================================

            if (
                explicitEMI > 0 &&
                explicitEMI <= tenure
            ) {

                const index =
                    explicitEMI - 1;


                const available =
                    Math.max(
                        emiBalances[index],
                        0
                    );


                const allocation =
                    Math.min(
                        remainingPayment,
                        available
                    );


                emiPaidAmounts[index] +=
                    allocation;


                emiBalances[index] =
                    Math.max(
                        emiBalances[index] -
                        allocation,
                        0
                    );


                remainingPayment -=
                    allocation;


                if (
                    paymentDate
                ) {

                    emiPaidDates[index] =
                        paymentDate;

                }


                if (
                    payment.receiptNumber
                ) {

                    emiReceipts[index].push(
                        payment.receiptNumber
                    );

                }


                if (
                    penalty > 0
                ) {

                    emiPenalties[index] +=
                        penalty;

                }

            }


            // =========================================
            // NO EMI NUMBER
            // ALLOCATE OLDEST UNPAID EMI
            // =========================================

            while (
                remainingPayment > 0
            ) {

                const nextIndex =
                    emiBalances.findIndex(
                        balance =>
                            balance > 0
                    );


                if (
                    nextIndex === -1
                ) {

                    break;

                }


                const allocation =
                    Math.min(
                        remainingPayment,
                        emiBalances[nextIndex]
                    );


                emiPaidAmounts[nextIndex] +=
                    allocation;


                emiBalances[nextIndex] =
                    Math.max(
                        emiBalances[nextIndex] -
                        allocation,
                        0
                    );


                remainingPayment -=
                    allocation;


                if (
                    paymentDate
                ) {

                    emiPaidDates[nextIndex] =
                        paymentDate;

                }


                if (
                    payment.receiptNumber
                ) {

                    emiReceipts[nextIndex].push(
                        payment.receiptNumber
                    );

                }


                if (
                    penalty > 0
                ) {

                    emiPenalties[nextIndex] +=
                        penalty;

                }

            }

        }
    );


    // =================================================
    // CREATE EMI ROWS
    // =================================================

    for (
        let i = 0;
        i < tenure;
        i++
    ) {

        const installmentNo =
            i + 1;


        const dueDate =
            getScheduleDueDate(
                installmentNo
            );


        const paidAmount =
            emiPaidAmounts[i];


        const pendingAmount =
            Math.max(
                emi -
                paidAmount,
                0
            );


        const penalty =
            emiPenalties[i];


        let status =
            "Upcoming";


        const dueDateOnly =
            toScheduleDate(
                dueDate
            );


        if (
            pendingAmount <= 0
        ) {

            status =
                penalty > 0
                    ? "Paid + Penalty"
                    : "Paid";

        }

        else if (
            paidAmount > 0
        ) {

            status =
                "Partial";

        }

        else if (
            dueDateOnly &&
            today &&
            dueDateOnly < today
        ) {

            status =
                "Overdue";

        }

        else if (
            dueDateOnly &&
            today &&
            scheduleDateKey(
                dueDateOnly
            ) ===
            scheduleDateKey(
                today
            )
        ) {

            status =
                "Due Today";

        }

        else {

            status =
                "Upcoming";

        }


        schedule.push({

            installmentNo,

            dueDate,

            dueAmount:
                emi,

            paidAmount,

            pendingAmount,

            penalty,

            paidDate:
                emiPaidDates[i],

            status,

            receiptNumbers:
                emiReceipts[i].join(
                    ", "
                )

        });

    }


    return schedule;

}

// =====================================================
// REPAYMENT STATUS CLASS
// =====================================================

function repaymentStatusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    if (
        value === "paid"
    ) {

        return "paid";

    }


    if (
        value.includes(
            "penalty"
        )
    ) {

        return "penalty";

    }


    if (
        value === "overdue"
    ) {

        return "overdue";

    }


    if (
        value === "due today"
    ) {

        return "due";

    }


    return "upcoming";

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


    // -------------------------------------------------
    // SUMMARY
    // -------------------------------------------------

    const totalDue =
        repaymentSchedule.reduce(
            (
                total,
                row
            ) => {

                return (
                    total +
                    row.dueAmount
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
                    row.paidAmount
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
                    row.pendingAmount
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
                    row.penalty
                );

            },
            0
        );


    // -------------------------------------------------
    // SUMMARY ELEMENTS
    // -------------------------------------------------

    setText(
        "repaymentTotalDue",
        formatCurrency(
            totalDue
        )
    );


    setText(
        "repaymentTotalPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "repaymentTotalPending",
        formatCurrency(
            totalPending
        )
    );


    setText(
        "repaymentTotalPenalty",
        formatCurrency(
            totalPenalty
        )
    );


    // -------------------------------------------------
    // EMPTY
    // -------------------------------------------------

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


    // -------------------------------------------------
    // TABLE
    // -------------------------------------------------

    body.innerHTML =
        repaymentSchedule
            .map(
                row => {


                    const statusClass =
                        repaymentStatusClass(
                            row.status
                        );


                    return `
                        <tr>

                            <td>
                                ${row.installmentNo}
                            </td>

                            <td>
                                ${formatDate(
                                    row.dueDate
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    row.dueAmount
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    row.paidAmount
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    row.pendingAmount
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    row.penalty
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    row.paidDate
                                )}
                            </td>

                            <td>

                                <span
                                    class="status ${statusClass}"
                                >
                                    ${escapeHTML(
                                        row.status
                                    )}
                                </span>

                            </td>

                            <td>

                                ${
                                    row.paidAmount > 0
                                        ? `
                                            <button
                                                type="button"
                                                class="action-btn"
                                                onclick="downloadRepaymentInstallment(${row.installmentNo})"
                                            >
                                                Download
                                            </button>
                                        `
                                        : "-"
                                }

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// =====================================================
// REPAYMENT SCHEDULE TOGGLE
// =====================================================

function setupRepaymentToggle() {

    const button =
        getElement(
            "toggleRepaymentBtn"
        );

    const container =
        getElement(
            "repaymentScheduleSection"
        );


    if (
        !button ||
        !container
    ) {

        return;

    }


    // -------------------------------------------------
    // DEFAULT CLOSED
    // -------------------------------------------------

    container.style.display =
        "none";


    button.textContent =
        "View Repayment Schedule";


    let loaded = false;


    button.addEventListener(
        "click",
        async () => {


            const hidden =
                container.style.display ===
                "none";


            if (hidden) {

                container.style.display =
                    "block";

                button.textContent =
                    "Hide Repayment Schedule";


                if (!loaded) {

                    await loadRepaymentSchedule();

                    loaded = true;

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
// DOCUMENT TOGGLE
// =====================================================

function setupLoanDocumentsToggle() {

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


    // -------------------------------------------------
    // DEFAULT CLOSED
    // -------------------------------------------------

    container.style.display =
        "none";


    button.textContent =
        "View Loan Documents";


    let loaded = false;


    button.addEventListener(
        "click",
        async () => {


            const hidden =
                container.style.display ===
                "none";


            if (hidden) {

                container.style.display =
                    "block";

                button.textContent =
                    "Hide Loan Documents";


                if (!loaded) {

                    await loadDocuments();

                    loaded = true;

                }

            } else {

                container.style.display =
                    "none";

                button.textContent =
                    "View Loan Documents";

            }

        }
    );

}


// =====================================================
// CSV HELPERS
// =====================================================

function repaymentCsvEscape(
    value
) {

    return `"${String(
        value ?? ""
    ).replace(
        /"/g,
        '""'
    )}"`;

}


function downloadCsvFile(
    filename,
    rows
) {

    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            repaymentCsvEscape
                        )
                        .join(",")
            )
            .join(
                "\r\n"
            );


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
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
        filename;


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
// DOWNLOAD FULL REPAYMENT SCHEDULE
// =====================================================

window.downloadRepaymentSchedule =
    function () {


        if (
            !repaymentSchedule.length
        ) {

            showMessage(
                "Repayment schedule is not available."
            );

            return;

        }


        const loan =
            currentLoan || {};


        const loanNumber =
            firstValue(
                loan,
                [
                    "loanId",
                    "loanNumber",
                    "loanCode"
                ],
                loan.id ||
                "loan"
            );


        const rows = [

            [
                "SR Auto Finance"
            ],

            [
                "Loan ID",
                loanNumber
            ],

            [
                "Customer",
                firstValue(
                    loan,
                    [
                        "customerName"
                    ],
                    currentCustomer?.name ||
                    currentCustomer?.customerName ||
                    ""
                )
            ],

            [
                "Loan Amount",
                getNumber(
                    loan.loanAmount,
                    loan.principalAmount,
                    loan.amount
                )
            ],

            [
                "Installment",
                getInstallmentAmount()
            ],

            [
                "Tenure",
                getLoanTenure()
            ],

            [],

            [
                "EMI No",
                "Due Date",
                "Due Amount",
                "Paid Amount",
                "Pending Amount",
                "Penalty",
                "Paid Date",
                "Status",
                "Receipt Number"
            ]

        ];


        repaymentSchedule.forEach(
            row => {

                rows.push([

                    row.installmentNo,

                    formatDate(
                        row.dueDate
                    ),

                    row.dueAmount,

                    row.paidAmount,

                    row.pendingAmount,

                    row.penalty,

                    formatDate(
                        row.paidDate
                    ),

                    row.status,

                    row.receiptNumbers

                ]);

            }
        );


        downloadCsvFile(
            `${loanNumber}-repayment-schedule.csv`,
            rows
        );

    };


// =====================================================
// DOWNLOAD INDIVIDUAL EMI
// =====================================================

window.downloadRepaymentInstallment =
    function (
        installmentNo
    ) {


        const row =
            repaymentSchedule.find(
                item =>
                    item.installmentNo ===
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


        const loan =
            currentLoan || {};


        const loanNumber =
            firstValue(
                loan,
                [
                    "loanId",
                    "loanNumber",
                    "loanCode"
                ],
                loan.id ||
                "loan"
            );


        const rows = [

            [
                "SR Auto Finance"
            ],

            [
                "Loan ID",
                loanNumber
            ],

            [
                "Customer",
                firstValue(
                    loan,
                    [
                        "customerName"
                    ],
                    currentCustomer?.name ||
                    currentCustomer?.customerName ||
                    ""
                )
            ],

            [
                "EMI Number",
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
                row.dueAmount
            ],

            [
                "Paid Amount",
                row.paidAmount
            ],

            [
                "Pending Amount",
                row.pendingAmount
            ],

            [
                "Penalty",
                row.penalty
            ],

            [
                "Paid Date",
                formatDate(
                    row.paidDate
                )
            ],

            [
                "Status",
                row.status
            ],

            [
                "Receipt Number",
                row.receiptNumbers
            ]

        ];


        downloadCsvFile(
            `${loanNumber}-EMI-${row.installmentNo}.csv`,
            rows
        );

    };


// =====================================================
// END PART 2
// =====================================================
// =====================================================
// PART 3
// LOAN ACTIONS / CLOSING / EVENTS
// =====================================================


// =====================================================
// LOAN DOCUMENT MANUAL STATUS ACTION
// =====================================================

window.markDocumentIssued =
    async function (
        documentId
    ) {

        await updateDocumentStatus(
            documentId,
            "Issued"
        );

    };


window.markDocumentReturned =
    async function (
        documentId
    ) {

        await updateDocumentStatus(
            documentId,
            "Returned"
        );

    };


// =====================================================
// DOCUMENT DOWNLOAD
// =====================================================

window.downloadLoanDocument =
    function (
        url,
        fileName = "loan-document"
    ) {

        if (!url) {

            showMessage(
                "Document file is not available."
            );

            return;

        }

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            fileName;

        link.target =
            "_blank";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

    };


// =====================================================
// LOAN CLOSING SUMMARY
// =====================================================

function renderClosingSummary() {

    const loan =
        currentLoan || {};


    const loanAmount =
        getNumber(
            loan.loanAmount,
            loan.principalAmount,
            loan.amount
        );


    const totalPaid =
        getNumber(
            loan.totalPaid,
            loan.paidAmount,
            loan.amountPaid
        );


    const totalPenalty =
        getNumber(
            loan.totalPenalty,
            loan.penaltyCollected,
            loan.penaltyAmount
        );


    const outstanding =
        getNumber(
            loan.balanceAmount,
            loan.outstandingAmount,
            loan.balance,
            loan.pendingAmount
        );


    setText(
        "closingLoanAmount",
        formatCurrency(
            loanAmount
        )
    );


    setText(
        "closingTotalPaid",
        formatCurrency(
            totalPaid
        )
    );


    setText(
        "closingPenalty",
        formatCurrency(
            totalPenalty
        )
    );


    setText(
        "closingOutstanding",
        formatCurrency(
            outstanding
        )
    );


    setText(
        "closingStatus",
        firstValue(
            loan,
            [
                "status"
            ],
            "Active"
        )
    );


    setText(
        "closingDate",
        formatDate(
            firstValue(
                loan,
                [
                    "closedDate",
                    "closingDate"
                ]
            )
        )
    );


    setText(
        "closingRemarks",
        firstValue(
            loan,
            [
                "closingRemarks",
                "closureRemarks"
            ],
            "-"
        )
    );

}


// =====================================================
// REFRESH LOAN DATA
// =====================================================

async function refreshLoanView() {

    await loadLoan();

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
                window.history.length > 1
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
// CLOSE PAGE
// =====================================================

function setupCloseButton() {

    const buttons =
        document.querySelectorAll(
            "[data-action='close']"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    window.close();

                }
            );

        }
    );

}


// =====================================================
// PRINT LOAN VIEW
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
// LOAN INFORMATION DOWNLOAD
// =====================================================

window.downloadLoanSummary =
    function () {

        const loan =
            currentLoan || {};

        const customer =
            currentCustomer || {};


        const rows = [

            [
                "SR Auto Finance"
            ],

            [
                "Loan ID",
                firstValue(
                    loan,
                    [
                        "loanId",
                        "loanNumber",
                        "loanCode"
                    ],
                    loan.id ||
                    ""
                )
            ],

            [
                "Customer",
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
                        ""
                    )
                )
            ],

            [
                "Mobile",
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
                            "phone"
                        ],
                        ""
                    )
                )
            ],

            [
                "Loan Amount",
                getNumber(
                    loan.loanAmount,
                    loan.principalAmount,
                    loan.amount
                )
            ],

            [
                "Installment",
                getInstallmentAmount()
            ],

            [
                "Tenure",
                getLoanTenure()
            ],

            [
                "Interest Rate",
                getNumber(
                    loan.interestRate,
                    loan.interestPercentage,
                    loan.rate
                )
            ],

            [
                "Total Paid",
                getNumber(
                    loan.totalPaid,
                    loan.paidAmount,
                    loan.amountPaid
                )
            ],

            [
                "Penalty",
                getNumber(
                    loan.totalPenalty,
                    loan.penaltyCollected,
                    loan.penaltyAmount
                )
            ],

            [
                "Outstanding",
                getNumber(
                    loan.balanceAmount,
                    loan.outstandingAmount,
                    loan.balance,
                    loan.pendingAmount
                )
            ],

            [
                "Status",
                firstValue(
                    loan,
                    [
                        "status"
                    ],
                    "Active"
                )
            ]

        ];


        const loanNumber =
            firstValue(
                loan,
                [
                    "loanId",
                    "loanNumber",
                    "loanCode"
                ],
                loan.id ||
                "loan"
            );


        downloadCsvFile(
            `${loanNumber}-loan-summary.csv`,
            rows
        );

    };


// =====================================================
// PAYMENT HISTORY
// =====================================================

let loanPaymentHistory = [];


async function loadPaymentHistory() {

    const container =
        getElement(
            "paymentHistory"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        `
        <div class="empty">
            Loading payment history...
        </div>
        `;


    try {

        const paymentsRef =
            collection(
                db,
                "payments"
            );


        let snapshot = null;


        // -------------------------------------------------
        // LOAN DOCUMENT ID
        // -------------------------------------------------

        try {

            snapshot =
                await getDocs(
                    query(
                        paymentsRef,
                        where(
                            "loanDocumentId",
                            "==",
                            loanDocumentId
                        )
                    )
                );

        } catch (error) {

            console.warn(
                "Payment history loanDocumentId query failed.",
                error
            );

        }


        // -------------------------------------------------
        // LOAN ID
        // -------------------------------------------------

        if (
            !snapshot ||
            snapshot.empty
        ) {

            const loanNumber =
                firstValue(
                    currentLoan,
                    [
                        "loanId",
                        "loanNumber",
                        "loanCode"
                    ]
                );


            if (loanNumber) {

                try {

                    snapshot =
                        await getDocs(
                            query(
                                paymentsRef,
                                where(
                                    "loanId",
                                    "==",
                                    loanNumber
                                )
                            )
                        );

                } catch (error) {

                    console.warn(
                        "Payment history loanId query failed.",
                        error
                    );

                }

            }

        }


        loanPaymentHistory = [];


        if (snapshot) {

            snapshot.forEach(
                paymentSnap => {

                    loanPaymentHistory.push({

                        id:
                            paymentSnap.id,

                        ...paymentSnap.data()

                    });

                }
            );

        }


        loanPaymentHistory.sort(
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


        renderPaymentHistory();


    } catch (error) {

        console.error(
            "Payment history error:",
            error
        );


        container.innerHTML =
            `
            <div class="empty">
                Unable to load payment history.
            </div>
            `;

    }

}


// =====================================================
// RENDER PAYMENT HISTORY
// =====================================================

function renderPaymentHistory() {

    const container =
        getElement(
            "paymentHistory"
        );


    if (!container) {
        return;
    }


    if (
        !loanPaymentHistory.length
    ) {

        container.innerHTML =
            `
            <div class="empty">
                No payment history available.
            </div>
            `;

        return;

    }


    container.innerHTML =
        `
        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>
                            Date
                        </th>

                        <th>
                            EMI
                        </th>

                        <th>
                            Paid Amount
                        </th>

                        <th>
                            Penalty
                        </th>

                        <th>
                            Total Collection
                        </th>

                        <th>
                            Payment Mode
                        </th>

                        <th>
                            Receipt
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        loanPaymentHistory
                            .map(
                                payment => {

                                    const installmentNo =
                                        getPaymentInstallmentNo(
                                            payment
                                        );


                                    const amount =
                                        getPaymentAmount(
                                            payment
                                        );


                                    const penalty =
                                        getPaymentPenalty(
                                            payment
                                        );


                                    const total =
                                        amount +
                                        penalty;


                                    return `
                                        <tr>

                                            <td>
                                                ${formatDate(
                                                    getPaymentDate(
                                                        payment
                                                    )
                                                )}
                                            </td>

                                            <td>
                                                ${
                                                    installmentNo ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                ${formatCurrency(
                                                    amount
                                                )}
                                            </td>

                                            <td>
                                                ${formatCurrency(
                                                    penalty
                                                )}
                                            </td>

                                            <td>
                                                <strong>
                                                    ${formatCurrency(
                                                        total
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                ${escapeHTML(
                                                    firstValue(
                                                        payment,
                                                        [
                                                            "paymentMode",
                                                            "mode"
                                                        ],
                                                        "-"
                                                    )
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHTML(
                                                    firstValue(
                                                        payment,
                                                        [
                                                            "receiptNumber",
                                                            "receiptNo"
                                                        ],
                                                        "-"
                                                    )
                                                )}
                                            </td>

                                        </tr>
                                    `;

                                }
                            )
                            .join("")
                    }

                </tbody>

            </table>

        </div>
        `;

}


// =====================================================
// PAYMENT HISTORY TOGGLE
// =====================================================

function setupPaymentHistoryToggle() {

    const button =
        getElement(
            "togglePaymentHistoryBtn"
        );

    const container =
        getElement(
            "paymentHistory"
        );


    if (
        !button ||
        !container
    ) {

        return;

    }


    container.style.display =
        "none";


    button.textContent =
        "View Payment History";


    let loaded = false;


    button.addEventListener(
        "click",
        async () => {

            const hidden =
                container.style.display ===
                "none";


            if (hidden) {

                container.style.display =
                    "block";

                button.textContent =
                    "Hide Payment History";


                if (!loaded) {

                    await loadPaymentHistory();

                    loaded = true;

                }

            } else {

                container.style.display =
                    "none";

                button.textContent =
                    "View Payment History";

            }

        }
    );

}

// =====================================================
// INITIALIZE ALL PAGE CONTROLS
// =====================================================

function initializePageControls() {

    setupBackButton();

    setupCloseButton();

    setupPrintButton();

    setupLoanDocumentsToggle();

    setupRepaymentToggle();

    setupPaymentHistoryToggle();

}


// =====================================================
// DOM READY
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializePageControls();

    }
);
// =====================================================
// GLOBAL REFRESH
// =====================================================

window.refreshLoanView =
    refreshLoanView;


// =====================================================
// END OF LOAN VIEW CONTROLLER
// =====================================================
