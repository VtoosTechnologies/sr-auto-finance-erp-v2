// =====================================================
// SR AUTO FINANCE ERP
// DASHBOARD CONTROLLER
//
// File:
// js/dashboard.js
//
// BUSINESS FUND SUMMARY
//
// Total Invested
// Total Disbursed
// Total Collected
// Available Cash
// Outstanding
//
// Powered By:
// VTOOS Software Solutions
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
// CONFIGURATION
// =====================================================

const OWNER_INVESTMENT_COLLECTION =
    "ownerInvestments";


// =====================================================
// ELEMENTS
// =====================================================

const userNameElement =
    document.getElementById(
        "userName"
    );


const userRoleElement =
    document.getElementById(
        "userRole"
    );


const companyNameElement =
    document.getElementById(
        "companyName"
    );


const welcomeTextElement =
    document.getElementById(
        "welcomeText"
    );


const companyInfoElement =
    document.getElementById(
        "companyInfo"
    );


const totalCustomersElement =
    document.getElementById(
        "totalCustomers"
    );


const activeLoansElement =
    document.getElementById(
        "activeLoans"
    );


const todayCollectionElement =
    document.getElementById(
        "todayCollection"
    );


const outstandingElement =
    document.getElementById(
        "outstanding"
    );


const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


// =====================================================
// BUSINESS FUND ELEMENTS
// =====================================================

const totalInvestedElement =
    document.getElementById(
        "totalInvested"
    );


const businessTotalDisbursedElement =
    document.getElementById(
        "businessTotalDisbursed"
    );


const businessTotalCollectionElement =
    document.getElementById(
        "businessTotalCollection"
    );


const businessAvailableFundElement =
    document.getElementById(
        "businessAvailableFund"
    );


const businessOutstandingElement =
    document.getElementById(
        "businessOutstanding"
    );


const positionInvestedElement =
    document.getElementById(
        "positionInvested"
    );


const positionDisbursedElement =
    document.getElementById(
        "positionDisbursed"
    );


const positionCollectionElement =
    document.getElementById(
        "positionCollection"
    );


const positionAvailableElement =
    document.getElementById(
        "positionAvailable"
    );


const refreshFundBtn =
    document.getElementById(
        "refreshFundBtn"
    );


// =====================================================
// HELPER
// FIRST AVAILABLE VALUE
// =====================================================

function firstValue(
    object,
    fields,
    fallback = ""
) {

    if (
        !object
    ) {

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


// =====================================================
// HELPER
// NUMBER VALUE
// =====================================================

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
            Number(
                value
            );


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


// =====================================================
// FORMAT CURRENCY
// =====================================================

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
        numberValue(
            value
        )
    );

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(
    value
) {

    if (
        !value
    ) {

        return "-";

    }


    let date;


    try {

        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else {

            date =
                new Date(
                    value
                );

        }

    } catch {

        return "-";

    }


    if (
        !date ||
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
            month: "short",
            year: "numeric"
        }
    );

}


// =====================================================
// TODAY KEY
// =====================================================

function getTodayKey() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


// =====================================================
// DATE KEY
// =====================================================

