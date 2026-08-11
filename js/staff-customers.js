// ============================================================
// SR AUTO FINANCE ERP
// STAFF - MY CUSTOMERS
// FINAL ROLE VERSION
//
// STAFF PERMISSION:
// 1. View customer details required for collection
// 2. View loan details required for collection
// 3. Collect payment
//
// STAFF CANNOT:
// - Create customer
// - Edit customer
// - Create loan
// - Edit loan
// - Close loan
// - Reopen loan
// - Delete anything
// - Manage staff
// - Change loan terms
//
// PAYMENT MASTER COLLECTION:
// collections
//
// File:
// js/staff-customers.js
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

const STAFF_SESSION_KEY =
    "srStaffSession";

const STAFF_UID_KEY =
    "srStaffUid";

const STAFF_LOGIN_PAGE =
    "staff-login.html";

const STAFF_DASHBOARD_PAGE =
    "staff-dashboard.html";

const COLLECTION_PAGE =
    "collection-form.html";

const COMMON_LOGIN_PAGE =
    "login.html";


// ============================================================
// ELEMENTS
// ============================================================

const customerList =
    document.getElementById(
        "customerList"
    );

const customerDetails =
    document.getElementById(
        "customerDetails"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const searchBtn =
    document.getElementById(
        "searchBtn"
    );

const clearBtn =
    document.getElementById(
        "clearBtn"
    );

const backBtn =
    document.getElementById(
        "backBtn"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );

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

let allCollections = [];

let assignedCustomers = [];

let assignedLoans = [];

let selectedCustomerId = "";

let pageInitialized = false;

let logoutStarted = false;


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
            String(
                session.role || ""
            ).toLowerCase() !==
            "staff"
        ) {

            clearStaffSession();

            return null;
        }


        return session;


    } catch (error) {

        console.error(
            "Staff session parse error:",
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
            Number.isFinite(
                number
            )
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


    if (
        typeof value ===
        "object" &&
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
    ).format(
        date
    );
}


// ============================================================
// STAFF DOCUMENT VALIDATION
// ============================================================

async function validateStaff(
    user,
    session
) {

    if (
        !user ||
        !session
    ) {

        throw new Error(
            "Staff login required."
        );
    }


    if (
        String(
            session.role || ""
        ).toLowerCase() !==
        "staff"
    ) {

        throw new Error(
            "Staff access required."
        );
    }


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

        throw new Error(
            "Staff authentication mismatch."
        );
    }


    if (
        !session.staffDocumentId
    ) {

        throw new Error(
            "Staff document ID not found."
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
            "Staff account not found."
        );
    }


    const staffData =
        staffSnapshot.data();


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


    currentStaff = {

        ...session,

        ...staffData,

        staffDocumentId:
            staffSnapshot.id,

        authUid:
            user.uid,

        role:
            "staff"

    };


    sessionStorage.setItem(
        STAFF_SESSION_KEY,
        JSON.stringify(
            currentStaff
        )
    );


    sessionStorage.setItem(
        STAFF_UID_KEY,
        user.uid
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
// CUSTOMER NAME
// ============================================================

function getCustomerName(
    customer
) {

    return String(
        firstValue(

            customer,

            [
                "customerName",
                "name",
                "fullName"
            ],

            "Customer"

        )
    );
}


// ============================================================
// CUSTOMER MOBILE
// ============================================================

function getCustomerMobile(
    customer
) {

    return String(
        firstValue(

            customer,

            [
                "mobile",
                "phone",
                "mobileNumber",
                "contactNumber"
            ],

            "-"

        )
    );
}


// ============================================================
// CUSTOMER ADDRESS
// ============================================================

function getCustomerAddress(
    customer
) {

    return String(
        firstValue(

            customer,

            [
                "address",
                "customerAddress",
                "fullAddress"
            ],

            "-"

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
// LOAN BUSINESS NUMBER
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
// ACTIVE LOAN
// ============================================================

function isActiveLoan(
    loan
) {

    const status =
        String(
            loan?.status ||
            "active"
        )
            .trim()
            .toLowerCase();


    return ![
        "closed",
        "completed",
        "cancelled",
        "canceled"
    ].includes(status);
}


// ============================================================
// LOAN OUTSTANDING
// ============================================================
//
// MASTER SOURCE:
// outstandingAmount
// ↓
// balanceAmount
// ↓
// totalPayable - amountPaid
//
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


    const payable =
        numberValue(

            loan.totalPayable,

            loan.totalAmount

        );


    const paid =
        numberValue(

            loan.amountPaid,

            loan.paidAmount,

            loan.totalPaid

        );


    return Math.max(
        payable - paid,
        0
    );
}


// ============================================================
// LOAN PAID
// ============================================================

function getLoanPaid(
    loan
) {

    return numberValue(

        loan.amountPaid,

        loan.paidAmount,

        loan.totalPaid

    );
}


// ============================================================
// SAFE FIRESTORE LOAD
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

            `${collectionName} loading error:`,

            error

        );


        return [];
    }
}


// ============================================================
// LOAD PAGE DATA
// ============================================================
//
// IMPORTANT:
//
// customers = READ ONLY
// loans = READ ONLY
// collections = READ ONLY
//
// Staff cannot create/update these here.
//
// Actual collection transaction is maintained by
// collection-form.js.
// ============================================================

async function loadData() {

    showLoading(true);


    try {

        const [

            customers,

            loans,

            collections

        ] = await Promise.all([

            safeGetCollection(
                "customers"
            ),

            safeGetCollection(
                "loans"
            ),

            // FINALIZED PAYMENT MASTER
            safeGetCollection(
                "collections"
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


        allCollections =
            Array.isArray(
                collections
            )

                ? collections.filter(
                    item => {

                        const status =
                            String(
                                item.status ||
                                "Success"
                            )
                                .trim()
                                .toLowerCase();


                        return ![
                            "cancelled",
                            "canceled",
                            "reversed",
                            "deleted",
                            "failed"
                        ].includes(
                            status
                        );

                    }
                )

                : [];


        // ====================================================
        // STAFF CAN VIEW REQUIRED CUSTOMER / LOAN DATA
        // ====================================================

        assignedCustomers =
            [
                ...allCustomers
            ];


        assignedLoans =
            [
                ...allLoans
            ];


        // ====================================================
        // SORT CUSTOMER NAME
        // ====================================================

        assignedCustomers.sort(

            (a, b) =>

                getCustomerName(a)
                    .localeCompare(
                        getCustomerName(b)
                    )

        );


        renderCustomerList();


    } catch (error) {

        console.error(
            "Staff customers loading error:",
            error
        );


        if (customerList) {

            customerList.innerHTML = `

                <div class="empty">

                    Unable to load customer details.

                    <br>

                    Please refresh and try again.

                </div>

            `;
        }


    } finally {

        showLoading(false);

    }
}


// ============================================================
// RENDER CUSTOMER LIST
// ============================================================

function renderCustomerList(
    customers = assignedCustomers
) {

    if (!customerList) {
        return;
    }


    if (
        !customers.length
    ) {

        customerList.innerHTML = `

            <div class="empty">

                No customers found.

            </div>

        `;


        if (customerDetails) {

            customerDetails.innerHTML = `

                <div class="empty">

                    No customer selected.

                </div>

            `;
        }


        return;
    }


    customerList.innerHTML =

        customers

            .map(
                customer =>

                    createCustomerListItem(
                        customer
                    )
            )

            .join("");


    document
        .querySelectorAll(
            ".customer-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectCustomer(
                            button.dataset.customerId
                        );

                    }
                );

            }
        );


    if (
        !selectedCustomerId ||
        !customers.some(
            customer =>
                String(
                    getCustomerId(
                        customer
                    )
                ) ===
                String(
                    selectedCustomerId
                )
        )
    ) {

        selectCustomer(
            getCustomerId(
                customers[0]
            )
        );

    } else {

        selectCustomer(
            selectedCustomerId
        );

    }
}


