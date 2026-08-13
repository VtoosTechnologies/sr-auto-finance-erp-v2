// =====================================================
// SR AUTO FINANCE ERP
// Loans Controller
// File: js/loans.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const tableBody =
    document.getElementById("loanTableBody");

const searchInput =
    document.getElementById("searchInput");

const totalLoansElement =
    document.getElementById("totalLoans");

const activeLoansElement =
    document.getElementById("activeLoans");

const totalDisbursedElement =
    document.getElementById("totalDisbursed");

const totalOutstandingElement =
    document.getElementById("totalOutstanding");


// =====================================================
// DATA
// =====================================================

let loans = [];

let payments = [];

let paymentMap = new Map();


// =====================================================
// FORMAT CURRENCY
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
// NUMBER
// =====================================================

function numberValue(...values) {

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
// NORMALIZE
// =====================================================

function normalize(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


// =====================================================
// DATE FORMAT
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
                day:
                    "2-digit",
                month:
                    "2-digit",
                year:
                    "numeric"
            }
        );

    } catch (
        error
    ) {

        return "-";

    }

}


// =====================================================
// DATE SORT
// =====================================================

function getDateValue(value) {

    if (!value) {

        return 0;

    }


    if (
        value &&
        typeof value.toDate ===
            "function"
    ) {

        return value
            .toDate()
            .getTime();

    }


    const date =
        new Date(value);


    return isNaN(
        date.getTime()
    )
        ? 0
        : date.getTime();

}


// =====================================================
// GET LOAN ID
// =====================================================

function getLoanId(loan) {

    return (

        loan.loanId ||

        loan.loanNumber ||

        loan.loanCode ||

        loan.id ||

        "-"

    );

}


// =====================================================
// GET LOAN AMOUNT
// =====================================================

function getLoanAmount(loan) {

    return numberValue(

        loan.loanAmount,

        loan.principalAmount,

        loan.amount,

        loan.disbursedAmount

    );

}


// =====================================================
// GET TOTAL PAYABLE
// =====================================================

function getTotalPayable(loan) {

    const principal =
        getLoanAmount(
            loan
        );


    const interest =
        numberValue(
            loan.interestAmount
        );


    return numberValue(

        loan.totalPayable,

        loan.totalAmount,

        principal +
        interest

    );

}


// =====================================================
// GET PAYMENT LOAN ID
// =====================================================

function getPaymentLoanId(
    payment
) {

    return String(

        payment.loanDocumentId ||

        payment.loanId ||

        payment.loanNumber ||

        payment.loanCode ||

        ""

    )
        .trim();

}


// =====================================================
// BUILD PAYMENT MAP
// =====================================================

function buildPaymentMap() {

    paymentMap =
        new Map();


    payments.forEach(
        payment => {

            const loanId =
                getPaymentLoanId(
                    payment
                );


            if (!loanId) {

                return;

            }


            const key =
                String(
                    loanId
                );


            if (
                !paymentMap.has(
                    key
                )
            ) {

                paymentMap.set(
                    key,
                    {
                        paid:
                            0,

                        penalty:
                            0,

                        totalCollection:
                            0,

                        count:
                            0
                    }
                );

            }


            const summary =
                paymentMap.get(
                    key
                );


            const status =
                normalize(
                    payment.status ||
                    "success"
                );


            if (
                [
                    "cancelled",
                    "canceled",
                    "reversed",
                    "failed",
                    "deleted"
                ].includes(
                    status
                )
            ) {

                return;

            }


            const paid =
                numberValue(

                    payment.paidAmount,

                    payment.amount,

                    payment.paymentAmount

                );


            const penalty =
                numberValue(

                    payment.penalty,

                    payment.penaltyAmount

                );


            const totalCollection =
                numberValue(

                    payment.totalCollection,

                    payment.totalReceived,

                    paid +
                    penalty

                );


            summary.paid +=
                paid;


            summary.penalty +=
                penalty;


            summary.totalCollection +=
                totalCollection;


            summary.count++;

        }
    );

}


// =====================================================
// GET PAID AMOUNT
// =====================================================

function getPaidAmount(loan) {

    const id =
        getLoanId(
            loan
        );


    const summary =
        paymentMap.get(
            String(id)
        );


    if (
        summary &&
        summary.count > 0
    ) {

        return Math.max(
            summary.paid,
            0
        );

    }


    // Legacy fallback
    return numberValue(

        loan.amountPaid,

        loan.paidAmount

    );

}


