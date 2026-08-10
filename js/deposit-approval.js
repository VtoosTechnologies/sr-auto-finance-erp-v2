// ============================================================
// SR AUTO FINANCE ERP
// OWNER - DEPOSIT APPROVAL
// File: js/deposit-approval.js
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const pendingCountElement =
    document.getElementById("pendingCount");

const pendingAmountElement =
    document.getElementById("pendingAmount");

const acceptedAmountElement =
    document.getElementById("acceptedAmount");

const rejectedReversedAmountElement =
    document.getElementById(
        "rejectedReversedAmount"
    );

const requestCountElement =
    document.getElementById("requestCount");

const requestListElement =
    document.getElementById("requestList");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const dateFilter =
    document.getElementById("dateFilter");

const clearFilterBtn =
    document.getElementById(
        "clearFilterBtn"
    );

const messageElement =
    document.getElementById("message");

const loadingOverlay =
    document.getElementById(
        "loadingOverlay"
    );

const backBtn =
    document.getElementById("backBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// ============================================================
// GLOBAL
// ============================================================

let currentUser = null;

let allDepositRequests = [];

let filteredRequests = [];

let processingRequestId = "";


// ============================================================
// SESSION
// ============================================================

function getOwnerSession() {

    const raw =
        sessionStorage.getItem(
            "srOwnerSession"
        );

    if (!raw) {
        return null;
    }

    try {

        return JSON.parse(
            raw
        );

    } catch {

        sessionStorage.removeItem(
            "srOwnerSession"
        );

        return null;

    }

}


// ============================================================
// GENERIC HELPERS
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
            Number(value);

        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }

    return 0;

}


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

}


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


function getDateKey(
    value
) {

    const date =
        parseDate(value);

    if (!date) {
        return "";
    }

    return (
        `${date.getFullYear()}-` +
        `${String(
            date.getMonth() + 1
        ).padStart(2, "0")}-` +
        `${String(
            date.getDate()
        ).padStart(2, "0")}`
    );

}


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
// REQUEST AMOUNT
// ============================================================

function getRequestAmount(
    request
) {

    return numberValue(
        request.amount,
        request.depositAmount
    );

}


// ============================================================
// REQUEST STATUS
// ============================================================

function getRequestStatus(
    request
) {

    return String(
        request.status ||
        "pending"
    ).toLowerCase();

}


// ============================================================
// LOAD REQUESTS
// ============================================================

