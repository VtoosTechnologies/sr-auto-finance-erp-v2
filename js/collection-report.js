// ============================================================
// SR AUTO FINANCE ERP
// COLLECTION REPORT
// File: js/collection-report.js
//
// UPDATED VERSION
//
// PRIMARY COLLECTION MASTER:
//     collections
//
// LEGACY FALLBACK:
//     payments
//
// Supports:
//     Owner Collection
//     Staff Collection
//     Collection Document ID
//     Receipt Number
//     Collector ID
//     Collector Role
//     Date Wise
//     Week Wise
//     Month Wise
//     Staff Wise
//     Customer Wise
//     Loan Filter
//     CSV Download
//     Print
//
// IMPORTANT:
// Existing collection-report.html can continue to be used.
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

let allCollections = [];
let allCustomers = [];
let allLoans = [];
let allStaff = [];

let customerMap = new Map();
let loanMap = new Map();
let staffMap = new Map();

let filteredCollections = [];

let currentView = "date";


// ============================================================
// ELEMENTS
// ============================================================

const allInputs =
    [...document.querySelectorAll("input")];

const allSelects =
    [...document.querySelectorAll("select")];

const fromDateInput =
    document.getElementById("fromDate") ||
    allInputs.find(
        input => input.type === "date"
    );

const toDateInput =
    document.getElementById("toDate") ||
    allInputs.filter(
        input => input.type === "date"
    )[1];

const staffSelect =
    document.getElementById("staffSelect") ||
    allSelects[0];

const customerSelect =
    document.getElementById("customerSelect") ||
    allSelects[1];

const loanSelect =
    document.getElementById("loanSelect") ||
    allSelects[2];

const searchButton =
    document.getElementById("searchBtn") ||
    [...document.querySelectorAll("button")]
        .find(
            button =>
                button.textContent
                    .trim()
                    .toLowerCase() === "search"
        );

const printButton =
    document.getElementById("printBtn") ||
    [...document.querySelectorAll("button")]
        .find(
            button =>
                button.textContent
                    .trim()
                    .toLowerCase() === "print"
        );

const downloadButton =
    document.getElementById("downloadBtn") ||
    [...document.querySelectorAll("button")]
        .find(
            button =>
                button.textContent
                    .trim()
                    .toLowerCase() === "download"
        );


// ============================================================
// SUMMARY ELEMENTS
// ============================================================

const totalDueElement =
    document.getElementById("sumDue");

const totalPaidElement =
    document.getElementById("sumPaid");

const totalPendingElement =
    document.getElementById("sumPending");

const totalPenaltyElement =
    document.getElementById("sumPenalty");

const totalCollectionElement =
    document.getElementById("sumTotal");


// ============================================================
// TABLE
// ============================================================

function getReportTable() {

    const tables =
        [...document.querySelectorAll("table")];

    if (!tables.length) {
        return null;
    }

    const matching =
        tables.find(
            table =>
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
// BASIC HELPERS
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

        if (value instanceof Date) {

            return isNaN(value.getTime())
                ? null
                : value;
        }

        if (typeof value === "number") {

            const date =
                new Date(value);

            return isNaN(date.getTime())
                ? null
                : date;
        }

        const text =
            String(value).trim();

        if (!text) {
            return null;
        }

        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(text)
        ) {

            const [
                year,
                month,
                day
            ] =
                text
                    .split("-")
                    .map(Number);

            return new Date(
                year,
                month - 1,
                day
            );
        }

        const date =
            new Date(text);

        return isNaN(date.getTime())
            ? null
            : date;

    } catch {

        return null;
    }
}


