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
// FORMAT CURRENCY
// =====================================================

function formatCurrency(amount) {

    const value = Number(amount) || 0;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(value);
}


// =====================================================
// FORMAT NUMBER
// =====================================================

function formatNumber(value) {

    return new Intl.NumberFormat("en-IN")
        .format(Number(value) || 0);

}


// =====================================================
// TODAY DATE
// =====================================================

function getTodayDate() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =====================================================
// LOAD USER PROFILE
// =====================================================

async function loadUserProfile(user) {

    try {

        const userRef =
            doc(db, "users", user.uid);

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
            String(userData.status || "")
                .toLowerCase();


        if (!active || status !== "active") {

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


        userNameElement.textContent =
            name;


        userRoleElement.textContent =
            role;


        welcomeTextElement.textContent =
            `Welcome back, ${name}. Here's your business overview.`;


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

            companyInfoElement.innerHTML = `
                <div class="empty-icon">🏢</div>
                <p>Company information not configured.</p>
            `;

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


        // Header company name

        companyNameElement.textContent =
            companyName;


        // Company panel

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
                        ? `<div>Owner: ${ownerName}</div>`
                        : ""
                }

                ${
                    mobile
                        ? `<div>Mobile: ${mobile}</div>`
                        : ""
                }

                ${
                    address
                        ? `<div>${address}</div>`
                        : ""
                }

            </div>
        `;


    } catch (error) {

        console.error(
            "Company settings error:",
            error
        );

        companyInfoElement.innerHTML = `
            <div class="empty-icon">⚠️</div>
            <p>Unable to load company information.</p>
        `;
    }
}


// =====================================================
// LOAD CUSTOMER COUNT
// =====================================================

async function loadCustomerCount() {

    try {

        const customersRef =
            collection(
                db,
                "customers"
            );

        const snapshot =
            await getDocs(customersRef);


        totalCustomersElement.textContent =
            formatNumber(snapshot.size);


    } catch (error) {

        console.error(
            "Customer count error:",
            error
        );

        totalCustomersElement.textContent =
            "0";
    }
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
            await getDocs(loansRef);


        let activeLoans = 0;

        let outstanding = 0;


        snapshot.forEach((loanDoc) => {

            const loan =
                loanDoc.data();


            const status =
                String(
                    loan.status || ""
                ).toLowerCase();


            // -----------------------------------------
            // Active loan
            // -----------------------------------------

            if (
                status === "active" ||
                status === "running" ||
                status === "open"
            ) {

                activeLoans++;

            }


            // -----------------------------------------
            // Outstanding amount
            // -----------------------------------------

            const balance =
                Number(
                    loan.balanceAmount ??
                    loan.outstandingAmount ??
                    loan.pendingAmount ??
                    0
                );


            if (balance > 0) {

                outstanding += balance;

            }

        });


        activeLoansElement.textContent =
            formatNumber(activeLoans);


        outstandingElement.textContent =
            formatCurrency(outstanding);


    } catch (error) {

        console.error(
            "Loan data error:",
            error
        );

        activeLoansElement.textContent =
            "0";

        outstandingElement.textContent =
            formatCurrency(0);
    }
}


// =====================================================
// LOAD TODAY COLLECTION
// =====================================================

async function loadTodayCollection() {

    try {

        const collectionsRef =
            collection(
                db,
                "collections"
            );

        const snapshot =
            await getDocs(collectionsRef);


        const today =
            getTodayDate();


        let total =
            0;


        snapshot.forEach((collectionDoc) => {

            const data =
                collectionDoc.data();


            // -----------------------------------------
            // Possible date fields
            // -----------------------------------------

            let collectionDate =
                data.date ||
                data.collectionDate ||
                data.paymentDate ||
                "";


            // -----------------------------------------
            // Timestamp support
            // -----------------------------------------

            if (
                collectionDate &&
                typeof collectionDate.toDate ===
                "function"
            ) {

                collectionDate =
                    collectionDate.toDate()
                        .toISOString()
                        .split("T")[0];
            }


            // -----------------------------------------
            // Compare date
            // -----------------------------------------

            if (
                String(collectionDate)
                    .substring(0, 10) === today
            ) {

                total += Number(
                    data.amount ||
                    data.paidAmount ||
                    data.collectionAmount ||
                    0
                );

            }

        });


        todayCollectionElement.textContent =
            formatCurrency(total);


    } catch (error) {

        console.error(
            "Collection data error:",
            error
        );

        todayCollectionElement.textContent =
            formatCurrency(0);
    }
}


// =====================================================
// LOGOUT
// =====================================================

logoutBtn.addEventListener(
    "click",
    async function () {

        try {

            logoutBtn.disabled = true;

            logoutBtn.textContent =
                "Logging out...";


            sessionStorage.clear();

            await signOut(auth);


            window.location.href =
                "login.html";


        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

            logoutBtn.disabled = false;

            logoutBtn.textContent =
                "Logout";
        }

    }
);


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
    auth,
    async function (user) {

        // ---------------------------------------------
        // Not logged in
        // ---------------------------------------------

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        // ---------------------------------------------
        // Load dashboard
        // ---------------------------------------------

        const userData =
            await loadUserProfile(user);


        if (!userData) {
            return;
        }


        await Promise.all([

            loadCompanySettings(),

            loadCustomerCount(),

            loadLoanData(),

            loadTodayCollection()

        ]);

    }
);
