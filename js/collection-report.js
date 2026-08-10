// ============================================================
// SR AUTO FINANCE ERP
// COLLECTION REPORT
// File: js/collection-report.js
//
// DATA SOURCE
// payments + customers + loans + staff
//
// IMPORTANT:
// Do not change collection-report.html for this version.
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

let allPayments = [];
let allCustomers = [];
let allLoans = [];
let allStaff = [];

let customerMap = new Map();
let loanMap = new Map();
let staffMap = new Map();

let filteredPayments = [];

let currentView = "date";


// ============================================================
// ELEMENTS
// ============================================================

const allInputs = [
    ...document.querySelectorAll("input")
];

const allSelects = [
    ...document.querySelectorAll("select")
];

const fromDateInput =
    document.getElementById("fromDate") ||
    allInputs.find(input =>
        input.type === "date"
    );

const toDateInput =
    document.getElementById("toDate") ||
    allInputs.filter(input =>
        input.type === "date"
    )[1];


// ------------------------------------------------------------
// SELECTS
// ------------------------------------------------------------

const staffSelect =
    document.getElementById("staffSelect") ||
    allSelects[0];

const customerSelect =
    document.getElementById("customerSelect") ||
    allSelects[1];

const loanSelect =
    document.getElementById("loanSelect") ||
    allSelects[2];


// ------------------------------------------------------------
// BUTTONS
// ------------------------------------------------------------

const searchButton =
    document.getElementById("searchBtn") ||
    [...document.querySelectorAll("button")]
        .find(button =>
            button.textContent
                .trim()
                .toLowerCase() === "search"
        );

const printButton =
    document.getElementById("printBtn") ||
    [...document.querySelectorAll("button")]
        .find(button =>
            button.textContent
                .trim()
                .toLowerCase() === "print"
        );

const downloadButton =
    document.getElementById("downloadBtn") ||
    [...document.querySelectorAll("button")]
        .find(button =>
            button.textContent
                .trim()
                .toLowerCase() === "download"
        );


// ============================================================
// SUMMARY ELEMENTS
// ============================================================

function findElementByIds(ids) {

    for (const id of ids) {

        const element =
            document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}


const totalDueElement =
    findElementByIds([
        "totalDueAmount",
        "totalDue",
        "dueAmount"
    ]);

const totalPaidElement =
    findElementByIds([
        "totalPaidAmount",
        "totalPaid",
        "emiPaid"
    ]);

const totalPendingElement =
    findElementByIds([
        "totalPendingAmount",
        "totalPending",
        "emiPending"
    ]);

const totalPenaltyElement =
    findElementByIds([
        "totalPenaltyAmount",
        "penaltyCollected",
        "totalPenalty"
    ]);

const totalCollectionElement =
    findElementByIds([
        "totalCollectionAmount",
        "totalCollection",
        "collectionAmount"
    ]);


// ============================================================
// TABLE
// ============================================================

function getReportTable() {

    const tables =
        [...document.querySelectorAll("table")];

    if (!tables.length) {
        return null;
    }

    // Prefer table containing Date / Collections
    const matching =
        tables.find(table =>
            table.textContent
                .toLowerCase()
                .includes("date")
        );

    return matching || tables[0];
}


const reportTable =
    getReportTable();


let reportTableHead =
    reportTable?.querySelector("thead");

let reportTableBody =
    reportTable?.querySelector("tbody");


// ============================================================
// HELPERS
// ============================================================

function numberValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const number =
        Number(
            String(value)
                .replace(/,/g, "")
                .replace(/[₹$]/g, "")
                .trim()
        );

    return Number.isFinite(number)
        ? number
        : 0;
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


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


function formatNumber(value) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        numberValue(value)
    );
}


// ============================================================
// DATE HELPERS
// ============================================================

function parseDateValue(value) {

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

        if (
            value instanceof Date
        ) {
            return isNaN(value.getTime())
                ? null
                : value;
        }

        if (
            typeof value === "number"
        ) {
            const date =
                new Date(value);

            return isNaN(date.getTime())
                ? null
                : date;
        }

        const stringValue =
            String(value).trim();

        if (!stringValue) {
            return null;
        }

        // YYYY-MM-DD
        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(stringValue)
        ) {

            const [
                year,
                month,
                day
            ] =
                stringValue
                    .split("-")
                    .map(Number);

            return new Date(
                year,
                month - 1,
                day
            );
        }

        const date =
            new Date(stringValue);

        if (
            isNaN(date.getTime())
        ) {
            return null;
        }

        return date;

    } catch {
        return null;
    }
}