function getDateKey(
    value
) {

    if (
        !value
    ) {

        return "";

    }


    let date;


    try {

        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else {

            date =
                new Date(
                    value
                );

        }

    } catch {

        return "";

    }


    if (
        !date ||
        isNaN(
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
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


// =====================================================
// LOAN TOTAL
// =====================================================

function getLoanTotal(
    loan
) {

    if (
        loan.totalPayable !==
        undefined &&
        loan.totalPayable !==
        null
    ) {

        return (
            numberValue(
                loan.totalPayable
            )
        );

    }


    if (
        loan.totalAmount !==
        undefined &&
        loan.totalAmount !==
        null
    ) {

        return (
            numberValue(
                loan.totalAmount
            )
        );

    }


    const principal =
        numberValue(
            loan.loanAmount,
            loan.principalAmount,
            loan.amount
        );


    const interest =
        numberValue(
            loan.interestAmount
        );


    return (
        principal +
        interest
    );

}


// =====================================================
// LOAN PAID
// =====================================================

function getLoanPaid(
    loan
) {

    return numberValue(
        loan.amountPaid,
        loan.paidAmount,
        loan.totalPaid
    );

}


// =====================================================
// GET OUTSTANDING
// =====================================================

function getOutstanding(
    loan
) {

    if (
        loan.outstandingAmount !==
        undefined &&
        loan.outstandingAmount !==
        null
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
        null
    ) {

        return Math.max(
            numberValue(
                loan.balanceAmount
            ),
            0
        );

    }


    return Math.max(
        getLoanTotal(
            loan
        ) -
        getLoanPaid(
            loan
        ),
        0
    );

}


// =====================================================
// GET PAYMENT AMOUNT
// =====================================================

function getPaymentAmount(
    payment
) {

    return numberValue(
        payment.amountReceived,
        payment.totalCollection,
        payment.amountCollected,
        payment.paymentAmount,
        payment.paidAmount,
        payment.emiPaid,
        payment.amount
    );

}


// =====================================================
// GET PAYMENT DATE
// =====================================================

function getPaymentDate(
    payment
) {

    return (
        payment.paymentDate ||
        payment.paidDate ||
        payment.collectionDate ||
        payment.date ||
        payment.createdAt
    );

}


// =====================================================
// INVALID PAYMENT STATUS
// =====================================================

function isInvalidPaymentStatus(
    status
) {

    const value =
        String(
            status ||
            "Success"
        )
            .trim()
            .toLowerCase();


    return [
        "cancelled",
        "canceled",
        "reversed",
        "deleted",
        "rejected"
    ].includes(
        value
    );

}


// =====================================================
// CHECK STAFF PAYMENT
// =====================================================

function isStaffPayment(
    payment
) {

    const staffId =
        firstValue(
            payment,
            [
                "staffId",
                "assignedStaffId",
                "collectorStaffId",
                "collectedByStaffId",
                "staffDocumentId",
                "staffCode",
                "employeeId"
            ],
            ""
        );


    return !!staffId;

}


// =====================================================
// LOAD USER PROFILE
// =====================================================

async function loadUserProfile(
    user
) {

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const userSnap =
            await getDoc(
                userRef
            );


        if (
            !userSnap.exists()
        ) {

            console.error(
                "User profile not found."
            );


            await signOut(
                auth
            );


            window.location.href =
                "login.html";


            return false;

        }


        const userData =
            userSnap.data();


        const active =
            userData.active ===
            true;


        const status =
            String(
                userData.status ||
                ""
            )
                .trim()
                .toLowerCase();


        /*
         * Existing ERP login uses:
         *
         * active = true
         * status = active
         */

        if (
            !active ||
            status !==
            "active"
        ) {

            await signOut(
                auth
            );


            window.location.href =
                "login.html";


            return false;

        }


        const name =
            firstValue(
                userData,
                [
                    "name",
                    "username",
                    "displayName"
                ],
                "User"
            );


        const role =
            firstValue(
                userData,
                [
                    "role",
                    "userRole",
                    "type"
                ],
                "Staff"
            );


        if (
            userNameElement
        ) {

            userNameElement.textContent =
                name;

        }


        if (
            userRoleElement
        ) {

            userRoleElement.textContent =
                role;

        }


        if (
            welcomeTextElement
        ) {

            welcomeTextElement.textContent =
                `Welcome back, ${name}. Here's your business overview.`;

        }


        return true;


    } catch (
        error
    ) {

        console.error(
            "User profile error:",
            error
        );


        return false;

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
            await getDoc(
                companyRef
            );


        if (
            !companySnap.exists()
        ) {

            return;

        }


        const company =
            companySnap.data();


        const companyName =
            firstValue(
                company,
                [
                    "companyName",
                    "brandName",
                    "name"
                ],
                "SR Auto Finance"
            );


        const ownerName =
            firstValue(
                company,
                [
                    "ownerName",
                    "proprietorName"
                ],
                ""
            );


        const mobile =
            firstValue(
                company,
                [
                    "mobile",
                    "phone",
                    "contactNumber"
                ],
                ""
            );


        const address =
            firstValue(
                company,
                [
                    "address",
                    "companyAddress"
                ],
                ""
            );


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
                    )
                        .trim()
                        .toLowerCase();


                const outstanding =
                    getOutstanding(
                        loan
                    );


                const isClosed =
                    [
                        "closed",
                        "cancelled",
                        "canceled",
                        "completed"
                    ].includes(
                        status
                    );


                if (
                    !isClosed &&
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


        if (
            businessOutstandingElement
        ) {

            businessOutstandingElement.textContent =
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


        if (
            businessOutstandingElement
        ) {

            businessOutstandingElement.textContent =
                formatCurrency(
                    0
                );

        }

    }

}


// =====================================================
// CALCULATE CURRENT OUTSTANDING
// =====================================================

async function calculateTotalOutstanding() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
            );


        let total =
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
                    outstanding > 0
                ) {

                    total +=
                        outstanding;

                }

            }
        );


        return total;


    } catch (
        error
    ) {

        console.error(
            "Outstanding calculation error:",
            error
        );


        return 0;

    }

}


