// ============================================================
// SR AUTO FINANCE ERP
// STAFF COLLECTION
// File: js/staff-collection.js
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const customerNameElement =
    document.getElementById("customerName");

const customerMetaElement =
    document.getElementById("customerMeta");

const loanBadgeElement =
    document.getElementById("loanBadge");

const dueDateElement =
    document.getElementById("dueDate");

const dueAmountElement =
    document.getElementById("dueAmount");

const previousPendingElement =
    document.getElementById("previousPending");

const totalDueElement =
    document.getElementById("totalDue");

const amountReceivedInput =
    document.getElementById("amountReceived");

const paymentDateInput =
    document.getElementById("paymentDate");

const paymentModeInput =
    document.getElementById("paymentMode");

const penaltyInput =
    document.getElementById("penalty");

const remarksInput =
    document.getElementById("remarks");

const previewDueElement =
    document.getElementById("previewDue");

const previewPreviousPendingElement =
    document.getElementById(
        "previewPreviousPending"
    );

const previewPenaltyElement =
    document.getElementById(
        "previewPenalty"
    );

const previewReceivedElement =
    document.getElementById(
        "previewReceived"
    );

const previewRemainingElement =
    document.getElementById(
        "previewRemaining"
    );

const warningElement =
    document.getElementById("warning");

const messageElement =
    document.getElementById("message");

const collectionForm =
    document.getElementById(
        "collectionForm"
    );

const saveBtn =
    document.getElementById("saveBtn");

const cancelBtn =
    document.getElementById("cancelBtn");

const backBtn =
    document.getElementById("backBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const loadingOverlay =
    document.getElementById(
        "loadingOverlay"
    );


// ============================================================
// GLOBAL DATA
// ============================================================

let currentStaff = null;

let allCustomers = [];

let allLoans = [];

let allPayments = [];

let selectedCustomer = null;

let selectedLoan = null;


// ============================================================
// URL PARAMETERS
// ============================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const requestedCustomerId =
    urlParams.get(
        "customerId"
    );

const requestedLoanId =
    urlParams.get(
        "loanId"
    );


// ============================================================
// SESSION
// ============================================================

function getStaffSession() {

    const raw =
        sessionStorage.getItem(
            "srStaffSession"
        );

    if (!raw) {
        return null;
    }

    try {

        return JSON.parse(
            raw
        );

    } catch {

        sessionStorage.removeItem(
            "srStaffSession"
        );

        return null;

    }

}


// ============================================================
// FIRST VALUE
// ============================================================

function firstValue(
    object,
    fields,
    fallback = ""
) {

    if (!object) {
        return fallback;
    }

    for (
        const field of fields
    ) {

        const value =
            object[field];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            return value;

        }

    }

    return fallback;

}


// ============================================================
// NUMBER
// ============================================================

function numberValue(
    ...values
) {

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
            Number(value);

        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }

    return 0;

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
// DATE PARSER
// ============================================================

function parseDate(
    value
) {

    if (!value) {
        return null;
    }

    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }

    if (
        value instanceof Date
    ) {

        return new Date(
            value.getTime()
        );

    }

    const date =
        new Date(value);

    if (
        isNaN(
            date.getTime()
        )
    ) {

        return null;

    }

    return date;

}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
    value
) {

    const date =
        parseDate(value);

    if (!date) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);

}


// ============================================================
// TODAY INPUT
// ============================================================

function getTodayInputValue() {

    const date =
        new Date();

    return (
        `${date.getFullYear()}-` +
        `${String(
            date.getMonth() + 1
        ).padStart(2, "0")}-` +
        `${String(
            date.getDate()
        ).padStart(2, "0")}`
    );

}


// ============================================================
// CUSTOMER ID
// ============================================================

function getCustomerId(
    customer
) {

    return String(
        firstValue(
            customer,
            [
                "customerId",
                "customerCode"
            ],
            customer?.id || ""
        )
    );

}


// ============================================================
// LOAN ID
// ============================================================

function getLoanId(
    loan
) {

    return String(
        firstValue(
            loan,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ],
            loan?.id || ""
        )
    );

}


// ============================================================
// LOAN CUSTOMER ID
// ============================================================

function getLoanCustomerId(
    loan
) {

    return String(
        firstValue(
            loan,
            [
                "customerId",
                "customerDocumentId"
            ],
            ""
        )
    );

}


// ============================================================
// PAYMENT LOAN ID
// ============================================================