function dateKey(date) {

    const parsed =
        parseDateValue(date);

    if (!parsed) {
        return "";
    }

    const year =
        parsed.getFullYear();

    const month =
        String(
            parsed.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            parsed.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(value) {

    const date =
        parseDateValue(value);

    if (!date) {
        return "-";
    }

    return date
        .toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
}


function getToday() {

    return dateKey(
        new Date()
    );
}


function getFirstDayOfMonth() {

    const today =
        new Date();

    return dateKey(
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        )
    );
}


// ============================================================
// GENERIC FIELD HELPERS
// ============================================================

function firstValue(
    object,
    fields,
    fallback = ""
) {

    for (
        const field of fields
    ) {

        const value =
            object?.[field];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return fallback;
}


// ============================================================
// NORMALIZE PAYMENT
// ============================================================

function normalizePayment(
    payment
) {

    const paymentId =
        payment.id || "";

    // --------------------------------------------------------
    // IDS
    // --------------------------------------------------------

    const customerId =
        firstValue(
            payment,
            [
                "customerId"
            ]
        );

    const loanId =
        firstValue(
            payment,
            [
                "loanId",
                "loanDocumentId"
            ]
        );

    const staffId =
        firstValue(
            payment,
            [
                "staffId",
                "collectedBy",
                "createdBy"
            ]
        );


    // --------------------------------------------------------
    // MAPPED RECORDS
    // --------------------------------------------------------

    const customer =
        customerMap.get(
            String(customerId)
        ) || {};

    const loan =
        loanMap.get(
            String(loanId)
        ) || {};

    const staff =
        staffMap.get(
            String(staffId)
        ) || {};


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    const customerName =
        firstValue(
            payment,
            [
                "customerName"
            ]
        ) ||
        firstValue(
            customer,
            [
                "customerName",
                "name",
                "fullName"
            ]
        ) ||
        "-";


    const customerMobile =
        firstValue(
            payment,
            [
                "customerMobile",
                "mobile",
                "phone"
            ]
        ) ||
        firstValue(
            customer,
            [
                "mobile",
                "phone",
                "mobileNumber"
            ]
        ) ||
        "";


    // --------------------------------------------------------
    // LOAN
    // --------------------------------------------------------

    const loanNumber =
        firstValue(
            payment,
            [
                "loanId"
            ]
        ) ||
        firstValue(
            loan,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ]
        ) ||
        loanId ||
        "-";


    const vehicleNumber =
        firstValue(
            payment,
            [
                "vehicleNumber"
            ]
        ) ||
        firstValue(
            loan,
            [
                "vehicleNumber",
                "vehicleNo"
            ]
        ) ||
        "";


    // --------------------------------------------------------
    // STAFF
    // --------------------------------------------------------

    const staffName =
        firstValue(
            payment,
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
        "-";


    const staffCode =
        firstValue(
            staff,
            [
                "staffId",
                "staffCode",
                "employeeId"
            ]
        ) ||
        "";


    // --------------------------------------------------------
    // PAYMENT DATE
    // --------------------------------------------------------

    const paymentDate =
        firstValue(
            payment,
            [
                "paymentDate",
                "collectionDate",
                "date",
                "createdAt"
            ]
        );


    // --------------------------------------------------------
    // AMOUNTS
    // --------------------------------------------------------

    const paidAmount =
        numberValue(
            firstValue(
                payment,
                [
                    "amountReceived",
                    "totalReceived",
                    "amount",
                    "paidAmount",
                    "paymentAmount"
                ],
                0
            )
        );


    const penalty =
        numberValue(
            firstValue(
                payment,
                [
                    "penaltyCollected",
                    "penaltyAmount",
                    "penalty"
                ],
                0
            )
        );


    const previousOutstanding =
        numberValue(
            firstValue(
                payment,
                [
                    "previousOutstanding",
                    "previousPending",
                    "outstandingBeforePayment"
                ],
                0
            )
        );


    const balanceAfterPayment =
        numberValue(
            firstValue(
                payment,
                [
                    "balanceAfterPayment",
                    "outstandingAfterPayment",
                    "balanceAmount"
                ],
                0
            )
        );


    // --------------------------------------------------------
    // EMI / DUE AMOUNT
    // --------------------------------------------------------

    const installmentAmount =
        numberValue(
            firstValue(
                payment,
                [
                    "dueAmount",
                    "installmentAmount",
                    "emiAmount"
                ],
                0
            )
        ) ||
        numberValue(
            firstValue(
                loan,
                [
                    "installmentAmount",
                    "emiAmount",
                    "monthlyInstallment",
                    "weeklyInstallment",
                    "dailyInstallment"
                ],
                0
            )
        );


    // --------------------------------------------------------
    // PENDING
    // --------------------------------------------------------

    let pendingAmount =
        numberValue(
            firstValue(
                payment,
                [
                    "pendingAmount",
                    "emiPending"
                ],
                0
            )
        );

    if (
        pendingAmount === 0 &&
        installmentAmount > 0
    ) {

        pendingAmount =
            Math.max(
                installmentAmount -
                paidAmount,
                0
            );
    }


    // --------------------------------------------------------
    // TOTAL COLLECTION
    // --------------------------------------------------------

    const totalCollection =
        numberValue(
            firstValue(
                payment,
                [
                    "totalCollection",
                    "totalReceived"
                ],
                paidAmount + penalty
            )
        ) ||
        paidAmount + penalty;


    // --------------------------------------------------------
    // INSTALLMENTS
    // --------------------------------------------------------

    const paidInstallments =
        numberValue(
            firstValue(
                payment,
                [
                    "paidInstallments",
                    "installmentsPaid"
                ],
                0
            )
        );

    const pendingInstallments =
        numberValue(
            firstValue(
                payment,
                [
                    "pendingInstallments",
                    "installmentsPending"
                ],
                0
            )
        );


    return {

        id:
            paymentId,

        customerId,

        customerName,

        customerMobile,

        loanId,

        loanNumber,

        vehicleNumber,

        staffId,

        staffName,

        staffCode,

        paymentDate,

        paidDate:
            paymentDate,

        dueAmount:
            installmentAmount,

        paidAmount,

        pendingAmount,

        penalty,

        totalCollection,

        previousOutstanding,

        balanceAfterPayment,

        paidInstallments,

        pendingInstallments,

        paymentMode:
            firstValue(
                payment,
                [
                    "paymentMode",
                    "mode"
                ],
                "-"
            ),

        receiptNumber:
            firstValue(
                payment,
                [
                    "receiptNumber",
                    "receiptNo",
                    "paymentId"
                ],
                "-"
            ),

        remarks:
            firstValue(
                payment,
                [
                    "remarks",
                    "remark"
                ],
                ""
            ),

        status:
            String(
                firstValue(
                    payment,
                    ["status"],
                    "Success"
                )
            ).toLowerCase()

    };
}


// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadAllData() {

    showLoading();


    try {

        const [
            paymentsSnapshot,
            customersSnapshot,
            loansSnapshot,
            staffSnapshot
        ] = await Promise.all([

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
                    "loans"
                )
            ),

            getDocs(
                collection(
                    db,
                    "staff"
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


                customerMap.set(
                    String(
                        docSnap.id
                    ),
                    customer
                );


                const customerId =
                    firstValue(
                        data,
                        [
                            "customerId"
                        ]
                    );

                if (customerId) {

                    customerMap.set(
                        String(
                            customerId
                        ),
                        customer
                    );
                }

            }
        );


        // ====================================================
        // LOANS
        // ====================================================

        allLoans = [];

        loanMap.clear();

        loansSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();

                const loan = {

                    id:
                        docSnap.id,

                    ...data

                };

                allLoans.push(
                    loan
                );


                loanMap.set(
                    String(
                        docSnap.id
                    ),
                    loan
                );


                const loanId =
                    firstValue(
                        data,
                        [
                            "loanId",
                            "loanNumber",
                            "loanCode"
                        ]
                    );

                if (loanId) {

                    loanMap.set(
                        String(
                            loanId
                        ),
                        loan
                    );
                }

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


                staffMap.set(
                    String(
                        docSnap.id
                    ),
                    staff
                );


                const staffId =
                    firstValue(
                        data,
                        [
                            "staffId",
                            "staffCode",
                            "employeeId"
                        ]
                    );

                if (staffId) {

                    staffMap.set(
                        String(
                            staffId
                        ),
                        staff
                    );
                }

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

                allPayments.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


        // ====================================================
        // NORMALIZE
        // ====================================================

        allPayments =
            allPayments
                .map(
                    normalizePayment
                )
                .filter(
                    payment =>
                        payment.status !==
                        "cancelled" &&
                        payment.status !==
                        "canceled" &&
                        payment.status !==
                        "reversed"
                );


        // ====================================================
        // SORT
        // ====================================================

        allPayments.sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    parseDateValue(
                        first.paymentDate
                    );

                const secondDate =
                    parseDateValue(
                        second.paymentDate
                    );

                return (
                    (secondDate?.getTime() || 0) -
                    (firstDate?.getTime() || 0)
                );

            }
        );


        populateFilters();

        applySearch();


        console.log(
            "Collection report loaded:",
            {
                payments:
                    allPayments.length,

                customers:
                    allCustomers.length,

                loans:
                    allLoans.length,

                staff:
                    allStaff.length
            }
        );


    } catch (error) {

        console.error(
            "Collection report loading error:",
            error
        );

        showError(
            "Unable to load collection report."
        );
    }
}