// =====================================================
// LOAD TODAY COLLECTION
//
// collections
// +
// staff-linked payments
//
// depositRequests / ownerCollectionLedger
// are NOT counted here.
//
// Reason:
// Staff deposit is only staff -> owner transfer.
// It is not another customer collection.
// =====================================================

async function loadTodayCollection() {

    try {

        const todayKey =
            getTodayKey();


        let todayAmount =
            0;


        // =================================================
        // OWNER COLLECTIONS
        // =================================================

        const collectionsSnapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        collectionsSnapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                const paymentDate =
                    getPaymentDate(
                        data
                    );


                if (
                    getDateKey(
                        paymentDate
                    ) !==
                    todayKey
                ) {

                    return;

                }


                todayAmount +=
                    getPaymentAmount(
                        data
                    );

            }
        );


        // =================================================
        // STAFF PAYMENTS
        // =================================================

        const paymentsSnapshot =
            await getDocs(
                collection(
                    db,
                    "payments"
                )
            );


        paymentsSnapshot.forEach(
            paymentDoc => {

                const data =
                    paymentDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                if (
                    !isStaffPayment(
                        data
                    )
                ) {

                    return;

                }


                const paymentDate =
                    getPaymentDate(
                        data
                    );


                if (
                    getDateKey(
                        paymentDate
                    ) !==
                    todayKey
                ) {

                    return;

                }


                todayAmount +=
                    getPaymentAmount(
                        data
                    );

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


// =====================================================
// LOAD TOTAL CUSTOMER COLLECTIONS
//
// PRIMARY:
// collections
//
// LEGACY:
// staff-linked payments
//
// IMPORTANT:
// Staff deposit is not added.
// =====================================================

async function loadTotalCustomerCollections() {

    try {

        let totalCollection =
            0;


        const collectionReceiptIds =
            new Set();


        // =================================================
        // COLLECTION MASTER
        // =================================================

        const collectionsSnapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        collectionsSnapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                const amount =
                    getPaymentAmount(
                        data
                    );


                if (
                    amount <= 0
                ) {

                    return;

                }


                totalCollection +=
                    amount;


                const receiptNo =
                    String(
                        firstValue(
                            data,
                            [
                                "receiptNo",
                                "receiptNumber",
                                "paymentId",
                                "collectionId"
                            ],
                            ""
                        )
                    ).trim();


                if (
                    receiptNo
                ) {

                    collectionReceiptIds.add(
                        receiptNo
                    );

                }

            }
        );


        // =================================================
        // LEGACY STAFF PAYMENTS
        // =================================================

        const paymentsSnapshot =
            await getDocs(
                collection(
                    db,
                    "payments"
                )
            );


        paymentsSnapshot.forEach(
            paymentDoc => {

                const data =
                    paymentDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                if (
                    !isStaffPayment(
                        data
                    )
                ) {

                    return;

                }


                const receiptNo =
                    String(
                        firstValue(
                            data,
                            [
                                "receiptNo",
                                "receiptNumber",
                                "paymentId",
                                "collectionId"
                            ],
                            ""
                        )
                    ).trim();


                if (
                    receiptNo &&
                    collectionReceiptIds.has(
                        receiptNo
                    )
                ) {

                    return;

                }


                totalCollection +=
                    getPaymentAmount(
                        data
                    );

            }
        );


        return totalCollection;


    } catch (
        error
    ) {

        console.error(
            "Total collection loading error:",
            error
        );


        return 0;

    }

}


