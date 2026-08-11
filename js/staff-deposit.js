// ============================================================
// SR AUTO FINANCE ERP
// STAFF DEPOSIT MODULE
//
// File:
// js/staff-deposit.js
//
// STAFF ACCESS:
// - View own collection
// - Submit deposit request
// - View own deposit history
//
// STAFF CANNOT:
// - Approve deposit
// - Edit approved deposit
// - Directly update cash ledger
// - Modify loan
// - Modify customer
//
// OWNER:
// - Will approve / reject deposit request
// - Owner approval module will update financial records
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

let currentUser = null;

let currentStaff = null;

let allPayments = [];

let allDepositRequests = [];

let totalCollected = 0;

let acceptedDeposits = 0;

let pendingDepositRequests = 0;

let cashInHand = 0;

let isSubmitting = false;


// ============================================================
// STAFF SESSION
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

    } catch (error) {

        console.error(
            "Staff session error:",
            error
        );


        sessionStorage.removeItem(
            "srStaffSession"
        );


        sessionStorage.removeItem(
            "srStaffUid"
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
// TODAY
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
// PAYMENT STAFF MATCH
// ============================================================

function paymentBelongsToStaff(
    payment
) {

    if (!currentStaff) {
        return false;
    }


    const sessionStaffId =
        String(
            currentStaff.staffId ||
            ""
        ).trim();


    const sessionDocumentId =
        String(
            currentStaff.staffDocumentId ||
            ""
        ).trim();


    const sessionUid =
        String(
            currentUser?.uid ||
            ""
        ).trim();


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

        ).trim();


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

        ).trim();


    const paymentCreatedBy =
        String(

            firstValue(

                payment,

                [
                    "createdBy",
                    "createdByUid",
                    "collectorUid"
                ],

                ""

            )

        ).trim();


    // ---------------------------------------------------------
    // STAFF ID MATCH
    // ---------------------------------------------------------

    if (
        paymentStaffId &&
        (
            paymentStaffId ===
                sessionStaffId ||

            paymentStaffId ===
                sessionDocumentId
        )
    ) {

        return true;

    }


    // ---------------------------------------------------------
    // STAFF DOCUMENT MATCH
    // ---------------------------------------------------------

    if (
        paymentStaffDocumentId &&
        paymentStaffDocumentId ===
        sessionDocumentId
    ) {

        return true;

    }


    // ---------------------------------------------------------
    // AUTH UID MATCH
    // ---------------------------------------------------------

    if (
        sessionUid &&
        paymentCreatedBy ===
        sessionUid
    ) {

        return true;

    }


    return false;

}


// ============================================================
// DEPOSIT STAFF MATCH
// ============================================================