// ============================================================
// FILTER OPTIONS
// ============================================================

function clearSelect(
    select,
    defaultText
) {

    if (!select) {
        return;
    }

    select.innerHTML = "";

    const option =
        document.createElement(
            "option"
        );

    option.value = "";

    option.textContent =
        defaultText;

    select.appendChild(
        option
    );
}


function populateFilters() {

    // ========================================================
    // STAFF
    // ========================================================

    clearSelect(
        staffSelect,
        "All Staff"
    );


    const staffValues =
        new Map();


    allPayments.forEach(
        payment => {

            if (
                payment.staffId
            ) {

                staffValues.set(
                    String(
                        payment.staffId
                    ),
                    payment.staffName
                );
            }

        }
    );


    allStaff.forEach(
        staff => {

            const id =
                staff.id ||
                firstValue(
                    staff,
                    [
                        "staffId",
                        "staffCode"
                    ]
                );

            const name =
                firstValue(
                    staff,
                    [
                        "name",
                        "staffName",
                        "fullName"
                    ],
                    id
                );

            if (id) {

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
                first,
                second
            ) =>
                String(
                    first[1]
                ).localeCompare(
                    String(
                        second[1]
                    )
                )
        )
        .forEach(
            (
                [id, name]
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    id;

                option.textContent =
                    name ||
                    id;

                staffSelect?.appendChild(
                    option
                );

            }
        );


    // ========================================================
    // CUSTOMER
    // ========================================================

    clearSelect(
        customerSelect,
        "All Customers"
    );


    const customerValues =
        new Map();


    allPayments.forEach(
        payment => {

            if (
                payment.customerId
            ) {

                customerValues.set(
                    String(
                        payment.customerId
                    ),
                    payment.customerName
                );
            }

        }
    );


    allCustomers.forEach(
        customer => {

            const id =
                customer.id ||
                firstValue(
                    customer,
                    [
                        "customerId"
                    ]
                );

            const name =
                firstValue(
                    customer,
                    [
                        "name",
                        "customerName",
                        "fullName"
                    ],
                    id
                );

            if (id) {

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
                first,
                second
            ) =>
                String(
                    first[1]
                ).localeCompare(
                    String(
                        second[1]
                    )
                )
        )
        .forEach(
            (
                [id, name]
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    id;

                option.textContent =
                    name ||
                    id;

                customerSelect?.appendChild(
                    option
                );

            }
        );


    // ========================================================
    // LOAN
    // ========================================================

    clearSelect(
        loanSelect,
        "All Loans"
    );


    const loanValues =
        new Map();


    allPayments.forEach(
        payment => {

            if (
                payment.loanId
            ) {

                loanValues.set(
                    String(
                        payment.loanId
                    ),
                    payment.loanNumber ||
                    payment.loanId
                );
            }

        }
    );


    allLoans.forEach(
        loan => {

            const id =
                loan.id ||
                firstValue(
                    loan,
                    [
                        "loanId",
                        "loanNumber"
                    ]
                );

            const name =
                firstValue(
                    loan,
                    [
                        "loanId",
                        "loanNumber",
                        "loanCode"
                    ],
                    id
                );

            if (id) {

                loanValues.set(
                    String(id),
                    name
                );
            }

        }
    );


    [
        ...loanValues.entries()
    ]
        .sort(
            (
                first,
                second
            ) =>
                String(
                    first[1]
                ).localeCompare(
                    String(
                        second[1]
                    )
        )
        )
        .forEach(
            (
                [id, name]
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    id;

                option.textContent =
                    name ||
                    id;

                loanSelect?.appendChild(
                    option
                );

            }
        );
}


// ============================================================
// APPLY SEARCH
// ============================================================

function applySearch() {

    const fromDate =
        fromDateInput?.value || "";

    const toDate =
        toDateInput?.value || "";


    const from =
        parseDateValue(
            fromDate
        );

    const to =
        parseDateValue(
            toDate
        );


    // End date inclusive
    if (to) {

        to.setHours(
            23,
            59,
            59,
            999
        );
    }


    const selectedStaff =
        staffSelect?.value || "";

    const selectedCustomer =
        customerSelect?.value || "";

    const selectedLoan =
        loanSelect?.value || "";


    filteredPayments =
        allPayments.filter(
            payment => {

                const paymentDate =
                    parseDateValue(
                        payment.paymentDate
                    );


                if (
                    from &&
                    (
                        !paymentDate ||
                        paymentDate < from
                    )
                ) {
                    return false;
                }


                if (
                    to &&
                    (
                        !paymentDate ||
                        paymentDate > to
                    )
                ) {
                    return false;
                }


                if (
                    selectedStaff &&
                    String(
                        payment.staffId
                    ) !==
                    String(
                        selectedStaff
                    )
                ) {
                    return false;
                }


                if (
                    selectedCustomer &&
                    String(
                        payment.customerId
                    ) !==
                    String(
                        selectedCustomer
                    )
                ) {
                    return false;
                }


                if (
                    selectedLoan &&
                    String(
                        payment.loanId
                    ) !==
                    String(
                        selectedLoan
                    )
                ) {
                    return false;
                }


                return true;

            }
        );


    renderReport();
}


// ============================================================
// SUMMARY
// ============================================================

function updateSummary(
    payments
) {

    let due =
        0;

    let paid =
        0;

    let pending =
        0;

    let penalty =
        0;

    let collection =
        0;


    payments.forEach(
        payment => {

            due +=
                numberValue(
                    payment.dueAmount
                );

            paid +=
                numberValue(
                    payment.paidAmount
                );

            pending +=
                numberValue(
                    payment.pendingAmount
                );

            penalty +=
                numberValue(
                    payment.penalty
                );

            collection +=
                numberValue(
                    payment.totalCollection
                );

        }
    );


    if (totalDueElement) {

        totalDueElement.textContent =
            formatCurrency(due);
    }


    if (totalPaidElement) {

        totalPaidElement.textContent =
            formatCurrency(paid);
    }


    if (totalPendingElement) {

        totalPendingElement.textContent =
            formatCurrency(pending);
    }


    if (totalPenaltyElement) {

        totalPenaltyElement.textContent =
            formatCurrency(penalty);
    }


    if (totalCollectionElement) {

        totalCollectionElement.textContent =
            formatCurrency(collection);
    }
}


// ============================================================
// TABLE HEADER
// ============================================================

function setTableHeader(
    headers
) {

    if (!reportTableHead) {

        if (!reportTable) {
            return;
        }

        reportTableHead =
            document.createElement(
                "thead"
            );

        reportTable.insertBefore(
            reportTableHead,
            reportTable.firstChild
        );
    }


    reportTableHead.innerHTML =
        `
        <tr>
            ${
                headers.map(
                    header =>
                        `<th>${escapeHTML(header)}</th>`
                ).join("")
            }
        </tr>
        `;
}


// ============================================================
// DATE WISE
// ============================================================

function renderDateWise(
    payments
) {

    setTableHeader([
        "DATE",
        "COLLECTIONS",
        "DUE AMOUNT",
        "EMI PAID",
        "EMI PENDING",
        "PENALTY",
        "TOTAL COLLECTION",
        "ACTIONS"
    ]);


    const grouped =
        new Map();


    payments.forEach(
        payment => {

            const key =
                dateKey(
                    payment.paymentDate
                ) ||
                "unknown";


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        date:
                            payment.paymentDate,

                        count:
                            0,

                        due:
                            0,

                        paid:
                            0,

                        pending:
                            0,

                        penalty:
                            0,

                        total:
                            0
                    }
                );
            }


            const item =
                grouped.get(key);


            item.count++;

            item.due +=
                payment.dueAmount;

            item.paid +=
                payment.paidAmount;

            item.pending +=
                payment.pendingAmount;

            item.penalty +=
                payment.penalty;

            item.total +=
                payment.totalCollection;

        }
    );


    const rows =
        [
            ...grouped.values()
        ]
        .sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    parseDateValue(
                        first.date
                    );

                const secondDate =
                    parseDateValue(
                        second.date
                    );

                return (
                    (
                        firstDate?.getTime() ||
                        0
                    ) -
                    (
                        secondDate?.getTime() ||
                        0
                    )
                );

            }
        );


    if (!rows.length) {

        renderEmpty(
            8,
            "No collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        rows.map(
            row =>
                `
                <tr>

                    <td>
                        ${formatDate(row.date)}
                    </td>

                    <td>
                        ${formatNumber(row.count)}
                    </td>

                    <td>
                        ${formatCurrency(row.due)}
                    </td>

                    <td>
                        ${formatCurrency(row.paid)}
                    </td>

                    <td>
                        ${formatCurrency(row.pending)}
                    </td>

                    <td>
                        ${formatCurrency(row.penalty)}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(row.total)}
                        </strong>
                    </td>

                    <td>
                        <button
                            class="report-view-btn"
                            data-date="${escapeHTML(
                                dateKey(row.date)
                            )}"
                        >
                            View
                        </button>
                    </td>

                </tr>
                `
        )
        .join("");


    attachDateViewButtons();
}


