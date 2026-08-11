// ============================================================
// SR AUTO FINANCE ERP
// BUSINESS SUMMARY
// File: js/business-summary.js
//
// DATA:
// loans + payments + customers + staff
//
// VIEWS:
// Overall
// Month Wise
// Tenure Wise
// Customer Wise
// Loan Wise
//
// PRINCIPAL / INTEREST:
// Uses existing loan calculation fields.
// Flat and Reducing interest are supported.
// ============================================================


import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";


// ============================================================
// GLOBAL DATA
// ============================================================

let allLoans = [];

let allPayments = [];

let allCustomers = [];

let allStaff = [];
let allDepositRequests = [];
let customerMap = new Map();

let staffMap = new Map();

let filteredLoans = [];

let filteredPayments = [];

let currentView = "overall";


// ============================================================
// ELEMENTS
// ============================================================

const customerSelect =
    document.getElementById(
        "customerSelect"
    );

const staffSelect =
    document.getElementById(
        "staffSelect"
    );

const tenureSelect =
    document.getElementById(
        "tenureSelect"
    );

const fromDateInput =
    document.getElementById(
        "fromDate"
    );

const toDateInput =
    document.getElementById(
        "toDate"
    );

const searchButton =
    document.getElementById(
        "searchBtn"
    );

const viewButtons =
    [
        ...document.querySelectorAll(
            ".view-btn"
        )
    ];


// ============================================================
// BASIC HELPERS
// ============================================================

function numberValue(...values) {

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
            Number(
                value
            );

        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }

    return 0;

}


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
            value !==
            undefined &&
            value !==
            null &&
            value !== ""
        ) {

            return value;

        }

    }

    return fallback;

}


function formatCurrency(
    value
) {

    const amount =
        numberValue(
            value
        );

    return (
        "₹" +
        amount.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        )
    );

}