async function loadRequests() {

    showLoading(true);

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "depositRequests"
                )
            );


        allDepositRequests = [];


        snapshot.forEach(
            docSnap => {

                allDepositRequests.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()

                });

            }
        );


        allDepositRequests.sort(
            (
                a,
                b
            ) => {

                const dateA =
                    parseDate(
                        firstValue(
                            a,
                            [
                                "createdAt",
                                "requestDate",
                                "depositDate"
                            ],
                            ""
                        )
                    );

                const dateB =
                    parseDate(
                        firstValue(
                            b,
                            [
                                "createdAt",
                                "requestDate",
                                "depositDate"
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


        applyFilters();


    } catch (
        error
    ) {

        console.error(
            "Deposit request loading error:",
            error
        );


        showMessage(
            `Unable to load deposit requests: ${error.message}`
        );


        requestListElement.innerHTML =
            `
            <div class="empty">
                Unable to load deposit requests.
            </div>
            `;

    } finally {

        showLoading(false);

    }

}


// ============================================================
// FILTER
// ============================================================

function applyFilters() {

    const search =
        String(
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        String(
            statusFilter?.value ||
            "all"
        ).toLowerCase();


    const selectedDate =
        String(
            dateFilter?.value ||
            ""
        );


    filteredRequests =
        allDepositRequests.filter(
            request => {

                const requestStatus =
                    getRequestStatus(
                        request
                    );


                const staffName =
                    String(
                        firstValue(
                            request,
                            [
                                "staffName",
                                "collectorName"
                            ],
                            ""
                        )
                    )
                        .toLowerCase();


                const requestId =
                    String(
                        request.id ||
                        ""
                    )
                        .toLowerCase();


                const staffId =
                    String(
                        firstValue(
                            request,
                            [
                                "staffId",
                                "staffDocumentId"
                            ],
                            ""
                        )
                    )
                        .toLowerCase();


                const searchMatch =
                    !search ||

                    staffName.includes(
                        search
                    ) ||

                    requestId.includes(
                        search
                    ) ||

                    staffId.includes(
                        search
                    );


                const statusMatch =
                    status === "all" ||
                    requestStatus === status;


                const requestDate =
                    firstValue(
                        request,
                        [
                            "depositDate",
                            "requestDate",
                            "createdAt"
                        ],
                        ""
                    );


                const dateMatch =
                    !selectedDate ||

                    getDateKey(
                        requestDate
                    ) ===
                    selectedDate;


                return (
                    searchMatch &&
                    statusMatch &&
                    dateMatch
                );

            }
        );


    renderSummary();

    renderRequests();

}


// ============================================================
// SUMMARY
// ============================================================

function renderSummary() {

    let pendingCount = 0;

    let pendingAmount = 0;

    let acceptedAmount = 0;

    let rejectedReversedAmount = 0;


    allDepositRequests.forEach(
        request => {

            const amount =
                getRequestAmount(
                    request
                );


            const status =
                getRequestStatus(
                    request
                );


            if (
                status === "pending"
            ) {

                pendingCount++;

                pendingAmount +=
                    amount;

            }


            else if (
                status === "accepted"
            ) {

                acceptedAmount +=
                    amount;

            }


            else if (
                status === "rejected" ||
                status === "reversed"
            ) {

                rejectedReversedAmount +=
                    amount;

            }

        }
    );


    setText(
        pendingCountElement,
        pendingCount
    );


    setText(
        pendingAmountElement,
        formatCurrency(
            pendingAmount
        )
    );


    setText(
        acceptedAmountElement,
        formatCurrency(
            acceptedAmount
        )
    );


    setText(
        rejectedReversedAmountElement,
        formatCurrency(
            rejectedReversedAmount
        )
    );

}


// ============================================================
// RENDER REQUESTS
// ============================================================

function renderRequests() {

    if (
        !requestListElement
    ) {
        return;
    }


    setText(
        requestCountElement,
        `${filteredRequests.length} Request${
            filteredRequests.length === 1
                ? ""
                : "s"
        }`
    );


    if (
        filteredRequests.length === 0
    ) {

        requestListElement.innerHTML =
            `
            <div class="empty">
                No deposit requests found.
            </div>
            `;

        return;

    }


    requestListElement.innerHTML =
        filteredRequests
            .map(
                request =>
                    renderRequest(
                        request
                    )
            )
            .join("");


    attachRequestEvents();

}


// ============================================================
// REQUEST HTML
// ============================================================

function renderRequest(
    request
) {

    const requestId =
        request.id;


    const staffName =
        firstValue(
            request,
            [
                "staffName",
                "collectorName"
            ],
            "Staff"
        );


    const staffId =
        firstValue(
            request,
            [
                "staffId",
                "staffDocumentId"
            ],
            "-"
        );


    const amount =
        getRequestAmount(
            request
        );


    const status =
        getRequestStatus(
            request
        );


    const depositDate =
        firstValue(
            request,
            [
                "depositDate",
                "requestDate",
                "createdAt"
            ],
            ""
        );


    const mode =
        firstValue(
            request,
            [
                "depositMode",
                "paymentMode",
                "mode"
            ],
            "-"
        );


    const reference =
        firstValue(
            request,
            [
                "referenceNumber",
                "referenceNo",
                "transactionId"
            ],
            "-"
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


    const approvedBy =
        firstValue(
            request,
            [
                "approvedBy",
                "acceptedBy"
            ],
            "-"
        );


    const approvedAt =
        firstValue(
            request,
            [
                "approvedAt",
                "acceptedAt"
            ],
            ""
        );


    const rejectionReason =
        firstValue(
            request,
            [
                "rejectionReason",
                "rejectReason"
            ],
            "-"
        );


    const statusClass =
        [
            "pending",
            "accepted",
            "rejected",
            "reversed"
        ].includes(
            status
        )
            ? status
            : "pending";


    const statusLabel =
        status.charAt(0).toUpperCase() +
        status.slice(1);


    const isPending =
        status === "pending";


    const isAccepted =
        status === "accepted";


    return `
        <div
            class="request-item"
            data-request-id="${escapeHtml(
                requestId
            )}"
        >

            <div class="request-top">

                <div>

                    <div class="staff-name">
                        ${escapeHtml(
                            staffName
                        )}
                    </div>

                    <div class="staff-meta">
                        Staff ID:
                        ${escapeHtml(
                            staffId
                        )}
                        <br>

                        Request ID:
                        ${escapeHtml(
                            requestId
                        )}
                    </div>

                </div>


                <div class="request-amount">
                    ${formatCurrency(
                        amount
                    )}
                </div>


                <span
                    class="status ${statusClass}"
                >
                    ${statusLabel}
                </span>

            </div>


            <div class="request-details">

                <div class="detail-box">

                    <div class="detail-label">
                        Deposit Date
                    </div>

                    <div class="detail-value">
                        ${formatDate(
                            depositDate
                        )}
                    </div>

                </div>


                <div class="detail-box">

                    <div class="detail-label">
                        Deposit Mode
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            mode
                        )}
                    </div>

                </div>


                <div class="detail-box">

                    <div class="detail-label">
                        Reference
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            reference
                        )}
                    </div>

                </div>


                <div class="detail-box">

                    <div class="detail-label">
                        Remarks
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            remarks
                        )}
                    </div>

                </div>

            </div>


            <div
                class="details-panel"
                id="details-${escapeHtml(
                    requestId
                )}"
            >

                <h3 class="details-title">
                    Deposit Details
                </h3>


                <div class="details-grid">

                    <div class="details-row">

                        <span>
                            Staff
                        </span>

                        <strong>
                            ${escapeHtml(
                                staffName
                            )}
                        </strong>

                    </div>


                    <div class="details-row">

                        <span>
                            Amount
                        </span>

                        <strong>
                            ${formatCurrency(
                                amount
                            )}
                        </strong>

                    </div>


                    <div class="details-row">

                        <span>
                            Status
                        </span>

                        <strong>
                            ${statusLabel}
                        </strong>

                    </div>


                    <div class="details-row">

                        <span>
                            Approved By
                        </span>

                        <strong>
                            ${escapeHtml(
                                approvedBy
                            )}
                        </strong>

                    </div>


                    <div class="details-row">

                        <span>
                            Approved Date
                        </span>

                        <strong>
                            ${formatDate(
                                approvedAt
                            )}
                        </strong>

                    </div>


                    <div class="details-row">

                        <span>
                            Reject Reason
                        </span>

                        <strong>
                            ${escapeHtml(
                                rejectionReason
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="request-actions">

                <button
                    type="button"
                    class="action-btn view-btn"
                    data-action="view"
                    data-id="${escapeHtml(
                        requestId
                    )}"
                >
                    View
                </button>


                ${
                    isPending
                        ? `
                            <button
                                type="button"
                                class="action-btn accept-btn"
                                data-action="accept"
                                data-id="${escapeHtml(
                                    requestId
                                )}"
                            >
                                Accept
                            </button>

                            <button
                                type="button"
                                class="action-btn reject-btn"
                                data-action="reject"
                                data-id="${escapeHtml(
                                    requestId
                                )}"
                            >
                                Reject
                            </button>
                        `
                        : ""
                }


                ${
                    isAccepted
                        ? `
                            <button
                                type="button"
                                class="action-btn reverse-btn"
                                data-action="reverse"
                                data-id="${escapeHtml(
                                    requestId
                                )}"
                            >
                                Reverse
                            </button>
                        `
                        : ""
                }

            </div>

        </div>
    `;

}


