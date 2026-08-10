// ============================================================
// SR AUTO FINANCE ERP
// STAFF DASHBOARD
// File: js/staff-dashboard.js
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const staffNameElement =
    document.getElementById("staffName");

const staffIdElement =
    document.getElementById("staffId");

const welcomeNameElement =
    document.getElementById("welcomeName");

const myCustomersElement =
    document.getElementById("myCustomers");

const activeLoansElement =
    document.getElementById("activeLoans");

const todayDueElement =
    document.getElementById("todayDue");

const todayCollectionElement =
    document.getElementById("todayCollection");

const monthCollectionElement =
    document.getElementById("monthCollection");

const totalPendingElement =
    document.getElementById("totalPending");

const cashInHandElement =
    document.getElementById("cashInHand");

const depositPendingElement =
    document.getElementById("depositPending");

const customersBtn =
    document.getElementById("customersBtn");

const collectionBtn =
    document.getElementById("collectionBtn");

const depositBtn =
    document.getElementById("depositBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const loadingOverlay =
    document.getElementById("loadingOverlay");


// ============================================================
// GLOBAL DATA
// ============================================================

let currentStaff = null;

let allCustomers = [];

let allLoans = [];

let allPayments = [];

let allDepositRequests = [];


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

        return JSON.parse(raw);

    } catch {

        sessionStorage.removeItem(
            "srStaffSession"
        );

        return null;

    }

}


// ============================================================
// HELPER - FIRST VALUE
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
// HELPER - NUMBER
// ============================================================

