// ============================================================
// SR AUTO FINANCE ERP
// OWNER STAFF COLLECTION & DEPOSIT APPROVAL
//
// File:
// js/staff-deposit-approval.js
//
// MASTER COLLECTION SOURCE:
// collections
//
// DEPOSIT SOURCE:
// depositRequests
//
// OWNER FUNCTIONS:
// - View staff-wise collection
// - View approved deposits
// - View pending deposits
// - View cash with staff
// - Approve deposit
// - Reject deposit
// - View customer / loan / due details
// - Filter staff / date / month
// - Download Excel-compatible CSV
// - Print / Save as PDF
//
// IMPORTANT:
// payments collection is NOT used for collection calculation.
// ============================================================


import {
    onAuthStateChanged,
    signOut
} from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    runTransaction,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const userNameElement =
    document.getElementById(
        "userName"
    );


const userRoleElement =
    document.getElementById(
        "userRole"
    );


const backBtn =
    document.getElementById(
        "backBtn"
    );


const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


const messageElement =
    document.getElementById(
        "message"
    );


const pendingTopCountElement =
    document.getElementById(
        "pendingTopCount"
    );


const totalStaffCollectionElement =
    document.getElementById(
        "totalStaffCollection"
    );


const totalDepositedElement =
    document.getElementById(
        "totalDeposited"
    );


const totalPendingApprovalElement =
    document.getElementById(
        "totalPendingApproval"
    );


const totalCashWithStaffElement =
    document.getElementById(
        "totalCashWithStaff"
    );


const staffFilter =
    document.getElementById(
        "staffFilter"
    );


const fromDateInput =
    document.getElementById(
        "fromDate"
    );


const toDateInput =
    document.getElementById(
        "toDate"
    );


const monthFilter =
    document.getElementById(
        "monthFilter"
    );


const applyFilterBtn =
    document.getElementById(
        "applyFilterBtn"
    );


const resetFilterBtn =
    document.getElementById(
        "resetFilterBtn"
    );


const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );


const downloadExcelBtn =
    document.getElementById(
        "downloadExcelBtn"
    );


const downloadPdfBtn =
    document.getElementById(
        "downloadPdfBtn"
    );


const printReportBtn =
    document.getElementById(
        "printReportBtn"
    );


const pendingRequestsBody =
    document.getElementById(
        "pendingRequestsBody"
    );


const staffSummaryBody =
    document.getElementById(
        "staffSummaryBody"
    );


const detailModal =
    document.getElementById(
        "detailModal"
    );


const detailModalTitle =
    document.getElementById(
        "detailModalTitle"
    );


const closeDetailModalBtn =
    document.getElementById(
        "closeDetailModalBtn"
    );


const detailTotalCollection =
    document.getElementById(
        "detailTotalCollection"
    );


const detailPrincipal =
    document.getElementById(
        "detailPrincipal"
    );


const detailInterest =
    document.getElementById(
        "detailInterest"
    );


const detailPenalty =
    document.getElementById(
        "detailPenalty"
    );


const collectionDetailBody =
    document.getElementById(
        "collectionDetailBody"
    );


// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;

let currentUserProfile = null;

let allCollections = [];

let allDepositRequests = [];

let allStaff = [];

let allLoans = [];

let allCustomers = [];

let filteredCollections = [];

let filteredDepositRequests = [];

let staffRows = [];

let selectedStaffKey = "";

let isProcessingApproval = false;


// ============================================================
// BASIC HELPERS
// ============================================================

function numberValue(
    ...values
) {

    for (
        const value of values
    ) {

        if (
            value ===
            null ||
            value ===
            undefined ||
            value ===
            ""
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


// ============================================================
// FIRST VALUE
// ============================================================

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
            value !==
            ""
        ) {

            return value;

        }

    }


    return fallback;

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
            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0
        }
    ).format(
        numberValue(
            value
        )
    );

}


// ============================================================
// HTML ESCAPE
// ============================================================

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
// DATE PARSER
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
        typeof value?.toDate ===
        "function"
    ) {

        const date =
            value.toDate();


        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    if (
        value?.seconds !==
        undefined
    ) {

        const date =
            new Date(
                numberValue(
                    value.seconds
                ) * 1000
            );


        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    if (
        value instanceof
        Date
    ) {

        return isNaN(
            value.getTime()
        )
            ? null
            : value;

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


    if (
        typeof value ===
        "string"
    ) {

        const trimmed =
            value.trim();


        if (
            !trimmed
        ) {

            return null;

        }


        const date =
            new Date(
                trimmed
            );


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date;

        }


        const parts =
            trimmed.split(
                /[-/.\s]/
            );


        if (
            parts.length >=
            3
        ) {

            const day =
                Number(
                    parts[0]
                );

            const month =
                Number(
                    parts[1]
                ) - 1;

            const year =
                Number(
                    parts[2]
                );


            if (
                day > 0 &&
                month >= 0 &&
                year > 0
            ) {

                const fallbackDate =
                    new Date(
                        year,
                        month,
                        day
                    );


                if (
                    !isNaN(
                        fallbackDate.getTime()
                    )
                ) {

                    return fallbackDate;

                }

            }

        }

    }


    return null;

}


// ============================================================
// DATE ONLY
// ============================================================

function dateOnly(
    date
) {

    if (
        !date
    ) {

        return null;

    }


    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

}


// ============================================================
// FORMAT DATE
// ============================================================

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


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"
        }
    );

}


// ============================================================
// FORMAT DATE TIME
// ============================================================

function formatDateTime(
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


    return date.toLocaleString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    text,
    type = "info"
) {

    if (
        !messageElement
    ) {

        return;

    }


    messageElement.textContent =
        text;


    messageElement.className =
        `message show ${type}`;


    window.clearTimeout(
        showMessage.timer
    );


    showMessage.timer =
        window.setTimeout(
            () => {

                messageElement.className =
                    "message";

            },
            4500
        );

}


// ============================================================
// STAFF IDENTIFIER
// ============================================================

function getStaffIdentifiers(
    data
) {

    const values = [

        data?.staffId,

        data?.staffDocumentId,

        data?.collectorStaffId,

        data?.collectedByStaffId,

        data?.staffCode,

        data?.employeeId,

        data?.createdByUid,

        data?.collectorUid,

        data?.createdBy

    ];


    return values

        .filter(
            value =>
                value !==
                    undefined &&
                value !==
                    null &&
                String(
                    value
                ).trim() !==
                    ""
        )

        .map(
            value =>
                String(
                    value
                ).trim()
        );

}


// ============================================================
// STAFF NAME
// ============================================================

function getCollectionStaffName(
    data
) {

    return String(
        firstValue(
            data,
            [
                "staffName",
                "collectorName",
                "collectedByName",
                "staffDisplayName",
                "employeeName"
            ],
            "Unassigned"
        )
    ).trim() ||
        "Unassigned";

}


// ============================================================
// STAFF MATCH
// ============================================================