// =====================================================
// LOAD OWNER INVESTMENT
//
// Firestore:
// ownerInvestments
//
// Supported amount fields:
//
// amount
// investmentAmount
// capitalAmount
//
// Supported valid statuses:
//
// active
// approved
// completed
// received
//
// Blank status is also treated as valid.
// =====================================================

async function loadTotalInvested() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    OWNER_INVESTMENT_COLLECTION
                )
            );


        let totalInvested =
            0;


        snapshot.forEach(
            investmentDoc => {

                const data =
                    investmentDoc.data();


                const status =
                    String(
                        data.status ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                if (
                    [
                        "cancelled",
                        "canceled",
                        "reversed",
                        "deleted",
                        "rejected"
                    ].includes(
                        status
                    )
                ) {

                    return;

                }


                const amount =
                    numberValue(
                        data.amount,
                        data.investmentAmount,
                        data.capitalAmount
                    );


                if (
                    amount > 0
                ) {

                    totalInvested +=
                        amount;

                }

            }
        );


        return totalInvested;


    } catch (
        error
    ) {

        console.error(
            "Owner investment loading error:",
            error
        );


        return 0;

    }

}


// =====================================================
// LOAD TOTAL DISBURSED
//
// PRIORITY:
//
// 1. netDisbursement
// 2. disbursedAmount
// 3. loanAmount
// 4. principalAmount
//
// DO NOT use totalPayable.
//
// totalPayable includes interest.
// =====================================================

async function loadTotalDisbursed() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
            );


        let totalDisbursed =
            0;


        snapshot.forEach(
            loanDoc => {

                const loan =
                    loanDoc.data();


                const status =
                    String(
                        loan.status ||
                        "Active"
                    )
                        .trim()
                        .toLowerCase();


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


                const disbursed =
                    numberValue(
                        loan.netDisbursement,
                        loan.disbursedAmount,
                        loan.loanAmount,
                        loan.principalAmount
                    );


                if (
                    disbursed > 0
                ) {

                    totalDisbursed +=
                        disbursed;

                }

            }
        );


        return totalDisbursed;


    } catch (
        error
    ) {

        console.error(
            "Total disbursement loading error:",
            error
        );


        return 0;

    }

}


// =====================================================
// LOAD BUSINESS FUND SUMMARY
//
// FORMULA:
//
// Available Cash
//
// = Total Invested
// - Total Disbursed
// + Total Collected
//
// Outstanding
//
// = Current Loan Outstanding
// =====================================================

async function loadBusinessFundSummary() {

    try {

        const [
            totalInvested,
            totalDisbursed,
            totalCollection,
            totalOutstanding
        ] = await Promise.all([

            loadTotalInvested(),

            loadTotalDisbursed(),

            loadTotalCustomerCollections(),

            calculateTotalOutstanding()

        ]);


        const availableCash =
            totalInvested -
            totalDisbursed +
            totalCollection;


        // =================================================
        // MAIN CARDS
        // =================================================

        if (
            totalInvestedElement
        ) {

            totalInvestedElement.textContent =
                formatCurrency(
                    totalInvested
                );

        }


        if (
            businessTotalDisbursedElement
        ) {

            businessTotalDisbursedElement.textContent =
                formatCurrency(
                    totalDisbursed
                );

        }


        if (
            businessTotalCollectionElement
        ) {

            businessTotalCollectionElement.textContent =
                formatCurrency(
                    totalCollection
                );

        }


        if (
            businessAvailableFundElement
        ) {

            businessAvailableFundElement.textContent =
                formatCurrency(
                    availableCash
                );

        }


        if (
            businessOutstandingElement
        ) {

            businessOutstandingElement.textContent =
                formatCurrency(
                    totalOutstanding
                );

        }


        // =================================================
        // FUND POSITION
        // =================================================

        if (
            positionInvestedElement
        ) {

            positionInvestedElement.textContent =
                formatCurrency(
                    totalInvested
                );

        }


        if (
            positionDisbursedElement
        ) {

            positionDisbursedElement.textContent =
                formatCurrency(
                    totalDisbursed
                );

        }


        if (
            positionCollectionElement
        ) {

            positionCollectionElement.textContent =
                formatCurrency(
                    totalCollection
                );

        }


        if (
            positionAvailableElement
        ) {

            positionAvailableElement.textContent =
                formatCurrency(
                    availableCash
                );

        }


        // =================================================
        // CONSOLE DEBUG
        // =================================================

        console.log(
            "========================================"
        );


        console.log(
            "SR AUTO FINANCE - BUSINESS FUND"
        );


        console.log(
            "Total Invested:",
            totalInvested
        );


        console.log(
            "Total Disbursed:",
            totalDisbursed
        );


        console.log(
            "Total Collected:",
            totalCollection
        );


        console.log(
            "Available Cash:",
            availableCash
        );


        console.log(
            "Outstanding:",
            totalOutstanding
        );


        console.log(
            "========================================"
        );


    } catch (
        error
    ) {

        console.error(
            "Business fund summary error:",
            error
        );

    }

}