function escapeHTML(
    value
) {

    return String(
        value ??
        ""
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
// DATE HELPERS
// ============================================================

function parseDateValue(
    value
) {

    if (
        !value
    ) {
        return null;
    }


    if (
        value?.toDate
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
        "number"
    ) {

        const date =
            new Date(
                value
            );

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    const text =
        String(
            value
        ).trim();


    if (
        !text
    ) {
        return null;
    }


    // YYYY-MM-DD
    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (
        match
    ) {

        return new Date(
            Number(
                match[1]
            ),
            Number(
                match[2]
            ) - 1,
            Number(
                match[3]
            )
        );

    }


    const date =
        new Date(
            text
        );


    return isNaN(
        date.getTime()
    )
        ? null
        : date;

}


function dateKey(
    value
) {

    const date =
        parseDateValue(
            value
        );

    if (
        !date
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


function monthKey(
    value
) {

    const date =
        parseDateValue(
            value
        );

    if (
        !date
    ) {
        return "";
    }

    return (
        `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        )}`
    );

}


function formatDate(
    value
) {

    const date =
        parseDateValue(
            value
        );

    if (
        !date
    ) {
        return "-";
    }

    return (
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        date.getFullYear()
    );

}


function formatMonth(
    value
) {

    const date =
        parseDateValue(
            value
        );

    if (
        !date
    ) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            month: "short",
            year: "numeric"
        }
    );

}


function addMonths(
    date,
    months
) {

    const result =
        new Date(
            date.getTime()
        );

    result.setMonth(
        result.getMonth() +
        months
    );

    return result;

}


function addDays(
    date,
    days
) {

    const result =
        new Date(
            date.getTime()
        );

    result.setDate(
        result.getDate() +
        days
    );

    return result;

}


// ============================================================
// LOAN HELPERS
// ============================================================

function getLoanId(
    loan
) {

    return firstValue(
        loan,
        [
            "loanId",
            "loanNumber",
            "loanCode"
        ],
        loan.id || "-"
    );

}


function getLoanPrincipal(
    loan
) {

    return numberValue(
        loan.principalAmount,
        loan.loanAmount,
        loan.amount
    );

}


function getLoanInterest(
    loan
) {

    return numberValue(
        loan.interestAmount,
        loan.totalInterest
    );

}


function getLoanTotalPayable(
    loan
) {

    const principal =
        getLoanPrincipal(
            loan
        );

    const interest =
        getLoanInterest(
            loan
        );

    return numberValue(
        loan.totalPayable,
        principal +
        interest
    );

}


function getLoanInstallment(
    loan
) {

    return numberValue(
        loan.installmentAmount,
        loan.monthlyInstallment,
        loan.emi
    );

}


function getLoanTenure(
    loan
) {

    return Math.max(
        Math.floor(
            numberValue(
                loan.tenure,
                loan.totalInstallments,
                loan.installments,
                loan.duration,
                loan.loanDuration
            )
        ),
        0
    );

}


function getLoanInterestType(
    loan
) {

    return String(
        firstValue(
            loan,
            [
                "interestType"
            ],
            "Flat"
        )
    ).toLowerCase();

}


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


function getLoanStaffId(
    loan
) {

    return String(
        firstValue(
            loan,
            [
                "staffId",
                "assignedStaffId",
                "employeeId"
            ],
            ""
        )
    );

}


function getLoanDate(
    loan
) {

    return (
        firstValue(
            loan,
            [
                "loanDate",
                "startDate",
                "createdDate"
            ],
            ""
        )
    );

}


function getFirstDueDate(
    loan
) {

    return (
        firstValue(
            loan,
            [
                "firstDueDate",
                "nextDueDate"
            ],
            getLoanDate(
                loan
            )
        )
    );

}


// ============================================================
// CUSTOMER / STAFF NAME
// ============================================================

function getCustomerName(
    loan
) {

    const customerId =
        getLoanCustomerId(
            loan
        );


    const customer =
        customerMap.get(
            customerId
        );


    return (
        firstValue(
            loan,
            [
                "customerName"
            ]
        ) ||
        firstValue(
            customer,
            [
                "name",
                "customerName",
                "fullName"
            ]
        ) ||
        "Unknown Customer"
    );

}


function getStaffName(
    loan
) {

    const staffId =
        getLoanStaffId(
            loan
        );


    const staff =
        staffMap.get(
            staffId
        );


    return (
        firstValue(
            loan,
            [
                "staffName",
                "collectedByName"
            ]
        ) ||
        firstValue(
            staff,
            [
                "name",
                "staffName",
                "fullName"
            ]
        ) ||
        "-"
    );

}


// ============================================================
// PAYMENT HELPERS
// ============================================================

function getPaymentAmount(
    payment
) {

    // Actual EMI / loan payment only.
    // Penalty must NOT be included here.

    return numberValue(
        payment.emiPaid,
        payment.amountReceived,
        payment.paidAmount,
        payment.paymentAmount,
        payment.amount
    );

}

function getPaymentPenalty(
    payment
) {

    return numberValue(
        payment.penaltyCollected,
        payment.penaltyAmount,
        payment.penalty
    );

}


function getPaymentDate(
    payment
) {

    return firstValue(
        payment,
        [
            "paymentDate",
            "paidDate",
            "date",
            "collectionDate"
        ],
        ""
    );

}


function paymentBelongsToLoan(
    payment,
    loan
) {

    const paymentLoanId =
        String(
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


    const paymentDocumentId =
        String(
            payment.loanDocumentId ||
            ""
        );


    const loanDocumentId =
        String(
            loan.id ||
            ""
        );


    const loanNumber =
        String(
            getLoanId(
                loan
            )
        );


    return (
        (
            paymentDocumentId &&
            paymentDocumentId ===
            loanDocumentId
        ) ||
        (
            paymentLoanId &&
            (
                paymentLoanId ===
                loanNumber ||
                paymentLoanId ===
                loanDocumentId
            )
        )
    );

}


// ============================================================
// BUILD REPAYMENT SCHEDULE FOR ONE LOAN
// ============================================================

function buildLoanSchedule(
    loan
) {

    const principal =
        getLoanPrincipal(
            loan
        );

    const totalInterest =
        getLoanInterest(
            loan
        );

    const tenure =
        getLoanTenure(
            loan
        );

    const installment =
        getLoanInstallment(
            loan
        );


    if (
        principal <= 0 ||
        tenure <= 0
    ) {

        return [];

    }


    const firstDue =
        parseDateValue(
            getFirstDueDate(
                loan
            )
        );


    if (
        !firstDue
    ) {

        return [];

    }


    const interestType =
        getLoanInterestType(
            loan
        );


    const rows = [];


    // ========================================================
    // FLAT INTEREST
    // ========================================================

    if (
        interestType.includes(
            "flat"
        )
    ) {

        const monthlyPrincipal =
            principal /
            tenure;

        const monthlyInterest =
            totalInterest /
            tenure;


        for (
            let i = 1;
            i <= tenure;
            i++
        ) {

            const dueDate =
                addMonths(
                    firstDue,
                    i - 1
                );


            let dueAmount =
                installment;


            if (
                dueAmount <= 0
            ) {

                dueAmount =
                    monthlyPrincipal +
                    monthlyInterest;

            }


            rows.push({

                installmentNo:
                    i,

                dueDate,

                dueAmount,

                principalDue:
                    monthlyPrincipal,

                interestDue:
                    monthlyInterest,

                paidAmount:
                    0,

                principalPaid:
                    0,

                interestPaid:
                    0,

                pendingAmount:
                    dueAmount,

                principalPending:
                    monthlyPrincipal,

                interestPending:
                    monthlyInterest,

                penalty:
                    0,

                paidDate:
                    "",

                status:
                    "Upcoming"

            });

        }

    }


    // ========================================================
    // REDUCING INTEREST
    // Same formula used in existing loan calculation
    // ========================================================

    else {

        const rate =
            numberValue(
                loan.interestRate
            );


        const monthlyRate =
            rate / 100;


        let balance =
            principal;


        let calculatedInstallment =
            installment;


        if (
            calculatedInstallment <= 0 &&
            monthlyRate > 0
        ) {

            const numerator =
                principal *
                monthlyRate *
                Math.pow(
                    1 +
                    monthlyRate,
                    tenure
                );

            const denominator =
                Math.pow(
                    1 +
                    monthlyRate,
                    tenure
                ) -
                1;


            calculatedInstallment =
                denominator !== 0
                    ? numerator /
                      denominator
                    : principal /
                      tenure;

        }


        if (
            calculatedInstallment <= 0
        ) {

            calculatedInstallment =
                principal /
                tenure;

        }


        for (
            let i = 1;
            i <= tenure;
            i++
        ) {

            const dueDate =
                addMonths(
                    firstDue,
                    i - 1
                );


            let interestDue =
                balance *
                monthlyRate;


            let principalDue =
                calculatedInstallment -
                interestDue;


            if (
                i === tenure
            ) {

                principalDue =
                    balance;

                interestDue =
                    calculatedInstallment -
                    principalDue;

            }


            if (
                principalDue < 0
            ) {

                principalDue = 0;

            }


            if (
                interestDue < 0
            ) {

                interestDue = 0;

            }


            let dueAmount =
                principalDue +
                interestDue;


            // Keep stored installment
            // when available.
            if (
                installment > 0
            ) {

                dueAmount =
                    installment;

            }


            rows.push({

                installmentNo:
                    i,

                dueDate,

                dueAmount,

                principalDue,

                interestDue,

                paidAmount:
                    0,

                principalPaid:
                    0,

                interestPaid:
                    0,

                pendingAmount:
                    dueAmount,

                principalPending:
                    principalDue,

                interestPending:
                    interestDue,

                penalty:
                    0,

                paidDate:
                    "",

                status:
                    "Upcoming"

            });


            balance =
                Math.max(
                    balance -
                    principalDue,
                    0
                );

        }

    }


    // ========================================================
    // PAYMENTS FOR THIS LOAN
    // ========================================================

    const loanPayments =
        allPayments
            .filter(
                payment =>
                    paymentBelongsToLoan(
                        payment,
                        loan
                    )
            )
            .sort(
                (
                    a,
                    b
                ) => {

                    const dateA =
                        parseDateValue(
                            getPaymentDate(
                                a
                            )
                        );

                    const dateB =
                        parseDateValue(
                            getPaymentDate(
                                b
                            )
                        );


                    return (
                        (
                            dateA?.getTime() ||
                            0
                        ) -
                        (
                            dateB?.getTime() ||
                            0
                        )
                    );

                }
            );


    // ========================================================
    // ALLOCATE PAYMENTS
    // Oldest EMI first
    // ========================================================

    loanPayments.forEach(
        payment => {

            let remaining =
                getPaymentAmount(
                    payment
                );


            if (
                remaining <= 0
            ) {
                return;
            }


            const paymentDate =
                getPaymentDate(
                    payment
                );


            const penalty =
                getPaymentPenalty(
                    payment
                );


            while (
                remaining > 0
            ) {

                const row =
                    rows.find(
                        item =>
                            item.pendingAmount >
                            0.009
                    );


                if (
                    !row
                ) {

                    break;

                }


                const allocation =
                    Math.min(
                        remaining,
                        row.pendingAmount
                    );


                // =========================================
                // SPLIT PAYMENT BASED ON THIS EMI'S
                // PRINCIPAL / INTEREST RATIO
                // =========================================

                const rowDue =
                    row.dueAmount >
                    0
                        ? row.dueAmount
                        : 1;


                const interestRatio =
                    row.interestDue /
                    rowDue;


                const principalRatio =
                    row.principalDue /
                    rowDue;


                const interestPart =
                    allocation *
                    interestRatio;


                const principalPart =
                    allocation *
                    principalRatio;


                row.paidAmount +=
                    allocation;


                row.interestPaid +=
                    interestPart;


                row.principalPaid +=
                    principalPart;


                row.pendingAmount =
                    Math.max(
                        row.dueAmount -
                        row.paidAmount,
                        0
                    );


                row.principalPending =
                    Math.max(
                        row.principalDue -
                        row.principalPaid,
                        0
                    );


                row.interestPending =
                    Math.max(
                        row.interestDue -
                        row.interestPaid,
                        0
                    );


                row.paidDate =
                    paymentDate;


                if (
                    penalty > 0
                ) {

                    row.penalty +=
                        penalty;

                }


                remaining -=
                    allocation;

            }

        }
    );


    // ========================================================
    // FINAL STATUS
    // ========================================================

    const today =
        new Date();


    rows.forEach(
        row => {

            const dueDate =
                parseDateValue(
                    row.dueDate
                );


            if (
                row.pendingAmount <=
                0.01
            ) {

                row.status =
                    row.penalty > 0
                        ? "Paid + Penalty"
                        : "Paid";

            }

            else if (
                row.paidAmount >
                0
            ) {

                row.status =
                    "Partial";

            }

            else if (
                dueDate &&
                dueDate <
                today
            ) {

                row.status =
                    "Overdue";

            }

            else {

                row.status =
                    "Upcoming";

            }

        }
    );


    return rows;

}


// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadData() {

    try {

        setLoading(
            true
        );


     const [
    loansSnapshot,
    paymentsSnapshot,
    customersSnapshot,
    staffSnapshot,
    depositRequestsSnapshot
] = await Promise.all([

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
                    "customers"
                )
            ),

            getDocs(
                collection(
                    db,
                    "staff"
                )
            )
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

        customerMap.clear();


        customersSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                const customer = {

                    id:
                        docSnap.id,

                    ...data

                };


                allCustomers.push(
                    customer
                );


                const customerId =
                    firstValue(
                        data,
                        [
                            "customerId",
                            "customerCode"
                        ],
                        docSnap.id
                    );


                customerMap.set(
                    String(
                        docSnap.id
                    ),
                    customer
                );


                customerMap.set(
                    String(
                        customerId
                    ),
                    customer
                );

            }
        );


        // ====================================================
        // STAFF
        // ====================================================

        allStaff = [];

        staffMap.clear();


        staffSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                const staff = {

                    id:
                        docSnap.id,

                    ...data

                };


                allStaff.push(
                    staff
                );


                const staffId =
                    firstValue(
                        data,
                        [
                            "staffId",
                            "staffCode",
                            "employeeId"
                        ],
                        docSnap.id
                    );


                staffMap.set(
                    String(
                        docSnap.id
                    ),
                    staff
                );


                staffMap.set(
                    String(
                        staffId
                    ),
                    staff
                );

            }
        );
        
                // ====================================================
        // DEPOSIT REQUESTS
        // ====================================================

        allDepositRequests = [];

        depositRequestsSnapshot.forEach(
            docSnap => {

                allDepositRequests.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        // ====================================================
        // LOANS
        // ====================================================

        allLoans = [];


        loansSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                allLoans.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


        // ====================================================
        // PAYMENTS
        // ====================================================

        allPayments = [];


        paymentsSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                const status =
                    String(
                        data.status ||
                        ""
                    ).toLowerCase();


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


                allPayments.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


        console.log(
            "Business Summary Data:",
            {
                loans:
                    allLoans.length,

                payments:
                    allPayments.length,

                customers:
                    allCustomers.length,

                staff:
                    allStaff.length,
                depositRequests:
    allDepositRequests.length
            }
        );


        populateFilters();

        applyFilters();


        setLoading(
            false
        );


    } catch (
        error
    ) {

        console.error(
            "Business Summary loading error:",
            error
        );


        setLoading(
            false
        );


        showError(
            "Unable to load Business Summary. Check browser console."
        );

    }

}


// ============================================================
// FILTER OPTIONS
// ============================================================

function populateFilters() {

    // ========================================================
    // CUSTOMER
    // ========================================================

    customerSelect.innerHTML =
        `
        <option value="">
            All Customers
        </option>
        `;


    const customerValues =
        new Map();


    allLoans.forEach(
        loan => {

            const id =
                getLoanCustomerId(
                    loan
                );


            const name =
                getCustomerName(
                    loan
                );


            if (
                id
            ) {

                customerValues.set(
                    String(id),
                    name
                );

            }

        }
    );


    [
        ...customerValues.entries()
    ]
        .sort(
            (
                a,
                b
            ) =>
                String(
                    a[1]
                ).localeCompare(
                    String(
                        b[1]
                    )
                )
        )
        .forEach(
            (
                [
                    id,
                    name
                ]
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    id;


                option.textContent =
                    name;


                customerSelect.appendChild(
                    option
                );

            }
        );


    // ========================================================
    // STAFF
    // ========================================================

    staffSelect.innerHTML =
        `
        <option value="">
            All Staff
        </option>
        `;


    const staffValues =
        new Map();


    allLoans.forEach(
        loan => {

            const id =
                getLoanStaffId(
                    loan
                );


            const name =
                getStaffName(
                    loan
                );


            if (
                id
            ) {

                staffValues.set(
                    String(id),
                    name
                );

            }

        }
    );


    [
        ...staffValues.entries()
    ]
        .sort(
            (
                a,
                b
            ) =>
                String(
                    a[1]
                ).localeCompare(
                    String(
                        b[1]
                    )
                )
        )
        .forEach(
            (
                [
                    id,
                    name
                ]
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    id;


                option.textContent =
                    name;


                staffSelect.appendChild(
                    option
                );

            }
        );


    // ========================================================
    // TENURE
    // ========================================================

    tenureSelect.innerHTML =
        `
        <option value="">
            All Tenures
        </option>
        `;


    const tenures =
        [
            ...new Set(
                allLoans
                    .map(
                        loan =>
                            getLoanTenure(
                                loan
                            )
                    )
                    .filter(
                        value =>
                            value > 0
                    )
            )
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );


    tenures.forEach(
        tenure => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                tenure;


            option.textContent =
                `${tenure} Months`;


            tenureSelect.appendChild(
                option
            );

        }
    );

}


