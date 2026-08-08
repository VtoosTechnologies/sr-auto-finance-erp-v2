// =====================================================
// SR AUTO FINANCE ERP
// Loan Closing Controller
// File: js/loan-close.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const message =
    document.getElementById("message");

const closeLoanBtn =
    document.getElementById("closeLoanBtn");

const penaltyAmount =
    document.getElementById("penaltyAmount");

const waiverAmount =
    document.getElementById("waiverAmount");

const settlementAmount =
    document.getElementById("settlementAmount");

const finalPayable =
    document.getElementById("finalPayable");

const closingDate =
    document.getElementById("closingDate");

const closingRemarks =
    document.getElementById("closingRemarks");

const documentCheckList =
    document.getElementById(
        "documentCheckList"
    );

const closingWarning =
    document.getElementById(
        "closingWarning"
    );


// =====================================================
// URL
// =====================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const loanDocumentId =
    urlParams.get("id");


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let currentLoan = null;

let loanDocuments = [];

let calculatedOverallDue = 0;

let documentsReady = false;


// =====================================================
// HELPERS
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
// DATE
// =====================================================

function getTodayDate() {

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

    return `${year}-${month}-${day}`;

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value) {

    if (!value) {
        return "-";
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
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch (error) {

        return "-";

    }

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

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


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    text,
    type = "error"
) {

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.className =
        `message ${type}`;

}


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.textContent =
        value ?? "-";

}


// =====================================================
// LOAD LOAN
// =====================================================

async function loadLoan() {

    if (!loanDocumentId) {

        showMessage(
            "Loan ID is missing."
        );

        disableCloseButton();

        return;

    }


    try {

        const loanRef =
            doc(
                db,
                "loans",
                loanDocumentId
            );


        const loanSnap =
            await getDoc(
                loanRef
            );


        if (!loanSnap.exists()) {

            showMessage(
                "Loan not found."
            );

            disableCloseButton();

            return;

        }


        currentLoan = {

            id:
                loanSnap.id,

            ...loanSnap.data()

        };


        const status =
            String(
                currentLoan.status ||
                "Active"
            ).toLowerCase();


        if (
            status === "closed" ||
            status === "completed"
        ) {

            showMessage(
                "This loan is already closed."
            );

            disableCloseButton();

        }


        renderLoan();


        calculateOverallDue();


        await loadDocuments();


    } catch (error) {

        console.error(
            "Loan loading error:",
            error
        );

        showMessage(
            "Unable to load loan details."
        );

        disableCloseButton();

    }

}


// =====================================================
// RENDER LOAN
// =====================================================

function renderLoan() {

    const loan =
        currentLoan;


    setText(
        "loanId",
        loan.loanId ||
        loan.loanNumber ||
        loan.id
    );


    setText(
        "loanType",
        loan.loanType ===
            "reloan"
            ? "ReLoan"
            : "New Loan"
    );


    setText(
        "customerId",
        loan.customerId ||
        "-"
    );


    setText(
        "customerName",
        loan.customerName ||
        "-"
    );


    setText(
        "customerMobile",
        loan.customerMobile ||
        loan.mobile ||
        "-"
    );


    setText(
        "loanDate",
        formatDate(
            loan.loanDate
        )
    );


    const vehicle =
        [
            loan.vehicleBrand,
            loan.vehicleModel
        ]
        .filter(Boolean)
        .join(" ");


    setText(
        "vehicle",
        vehicle ||
        loan.vehicleType ||
        "-"
    );


    setText(
        "vehicleNumber",
        loan.vehicleNumber ||
        "-"
    );


    setText(
        "chassisNumber",
        loan.chassisNumber ||
        "-"
    );


    setText(
        "engineNumber",
        loan.engineNumber ||
        "-"
    );

}


// =====================================================
// CALCULATE OVERALL DUE
// =====================================================