// ============================================================
// DATE DETAILS
// ============================================================

function attachDateViewButtons() {

    document
        .querySelectorAll(
            ".report-view-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const selectedDate =
                            button.dataset.date;

                        const records =
                            filteredPayments.filter(
                                payment =>
                                    dateKey(
                                        payment.paymentDate
                                    ) ===
                                    selectedDate
                            );

                        renderDetailTable(
                            records,
                            `Collection Details - ${formatDate(selectedDate)}`
                        );

                    }
                );

            }
        );
}


// ============================================================
// DETAIL TABLE
// ============================================================

function renderDetailTable(
    payments,
    title
) {

    setTableHeader([
        "DATE",
        "STAFF",
        "CUSTOMER",
        "LOAN",
        "VEHICLE",
        "DUE",
        "EMI PAID",
        "PENDING",
        "PENALTY",
        "TOTAL",
        "MODE",
        "REMARKS"
    ]);


    if (!payments.length) {

        renderEmpty(
            12,
            "No collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        payments.map(
            payment =>
                `
                <tr>

                    <td>
                        ${formatDate(payment.paymentDate)}
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.staffName
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                payment.customerName
                            )}
                        </strong>

                        ${
                            payment.customerId
                                ? `
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                        "
                                    >
                                        ${escapeHTML(
                                            payment.customerId
                                        )}
                                    </div>
                                  `
                                : ""
                        }
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.loanNumber
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.vehicleNumber ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            payment.dueAmount
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            payment.paidAmount
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            payment.pendingAmount
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            payment.penalty
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(
                                payment.totalCollection
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.paymentMode
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.remarks
                        )}
                    </td>

                </tr>
                `
        )
        .join("");
}


// ============================================================
// WEEK WISE
// ============================================================

function getWeekStart(
    date
) {

    const result =
        new Date(date);

    const day =
        result.getDay();

    const diff =
        day === 0
            ? -6
            : 1 - day;

    result.setDate(
        result.getDate() + diff
    );

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;
}


function renderWeekWise(
    payments
) {

    setTableHeader([
        "WEEK",
        "COLLECTIONS",
        "DUE AMOUNT",
        "EMI PAID",
        "EMI PENDING",
        "PENALTY",
        "TOTAL COLLECTION"
    ]);


    const grouped =
        new Map();


    payments.forEach(
        payment => {

            const date =
                parseDateValue(
                    payment.paymentDate
                );

            if (!date) {
                return;
            }


            const weekStart =
                getWeekStart(date);

            const key =
                dateKey(
                    weekStart
                );


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        date:
                            weekStart,

                        count:
                            0,

                        due:
                            0,

                        paid:
                            0,

                        pending:
                            0,

                        penalty:
                            0,

                        total:
                            0
                    }
                );
            }


            const item =
                grouped.get(key);


            item.count++;

            item.due +=
                payment.dueAmount;

            item.paid +=
                payment.paidAmount;

            item.pending +=
                payment.pendingAmount;

            item.penalty +=
                payment.penalty;

            item.total +=
                payment.totalCollection;

        }
    );


    const rows =
        [...grouped.values()]
            .sort(
                (
                    first,
                    second
                ) =>
                    first.date -
                    second.date
            );


    if (!rows.length) {

        renderEmpty(
            7,
            "No weekly collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        rows.map(
            row => {

                const weekEnd =
                    new Date(
                        row.date
                    );

                weekEnd.setDate(
                    weekEnd.getDate() + 6
                );


                return `
                <tr>

                    <td>
                        ${formatDate(row.date)}
                        -
                        ${formatDate(weekEnd)}
                    </td>

                    <td>
                        ${formatNumber(row.count)}
                    </td>

                    <td>
                        ${formatCurrency(row.due)}
                    </td>

                    <td>
                        ${formatCurrency(row.paid)}
                    </td>

                    <td>
                        ${formatCurrency(row.pending)}
                    </td>

                    <td>
                        ${formatCurrency(row.penalty)}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(row.total)}
                        </strong>
                    </td>

                </tr>
                `;

            }
        )
        .join("");
}


