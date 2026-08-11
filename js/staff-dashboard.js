// ============================================================
// SR AUTO FINANCE ERP
// STAFF DASHBOARD - FINAL V2
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
// CONSTANTS
// ============================================================

const STAFF_SESSION_KEY = "srStaffSession";
const STAFF_UID_KEY = "srStaffUid";

const COMMON_LOGIN_PAGE = "login.html";
const STAFF_LOGIN_PAGE = "staff-login.html";


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
// GLOBAL STATE
// ============================================================

let currentStaff = null;

let allCustomers = [];
let allLoans = [];

// IMPORTANT:
// Actual customer repayment transactions are stored
// in the FINALIZED collection: "collections"
let allCollections = [];

let allDepositRequests = [];

let dashboardStarted = false;
let logoutStarted = false;
let accessCheckRunning = false;


// ============================================================
// SESSION
// ============================================================

function getStaffSession() {

    const raw =
        sessionStorage.getItem(
            STAFF_SESSION_KEY
        );

    if (!raw) {
        return null;
    }

    try {

        const session =
            JSON.parse(raw);

        if (
            !session ||
            String(session.role || "")
                .toLowerCase() !== "staff"
        ) {

            clearStaffSession();

            return null;
        }

        return session;

    } catch (error) {

        console.error(
            "Invalid staff session:",
            error
        );

        clearStaffSession();

        return null;
    }
}


// ============================================================
// CLEAR STAFF SESSION
// ============================================================

function clearStaffSession() {

    sessionStorage.removeItem(
        STAFF_SESSION_KEY
    );

    sessionStorage.removeItem(
        STAFF_UID_KEY
    );
}


// ============================================================
// SAVE STAFF SESSION
// ============================================================