// ============================================================
// APPLY FILTERS
// ============================================================

function applyFilters() {

    const selectedCustomer =
        String(
            customerSelect.value ||
            ""
        );


    const selectedStaff =
        String(
            staffSelect.value ||
            ""
        );


    const selectedTenure =
        Number(
            tenureSelect.value
        ) || 0;


    const fromDate =
        parseDateValue(
            fromDateInput.value
        );


    const toDate =
        parseDateValue(
            toDateInput.value
        );


    filteredLoans =
        allLoans.filter(
            loan => {

                // ------------------------------------------
                // CUSTOMER
                // ------------------------------------------

                if (
                    selectedCustomer &&
                    getLoanCustomerId(
                        loan
                    ) !==
                    selectedCustomer
                ) {

                    return false;

                }


                // ------------------------------------------
                // STAFF
                // ------------------------------------------

                if (
                    selectedStaff &&
                    getLoanStaffId(
                        loan
                    ) !==
                    selectedStaff
                ) {

                    return false;

                }


                // ------------------------------------------
                // TENURE
                // ------------------------------------------

                if (
                    selectedTenure > 0 &&
                    getLoanTenure(
                        loan
                    ) !==
                    selectedTenure
                ) {

                    return false;

                }


                // ------------------------------------------
                // DATE FILTER
                // Loan date based
                // ------------------------------------------

                const loanDate =
                    parseDateValue(
                        getLoanDate(
                            loan
                        )
                    );


                if (
                    fromDate &&
                    (
                        !loanDate ||
                        loanDate <
                        fromDate
                    )
                ) {

                    return false;

                }


                if (
                    toDate &&
                    (
                        !loanDate ||
                        loanDate >
                        toDate
                    )
                ) {

                    return false;

                }


                return true;

            }
        );


    filteredPayments =
        allPayments.filter(
            payment => {

                const paymentDate =
                    parseDateValue(
                        getPaymentDate(
                            payment
                        )
                    );


                if (
                    fromDate &&
                    (
                        !paymentDate ||
                        paymentDate <
                        fromDate
                    )
                ) {

                    return false;

                }


                if (
                    toDate &&
                    (
                        !paymentDate ||
                        paymentDate >
                        toDate
                    )
                ) {

                    return false;

                }


                return filteredLoans.some(
                    loan =>
                        paymentBelongsToLoan(
                            payment,
                            loan
                        )
                );

            }
        );


    renderCurrentView();

}