function depositBelongsToStaff(
    request
) {

    if (!currentStaff) {
        return false;
    }


    const sessionStaffId =
        String(
            currentStaff.staffId ||
            ""
        ).trim();


    const sessionDocumentId =
        String(
            currentStaff.staffDocumentId ||
            ""
        ).trim();


    const sessionUid =
        String(
            currentUser?.uid ||
            ""
        ).trim();


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

        ).trim();


    const requestStaffDocumentId =
        String(

            firstValue(

                request,

                [
                    "staffDocumentId"
                ],

                ""

            )

        ).trim();


    const requestCreatedBy =
        String(

            firstValue(

                request,

                [
                    "createdBy",
                    "createdByUid"
                ],

                ""

            )

        ).trim();


    // ---------------------------------------------------------
    // STAFF ID MATCH
    // ---------------------------------------------------------

    if (
        requestStaffId &&
        (
            requestStaffId ===
                sessionStaffId ||

            requestStaffId ===
                sessionDocumentId
        )
    ) {

        return true;

    }


    // ---------------------------------------------------------
    // DOCUMENT ID MATCH
    // ---------------------------------------------------------

    if (
        requestStaffDocumentId &&
        requestStaffDocumentId ===
        sessionDocumentId
    ) {

        return true;

    }


    // ---------------------------------------------------------
    // AUTH UID MATCH
    // ---------------------------------------------------------

    if (
        sessionUid &&
        requestCreatedBy ===
        sessionUid
    ) {

        return true;

    }


    return false;

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


        // =====================================================
        // PAYMENTS
        // =====================================================

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


                // Ignore cancelled/reversed
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


        // =====================================================
        // DEPOSIT REQUESTS
        // =====================================================

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


        // =====================================================
        // CALCULATE
        // =====================================================

        calculateBalances();


        // =====================================================
        // RENDER
        // =====================================================

        renderSummary();

        renderHistory();


    } catch (error) {

        console.error(
            "Staff deposit loading error:",
            error
        );


        showMessage(

            `Unable to load deposit details: ${error.message}`

        );


        if (
            historyListElement
        ) {

            historyListElement.innerHTML = `

                <div class="empty">

                    Unable to load deposit requests.

                </div>

            `;

        }

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
    // PENDING DEPOSITS
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
    // - pending deposits
    //
    // Pending request is already committed.
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


    // ========================================================
    // VALIDATE AMOUNT
    // ========================================================

    if (
        depositAmount >
        cashInHand
    ) {

        if (submitBtn) {

            submitBtn.disabled =
                true;

        }


        showMessage(

            `Deposit amount cannot exceed available cash in hand (${formatCurrency(
                cashInHand
            )}).`

        );


    } else {

        if (submitBtn && !isSubmitting) {

            submitBtn.disabled =
                false;

        }


        if (
            messageElement?.classList.contains(
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

        historyListElement.innerHTML = `

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
                    )

                    -

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

                    Mode:
                    ${escapeHtml(mode)}

                    ${
                        reference

                            ? ` | Ref: ${escapeHtml(
                                reference
                            )}`

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


    if (isSubmitting) {

        return;

    }


    clearMessage();


    // ========================================================
    // SESSION CHECK
    // ========================================================

    if (
        !currentUser ||
        !currentStaff
    ) {

        showMessage(
            "Staff session expired. Please login again."
        );


        return;

    }


    // ========================================================
    // AMOUNT
    // ========================================================

    const amount =
        numberValue(

            depositAmountInput?.value

        );


    // ========================================================
    // FORM VALUES
    // ========================================================

    const depositDate =
        depositDateInput?.value || "";


    const depositMode =
        depositModeInput?.value || "";


    const referenceNumber =
        referenceNumberInput?.value
            ?.trim() || "";


    const remarks =
        depositRemarksInput?.value
            ?.trim() || "";


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
        amount <= 0
    ) {

        showMessage(
            "Please enter a valid deposit amount."
        );


        depositAmountInput?.focus();


        return;

    }


    // ========================================================
    // IMPORTANT:
    // DO NOT ALLOW MORE THAN CASH IN HAND
    // ========================================================

    if (
        amount >
        cashInHand
    ) {

        showMessage(

            `Deposit amount cannot exceed available cash in hand (${formatCurrency(
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


    if (!confirmed) {

        return;

    }


    isSubmitting =
        true;


    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.textContent =
            "Submitting...";

    }


    showLoading(true);


    try {

        // ====================================================
        // STAFF IDENTIFIERS
        // ====================================================

        const staffId =

            currentStaff.staffId ||

            currentStaff.staffDocumentId ||

            currentUser.uid;


        const staffDocumentId =

            currentStaff.staffDocumentId ||

            "";


        const staffName =

            currentStaff.staffName ||

            currentStaff.name ||

            "Staff";


        // ====================================================
        // CREATE PENDING REQUEST
        // ====================================================

        const requestData = {

            // ------------------------------------------------
            // STAFF
            // ------------------------------------------------

            staffId:
                String(staffId),

            staffDocumentId:
                String(staffDocumentId),

            staffName:
                String(staffName),


            // ------------------------------------------------
            // AMOUNT
            // ------------------------------------------------

            amount:
                amount,

            depositAmount:
                amount,


            // ------------------------------------------------
            // DEPOSIT DETAILS
            // ------------------------------------------------

            depositDate:
                depositDate,

            depositMode:
                depositMode,

            referenceNumber:
                referenceNumber,

            remarks:
                remarks,


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            status:
                "pending",

            requestType:
                "staff_collection_deposit",


            // ------------------------------------------------
            // SNAPSHOT AT REQUEST TIME
            // ------------------------------------------------

            totalCollectedAtRequest:
                totalCollected,

            acceptedDepositsAtRequest:
                acceptedDeposits,

            pendingDepositsAtRequest:
                pendingDepositRequests,

            cashInHandAtRequest:
                cashInHand,


            // ------------------------------------------------
            // AUDIT
            // ------------------------------------------------

            createdBy:
                currentUser.uid,

            createdByRole:
                "staff",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        // ====================================================
        // CREATE REQUEST
        // ====================================================

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


        // ====================================================
        // SUCCESS
        // ====================================================

        showMessage(

            `Deposit request submitted successfully. Request ID: ${depositRef.id}`,

            "success"

        );


        // ====================================================
        // RESET FORM
        // ====================================================

        if (depositAmountInput) {

            depositAmountInput.value =
                "";

        }


        if (referenceNumberInput) {

            referenceNumberInput.value =
                "";

        }


        if (depositRemarksInput) {

            depositRemarksInput.value =
                "";

        }


        // ====================================================
        // IMPORTANT
        //
        // After creating pending request,
        // pending amount increases,
        // therefore cash-in-hand decreases.
        // ====================================================

        await loadData();


    } catch (error) {

        console.error(
            "Deposit request error:",
            error
        );


        showMessage(

            `Unable to submit deposit request: ${error.message}`

        );


    } finally {

        showLoading(false);


        isSubmitting =
            false;


        if (submitBtn) {

            submitBtn.disabled =
                false;

            submitBtn.textContent =
                "Submit Deposit Request";

        }


        updatePreview();

    }

}


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    text,
    type = "error"
) {

    if (
        !messageElement
    ) {

        return;

    }


    messageElement.textContent =
        text;


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
// DEPOSIT AMOUNT INPUT
// ============================================================

if (
    depositAmountInput
) {

    depositAmountInput.addEventListener(

        "input",

        function () {

            clearMessage();

            updatePreview();

        }

    );

}


// ============================================================
// DEPOSIT MODE
// ============================================================

if (
    depositModeInput
) {

    depositModeInput.addEventListener(

        "change",

        function () {

            clearMessage();

        }

    );

}


// ============================================================
// FORM
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

        function () {

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

        function () {

            window.location.href =
                "staff-dashboard.html";

        }

    );

}


// ============================================================
// LOGOUT
//
// Staff logout:
// Firebase signOut
// + clear staff session
// + go common staff login
// ============================================================

if (
    logoutBtn
) {

    logoutBtn.addEventListener(

        "click",

        async function () {

            if (
                !confirm(
                    "Are you sure you want to logout?"
                )
            ) {

                return;

            }


            try {

                await signOut(
                    auth
                );

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }


            sessionStorage.removeItem(
                "srStaffSession"
            );


            sessionStorage.removeItem(
                "srStaffUid"
            );


            window.location.replace(
                "staff-login.html"
            );

        }

    );

}


// ============================================================
// AUTH CHECK
// ============================================================

onAuthStateChanged(

    auth,

    async function (user) {

        const session =
            getStaffSession();


        // =====================================================
        // STAFF SESSION REQUIRED
        // =====================================================

        if (
            !session ||
            String(
                session.role || ""
            ).toLowerCase() !==
            "staff"
        ) {

            window.location.replace(
                "staff-login.html"
            );


            return;

        }


        // =====================================================
        // FIREBASE LOGIN REQUIRED
        // =====================================================

        if (!user) {

            window.location.replace(
                "staff-login.html"
            );


            return;

        }


        // =====================================================
        // SET GLOBAL SESSION
        // =====================================================

        currentUser =
            user;


        currentStaff =
            session;


        // =====================================================
        // STAFF NAME
        // =====================================================

        if (
            staffNameElement
        ) {

            staffNameElement.value =

                currentStaff.staffName ||

                currentStaff.name ||

                "Staff";

        }


        // =====================================================
        // DATE
        // =====================================================

        if (
            depositDateInput
        ) {

            depositDateInput.value =
                getTodayInputValue();

        }


        // =====================================================
        // INITIAL LOAD
        // =====================================================

        await loadData();

    }

);