// ============================================================
// EVENTS
// ============================================================

function attachRequestEvents() {

    document
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    handleAction
                );

            }
        );

}


// ============================================================
// ACTION HANDLER
// ============================================================

async function handleAction(
    event
) {

    const button =
        event.currentTarget;


    const action =
        button.dataset.action;


    const requestId =
        button.dataset.id;


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
            "Deposit request not found."
        );

        return;

    }


    if (
        action === "view"
    ) {

        toggleDetails(
            requestId
        );

        return;

    }


    if (
        action === "accept"
    ) {

        await acceptDeposit(
            request
        );

        return;

    }


    if (
        action === "reject"
    ) {

        await rejectDeposit(
            request
        );

        return;

    }


    if (
        action === "reverse"
    ) {

        await reverseDeposit(
            request
        );

    }

}


// ============================================================
// VIEW DETAILS
// ============================================================

function toggleDetails(
    requestId
) {

    const panel =
        document.getElementById(
            `details-${requestId}`
        );


    if (
        panel
    ) {

        panel.classList.toggle(
            "show"
        );

    }

}


// ============================================================
// ACCEPT DEPOSIT
// ============================================================

async function acceptDeposit(
    request
) {

    const status =
        getRequestStatus(
            request
        );


    if (
        status !== "pending"
    ) {

        showMessage(
            "Only pending requests can be accepted."
        );

        return;

    }


    const amount =
        getRequestAmount(
            request
        );


    if (
        amount <= 0
    ) {

        showMessage(
            "Invalid deposit amount."
        );

        return;

    }


    const confirmed =
        confirm(
            `Accept deposit of ${formatCurrency(
                amount
            )} from ${
                firstValue(
                    request,
                    [
                        "staffName"
                    ],
                    "Staff"
                )
            }?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    processingRequestId =
        request.id;


    showLoading(true);


    try {

        const ownerName =
            firstValue(
                getOwnerSession(),
                [
                    "ownerName",
                    "name",
                    "displayName"
                ],
                currentUser?.email ||
                "Owner"
            );


        // ====================================================
        // STEP 1
        // Update deposit request
        // ====================================================

        await updateDoc(
            doc(
                db,
                "depositRequests",
                request.id
            ),
            {

                status:
                    "accepted",

                approvedBy:
                    ownerName,

                approvedByUid:
                    currentUser?.uid ||
                    "",

                approvedAt:
                    serverTimestamp(),

                acceptedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        // ====================================================
        // STEP 2
        // Owner collection ledger
        //
        // IMPORTANT:
        // This does NOT create a customer payment.
        // It only records staff -> owner transfer.
        // ====================================================

        await addDoc(
            collection(
                db,
                "ownerCollectionLedger"
            ),
            {

                type:
                    "staff_deposit",

                source:
                    "staff_deposit",

                requestId:
                    request.id,

                staffId:
                    firstValue(
                        request,
                        [
                            "staffId"
                        ],
                        ""
                    ),

                staffDocumentId:
                    firstValue(
                        request,
                        [
                            "staffDocumentId"
                        ],
                        ""
                    ),

                staffName:
                    firstValue(
                        request,
                        [
                            "staffName"
                        ],
                        ""
                    ),

                amount:
                    amount,

                depositMode:
                    firstValue(
                        request,
                        [
                            "depositMode",
                            "paymentMode"
                        ],
                        ""
                    ),

                referenceNumber:
                    firstValue(
                        request,
                        [
                            "referenceNumber"
                        ],
                        ""
                    ),

                status:
                    "credited",

                approvedBy:
                    ownerName,

                approvedByUid:
                    currentUser?.uid ||
                    "",

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        showMessage(
            `Deposit of ${formatCurrency(
                amount
            )} accepted successfully.`,
            "success"
        );


        await loadRequests();


    } catch (
        error
    ) {

        console.error(
            "Accept deposit error:",
            error
        );


        showMessage(
            `Unable to accept deposit: ${error.message}`
        );

    } finally {

        processingRequestId =
            "";

        showLoading(false);

    }

}


// ============================================================
// REJECT DEPOSIT
// ============================================================

async function rejectDeposit(
    request
) {

    const status =
        getRequestStatus(
            request
        );


    if (
        status !== "pending"
    ) {

        showMessage(
            "Only pending requests can be rejected."
        );

        return;

    }


    const reason =
        prompt(
            "Enter rejection reason:"
        );


    if (
        reason === null
    ) {

        return;

    }


    const cleanReason =
        reason.trim();


    if (
        !cleanReason
    ) {

        showMessage(
            "Rejection reason is required."
        );

        return;

    }


    const confirmed =
        confirm(
            "Reject this deposit request?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    processingRequestId =
        request.id;


    showLoading(true);


    try {

        const ownerName =
            firstValue(
                getOwnerSession(),
                [
                    "ownerName",
                    "name",
                    "displayName"
                ],
                currentUser?.email ||
                "Owner"
            );


        await updateDoc(
            doc(
                db,
                "depositRequests",
                request.id
            ),
            {

                status:
                    "rejected",

                rejectionReason:
                    cleanReason,

                rejectedBy:
                    ownerName,

                rejectedByUid:
                    currentUser?.uid ||
                    "",

                rejectedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        showMessage(
            "Deposit request rejected.",
            "success"
        );


        await loadRequests();


    } catch (
        error
    ) {

        console.error(
            "Reject deposit error:",
            error
        );


        showMessage(
            `Unable to reject deposit: ${error.message}`
        );

    } finally {

        processingRequestId =
            "";

        showLoading(false);

    }

}


// ============================================================
// REVERSE DEPOSIT
// ============================================================

async function reverseDeposit(
    request
) {

    const status =
        getRequestStatus(
            request
        );


    if (
        status !== "accepted"
    ) {

        showMessage(
            "Only accepted deposits can be reversed."
        );

        return;

    }


    const amount =
        getRequestAmount(
            request
        );


    const reason =
        prompt(
            "Enter reversal reason:"
        );


    if (
        reason === null
    ) {

        return;

    }


    const cleanReason =
        reason.trim();


    if (
        !cleanReason
    ) {

        showMessage(
            "Reversal reason is required."
        );

        return;

    }


    const confirmed =
        confirm(
            `Reverse accepted deposit of ${formatCurrency(
                amount
            )}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    processingRequestId =
        request.id;


    showLoading(true);


    try {

        const ownerName =
            firstValue(
                getOwnerSession(),
                [
                    "ownerName",
                    "name",
                    "displayName"
                ],
                currentUser?.email ||
                "Owner"
            );


        // ====================================================
        // STEP 1
        // Update original request
        // ====================================================

        await updateDoc(
            doc(
                db,
                "depositRequests",
                request.id
            ),
            {

                status:
                    "reversed",

                reversalReason:
                    cleanReason,

                reversedBy:
                    ownerName,

                reversedByUid:
                    currentUser?.uid ||
                    "",

                reversedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        // ====================================================
        // STEP 2
        // Reverse owner ledger
        // ====================================================

        await addDoc(
            collection(
                db,
                "ownerCollectionLedger"
            ),
            {

                type:
                    "staff_deposit_reversal",

                source:
                    "staff_deposit_reversal",

                requestId:
                    request.id,

                staffId:
                    firstValue(
                        request,
                        [
                            "staffId"
                        ],
                        ""
                    ),

                staffDocumentId:
                    firstValue(
                        request,
                        [
                            "staffDocumentId"
                        ],
                        ""
                    ),

                staffName:
                    firstValue(
                        request,
                        [
                            "staffName"
                        ],
                        ""
                    ),

                amount:
                    amount,

                status:
                    "reversed",

                reversalReason:
                    cleanReason,

                reversedBy:
                    ownerName,

                reversedByUid:
                    currentUser?.uid ||
                    "",

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        showMessage(
            `Deposit of ${formatCurrency(
                amount
            )} reversed successfully.`,
            "success"
        );


        await loadRequests();


    } catch (
        error
    ) {

        console.error(
            "Reverse deposit error:",
            error
        );


        showMessage(
            `Unable to reverse deposit: ${error.message}`
        );

    } finally {

        processingRequestId =
            "";

        showLoading(false);

    }

}


// ============================================================
// SEARCH EVENTS
// ============================================================

if (
    searchInput
) {

    searchInput.addEventListener(
        "input",
        applyFilters
    );

}


if (
    statusFilter
) {

    statusFilter.addEventListener(
        "change",
        applyFilters
    );

}


if (
    dateFilter
) {

    dateFilter.addEventListener(
        "change",
        applyFilters
    );

}


// ============================================================
// CLEAR FILTER
// ============================================================

if (
    clearFilterBtn
) {

    clearFilterBtn.addEventListener(
        "click",
        () => {

            searchInput.value =
                "";

            statusFilter.value =
                "all";

            dateFilter.value =
                "";

            applyFilters();

        }
    );

}


// ============================================================
// BACK
// ============================================================

if (
    backBtn
) {

    backBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );

}


// ============================================================
// LOGOUT
// ============================================================

if (
    logoutBtn
) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );

            } catch (
                error
            ) {

                console.error(
                    error
                );

            }


            sessionStorage.removeItem(
                "srOwnerSession"
            );


            window.location.href =
                "login.html";

        }
    );

}


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    message,
    type = "error"
) {

    if (
        !messageElement
    ) {
        return;
    }


    messageElement.textContent =
        message;


    messageElement.className =
        `message ${type}`;


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    element,
    value
) {

    if (
        element
    ) {

        element.textContent =
            value;

    }

}


// ============================================================
// LOADING
// ============================================================

function showLoading(
    show
) {

    if (
        !loadingOverlay
    ) {
        return;
    }


    loadingOverlay.style.display =
        show
            ? "flex"
            : "none";

}


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
                "login.html";

            return;

        }


        currentUser =
            user;


        const ownerSession =
            getOwnerSession();


        /*
         * If your existing owner login uses
         * another session key, keep the current
         * authentication flow and remove only
         * this role check.
         */

        if (
            ownerSession &&
            ownerSession.role &&
            ![
                "owner",
                "admin"
            ].includes(
                String(
                    ownerSession.role
                ).toLowerCase()
            )
        ) {

            window.location.href =
                "login.html";

            return;

        }


        await loadRequests();

    }
);