// ============================================================
// BUILD FINANCIAL DATA
// ============================================================

function getLoanFinancialData(
    loan
) {

    const schedule =
        buildLoanSchedule(
            loan
        );


    const principal =
        getLoanPrincipal(
            loan
        );


    const interest =
        getLoanInterest(
            loan
        );


    const totalPayable =
        getLoanTotalPayable(
            loan
        );


    let principalPaid =
        0;

    let interestPaid =
        0;

    let totalPaid =
        0;

    let penalty =
        0;


    schedule.forEach(
        row => {

            principalPaid +=
                row.principalPaid;

            interestPaid +=
                row.interestPaid;

            totalPaid +=
                row.paidAmount;

            penalty +=
                row.penalty;

        }
    );


    // Fallback to loan total paid
    // when payment schedule has
    // no payment records.

    if (
        totalPaid <= 0
    ) {

      totalPaid =
    numberValue(
        loan.totalPaid,
        loan.paidAmount,
        loan.amountPaid
    );


        // If exact split is unavailable,
        // distribute total paid against
        // principal + interest ratio.

        const totalLoanValue =
            principal +
            interest;


        if (
            totalLoanValue > 0 &&
            totalPaid > 0
        ) {

            principalPaid =
                Math.min(
                    principal,
                    totalPaid *
                    (
                        principal /
                        totalLoanValue
                    )
                );


            interestPaid =
                Math.max(
                    Math.min(
                        interest,
                        totalPaid -
                        principalPaid
                    ),
                    0
                );

        }

    }


    const principalPending =
        Math.max(
            principal -
            principalPaid,
            0
        );


    const interestPending =
        Math.max(
            interest -
            interestPaid,
            0
        );


    const totalPending =
        Math.max(
            totalPayable -
            totalPaid,
            0
        );


    return {

        loan,

        schedule,

        principal,

        interest,

        totalPayable,

        totalPaid,

        principalPaid,

        interestPaid,

        principalPending,

        interestPending,

        totalPending,

        penalty

    };

}


