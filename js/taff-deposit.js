// ============================================================
// SR AUTO FINANCE ERP
// STAFF DEPOSIT MODULE
// File: js/staff-deposit.js
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const staffNameElement =
    document.getElementById("staffName");

const depositDateInput =
    document.getElementById("depositDate");

const depositAmountInput =
    document.getElementById("depositAmount");

const depositModeInput =
    document.getElementById("depositMode");

const referenceNumberInput =
    document.getElementById("referenceNumber");

const depositRemarksInput =
    document.getElementById("depositRemarks");

const totalCollectedElement =
    document.getElementById("totalCollected");

const alreadyDepositedElement =
    document.getElementById("alreadyDeposited");

const pendingDepositElement =
    document.getElementById("pendingDeposit");

const cashInHandElement =
    document.getElementById("cashInHand");

const previewCashInHandElement =
    document.getElementById("previewCashInHand");

const previewDepositElement =
    document.getElementById("previewDeposit");

const previewAfterElement =
    document.getElementById("previewAfter");

const historyListElement =
    document.getElementById("historyList");

const depositForm =
    document.getElementById("depositForm");

const submitBtn =
    document.getElementById("submitBtn");

const cancelBtn =
    document.getElementById("cancelBtn");

const backBtn =
    document.getElementById("backBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const messageElement =
    document.getElementById("message");

const loadingOverlay =
    document.getElementById("loadingOverlay");


// ============================================================
// GLOBAL DATA
// ============================================================

let currentStaff = null;

let allPayments = [];

let allDepositRequests = [];

let totalCollected = 0;

let acceptedDeposits = 0;

let pendingDepositRequests = 0;

let cashInHand = 0;


// ============================================================
// SESSION
// ============================================================

function getStaffSession() {

    const raw =
        sessionStorage.getItem(
            "srStaffSession"
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
            "srStaffSession"
        );

        return null;

    }

}


// ============================================================
// FIRST VALUE
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


// ============================================================
// NUMBER
// ============================================================

function numberValue(
    ...values
) {

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
            Number(value);

        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }

    return 0;

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
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(
        numberValue(value)
    );

}


// ============================================================
// DATE PARSER
// ============================================================

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


// ============================================================
// DATE FORMAT
// ============================================================

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
    ).format(date);

}


// ============================================================
// TODAY INPUT VALUE
// ============================================================

