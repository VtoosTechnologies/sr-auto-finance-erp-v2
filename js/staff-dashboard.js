// ============================================================
// SR AUTO FINANCE ERP
// STAFF DASHBOARD - V1
// File: js/staff-dashboard.js
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
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
        sessionStorage.getItem("srStaffSession");

    if (!raw) {
        return null;
    }

    try {

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "Invalid staff session:",
            error
        );

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

    for (const field of fields) {

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

function numberValue(...values) {

    for (const value of values) {

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

function formatCurrency(value) {

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

function parseDate(value) {

    if (!value) {
        return null;
    }

    // Firestore Timestamp
    if (
        typeof value.toDate === "function"
    ) {
        return value.toDate();
    }

    // JavaScript Date
    if (
        value instanceof Date
    ) {
        return new Date(
            value.getTime()
        );
    }

    // Firestore timestamp-like object
    if (
        typeof value === "object" &&
        value.seconds !== undefined
    ) {

        return new Date(
            Number(value.seconds) * 1000
        );
    }

    const date =
        new Date(value);

    if (
        isNaN(date.getTime())
    ) {
        return null;
    }

    return date;
}


// ============================================================
// DATE KEY
// ============================================================

function getDateKey(value) {

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

function getMonthKey(value) {

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
// STATUS
// ============================================================

function isInactiveStatus(value) {

    const status =
        String(
            value || ""
        )
            .toLowerCase()
            .trim();

    return [
        "closed",
        "completed",
        "cancelled",
        "canceled",
        "rejected",
        "deleted",
        "inactive"
    ].includes(status);
}


// ============================================================
// CUSTOMER ID
// ============================================================

function getCustomerId(customer) {

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
// LOAN CUSTOMER ID
// ============================================================

function getLoanCustomerId(loan) {

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
// PAYMENT AMOUNT
// ============================================================

function getPaymentAmount(payment) {

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
// PAYMENT DATE
// ============================================================

function getPaymentDate(payment) {

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
// LOAN DUE
// ============================================================

function getLoanDue(loan) {

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
// LOAN PENDING
// ============================================================
//
// IMPORTANT:
// Current outstanding priority:
//
// 1. outstandingAmount
// 2. balanceAmount
// 3. calculated:
//       totalPayable - totalPaid
//
// pendingAmount is NOT used because it can contain
// an old / legacy value and cause dashboard mismatch.
//
// ============================================================

function getLoanPending(loan) {

    if (!loan) {
        return 0;
    }


    // --------------------------------------------------------
    // 1. CURRENT OUTSTANDING AMOUNT
    // --------------------------------------------------------

    if (
        loan.outstandingAmount !== undefined &&
        loan.outstandingAmount !== null &&
        loan.outstandingAmount !== ""
    ) {

        return Math.max(
            numberValue(
                loan.outstandingAmount
            ),
            0
        );

    }


    // --------------------------------------------------------
    // 2. CURRENT BALANCE AMOUNT
    // --------------------------------------------------------

    if (
        loan.balanceAmount !== undefined &&
        loan.balanceAmount !== null &&
        loan.balanceAmount !== ""
    ) {

        return Math.max(
            numberValue(
                loan.balanceAmount
            ),
            0
        );

    }


    // --------------------------------------------------------
    // 3. FALLBACK CALCULATION
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // 4. NO VALID VALUE
    // --------------------------------------------------------

    return 0;

}

// ============================================================
// SAFE COLLECTION LOADER
// ============================================================
//
// Important:
// One collection permission problem should NOT break
// the complete staff dashboard.
//

async function safeGetCollection(
    collectionName
) {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    collectionName
                )
            );

        const records = [];

        snapshot.forEach(
            docSnap => {

                records.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );

        return records;

    } catch (error) {

        console.error(
            `Staff dashboard: ${collectionName} load failed:`,
            error
        );

        return [];
    }
}


// ============================================================
// LOAD ALL STAFF-VISIBLE DATA
// ============================================================
//
// V1 RULE:
// One staff only.
// Staff can view ALL customer and loan information.
//
// Assignment filtering is intentionally NOT used.
//
// Version 2:
// Staff-wise assignment can be introduced later.
//

async function loadDashboardData() {

    showLoading(true);

    try {

        // ------------------------------------------------------
        // Load collections independently.
        // This prevents one permission error from stopping
        // the entire dashboard.
        // ------------------------------------------------------

        const [
            customers,
            loans,
            payments,
            deposits
        ] = await Promise.all([

            safeGetCollection(
                "customers"
            ),

            safeGetCollection(
                "loans"
            ),

            safeGetCollection(
                "payments"
            ),

            safeGetCollection(
                "depositRequests"
            )

        ]);


        // ------------------------------------------------------
        // CUSTOMERS
        // ------------------------------------------------------

        allCustomers =
            Array.isArray(customers)
                ? customers
                : [];


        // ------------------------------------------------------
        // LOANS
        // ------------------------------------------------------

        allLoans =
            Array.isArray(loans)
                ? loans
                : [];


        // ------------------------------------------------------
        // PAYMENTS
        // ------------------------------------------------------

        allPayments = [];

        payments.forEach(
            payment => {

                const status =
                    String(
                        payment.status ||
                        "success"
                    )
                        .toLowerCase()
                        .trim();

                // Ignore reversed/cancelled payments
                if (
                    [
                        "cancelled",
                        "canceled",
                        "reversed",
                        "deleted"
                    ].includes(status)
                ) {
                    return;
                }

                allPayments.push(
                    payment
                );

            }
        );


        // ------------------------------------------------------
        // DEPOSITS
        // ------------------------------------------------------

        allDepositRequests =
            Array.isArray(deposits)
                ? deposits
                : [];


        // ------------------------------------------------------
        // RENDER
        // ------------------------------------------------------

        renderDashboard();


    } catch (error) {

        console.error(
            "Staff dashboard data error:",
            error
        );

        // Even if something unexpected happens,
        // show whatever data is already available.

        renderDashboard();

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

            const id =
                getCustomerId(
                    customer
                );

            if (id) {

                uniqueCustomerIds.add(
                    id
                );

            }

        }
    );


    // Also identify customers through loans
    allLoans.forEach(
        loan => {

            const customerId =
                getLoanCustomerId(
                    loan
                );

            if (customerId) {

                uniqueCustomerIds.add(
                    customerId
                );

            }

        }
    );


    const customerCount =
        uniqueCustomerIds.size;


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

    let totalCollection = 0;

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


            totalCollection +=
                amount;


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
                )
                    .toLowerCase()
                    .trim();


            if (
                [
                    "accepted",
                    "approved"
                ].includes(status)
            ) {

                acceptedDeposit +=
                    amount;

            }


            if (
                [
                    "pending",
                    "requested"
                ].includes(status)
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
    // Current V1 calculation:
    //
    // Total collection
    // - accepted deposit
    // - pending deposit request
    //
    // Never allow negative cash.
    //

    const cashInHand =
        Math.max(
            totalCollection -
            acceptedDeposit -
            pendingDeposit,
            0
        );


    // ========================================================
    // UPDATE UI
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


    // ========================================================
    // DEBUG INFORMATION
    // ========================================================

    console.log(
        "======================================"
    );

    console.log(
        "SR AUTO FINANCE - STAFF DASHBOARD"
    );

    console.log(
        "======================================"
    );

    console.log(
        "Customers:",
        allCustomers.length
    );

    console.log(
        "Loans:",
        allLoans.length
    );

    console.log(
        "Active Loans:",
        activeLoans.length
    );

    console.log(
        "Payments:",
        allPayments.length
    );

    console.log(
        "Deposit Requests:",
        allDepositRequests.length
    );

    console.log(
        "Today's Due:",
        todayDue
    );

    console.log(
        "Today's Collection:",
        todayCollection
    );

    console.log(
        "Month Collection:",
        monthCollection
    );

    console.log(
        "Total Pending:",
        totalPending
    );

    console.log(
        "Cash In Hand:",
        cashInHand
    );

    console.log(
        "Deposit Pending:",
        pendingDeposit
    );

    console.log(
        "======================================"
    );
}


// ============================================================
// STAFF INFO
// ============================================================

function renderStaffInfo() {

    if (!currentStaff) {
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
// NAVIGATION - MY CUSTOMERS
// ============================================================

if (customersBtn) {

    customersBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-customers.html";

        }
    );

}


// ============================================================
// NAVIGATION - COLLECTION
// ============================================================

if (collectionBtn) {

    collectionBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-customers.html";

        }
    );

}


// ============================================================
// NAVIGATION - DEPOSIT
// ============================================================

if (depositBtn) {

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

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "Logout from staff portal?"
                );


            if (!confirmed) {
                return;
            }


            try {

                await signOut(
                    auth
                );

            } catch (error) {

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

    if (element) {

        element.textContent =
            value;

    }
}


// ============================================================
// LOADING
// ============================================================

function showLoading(show) {

    if (!loadingOverlay) {
        return;
    }

    loadingOverlay.style.display =
        show
            ? "flex"
            : "none";
}


// ============================================================
// AUTH CHECK - STAFF ONLY
// ============================================================

async function verifyStaffAccess(user) {

    const session =
        getStaffSession();


    // --------------------------------------------------------
    // SESSION CHECK
    // --------------------------------------------------------

    if (
        !session ||
        String(
            session.role || ""
        )
            .toLowerCase() !==
        "staff"
    ) {

        window.location.href =
            "staff-login.html";

        return false;
    }


    // --------------------------------------------------------
    // FIREBASE LOGIN CHECK
    // --------------------------------------------------------

    if (!user) {

        sessionStorage.removeItem(
            "srStaffSession"
        );

        sessionStorage.removeItem(
            "srStaffUid"
        );

        window.location.href =
            "staff-login.html";

        return false;
    }


    // --------------------------------------------------------
    // SESSION UID CHECK
    // --------------------------------------------------------

    if (
        session.authUid &&
        session.authUid !== user.uid
    ) {

        console.error(
            "Staff UID mismatch."
        );

        try {
            await signOut(auth);
        } catch (error) {
            console.error(
                "Sign out error:",
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

        return false;
    }


    // --------------------------------------------------------
    // STAFF DOCUMENT ID
    // --------------------------------------------------------

    const staffDocumentId =
        session.staffDocumentId;


    if (!staffDocumentId) {

        console.error(
            "Staff document ID missing."
        );

        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
        }

        sessionStorage.clear();

        window.location.href =
            "staff-login.html";

        return false;
    }


    // --------------------------------------------------------
    // LOAD STAFF DOCUMENT
    // --------------------------------------------------------

    try {

        const staffRef =
            doc(
                db,
                "staff",
                staffDocumentId
            );


        const staffSnapshot =
            await getDoc(
                staffRef
            );


        if (
            !staffSnapshot.exists()
        ) {

            console.error(
                "Staff document not found."
            );

            try {
                await signOut(auth);
            } catch (error) {
                console.error(error);
            }

            sessionStorage.clear();

            window.location.href =
                "staff-login.html";

            return false;
        }


        const staffData =
            staffSnapshot.data();


        // ----------------------------------------------------
        // AUTH UID
        // ----------------------------------------------------

        if (
            staffData.authUid &&
            staffData.authUid !== user.uid
        ) {

            console.error(
                "Firebase UID does not match staff record."
            );

            try {
                await signOut(auth);
            } catch (error) {
                console.error(error);
            }

            sessionStorage.clear();

            window.location.href =
                "staff-login.html";

            return false;
        }


        // ----------------------------------------------------
        // EMAIL
        // ----------------------------------------------------

        const staffEmail =
            String(
                staffData.email || ""
            )
                .trim()
                .toLowerCase();


        const loginEmail =
            String(
                user.email || ""
            )
                .trim()
                .toLowerCase();


        if (
            staffEmail &&
            loginEmail &&
            staffEmail !== loginEmail
        ) {

            console.error(
                "Staff email mismatch."
            );

            try {
                await signOut(auth);
            } catch (error) {
                console.error(error);
            }

            sessionStorage.clear();

            window.location.href =
                "staff-login.html";

            return false;
        }


        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        const status =
            String(
                staffData.status ||
                "active"
            )
                .trim()
                .toLowerCase();


        const inactiveStatuses = [
            "inactive",
            "disabled",
            "blocked",
            "deleted"
        ];


        if (
            inactiveStatuses.includes(
                status
            )
        ) {

            alert(
                "Your staff account is inactive. Please contact the owner."
            );

            try {
                await signOut(auth);
            } catch (error) {
                console.error(error);
            }

            sessionStorage.clear();

            window.location.href =
                "staff-login.html";

            return false;
        }


        // ----------------------------------------------------
        // TRUSTED STAFF OBJECT
        // ----------------------------------------------------

        currentStaff = {

            id:
                staffSnapshot.id,

            ...staffData,

            staffDocumentId:
                staffSnapshot.id,

            authUid:
                user.uid,

            email:
                staffData.email ||
                user.email ||
                "",

            role:
                "staff"

        };


        // ----------------------------------------------------
        // UPDATE SESSION
        // ----------------------------------------------------

        const updatedSession = {

            ...session,

            staffDocumentId:
                staffSnapshot.id,

            staffId:
                staffData.staffId ||
                staffData.staffCode ||
                staffData.employeeId ||
                session.staffId ||
                "",

            staffName:
                staffData.staffName ||
                staffData.name ||
                staffData.fullName ||
                session.staffName ||
                "Staff",

            email:
                staffData.email ||
                user.email ||
                "",

            authUid:
                user.uid,

            role:
                "staff"

        };


        sessionStorage.setItem(
            "srStaffSession",
            JSON.stringify(
                updatedSession
            )
        );


        // ----------------------------------------------------
        // STAFF INFO
        // ----------------------------------------------------

        renderStaffInfo();


        // ----------------------------------------------------
        // LOAD DASHBOARD
        // ----------------------------------------------------

        await loadDashboardData();


        return true;


    } catch (error) {

        console.error(
            "Staff authorization error:",
            error
        );

        try {

            await signOut(
                auth
            );

        } catch (signOutError) {

            console.error(
                "Sign out error:",
                signOutError
            );

        }

        sessionStorage.clear();

        window.location.href =
            "staff-login.html";

        return false;
    }
}


// ============================================================
// FIREBASE AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        await verifyStaffAccess(
            user
        );

    }
);
