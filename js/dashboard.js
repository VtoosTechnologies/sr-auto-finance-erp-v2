// =====================================================
// SR AUTO FINANCE ERP
// Dashboard Controller
// File: js/dashboard.js
// =====================================================

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


// =====================================================
// ELEMENTS
// =====================================================

const userNameElement =
    document.getElementById("userName");

const userRoleElement =
    document.getElementById("userRole");

const companyNameElement =
    document.getElementById("companyName");

const welcomeTextElement =
    document.getElementById("welcomeText");

const companyInfoElement =
    document.getElementById("companyInfo");

const totalCustomersElement =
    document.getElementById("totalCustomers");

const activeLoansElement =
    document.getElementById("activeLoans");

const todayCollectionElement =
    document.getElementById("todayCollection");

const outstandingElement =
    document.getElementById("outstanding");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================================
// OPTIONAL NEW DASHBOARD ELEMENTS
// =====================================================
// Existing dashboard-la indha IDs irundha,
// automatic-aa live data show aagum.
// IDs illana existing dashboard break aagathu.
// =====================================================

const totalLoansElement =
    document.getElementById("totalLoans");

const totalCollectedElement =
    document.getElementById("totalCollected");

const todayDueElement =
    document.getElementById("todayDue");

const overdueDueElement =
    document.getElementById("overdueDue");

const totalDueAccountsElement =
    document.getElementById("totalDueAccounts");

const upcomingDueElement =
    document.getElementById("upcomingDue");

const activeCustomersElement =
    document.getElementById("activeCustomers");


// =====================================================
// FORMAT CURRENCY
// =====================================================

function formatCurrency(amount) {

    const value =
        Number(amount) || 0;

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(value);

}


// =====================================================
// FORMAT NUMBER
// =====================================================

function formatNumber(value) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        Number(value) || 0
    );

}


// =====================================================
// GET TODAY DATE
// =====================================================

function getTodayDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// =====================================================
// GET DATE OBJECT
// =====================================================

