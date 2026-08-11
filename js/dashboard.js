// ============================================================
// SR AUTO FINANCE
// DASHBOARD.JS
// ============================================================

// Firebase imports
import {
    db
} from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


// ============================================================
// ELEMENTS
// ============================================================

const totalCustomersElement =
    document.getElementById(
        "totalCustomers"
    );

const activeLoansElement =
    document.getElementById(
        "activeLoans"
    );

const outstandingElement =
    document.getElementById(
        "outstanding"
    );

const todayCollectionElement =
    document.getElementById(
        "todayCollection"
    );

const companyNameElement =
    document.getElementById(
        "companyName"
    );

const companyInfoElement =
    document.getElementById(
        "companyInfo"
    );


// ============================================================
// FORMAT CURRENCY
// ============================================================

function formatCurrency(
    value
) {

    const amount =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(amount);

}


// ============================================================
// NORMALIZE NUMBER
// ============================================================

function toNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


// ============================================================
// GET LOAN PRINCIPAL / DISBURSED AMOUNT
// ============================================================

function getLoanAmount(
    loan
) {

    return toNumber(

        loan.loanAmount ??
        loan.amount ??
        loan.principalAmount ??
        loan.disbursedAmount ??
        0

    );

}


// ============================================================
// GET PAID AMOUNT
// ============================================================

function getPaidAmount(
    loan
) {

    return toNumber(

        loan.amountPaid ??
        loan.paidAmount ??
        0

    );

}


// ============================================================
// GET OUTSTANDING
// ============================================================
//
// IMPORTANT
// ------------------------------------------------------------
// Current outstanding should be taken from the current
// outstanding/balance fields.
//
// Legacy pendingAmount must NOT override a valid
// outstandingAmount/balanceAmount.
//
// If no stored outstanding is available,
// calculate:
//
// Loan Amount - Paid Amount
//
// ============================================================

function getOutstanding(
    loan
) {

    const outstandingValue =
        loan.outstandingAmount ??
        loan.balanceAmount ??
        loan.remainingAmount;

    if (
        outstandingValue !==
            undefined &&
        outstandingValue !==
            null &&
        outstandingValue !== ""
    ) {

        return Math.max(
            toNumber(
                outstandingValue
            ),
            0
        );

    }


    return Math.max(

        getLoanAmount(
            loan
        ) -

        getPaidAmount(
            loan
        ),

        0

    );

}


// ============================================================
// GET STATUS
// ============================================================

function getStatus(
    loan
) {

    return String(
        loan.status ??
        "Active"
    )
        .trim()
        .toLowerCase();

}


// ============================================================
// CHECK CLOSED STATUS
// ============================================================

function isClosedLoan(
    loan
) {

    const status =
        getStatus(
            loan
        );

    return (

        status ===
            "closed" ||

        status ===
            "cancelled" ||

        status ===
            "canceled" ||

        status ===
            "completed"

    );

}


// ============================================================
// DATE KEY
// ============================================================

function getDateKey(
    value
) {

    if (!value) {
        return "";
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
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            )
                .padStart(
                    2,
                    "0"
                );

        const day =
            String(
                date.getDate()
            )
                .padStart(
                    2,
                    "0"
                );


        return `${year}-${month}-${day}`;

    } catch (
        error
    ) {

        return "";

    }

}


// ============================================================
// TODAY KEY
// ============================================================

function getTodayKey() {

    const today =
        new Date();

    return getDateKey(
        today
    );

}


// ============================================================
// LOAD COMPANY SETTINGS
// ============================================================

async function loadCompanySettings() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "settings"
                )
            );


        let company = null;


        snapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                if (
                    data.type ===
                        "company" ||
                    data.settingsType ===
                        "company"
                ) {

                    company =
                        data;

                }

            }
        );


        if (!company) {

            if (
                snapshot.docs.length
            ) {

                company =
                    snapshot.docs[0]
                        .data();

            }

        }


        if (!company) {
            return;
        }


        const companyName =
            company.companyName ||
            company.name ||
            "SR Auto Finance";


        const ownerName =
            company.ownerName ||
            company.owner ||
            "";


        const mobile =
            company.mobile ||
            company.phone ||
            "";


        const address =
            company.address ||
            "";


        if (
            companyNameElement
        ) {

            companyNameElement.textContent =
                companyName;

        }


        if (
            companyInfoElement
        ) {

            companyInfoElement.innerHTML = `

                <div
                    style="
                        text-align:left;
                        line-height:1.8;
                        font-size:12px;
                        color:#334155;
                    "
                >

                    <div
                        style="
                            font-size:14px;
                            font-weight:800;
                            color:#0f172a;
                        "
                    >
                        ${companyName}
                    </div>

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

    } catch (
        error
    ) {

        console.error(
            "Company settings error:",
            error
        );

    }

}


// ============================================================
// LOAD CUSTOMERS
// ============================================================

async function loadCustomers() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "customers"
                )
            );


        if (
            totalCustomersElement
        ) {

            totalCustomersElement.textContent =
                snapshot.size;

        }

    } catch (
        error
    ) {

        console.error(
            "Customer loading error:",
            error
        );


        if (
            totalCustomersElement
        ) {

            totalCustomersElement.textContent =
                "0";

        }

    }

}


// ============================================================
// LOAD LOANS
// ============================================================

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


                const outstanding =
                    getOutstanding(
                        loan
                    );


                if (
                    !isClosedLoan(
                        loan
                    ) &&
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


        if (
            activeLoansElement
        ) {

            activeLoansElement.textContent =
                activeLoans;

        }


        if (
            outstandingElement
        ) {

            outstandingElement.textContent =
                formatCurrency(
                    totalOutstanding
                );

        }

    } catch (
        error
    ) {

        console.error(
            "Loan loading error:",
            error
        );


        if (
            activeLoansElement
        ) {

            activeLoansElement.textContent =
                "0";

        }


        if (
            outstandingElement
        ) {

            outstandingElement.textContent =
                formatCurrency(
                    0
                );

        }

    }

}


// ============================================================
// LOAD TODAY COLLECTION
// ============================================================

async function loadTodayCollection() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        const todayKey =
            getTodayKey();


        let todayAmount =
            0;


        snapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                const status =
                    String(
                        data.status ||
                        "Success"
                    )
                        .trim()
                        .toLowerCase();


                if (
                    status ===
                        "cancelled" ||
                    status ===
                        "canceled" ||
                    status ===
                        "reversed"
                ) {

                    return;

                }


                const paymentDate =
                    data.paymentDate ||
                    data.collectionDate ||
                    data.date ||
                    data.createdAt;


                const paymentKey =
                    getDateKey(
                        paymentDate
                    );


                if (
                    paymentKey !==
                    todayKey
                ) {

                    return;

                }


                const amount =
                    toNumber(

                        data.amount ??
                        data.paidAmount ??
                        data.paymentAmount ??
                        0

                    );


                todayAmount +=
                    amount;

            }
        );


        if (
            todayCollectionElement
        ) {

            todayCollectionElement.textContent =
                formatCurrency(
                    todayAmount
                );

        }

    } catch (
        error
    ) {

        console.error(
            "Today's collection error:",
            error
        );


        if (
            todayCollectionElement
        ) {

            todayCollectionElement.textContent =
                formatCurrency(
                    0
                );

        }

    }

}


// ============================================================
// INITIAL LOAD
// ============================================================

async function loadDashboard() {

    await Promise.all([
        loadCompanySettings(),
        loadCustomers(),
        loadLoans(),
        loadTodayCollection()
    ]);

}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

    }
);