// ============================================================
// OVERALL SUMMARY
// ============================================================

function calculateOverall() {

    const result = {

        loans:
            0,

        principal:
            0,

        interest:
            0,

        totalPayable:
            0,

        totalPaid:
            0,

        principalPaid:
            0,

        interestPaid:
            0,

        principalPending:
            0,

        interestPending:
            0,

        totalPending:
            0,

        penalty:
            0

    };


    filteredLoans.forEach(
        loan => {

            const data =
                getLoanFinancialData(
                    loan
                );


            result.loans +=
                1;

            result.principal +=
                data.principal;

            result.interest +=
                data.interest;

            result.totalPayable +=
                data.totalPayable;

            result.totalPaid +=
                data.totalPaid;

            result.principalPaid +=
                data.principalPaid;

            result.interestPaid +=
                data.interestPaid;

            result.principalPending +=
                data.principalPending;

            result.interestPending +=
                data.interestPending;

            result.totalPending +=
                data.totalPending;

            result.penalty +=
                data.penalty;

        }
    );


    return result;

}


// ============================================================
// RENDER SUMMARY CARDS
// ============================================================

function renderSummaryCards() {

    const result =
        calculateOverall();


    setText(
        "totalPrincipal",
        formatCurrency(
            result.principal
        )
    );


    setText(
        "totalInterest",
        formatCurrency(
            result.interest
        )
    );


    setText(
        "totalPayable",
        formatCurrency(
            result.totalPayable
        )
    );


    setText(
        "totalCollected",
        formatCurrency(
            result.totalPaid
        )
    );


    setText(
        "principalPending",
        formatCurrency(
            result.principalPending
        )
    );


    setText(
        "interestPending",
        formatCurrency(
            result.interestPending
        )
    );


    setText(
        "totalPending",
        formatCurrency(
            result.totalPending
        )
    );


    setText(
        "interestCollected",
        formatCurrency(
            result.interestPaid
        )
    );


    setText(
        "positionPrincipal",
        formatCurrency(
            result.principal
        )
    );


    setText(
        "positionPrincipalPaid",
        formatCurrency(
            result.principalPaid
        )
    );


    setText(
        "positionPrincipalPending",
        formatCurrency(
            result.principalPending
        )
    );


    setText(
        "positionInterest",
        formatCurrency(
            result.interest
        )
    );


    setText(
        "positionInterestPaid",
        formatCurrency(
            result.interestPaid
        )
    );


    setText(
        "positionInterestPending",
        formatCurrency(
            result.interestPending
        )
    );


    setText(
        "financeIncome",
        formatCurrency(
            result.interestPaid
        )
    );


    setText(
        "penaltyCollected",
        formatCurrency(
            result.penalty
        )
    );


    setText(
        "totalFinanceIncome",
        formatCurrency(
            result.interestPaid +
            result.penalty
        )
    );

}


// ============================================================
// OVERALL VIEW
// ============================================================