function getDateObject(value) {

    if (!value) {
        return null;
    }

    try {

        if (
            value &&
            typeof value.toDate === "function"
        ) {

            return value.toDate();

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

    } catch (error) {

        return null;

    }

}


// =====================================================
// DATE KEY
// =====================================================

function getDateKey(value) {

    const date =
        getDateObject(value);

    if (!date) {
        return "";
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// =====================================================
// IS TODAY
// =====================================================

function isToday(value) {

    return (
        getDateKey(value) ===
        getTodayDate()
    );

}


// =====================================================
// IS THIS MONTH
// =====================================================

function isThisMonth(value) {

    const date =
        getDateObject(value);

    if (!date) {
        return false;
    }

    const today =
        new Date();

    return (

        date.getFullYear() ===
        today.getFullYear()

        &&

        date.getMonth() ===
        today.getMonth()

    );

}


// =====================================================
// START OF TODAY
// =====================================================

function getTodayStart() {

    const today =
        new Date();

    return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

}


// =====================================================
// LOAD USER PROFILE
// =====================================================

async function loadUserProfile(user) {

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            console.error(
                "User profile not found."
            );

            await signOut(auth);

            window.location.href =
                "login.html";

            return null;

        }


        const userData =
            userSnap.data();


        // ---------------------------------------------
        // Account validation
        // ---------------------------------------------

        const active =
            userData.active === true;

        const status =
            String(
                userData.status || ""
            ).toLowerCase();


        if (
            !active ||
            status !== "active"
        ) {

            await signOut(auth);

            window.location.href =
                "login.html";

            return null;

        }


        // ---------------------------------------------
        // Display user
        // ---------------------------------------------

        const name =
            userData.name ||
            userData.username ||
            "User";


        const role =
            userData.role ||
            "Staff";


        if (userNameElement) {

            userNameElement.textContent =
                name;

        }


        if (userRoleElement) {

            userRoleElement.textContent =
                role;

        }


        if (welcomeTextElement) {

            welcomeTextElement.textContent =
                `Welcome back, ${name}. Here's your business overview.`;

        }


        return userData;


    } catch (error) {

        console.error(
            "User profile error:",
            error
        );

        return null;

    }

}


// =====================================================
// LOAD COMPANY SETTINGS
// =====================================================

async function loadCompanySettings() {

    try {

        const companyRef =
            doc(
                db,
                "settings",
                "company"
            );


        const companySnap =
            await getDoc(companyRef);


        if (!companySnap.exists()) {

            if (companyInfoElement) {

                companyInfoElement.innerHTML = `
                    <div class="empty-icon">
                        🏢
                    </div>

                    <p>
                        Company information not configured.
                    </p>
                `;

            }

            return;

        }


        const company =
            companySnap.data();


        const companyName =
            company.companyName ||
            company.brandName ||
            "SR Auto Finance";


        const ownerName =
            company.ownerName ||
            "";


        const mobile =
            company.mobile ||
            "";


        const address =
            company.address ||
            "";


        // ---------------------------------------------
        // Header company name
        // ---------------------------------------------

        if (companyNameElement) {

            companyNameElement.textContent =
                companyName;

        }


        // ---------------------------------------------
        // Company information panel
        // ---------------------------------------------

        if (companyInfoElement) {

            companyInfoElement.innerHTML = `

                <div style="
                    text-align:left;
                    color:#334155;
                    line-height:1.8;
                    font-size:12px;
                ">

                    <strong style="
                        font-size:14px;
                        color:#0f172a;
                    ">
                        ${companyName}
                    </strong>

                    ${
                        ownerName
                            ? `
                                <div>
                                    Owner:
                                    ${ownerName}
                                </div>
                              `
                            : ""
                    }

                    ${
                        mobile
                            ? `
                                <div>
                                    Mobile:
                                    ${mobile}
                                </div>
                              `
                            : ""
                    }

                    ${
                        address
                            ? `
                                <div>
                                    ${address}
                                </div>
                              `
                            : ""
                    }

                </div>

            `;

        }


    } catch (error) {

        console.error(
            "Company settings error:",
            error
        );


        if (companyInfoElement) {

            companyInfoElement.innerHTML = `

                <div class="empty-icon">
                    ⚠️
                </div>

                <p>
                    Unable to load company information.
                </p>

            `;

        }

    }

}


// =====================================================
// LOAD CUSTOMER DATA
// =====================================================

async function loadCustomerData() {

    try {

        const customersRef =
            collection(
                db,
                "customers"
            );


        const snapshot =
            await getDocs(
                customersRef
            );


        const totalCustomers =
            snapshot.size;


        if (totalCustomersElement) {

            totalCustomersElement.textContent =
                formatNumber(
                    totalCustomers
                );

        }


        if (activeCustomersElement) {

            let activeCustomers =
                0;


            snapshot.forEach(
                customerDoc => {

                    const customer =
                        customerDoc.data();


                    const status =
                        String(
                            customer.status ||
                            "active"
                        ).toLowerCase();


                    if (
                        status === "active"
                    ) {

                        activeCustomers++;

                    }

                }
            );


            activeCustomersElement.textContent =
                formatNumber(
                    activeCustomers
                );

        }


        return totalCustomers;


    } catch (error) {

        console.error(
            "Customer data error:",
            error
        );


        if (totalCustomersElement) {

            totalCustomersElement.textContent =
                "0";

        }


        return 0;

    }

}


// =====================================================
// GET LOAN TOTAL PAYABLE
// =====================================================

function getLoanTotalPayable(loan) {

    const storedTotal =
        loan.totalPayable ??
        loan.totalAmount;


    if (
        storedTotal !== undefined &&
        storedTotal !== null
    ) {

        return Math.max(
            Number(storedTotal) || 0,
            0
        );

    }


    const principal =
        Number(
            loan.loanAmount ??
            loan.principalAmount ??
            loan.amount ??
            0
        );


    const interest =
        Number(
            loan.interestAmount ??
            0
        );


    return Math.max(
        principal + interest,
        0
    );

}


// =====================================================
// GET LOAN PAID
// =====================================================

function getLoanPaid(loan) {

    return Number(

        loan.amountPaid ??

        loan.paidAmount ??

        0

    );

}


// =====================================================
// GET LOAN OUTSTANDING
// =====================================================

function getLoanOutstanding(loan) {

    const storedBalance =

        loan.outstandingAmount ??

        loan.balanceAmount ??

        loan.pendingAmount ??

        loan.remainingAmount;


    if (
        storedBalance !== undefined &&
        storedBalance !== null
    ) {

        return Math.max(
            Number(
                storedBalance
            ) || 0,
            0
        );

    }


    const total =
        getLoanTotalPayable(
            loan
        );


    const paid =
        getLoanPaid(
            loan
        );


    return Math.max(
        total - paid,
        0
    );

}


// =====================================================
// GET INSTALLMENT
// =====================================================

function getInstallmentAmount(loan) {

    const installment =
        Number(

            loan.installmentAmount ??

            loan.emiAmount ??

            loan.monthlyInstallment ??

            loan.weeklyInstallment ??

            loan.dailyInstallment ??

            0

        );


    return installment;

}


// =====================================================
// GET DUE DATE
// =====================================================

function getLoanDueDate(loan) {

    return (

        loan.nextDueDate ||

        loan.dueDate ||

        loan.nextPaymentDate ||

        loan.firstDueDate

    );

}


// =====================================================
// LOAD LOAN DATA
// =====================================================

async function loadLoanData() {

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


        let totalLoans =
            snapshot.size;


        let activeLoans =
            0;


        let outstanding =
            0;


        let todayDue =
            0;


        let overdueDue =
            0;


        let upcomingDue =
            0;


        let totalDueAccounts =
            0;


        const today =
            getTodayStart();


        snapshot.forEach(
            loanDoc => {

                const loan =
                    loanDoc.data();


                const status =
                    String(
                        loan.status ||
                        ""
                    ).toLowerCase();


                const balance =
                    getLoanOutstanding(
                        loan
                    );


                // -----------------------------------------
                // Active loan
                // -----------------------------------------

                const isActive =

                    status === "active" ||

                    status === "running" ||

                    status === "open";


                if (
                    isActive &&
                    balance > 0
                ) {

                    activeLoans++;

                }


                // -----------------------------------------
                // Outstanding
                // -----------------------------------------

                if (
                    balance > 0
                ) {

                    outstanding +=
                        balance;

                }


                // -----------------------------------------
                // Ignore closed loans for dues
                // -----------------------------------------

                if (

                    !isActive ||

                    balance <= 0

                ) {

                    return;

                }


                // -----------------------------------------
                // Due date
                // -----------------------------------------

                const dueDateValue =
                    getLoanDueDate(
                        loan
                    );


                const dueDate =
                    getDateObject(
                        dueDateValue
                    );


                if (!dueDate) {

                    return;

                }


                const dueOnly =
                    new Date(
                        dueDate.getFullYear(),
                        dueDate.getMonth(),
                        dueDate.getDate()
                    );


                let dueAmount =
                    getInstallmentAmount(
                        loan
                    );


                /*
                 * If installment amount is not
                 * stored, use outstanding as fallback.
                 */

                if (
                    dueAmount <= 0
                ) {

                    dueAmount =
                        balance;

                }


                /*
                 * Due cannot exceed outstanding.
                 */

                dueAmount =
                    Math.min(
                        dueAmount,
                        balance
                    );


                // -----------------------------------------
                // Today
                // -----------------------------------------

                if (
                    dueOnly.getTime() ===
                    today.getTime()
                ) {

                    todayDue +=
                        dueAmount;

                    totalDueAccounts++;

                }


                // -----------------------------------------
                // Overdue
                // -----------------------------------------

                else if (
                    dueOnly < today
                ) {

                    overdueDue +=
                        dueAmount;

                    totalDueAccounts++;

                }


                // -----------------------------------------
                // Upcoming
                // -----------------------------------------

                else {

                    upcomingDue +=
                        dueAmount;

                    totalDueAccounts++;

                }

            }
        );


        // ---------------------------------------------
        // Existing dashboard cards
        // ---------------------------------------------

        if (activeLoansElement) {

            activeLoansElement.textContent =
                formatNumber(
                    activeLoans
                );

        }


        if (outstandingElement) {

            outstandingElement.textContent =
                formatCurrency(
                    outstanding
                );

        }


        // ---------------------------------------------
        // Optional dashboard cards
        // ---------------------------------------------

        if (totalLoansElement) {

            totalLoansElement.textContent =
                formatNumber(
                    totalLoans
                );

        }


        if (todayDueElement) {

            todayDueElement.textContent =
                formatCurrency(
                    todayDue
                );

        }


        if (overdueDueElement) {

            overdueDueElement.textContent =
                formatCurrency(
                    overdueDue
                );

        }


        if (upcomingDueElement) {

            upcomingDueElement.textContent =
                formatCurrency(
                    upcomingDue
                );

        }


        if (totalDueAccountsElement) {

            totalDueAccountsElement.textContent =
                formatNumber(
                    totalDueAccounts
                );

        }


        return {

            totalLoans,

            activeLoans,

            outstanding,

            todayDue,

            overdueDue,

            upcomingDue,

            totalDueAccounts

        };


    } catch (error) {

        console.error(
            "Loan data error:",
            error
        );


        if (activeLoansElement) {

            activeLoansElement.textContent =
                "0";

        }


        if (outstandingElement) {

            outstandingElement.textContent =
                formatCurrency(0);

        }


        return null;

    }

}