function numberValue(
    ...values
) {

    for (
        const value of values
    ) {

        if (
            value === undefined ||
            value === null ||
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
// DATE KEY
// ============================================================

function getDateKey(
    value
) {

    const date =
        parseDate(value);

    if (!date) {
        return "";
    }

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
// TODAY
// ============================================================

function getTodayKey() {

    return getDateKey(
        new Date()
    );

}


// ============================================================
// MONTH KEY
// ============================================================

function getMonthKey(
    value
) {

    const date =
        parseDate(value);

    if (!date) {
        return "";
    }

    return (
        `${date.getFullYear()}-` +
        `${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`
    );

}


// ============================================================
// CURRENT MONTH
// ============================================================

function getCurrentMonthKey() {

    return getMonthKey(
        new Date()
    );

}


// ============================================================
// STATUS CHECK
// ============================================================

function isInactiveStatus(
    value
) {

    const status =
        String(
            value || ""
        ).toLowerCase().trim();


    return [
        "closed",
        "completed",
        "cancelled",
        "canceled",
        "rejected",
        "deleted",
        "inactive"
    ].includes(
        status
    );

}


// ============================================================
// STAFF IDENTIFIERS
// ============================================================

function getStaffIdentifiers() {

    if (!currentStaff) {
        return [];
    }


    const identifiers = [];


    const values = [

        currentStaff.staffId,

        currentStaff.staffDocumentId,

        currentStaff.staffCode,

        currentStaff.employeeId,

        currentStaff.uid,

        currentStaff.userId

    ];


    values.forEach(
        value => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {

                const stringValue =
                    String(value);


                if (
                    !identifiers.includes(
                        stringValue
                    )
                ) {

                    identifiers.push(
                        stringValue
                    );

                }

            }

        }
    );


    return identifiers;

}


// ============================================================
// STAFF MATCH
// ============================================================

function recordBelongsToStaff(
    record
) {

    const identifiers =
        getStaffIdentifiers();


    if (
        !identifiers.length
    ) {

        return false;

    }


    const recordIdentifiers = [

        record.staffId,

        record.assignedStaffId,

        record.collectorStaffId,

        record.collectedByStaffId,

        record.staffCode,

        record.employeeId,

        record.staffDocumentId,

        record.assignedStaffDocumentId,

        record.collectorStaffDocumentId

    ];


    return recordIdentifiers.some(
        value => {

            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {

                return false;

            }


            return identifiers.includes(
                String(value)
            );

        }
    );

}


// ============================================================
// CUSTOMER STAFF MATCH
// ============================================================

function customerBelongsToStaff(
    customer
) {

    return recordBelongsToStaff(
        customer
    );

}


// ============================================================
// LOAN STAFF MATCH
// ============================================================

function loanBelongsToStaff(
    loan
) {

    return recordBelongsToStaff(
        loan
    );

}


// ============================================================
// PAYMENT STAFF MATCH
// ============================================================

function paymentBelongsToStaff(
    payment
) {

    return recordBelongsToStaff(
        payment
    );

}


// ============================================================
// DEPOSIT STAFF MATCH
// ============================================================

function depositBelongsToStaff(
    request
) {

    return recordBelongsToStaff(
        request
    );

}


// ============================================================
// GET CUSTOMER ID
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
// GET LOAN CUSTOMER ID
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
// GET PAYMENT AMOUNT
// ============================================================

function getPaymentAmount(
    payment
) {

    return numberValue(

        payment.amountReceived,

        payment.totalCollection,

        payment.amountCollected,

        payment.paidAmount,

        payment.emiPaid,

        payment.amount

    );

}


// ============================================================
// GET PAYMENT DATE
// ============================================================

function getPaymentDate(
    payment
) {

    return firstValue(
        payment,
        [
            "paymentDate",
            "paidDate",
            "collectionDate",
            "createdAt"
        ],
        ""
    );

}


// ============================================================
// GET LOAN DUE
// ============================================================

function getLoanDue(
    loan
) {

    return numberValue(

        loan.currentDueAmount,

        loan.dueAmount,

        loan.installmentAmount,

        loan.emiAmount,

        loan.monthlyInstallment,

        loan.currentEmi

    );

}


// ============================================================
// GET LOAN PENDING
// ============================================================

function getLoanPending(
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
// LOAD ALL DATA
// ============================================================

async function loadDashboardData() {

    showLoading(true);

    try {

        const [
            customersSnapshot,
            loansSnapshot,
            paymentsSnapshot,
            depositsSnapshot
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
            ),

            getDocs(
                collection(
                    db,
                    "depositRequests"
                )
            )

        ]);


        // ====================================================
        // CUSTOMERS
        // ====================================================

        allCustomers = [];


        customersSnapshot.forEach(
            docSnap => {

                const customer = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                if (
                    customerBelongsToStaff(
                        customer
                    )
                ) {

                    allCustomers.push(
                        customer
                    );

                }

            }
        );


        // ====================================================
        // LOANS
        // ====================================================

        allLoans = [];


        loansSnapshot.forEach(
            docSnap => {

                const loan = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                if (
                    loanBelongsToStaff(
                        loan
                    )
                ) {

                    allLoans.push(
                        loan
                    );

                    return;

                }


                // --------------------------------------------
                // If loan does not contain staff field,
                // match through customer.
                // --------------------------------------------

                const loanCustomerId =
                    getLoanCustomerId(
                        loan
                    );


                if (
                    loanCustomerId
                ) {

                    const assignedCustomer =
                        allCustomers.find(
                            customer => {

                                return (
                                    getCustomerId(
                                        customer
                                    ) ===
                                    loanCustomerId
                                );

                            }
                        );


                    if (
                        assignedCustomer
                    ) {

                        allLoans.push(
                            loan
                        );

                    }

                }

            }
        );


        // ====================================================
        // PAYMENTS
        // ====================================================

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


                if (
                    paymentBelongsToStaff(
                        payment
                    )
                ) {

                    allPayments.push(
                        payment
                    );

                }

            }
        );


        // ====================================================
        // DEPOSIT REQUESTS
        // ====================================================

        allDepositRequests = [];


        depositsSnapshot.forEach(
            docSnap => {

                const request = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                if (
                    depositBelongsToStaff(
                        request
                    )
                ) {

                    allDepositRequests.push(
                        request
                    );

                }

            }
        );


        renderDashboard();


    } catch (
        error
    ) {

        console.error(
            "Staff dashboard error:",
            error
        );


        showLoading(false);

        return;

    } finally {

        showLoading(false);

    }

}


// ============================================================
// RENDER DASHBOARD
// ============================================================