function collectionMatchesStaff(
    collectionData,
    staff
) {

    const collectionIds =
        getStaffIdentifiers(
            collectionData
        );


    const staffIds = [

        staff?.id,

        staff?.staffId,

        staff?.staffDocumentId,

        staff?.staffCode,

        staff?.employeeId,

        staff?.uid

    ]

        .filter(
            value =>
                value !==
                    undefined &&
                value !==
                    null &&
                String(
                    value
                ).trim() !==
                    ""
        )

        .map(
            value =>
                String(
                    value
                ).trim()
        );


    return collectionIds.some(
        id =>
            staffIds.includes(
                id
            )
    );

}


// ============================================================
// NORMALIZED STAFF KEY
// ============================================================

function getCollectionStaffKey(
    data
) {

    const ids =
        getStaffIdentifiers(
            data
        );


    if (
        ids.length
    ) {

        return ids[0];

    }


    const name =
        getCollectionStaffName(
            data
        );


    return (
        "name:" +
        name.toLowerCase()
    );

}


// ============================================================
// REQUEST STAFF KEY
// ============================================================

function getRequestStaffKey(
    request
) {

    const ids = [

        request?.staffId,

        request?.staffDocumentId,

        request?.staffCode,

        request?.employeeId,

        request?.createdBy

    ]

        .filter(
            value =>
                value !==
                    undefined &&
                value !==
                    null &&
                String(
                    value
                ).trim() !==
                    ""
        )

        .map(
            value =>
                String(
                    value
                ).trim()
        );


    if (
        ids.length
    ) {

        return ids[0];

    }


    const name =
        String(
            firstValue(
                request,
                [
                    "staffName",
                    "collectorName"
                ],
                "Unassigned"
            )
        ).trim();


    return (
        "name:" +
        name.toLowerCase()
    );

}


// ============================================================
// COLLECTION AMOUNT
// ============================================================

function getCollectionAmount(
    data
) {

    return numberValue(

        data?.amount,

        data?.totalReceived,

        data?.amountReceived,

        data?.paidAmount,

        data?.collectionAmount,

        data?.paymentAmount,

        data?.totalAmount

    );

}


// ============================================================
// PRINCIPAL AMOUNT
// ============================================================

function getPrincipalAmount(
    data
) {

    return numberValue(

        data?.principalPaid,

        data?.principalCollected,

        data?.principalAmountPaid,

        data?.principalPart,

        data?.principal,

        data?.principalAmount

    );

}


// ============================================================
// INTEREST AMOUNT
// ============================================================

function getInterestAmount(
    data
) {

    return numberValue(

        data?.interestPaid,

        data?.interestCollected,

        data?.interestAmountPaid,

        data?.interestPart,

        data?.interest,

        data?.interestAmount

    );

}


// ============================================================
// PENALTY
// ============================================================

function getPenaltyAmount(
    data
) {

    return numberValue(

        data?.penaltyCollected,

        data?.penalty,

        data?.penaltyAmount,

        data?.latePenalty

    );

}


// ============================================================
// COLLECTION DATE
// ============================================================

function getCollectionDate(
    data
) {

    return firstValue(
        data,
        [
            "collectionDate",
            "collectedDate",
            "paymentDate",
            "paidDate",
            "date",
            "createdAt"
        ],
        ""
    );

}


// ============================================================
// DUE DATE
// ============================================================

function getDueDate(
    data
) {

    return firstValue(
        data,
        [
            "dueDate",
            "installmentDueDate"
        ],
        ""
    );

}


// ============================================================
// FILTER DATE
// ============================================================

function isWithinFilters(
    value
) {

    const date =
        parseDateValue(
            value
        );


    const fromRaw =
        fromDateInput?.value ||
        "";


    const toRaw =
        toDateInput?.value ||
        "";


    const monthRaw =
        monthFilter?.value ||
        "";


    if (
        (
            fromRaw ||
            toRaw ||
            monthRaw
        ) &&
        !date
    ) {

        return false;

    }


    if (
        !date
    ) {

        return true;

    }


    const onlyDate =
        dateOnly(
            date
        );


    if (
        fromRaw
    ) {

        const from =
            parseDateValue(
                fromRaw +
                "T00:00:00"
            );


        if (
            from &&
            onlyDate <
                dateOnly(
                    from
                )
        ) {

            return false;

        }

    }


    if (
        toRaw
    ) {

        const to =
            parseDateValue(
                toRaw +
                "T00:00:00"
            );


        if (
            to &&
            onlyDate >
                dateOnly(
                    to
                )
        ) {

            return false;

        }

    }


    if (
        monthRaw
    ) {

        const [
            year,
            month
        ] =
            monthRaw
                .split("-")
                .map(
                    Number
                );


        if (
            date.getFullYear() !==
                year ||
            date.getMonth() !==
                month - 1
        ) {

            return false;

        }

    }


    return true;

}


// ============================================================
// REQUEST DATE
// ============================================================

function getRequestDate(
    request
) {

    return firstValue(
        request,
        [
            "depositDate",
            "requestDate",
            "createdAt"
        ],
        ""
    );

}


// ============================================================
// DEPOSIT AMOUNT
// ============================================================

function getDepositAmount(
    request
) {

    return numberValue(

        request?.amount,

        request?.depositAmount

    );

}


// ============================================================
// DEPOSIT STATUS
// ============================================================

function getDepositStatus(
    request
) {

    return String(
        request?.status ||
        "pending"
    )
        .trim()
        .toLowerCase();

}


// ============================================================
// APPROVED STATUS
// ============================================================

function isApprovedStatus(
    status
) {

    return [

        "approved",

        "accepted"

    ].includes(
        String(
            status
        ).toLowerCase()
    );

}


// ============================================================
// PENDING STATUS
// ============================================================

function isPendingStatus(
    status
) {

    return (
        String(
            status
        ).toLowerCase()
        ===
        "pending"
    );

}


// ============================================================
// REJECTED STATUS
// ============================================================

