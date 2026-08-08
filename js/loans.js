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
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

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
            typeof value.toDate === "function"
        ) {

            date = value.toDate();

        } else {

            date = new Date(value);

        }


        if (isNaN(date.getTime())) {
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
// DATE SORT VALUE
// =====================================================

function getDateValue(value) {

    if (!value) {
        return 0;
    }


    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value.toDate().getTime();

    }


    const date =
        new Date(value);


    return isNaN(date.getTime())
        ? 0
        : date.getTime();

}


// =====================================================
// LOAD LOANS
// =====================================================

async function loadLoans() {

    try {

        showLoading();


        const loansRef =
            collection(
                db,
                "loans"
            );


        const snapshot =
            await getDocs(
                loansRef
            );


        loans = [];


        snapshot.forEach(
            (loanDoc) => {

                loans.push({

                    id:
                        loanDoc.id,

                    ...loanDoc.data()

                });

            }
        );


        // Newest first

        loans.sort(
            (a, b) => {

                const dateA =
                    getDateValue(
                        a.createdAt ||
                        a.loanDate ||
                        a.startDate
                    );


                const dateB =
                    getDateValue(
                        b.createdAt ||
                        b.loanDate ||
                        b.startDate
                    );


                return dateB - dateA;

            }
        );


        updateSummary();

        renderLoans(
            loans
        );


    } catch (error) {

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
// GET LOAN AMOUNT
// =====================================================

function getLoanAmount(loan) {

    return Number(

        loan.loanAmount ??
        loan.amount ??
        loan.principalAmount ??
        loan.disbursedAmount ??
        0

    );

}


// =====================================================
// GET OUTSTANDING
// =====================================================

function getOutstanding(loan) {

    return Number(

        loan.balanceAmount ??
        loan.outstandingAmount ??
        loan.pendingAmount ??
        loan.remainingAmount ??
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
// UPDATE SUMMARY
// =====================================================

function updateSummary() {

    let activeCount = 0;

    let totalDisbursed = 0;

    let totalOutstanding = 0;


    loans.forEach(
        (loan) => {

            const status =
                getStatus(loan)
                    .toLowerCase();


            if (
                status === "active" ||
                status === "running" ||
                status === "open"
            ) {

                activeCount++;

            }


            totalDisbursed +=
                getLoanAmount(loan);


            totalOutstanding +=
                getOutstanding(loan);

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

function renderLoans(list) {

    if (!list.length) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div class="empty-state">

                        <div class="empty-icon">
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
            (loan) => {


                const loanId =
                    loan.loanId ||
                    loan.loanNumber ||
                    loan.loanCode ||
                    loan.id ||
                    "-";


                const customerName =
                    loan.customerName ||
                    loan.name ||
                    "-";


                const mobile =
                    loan.mobile ||
                    loan.customerMobile ||
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
                    status.toLowerCase();


                let statusClass =
                    "active";


                if (
                    statusLower ===
                    "closed"
                ) {

                    statusClass =
                        "closed";

                } else if (
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

                            <span class="loan-id">

                                ${escapeHTML(
                                    loanId
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="customer-name">

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

                            <span class="amount">

                                ${formatCurrency(
                                    amount
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="amount">

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

                            <span class="
                                status
                                ${statusClass}
                            ">

                                ${escapeHTML(
                                    status
                                )}

                            </span>

                        </td>


                        <td>

                            <button
                                class="action-btn"
                                data-id="${escapeHTML(
                                    loan.id
                                )}"
                                onclick="viewLoan(this.dataset.id)"
                            >
                                View
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// =====================================================
// SEARCH
// =====================================================

searchInput.addEventListener(
    "input",
    function () {

        const search =
            this.value
                .trim()
                .toLowerCase();


        if (!search) {

            renderLoans(
                loans
            );

            return;

        }


        const filtered =
            loans.filter(
                (loan) => {

                    const loanId =
                        String(
                            loan.loanId ||
                            loan.loanNumber ||
                            loan.loanCode ||
                            loan.id ||
                            ""
                        ).toLowerCase();


                    const customerName =
                        String(
                            loan.customerName ||
                            loan.name ||
                            ""
                        ).toLowerCase();


                    const mobile =
                        String(
                            loan.mobile ||
                            loan.customerMobile ||
                            loan.phone ||
                            ""
                        ).toLowerCase();


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


// =====================================================
// VIEW LOAN
// =====================================================

window.viewLoan =
    function(loanId) {

        if (!loanId) {
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
// LOADING
// =====================================================

function showLoading() {

    tableBody.innerHTML = `

        <tr>

            <td colspan="8">

                <div class="empty-state">

                    <div class="empty-icon">
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

function showError(message) {

    tableBody.innerHTML = `

        <tr>

            <td colspan="8">

                <div class="empty-state">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <p>
                        ${escapeHTML(
                            message
                        )}
                    </p>

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// AUTH CHECK
// =====================================================

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        await loadLoans();

    }
);