function renderDashboard() {

    // ========================================================
    // CUSTOMER COUNT
    // ========================================================

    const uniqueCustomerIds =
        new Set();


    allCustomers.forEach(
        customer => {

            uniqueCustomerIds.add(
                getCustomerId(
                    customer
                )
            );

        }
    );


    // Also identify customers through loans
    allLoans.forEach(
        loan => {

            const customerId =
                getLoanCustomerId(
                    loan
                );


            if (
                customerId
            ) {

                uniqueCustomerIds.add(
                    customerId
                );

            }

        }
    );


    const customerCount =
        [...uniqueCustomerIds]
            .filter(
                id => id !== ""
            )
            .length;


    // ========================================================
    // ACTIVE LOANS
    // ========================================================

    const activeLoans =
        allLoans.filter(
            loan => {

                const status =
                    firstValue(
                        loan,
                        [
                            "status",
                            "loanStatus"
                        ],
                        ""
                    );


                return !isInactiveStatus(
                    status
                );

            }
        );


    // ========================================================
    // TODAY DUE
    // ========================================================

    let todayDue = 0;


    const todayKey =
        getTodayKey();


    activeLoans.forEach(
        loan => {

            const dueDate =
                firstValue(
                    loan,
                    [
                        "nextDueDate",
                        "dueDate",
                        "currentDueDate",
                        "emiDueDate"
                    ],
                    ""
                );


            if (
                getDateKey(
                    dueDate
                ) ===
                todayKey
            ) {

                todayDue +=
                    getLoanDue(
                        loan
                    );

            }

        }
    );


    // ========================================================
    // COLLECTION TOTALS
    // ========================================================

    let todayCollection = 0;

    let monthCollection = 0;


    const currentMonth =
        getCurrentMonthKey();


    allPayments.forEach(
        payment => {

            const amount =
                getPaymentAmount(
                    payment
                );


            const paymentDate =
                getPaymentDate(
                    payment
                );


            if (
                getDateKey(
                    paymentDate
                ) ===
                todayKey
            ) {

                todayCollection +=
                    amount;

            }


            if (
                getMonthKey(
                    paymentDate
                ) ===
                currentMonth
            ) {

                monthCollection +=
                    amount;

            }

        }
    );


    // ========================================================
    // TOTAL PENDING
    // ========================================================

    let totalPending = 0;


    activeLoans.forEach(
        loan => {

            totalPending +=
                getLoanPending(
                    loan
                );

        }
    );


    // ========================================================
    // DEPOSIT CALCULATION
    // ========================================================

    let acceptedDeposit = 0;

    let pendingDeposit = 0;


    allDepositRequests.forEach(
        request => {

            const amount =
                numberValue(
                    request.amount,
                    request.depositAmount
                );


            const status =
                String(
                    request.status ||
                    "pending"
                ).toLowerCase();


            if (
                status ===
                "accepted"
            ) {

                acceptedDeposit +=
                    amount;

            }


            if (
                status ===
                "pending"
            ) {

                pendingDeposit +=
                    amount;

            }

        }
    );


    // ========================================================
    // CASH IN HAND
    // ========================================================
    //
    // Total staff collection
    // - accepted deposits
    // - pending deposit requests
    //
    // Reversed requests are automatically
    // excluded because status is not accepted.
    // ========================================================

    let totalCollection = 0;


    allPayments.forEach(
        payment => {

            totalCollection +=
                getPaymentAmount(
                    payment
                );

        }
    );


    const cashInHand =
        Math.max(
            totalCollection -
            acceptedDeposit -
            pendingDeposit,
            0
        );


    // ========================================================
    // SET UI
    // ========================================================

    setText(
        myCustomersElement,
        customerCount
    );


    setText(
        activeLoansElement,
        activeLoans.length
    );


    setText(
        todayDueElement,
        formatCurrency(
            todayDue
        )
    );


    setText(
        todayCollectionElement,
        formatCurrency(
            todayCollection
        )
    );


    setText(
        monthCollectionElement,
        formatCurrency(
            monthCollection
        )
    );


    setText(
        totalPendingElement,
        formatCurrency(
            totalPending
        )
    );


    setText(
        cashInHandElement,
        formatCurrency(
            cashInHand
        )
    );


    setText(
        depositPendingElement,
        formatCurrency(
            pendingDeposit
        )
    );

}


// ============================================================
// STAFF INFO
// ============================================================

function renderStaffInfo() {

    if (
        !currentStaff
    ) {

        return;

    }


    const staffName =
        firstValue(
            currentStaff,
            [
                "staffName",
                "name",
                "fullName"
            ],
            "Staff"
        );


    const staffId =
        firstValue(
            currentStaff,
            [
                "staffId",
                "staffCode",
                "employeeId",
                "staffDocumentId"
            ],
            "-"
        );


    setText(
        staffNameElement,
        staffName
    );


    setText(
        staffIdElement,
        staffId
    );


    setText(
        welcomeNameElement,
        staffName
    );

}


// ============================================================
// NAVIGATION
// ============================================================

if (
    customersBtn
) {

    customersBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-customers.html";

        }
    );

}


if (
    collectionBtn
) {

    collectionBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-customers.html";

        }
    );

}


if (
    depositBtn
) {

    depositBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-deposit.html";

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

            const confirmed =
                confirm(
                    "Logout from staff portal?"
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                await signOut(
                    auth
                );

            } catch (
                error
            ) {

                console.error(
                    "Logout error:",
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
// SET TEXT
// ============================================================

function setText(
    element,
    value
) {

    if (
        element
    ) {

        element.textContent =
            value;

    }

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
// AUTH CHECK
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        const session =
            getStaffSession();


        if (
            !session ||
            String(
                session.role ||
                ""
            ).toLowerCase() !==
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


        renderStaffInfo();


        await loadDashboardData();

    }
);