function getPaymentLoanId(
    payment
) {

    return String(
        firstValue(
            payment,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ],
            ""
        )
    );

}


// ============================================================
// STAFF MATCH
// ============================================================

function matchesStaff(
    record
) {

    if (
        !record ||
        !currentStaff
    ) {

        return false;

    }

    const sessionStaffId =
        String(
            currentStaff.staffId ||
            ""
        );

    const sessionDocumentId =
        String(
            currentStaff.staffDocumentId ||
            ""
        );

    const recordStaffId =
        String(
            firstValue(
                record,
                [
                    "staffId",
                    "assignedStaffId",
                    "collectorStaffId",
                    "collectedByStaffId",
                    "staffCode",
                    "employeeId"
                ],
                ""
            )
        );

    const recordStaffDocumentId =
        String(
            firstValue(
                record,
                [
                    "staffDocumentId",
                    "assignedStaffDocumentId"
                ],
                ""
            )
        );

    return (
        (
            recordStaffId &&
            (
                recordStaffId ===
                sessionStaffId ||

                recordStaffId ===
                sessionDocumentId
            )
        ) ||

        (
            recordStaffDocumentId &&
            recordStaffDocumentId ===
            sessionDocumentId
        )
    );

}


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    showLoading(true);

    try {

        const [
            customersSnapshot,
            loansSnapshot,
            paymentsSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "customers"
                )
            ),

            getDocs(
                collection(
                    db,
                    "loans"
                )
            ),

            getDocs(
                collection(
                    db,
                    "payments"
                )
            )

        ]);


        allCustomers = [];

        customersSnapshot.forEach(
            docSnap => {

                allCustomers.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        allLoans = [];

        loansSnapshot.forEach(
            docSnap => {

                allLoans.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        allPayments = [];

        paymentsSnapshot.forEach(
            docSnap => {

                const payment = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                const status =
                    String(
                        payment.status ||
                        "success"
                    ).toLowerCase();


                if (
                    [
                        "cancelled",
                        "canceled",
                        "reversed",
                        "deleted"
                    ].includes(
                        status
                    )
                ) {

                    return;

                }


                allPayments.push(
                    payment
                );

            }
        );


        findSelectedLoan();

    } catch (
        error
    ) {

        console.error(
            "Collection data error:",
            error
        );

        showMessage(
            "Unable to load loan details."
        );

    } finally {

        showLoading(false);

    }

}


// ============================================================
// FIND SELECTED LOAN
// ============================================================

function findSelectedLoan() {

    let loan = null;


    // ========================================================
    // 1. URL LOAN ID
    // ========================================================

    if (
        requestedLoanId
    ) {

        loan =
            allLoans.find(
                item =>
                    getLoanId(
                        item
                    ) ===
                    String(
                        requestedLoanId
                    ) ||

                    String(
                        item.id
                    ) ===
                    String(
                        requestedLoanId
                    )
            );

    }


    // ========================================================
    // 2. URL CUSTOMER ID
    // ========================================================

    if (
        !loan &&
        requestedCustomerId
    ) {

        loan =
            allLoans.find(
                item => {

                    return (
                        getLoanCustomerId(
                            item
                        ) ===
                        String(
                            requestedCustomerId
                        )
                    );

                }
            );

    }


    // ========================================================
    // 3. STAFF ASSIGNED LOAN
    // ========================================================

    if (
        !loan
    ) {

        loan =
            allLoans.find(
                item =>
                    matchesStaff(
                        item
                    )
            );

    }


    if (
        !loan
    ) {

        showMessage(
            "No assigned loan found for this staff."
        );

        disableForm();

        return;

    }


    selectedLoan =
        loan;


    // ========================================================
    // CUSTOMER
    // ========================================================

    selectedCustomer =
        allCustomers.find(
            customer =>
                getCustomerId(
                    customer
                ) ===
                getLoanCustomerId(
                    loan
                )
        ) || null;


    renderLoanDetails();

}


// ============================================================
// CALCULATE CURRENT PENDING
// ============================================================

function calculateLoanPending(
    loan
) {

    const directPending =
        numberValue(
            loan.pendingAmount,
            loan.outstandingAmount,
            loan.outstanding,
            loan.balanceAmount
        );


    if (
        directPending > 0
    ) {

        return directPending;

    }


    const totalPayable =
        numberValue(
            loan.totalPayable,
            loan.totalAmount
        );


    const totalPaid =
        numberValue(
            loan.totalPaid,
            loan.paidAmount,
            loan.amountPaid
        );


    if (
        totalPayable > 0
    ) {

        return Math.max(
            totalPayable -
            totalPaid,
            0
        );

    }


    return 0;

}


// ============================================================
// GET LAST PAYMENT PENDING
// ============================================================

function getLastPaymentPending(
    loan
) {

    const loanId =
        getLoanId(
            loan
        );


    const loanPayments =
        allPayments
            .filter(
                payment => {

                    const paymentLoanId =
                        getPaymentLoanId(
                            payment
                        );

                    const paymentDocumentLoanId =
                        String(
                            payment.loanDocumentId ||
                            ""
                        );


                    return (
                        paymentLoanId ===
                        loanId ||

                        paymentLoanId ===
                        String(
                            loan.id
                        ) ||

                        paymentDocumentLoanId ===
                        String(
                            loan.id
                        )
                    );

                }
            )
            .sort(
                (
                    a,
                    b
                ) => {

                    const dateA =
                        parseDate(
                            firstValue(
                                a,
                                [
                                    "paymentDate",
                                    "paidDate",
                                    "collectionDate"
                                ],
                                ""
                            )
                        );

                    const dateB =
                        parseDate(
                            firstValue(
                                b,
                                [
                                    "paymentDate",
                                    "paidDate",
                                    "collectionDate"
                                ],
                                ""
                            )
                        );


                    return (
                        (
                            dateB?.getTime() ||
                            0
                        ) -
                        (
                            dateA?.getTime() ||
                            0
                        )
                    );

                }
            );


    if (
        !loanPayments.length
    ) {

        return 0;

    }


    return numberValue(
        loanPayments[0].pendingAmount,
        loanPayments[0].emiPending
    );

}


// ============================================================
// CURRENT DUE
// ============================================================

function getCurrentDue(
    loan
) {

    const dueAmount =
        numberValue(
            loan.currentDueAmount,
            loan.dueAmount,
            loan.installmentAmount,
            loan.emiAmount,
            loan.monthlyInstallment
        );


    return dueAmount;

}


// ============================================================
// NEXT DUE DATE
// ============================================================

function getNextDueDate(
    loan
) {

    return firstValue(
        loan,
        [
            "nextDueDate",
            "dueDate",
            "currentDueDate",
            "emiDueDate"
        ],
        ""
    );

}


// ============================================================
// RENDER LOAN DETAILS
// ============================================================

function renderLoanDetails() {

    if (
        !selectedLoan
    ) {
        return;
    }


    const customer =
        selectedCustomer || {};


    const customerName =
        firstValue(
            customer,
            [
                "customerName",
                "name",
                "fullName"
            ],
            "Customer"
        );


    const customerId =
        getLoanCustomerId(
            selectedLoan
        );


    const mobile =
        firstValue(
            customer,
            [
                "mobile",
                "phone",
                "mobileNumber",
                "contactNumber"
            ],
            "-"
        );


    const loanId =
        getLoanId(
            selectedLoan
        );


    const currentDue =
        getCurrentDue(
            selectedLoan
        );


    const loanPending =
        calculateLoanPending(
            selectedLoan
        );


    const lastPaymentPending =
        getLastPaymentPending(
            selectedLoan
        );


    const previousPending =
        Math.max(
            lastPaymentPending,
            loanPending -
            currentDue,
            0
        );


    const totalDue =
        currentDue +
        previousPending;


    const dueDate =
        getNextDueDate(
            selectedLoan
        );


    customerNameElement.textContent =
        customerName;


    customerMetaElement.textContent =
        `Customer ID: ${customerId || "-"} | Mobile: ${mobile || "-"}`;


    loanBadgeElement.textContent =
        `LOAN: ${loanId}`;


    dueDateElement.textContent =
        formatDate(
            dueDate
        );


    dueAmountElement.textContent =
        formatCurrency(
            currentDue
        );


    previousPendingElement.textContent =
        formatCurrency(
            previousPending
        );


    totalDueElement.textContent =
        formatCurrency(
            totalDue
        );


    previewDueElement.textContent =
        formatCurrency(
            currentDue
        );


    previewPreviousPendingElement.textContent =
        formatCurrency(
            previousPending
        );


    updatePreview();


}


// ============================================================
// UPDATE PREVIEW
// ============================================================

function updatePreview() {

    if (
        !selectedLoan
    ) {
        return;
    }


    const currentDue =
        getCurrentDue(
            selectedLoan
        );


    const loanPending =
        calculateLoanPending(
            selectedLoan
        );


    const lastPaymentPending =
        getLastPaymentPending(
            selectedLoan
        );


    const previousPending =
        Math.max(
            lastPaymentPending,
            loanPending -
            currentDue,
            0
        );


    const penalty =
        numberValue(
            penaltyInput?.value
        );


    const received =
        numberValue(
            amountReceivedInput?.value
        );


    const totalDue =
        currentDue +
        previousPending;


    const remaining =
        Math.max(
            totalDue -
            received,
            0
        );


    previewDueElement.textContent =
        formatCurrency(
            currentDue
        );


    previewPreviousPendingElement.textContent =
        formatCurrency(
            previousPending
        );


    previewPenaltyElement.textContent =
        formatCurrency(
            penalty
        );


    previewReceivedElement.textContent =
        formatCurrency(
            received
        );


    previewRemainingElement.textContent =
        formatCurrency(
            remaining
        );


    validateAmount(
        received,
        totalDue
    );

}


// ============================================================
// VALIDATE AMOUNT
// ============================================================

function validateAmount(
    received,
    totalDue
) {

    warningElement.classList.remove(
        "show"
    );


    saveBtn.disabled =
        false;


    if (
        received <= 0
    ) {

        return;

    }


    if (
        received >
        totalDue
    ) {

        warningElement.textContent =
            `Amount received cannot be greater than total due (${formatCurrency(
                totalDue
            )}).`;

        warningElement.classList.add(
            "show"
        );

        saveBtn.disabled =
            true;

        return;

    }

}


// ============================================================
// SAVE COLLECTION
// ============================================================

async function saveCollection(
    event
) {

    event.preventDefault();


    if (
        !selectedLoan
    ) {

        showMessage(
            "Loan details not found."
        );

        return;

    }


    const amountReceived =
        numberValue(
            amountReceivedInput.value
        );


    const penalty =
        numberValue(
            penaltyInput.value
        );


    const paymentDate =
        paymentDateInput.value;


    const paymentMode =
        paymentModeInput.value;


    const remarks =
        remarksInput.value.trim();


    const currentDue =
        getCurrentDue(
            selectedLoan
        );


    const loanPending =
        calculateLoanPending(
            selectedLoan
        );


    const lastPaymentPending =
        getLastPaymentPending(
            selectedLoan
        );


    const previousPending =
        Math.max(
            lastPaymentPending,
            loanPending -
            currentDue,
            0
        );


    const totalDue =
        currentDue +
        previousPending;


    const remaining =
        Math.max(
            totalDue -
            amountReceived,
            0
        );


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
        amountReceived <= 0
    ) {

        showMessage(
            "Please enter the amount received."
        );

        amountReceivedInput.focus();

        return;

    }


    if (
        amountReceived >
        totalDue
    ) {

        showMessage(
            "Amount received cannot be greater than total due."
        );

        return;

    }


    if (
        !paymentDate
    ) {

        showMessage(
            "Please select payment date."
        );

        return;

    }


    if (
        !paymentMode
    ) {

        showMessage(
            "Please select payment mode."
        );

        return;

    }


    // ========================================================
    // CONFIRM
    // ========================================================

    const confirmed =
        confirm(
            `Confirm collection of ${formatCurrency(
                amountReceived
            )}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    saveBtn.disabled =
        true;


    saveBtn.textContent =
        "Saving...";


    showLoading(
        true
    );


    try {

        const customerId =
            getLoanCustomerId(
                selectedLoan
            );


        const loanId =
            getLoanId(
                selectedLoan
            );


        const staffId =
            currentStaff.staffId ||
            currentStaff.staffDocumentId;


        // ====================================================
        // PAYMENT DOCUMENT
        // ====================================================

        const paymentData = {

            customerId:
                customerId,

            loanId:
                loanId,

            loanDocumentId:
                selectedLoan.id,

            staffId:
                staffId,

            staffDocumentId:
                currentStaff.staffDocumentId ||
                "",

            paymentDate:
                paymentDate,

            dueDate:
                getNextDueDate(
                    selectedLoan
                ),

            dueAmount:
                currentDue,

            previousPending:
                previousPending,

            totalDue:
                totalDue,

            paidAmount:
                amountReceived,

            amountReceived:
                amountReceived,

            emiPaid:
                amountReceived,

            pendingAmount:
                remaining,

            emiPending:
                remaining,

            penalty:
                penalty,

            penaltyAmount:
                penalty,

            penaltyCollected:
                penalty,

            totalCollection:
                amountReceived +
                penalty,

            paymentMode:
                paymentMode,

            remarks:
                remarks,

            status:
                "success",

            collectedBy:
                currentStaff.staffName ||
                "",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        // ====================================================
        // SAVE
        // ====================================================

        const paymentRef =
            await addDoc(
                collection(
                    db,
                    "payments"
                ),
                paymentData
            );


        console.log(
            "Collection saved:",
            paymentRef.id
        );


        showMessage(
            `Collection saved successfully. Receipt ID: ${paymentRef.id}`,
            "success"
        );


        // ====================================================
        // RESET
        // ====================================================

        amountReceivedInput.value =
            "";

        penaltyInput.value =
            "0";

        remarksInput.value =
            "";


        updatePreview();


        // ====================================================
        // AFTER SAVE
        // ====================================================

        setTimeout(
            () => {

                window.location.href =
                    `staff-customers.html?customerId=${encodeURIComponent(
                        customerId
                    )}`;

            },
            1200
        );


    } catch (
        error
    ) {

        console.error(
            "Collection save error:",
            error
        );


        showMessage(
            `Unable to save collection: ${error.message}`
        );


    } finally {

        showLoading(
            false
        );


        saveBtn.disabled =
            false;


        saveBtn.textContent =
            "Save Collection";

    }

}


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


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


// ============================================================
// DISABLE FORM
// ============================================================

function disableForm() {

    collectionForm
        .querySelectorAll(
            "input, select, textarea, button"
        )
        .forEach(
            element => {

                if (
                    element.id !==
                    "backBtn" &&
                    element.id !==
                    "logoutBtn"
                ) {

                    element.disabled =
                        true;

                }

            }
        );

}


// ============================================================
// LOADING
// ============================================================

function showLoading(
    show
) {

    if (
        !loadingOverlay
    ) {
        return;
    }


    loadingOverlay.style.display =
        show
            ? "flex"
            : "none";

}


// ============================================================
// INPUT EVENTS
// ============================================================

if (
    amountReceivedInput
) {

    amountReceivedInput.addEventListener(
        "input",
        updatePreview
    );

}


if (
    penaltyInput
) {

    penaltyInput.addEventListener(
        "input",
        updatePreview
    );

}


// ============================================================
// FORM SUBMIT
// ============================================================

if (
    collectionForm
) {

    collectionForm.addEventListener(
        "submit",
        saveCollection
    );

}


// ============================================================
// CANCEL
// ============================================================

if (
    cancelBtn
) {

    cancelBtn.addEventListener(
        "click",
        () => {

            if (
                selectedCustomer
            ) {

                window.location.href =
                    `staff-customers.html?customerId=${encodeURIComponent(
                        getCustomerId(
                            selectedCustomer
                        )
                    )}`;

            } else {

                window.location.href =
                    "staff-customers.html";

            }

        }
    );

}


// ============================================================
// BACK
// ============================================================

if (
    backBtn
) {

    backBtn.addEventListener(
        "click",
        () => {

            if (
                selectedCustomer
            ) {

                window.location.href =
                    `staff-customers.html?customerId=${encodeURIComponent(
                        getCustomerId(
                            selectedCustomer
                        )
                    )}`;

            } else {

                window.location.href =
                    "staff-customers.html";

            }

        }
    );

}


// ============================================================
// LOGOUT
// ============================================================

if (
    logoutBtn
) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );

            } catch (
                error
            ) {

                console.error(
                    error
                );

            }


            sessionStorage.removeItem(
                "srStaffSession"
            );


            sessionStorage.removeItem(
                "srStaffUid"
            );


            window.location.href =
                "staff-login.html";

        }
    );

}


// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        const session =
            getStaffSession();


        if (
            !session ||
            session.role !==
            "staff"
        ) {

            window.location.href =
                "staff-login.html";

            return;

        }


        if (
            !user
        ) {

            window.location.href =
                "staff-login.html";

            return;

        }


        currentStaff =
            session;


        // Default payment date
        paymentDateInput.value =
            getTodayInputValue();


        await loadData();

    }
);