function calculateOverallDue() {

    if (!currentLoan) {
        return 0;
    }


    /*
     * Priority:
     *
     * outstandingAmount
     * balanceAmount
     * remainingAmount
     *
     * This is the current loan
     * outstanding before closing penalty.
     */

    const outstanding =
        Number(
            currentLoan.outstandingAmount ??
            currentLoan.balanceAmount ??
            currentLoan.remainingAmount ??
            0
        ) || 0;


    const penalty =
        Number(
            penaltyAmount?.value
        ) || 0;


    const waiver =
        Number(
            waiverAmount?.value
        ) || 0;


    calculatedOverallDue =
        Math.max(
            outstanding +
            penalty -
            waiver,
            0
        );


    setText(
        "principalOutstanding",
        formatCurrency(
            outstanding
        )
    );


    /*
     * Interest outstanding is displayed
     * separately where available.
     *
     * If the loan does not store a separate
     * interest outstanding field, we show ₹0.
     */

    const interestOutstanding =
        Number(
            currentLoan.interestOutstanding ??
            0
        ) || 0;


    setText(
        "interestOutstanding",
        formatCurrency(
            interestOutstanding
        )
    );


    setText(
        "penaltyDisplay",
        formatCurrency(
            penalty
        )
    );


    setText(
        "overallDue",
        formatCurrency(
            calculatedOverallDue
        )
    );


    /*
     * If settlement amount is empty,
     * automatically show calculated overall due.
     */

    if (
        settlementAmount &&
        settlementAmount.value === ""
    ) {

        finalPayable.textContent =
            formatCurrency(
                calculatedOverallDue
            );

    }


    updateClosingButton();


    return calculatedOverallDue;

}


// =====================================================
// SETTLEMENT DISPLAY
// =====================================================

function updateSettlementDisplay() {

    const manualSettlement =
        Number(
            settlementAmount?.value
        );


    if (
        settlementAmount &&
        settlementAmount.value !== "" &&
        !isNaN(manualSettlement)
    ) {

        finalPayable.textContent =
            formatCurrency(
                Math.max(
                    manualSettlement,
                    0
                )
            );

    } else {

        finalPayable.textContent =
            formatCurrency(
                calculatedOverallDue
            );

    }

}


// =====================================================
// INPUT EVENTS
// =====================================================

if (penaltyAmount) {

    penaltyAmount.addEventListener(
        "input",
        function() {

            calculateOverallDue();

        }
    );

}


if (waiverAmount) {

    waiverAmount.addEventListener(
        "input",
        function() {

            calculateOverallDue();

        }
    );

}


if (settlementAmount) {

    settlementAmount.addEventListener(
        "input",
        function() {

            updateSettlementDisplay();

            updateClosingButton();

        }
    );

}


// =====================================================
// LOAD DOCUMENTS
// =====================================================

async function loadDocuments() {

    try {

        documentCheckList.innerHTML = `
            <div
                style="
                    padding:20px;
                    text-align:center;
                    color:#94a3b8;
                    font-size:11px;
                "
            >
                Checking documents...
            </div>
        `;


        const documentsRef =
            collection(
                db,
                "documents"
            );


        const documentsQuery =
            query(
                documentsRef,
                where(
                    "loanDocumentId",
                    "==",
                    loanDocumentId
                )
            );


        const snapshot =
            await getDocs(
                documentsQuery
            );


        loanDocuments = [];


        snapshot.forEach(
            documentSnap => {

                loanDocuments.push({

                    id:
                        documentSnap.id,

                    ...documentSnap.data()

                });

            }
        );


        renderDocumentCheck();


    } catch (error) {

        console.error(
            "Document check error:",
            error
        );


        documentsReady =
            false;


        documentCheckList.innerHTML = `
            <div
                style="
                    padding:15px;
                    background:#fef2f2;
                    color:#b91c1c;
                    border-radius:9px;
                    font-size:11px;
                "
            >
                Unable to verify documents.
                Loan closing is blocked for safety.
            </div>
        `;


        updateClosingButton();

    }

}


// =====================================================
// DOCUMENT CLOSING RULE
// =====================================================

function isDocumentReady(
    documentItem
) {

    const status =
        String(
            documentItem.status ||
            "Pending"
        ).toLowerCase();


    /*
     * Required document must NOT be:
     *
     * Pending
     * Issued
     *
     * We require it to be physically
     * available with office/owner.
     */

    if (
        status === "pending"
    ) {

        return false;

    }


    if (
        status === "issued"
    ) {

        return false;

    }


    /*
     * Received / Returned are accepted.
     */

    if (
        status === "received" ||
        status === "returned"
    ) {

        return true;

    }


    return false;

}


