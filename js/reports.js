// =====================================================
// SR AUTO FINANCE ERP
// Reports Controller
// File: js/reports.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const totalCustomersElement =
    document.getElementById("totalCustomers");

const activeLoansElement =
    document.getElementById("activeLoans");

const totalCollectedElement =
    document.getElementById("totalCollected");

const outstandingElement =
    document.getElementById("outstanding");


// =====================================================
// FORMAT CURRENCY
// =====================================================

function formatCurrency(value) {

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
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "customers"
                )
            );


        if (totalCustomersElement) {

            totalCustomersElement.textContent =
                snapshot.size;

        }


        return snapshot.size;


    } catch (error) {

        console.error(
            "Customer report error:",
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
// LOAN OUTSTANDING
// =====================================================

function getOutstanding(loan) {

    const storedOutstanding =

        loan.outstandingAmount ??

        loan.balanceAmount ??

        loan.pendingAmount ??

        loan.remainingAmount;


    if (
        storedOutstanding !== undefined &&
        storedOutstanding !== null
    ) {

        return Math.max(
            Number(
                storedOutstanding
            ) || 0,
            0
        );

    }


    const total =

        Number(
            loan.totalPayable ??
            loan.totalAmount ??
            0
        );


    const paid =

        Number(
            loan.amountPaid ??
            loan.paidAmount ??
            0
        );


    return Math.max(
        total - paid,
        0
    );

}


// =====================================================
// LOAD LOANS
// =====================================================

async function loadLoans() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
            );


        let activeLoans =
            0;


        let totalOutstanding =
            0;


        snapshot.forEach(
            loanDoc => {

                const loan =
                    loanDoc.data();


                const status =
                    String(
                        loan.status ||
                        "Active"
                    ).toLowerCase();


                const outstanding =
                    getOutstanding(
                        loan
                    );


                const closed =

                    status === "closed" ||

                    status === "cancelled" ||

                    status === "canceled" ||

                    status === "completed";


                if (
                    !closed &&
                    outstanding > 0
                ) {

                    activeLoans++;

                }


                if (
                    outstanding > 0
                ) {

                    totalOutstanding +=
                        outstanding;

                }

            }
        );


        if (activeLoansElement) {

            activeLoansElement.textContent =
                activeLoans;

        }


        if (outstandingElement) {

            outstandingElement.textContent =
                formatCurrency(
                    totalOutstanding
                );

        }


        return {

            activeLoans,

            totalOutstanding

        };


    } catch (error) {

        console.error(
            "Loan report error:",
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


        return {

            activeLoans: 0,

            totalOutstanding: 0

        };

    }

}


// =====================================================
// LOAD COLLECTIONS
// =====================================================

async function loadCollections() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        let totalCollected =
            0;


        snapshot.forEach(
            collectionDoc => {

                const payment =
                    collectionDoc.data();


                const status =
                    String(
                        payment.status ||
                        "Success"
                    ).toLowerCase();


                if (

                    status === "cancelled" ||

                    status === "canceled" ||

                    status === "reversed"

                ) {

                    return;

                }


                const amount =

                    Number(

                        payment.amount ??

                        payment.paidAmount ??

                        payment.paymentAmount ??

                        0

                    );


                totalCollected +=
                    amount;

            }
        );


        if (
            totalCollectedElement
        ) {

            totalCollectedElement.textContent =
                formatCurrency(
                    totalCollected
                );

        }


        return totalCollected;


    } catch (error) {

        console.error(
            "Collection report error:",
            error
        );


        if (
            totalCollectedElement
        ) {

            totalCollectedElement.textContent =
                formatCurrency(0);

        }


        return 0;

    }

}


// =====================================================
// REPORT NAVIGATION
// =====================================================

window.openReport =
    function(type) {
if (type === "collection") {
    window.location.href = "collection-report.html";
    return;
}
        switch (type) {

            case "collection":

                window.location.href =
                    "collections.html";

                break;


            case "loan":

                window.location.href =
                    "loans.html";

                break;


            case "customer":

                window.location.href =
                    "customers.html";

                break;


            case "outstanding":

                window.location.href =
                    "loans.html?filter=outstanding";

                break;


            case "due":

                window.location.href =
                    "dues.html";

                break;


            case "summary":

                window.location.href =
                    "dashboard.html";

                break;


            default:

                console.warn(
                    "Unknown report type:",
                    type
                );

        }

    };


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


        await Promise.all([

            loadCustomers(),

            loadLoans(),

            loadCollections()

        ]);

    }
);