// ============================================================
// CUSTOMER LIST ITEM
// ============================================================

function createCustomerListItem(
    customer
) {

    const customerId =
        getCustomerId(
            customer
        );


    const customerLoans =
        assignedLoans.filter(

            loan =>

                getLoanCustomerId(
                    loan
                ) ===
                customerId

        );


    const activeLoans =
        customerLoans.filter(
            isActiveLoan
        );


    const mobile =
        getCustomerMobile(
            customer
        );


    return `

        <button

            type="button"

            class="customer-item ${
                String(
                    selectedCustomerId
                ) ===
                String(
                    customerId
                )
                    ? "active"
                    : ""
            }"

            data-customer-id="${escapeHtml(
                customerId
            )}"

        >

            <div class="customer-name">

                ${escapeHtml(
                    getCustomerName(
                        customer
                    )
                )}

            </div>


            <div class="customer-meta">

                <span class="badge blue">

                    ${activeLoans.length}

                    Active Loan${
                        activeLoans.length === 1
                            ? ""
                            : "s"
                    }

                </span>


                <span class="badge">

                    ${escapeHtml(
                        mobile
                    )}

                </span>

            </div>

        </button>

    `;
}


// ============================================================
// SELECT CUSTOMER
// ============================================================

function selectCustomer(
    customerId
) {

    selectedCustomerId =
        String(
            customerId || ""
        );


    document
        .querySelectorAll(
            ".customer-item"
        )
        .forEach(
            button => {

                button.classList.toggle(

                    "active",

                    String(
                        button.dataset.customerId
                    ) ===
                    selectedCustomerId

                );

            }
        );


    const customer =
        assignedCustomers.find(

            item =>

                String(
                    getCustomerId(
                        item
                    )
                ) ===
                selectedCustomerId

        );


    if (!customer) {

        if (customerDetails) {

            customerDetails.innerHTML = `

                <div class="empty">

                    Customer details not found.

                </div>

            `;
        }


        return;
    }


    renderCustomerDetails(
        customer
    );
}