function saveStaffSession(
    session
) {

    sessionStorage.setItem(
        STAFF_SESSION_KEY,
        JSON.stringify(session)
    );

    if (session?.authUid) {

        sessionStorage.setItem(
            STAFF_UID_KEY,
            session.authUid
        );
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
// NUMBER VALUE
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
// DATE PARSER
// ============================================================

function parseDate(
    value
) {

    if (!value) {
        return null;
    }


    // Firestore Timestamp

    if (
        typeof value.toDate ===
        "function"
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


    // Firestore-like object

    if (
        typeof value === "object" &&
        value.seconds !== undefined
    ) {

        return new Date(
            Number(value.seconds) *
            1000
        );
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
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
// TODAY KEY
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
// INACTIVE STATUS
// ============================================================

function isInactiveStatus(
    value
) {

    const status =
        String(value || "")
            .trim()
            .toLowerCase();

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
// COLLECTION AMOUNT
// ============================================================
//
// FINALIZED PAYMENT COLLECTION:
// "collections"
//
// We support the existing field names used by
// the collection transaction.
// ============================================================

function getCollectionAmount(
    item
) {

    return numberValue(

        item.amountReceived,

        item.totalCollection,

        item.amountCollected,

        item.emiPaid,

        item.paidAmount,

        item.collectionAmount,

        item.amount

    );
}


// ============================================================
// COLLECTION DATE
// ============================================================

function getCollectionDate(
    item
) {

    return firstValue(

        item,

        [

            "collectionDate",
            "paymentDate",
            "paidDate",
            "date",
            "createdAt"

        ],

        ""
    );
}


// ============================================================
// COLLECTION STATUS
// ============================================================

function isValidCollection(
    item
) {

    const status =
        String(
            item?.status ||
            "success"
        )
            .trim()
            .toLowerCase();

    return ![

        "cancelled",
        "canceled",
        "reversed",
        "deleted",
        "failed"

    ].includes(status);
}


// ============================================================
// LOAN DUE
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
// LOAN OUTSTANDING
// ============================================================
//
// MASTER SOURCE:
// 1. outstandingAmount
// 2. balanceAmount
// 3. totalPayable - amountPaid
//
// pendingAmount is intentionally NOT used.
// ============================================================

function getLoanPending(
    loan
) {

    if (!loan) {
        return 0;
    }


    if (
        loan.outstandingAmount !==
        undefined &&
        loan.outstandingAmount !==
        null &&
        loan.outstandingAmount !==
        ""
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
        null &&
        loan.balanceAmount !==
        ""
    ) {

        return Math.max(

            numberValue(
                loan.balanceAmount
            ),

            0

        );
    }


    const totalPayable =
        numberValue(

            loan.totalPayable,

            loan.totalAmount

        );


    const totalPaid =
        numberValue(

            loan.amountPaid,

            loan.paidAmount,

            loan.totalPaid

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
// SAFE COLLECTION LOADER
// ============================================================

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


        return snapshot.docs.map(
            docSnap => ({

                id:
                    docSnap.id,

                ...docSnap.data()

            })
        );


    } catch (error) {

        console.error(

            `Staff dashboard: ${collectionName} load failed:`,

            error

        );

        return [];
    }
}


// ============================================================
// STAFF DOCUMENT VALIDATION
// ============================================================

async function loadAndValidateStaff(
    user,
    session
) {

    if (
        !session?.staffDocumentId
    ) {

        throw new Error(
            "Staff document ID is missing."
        );
    }


    const staffRef =
        doc(

            db,

            "staff",

            session.staffDocumentId

        );


    const staffSnapshot =
        await getDoc(
            staffRef
        );


    if (
        !staffSnapshot.exists()
    ) {

        throw new Error(
            "Staff document not found."
        );
    }


    const staffData =
        staffSnapshot.data();


    // ========================================================
    // STATUS
    // ========================================================

    const status =
        String(
            staffData.status ||
            "active"
        )
            .trim()
            .toLowerCase();


    if (
        [

            "inactive",
            "disabled",
            "blocked",
            "deleted"

        ].includes(status)
    ) {

        throw new Error(
            "Your staff account is inactive."
        );
    }


    if (
        staffData.active === false
    ) {

        throw new Error(
            "Your staff account is inactive."
        );
    }


    // ========================================================
    // AUTH UID
    // ========================================================

    if (
        staffData.authUid &&
        staffData.authUid !==
        user.uid
    ) {

        throw new Error(
            "Staff authentication mismatch."
        );
    }


    // ========================================================
    // EMAIL
    // ========================================================

    const staffEmail =
        String(
            staffData.email ||
            ""
        )
            .trim()
            .toLowerCase();


    const authEmail =
        String(
            user.email ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        staffEmail &&
        authEmail &&
        staffEmail !== authEmail
    ) {

        throw new Error(
            "Staff email verification failed."
        );
    }


    // ========================================================
    // TRUSTED STAFF OBJECT
    // ========================================================

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


    // ========================================================
    // UPDATE SESSION
    // ========================================================

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

        uid:
            user.uid,

        authUid:
            user.uid,

        role:
            "staff"

    };


    saveStaffSession(
        updatedSession
    );


    renderStaffInfo();
}


// ============================================================
// LOAD DASHBOARD DATA
// ============================================================

async function loadDashboardData() {

    showLoading(true);


    try {

        const [

            customers,

            loans,

            collections,

            deposits

        ] = await Promise.all([


            safeGetCollection(
                "customers"
            ),


            safeGetCollection(
                "loans"
            ),


            // =================================================
            // IMPORTANT:
            // FINAL PAYMENT COLLECTION
            // =================================================

            safeGetCollection(
                "collections"
            ),


            safeGetCollection(
                "depositRequests"
            )

        ]);


        allCustomers =
            Array.isArray(
                customers
            )
                ? customers
                : [];


        allLoans =
            Array.isArray(
                loans
            )
                ? loans
                : [];


        // =====================================================
        // VALID COLLECTION TRANSACTIONS ONLY
        // =====================================================

        allCollections =
            Array.isArray(
                collections
            )

                ? collections.filter(
                    isValidCollection
                )

                : [];


        allDepositRequests =
            Array.isArray(
                deposits
            )
                ? deposits
                : [];


        renderDashboard();


    } catch (error) {

        console.error(

            "Staff dashboard data error:",

            error

        );


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


    // Also identify customer through loan

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
    // DATE KEYS
    // ========================================================

    const todayKey =
        getTodayKey();


    const currentMonth =
        getCurrentMonthKey();


    // ========================================================
    // TODAY DUE
    // ========================================================

    let todayDue = 0;


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
                ) === todayKey
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


    allCollections.forEach(
        item => {

            const amount =
                getCollectionAmount(
                    item
                );


            const collectionDate =
                getCollectionDate(
                    item
                );


            totalCollection +=
                amount;


            if (
                getDateKey(
                    collectionDate
                ) === todayKey
            ) {

                todayCollection +=
                    amount;
            }


            if (
                getMonthKey(
                    collectionDate
                ) === currentMonth
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

                    request.depositAmount,

                    request.collectionAmount,

                    request.totalAmount

                );


            const status =
                String(

                    request.status ||
                    "pending"

                )
                    .trim()
                    .toLowerCase();


            if (
                [

                    "accepted",
                    "approved",
                    "received",
                    "completed"

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
    // IMPORTANT BUSINESS LOGIC:
    //
    // Customer collection
    //          ↓
    // Staff Cash in Hand
    //
    // Pending deposit:
    // Staff still physically holds the cash.
    //
    // Approved / Received deposit:
    // Cash is no longer with staff.
    //
    // Therefore:
    //
    // Cash in Hand =
    // Total Collection - Approved/Received Deposit
    //
    // Pending deposit is NOT deducted.
    // ========================================================

    const cashInHand =
        Math.max(

            totalCollection -
            acceptedDeposit,

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
    // DEBUG
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
        "Unique Customers:",
        customerCount
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
        "Collections:",
        allCollections.length
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
        "Total Collection:",
        totalCollection
    );

    console.log(
        "Total Pending:",
        totalPending
    );

    console.log(
        "Approved Deposit:",
        acceptedDeposit
    );

    console.log(
        "Pending Deposit:",
        pendingDeposit
    );

    console.log(
        "Cash In Hand:",
        cashInHand
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
// NAVIGATION
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


if (collectionBtn) {

    collectionBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-customers.html";

        }
    );

}


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


            if (logoutStarted) {
                return;
            }


            const confirmed =
                confirm(
                    "Logout from staff portal?"
                );


            if (!confirmed) {
                return;
            }


            logoutStarted = true;


            logoutBtn.disabled =
                true;


            logoutBtn.textContent =
                "Logging out...";


            try {

                await signOut(
                    auth
                );

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            } finally {


                // Clear ONLY staff session.
                // Do NOT use sessionStorage.clear()
                // because it may remove other ERP session data.

                clearStaffSession();


                // Replace prevents normal browser Back
                // from returning to staff dashboard.

                window.location.replace(
                    COMMON_LOGIN_PAGE
                );

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

    if (!loadingOverlay) {
        return;
    }


    loadingOverlay.style.display =
        show
            ? "flex"
            : "none";
}


// ============================================================
// DENY STAFF ACCESS
// ============================================================

async function denyStaffAccess(
    message = "Staff login required."
) {

    console.warn(
        message
    );


    currentStaff =
        null;


    clearStaffSession();


    try {

        await signOut(
            auth
        );

    } catch (error) {

        console.warn(
            "Sign out during access denial failed:",
            error
        );

    }


    window.location.replace(
        STAFF_LOGIN_PAGE
    );
}


// ============================================================
// STAFF ACCESS VALIDATION
// ============================================================

async function verifyStaffAccess(
    user
) {


    if (
        dashboardStarted ||
        accessCheckRunning
    ) {

        return;
    }


    accessCheckRunning =
        true;


    const session =
        getStaffSession();


    try {


        // ====================================================
        // SESSION CHECK
        // ====================================================

        if (!session) {

            await denyStaffAccess(
                "No valid staff session found."
            );

            return;
        }


        // ====================================================
        // FIREBASE AUTH CHECK
        // ====================================================

        if (!user) {

            await denyStaffAccess(
                "Firebase authentication not found."
            );

            return;
        }


        // ====================================================
        // ROLE CHECK
        // ====================================================

        if (
            String(
                session.role || ""
            )
                .trim()
                .toLowerCase() !==
            "staff"
        ) {

            await denyStaffAccess(
                "Staff access required."
            );

            return;
        }


        // ====================================================
        // UID CHECK
        // ====================================================

        const sessionUid =
            String(

                session.authUid ||

                session.uid ||

                sessionStorage.getItem(
                    STAFF_UID_KEY
                ) ||

                ""

            );


        if (
            !sessionUid ||
            sessionUid !== user.uid
        ) {

            await denyStaffAccess(
                "Staff authentication mismatch."
            );

            return;
        }


        // ====================================================
        // VALIDATE STAFF DOCUMENT
        // ====================================================

        showLoading(
            true
        );


        await loadAndValidateStaff(
            user,
            session
        );


        // ====================================================
        // DASHBOARD START
        // ====================================================

        dashboardStarted =
            true;


        await loadDashboardData();


    } catch (error) {

        console.error(
            "Staff authorization error:",
            error
        );


        dashboardStarted =
            false;


        await denyStaffAccess(

            error?.message ||

            "Staff authorization failed."

        );


    } finally {

        showLoading(
            false
        );


        accessCheckRunning =
            false;
    }
}


// ============================================================
// BROWSER BACK PROTECTION
// ============================================================
//
// If Staff logs out and browser Back is pressed,
// the protected dashboard must not remain visible.
//
// ============================================================

function protectDashboardHistory() {

    try {

        window.history.replaceState(
            {
                staffDashboard: true
            },
            "",
            window.location.href
        );


        window.history.pushState(
            {
                staffDashboard: true
            },
            "",
            window.location.href
        );


        window.addEventListener(
            "popstate",
            async () => {

                const session =
                    getStaffSession();


                const user =
                    auth.currentUser;


                if (
                    !session ||
                    session.role !==
                    "staff" ||
                    !user
                ) {

                    clearStaffSession();


                    try {

                        await signOut(
                            auth
                        );

                    } catch (error) {

                        console.warn(
                            "Back protection signout failed:",
                            error
                        );

                    }


                    window.location.replace(
                        COMMON_LOGIN_PAGE
                    );


                    return;
                }


                /*
                 * Staff is still logged in.
                 * Keep the dashboard protected.
                 */

                window.history.pushState(
                    {
                        staffDashboard: true
                    },
                    "",
                    window.location.href
                );

            }
        );

    } catch (error) {

        console.warn(
            "Dashboard history protection failed:",
            error
        );
    }
}


// ============================================================
// BFCACHE PROTECTION
// ============================================================

function protectBackForwardCache() {

    window.addEventListener(
        "pageshow",
        async event => {

            if (
                event.persisted
            ) {

                const session =
                    getStaffSession();

                const user =
                    auth.currentUser;


                if (
                    !session ||
                    session.role !==
                    "staff" ||
                    !user
                ) {

                    clearStaffSession();

                    window.location.replace(
                        COMMON_LOGIN_PAGE
                    );

                    return;
                }


                /*
                 * Valid staff session exists.
                 * Revalidate dashboard instead of
                 * blindly showing cached data.
                 */

                dashboardStarted =
                    false;

            }

        }
    );
}


// ============================================================
// BEFORE UNLOAD
// ============================================================
//
// No session is cleared here.
// This is intentionally left untouched so that
// browser refresh does NOT log Staff out.
// ============================================================


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


// ============================================================
// INITIAL PAGE PROTECTION
// ============================================================

protectDashboardHistory();

protectBackForwardCache();


// ============================================================
// PAGE READY LOG
// ============================================================

console.log(
    "SR Auto Finance Staff Dashboard initialized."
);