// =====================================================
// RENDER DOCUMENT CHECK
// =====================================================

function renderDocumentCheck() {

    if (
        !loanDocuments.length
    ) {

        documentsReady =
            false;


        documentCheckList.innerHTML = `
            <div
                style="
                    padding:15px;
                    background:#fef2f2;
                    color:#b91c1c;
                    border-radius:9px;
                    font-size:11px;
                "
            >
                No document records found for this loan.
                Loan closing is blocked.
            </div>
        `;


        if (closingWarning) {

            closingWarning.classList.add(
                "show"
            );

        }


        updateClosingButton();

        return;

    }


    /*
     * Only documents marked
     * requiredForClosure = true
     * are checked.
     */

    const requiredDocuments =
        loanDocuments.filter(
            item =>
                item.requiredForClosure !==
                false
        );


    const failedDocuments =
        requiredDocuments.filter(
            item =>
                !isDocumentReady(
                    item
                )
        );


    documentsReady =
        failedDocuments.length === 0;


    documentCheckList.innerHTML =
        requiredDocuments
            .map(
                documentItem => {

                    const status =
                        String(
                            documentItem.status ||
                            "Pending"
                        );


                    const ready =
                        isDocumentReady(
                            documentItem
                        );


                    const statusLower =
                        status.toLowerCase();


                    let badgeClass =
                        "pending";


                    if (
                        statusLower ===
                        "issued"
                    ) {

                        badgeClass =
                            "staff";

                    }


                    if (
                        ready
                    ) {

                        badgeClass =
                            "ok";

                    }


                    const holder =
                        documentItem.currentHolder ||
                        "-";


                    return `

                        <div
                            class="document-check"
                        >

                            <div>

                                <div
                                    class="document-name"
                                >
                                    ${escapeHTML(
                                        documentItem.documentType ||
                                        "-"
                                    )}
                                </div>

                                <div
                                    class="document-holder"
                                >
                                    Current Holder:
                                    ${escapeHTML(
                                        holder
                                    )}
                                </div>

                            </div>


                            <span
                                class="badge ${badgeClass}"
                            >
                                ${escapeHTML(
                                    status
                                )}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");


    if (closingWarning) {

        if (documentsReady) {

            closingWarning.classList.remove(
                "show"
            );

        } else {

            closingWarning.classList.add(
                "show"
            );

        }

    }


    updateClosingButton();

}


// =====================================================
// UPDATE CLOSE BUTTON
// =====================================================

function updateClosingButton() {

    if (!closeLoanBtn) {
        return;
    }


    const status =
        String(
            currentLoan?.status ||
            ""
        ).toLowerCase();


    const alreadyClosed =
        status === "closed" ||
        status === "completed";


    const settlement =
        Number(
            settlementAmount?.value
        );


    const settlementValid =
        settlementAmount?.value !== "" &&
        !isNaN(settlement) &&
        settlement >= 0;


    /*
     * Closing is allowed only when:
     *
     * 1. Loan loaded
     * 2. Not already closed
     * 3. Documents ready
     * 4. Settlement amount entered
     */

    const canClose =
        Boolean(
            currentLoan &&
            !alreadyClosed &&
            documentsReady &&
            settlementValid
        );


    closeLoanBtn.disabled =
        !canClose;

}


// =====================================================
// VALIDATE BEFORE CLOSE
// =====================================================

function validateClosing() {

    if (!currentLoan) {

        return (
            "Loan information is not available."
        );

    }


    const status =
        String(
            currentLoan.status ||
            ""
        ).toLowerCase();


    if (
        status === "closed" ||
        status === "completed"
    ) {

        return (
            "This loan is already closed."
        );

    }


    if (
        !documentsReady
    ) {

        return (
            "All mandatory documents must be received/returned before closing the loan."
        );

    }


    if (
        settlementAmount.value === ""
    ) {

        return (
            "Please enter the final settlement amount."
        );

    }


    const settlement =
        Number(
            settlementAmount.value
        );


    if (
        isNaN(settlement) ||
        settlement < 0
    ) {

        return (
            "Please enter a valid settlement amount."
        );

    }


    const penalty =
        Number(
            penaltyAmount.value
        ) || 0;


    const waiver =
        Number(
            waiverAmount.value
        ) || 0;


    if (
        penalty < 0 ||
        waiver < 0
    ) {

        return (
            "Penalty and waiver cannot be negative."
        );

    }


    return null;

}


// =====================================================
// CLOSE LOAN
// =====================================================

async function closeLoan() {

    const validationError =
        validateClosing();


    if (validationError) {

        showMessage(
            validationError
        );

        return;

    }


    /*
     * Final confirmation.
     *
     * Owner/customer settlement is
     * manually agreed before this point.
     */

    const settlement =
        Number(
            settlementAmount.value
        ) || 0;


    const penalty =
        Number(
            penaltyAmount.value
        ) || 0;


    const waiver =
        Number(
            waiverAmount.value
        ) || 0;


    const confirmed =
        confirm(
            `Close Loan ${
                currentLoan.loanId ||
                currentLoan.id
            } for final settlement ${
                formatCurrency(
                    settlement
                )
            }?`
        );


    if (!confirmed) {
        return;
    }


    closeLoanBtn.disabled =
        true;


    closeLoanBtn.textContent =
        "Closing...";


    try {

        /*
         * Re-check documents immediately
         * before writing the final close.
         *
         * This prevents closing if another
         * user issued a document after page load.
         */

        await loadDocuments();


        if (
            !documentsReady
        ) {

            showMessage(
                "Loan cannot be closed because mandatory documents are not ready."
            );

            return;

        }


        const loanRef =
            doc(
                db,
                "loans",
                loanDocumentId
            );


        const today =
            closingDate.value ||
            getTodayDate();


        const remarks =
            closingRemarks.value.trim();


        const previousHistory =
            Array.isArray(
                currentLoan.closingHistory
            )
                ? [
                    ...currentLoan.closingHistory
                ]
                : [];


        previousHistory.push({

            action:
                "Loan Closed",

            date:
                today,

            calculatedOverallDue:
                calculatedOverallDue,

            penalty:
                penalty,

            waiver:
                waiver,

            finalSettlementAmount:
                settlement,

            remarks:
                remarks,

            closedBy:
                currentUser.uid

        });


        await updateDoc(
            loanRef,
            {

                // =====================================
                // STATUS
                // =====================================

                status:
                    "Closed",

                active:
                    false,

                // =====================================
                // CLOSING
                // =====================================

                closedDate:
                    today,

                closingDate:
                    today,

                closingStatus:
                    "Closed",

                // =====================================
                // AMOUNTS
                // =====================================

                calculatedOverallDue:
                    calculatedOverallDue,

                closingPenalty:
                    penalty,

                closingWaiver:
                    waiver,

                agreedClosingAmount:
                    settlement,

                finalSettlementAmount:
                    settlement,

                // =====================================
                // BALANCE
                // =====================================

                outstandingAmount:
                    0,

                balanceAmount:
                    0,

                remainingAmount:
                    0,

                // =====================================
                // REMARKS
                // =====================================

                closingRemarks:
                    remarks,

                // =====================================
                // HISTORY
                // =====================================

                closingHistory:
                    previousHistory,

                // =====================================
                // META
                // =====================================

                updatedAt:
                    serverTimestamp(),

                closedBy:
                    currentUser.uid

            }
        );


        showMessage(
            `Loan ${
                currentLoan.loanId ||
                currentLoan.id
            } closed successfully.`,
            "success"
        );


        /*
         * Redirect to loan view
         * after successful closing.
         */

        setTimeout(
            function() {

                window.location.href =
                    `loan-view.html?id=${encodeURIComponent(
                        loanDocumentId
                    )}`;

            },
            1200
        );


    } catch (error) {

        console.error(
            "Loan closing error:",
            error
        );


        showMessage(
            "Unable to close loan. Please try again."
        );

    } finally {

        closeLoanBtn.disabled =
            false;

        closeLoanBtn.textContent =
            "Close Loan";

        updateClosingButton();

    }

}


// =====================================================
// CLOSE BUTTON
// =====================================================

if (closeLoanBtn) {

    closeLoanBtn.addEventListener(
        "click",
        closeLoan
    );

}


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


        currentUser =
            user;


        if (closingDate) {

            closingDate.value =
                getTodayDate();

        }


        await loadLoan();

    }
);