// ============================================================
// CUSTOMER DETAILS
// ============================================================

function renderCustomerDetails(
    customer
) {

    if (!customerDetails) {
        return;
    }


    const customerId =
        getCustomerId(
            customer
        );


    const customerLoans =
        assignedLoans.filter(

            loan =>

                getLoanCustomerId(
                    loan
                ) ===
                customerId

        );


    const mobile =
        getCustomerMobile(
            customer
        );


    const address =
        getCustomerAddress(
            customer
        );


    // ========================================================
    // TOTAL LOAN AMOUNT
    // ========================================================

    const totalLoanAmount =
        customerLoans.reduce(

            (
                total,
                loan
            ) =>

                total +

                numberValue(

                    loan.loanAmount,

                    loan.principalAmount,

                    loan.amount

                ),

            0

        );


    // ========================================================
    // TOTAL PAID
    // ========================================================

    const totalPaid =
        customerLoans.reduce(

            (
                total,
                loan
            ) =>

                total +
                getLoanPaid(
                    loan
                ),

            0

        );


    // ========================================================
    // TOTAL PENDING
    // ========================================================

    const totalPending =
        customerLoans.reduce(

            (
                total,
                loan
            ) =>

                total +
                getLoanPending(
                    loan
                ),

            0

        );


    // ========================================================
    // RENDER
    // ========================================================

    customerDetails.innerHTML = `

        <div class="customer-header">

            <div class="customer-header-top">

                <div>

                    <h2 class="customer-main-name">

                        ${escapeHtml(
                            getCustomerName(
                                customer
                            )
                        )}

                    </h2>


                    <div class="customer-main-meta">

                        ID:
                        ${escapeHtml(
                            customerId
                        )}

                        &nbsp; | &nbsp;

                        Mobile:
                        ${escapeHtml(
                            mobile
                        )}

                    </div>

                </div>


                <button

                    type="button"

                    class="collect-main-btn"

                    data-action="collect"

                >

                    Collect Payment

                </button>

            </div>


            <div class="customer-main-meta">

                Address:
                ${escapeHtml(
                    address
                )}

            </div>


            <div class="customer-info-grid">

                <div class="info-card">

                    <div class="info-label">

                        Total Loans

                    </div>

                    <div class="info-value">

                        ${customerLoans.length}

                    </div>

                </div>


                <div class="info-card">

                    <div class="info-label">

                        Loan Amount

                    </div>

                    <div class="info-value">

                        ${formatCurrency(
                            totalLoanAmount
                        )}

                    </div>

                </div>


                <div class="info-card">

                    <div class="info-label">

                        Total Paid

                    </div>

                    <div class="info-value">

                        ${formatCurrency(
                            totalPaid
                        )}

                    </div>

                </div>


                <div class="info-card">

                    <div class="info-label">

                        Total Pending

                    </div>

                    <div class="info-value">

                        ${formatCurrency(
                            totalPending
                        )}

                    </div>

                </div>

            </div>

        </div>


        <div class="loans-section">

            ${
                customerLoans.length

                    ? customerLoans

                        .map(
                            loan =>
                                renderLoan(
                                    loan
                                )
                        )

                        .join("")

                    : `

                        <div class="empty">

                            No loans found for this customer.

                        </div>

                    `
            }

        </div>

    `;


    // ========================================================
    // CUSTOMER LEVEL COLLECT
    // ========================================================

    const collectButton =
        customerDetails.querySelector(
            '[data-action="collect"]'
        );


    if (collectButton) {

        collectButton.addEventListener(
            "click",
            () => {

                const activeLoans =
                    customerLoans.filter(
                        isActiveLoan
                    );


                if (
                    !activeLoans.length
                ) {

                    alert(
                        "This customer has no active loan."
                    );

                    return;
                }


                if (
                    activeLoans.length ===
                    1
                ) {

                    openCollectionPage(
                        activeLoans[0].id
                    );

                    return;
                }


                alert(

                    "This customer has multiple active loans. Please use the Collect Payment button under the required loan."

                );

            }
        );

    }


    // ========================================================
    // LOAN-WISE COLLECT
    // ========================================================

    customerDetails
        .querySelectorAll(
            ".collect-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const loanDocumentId =
                            button.dataset.loanId;


                        if (
                            !loanDocumentId
                        ) {

                            alert(
                                "Loan document ID not found."
                            );

                            return;
                        }


                        openCollectionPage(
                            loanDocumentId
                        );

                    }
                );

            }
        );


    // ========================================================
    // COLLECTION HISTORY COLLECT
    // ========================================================

    customerDetails
        .querySelectorAll(
            ".payment-collect-btn"
        )
        .forEach(
            button => {

                if (
                    button.disabled
                ) {

                    return;
                }


                button.addEventListener(
                    "click",
                    () => {

                        const loanDocumentId =
                            button.dataset.loanId;


                        if (
                            !loanDocumentId
                        ) {

                            alert(
                                "Loan document ID not found."
                            );

                            return;
                        }


                        openCollectionPage(
                            loanDocumentId
                        );

                    }
                );

            }
        );
}