function renderOverallView() {

    const head =
        document.getElementById(
            "reportHead"
        );

    const body =
        document.getElementById(
            "reportBody"
        );


    setText(
        "tableTitle",
        "Overall Business Summary"
    );


    head.innerHTML = `
        <tr>
            <th>Loan ID</th>
            <th>Customer</th>
            <th>Staff</th>
            <th>Tenure</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Total Payable</th>
            <th>Principal Paid</th>
            <th>Interest Paid</th>
            <th>Principal Pending</th>
            <th>Interest Pending</th>
        </tr>
    `;


    if (
        !filteredLoans.length
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="11"
                    class="empty"
                >
                    No loan records found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filteredLoans
            .map(
                loan => {

                    const data =
                        getLoanFinancialData(
                            loan
                        );


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        getLoanId(
                                            loan
                                        )
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    getCustomerName(
                                        loan
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getStaffName(
                                        loan
                                    )
                                )}
                            </td>

                            <td>
                                ${getLoanTenure(
                                    loan
                                )} Months
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    data.principal
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    data.interest
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    data.totalPayable
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    data.principalPaid
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    data.interestPaid
                                )}
                            </td>

                            <td class="money red">
                                ${formatCurrency(
                                    data.principalPending
                                )}
                            </td>

                            <td class="money orange">
                                ${formatCurrency(
                                    data.interestPending
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// MONTH WISE VIEW
// ============================================================

function renderMonthWiseView() {

    const head =
        document.getElementById(
            "reportHead"
        );

    const body =
        document.getElementById(
            "reportBody"
        );


    setText(
        "tableTitle",
        "Month Wise Business Summary"
    );


    head.innerHTML = `
        <tr>
            <th>Month</th>
            <th>Total Due</th>
            <th>Principal Due</th>
            <th>Interest Due</th>
            <th>Total Paid</th>
            <th>Principal Paid</th>
            <th>Interest Paid</th>
            <th>Principal Pending</th>
            <th>Interest Pending</th>
            <th>Penalty</th>
        </tr>
    `;


    const months =
        new Map();


    filteredLoans.forEach(
        loan => {

            const schedule =
                buildLoanSchedule(
                    loan
                );


            schedule.forEach(
                row => {

                    const key =
                        monthKey(
                            row.dueDate
                        );


                    if (
                        !key
                    ) {
                        return;
                    }


                    if (
                        !months.has(
                            key
                        )
                    ) {

                        months.set(
                            key,
                            {

                                date:
                                    row.dueDate,

                                totalDue:
                                    0,

                                principalDue:
                                    0,

                                interestDue:
                                    0,

                                totalPaid:
                                    0,

                                principalPaid:
                                    0,

                                interestPaid:
                                    0,

                                principalPending:
                                    0,

                                interestPending:
                                    0,

                                penalty:
                                    0

                            }
                        );

                    }


                    const item =
                        months.get(
                            key
                        );


                    item.totalDue +=
                        row.dueAmount;

                    item.principalDue +=
                        row.principalDue;

                    item.interestDue +=
                        row.interestDue;

                    item.totalPaid +=
                        row.paidAmount;

                    item.principalPaid +=
                        row.principalPaid;

                    item.interestPaid +=
                        row.interestPaid;

                    item.principalPending +=
                        row.principalPending;

                    item.interestPending +=
                        row.interestPending;

                    item.penalty +=
                        row.penalty;

                }
            );

        }
    );


    const rows =
        [
            ...months.entries()
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a[0].localeCompare(
                        b[0]
                    )
            );


    if (
        !rows.length
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="empty"
                >
                    No monthly data found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        rows
            .map(
                (
                    [
                        key,
                        item
                    ]
                ) => {

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${formatMonth(
                                        item.date
                                    )}
                                </strong>
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.totalDue
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.principalDue
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    item.interestDue
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.totalPaid
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.principalPaid
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    item.interestPaid
                                )}
                            </td>

                            <td class="money red">
                                ${formatCurrency(
                                    item.principalPending
                                )}
                            </td>

                            <td class="money orange">
                                ${formatCurrency(
                                    item.interestPending
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.penalty
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// TENURE WISE VIEW
// ============================================================

function renderTenureWiseView() {

    const head =
        document.getElementById(
            "reportHead"
        );

    const body =
        document.getElementById(
            "reportBody"
        );


    setText(
        "tableTitle",
        "Tenure Wise Business Summary"
    );


    head.innerHTML = `
        <tr>
            <th>Tenure</th>
            <th>Loans</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Total Payable</th>
            <th>Principal Paid</th>
            <th>Interest Paid</th>
            <th>Principal Pending</th>
            <th>Interest Pending</th>
        </tr>
    `;


    const groups =
        new Map();


    filteredLoans.forEach(
        loan => {

            const tenure =
                getLoanTenure(
                    loan
                );


            if (
                !groups.has(
                    tenure
                )
            ) {

                groups.set(
                    tenure,
                    {

                        loans:
                            0,

                        principal:
                            0,

                        interest:
                            0,

                        totalPayable:
                            0,

                        principalPaid:
                            0,

                        interestPaid:
                            0,

                        principalPending:
                            0,

                        interestPending:
                            0

                    }
                );

            }


            const item =
                groups.get(
                    tenure
                );


            const data =
                getLoanFinancialData(
                    loan
                );


            item.loans +=
                1;

            item.principal +=
                data.principal;

            item.interest +=
                data.interest;

            item.totalPayable +=
                data.totalPayable;

            item.principalPaid +=
                data.principalPaid;

            item.interestPaid +=
                data.interestPaid;

            item.principalPending +=
                data.principalPending;

            item.interestPending +=
                data.interestPending;

        }
    );


    const rows =
        [
            ...groups.entries()
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a[0]
                    ) -
                    Number(
                        b[0]
                    )
            );


    if (
        !rows.length
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty"
                >
                    No tenure data found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        rows
            .map(
                (
                    [
                        tenure,
                        item
                    ]
                ) => {

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${tenure} Months
                                </strong>
                            </td>

                            <td>
                                ${item.loans}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.principal
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    item.interest
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.totalPayable
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.principalPaid
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    item.interestPaid
                                )}
                            </td>

                            <td class="money red">
                                ${formatCurrency(
                                    item.principalPending
                                )}
                            </td>

                            <td class="money orange">
                                ${formatCurrency(
                                    item.interestPending
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// CUSTOMER WISE VIEW
// ============================================================

function renderCustomerWiseView() {

    const head =
        document.getElementById(
            "reportHead"
        );

    const body =
        document.getElementById(
            "reportBody"
        );


    setText(
        "tableTitle",
        "Customer Wise Business Summary"
    );


    head.innerHTML = `
        <tr>
            <th>Customer</th>
            <th>Loans</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Total Payable</th>
            <th>Principal Paid</th>
            <th>Interest Paid</th>
            <th>Principal Pending</th>
            <th>Interest Pending</th>
        </tr>
    `;


    const groups =
        new Map();


    filteredLoans.forEach(
        loan => {

            const customerId =
                getLoanCustomerId(
                    loan
                ) ||
                getCustomerName(
                    loan
                );


            if (
                !groups.has(
                    customerId
                )
            ) {

                groups.set(
                    customerId,
                    {

                        name:
                            getCustomerName(
                                loan
                            ),

                        loans:
                            0,

                        principal:
                            0,

                        interest:
                            0,

                        totalPayable:
                            0,

                        principalPaid:
                            0,

                        interestPaid:
                            0,

                        principalPending:
                            0,

                        interestPending:
                            0

                    }
                );

            }


            const item =
                groups.get(
                    customerId
                );


            const data =
                getLoanFinancialData(
                    loan
                );


            item.loans +=
                1;

            item.principal +=
                data.principal;

            item.interest +=
                data.interest;

            item.totalPayable +=
                data.totalPayable;

            item.principalPaid +=
                data.principalPaid;

            item.interestPaid +=
                data.interestPaid;

            item.principalPending +=
                data.principalPending;

            item.interestPending +=
                data.interestPending;

        }
    );


    const rows =
        [
            ...groups.values()
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a.name.localeCompare(
                        b.name
                    )
            );


    if (
        !rows.length
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty"
                >
                    No customer data found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        rows
            .map(
                item => {

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        item.name
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${item.loans}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.principal
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    item.interest
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.totalPayable
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    item.principalPaid
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    item.interestPaid
                                )}
                            </td>

                            <td class="money red">
                                ${formatCurrency(
                                    item.principalPending
                                )}
                            </td>

                            <td class="money orange">
                                ${formatCurrency(
                                    item.interestPending
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// LOAN WISE VIEW
// ============================================================

function renderLoanWiseView() {

    const head =
        document.getElementById(
            "reportHead"
        );

    const body =
        document.getElementById(
            "reportBody"
        );


    setText(
        "tableTitle",
        "Loan Wise Business Summary"
    );


    head.innerHTML = `
        <tr>
            <th>Loan ID</th>
            <th>Customer</th>
            <th>Staff</th>
            <th>Loan Date</th>
            <th>Tenure</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Total Payable</th>
            <th>Principal Paid</th>
            <th>Interest Paid</th>
            <th>Principal Pending</th>
            <th>Interest Pending</th>
        </tr>
    `;


    if (
        !filteredLoans.length
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="12"
                    class="empty"
                >
                    No loan data found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filteredLoans
            .map(
                loan => {

                    const data =
                        getLoanFinancialData(
                            loan
                        );


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        getLoanId(
                                            loan
                                        )
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    getCustomerName(
                                        loan
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getStaffName(
                                        loan
                                    )
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    getLoanDate(
                                        loan
                                    )
                                )}
                            </td>

                            <td>
                                ${getLoanTenure(
                                    loan
                                )} Months
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    data.principal
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    data.interest
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    data.totalPayable
                                )}
                            </td>

                            <td class="money">
                                ${formatCurrency(
                                    data.principalPaid
                                )}
                            </td>

                            <td class="money green">
                                ${formatCurrency(
                                    data.interestPaid
                                )}
                            </td>

                            <td class="money red">
                                ${formatCurrency(
                                    data.principalPending
                                )}
                            </td>

                            <td class="money orange">
                                ${formatCurrency(
                                    data.interestPending
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// CURRENT VIEW
// ============================================================

function renderCurrentView() {

    renderSummaryCards();


    switch (
        currentView
    ) {

        case "month":

            renderMonthWiseView();

            break;


        case "tenure":

            renderTenureWiseView();

            break;


        case "customer":

            renderCustomerWiseView();

            break;


        case "loan":

            renderLoanWiseView();

            break;
        case "staff":

            renderStaffWiseView();

            break;

        default:

            renderOverallView();

            break;

    }

}


// ============================================================
// UI HELPERS
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value;

    }

}


function setLoading(
    loading
) {

    const body =
        document.getElementById(
            "reportBody"
        );


    if (
        loading &&
        body
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="12"
                    class="empty"
                >
                    Loading Business Summary...
                </td>
            </tr>
        `;

    }

}


function showError(
    message
) {

    const body =
        document.getElementById(
            "reportBody"
        );


    if (
        body
    ) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="12"
                    class="empty"
                >
                    ${escapeHTML(
                        message
                    )}
                </td>
            </tr>
        `;

    }

}


// ============================================================
// EVENTS
// ============================================================

viewButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function () {

                viewButtons.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                this.classList.add(
                    "active"
                );


                currentView =
                    this.dataset.view ||
                    "overall";
                // ============================================================
// STAFF WISE VIEW
// ============================================================

function renderStaffWiseView() {

    const head =
        document.getElementById(
            "reportHead"
        );

    const body =
        document.getElementById(
            "reportBody"
        );


    setText(
        "tableTitle",
        "Staff Wise Business Summary"
    );


    head.innerHTML = `
        <tr>

            <th>Staff</th>

            <th>Customers</th>

            <th>Loans</th>

            <th>Principal</th>

            <th>Interest</th>

            <th>Total Payable</th>

            <th>Principal Collected</th>

            <th>Interest Collected</th>

            <th>Total Collected</th>

            <th>Principal Pending</th>

            <th>Interest Pending</th>

            <th>Deposit Pending</th>

            <th>Deposit Accepted</th>

            <th>Balance With Staff</th>

        </tr>
    `;


    const groups =
        new Map();


    // ========================================================
    // GROUP LOANS BY STAFF
    // ========================================================

    filteredLoans.forEach(
        loan => {

            const staffId =
                getLoanStaffId(
                    loan
                );


            const staffName =
                getStaffName(
                    loan
                );


            const groupKey =
                staffId ||
                staffName ||
                "unassigned";


            if (
                !groups.has(
                    groupKey
                )
            ) {

                groups.set(
                    groupKey,
                    {

                        staffId:
                            staffId,

                        staffName:
                            staffName,

                        customerIds:
                            new Set(),

                        loans:
                            0,

                        principal:
                            0,

                        interest:
                            0,

                        totalPayable:
                            0,

                        principalPaid:
                            0,

                        interestPaid:
                            0,

                        totalCollected:
                            0,

                        principalPending:
                            0,

                        interestPending:
                            0,

                        depositPending:
                            0,

                        depositAccepted:
                            0

                    }
                );

            }


            const item =
                groups.get(
                    groupKey
                );


            const customerId =
                getLoanCustomerId(
                    loan
                );


            if (
                customerId
            ) {

                item.customerIds.add(
                    String(
                        customerId
                    )
                );

            }


            item.loans +=
                1;


            const data =
                getLoanFinancialData(
                    loan
                );


            item.principal +=
                data.principal;


            item.interest +=
                data.interest;


            item.totalPayable +=
                data.totalPayable;


            item.principalPaid +=
                data.principalPaid;


            item.interestPaid +=
                data.interestPaid;


            item.totalCollected +=
                data.totalPaid;


            item.principalPending +=
                data.principalPending;


            item.interestPending +=
                data.interestPending;

        }
    );


    // ========================================================
    // DEPOSIT REQUESTS
    // ========================================================

    allDepositRequests.forEach(
        request => {

            const status =
                String(
                    request.status ||
                    "pending"
                ).toLowerCase();


            const amount =
                numberValue(
                    request.amount,
                    request.depositAmount
                );


            if (
                amount <= 0
            ) {

                return;

            }


            const staffId =
                String(
                    firstValue(
                        request,
                        [
                            "staffId",
                            "staffDocumentId",
                            "staffCode",
                            "employeeId"
                        ],
                        ""
                    )
                );


            const staffName =
                firstValue(
                    request,
                    [
                        "staffName",
                        "collectorName"
                    ],
                    ""
                );


            const groupKey =
                staffId ||
                staffName ||
                "unassigned";


            if (
                !groups.has(
                    groupKey
                )
            ) {

                groups.set(
                    groupKey,
                    {

                        staffId:
                            staffId,

                        staffName:
                            staffName ||
                            "Staff",

                        customerIds:
                            new Set(),

                        loans:
                            0,

                        principal:
                            0,

                        interest:
                            0,

                        totalPayable:
                            0,

                        principalPaid:
                            0,

                        interestPaid:
                            0,

                        totalCollected:
                            0,

                        principalPending:
                            0,

                        interestPending:
                            0,

                        depositPending:
                            0,

                        depositAccepted:
                            0

                    }
                );

            }


            const item =
                groups.get(
                    groupKey
                );


            if (
                status ===
                "pending"
            ) {

                item.depositPending +=
                    amount;

            }


            else if (
                status ===
                "accepted"
            ) {

                item.depositAccepted +=
                    amount;

            }

        }
    );


    const rows =
        [
            ...groups.values()
        ]
            .sort(
                (
                    a,
                    b
                ) => {

                    return String(
                        a.staffName
                    ).localeCompare(
                        String(
                            b.staffName
                        )
                    );

                }
            );


    if (
        !rows.length
    ) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="14"
                    class="empty"
                >
                    No staff data found.
                </td>

            </tr>
        `;

        return;

    }


    body.innerHTML =
        rows
            .map(
                item => {

                    const balanceWithStaff =
                        Math.max(
                            item.totalCollected -
                            item.depositAccepted -
                            item.depositPending,
                            0
                        );


                    return `

                        <tr>

                            <td>

                                <strong>
                                    ${escapeHTML(
                                        item.staffName ||
                                        "Unassigned"
                                    )}
                                </strong>

                            </td>


                            <td>
                                ${
                                    item.customerIds
                                        .size
                                }
                            </td>


                            <td>
                                ${item.loans}
                            </td>


                            <td class="money">

                                ${formatCurrency(
                                    item.principal
                                )}

                            </td>


                            <td class="money green">

                                ${formatCurrency(
                                    item.interest
                                )}

                            </td>


                            <td class="money">

                                ${formatCurrency(
                                    item.totalPayable
                                )}

                            </td>


                            <td class="money">

                                ${formatCurrency(
                                    item.principalPaid
                                )}

                            </td>


                            <td class="money green">

                                ${formatCurrency(
                                    item.interestPaid
                                )}

                            </td>


                            <td class="money green">

                                ${formatCurrency(
                                    item.totalCollected
                                )}

                            </td>


                            <td class="money red">

                                ${formatCurrency(
                                    item.principalPending
                                )}

                            </td>


                            <td class="money orange">

                                ${formatCurrency(
                                    item.interestPending
                                )}

                            </td>


                            <td class="money orange">

                                ${formatCurrency(
                                    item.depositPending
                                )}

                            </td>


                            <td class="money green">

                                ${formatCurrency(
                                    item.depositAccepted
                                )}

                            </td>


                            <td class="money">

                                ${formatCurrency(
                                    balanceWithStaff
                                )}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


                renderCurrentView();

            }
        );

    }
);


if (
    searchButton
) {

    searchButton.addEventListener(
        "click",
        function () {

            applyFilters();

        }
    );

}


// Customer change
if (
    customerSelect
) {

    customerSelect.addEventListener(
        "change",
        function () {

            applyFilters();

        }
    );

}


// Staff change
if (
    staffSelect
) {

    staffSelect.addEventListener(
        "change",
        function () {

            applyFilters();

        }
    );

}


// Tenure change
if (
    tenureSelect
) {

    tenureSelect.addEventListener(
        "change",
        function () {

            applyFilters();

        }
    );

}


// Date change
if (
    fromDateInput
) {

    fromDateInput.addEventListener(
        "change",
        function () {

            applyFilters();

        }
    );

}


if (
    toDateInput
) {

    toDateInput.addEventListener(
        "change",
        function () {

            applyFilters();

        }
    );

}


// ============================================================
// INITIAL LOAD
// ============================================================

loadData();