// ============================================================
// MONTH WISE
// ============================================================

function renderMonthWise(
    payments
) {

    setTableHeader([
        "MONTH",
        "COLLECTIONS",
        "DUE AMOUNT",
        "EMI PAID",
        "EMI PENDING",
        "PENALTY",
        "TOTAL COLLECTION"
    ]);


    const grouped =
        new Map();


    payments.forEach(
        payment => {

            const date =
                parseDateValue(
                    payment.paymentDate
                );

            if (!date) {
                return;
            }


            const key =
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        date,

                        count:
                            0,

                        due:
                            0,

                        paid:
                            0,

                        pending:
                            0,

                        penalty:
                            0,

                        total:
                            0
                    }
                );
            }


            const item =
                grouped.get(key);


            item.count++;

            item.due +=
                payment.dueAmount;

            item.paid +=
                payment.paidAmount;

            item.pending +=
                payment.pendingAmount;

            item.penalty +=
                payment.penalty;

            item.total +=
                payment.totalCollection;

        }
    );


    const rows =
        [...grouped.values()]
            .sort(
                (
                    first,
                    second
                ) =>
                    first.date -
                    second.date
            );


    if (!rows.length) {

        renderEmpty(
            7,
            "No monthly collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        rows.map(
            row =>
                `
                <tr>

                    <td>
                        ${row.date.toLocaleDateString(
                            "en-IN",
                            {
                                month: "long",
                                year: "numeric"
                            }
                        )}
                    </td>

                    <td>
                        ${formatNumber(row.count)}
                    </td>

                    <td>
                        ${formatCurrency(row.due)}
                    </td>

                    <td>
                        ${formatCurrency(row.paid)}
                    </td>

                    <td>
                        ${formatCurrency(row.pending)}
                    </td>

                    <td>
                        ${formatCurrency(row.penalty)}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(row.total)}
                        </strong>
                    </td>

                </tr>
                `
        )
        .join("");
}