function getTodayInputValue() {

    const date =
        new Date();

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


// ============================================================
// PAYMENT AMOUNT
// ============================================================

function getPaymentAmount(
    payment
) {

    return numberValue(
        payment.totalCollection,
        payment.amountReceived,
        payment.amountCollected,
        payment.paidAmount,
        payment.emiPaid,
        payment.amount
    );

}


// ============================================================
// PAYMENT PENALTY
// ============================================================

function getPaymentPenalty(
    payment
) {

    return numberValue(
        payment.penaltyCollected,
        payment.penaltyAmount,
        payment.penalty,
        payment.penaltyPaid
    );

}


// ============================================================
// PAYMENT STAFF MATCH
// ============================================================

function paymentBelongsToStaff(
    payment
) {

    if (
        !currentStaff
    ) {

        return false;

    }

    const sessionStaffId =
        String(
            currentStaff.staffId ||
            ""
        );

    const sessionDocumentId =
        String(
            currentStaff.staffDocumentId ||
            ""
        );

    const paymentStaffId =
        String(
            firstValue(
                payment,
                [
                    "staffId",
                    "collectorStaffId",
                    "collectedByStaffId",
                    "staffCode",
                    "employeeId"
                ],
                ""
            )
        );

    const paymentStaffDocumentId =
        String(
            firstValue(
                payment,
                [
                    "staffDocumentId",
                    "collectorStaffDocumentId"
                ],
                ""
            )
        );


    return (
        (
            paymentStaffId &&
            (
                paymentStaffId ===
                sessionStaffId ||

                paymentStaffId ===
                sessionDocumentId
            )
        ) ||

        (
            paymentStaffDocumentId &&
            paymentStaffDocumentId ===
            sessionDocumentId
        )
    );

}


// ============================================================
// DEPOSIT STAFF MATCH
// ============================================================

function depositBelongsToStaff(
    request
) {

    if (
        !currentStaff
    ) {

        return false;

    }

    const sessionStaffId =
        String(
            currentStaff.staffId ||
            ""
        );

    const sessionDocumentId =
        String(
            currentStaff.staffDocumentId ||
            ""
        );

    const requestStaffId =
        String(
            firstValue(
                request,
                [
                    "staffId",
                    "staffCode",
                    "employeeId"
                ],
                ""
            )
        );

    const requestStaffDocumentId =
        String(
            firstValue(
                request,
                [
                    "staffDocumentId"
                ],
                ""
            )
        );


    return (
        (
            requestStaffId &&
            (
                requestStaffId ===
                sessionStaffId ||

                requestStaffId ===
                sessionDocumentId
            )
        ) ||

        (
            requestStaffDocumentId &&
            requestStaffDocumentId ===
            sessionDocumentId
        )
    );

}


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    showLoading(true);

    try {

        const [
            paymentsSnapshot,
            depositsSnapshot
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
                    "depositRequests"
                )
            )

        ]);


        // ====================================================
        // PAYMENTS
        // ====================================================

        allPayments = [];

        paymentsSnapshot.forEach(
            docSnap => {

                const payment = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                const status =
                    String(
                        payment.status ||
                        "success"
                    ).toLowerCase();


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


                if (
                    paymentBelongsToStaff(
                        payment
                    )
                ) {

                    allPayments.push(
                        payment
                    );

                }

            }
        );


        // ====================================================
        // DEPOSIT REQUESTS
        // ====================================================

        allDepositRequests = [];

        depositsSnapshot.forEach(
            docSnap => {

                const request = {

                    id:
                        docSnap.id,

                    ...docSnap.data()

                };


                if (
                    depositBelongsToStaff(
                        request
                    )
                ) {

                    allDepositRequests.push(
                        request
                    );

                }

            }
        );


        calculateBalances();

        renderSummary();

        renderHistory();


    } catch (
        error
    ) {

        console.error(
            "Staff deposit loading error:",
            error
        );


        showMessage(
            `Unable to load deposit details: ${error.message}`
        );


        historyListElement.innerHTML =
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
// CALCULATE BALANCES
// ============================================================

function calculateBalances() {

    // ========================================================
    // TOTAL COLLECTION
    //
    // Payment amount + penalty
    // ========================================================

    totalCollected =
        allPayments.reduce(
            (
                total,
                payment
            ) => {

                return (
                    total +
                    getPaymentAmount(
                        payment
                    )
                );

            },
            0
        );


    // ========================================================
    // ACCEPTED DEPOSITS
    // ========================================================

    acceptedDeposits =
        allDepositRequests.reduce(
            (
                total,
                request
            ) => {

                const status =
                    String(
                        request.status ||
                        "pending"
                    ).toLowerCase();


                if (
                    status ===
                    "accepted"
                ) {

                    return (
                        total +
                        numberValue(
                            request.amount,
                            request.depositAmount
                        )
                    );

                }


                return total;

            },
            0
        );


    // ========================================================
    // PENDING REQUESTS
    // ========================================================

    pendingDepositRequests =
        allDepositRequests.reduce(
            (
                total,
                request
            ) => {

                const status =
                    String(
                        request.status ||
                        "pending"
                    ).toLowerCase();


                if (
                    status ===
                    "pending"
                ) {

                    return (
                        total +
                        numberValue(
                            request.amount,
                            request.depositAmount
                        )
                    );

                }


                return total;

            },
            0
        );


    // ========================================================
    // CASH IN HAND
    //
    // Total collection
    // - accepted deposits
    // - pending deposit requests
    //
    // Pending requests are already committed
    // for deposit, so they are not counted
    // as available cash.
    // ========================================================

    cashInHand =
        Math.max(
            totalCollected -
            acceptedDeposits -
            pendingDepositRequests,
            0
        );

}


// ============================================================
// RENDER SUMMARY
// ============================================================

function renderSummary() {

    setText(
        totalCollectedElement,
        formatCurrency(
            totalCollected
        )
    );


    setText(
        alreadyDepositedElement,
        formatCurrency(
            acceptedDeposits
        )
    );


    setText(
        pendingDepositElement,
        formatCurrency(
            pendingDepositRequests
        )
    );


    setText(
        cashInHandElement,
        formatCurrency(
            cashInHand
        )
    );


    updatePreview();

}


// ============================================================
// UPDATE PREVIEW
// ============================================================

function updatePreview() {

    const depositAmount =
        numberValue(
            depositAmountInput?.value
        );


    const after =
        Math.max(
            cashInHand -
            depositAmount,
            0
        );


    setText(
        previewCashInHandElement,
        formatCurrency(
            cashInHand
        )
    );


    setText(
        previewDepositElement,
        formatCurrency(
            depositAmount
        )
    );


    setText(
        previewAfterElement,
        formatCurrency(
            after
        )
    );


    if (
        depositAmount >
        cashInHand
    ) {

        submitBtn.disabled =
            true;


        showMessage(
            `Deposit amount cannot exceed available cash in hand (${formatCurrency(
                cashInHand
            )}).`
        );

    } else {

        submitBtn.disabled =
            false;


        if (
            messageElement.classList.contains(
                "error"
            )
        ) {

            clearMessage();

        }

    }

}


// ============================================================
// RENDER HISTORY
// ============================================================

function renderHistory() {

    if (
        !historyListElement
    ) {
        return;
    }


    if (
        !allDepositRequests.length
    ) {

        historyListElement.innerHTML =
            `
            <div class="empty">
                No deposit requests yet.
            </div>
            `;

        return;

    }


    const sortedRequests =
        [...allDepositRequests].sort(
            (
                a,
                b
            ) => {

                const dateA =
                    parseDate(
                        firstValue(
                            a,
                            [
                                "depositDate",
                                "requestDate",
                                "createdAt"
                            ],
                            ""
                        )
                    );


                const dateB =
                    parseDate(
                        firstValue(
                            b,
                            [
                                "depositDate",
                                "requestDate",
                                "createdAt"
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


    historyListElement.innerHTML =
        sortedRequests
            .map(
                request =>
                    createHistoryItem(
                        request
                    )
            )
            .join("");

}


// ============================================================
// HISTORY ITEM
// ============================================================

function createHistoryItem(
    request
) {

    const amount =
        numberValue(
            request.amount,
            request.depositAmount
        );


    const status =
        String(
            request.status ||
            "pending"
        ).toLowerCase();


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
            ""
        );


    const date =
        firstValue(
            request,
            [
                "depositDate",
                "requestDate",
                "createdAt"
            ],
            ""
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


    return `
        <div class="history-item">

            <div>

                <div class="history-date">
                    ${formatDate(date)}
                </div>

                <div class="history-meta">
                    Mode: ${escapeHtml(mode)}
                    ${
                        reference
                            ? ` | Ref: ${escapeHtml(reference)}`
                            : ""
                    }
                </div>

            </div>


            <div class="history-amount">
                ${formatCurrency(amount)}
            </div>


            <span
                class="status ${statusClass}"
            >
                ${statusLabel}
            </span>

        </div>
    `;

}


// ============================================================
// SUBMIT DEPOSIT
// ============================================================

async function submitDeposit(
    event
) {

    event.preventDefault();


    const amount =
        numberValue(
            depositAmountInput.value
        );


    const depositDate =
        depositDateInput.value;


    const depositMode =
        depositModeInput.value;


    const referenceNumber =
        referenceNumberInput.value.trim();


    const remarks =
        depositRemarksInput.value.trim();


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
        amount <= 0
    ) {

        showMessage(
            "Please enter a valid deposit amount."
        );

        depositAmountInput.focus();

        return;

    }


    if (
        amount >
        cashInHand
    ) {

        showMessage(
            `Deposit amount cannot exceed cash in hand (${formatCurrency(
                cashInHand
            )}).`
        );

        return;

    }


    if (
        !depositDate
    ) {

        showMessage(
            "Please select deposit date."
        );

        return;

    }


    if (
        !depositMode
    ) {

        showMessage(
            "Please select deposit mode."
        );

        return;

    }


    // ========================================================
    // CONFIRM
    // ========================================================

    const confirmed =
        confirm(
            `Submit deposit request for ${formatCurrency(
                amount
            )}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    submitBtn.disabled =
        true;


    submitBtn.textContent =
        "Submitting...";


    showLoading(true);


    try {

        const staffId =
            currentStaff.staffId ||
            currentStaff.staffDocumentId;


        const requestData = {

            staffId:
                staffId,

            staffDocumentId:
                currentStaff.staffDocumentId ||
                "",

            staffName:
                currentStaff.staffName ||
                "",

            amount:
                amount,

            depositAmount:
                amount,

            depositDate:
                depositDate,

            depositMode:
                depositMode,

            referenceNumber:
                referenceNumber,

            remarks:
                remarks,

            status:
                "pending",

            requestType:
                "staff_collection_deposit",

            totalCollectedAtRequest:
                totalCollected,

            acceptedDepositsAtRequest:
                acceptedDeposits,

            pendingDepositsAtRequest:
                pendingDepositRequests,

            cashInHandAtRequest:
                cashInHand,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        const depositRef =
            await addDoc(
                collection(
                    db,
                    "depositRequests"
                ),
                requestData
            );


        console.log(
            "Deposit request created:",
            depositRef.id
        );


        showMessage(
            `Deposit request submitted successfully. Request ID: ${depositRef.id}`,
            "success"
        );


        // ====================================================
        // RESET
        // ====================================================

        depositAmountInput.value =
            "";

        referenceNumberInput.value =
            "";

        depositRemarksInput.value =
            "";


        // ====================================================
        // RELOAD
        // ====================================================

        await loadData();


    } catch (
        error
    ) {

        console.error(
            "Deposit request error:",
            error
        );


        showMessage(
            `Unable to submit deposit request: ${error.message}`
        );

    } finally {

        showLoading(false);

        submitBtn.disabled =
            false;

        submitBtn.textContent =
            "Submit Deposit Request";

    }

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

}


// ============================================================
// CLEAR MESSAGE
// ============================================================

function clearMessage() {

    if (
        !messageElement
    ) {
        return;
    }


    messageElement.textContent =
        "";


    messageElement.className =
        "message";

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
// ESCAPE HTML
// ============================================================

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
// INPUT EVENT
// ============================================================

if (
    depositAmountInput
) {

    depositAmountInput.addEventListener(
        "input",
        updatePreview
    );

}


// ============================================================
// FORM EVENT
// ============================================================

if (
    depositForm
) {

    depositForm.addEventListener(
        "submit",
        submitDeposit
    );

}


// ============================================================
// CANCEL
// ============================================================

if (
    cancelBtn
) {

    cancelBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-dashboard.html";

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
                "staff-dashboard.html";

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
                "srStaffSession"
            );


            sessionStorage.removeItem(
                "srStaffUid"
            );


            window.location.href =
                "staff-login.html";

        }
    );

}


// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        const session =
            getStaffSession();


        if (
            !session ||
            session.role !==
            "staff"
        ) {

            window.location.href =
                "staff-login.html";

            return;

        }


        if (
            !user
        ) {

            window.location.href =
                "staff-login.html";

            return;

        }


        currentStaff =
            session;


        staffNameElement.value =
            currentStaff.staffName ||
            "Staff";


        depositDateInput.value =
            getTodayInputValue();


        await loadData();

    }
);