// =====================================================
// GET OUTSTANDING
// =====================================================
//
// IMPORTANT:
// Stored outstandingAmount is NOT used as
// primary source.
//
// Fresh calculation:
// Total Payable - Actual Payments
// =====================================================

function getOutstanding(loan) {

    const totalPayable =
        getTotalPayable(
            loan
        );


    const paidAmount =
        getPaidAmount(
            loan
        );


    return Math.max(

        totalPayable -
        paidAmount,

        0

    );

}


// =====================================================
// GET PRINCIPAL OUTSTANDING
// =====================================================

function getPrincipalOutstanding(
    loan
) {

    const principal =
        getLoanAmount(
            loan
        );


    const paidAmount =
        getPaidAmount(
            loan
        );


    /*
     * Current payment structure records
     * total EMI/payment amount but does not
     * yet have principal/interest split.
     *
     * Until split fields are available,
     * this is kept as a safe derived value.
     */

    return Math.max(

        principal -
        paidAmount,

        0

    );

}


// =====================================================
// GET STATUS
// =====================================================

function getStatus(loan) {

    return String(

        loan.status ??

        "Active"

    );

}


// =====================================================
// LOAD LOANS
// =====================================================

async function loadLoans() {

    try {

        showLoading();


        const [
            loansSnapshot,
            paymentsSnapshot
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
            )

        ]);


        loans = [];


        loansSnapshot.forEach(
            loanDoc => {

                loans.push({

                    id:
                        loanDoc.id,

                    ...loanDoc.data()

                });

            }
        );


        payments = [];


        paymentsSnapshot.forEach(
            paymentDoc => {

                payments.push({

                    id:
                        paymentDoc.id,

                    ...paymentDoc.data()

                });

            }
        );


        buildPaymentMap();


        loans.sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    getDateValue(

                        first.createdAt ||

                        first.loanDate ||

                        first.startDate

                    );


                const secondDate =
                    getDateValue(

                        second.createdAt ||

                        second.loanDate ||

                        second.startDate

                    );


                return (
                    secondDate -
                    firstDate
                );

            }
        );


        updateSummary();


        renderLoans(
            loans
        );


    } catch (
        error
    ) {

        console.error(
            "Loan loading error:",
            error
        );


        showError(
            "Unable to load loans. Please try again."
        );

    }

}


// =====================================================
// UPDATE SUMMARY
// =====================================================

function updateSummary() {

    let activeCount =
        0;


    let totalDisbursed =
        0;


    let totalOutstanding =
        0;


    loans.forEach(
        loan => {

            const status =
                normalize(
                    getStatus(
                        loan
                    )
                );


            if (
                status ===
                    "active" ||

                status ===
                    "running" ||

                status ===
                    "open"
            ) {

                activeCount++;

            }


            /*
             * Loan page shows principal
             * disbursed.
             */

            totalDisbursed +=
                getLoanAmount(
                    loan
                );


            /*
             * Outstanding is freshly
             * calculated from payable
             * and actual payment records.
             */

            totalOutstanding +=
                getOutstanding(
                    loan
                );

        }
    );


    totalLoansElement.textContent =
        loans.length;


    activeLoansElement.textContent =
        activeCount;


    totalDisbursedElement.textContent =
        formatCurrency(
            totalDisbursed
        );


    totalOutstandingElement.textContent =
        formatCurrency(
            totalOutstanding
        );

}


// =====================================================
// RENDER LOANS
// =====================================================