// ============================================================
// STAFF WISE
// ============================================================

function renderStaffWise(
    payments
) {

    setTableHeader([
        "STAFF",
        "COLLECTIONS",
        "CUSTOMERS",
        "EMI PAID",
        "PENALTY",
        "TOTAL COLLECTION"
    ]);


    const grouped =
        new Map();


    payments.forEach(
        payment => {

            const key =
                payment.staffId ||
                payment.staffName ||
                "unknown";


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        name:
                            payment.staffName,

                        count:
                            0,

                        customers:
                            new Set(),

                        paid:
                            0,

                        penalty:
                            0,

                        total:
                            0
                    }
                );
            }


            const item =
                grouped.get(key);


            item.count++;

            if (
                payment.customerId
            ) {

                item.customers.add(
                    String(
                        payment.customerId
                    )
                );
            }

            item.paid +=
                payment.paidAmount;

            item.penalty +=
                payment.penalty;

            item.total +=
                payment.totalCollection;

        }
    );


    const rows =
        [...grouped.values()]
            .sort(
                (
                    first,
                    second
                ) =>
                    String(
                        first.name
                    ).localeCompare(
                        String(
                            second.name
                        )
                    )
            );


    if (!rows.length) {

        renderEmpty(
            6,
            "No staff collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        rows.map(
            row =>
                `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                row.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatNumber(
                            row.count
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            row.customers.size
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            row.paid
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            row.penalty
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(
                                row.total
                            )}
                        </strong>
                    </td>

                </tr>
                `
        )
        .join("");
}