// =====================================================
// GET COLLECTION AMOUNT
// =====================================================

function getCollectionAmount(data) {

    return Number(

        data.amount ??

        data.paidAmount ??

        data.collectionAmount ??

        data.paymentAmount ??

        0

    );

}


// =====================================================
// GET COLLECTION DATE
// =====================================================

function getCollectionDate(data) {

    return (

        data.paymentDate ||

        data.collectionDate ||

        data.date ||

        data.createdAt

    );

}


// =====================================================
// CHECK VALID COLLECTION
// =====================================================

function isValidCollection(data) {

    const status =
        String(
            data.status ||
            "Success"
        ).toLowerCase();


    return (

        status !== "cancelled" &&

        status !== "canceled" &&

        status !== "reversed"

    );

}


// =====================================================
// LOAD COLLECTION DATA
// =====================================================

async function loadCollectionData() {

    try {

        const collectionsRef =
            collection(
                db,
                "collections"
            );


        const snapshot =
            await getDocs(
                collectionsRef
            );


        let totalCollected =
            0;


        let todayCollected =
            0;


        let monthCollected =
            0;


        snapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                if (
                    !isValidCollection(
                        data
                    )
                ) {

                    return;

                }


                const amount =
                    getCollectionAmount(
                        data
                    );


                const collectionDate =
                    getCollectionDate(
                        data
                    );


                totalCollected +=
                    amount;


                if (
                    isToday(
                        collectionDate
                    )
                ) {

                    todayCollected +=
                        amount;

                }


                if (
                    isThisMonth(
                        collectionDate
                    )
                ) {

                    monthCollected +=
                        amount;

                }

            }
        );


        // ---------------------------------------------
        // Existing dashboard card
        // ---------------------------------------------

        if (
            todayCollectionElement
        ) {

            todayCollectionElement.textContent =
                formatCurrency(
                    todayCollected
                );

        }


        // ---------------------------------------------
        // Optional dashboard cards
        // ---------------------------------------------

        if (
            totalCollectedElement
        ) {

            totalCollectedElement.textContent =
                formatCurrency(
                    totalCollected
                );

        }


        return {

            totalCollected,

            todayCollected,

            monthCollected

        };


    } catch (error) {

        console.error(
            "Collection data error:",
            error
        );


        if (
            todayCollectionElement
        ) {

            todayCollectionElement.textContent =
                formatCurrency(0);

        }


        return null;

    }

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function() {

            try {

                logoutBtn.disabled =
                    true;

                logoutBtn.textContent =
                    "Logging out...";


                sessionStorage.clear();


                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                logoutBtn.disabled =
                    false;

                logoutBtn.textContent =
                    "Logout";

            }

        }
    );

}


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
    auth,
    async function(user) {

        // ---------------------------------------------
        // Not logged in
        // ---------------------------------------------

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        // ---------------------------------------------
        // Load user
        // ---------------------------------------------

        const userData =
            await loadUserProfile(
                user
            );


        if (!userData) {

            return;

        }


        // ---------------------------------------------
        // Load dashboard data
        // ---------------------------------------------

        await Promise.all([

            loadCompanySettings(),

            loadCustomerData(),

            loadLoanData(),

            loadCollectionData()

        ]);

    }
);