function isRejectedStatus(
    status
) {

    return [

        "rejected",

        "declined"

    ].includes(
        String(
            status
        ).toLowerCase()
    );

}


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    try {

        showMessage(
            "Loading staff collection and deposit data...",
            "info"
        );


        const [

            collectionsSnapshot,

            depositRequestsSnapshot,

            staffSnapshot,

            loansSnapshot,

            customersSnapshot

        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "collections"
                )
            ),

            getDocs(
                collection(
                    db,
                    "depositRequests"
                )
            ),

            getDocs(
                collection(
                    db,
                    "staff"
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
                    "customers"
                )
            )

        ]);


        // ----------------------------------------------------
        // COLLECTIONS
        // ----------------------------------------------------

        allCollections = [];


        collectionsSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                const item = {

                    id:
                        docSnap.id,

                    ...data

                };


                const status =
                    String(
                        item.status ||
                        "success"
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


                allCollections.push(
                    item
                );

            }
        );


        // ----------------------------------------------------
        // DEPOSIT REQUESTS
        // ----------------------------------------------------

        allDepositRequests = [];


        depositRequestsSnapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                allDepositRequests.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


        // ----------------------------------------------------
        // STAFF
        // ----------------------------------------------------

        allStaff = [];


        staffSnapshot.forEach(
            docSnap => {

                allStaff.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        // ----------------------------------------------------
        // LOANS
        // ----------------------------------------------------

        allLoans = [];


        loansSnapshot.forEach(
            docSnap => {

                allLoans.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        // ----------------------------------------------------
        // CUSTOMERS
        // ----------------------------------------------------

        allCustomers = [];


        customersSnapshot.forEach(
            docSnap => {

                allCustomers.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        populateStaffFilter();

        applyFilters();

        showMessage(
            "Staff collection and deposit data loaded.",
            "success"
        );

    }
    catch (
        error
    ) {

        console.error(
            "Owner deposit module load error:",
            error
        );


        showMessage(
            getFriendlyError(
                error
            ),
            "error"
        );


        renderEmptyStates();

    }

}


// ============================================================
// STAFF FILTER
// ============================================================

function populateStaffFilter() {

    if (
        !staffFilter
    ) {

        return;

    }


    const previousValue =
        staffFilter.value;


    const unique =
        new Map();


    allStaff.forEach(
        staff => {

            const name =
                String(
                    firstValue(
                        staff,
                        [
                            "staffName",
                            "name",
                            "employeeName",
                            "displayName"
                        ],
                        ""
                    )
                ).trim();


            if (
                !name
            ) {

                return;

            }


            const ids = [

                staff.id,

                staff.staffId,

                staff.staffDocumentId,

                staff.staffCode,

                staff.employeeId,

                staff.uid

            ]

                .filter(
                    value =>
                        value !==
                            undefined &&
                        value !==
                            null &&
                        String(
                            value
                        ).trim() !==
                            ""
                )

                .map(
                    value =>
                        String(
                            value
                        ).trim()
                );


            const key =
                ids[0] ||
                (
                    "name:" +
                    name.toLowerCase()
                );


            if (
                !unique.has(
                    key
                )
            ) {

                unique.set(
                    key,
                    {
                        key,
                        name
                    }
                );

            }

        }
    );


    // Also add staff names found directly in collections
    allCollections.forEach(
        item => {

            const name =
                getCollectionStaffName(
                    item
                );


            if (
                !name ||
                name ===
                    "Unassigned"
            ) {

                return;

            }


            const key =
                getCollectionStaffKey(
                    item
                );


            if (
                !unique.has(
                    key
                )
            ) {

                unique.set(
                    key,
                    {
                        key,
                        name
                    }
                );

            }

        }
    );


    const options =
        [
            ...unique.values()
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


    staffFilter.innerHTML = `

        <option value="">
            All Staff
        </option>

        ${
            options
                .map(
                    staff => `
                        <option
                            value="${escapeHTML(
                                staff.key
                            )}"
                        >
                            ${escapeHTML(
                                staff.name
                            )}
                        </option>
                    `
                )
                .join("")
        }

    `;


    if (
        previousValue &&
        [
            ...staffFilter.options
        ].some(
            option =>
                option.value ===
                previousValue
        )
    ) {

        staffFilter.value =
            previousValue;

    }

}


// ============================================================
// APPLY FILTERS
// ============================================================

function applyFilters() {

    const selectedStaff =
        staffFilter?.value ||
        "";


    selectedStaffKey =
        selectedStaff;


    filteredCollections =
        allCollections.filter(
            item => {

                if (
                    !isWithinFilters(
                        getCollectionDate(
                            item
                        )
                    )
                ) {

                    return false;

                }


                if (
                    selectedStaff
                ) {

                    const key =
                        getCollectionStaffKey(
                            item
                        );


                    if (
                        key !==
                        selectedStaff
                    ) {

                        // Try matching against staff document
                        const matched =
                            allStaff.some(
                                staff => {

                                    const staffKey =
                                        getStaffKey(
                                            staff
                                        );


                                    return (
                                        staffKey ===
                                        selectedStaff &&
                                        collectionMatchesStaff(
                                            item,
                                            staff
                                        )
                                    );

                                }
                            );


                        if (
                            !matched
                        ) {

                            return false;

                        }

                    }

                }


                return true;

            }
        );


    filteredDepositRequests =
        allDepositRequests.filter(
            request => {

                if (
                    !isWithinFilters(
                        getRequestDate(
                            request
                        )
                    )
                ) {

                    return false;

                }


                if (
                    selectedStaff
                ) {

                    const key =
                        getRequestStaffKey(
                            request
                        );


                    if (
                        key !==
                        selectedStaff
                    ) {

                        const matched =
                            allStaff.some(
                                staff =>
                                    getStaffKey(
                                        staff
                                    ) ===
                                    selectedStaff &&
                                    requestMatchesStaff(
                                        request,
                                        staff
                                    )
                            );


                        if (
                            !matched
                        ) {

                            return false;

                        }

                    }

                }


                return true;

            }
        );


    renderEverything();

}


// ============================================================
// STAFF KEY
// ============================================================

function getStaffKey(
    staff
) {

    const ids = [

        staff?.id,

        staff?.staffId,

        staff?.staffDocumentId,

        staff?.staffCode,

        staff?.employeeId,

        staff?.uid

    ]

        .filter(
            value =>
                value !==
                    undefined &&
                value !==
                    null &&
                String(
                    value
                ).trim() !==
                    ""
        )

        .map(
            value =>
                String(
                    value
                ).trim()
        );


    if (
        ids.length
    ) {

        return ids[0];

    }


    const name =
        String(
            firstValue(
                staff,
                [
                    "staffName",
                    "name",
                    "employeeName",
                    "displayName"
                ],
                "Unassigned"
            )
        ).trim();


    return (
        "name:" +
        name.toLowerCase()
    );

}


// ============================================================
// REQUEST MATCH STAFF
// ============================================================

function requestMatchesStaff(
    request,
    staff
) {

    const requestIds = [

        request?.staffId,

        request?.staffDocumentId,

        request?.staffCode,

        request?.employeeId,

        request?.createdBy

    ]

        .filter(
            value =>
                value !==
                    undefined &&
                value !==
                    null &&
                String(
                    value
                ).trim() !==
                    ""
        )

        .map(
            value =>
                String(
                    value
                ).trim()
        );


    const staffIds = [

        staff?.id,

        staff?.staffId,

        staff?.staffDocumentId,

        staff?.staffCode,

        staff?.employeeId,

        staff?.uid

    ]

        .filter(
            value =>
                value !==
                    undefined &&
                value !==
                    null &&
                String(
                    value
                ).trim() !==
                    ""
        )

        .map(
            value =>
                String(
                    value
                ).trim()
        );


    return requestIds.some(
        id =>
            staffIds.includes(
                id
            )
    );

}


// ============================================================
// RENDER EVERYTHING
// ============================================================

function renderEverything() {

    calculateSummary();

    renderPendingRequests();

    renderStaffSummary();

}


// ============================================================
// CALCULATE SUMMARY
// ============================================================

function calculateSummary() {

    let totalCollection =
        0;


    let totalDeposited =
        0;


    let totalPending =
        0;


    // --------------------------------------------------------
    // COLLECTION TOTAL
    // --------------------------------------------------------

    filteredCollections.forEach(
        item => {

            totalCollection +=
                getCollectionAmount(
                    item
                );

        }
    );


    // --------------------------------------------------------
    // DEPOSIT TOTALS
    // --------------------------------------------------------

    filteredDepositRequests.forEach(
        request => {

            const amount =
                getDepositAmount(
                    request
                );


            const status =
                getDepositStatus(
                    request
                );


            if (
                isApprovedStatus(
                    status
                )
            ) {

                totalDeposited +=
                    amount;

            }


            else if (
                isPendingStatus(
                    status
                )
            ) {

                totalPending +=
                    amount;

            }

        }
    );


    // --------------------------------------------------------
    // CASH WITH STAFF
    // --------------------------------------------------------

    const cashWithStaff =
        Math.max(
            totalCollection -
            totalDeposited -
            totalPending,
            0
        );


    setText(
        "totalStaffCollection",
        formatCurrency(
            totalCollection
        )
    );


    setText(
        "totalDeposited",
        formatCurrency(
            totalDeposited
        )
    );


    setText(
        "totalPendingApproval",
        formatCurrency(
            totalPending
        )
    );


    setText(
        "totalCashWithStaff",
        formatCurrency(
            cashWithStaff
        )
    );


    // --------------------------------------------------------
    // TOP PENDING COUNT
    // --------------------------------------------------------

    const pendingCount =
        filteredDepositRequests.filter(
            request =>
                isPendingStatus(
                    getDepositStatus(
                        request
                    )
                )
        ).length;


    setText(
        "pendingTopCount",
        `${pendingCount} Pending`
    );

}


// ============================================================
// STAFF SUMMARY
// ============================================================

function buildStaffSummary() {

    const groups =
        new Map();


    // --------------------------------------------------------
    // CREATE GROUPS FROM STAFF MASTER
    // --------------------------------------------------------

    allStaff.forEach(
        staff => {

            const key =
                getStaffKey(
                    staff
                );


            const name =
                String(
                    firstValue(
                        staff,
                        [
                            "staffName",
                            "name",
                            "employeeName",
                            "displayName"
                        ],
                        "Staff"
                    )
                ).trim();


            if (
                !groups.has(
                    key
                )
            ) {

                groups.set(
                    key,
                    createStaffGroup(
                        key,
                        name
                    )
                );

            }

        }
    );


    // --------------------------------------------------------
    // COLLECTIONS
    // --------------------------------------------------------

    filteredCollections.forEach(
        item => {

            let key =
                getCollectionStaffKey(
                    item
                );


            let group =
                groups.get(
                    key
                );


            if (
                !group
            ) {

                // Try matching staff master
                const matchedStaff =
                    allStaff.find(
                        staff =>
                            collectionMatchesStaff(
                                item,
                                staff
                            )
                    );


                if (
                    matchedStaff
                ) {

                    key =
                        getStaffKey(
                            matchedStaff
                        );


                    group =
                        groups.get(
                            key
                        );

                }

            }


            if (
                !group
            ) {

                const name =
                    getCollectionStaffName(
                        item
                    );


                group =
                    createStaffGroup(
                        key,
                        name
                    );


                groups.set(
                    key,
                    group
                );

            }


            group.collectionItems.push(
                item
            );


            group.totalCollection +=
                getCollectionAmount(
                    item
                );


            group.principal +=
                getPrincipalAmount(
                    item
                );


            group.interest +=
                getInterestAmount(
                    item
                );


            group.penalty +=
                getPenaltyAmount(
                    item
                );

        }
    );


    // --------------------------------------------------------
    // DEPOSITS
    // --------------------------------------------------------

    filteredDepositRequests.forEach(
        request => {

            const amount =
                getDepositAmount(
                    request
                );


            const status =
                getDepositStatus(
                    request
                );


            let key =
                getRequestStaffKey(
                    request
                );


            let group =
                groups.get(
                    key
                );


            if (
                !group
            ) {

                const matchedStaff =
                    allStaff.find(
                        staff =>
                            requestMatchesStaff(
                                request,
                                staff
                            )
                    );


                if (
                    matchedStaff
                ) {

                    key =
                        getStaffKey(
                            matchedStaff
                        );


                    group =
                        groups.get(
                            key
                        );

                }

            }


            if (
                !group
            ) {

                const name =
                    String(
                        firstValue(
                            request,
                            [
                                "staffName",
                                "collectorName"
                            ],
                            "Staff"
                        )
                    ).trim();


                group =
                    createStaffGroup(
                        key,
                        name
                    );


                groups.set(
                    key,
                    group
                );

            }


            group.depositRequests.push(
                request
            );


            if (
                isApprovedStatus(
                    status
                )
            ) {

                group.deposited +=
                    amount;

            }


            else if (
                isPendingStatus(
                    status
                )
            ) {

                group.pendingDeposit +=
                    amount;

            }

        }
    );


    // --------------------------------------------------------
    // FINAL BALANCE
    // --------------------------------------------------------

    groups.forEach(
        group => {

            group.cashWithStaff =
                Math.max(

                    group.totalCollection -

                    group.deposited -

                    group.pendingDeposit,

                    0

                );

        }
    );


    return [
        ...groups.values()
    ]
        .filter(
            group =>
                group.totalCollection > 0 ||
                group.deposited > 0 ||
                group.pendingDeposit > 0
        )
        .sort(
            (
                a,
                b
            ) =>
                a.staffName.localeCompare(
                    b.staffName
                )
        );

}


// ============================================================
// CREATE STAFF GROUP
// ============================================================

function createStaffGroup(
    key,
    name
) {

    return {

        key:

            key,

        staffName:

            name ||
            "Staff",

        totalCollection:

            0,

        principal:

            0,

        interest:

            0,

        penalty:

            0,

        deposited:

            0,

        pendingDeposit:

            0,

        cashWithStaff:

            0,

        collectionItems:

            [],

        depositRequests:

            []

    };

}


// ============================================================
// RENDER STAFF SUMMARY
// ============================================================

function renderStaffSummary() {

    if (
        !staffSummaryBody
    ) {

        return;

    }


    staffRows =
        buildStaffSummary();


    if (
        !staffRows.length
    ) {

        staffSummaryBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="table-empty"
                >

                    <div
                        class="table-empty-icon"
                    >
                        📊
                    </div>

                    <div
                        class="table-empty-title"
                    >
                        No staff collection data found
                    </div>

                    <div
                        class="table-empty-text"
                    >
                        Try changing the selected filters.
                    </div>

                </td>

            </tr>

        `;

        return;

    }


    staffSummaryBody.innerHTML =

        staffRows
            .map(
                group => {

                    const hasPending =
                        group.pendingDeposit >
                        0;


                    return `

                        <tr>

                            <td>

                                <span
                                    class="staff-name"
                                >
                                    ${escapeHTML(
                                        group.staffName
                                    )}
                                </span>

                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="view-btn"
                                    data-view-staff="${escapeHTML(
                                        group.key
                                    )}"
                                >

                                    ${formatCurrency(
                                        group.totalCollection
                                    )}

                                </button>

                            </td>


                            <td>

                                <span
                                    class="amount"
                                >
                                    ${formatCurrency(
                                        group.principal
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="amount"
                                >
                                    ${formatCurrency(
                                        group.interest
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="amount"
                                >
                                    ${formatCurrency(
                                        group.penalty
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="amount"
                                >
                                    ${formatCurrency(
                                        group.deposited
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="pending-amount"
                                >
                                    ${formatCurrency(
                                        group.pendingDeposit
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="cash-amount"
                                >
                                    ${formatCurrency(
                                        group.cashWithStaff
                                    )}
                                </span>

                            </td>


                            <td>

                                <div
                                    class="action-group"
                                >

                                    <button
                                        type="button"
                                        class="view-btn"
                                        data-view-staff="${escapeHTML(
                                            group.key
                                        )}"
                                    >
                                        View
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


// ============================================================
// RENDER PENDING REQUESTS
// ============================================================

function renderPendingRequests() {

    if (
        !pendingRequestsBody
    ) {

        return;

    }


    const pending =
        filteredDepositRequests
            .filter(
                request =>
                    isPendingStatus(
                        getDepositStatus(
                            request
                        )
                    )
            )
            .sort(
                (
                    a,
                    b
                ) => {

                    const da =
                        parseDateValue(
                            getRequestDate(
                                a
                            )
                        );


                    const db =
                        parseDateValue(
                            getRequestDate(
                                b
                            )
                        );


                    return (
                        (db?.getTime() || 0) -
                        (da?.getTime() || 0)
                    );

                }
            );


    if (
        !pending.length
    ) {

        pendingRequestsBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="table-empty"
                >

                    <div
                        class="table-empty-icon"
                    >
                        ✅
                    </div>

                    <div
                        class="table-empty-title"
                    >
                        No pending deposit requests
                    </div>

                    <div
                        class="table-empty-text"
                    >
                        All deposit requests are currently cleared.

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    pendingRequestsBody.innerHTML =

        pending
            .map(
                request => {

                    const amount =
                        getDepositAmount(
                            request
                        );


                    const key =
                        getRequestStaffKey(
                            request
                        );


                    const group =
                        staffRows.find(
                            row =>
                                row.key ===
                                key
                        );


                    const totalCollection =
                        group?.totalCollection ||
                        numberValue(
                            request.totalCollectedAtRequest
                        );


                    const deposited =
                        group?.deposited ||
                        numberValue(
                            request.acceptedDepositsAtRequest
                        );


                    const pendingDeposit =
                        Math.max(
                            totalCollection -
                            deposited,
                            0
                        );


                    return `

                        <tr>

                            <td>

                                <span
                                    class="staff-name"
                                >
                                    ${escapeHTML(
                                        firstValue(
                                            request,
                                            [
                                                "staffName",
                                                "collectorName"
                                            ],
                                            "Staff"
                                        )
                                    )}
                                </span>

                            </td>


                            <td>

                                ${formatDateTime(
                                    getRequestDate(
                                        request
                                    )
                                )}

                            </td>


                            <td>

                                ${formatCurrency(
                                    totalCollection
                                )}

                            </td>


                            <td>

                                ${formatCurrency(
                                    deposited
                                )}

                            </td>


                            <td>

                                <span
                                    class="pending-amount"
                                >
                                    ${formatCurrency(
                                        pendingDeposit
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="amount"
                                >
                                    ${formatCurrency(
                                        amount
                                    )}
                                </span>

                            </td>


                            <td>

                                ${escapeHTML(
                                    firstValue(
                                        request,
                                        [
                                            "depositMode",
                                            "mode"
                                        ],
                                        "-"
                                    )
                                )}

                            </td>


                            <td>

                                <span
                                    class="
                                        status-badge
                                        status-pending
                                    "
                                >
                                    Pending
                                </span>

                            </td>


                            <td>

                                <div
                                    class="action-group"
                                >

                                    <button
                                        type="button"
                                        class="view-btn"
                                        data-view-request="${escapeHTML(
                                            request.id
                                        )}"
                                    >
                                        View
                                    </button>


                                    <button
                                        type="button"
                                        class="approve-btn"
                                        data-approve-request="${escapeHTML(
                                            request.id
                                        )}"
                                    >
                                        Approve
                                    </button>


                                    <button
                                        type="button"
                                        class="reject-btn"
                                        data-reject-request="${escapeHTML(
                                            request.id
                                        )}"
                                    >
                                        Reject
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


// ============================================================
// VIEW STAFF DETAILS
// ============================================================

function openStaffDetails(
    staffKey
) {

    const group =
        staffRows.find(
            row =>
                row.key ===
                staffKey
        );


    if (
        !group
    ) {

        showMessage(
            "Staff details not found.",
            "error"
        );


        return;

    }


    selectedStaffKey =
        staffKey;


    detailModalTitle.textContent =
        `${group.staffName} - Collection Details`;


    setText(
        "detailTotalCollection",
        formatCurrency(
            group.totalCollection
        )
    );


    setText(
        "detailPrincipal",
        formatCurrency(
            group.principal
        )
    );


    setText(
        "detailInterest",
        formatCurrency(
            group.interest
        )
    );


    setText(
        "detailPenalty",
        formatCurrency(
            group.penalty
        )
    );


    const items =
        group.collectionItems
            .slice()
            .sort(
                (
                    a,
                    b
                ) => {

                    const da =
                        parseDateValue(
                            getCollectionDate(
                                a
                            )
                        );


                    const db =
                        parseDateValue(
                            getCollectionDate(
                                b
                            )
                        );


                    return (
                        (db?.getTime() || 0) -
                        (da?.getTime() || 0)
                    );

                }
            );


    if (
        !items.length
    ) {

        collectionDetailBody.innerHTML = `

            <tr>

                <td
                    colspan="11"
                    class="loading-state"
                >
                    No collection details found.
                </td>

            </tr>

        `;

    }

    else {

        collectionDetailBody.innerHTML =

            items
                .map(
                    item => {

                        const amount =
                            getCollectionAmount(
                                item
                            );


                        const principal =
                            getPrincipalAmount(
                                item
                            );


                        const interest =
                            getInterestAmount(
                                item
                            );


                        const penalty =
                            getPenaltyAmount(
                                item
                            );


                        const customerName =
                            firstValue(
                                item,
                                [
                                    "customerName"
                                ],
                                "-"
                            );


                        const loanId =
                            firstValue(
                                item,
                                [
                                    "loanId",
                                    "loanCode"
                                ],
                                "-"
                            );


                        const dueNo =
                            firstValue(
                                item,
                                [
                                    "dueNo",
                                    "installmentNo",
                                    "installmentNumber",
                                    "dueNumber"
                                ],
                                "-"
                            );


                        const dueDate =
                            getDueDate(
                                item
                            );


                        const collectionDate =
                            getCollectionDate(
                                item
                            );


                        const balance =
                            numberValue(
                                item?.balanceAfterPayment,

                                item?.balance,

                                item?.outstanding,

                                item?.pendingAmount
                            );


                        const status =
                            firstValue(
                                item,
                                [
                                    "status"
                                ],
                                "Collected"
                            );


                        return `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        customerName
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        loanId
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        dueNo
                                    )}
                                </td>


                                <td>
                                    ${formatDate(
                                        dueDate
                                    )}
                                </td>


                                <td>
                                    ${formatCurrency(
                                        principal
                                    )}
                                </td>


                                <td>
                                    ${formatCurrency(
                                        interest
                                    )}
                                </td>


                                <td>
                                    <strong>
                                        ${formatCurrency(
                                            amount
                                        )}
                                    </strong>
                                </td>


                                <td>
                                    ${formatDate(
                                        collectionDate
                                    )}
                                </td>


                                <td>
                                    ${formatCurrency(
                                        penalty
                                    )}
                                </td>


                                <td>
                                    ${formatCurrency(
                                        balance
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        status
                                    )}
                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");

    }


    if (
        detailModal
    ) {

        detailModal.classList.add(
            "show"
        );

    }

}


// ============================================================
// VIEW REQUEST DETAILS
// ============================================================

function openRequestDetails(
    requestId
) {

    const request =
        allDepositRequests.find(
            item =>
                item.id ===
                requestId
        );


    if (
        !request
    ) {

        showMessage(
            "Deposit request not found.",
            "error"
        );


        return;

    }


    const amount =
        getDepositAmount(
            request
        );


    const staffName =
        firstValue(
            request,
            [
                "staffName",
                "collectorName"
            ],
            "Staff"
        );


    const remarks =
        firstValue(
            request,
            [
                "remarks",
                "depositRemarks"
            ],
            "-"
        );


    const reference =
        firstValue(
            request,
            [
                "referenceNumber",
                "referenceNo"
            ],
            "-"
        );


    const mode =
        firstValue(
            request,
            [
                "depositMode",
                "mode"
            ],
            "-"
        );


    alert(

        "Deposit Request Details\n\n" +

        "Staff: " +
        staffName +
        "\n" +

        "Amount: " +
        formatCurrency(
            amount
        ) +
        "\n" +

        "Date: " +
        formatDateTime(
            getRequestDate(
                request
            )
        ) +
        "\n" +

        "Mode: " +
        mode +
        "\n" +

        "Reference: " +
        reference +
        "\n" +

        "Remarks: " +
        remarks

    );

}


// ============================================================
// APPROVE REQUEST
// ============================================================

async function approveDeposit(
    requestId
) {

    if (
        isProcessingApproval
    ) {

        return;

    }


    const request =
        allDepositRequests.find(
            item =>
                item.id ===
                requestId
        );


    if (
        !request
    ) {

        showMessage(
            "Deposit request not found.",
            "error"
        );


        return;

    }


    if (
        !isPendingStatus(
            getDepositStatus(
                request
            )
        )
    ) {

        showMessage(
            "This request is no longer pending.",
            "error"
        );


        await loadData();


        return;

    }


    const amount =
        getDepositAmount(
            request
        );


    const staffName =
        firstValue(
            request,
            [
                "staffName",
                "collectorName"
            ],
            "Staff"
        );


    const confirmed =
        window.confirm(

            "Approve deposit request?\n\n" +

            "Staff: " +
            staffName +
            "\n" +

            "Amount: " +
            formatCurrency(
                amount
            ) +
            "\n\n" +

            "Once approved, this amount will be treated as deposited and will reduce Cash With Staff."

        );


    if (
        !confirmed
    ) {

        return;

    }


    isProcessingApproval =
        true;


    try {

        const requestRef =
            doc(
                db,
                "depositRequests",
                requestId
            );


        await runTransaction(
            db,
            async transaction => {

                const snapshot =
                    await transaction.get(
                        requestRef
                    );


                if (
                    !snapshot.exists()
                ) {

                    throw new Error(
                        "Deposit request no longer exists."
                    );

                }


                const current =
                    snapshot.data();


                const currentStatus =
                    String(
                        current.status ||
                        "pending"
                    )
                        .trim()
                        .toLowerCase();


                if (
                    currentStatus !==
                    "pending"
                ) {

                    throw new Error(
                        "This deposit request has already been processed."
                    );

                }


                transaction.update(
                    requestRef,
                    {

                        status:
                            "approved",

                        approvalStatus:
                            "approved",

                        approvedAmount:
                            numberValue(
                                current.amount,
                                current.depositAmount
                            ),

                        approvedBy:
                            currentUser?.uid ||
                            "",

                        approvedByUid:
                            currentUser?.uid ||
                            "",

                        approvedByName:
                            currentUser?.displayName ||
                            currentUser?.email ||
                            "Owner",

                        approvedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );

            }
        );


        showMessage(
            `${formatCurrency(
                amount
            )} deposit approved for ${staffName}.`,
            "success"
        );


        await loadData();

    }
    catch (
        error
    ) {

        console.error(
            "Approve deposit error:",
            error
        );


        showMessage(
            getFriendlyError(
                error
            ),
            "error"
        );

    }
    finally {

        isProcessingApproval =
            false;

    }

}


// ============================================================
// REJECT REQUEST
// ============================================================

async function rejectDeposit(
    requestId
) {

    if (
        isProcessingApproval
    ) {

        return;

    }


    const request =
        allDepositRequests.find(
            item =>
                item.id ===
                requestId
        );


    if (
        !request
    ) {

        showMessage(
            "Deposit request not found.",
            "error"
        );


        return;

    }


    if (
        !isPendingStatus(
            getDepositStatus(
                request
            )
        )
    ) {

        showMessage(
            "This request is no longer pending.",
            "error"
        );


        await loadData();


        return;

    }


    const amount =
        getDepositAmount(
            request
        );


    const staffName =
        firstValue(
            request,
            [
                "staffName",
                "collectorName"
            ],
            "Staff"
        );


    const reason =
        window.prompt(

            "Enter rejection reason for " +
            staffName +
            " - " +
            formatCurrency(
                amount
            ) +
            ":"

        );


    if (
        reason ===
        null
    ) {

        return;

    }


    const trimmedReason =
        reason.trim();


    if (
        !trimmedReason
    ) {

        showMessage(
            "Rejection reason is required.",
            "error"
        );


        return;

    }


    const confirmed =
        window.confirm(

            "Reject this deposit request?\n\n" +

            "Staff: " +
            staffName +
            "\n" +

            "Amount: " +
            formatCurrency(
                amount
            ) +
            "\n\n" +

            "Reason: " +
            trimmedReason

        );


    if (
        !confirmed
    ) {

        return;

    }


    isProcessingApproval =
        true;


    try {

        const requestRef =
            doc(
                db,
                "depositRequests",
                requestId
            );


        await runTransaction(
            db,
            async transaction => {

                const snapshot =
                    await transaction.get(
                        requestRef
                    );


                if (
                    !snapshot.exists()
                ) {

                    throw new Error(
                        "Deposit request no longer exists."
                    );

                }


                const current =
                    snapshot.data();


                const currentStatus =
                    String(
                        current.status ||
                        "pending"
                    )
                        .trim()
                        .toLowerCase();


                if (
                    currentStatus !==
                    "pending"
                ) {

                    throw new Error(
                        "This deposit request has already been processed."
                    );

                }


                transaction.update(
                    requestRef,
                    {

                        status:
                            "rejected",

                        approvalStatus:
                            "rejected",

                        rejectionReason:
                            trimmedReason,

                        rejectedBy:
                            currentUser?.uid ||
                            "",

                        rejectedByUid:
                            currentUser?.uid ||
                            "",

                        rejectedByName:
                            currentUser?.displayName ||
                            currentUser?.email ||
                            "Owner",

                        rejectedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );

            }
        );


        showMessage(
            `Deposit request rejected for ${staffName}.`,
            "success"
        );


        await loadData();

    }
    catch (
        error
    ) {

        console.error(
            "Reject deposit error:",
            error
        );


        showMessage(
            getFriendlyError(
                error
            ),
            "error"
        );

    }
    finally {

        isProcessingApproval =
            false;

    }

}


// ============================================================
// EXCEL-COMPATIBLE CSV
// ============================================================

function downloadExcel() {

    if (
        !staffRows.length
    ) {

        showMessage(
            "No staff report data available to download.",
            "error"
        );


        return;

    }


    const rows = [];


    rows.push([

        "Staff",

        "Total Collection",

        "Principal Collected",

        "Interest Collected",

        "Penalty",

        "Total Deposited",

        "Pending Deposit",

        "Cash With Staff"

    ]);


    staffRows.forEach(
        group => {

            rows.push([

                group.staffName,

                group.totalCollection,

                group.principal,

                group.interest,

                group.penalty,

                group.deposited,

                group.pendingDeposit,

                group.cashWithStaff

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
                                csvEscape(
                                    value
                                )
                        )
                        .join(",")
            )
            .join("\r\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
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
        `SR-Auto-Finance-Staff-Deposit-Report-${getTodayString()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showMessage(
        "Excel-compatible report downloaded.",
        "success"
    );

}


// ============================================================
// CSV ESCAPE
// ============================================================

function csvEscape(
    value
) {

    const text =
        String(
            value ??
            ""
        );


    return (
        '"' +
        text
            .replace(
                /"/g,
                '""'
            ) +
        '"'
    );

}


// ============================================================
// TODAY STRING
// ============================================================

function getTodayString() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


// ============================================================
// PRINT / PDF
// ============================================================

function printReport() {

    if (
        !staffRows.length
    ) {

        showMessage(
            "No report data available.",
            "error"
        );


        return;

    }


    const reportWindow =
        window.open(
            "",
            "_blank"
        );


    if (
        !reportWindow
    ) {

        showMessage(
            "Please allow pop-ups to print the report.",
            "error"
        );


        return;

    }


    const from =
        fromDateInput?.value ||
        "-";


    const to =
        toDateInput?.value ||
        "-";


    const month =
        monthFilter?.value ||
        "-";


    const staff =
        staffFilter?.selectedOptions?.[0]?.textContent?.trim() ||
        "All Staff";


    const totalCollection =
        staffRows.reduce(
            (
                total,
                item
            ) =>
                total +
                item.totalCollection,
            0
        );


    const totalDeposited =
        staffRows.reduce(
            (
                total,
                item
            ) =>
                total +
                item.deposited,
            0
        );


    const totalPending =
        staffRows.reduce(
            (
                total,
                item
            ) =>
                total +
                item.pendingDeposit,
            0
        );


    const cashWithStaff =
        staffRows.reduce(
            (
                total,
                item
            ) =>
                total +
                item.cashWithStaff,
            0
        );


    reportWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                SR Auto Finance - Staff Deposit Report
            </title>


            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 25px;
                    color: #111827;
                }

                h1 {
                    margin-bottom: 5px;
                }

                .subtitle {
                    color: #64748b;
                    margin-bottom: 20px;
                }

                .filters {
                    margin-bottom: 20px;
                    font-size: 12px;
                }

                .summary {
                    display: grid;
                    grid-template-columns:
                        repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .card {
                    border: 1px solid #d1d5db;
                    padding: 12px;
                    border-radius: 8px;
                }

                .label {
                    font-size: 10px;
                    color: #64748b;
                }

                .value {
                    margin-top: 5px;
                    font-size: 17px;
                    font-weight: 800;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #d1d5db;
                    padding: 8px;
                    font-size: 10px;
                    text-align: left;
                }

                th {
                    background: #f1f5f9;
                }

                .footer {
                    margin-top: 25px;
                    font-size: 10px;
                    color: #64748b;
                    text-align: center;
                }

            </style>

        </head>


        <body>


            <h1>
                SR Auto Finance
            </h1>


            <div class="subtitle">
                Staff Collection & Deposit Report
            </div>


            <div class="filters">

                Staff:
                <strong>
                    ${escapeHTML(
                        staff
                    )}
                </strong>

                &nbsp;&nbsp;

                From:
                <strong>
                    ${escapeHTML(
                        from
                    )}
                </strong>

                &nbsp;&nbsp;

                To:
                <strong>
                    ${escapeHTML(
                        to
                    )}
                </strong>

                &nbsp;&nbsp;

                Month:
                <strong>
                    ${escapeHTML(
                        month
                    )}
                </strong>

            </div>


            <div class="summary">

                <div class="card">

                    <div class="label">
                        Total Collection
                    </div>

                    <div class="value">
                        ${formatCurrency(
                            totalCollection
                        )}
                    </div>

                </div>


                <div class="card">

                    <div class="label">
                        Total Deposited
                    </div>

                    <div class="value">
                        ${formatCurrency(
                            totalDeposited
                        )}
                    </div>

                </div>


                <div class="card">

                    <div class="label">
                        Pending Deposit
                    </div>

                    <div class="value">
                        ${formatCurrency(
                            totalPending
                        )}
                    </div>

                </div>


                <div class="card">

                    <div class="label">
                        Cash With Staff
                    </div>

                    <div class="value">
                        ${formatCurrency(
                            cashWithStaff
                        )}
                    </div>

                </div>

            </div>


            <table>

                <thead>

                    <tr>

                        <th>
                            Staff
                        </th>

                        <th>
                            Collection
                        </th>

                        <th>
                            Principal
                        </th>

                        <th>
                            Interest
                        </th>

                        <th>
                            Penalty
                        </th>

                        <th>
                            Deposited
                        </th>

                        <th>
                            Pending
                        </th>

                        <th>
                            Cash With Staff
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        staffRows
                            .map(
                                item => `

                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                item.staffName
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.totalCollection
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.principal
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.interest
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.penalty
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.deposited
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.pendingDeposit
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.cashWithStaff
                                            )}
                                        </td>

                                    </tr>

                                `
                            )
                            .join("")
                    }

                </tbody>

            </table>


            <div class="footer">

                Generated from SR Auto Finance ERP

            </div>


        </body>

        </html>

    `);


    reportWindow.document.close();


    reportWindow.focus();


    setTimeout(
        () => {

            reportWindow.print();

        },
        400
    );

}


// ============================================================
// TEXT SETTER
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


// ============================================================
// EMPTY STATES
// ============================================================

function renderEmptyStates() {

    if (
        pendingRequestsBody
    ) {

        pendingRequestsBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="table-empty"
                >

                    <div
                        class="table-empty-icon"
                    >
                        ⚠️
                    </div>

                    <div
                        class="table-empty-title"
                    >
                        Unable to load data
                    </div>

                </td>

            </tr>

        `;

    }


    if (
        staffSummaryBody
    ) {

        staffSummaryBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="table-empty"
                >

                    <div
                        class="table-empty-icon"
                    >
                        ⚠️
                    </div>

                    <div
                        class="table-empty-title"
                    >
                        Unable to load staff summary
                    </div>

                </td>

            </tr>

        `;

    }

}


// ============================================================
// FRIENDLY FIREBASE ERROR
// ============================================================

function getFriendlyError(
    error
) {

    const code =
        error?.code ||
        "";


    if (
        code ===
        "permission-denied"
    ) {

        return (
            "Permission denied. Firestore rules or Owner access check thevai."
        );

    }


    if (
        code ===
        "failed-precondition"
    ) {

        return (
            "Firestore request failed because a required condition/index is missing."
        );

    }


    if (
        code ===
        "unavailable"
    ) {

        return (
            "Firebase temporarily unavailable. Internet connection check pannunga."
        );

    }


    if (
        code ===
        "auth/network-request-failed"
    ) {

        return (
            "Network error. Internet connection check pannunga."
        );

    }


    return (
        error?.message ||
        "Unable to complete the request."
    );

}


// ============================================================
// EVENT LISTENERS
// ============================================================


// APPLY FILTER

applyFilterBtn?.addEventListener(
    "click",
    () => {

        applyFilters();

    }
);


// RESET FILTER

resetFilterBtn?.addEventListener(
    "click",
    () => {

        if (
            staffFilter
        ) {

            staffFilter.value =
                "";

        }


        if (
            fromDateInput
        ) {

            fromDateInput.value =
                "";

        }


        if (
            toDateInput
        ) {

            toDateInput.value =
                "";

        }


        if (
            monthFilter
        ) {

            monthFilter.value =
                "";

        }


        applyFilters();

    }
);


// REFRESH

refreshBtn?.addEventListener(
    "click",
    async () => {

        await loadData();

    }
);


// EXCEL

downloadExcelBtn?.addEventListener(
    "click",
    () => {

        downloadExcel();

    }
);


// PDF

downloadPdfBtn?.addEventListener(
    "click",
    () => {

        printReport();

    }
);


// PRINT

printReportBtn?.addEventListener(
    "click",
    () => {

        printReport();

    }
);


// BACK

backBtn?.addEventListener(
    "click",
    () => {

        window.location.href =
            "dashboard.html";

    }
);


// LOGOUT

logoutBtn?.addEventListener(
    "click",
    async () => {

        const confirmed =
            window.confirm(
                "Logout from Owner account?"
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            await signOut(
                auth
            );


            sessionStorage.removeItem(
                "srOwnerSession"
            );


            sessionStorage.removeItem(
                "srOwnerUid"
            );


            sessionStorage.removeItem(
                "srUserRole"
            );


            window.location.href =
                "index.html";

        }
        catch (
            error
        ) {

            console.error(
                "Owner logout error:",
                error
            );


            showMessage(
                "Unable to logout. Please try again.",
                "error"
            );

        }

    }
);


// CLOSE MODAL

closeDetailModalBtn?.addEventListener(
    "click",
    () => {

        detailModal?.classList.remove(
            "show"
        );

    }
);


// CLICK OUTSIDE MODAL

detailModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            detailModal
        ) {

            detailModal.classList.remove(
                "show"
            );

        }

    }
);


// ESCAPE MODAL

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            detailModal?.classList.remove(
                "show"
            );

        }

    }
);


// ============================================================
// TABLE EVENT DELEGATION
// ============================================================

pendingRequestsBody?.addEventListener(
    "click",
    async event => {

        const approveButton =
            event.target.closest(
                "[data-approve-request]"
            );


        if (
            approveButton
        ) {

            const requestId =
                approveButton.dataset
                    .approveRequest;


            await approveDeposit(
                requestId
            );


            return;

        }


        const rejectButton =
            event.target.closest(
                "[data-reject-request]"
            );


        if (
            rejectButton
        ) {

            const requestId =
                rejectButton.dataset
                    .rejectRequest;


            await rejectDeposit(
                requestId
            );


            return;

        }


        const viewButton =
            event.target.closest(
                "[data-view-request]"
            );


        if (
            viewButton
        ) {

            const requestId =
                viewButton.dataset
                    .viewRequest;


            openRequestDetails(
                requestId
            );

        }

    }
);


// ============================================================
// STAFF TABLE EVENT DELEGATION
// ============================================================

staffSummaryBody?.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-view-staff]"
            );


        if (
            !button
        ) {

            return;

        }


        const staffKey =
            button.dataset
                .viewStaff;


        openStaffDetails(
            staffKey
        );

    }
);


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (
            !user
        ) {

            window.location.href =
                "index.html";


            return;

        }


        currentUser =
            user;


        if (
            userNameElement
        ) {

            userNameElement.textContent =
                user.displayName ||
                user.email ||
                "Owner";

        }


        if (
            userRoleElement
        ) {

            userRoleElement.textContent =
                "Owner";

        }


        // ----------------------------------------------------
        // OPTIONAL OWNER PROFILE CHECK
        // ----------------------------------------------------
        //
        // We intentionally do not block the page if users/{uid}
        // does not exist because current project authentication
        // can already be established through Firebase Auth.
        //
        // Firestore rules should later enforce true owner-only
        // approval at security-rule level.
        // ----------------------------------------------------

        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnapshot =
                await getDoc(
                    userRef
                );


            if (
                userSnapshot.exists()
            ) {

                currentUserProfile =
                    userSnapshot.data();


                const role =
                    String(
                        firstValue(
                            currentUserProfile,
                            [
                                "role",
                                "userRole",
                                "type"
                            ],
                            ""
                        )
                    )
                        .trim()
                        .toLowerCase();


                if (
                    role &&
                    ![
                        "owner",
                        "admin",
                        "administrator"
                    ].includes(
                        role
                    )
                ) {

                    showMessage(
                        "Owner access only. Please login with the Owner account.",
                        "error"
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "index.html";

                        },
                        1200
                    );


                    return;

                }

            }

        }
        catch (
            error
        ) {

            console.warn(
                "Owner profile check skipped:",
                error
            );

        }


        await loadData();

    }
);