// ============================================================
// CUSTOMER WISE
// ============================================================

function renderCustomerWise(
    payments
) {

    setTableHeader([
        "CUSTOMER",
        "LOANS",
        "COLLECTIONS",
        "EMI PAID",
        "PENALTY",
        "PENDING",
        "TOTAL COLLECTION"
    ]);


    const grouped =
        new Map();


    payments.forEach(
        payment => {

            const key =
                payment.customerId ||
                payment.customerName ||
                "unknown";


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        name:
                            payment.customerName,

                        loans:
                            new Set(),

                        count:
                            0,

                        paid:
                            0,

                        penalty:
                            0,

                        pending:
                            0,

                        total:
                            0
                    }
                );
            }


            const item =
                grouped.get(key);


            item.count++;


            if (
                payment.loanId
            ) {

                item.loans.add(
                    String(
                        payment.loanId
                    )
                );
            }


            item.paid +=
                payment.paidAmount;

            item.penalty +=
                payment.penalty;

            item.pending +=
                payment.pendingAmount;

            item.total +=
                payment.totalCollection;

        }
    );


    const rows =
        [...grouped.values()]
            .sort(
                (
                    first,
                    second
                ) =>
                    String(
                        first.name
                    ).localeCompare(
                        String(
                            second.name
                        )
                    )
            );


    if (!rows.length) {

        renderEmpty(
            7,
            "No customer collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        rows.map(
            row =>
                `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                row.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatNumber(
                            row.loans.size
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            row.count
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            row.paid
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            row.penalty
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            row.pending
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(
                                row.total
                            )}
                        </strong>
                    </td>

                </tr>
                `
        )
        .join("");
}


// ============================================================
// RENDER REPORT
// ============================================================

function renderReport() {

    if (!reportTable) {

        console.error(
            "Collection report table not found."
        );

        return;
    }


    if (!reportTableBody) {

        reportTableBody =
            reportTable.querySelector(
                "tbody"
            );

        if (!reportTableBody) {

            reportTableBody =
                document.createElement(
                    "tbody"
                );

            reportTable.appendChild(
                reportTableBody
            );
        }
    }


    updateSummary(
        filteredPayments
    );


    switch (
        currentView
    ) {

        case "week":

            renderWeekWise(
                filteredPayments
            );

            break;


        case "month":

            renderMonthWise(
                filteredPayments
            );

            break;


        case "staff":

            renderStaffWise(
                filteredPayments
            );

            break;


        case "customer":

            renderCustomerWise(
                filteredPayments
            );

            break;


        default:

            renderDateWise(
                filteredPayments
            );

            break;
    }
}


// ============================================================
// EMPTY
// ============================================================

function renderEmpty(
    colspan,
    message
) {

    if (!reportTableBody) {
        return;
    }


    reportTableBody.innerHTML =
        `
        <tr>

            <td
                colspan="${colspan}"
                style="
                    text-align:center;
                    padding:30px;
                    color:#64748b;
                "
            >
                ${escapeHTML(message)}
            </td>

        </tr>
        `;
}