// =====================================================
// LOAD RECENT COLLECTIONS
//
// collections
// +
// staff-linked payments
// =====================================================

async function loadRecentCollections() {

    try {

        const panel =
            document.querySelector(
                ".bottom-grid .panel:first-child"
            );


        if (
            !panel
        ) {

            return;

        }


        const existingEmpty =
            panel.querySelector(
                ".empty-state"
            );


        const records =
            [];


        // =================================================
        // OWNER COLLECTIONS
        // =================================================

        const collectionsSnapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        collectionsSnapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                records.push({

                    id:
                        collectionDoc.id,

                    source:
                        "owner",

                    ...data

                });

            }
        );


        // =================================================
        // STAFF PAYMENTS
        // =================================================

        const paymentsSnapshot =
            await getDocs(
                collection(
                    db,
                    "payments"
                )
            );


        paymentsSnapshot.forEach(
            paymentDoc => {

                const data =
                    paymentDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                if (
                    !isStaffPayment(
                        data
                    )
                ) {

                    return;

                }


                records.push({

                    id:
                        paymentDoc.id,

                    source:
                        "staff",

                    ...data

                });

            }
        );


        // =================================================
        // SORT LATEST
        // =================================================

        records.sort(
            (
                a,
                b
            ) => {

                const dateA =
                    getPaymentDate(
                        a
                    );


                const dateB =
                    getPaymentDate(
                        b
                    );


                const timeA =
                    dateA &&
                    typeof dateA.toDate ===
                    "function"

                        ? dateA
                            .toDate()
                            .getTime()

                        : new Date(
                            dateA ||
                            0
                        ).getTime();


                const timeB =
                    dateB &&
                    typeof dateB.toDate ===
                    "function"

                        ? dateB
                            .toDate()
                            .getTime()

                        : new Date(
                            dateB ||
                            0
                        ).getTime();


                return (
                    timeB -
                    timeA
                );

            }
        );


        const latest =
            records.slice(
                0,
                5
            );


        // =================================================
        // REMOVE OLD LIST
        // =================================================

        const oldList =
            panel.querySelector(
                ".dashboard-recent-list"
            );


        if (
            oldList
        ) {

            oldList.remove();

        }


        if (
            existingEmpty
        ) {

            existingEmpty.remove();

        }


        // =================================================
        // EMPTY
        // =================================================

        if (
            !latest.length
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "empty-state";


            empty.innerHTML = `

                <div class="empty-icon">
                    📋
                </div>

                <p>
                    No collections yet.
                </p>

            `;


            panel.appendChild(
                empty
            );


            return;

        }


        // =================================================
        // LIST
        // =================================================

        const list =
            document.createElement(
                "div"
            );


        list.className =
            "dashboard-recent-list";


        list.style.display =
            "flex";


        list.style.flexDirection =
            "column";


        list.style.gap =
            "10px";


        // =================================================
        // ROWS
        // =================================================

        latest.forEach(
            payment => {

                const receiptNo =
                    firstValue(
                        payment,
                        [
                            "receiptNo",
                            "receiptNumber",
                            "paymentId",
                            "collectionId"
                        ],
                        payment.id
                    );


                const customerName =
                    firstValue(
                        payment,
                        [
                            "customerName",
                            "name"
                        ],
                        "Customer"
                    );


                const staffName =
                    firstValue(
                        payment,
                        [
                            "staffName",
                            "collectorName",
                            "collectedByName"
                        ],
                        "Staff"
                    );


                const amount =
                    getPaymentAmount(
                        payment
                    );


                const paymentMode =
                    firstValue(
                        payment,
                        [
                            "paymentMode",
                            "mode"
                        ],
                        ""
                    );


                const paymentDate =
                    getPaymentDate(
                        payment
                    );


                const sourceLabel =
                    payment.source ===
                    "staff"

                        ? `Staff: ${staffName}`

                        : "Owner";


                const row =
                    document.createElement(
                        "div"
                    );


                row.style.display =
                    "flex";


                row.style.alignItems =
                    "center";


                row.style.justifyContent =
                    "space-between";


                row.style.gap =
                    "12px";


                row.style.padding =
                    "11px";


                row.style.border =
                    "1px solid #e2e8f0";


                row.style.borderRadius =
                    "10px";


                row.style.background =
                    "#f8fafc";


                row.style.cursor =
                    "pointer";


                row.innerHTML = `

                    <div
                        style="
                            min-width:0;
                            flex:1;
                        "
                    >

                        <div
                            style="
                                font-size:12px;
                                font-weight:700;
                                color:#0f172a;
                                white-space:nowrap;
                                overflow:hidden;
                                text-overflow:ellipsis;
                            "
                        >
                            ${customerName}
                        </div>


                        <div
                            style="
                                font-size:10px;
                                color:#64748b;
                                margin-top:3px;
                            "
                        >

                            ${receiptNo}

                            ${
                                paymentMode
                                    ? ` • ${paymentMode}`
                                    : ""
                            }

                            • ${sourceLabel}

                        </div>

                    </div>


                    <div
                        style="
                            text-align:right;
                            flex-shrink:0;
                        "
                    >

                        <div
                            style="
                                font-size:13px;
                                font-weight:800;
                                color:#15803d;
                            "
                        >
                            ${formatCurrency(
                                amount
                            )}
                        </div>


                        <div
                            style="
                                font-size:9px;
                                color:#94a3b8;
                                margin-top:3px;
                            "
                        >
                            ${formatDate(
                                paymentDate
                            )}
                        </div>

                    </div>

                `;


                row.addEventListener(
                    "click",
                    function() {

                        if (
                            payment.source ===
                            "staff"
                        ) {

                            window.location.href =
                                `staff-collection-view.html?id=${encodeURIComponent(
                                    payment.id
                                )}`;

                        } else {

                            window.location.href =
                                `collection-view.html?id=${encodeURIComponent(
                                    payment.id
                                )}`;

                        }

                    }
                );


                list.appendChild(
                    row
                );

            }
        );


        panel.appendChild(
            list
        );


    } catch (
        error
    ) {

        console.error(
            "Recent collections error:",
            error
        );

    }

}