function renderLoans(
    list
) {

    if (
        !list.length
    ) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                >

                    <div
                        class="empty-state"
                    >

                        <div
                            class="empty-icon"
                        >
                            💳
                        </div>

                        <p>
                            No loan accounts found.
                        </p>

                    </div>

                </td>

            </tr>

        `;


        return;

    }


    tableBody.innerHTML =

        list.map(
            loan => {

                const loanId =
                    getLoanId(
                        loan
                    );


                const customerName =

                    loan.customerName ||

                    loan.name ||

                    "-";


                const mobile =

                    loan.customerMobile ||

                    loan.mobile ||

                    loan.phone ||

                    "-";


                const amount =
                    getLoanAmount(
                        loan
                    );


                const outstanding =
                    getOutstanding(
                        loan
                    );


                const status =
                    getStatus(
                        loan
                    );


                const statusLower =
                    normalize(
                        status
                    );


                let statusClass =
                    "active";


                if (
                    statusLower ===
                    "closed"
                ) {

                    statusClass =
                        "closed";

                }


                if (
                    statusLower ===
                    "overdue"
                ) {

                    statusClass =
                        "overdue";

                }


                const startDate =

                    loan.loanDate ||

                    loan.startDate ||

                    loan.createdAt;


                return `

                    <tr>

                        <td>

                            <span
                                class="loan-id"
                            >

                                ${escapeHTML(
                                    loanId
                                )}

                            </span>

                        </td>


                        <td>

                            <span
                                class="customer-name"
                            >

                                ${escapeHTML(
                                    customerName
                                )}

                            </span>

                        </td>


                        <td>

                            ${escapeHTML(
                                mobile
                            )}

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

                            <span
                                class="amount"
                            >

                                ${formatCurrency(
                                    outstanding
                                )}

                            </span>

                        </td>


                        <td>

                            ${formatDate(
                                startDate
                            )}

                        </td>


                        <td>

                            <span
                                class="
                                    status
                                    ${statusClass}
                                "
                            >

                                ${escapeHTML(
                                    status
                                )}

                            </span>

                        </td>


                        <td>

                            <div
                                style="
                                    display:flex;
                                    gap:6px;
                                    flex-wrap:wrap;
                                "
                            >

                                <button
                                    class="action-btn"
                                    data-id="${escapeHTML(
                                        loan.id
                                    )}"
                                    onclick="viewLoan(this.dataset.id)"
                                >
                                    View
                                </button>


                                ${
                                    statusLower ===
                                    "active"
                                        ? `

                                            <button
                                                class="action-btn"
                                                style="
                                                    border-color:#16a34a;
                                                    color:#15803d;
                                                "
                                                data-id="${escapeHTML(
                                                    loan.id
                                                )}"
                                                onclick="closeLoan(this.dataset.id)"
                                            >
                                                Close
                                            </button>

                                          `
                                        : ""
                                }

                            </div>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// =====================================================
// SEARCH
// =====================================================

if (
    searchInput
) {

    searchInput.addEventListener(

        "input",

        function () {

            const search =
                this.value
                    .trim()
                    .toLowerCase();


            if (
                !search
            ) {

                renderLoans(
                    loans
                );

                return;

            }


            const filtered =
                loans.filter(
                    loan => {

                        const loanId =

                            String(

                                loan.loanId ||

                                loan.loanNumber ||

                                loan.loanCode ||

                                loan.id ||

                                ""

                            )
                                .toLowerCase();


                        const customerName =

                            String(

                                loan.customerName ||

                                loan.name ||

                                ""

                            )
                                .toLowerCase();


                        const mobile =

                            String(

                                loan.customerMobile ||

                                loan.mobile ||

                                loan.phone ||

                                ""

                            )
                                .toLowerCase();


                        return (

                            loanId.includes(
                                search
                            ) ||

                            customerName.includes(
                                search
                            ) ||

                            mobile.includes(
                                search
                            )

                        );

                    }
                );


            renderLoans(
                filtered
            );

        }

    );

}


// =====================================================
// VIEW LOAN
// =====================================================

window.viewLoan =
    function (
        loanId
    ) {

        if (
            !loanId
        ) {

            return;

        }


        window.location.href =
            `loan-view.html?id=${
                encodeURIComponent(
                    loanId
                )
            }`;

    };


// =====================================================
// CLOSE LOAN
// =====================================================

window.closeLoan =
    function (
        loanId
    ) {

        if (
            !loanId
        ) {

            return;

        }


        window.location.href =
            `loan-close.html?id=${
                encodeURIComponent(
                    loanId
                )
            }`;

    };


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    tableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
            >

                <div
                    class="empty-state"
                >

                    <div
                        class="empty-icon"
                    >
                        ⏳
                    </div>

                    <p>
                        Loading loans...
                    </p>

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// ERROR
// =====================================================

function showError(
    errorMessage
) {

    tableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
            >

                <div
                    class="empty-state"
                >

                    <div
                        class="empty-icon"
                    >
                        ⚠️
                    </div>

                    <p>

                        ${escapeHTML(
                            errorMessage
                        )}

                    </p>

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(

    auth,

    async function (
        user
    ) {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        await loadLoans();

    }

);