// ============================================================
// LOADING
// ============================================================

function showLoading() {

    if (!reportTableBody) {
        return;
    }


    reportTableBody.innerHTML =
        `
        <tr>

            <td
                colspan="12"
                style="
                    text-align:center;
                    padding:30px;
                    color:#64748b;
                "
            >
                Loading collection report...
            </td>

        </tr>
        `;
}


// ============================================================
// ERROR
// ============================================================

function showError(
    message
) {

    if (!reportTableBody) {
        return;
    }


    reportTableBody.innerHTML =
        `
        <tr>

            <td
                colspan="12"
                style="
                    text-align:center;
                    padding:30px;
                    color:#dc2626;
                "
            >
                ${escapeHTML(message)}
            </td>

        </tr>
        `;
}


// ============================================================
// VIEW BUTTONS
// ============================================================

function setupViewButtons() {

    const buttons =
        [
            ...document.querySelectorAll(
                "button"
            )
        ];


    buttons.forEach(
        button => {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            if (
                text === "date wise"
            ) {

                button.addEventListener(
                    "click",
                    () => {

                        currentView =
                            "date";

                        renderReport();

                    }
                );

            }


            else if (
                text === "week wise"
            ) {

                button.addEventListener(
                    "click",
                    () => {

                        currentView =
                            "week";

                        renderReport();

                    }
                );

            }


            else if (
                text === "month wise"
            ) {

                button.addEventListener(
                    "click",
                    () => {

                        currentView =
                            "month";

                        renderReport();

                    }
                );

            }


            else if (
                text === "staff wise"
            ) {

                button.addEventListener(
                    "click",
                    () => {

                        currentView =
                            "staff";

                        renderReport();

                    }
                );

            }


            else if (
                text === "customer wise"
            ) {

                button.addEventListener(
                    "click",
                    () => {

                        currentView =
                            "customer";

                        renderReport();

                    }
                );

            }

        }
    );
}


// ============================================================
// SEARCH BUTTON
// ============================================================

if (searchButton) {

    searchButton.addEventListener(
        "click",
        () => {

            currentView =
                "date";

            applySearch();

        }
    );
}


// ============================================================
// FILTER CHANGE
// ============================================================

[
    fromDateInput,
    toDateInput,
    staffSelect,
    customerSelect,
    loanSelect
]
    .filter(Boolean)
    .forEach(
        element => {

            element.addEventListener(
                "change",
                () => {

                    // Do not automatically change view
                    // when dropdown changes.
                    applySearch();

                }
            );

        }
    );


// ============================================================
// PRINT
// ============================================================

if (printButton) {

    printButton.addEventListener(
        "click",
        () => {

            window.print();

        }
    );
}


// ============================================================
// DOWNLOAD CSV
// ============================================================

if (downloadButton) {

    downloadButton.addEventListener(
        "click",
        downloadCSV
    );
}


function downloadCSV() {

    if (
        !filteredPayments.length
    ) {

        alert(
            "No collection records available."
        );

        return;
    }


    const rows = [];


    rows.push([
        "Date",
        "Staff",
        "Customer",
        "Customer ID",
        "Loan",
        "Vehicle",
        "Due Amount",
        "EMI Paid",
        "EMI Pending",
        "Penalty",
        "Total Collection",
        "Payment Mode",
        "Receipt",
        "Balance",
        "Remarks"
    ]);


    filteredPayments.forEach(
        payment => {

            rows.push([

                formatDate(
                    payment.paymentDate
                ),

                payment.staffName,

                payment.customerName,

                payment.customerId,

                payment.loanNumber,

                payment.vehicleNumber,

                payment.dueAmount,

                payment.paidAmount,

                payment.pendingAmount,

                payment.penalty,

                payment.totalCollection,

                payment.paymentMode,

                payment.receiptNumber,

                payment.balanceAfterPayment,

                payment.remarks

            ]);

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row.map(
                        value =>
                            `"${String(
                                value ?? ""
                            )
                            .replace(
                                /"/g,
                                '""'
                            )}"`
                    )
                    .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [
                "\ufeff" +
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    link.download =
        `SR-Auto-Finance-Collection-Report-${getToday()}.csv`;


    document.body.appendChild(
        link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );
}


// ============================================================
// INITIAL DATE
// ============================================================

function setDefaultDates() {

    if (
        fromDateInput &&
        !fromDateInput.value
    ) {

        fromDateInput.value =
            getFirstDayOfMonth();
    }


    if (
        toDateInput &&
        !toDateInput.value
    ) {

        toDateInput.value =
            getToday();
    }
}


// ============================================================
// START
// ============================================================

setDefaultDates();

setupViewButtons();

loadAllData();