function dateKey(value) {

    const date =
        parseDateValue(value);

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


function formatDate(value) {

    const date =
        parseDateValue(value);

    if (!date) {
        return "-";
    }

    return date.toLocaleDateString(
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
// GENERIC FIELD HELPER
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
// NORMALIZE COLLECTION
//
// IMPORTANT:
//
// Current collection-form writes:
//     collections
//
// Document ID itself is preserved as:
//     collectionId
//
// Receipt:
//     receiptNo
//
// Owner / Staff:
//     collectorRole
//     collectorUid
//     collectorStaffId
//     collectorName
//
// ============================================================

function normalizeCollection(
    raw,
    documentId
) {

    const customerId =
        firstValue(
            raw,
            [
                "customerId"
            ]
        );

    const loanId =
        firstValue(
            raw,
            [
                "loanId",
                "loanNumber",
                "loanDocumentId"
            ]
        );

    const loanDocumentId =
        firstValue(
            raw,
            [
                "loanDocumentId"
            ]
        );

    const customer =
        customerMap.get(
            String(customerId)
        ) || {};

    const loan =
        loanMap.get(
            String(loanDocumentId || loanId)
        ) || {};

    const staffId =
        firstValue(
            raw,
            [
                "staffId",
                "collectorStaffId"
            ]
        );

    const staff =
        staffMap.get(
            String(staffId)
        ) || {};

    const role =
        String(
            firstValue(
                raw,
                [
                    "collectorRole",
                    "role"
                ],
                ""
            )
        )
            .trim()
            .toLowerCase();

    const isOwner =
        role === "owner" ||
        role === "admin" ||
        role === "administrator" ||
        !staffId && (
            role === "" ||
            firstValue(
                raw,
                [
                    "collectorUid",
                    "createdByUid",
                    "createdBy"
                ],
                ""
            )
        );


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    const customerName =
        firstValue(
            raw,
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
            raw,
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
            raw,
            [
                "loanId",
                "loanNumber",
                "loanCode"
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
        loanDocumentId ||
        "-";


    const vehicleNumber =
        firstValue(
            raw,
            [
                "vehicleNumber",
                "vehicleNo"
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
    // COLLECTOR
    // --------------------------------------------------------

    const collectorName =
        firstValue(
            raw,
            [
                "collectorName",
                "staffName"
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
        (
            isOwner
                ? "Owner"
                : "-"
        );


    const collectorId =
        firstValue(
            raw,
            [
                "collectorStaffId",
                "staffId",
                "collectorUid",
                "staffDocumentId",
                "createdByUid",
                "createdBy"
            ]
        ) ||
        firstValue(
            staff,
            [
                "staffId",
                "staffCode",
                "employeeId"
            ]
        ) ||
        (
            isOwner
                ? "OWNER"
                : ""
        );


    const collectorRole =
        isOwner
            ? "Owner"
            : (
                role ||
                "Staff"
            );


    // --------------------------------------------------------
    // AMOUNT
    // --------------------------------------------------------

    const amount =
        numberValue(
            firstValue(
                raw,
                [
                    "paidAmount",
                    "amount",
                    "amountReceived",
                    "totalReceived",
                    "paymentAmount"
                ],
                0
            )
        );


    const penalty =
        numberValue(
            firstValue(
                raw,
                [
                    "penalty",
                    "penaltyAmount",
                    "penaltyCollected"
                ],
                0
            )
        );


    const dueAmount =
        numberValue(
            firstValue(
                raw,
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


    const pendingAmount =
        numberValue(
            firstValue(
                raw,
                [
                    "pendingAmount",
                    "emiPending",
                    "installmentPending"
                ],
                0
            )
        );


    const totalCollection =
        numberValue(
            firstValue(
                raw,
                [
                    "totalCollection",
                    "totalReceived"
                ],
                0
            )
        ) ||
        (
            amount +
            penalty
        );


    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    const paymentDate =
        firstValue(
            raw,
            [
                "paymentDate",
                "collectionDate",
                "date",
                "createdAt"
            ]
        );


    // --------------------------------------------------------
    // IDS
    // --------------------------------------------------------

    const receiptNumber =
        firstValue(
            raw,
            [
                "receiptNo",
                "receiptNumber",
                "receiptId"
            ],
            "-"
        );


    const collectionId =
        documentId ||
        firstValue(
            raw,
            [
                "collectionId"
            ],
            "-"
        );


    return {

        id:
            documentId,

        collectionId,

        receiptNumber,

        loanDocumentId,

        loanId,

        loanNumber,

        customerId,

        customerName,

        customerMobile,

        vehicleNumber,

        collectorId,

        collectorName,

        collectorRole,

        staffId,

        paymentDate,

        dueAmount,

        paidAmount:
            amount,

        pendingAmount,

        penalty,

        totalCollection,

        balanceBeforePayment:
            numberValue(
                firstValue(
                    raw,
                    [
                        "balanceBeforePayment",
                        "previousOutstanding"
                    ],
                    0
                )
            ),

        balanceAfterPayment:
            numberValue(
                firstValue(
                    raw,
                    [
                        "balanceAfterPayment",
                        "outstandingAfterPayment",
                        "balanceAmount"
                    ],
                    0
                )
            ),

        paymentMode:
            firstValue(
                raw,
                [
                    "paymentMode",
                    "mode"
                ],
                "-"
            ),

        referenceNumber:
            firstValue(
                raw,
                [
                    "referenceNumber",
                    "referenceNo"
                ],
                ""
            ),

        remarks:
            firstValue(
                raw,
                [
                    "remarks",
                    "remark"
                ],
                ""
            ),

        status:
            String(
                firstValue(
                    raw,
                    [
                        "status"
                    ],
                    "Success"
                )
            )
                .trim()
                .toLowerCase(),

        createdAt:
            raw.createdAt,

        createdBy:
            firstValue(
                raw,
                [
                    "createdByUid",
                    "createdBy"
                ],
                ""
            )

    };
}


// ============================================================
// LOAD SUPPORTING DATA
// ============================================================

async function loadSupportData() {

    const [
        customersSnapshot,
        loansSnapshot,
        staffSnapshot
    ] =
        await Promise.all([

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


    // --------------------------------------------------------
    // CUSTOMERS
    // --------------------------------------------------------

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
                String(docSnap.id),
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
                    String(customerId),
                    customer
                );
            }

        }
    );


    // --------------------------------------------------------
    // LOANS
    // --------------------------------------------------------

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
                String(docSnap.id),
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
                    String(loanId),
                    loan
                );
            }

        }
    );


    // --------------------------------------------------------
    // STAFF
    // --------------------------------------------------------

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
                String(docSnap.id),
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
                    String(staffId),
                    staff
                );
            }

        }
    );

}


// ============================================================
// LOAD COLLECTIONS
//
// CURRENT SYSTEM:
// collections
//
// If collections has data:
//     use collections only.
//
// If collections is completely empty:
//     fallback to payments.
//
// This prevents duplicate collection reporting.
// ============================================================

async function loadAllData() {

    showLoading();

    try {

        await loadSupportData();


        // ====================================================
        // PRIMARY COLLECTION MASTER
        // ====================================================

        const collectionsSnapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        let rawCollections = [];


        collectionsSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();

                const status =
                    String(
                        firstValue(
                            data,
                            [
                                "status"
                            ],
                            "Success"
                        )
                    )
                        .trim()
                        .toLowerCase();


                if (
                    status === "cancelled" ||
                    status === "canceled" ||
                    status === "reversed" ||
                    status === "deleted"
                ) {

                    return;
                }


                rawCollections.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


        // ====================================================
        // LEGACY FALLBACK
        // ====================================================

        if (
            rawCollections.length === 0
        ) {

            try {

                const paymentsSnapshot =
                    await getDocs(
                        collection(
                            db,
                            "payments"
                        )
                    );


                paymentsSnapshot.forEach(
                    docSnap => {

                        const data =
                            docSnap.data();

                        const status =
                            String(
                                firstValue(
                                    data,
                                    [
                                        "status"
                                    ],
                                    "Success"
                                )
                            )
                                .trim()
                                .toLowerCase();


                        if (
                            status === "cancelled" ||
                            status === "canceled" ||
                            status === "reversed" ||
                            status === "deleted"
                        ) {

                            return;
                        }


                        rawCollections.push({

                            id:
                                docSnap.id,

                            ...data

                        });

                    }
                );

            } catch (
                legacyError
            ) {

                console.warn(
                    "Legacy payments fallback unavailable:",
                    legacyError
                );

            }

        }


        allCollections =
            rawCollections
                .map(
                    item =>
                        normalizeCollection(
                            item,
                            item.id
                        )
                )
                .filter(
                    item =>
                        item.status !==
                            "cancelled" &&
                        item.status !==
                            "canceled" &&
                        item.status !==
                            "reversed" &&
                        item.status !==
                            "deleted"
                );


        allCollections.sort(
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
                    (
                        secondDate?.getTime() ||
                        0
                    ) -
                    (
                        firstDate?.getTime() ||
                        0
                    )
                );

            }
        );


        populateFilters();

        applySearch();


        console.log(
            "SR Auto Finance Collection Report loaded:",
            {
                collections:
                    allCollections.length,

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
// SELECT HELPERS
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


// ============================================================
// POPULATE FILTERS
// ============================================================

function populateFilters() {

    // --------------------------------------------------------
    // STAFF / OWNER
    // --------------------------------------------------------

    clearSelect(
        staffSelect,
        "All Collectors"
    );


    const collectorValues =
        new Map();


    allCollections.forEach(
        item => {

            if (
                item.collectorId
            ) {

                collectorValues.set(
                    String(
                        item.collectorId
                    ),
                    `${
                        item.collectorName ||
                        "Unknown"
                    } - ${
                        item.collectorRole ||
                        "Staff"
                    }`
                );

            }

        }
    );


    [
        ...collectorValues.entries()
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
                    name;

                staffSelect?.appendChild(
                    option
                );

            }
        );


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    clearSelect(
        customerSelect,
        "All Customers"
    );


    const customerValues =
        new Map();


    allCollections.forEach(
        item => {

            if (
                item.customerId
            ) {

                customerValues.set(
                    String(
                        item.customerId
                    ),
                    item.customerName ||
                    item.customerId
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
                    name;

                customerSelect?.appendChild(
                    option
                );

            }
        );


    // --------------------------------------------------------
    // LOAN
    // --------------------------------------------------------

    clearSelect(
        loanSelect,
        "All Loans"
    );


    const loanValues =
        new Map();


    allCollections.forEach(
        item => {

            if (
                item.loanId ||
                item.loanNumber
            ) {

                const id =
                    String(
                        item.loanId ||
                        item.loanNumber
                    );

                loanValues.set(
                    id,
                    item.loanNumber ||
                    id
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
                    name;

                loanSelect?.appendChild(
                    option
                );

            }
        );

}


// ============================================================
// SEARCH / FILTER
// ============================================================

function applySearch() {

    const fromText =
        fromDateInput?.value ||
        "";

    const toText =
        toDateInput?.value ||
        "";

    const from =
        parseDateValue(
            fromText
        );

    const to =
        parseDateValue(
            toText
        );


    if (to) {

        to.setHours(
            23,
            59,
            59,
            999
        );

    }


    const selectedCollector =
        staffSelect?.value ||
        "";

    const selectedCustomer =
        customerSelect?.value ||
        "";

    const selectedLoan =
        loanSelect?.value ||
        "";


    filteredCollections =
        allCollections.filter(
            item => {

                const itemDate =
                    parseDateValue(
                        item.paymentDate
                    );


                if (
                    from &&
                    (
                        !itemDate ||
                        itemDate < from
                    )
                ) {

                    return false;
                }


                if (
                    to &&
                    (
                        !itemDate ||
                        itemDate > to
                    )
                ) {

                    return false;
                }


                if (
                    selectedCollector &&
                    String(
                        item.collectorId
                    ) !==
                    String(
                        selectedCollector
                    )
                ) {

                    return false;
                }


                if (
                    selectedCustomer &&
                    String(
                        item.customerId
                    ) !==
                    String(
                        selectedCustomer
                    )
                ) {

                    return false;
                }


                if (
                    selectedLoan
                ) {

                    const itemLoan =
                        String(
                            item.loanId ||
                            item.loanNumber ||
                            ""
                        );


                    if (
                        itemLoan !==
                        String(
                            selectedLoan
                        )
                    ) {

                        const loan =
                            loanMap.get(
                                String(
                                    selectedLoan
                                )
                            );


                        if (
                            !loan ||
                            String(
                                loan.id
                            ) !==
                            String(
                                item.loanDocumentId
                            )
                        ) {

                            return false;
                        }

                    }

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
    records
) {

    let due = 0;
    let paid = 0;
    let pending = 0;
    let penalty = 0;
    let total = 0;


    records.forEach(
        item => {

            due +=
                numberValue(
                    item.dueAmount
                );

            paid +=
                numberValue(
                    item.paidAmount
                );

            pending +=
                numberValue(
                    item.pendingAmount
                );

            penalty +=
                numberValue(
                    item.penalty
                );

            total +=
                numberValue(
                    item.totalCollection
                );

        }
    );


    if (totalDueElement) {

        totalDueElement.textContent =
            formatCurrency(
                due
            );

    }


    if (totalPaidElement) {

        totalPaidElement.textContent =
            formatCurrency(
                paid
            );

    }


    if (totalPendingElement) {

        totalPendingElement.textContent =
            formatCurrency(
                pending
            );

    }


    if (totalPenaltyElement) {

        totalPenaltyElement.textContent =
            formatCurrency(
                penalty
            );

    }


    if (totalCollectionElement) {

        totalCollectionElement.textContent =
            formatCurrency(
                total
            );

    }

}


// ============================================================
// TABLE HEADER
// ============================================================

function setTableHeader(
    headers
) {

    if (!reportTable) {
        return;
    }


    if (!reportTableHead) {

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
                headers
                    .map(
                        header =>
                            `<th>${escapeHTML(
                                header
                            )}</th>`
                    )
                    .join("")
            }
        </tr>
        `;

}


// ============================================================
// DATE WISE
// ============================================================

function renderDateWise(
    records
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


    records.forEach(
        item => {

            const key =
                dateKey(
                    item.paymentDate
                ) ||
                "unknown";


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        date:
                            item.paymentDate,

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


            const group =
                grouped.get(key);

            group.count++;

            group.due +=
                numberValue(
                    item.dueAmount
                );

            group.paid +=
                numberValue(
                    item.paidAmount
                );

            group.pending +=
                numberValue(
                    item.pendingAmount
                );

            group.penalty +=
                numberValue(
                    item.penalty
                );

            group.total +=
                numberValue(
                    item.totalCollection
                );

        }
    );


    const rows =
        [...grouped.values()]
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
        rows
            .map(
                row =>
                    `
                    <tr>

                        <td>
                            ${formatDate(
                                row.date
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                row.count
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.due
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.paid
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.pending
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

                        <td>
                            <button
                                class="report-view-btn"
                                data-date="${escapeHTML(
                                    dateKey(
                                        row.date
                                    )
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
// DATE DETAIL
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
                            filteredCollections.filter(
                                item =>
                                    dateKey(
                                        item.paymentDate
                                    ) ===
                                    selectedDate
                            );


                        renderDetailTable(
                            records
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
    records
) {

    setTableHeader([
        "DATE",
        "COLLECTION ID",
        "RECEIPT",
        "COLLECTOR",
        "ROLE",
        "COLLECTOR ID",
        "CUSTOMER",
        "LOAN",
        "VEHICLE",
        "DUE",
        "EMI PAID",
        "PENDING",
        "PENALTY",
        "TOTAL",
        "MODE",
        "BALANCE",
        "REMARKS"
    ]);


    if (!records.length) {

        renderEmpty(
            17,
            "No collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        records
            .map(
                item =>
                    `
                    <tr>

                        <td>
                            ${formatDate(
                                item.paymentDate
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    item.collectionId
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                item.receiptNumber
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.collectorName
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.collectorRole
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.collectorId
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    item.customerName
                                )}
                            </strong>

                            ${
                                item.customerId
                                    ? `
                                        <div
                                            style="
                                                font-size:10px;
                                                color:#64748b;
                                            "
                                        >
                                            ${escapeHTML(
                                                item.customerId
                                            )}
                                        </div>
                                      `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escapeHTML(
                                item.loanNumber
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.vehicleNumber ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                item.dueAmount
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                item.paidAmount
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                item.pendingAmount
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                item.penalty
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatCurrency(
                                    item.totalCollection
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                item.paymentMode
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                item.balanceAfterPayment
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.remarks
                            )}
                        </td>

                    </tr>
                    `
            )
            .join("");

}


// ============================================================
// WEEK START
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


// ============================================================
// WEEK WISE
// ============================================================

function renderWeekWise(
    records
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


    records.forEach(
        item => {

            const date =
                parseDateValue(
                    item.paymentDate
                );

            if (!date) {
                return;
            }


            const start =
                getWeekStart(
                    date
                );

            const key =
                dateKey(start);


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        date: start,
                        count: 0,
                        due: 0,
                        paid: 0,
                        pending: 0,
                        penalty: 0,
                        total: 0
                    }
                );

            }


            const group =
                grouped.get(key);

            group.count++;

            group.due +=
                numberValue(
                    item.dueAmount
                );

            group.paid +=
                numberValue(
                    item.paidAmount
                );

            group.pending +=
                numberValue(
                    item.pendingAmount
                );

            group.penalty +=
                numberValue(
                    item.penalty
                );

            group.total +=
                numberValue(
                    item.totalCollection
                );

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
        rows
            .map(
                row => {

                    const end =
                        new Date(
                            row.date
                        );

                    end.setDate(
                        end.getDate() + 6
                    );


                    return `
                    <tr>

                        <td>
                            ${formatDate(
                                row.date
                            )}
                            -
                            ${formatDate(
                                end
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                row.count
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.due
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.paid
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.pending
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
                    `;

                }
            )
            .join("");

}


// ============================================================
// MONTH WISE
// ============================================================

function renderMonthWise(
    records
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


    records.forEach(
        item => {

            const date =
                parseDateValue(
                    item.paymentDate
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
                        count: 0,
                        due: 0,
                        paid: 0,
                        pending: 0,
                        penalty: 0,
                        total: 0
                    }
                );

            }


            const group =
                grouped.get(key);

            group.count++;

            group.due +=
                numberValue(
                    item.dueAmount
                );

            group.paid +=
                numberValue(
                    item.paidAmount
                );

            group.pending +=
                numberValue(
                    item.pendingAmount
                );

            group.penalty +=
                numberValue(
                    item.penalty
                );

            group.total +=
                numberValue(
                    item.totalCollection
                );

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
        rows
            .map(
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
                            ${formatNumber(
                                row.count
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.due
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.paid
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                row.pending
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
// STAFF / OWNER WISE
// ============================================================

function renderStaffWise(
    records
) {

    setTableHeader([
        "COLLECTOR",
        "ROLE",
        "COLLECTOR ID",
        "COLLECTIONS",
        "CUSTOMERS",
        "EMI PAID",
        "PENALTY",
        "TOTAL COLLECTION"
    ]);


    const grouped =
        new Map();


    records.forEach(
        item => {

            const key =
                item.collectorId ||
                item.collectorName ||
                "unknown";


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        name:
                            item.collectorName,

                        role:
                            item.collectorRole,

                        id:
                            item.collectorId,

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


            const group =
                grouped.get(key);

            group.count++;

            if (
                item.customerId
            ) {

                group.customers.add(
                    String(
                        item.customerId
                    )
                );

            }

            group.paid +=
                numberValue(
                    item.paidAmount
                );

            group.penalty +=
                numberValue(
                    item.penalty
                );

            group.total +=
                numberValue(
                    item.totalCollection
                );

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
            8,
            "No collector collection records found."
        );

        return;
    }


    reportTableBody.innerHTML =
        rows
            .map(
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
                            ${escapeHTML(
                                row.role
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.id
                            )}
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
    records
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


    records.forEach(
        item => {

            const key =
                item.customerId ||
                item.customerName ||
                "unknown";


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {
                        name:
                            item.customerName,

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


            const group =
                grouped.get(key);

            group.count++;


            if (
                item.loanId ||
                item.loanNumber
            ) {

                group.loans.add(
                    String(
                        item.loanId ||
                        item.loanNumber
                    )
                );

            }


            group.paid +=
                numberValue(
                    item.paidAmount
                );

            group.penalty +=
                numberValue(
                    item.penalty
                );

            group.pending +=
                numberValue(
                    item.pendingAmount
                );

            group.total +=
                numberValue(
                    item.totalCollection
                );

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
        rows
            .map(
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
// MAIN RENDER
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
        filteredCollections
    );


    switch (
        currentView
    ) {

        case "week":

            renderWeekWise(
                filteredCollections
            );

            break;


        case "month":

            renderMonthWise(
                filteredCollections
            );

            break;


        case "staff":

            renderStaffWise(
                filteredCollections
            );

            break;


        case "customer":

            renderCustomerWise(
                filteredCollections
            );

            break;


        default:

            renderDateWise(
                filteredCollections
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
                ${escapeHTML(
                    message
                )}
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
                colspan="17"
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
                colspan="17"
                style="
                    text-align:center;
                    padding:30px;
                    color:#dc2626;
                "
            >
                ${escapeHTML(
                    message
                )}
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
        event => {

            event.preventDefault();

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
        event => {

            event.preventDefault();

            window.print();

        }
    );

}


// ============================================================
// CSV
// ============================================================

if (downloadButton) {

    downloadButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            downloadCSV();

        }
    );

}


function downloadCSV() {

    if (
        !filteredCollections.length
    ) {

        alert(
            "No collection records available."
        );

        return;
    }


    const rows = [];


    rows.push([
        "Date",
        "Collection ID",
        "Receipt Number",
        "Collector",
        "Collector Role",
        "Collector ID",
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
        "Balance After Payment",
        "Reference Number",
        "Remarks"
    ]);


    filteredCollections.forEach(
        item => {

            rows.push([

                formatDate(
                    item.paymentDate
                ),

                item.collectionId,

                item.receiptNumber,

                item.collectorName,

                item.collectorRole,

                item.collectorId,

                item.customerName,

                item.customerId,

                item.loanNumber,

                item.vehicleNumber,

                item.dueAmount,

                item.paidAmount,

                item.pendingAmount,

                item.penalty,

                item.totalCollection,

                item.paymentMode,

                item.balanceAfterPayment,

                item.referenceNumber,

                item.remarks

            ]);

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
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
// DEFAULT DATE
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
// GLOBAL ACCESS
// ============================================================

window.collectionReport = {

    reload:
        loadAllData,

    refresh:
        loadAllData,

    applyFilters:
        applySearch,

    getData:
        () =>
            [
                ...filteredCollections
            ]

};


// ============================================================
// START
// ============================================================

setDefaultDates();

setupViewButtons();

loadAllData();