// ============================================================
// OPEN COLLECTION PAGE
// ============================================================
//
// STAFF ONLY ACTION:
//
// collection-form.html
// ?id=Firestore Loan Document ID
//
// collection-form.js performs the actual transaction:
// collections + loans update.
// ============================================================

function openCollectionPage(
    loanDocumentId
) {

    const id =
        String(
            loanDocumentId ||
            ""
        ).trim();


    if (!id) {

        alert(
            "Loan document ID not found."
        );

        return;
    }


    window.location.href =

        `${COLLECTION_PAGE}?id=${encodeURIComponent(
            id
        )}`;
}


// ============================================================
// RENDER LOAN
// ============================================================

function renderLoan(
    loan
) {

    const loanId =
        getLoanId(
            loan
        );


    const status =
        String(
            loan.status ||
            "Active"
        );


    const statusLower =
        status
            .trim()
            .toLowerCase();


    const loanAmount =
        numberValue(

            loan.loanAmount,

            loan.principalAmount,

            loan.amount

        );


    const principal =
        numberValue(

            loan.principalAmount,

            loan.principal,

            loan.loanAmount

        );


    const interest =
        numberValue(

            loan.interestAmount,

            loan.totalInterest,

            loan.interest

        );


    const totalPayable =
        numberValue(

            loan.totalPayable,

            loan.totalAmount,

            principal +
            interest

        );


    const tenure =
        numberValue(

            loan.tenure,

            loan.tenureMonths,

            loan.duration

        );


    const emi =
        numberValue(

            loan.installmentAmount,

            loan.emiAmount,

            loan.monthlyInstallment

        );


    const paid =
        getLoanPaid(
            loan
        );


    const pending =
        getLoanPending(
            loan
        );


    const closedLoan =
        [

            "closed",
            "completed",
            "cancelled",
            "canceled"

        ].includes(
            statusLower
        );


    const collectionHistory =
        getLoanCollections(
            loan
        );


    return `

        <div class="loan-card">


            <div class="loan-header">

                <div class="loan-number">

                    Loan:
                    ${escapeHtml(
                        loanId
                    )}

                </div>


                <span
                    class="
                        loan-status
                        ${
                            closedLoan
                                ? "closed"
                                : ""
                        }
                    "
                >

                    ${escapeHtml(
                        status
                    )}

                </span>

            </div>


            <div class="loan-action-row">

                ${
                    closedLoan

                        ? ""

                        : `

                            <button

                                type="button"

                                class="collect-btn"

                                data-loan-id="${escapeHtml(
                                    loan.id
                                )}"

                            >

                                Collect Payment

                            </button>

                        `
                }

            </div>


            <div class="loan-summary">


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Loan Amount

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            loanAmount
                        )}

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Principal

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            principal
                        )}

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Interest

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            interest
                        )}

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Total Payable

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            totalPayable
                        )}

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Paid

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            paid
                        )}

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Pending

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            pending
                        )}

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        Tenure

                    </div>

                    <div class="loan-stat-value">

                        ${
                            tenure ||
                            "-"
                        }

                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">

                        EMI

                    </div>

                    <div class="loan-stat-value">

                        ${formatCurrency(
                            emi
                        )}

                    </div>

                </div>


            </div>


            <div class="schedule-section">


                <div class="schedule-title">

                    Collection History

                </div>


                <div class="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>
                                    Receipt
                                </th>

                                <th>
                                    Collection Date
                                </th>

                                <th>
                                    Amount
                                </th>

                                <th>
                                    Mode
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                collectionHistory.length

                                    ? collectionHistory

                                        .map(
                                            (
                                                item,
                                                index
                                            ) =>

                                                renderCollectionRow(

                                                    item,

                                                    index + 1,

                                                    loan.id

                                                )
                                        )

                                        .join("")

                                    : `

                                        <tr>

                                            <td
                                                colspan="7"
                                                style="
                                                    text-align:center;
                                                    color:#64748b;
                                                    padding:25px;
                                                "
                                            >

                                                No collection records found.

                                            </td>

                                        </tr>

                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>


        </div>

    `;
}


// ============================================================
// GET LOAN COLLECTIONS
// ============================================================
//
// FINALIZED MASTER:
// collections
//
// Match by:
// loanDocumentId
// loanId
// loanNumber
// loanCode
//
// ============================================================

function getLoanCollections(
    loan
) {

    const loanDocumentId =
        String(
            loan.id ||
            ""
        );


    const loanBusinessId =
        getLoanId(
            loan
        );


    return allCollections

        .filter(
            item => {

                const itemLoanDocumentId =
                    String(
                        firstValue(

                            item,

                            [
                                "loanDocumentId"
                            ],

                            ""

                        )
                    );


                const itemLoanId =
                    String(
                        firstValue(

                            item,

                            [
                                "loanId",
                                "loanNumber",
                                "loanCode"

                            ],

                            ""

                        )
                    );


                return (

                    itemLoanDocumentId ===
                    loanDocumentId

                ) || (

                    itemLoanDocumentId ===
                    loanBusinessId

                ) || (

                    itemLoanId ===
                    loanBusinessId

                ) || (

                    itemLoanId ===
                    loanDocumentId

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
                                "collectionDate",
                                "paidDate",
                                "date",
                                "createdAt"

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
                                "collectionDate",
                                "paidDate",
                                "date",
                                "createdAt"

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
}


// ============================================================
// RENDER COLLECTION ROW
// ============================================================

function renderCollectionRow(
    item,
    index,
    loanDocumentId
) {

    const receiptNo =
        firstValue(

            item,

            [
                "receiptNo",
                "receiptNumber"
            ],

            "-"

        );


    const collectionDate =
        firstValue(

            item,

            [
                "paymentDate",
                "collectionDate",
                "paidDate",
                "date",
                "createdAt"

            ],

            ""

        );


    const amount =
        numberValue(

            item.amount,

            item.paidAmount,

            item.amountReceived,

            item.emiPaid,

            item.collectionAmount

        );


    const paymentMode =
        firstValue(

            item,

            [
                "paymentMode",
                "mode"
            ],

            "-"

        );


    const status =
        String(

            item.status ||
            "Success"

        );


    return `

        <tr>


            <td>

                ${index}

            </td>


            <td>

                ${escapeHtml(
                    receiptNo
                )}

            </td>


            <td>

                ${formatDate(
                    collectionDate
                )}

            </td>


            <td>

                ${formatCurrency(
                    amount
                )}

            </td>


            <td>

                ${escapeHtml(
                    paymentMode
                )}

            </td>


            <td>

                <span
                    class="status paid"
                >

                    ${escapeHtml(
                        status
                    )}

                </span>

            </td>


            <td>

                <button

                    type="button"

                    class="payment-collect-btn"

                    data-loan-id="${escapeHtml(
                        loanDocumentId
                    )}"

                >

                    Collect

                </button>

            </td>


        </tr>

    `;
}


// ============================================================
// SEARCH CUSTOMERS
// ============================================================

function searchCustomers() {

    const value =
        String(

            searchInput?.value ||
            ""

        )
            .trim()
            .toLowerCase();


    if (!value) {

        selectedCustomerId =
            "";


        renderCustomerList(
            assignedCustomers
        );


        return;
    }


    const filtered =
        assignedCustomers.filter(

            customer => {

                const customerId =
                    getCustomerId(
                        customer
                    )
                        .toLowerCase();


                const name =
                    getCustomerName(
                        customer
                    )
                        .toLowerCase();


                const mobile =
                    getCustomerMobile(
                        customer
                    )
                        .toLowerCase();


                const loanMatch =
                    assignedLoans.some(

                        loan => {

                            const sameCustomer =

                                getLoanCustomerId(
                                    loan
                                ) ===
                                getCustomerId(
                                    customer
                                );


                            if (
                                !sameCustomer
                            ) {

                                return false;
                            }


                            return getLoanId(
                                loan
                            )
                                .toLowerCase()
                                .includes(
                                    value
                                );

                        }

                    );


                return (

                    name.includes(
                        value
                    ) ||

                    customerId.includes(
                        value
                    ) ||

                    mobile.includes(
                        value
                    ) ||

                    loanMatch

                );

            }

        );


    selectedCustomerId =
        "";


    renderCustomerList(
        filtered
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
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
// BACK TO STAFF DASHBOARD
// ============================================================

if (backBtn) {

    backBtn.addEventListener(
        "click",
        () => {

            window.location.replace(
                STAFF_DASHBOARD_PAGE
            );

        }
    );
}


// ============================================================
// LOGOUT
// ============================================================

async function logoutStaff() {

    if (logoutStarted) {
        return;
    }


    const confirmed =
        confirm(
            "Logout from Staff Portal?"
        );


    if (!confirmed) {
        return;
    }


    logoutStarted =
        true;


    if (logoutBtn) {

        logoutBtn.disabled =
            true;

        logoutBtn.textContent =
            "Logging out...";
    }


    try {

        await signOut(
            auth
        );


    } catch (error) {

        console.error(
            "Staff logout error:",
            error
        );


    } finally {

        clearStaffSession();


        /*
         * IMPORTANT:
         *
         * Staff logout goes to COMMON LOGIN.
         *
         * It must NOT go to Owner dashboard.
         */

        window.location.replace(
            COMMON_LOGIN_PAGE
        );

    }
}


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logoutStaff
    );
}


// ============================================================
// SEARCH BUTTON
// ============================================================

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        searchCustomers
    );
}


// ============================================================
// SEARCH ENTER
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchCustomers();

            }

        }
    );
}


// ============================================================
// LIVE SEARCH
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            const value =
                String(
                    searchInput.value ||
                    ""
                ).trim();


            if (!value) {

                selectedCustomerId =
                    "";


                renderCustomerList(
                    assignedCustomers
                );

            }

        }
    );
}


// ============================================================
// CLEAR SEARCH
// ============================================================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        () => {

            if (searchInput) {

                searchInput.value =
                    "";

            }


            selectedCustomerId =
                "";


            renderCustomerList(
                assignedCustomers
            );

        }
    );
}


// ============================================================
// HISTORY / BACK PROTECTION
// ============================================================

function protectHistory() {

    try {

        window.history.replaceState(

            {
                staffCustomers: true
            },

            "",

            window.location.href

        );


        window.history.pushState(

            {
                staffCustomers: true
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
                            "History signout failed:",
                            error
                        );

                    }


                    window.location.replace(
                        COMMON_LOGIN_PAGE
                    );


                    return;
                }


                /*
                 * Staff is still authenticated.
                 *
                 * Keep this page inside Staff portal.
                 */

                window.history.pushState(

                    {
                        staffCustomers: true
                    },

                    "",

                    window.location.href

                );

            }
        );


    } catch (error) {

        console.warn(
            "History protection error:",
            error
        );
    }
}


// ============================================================
// PAGE CACHE PROTECTION
// ============================================================

window.addEventListener(
    "pageshow",
    async event => {

        if (
            !event.persisted
        ) {

            return;
        }


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

        }

    }
);


// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (
            pageInitialized
        ) {

            return;
        }


        const session =
            getStaffSession();


        // ====================================================
        // NO STAFF SESSION
        // ====================================================

        if (
            !session ||
            session.role !==
            "staff"
        ) {

            window.location.replace(
                STAFF_LOGIN_PAGE
            );

            return;
        }


        // ====================================================
        // NO FIREBASE USER
        // ====================================================

        if (!user) {

            clearStaffSession();


            window.location.replace(
                STAFF_LOGIN_PAGE
            );

            return;
        }


        try {

            // ==================================================
            // FINAL STAFF VALIDATION
            // ==================================================

            await validateStaff(
                user,
                session
            );


            pageInitialized =
                true;


            // ==================================================
            // LOAD DATA
            // ==================================================

            await loadData();


        } catch (error) {

            console.error(
                "Staff customer authorization error:",
                error
            );


            clearStaffSession();


            try {

                await signOut(
                    auth
                );

            } catch (signOutError) {

                console.warn(
                    "Signout failed:",
                    signOutError
                );

            }


            window.location.replace(
                STAFF_LOGIN_PAGE
            );

        }

    }
);


// ============================================================
// INITIAL HISTORY PROTECTION
// ============================================================

protectHistory();


// ============================================================
// INITIAL LOG
// ============================================================

console.log(
    "SR Auto Finance - Staff Customers initialized."
);