// =====================================================
// LOGOUT
// =====================================================

if (
    logoutBtn
) {

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


            } catch (
                error
            ) {

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
// REFRESH BUSINESS FUND
// =====================================================

if (
    refreshFundBtn
) {

    refreshFundBtn.addEventListener(
        "click",
        async function() {

            try {

                refreshFundBtn.disabled =
                    true;


                refreshFundBtn.textContent =
                    "↻ Loading...";


                await loadBusinessFundSummary();


            } catch (
                error
            ) {

                console.error(
                    "Fund refresh error:",
                    error
                );

            } finally {

                refreshFundBtn.disabled =
                    false;


                refreshFundBtn.textContent =
                    "↻ Refresh";

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

        // =================================================
        // NO USER
        // =================================================

        if (
            !user
        ) {

            window.location.href =
                "login.html";


            return;

        }


        // =================================================
        // VALIDATE USER
        // =================================================

        const validUser =
            await loadUserProfile(
                user
            );


        if (
            !validUser
        ) {

            return;

        }


        // =================================================
        // LOAD DASHBOARD
        // =================================================

        await Promise.all([

            loadCompanySettings(),

            loadCustomers(),

            loadLoans(),

            loadTodayCollection(),

            loadRecentCollections(),

            loadBusinessFundSummary()

        ]);

    }
);
