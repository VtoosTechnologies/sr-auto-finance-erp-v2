// =====================================================
// SR AUTO FINANCE ERP
// Due Management Controller
// File: js/dues.js
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

const dueTableBody =
    document.getElementById("dueTableBody");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const dateFilter =
    document.getElementById("dateFilter");

const frequencyFilter =
    document.getElementById("frequencyFilter");

const todayDueElement =
    document.getElementById("todayDue");

const overdueDueElement =
    document.getElementById("overdueDue");

const upcomingDueElement =
    document.getElementById("upcomingDue");

const totalDueAccountsElement =
    document.getElementById("totalDueAccounts");


// =====================================================
// DATA
// =====================================================

let loans = [];

let dueList = [];


// =====================================================
// CURRENCY
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
// DATE OBJECT
// =====================================================

function getDateObject(value) {

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

        const date =
            new Date(value);

        if (isNaN(date.getTime())) {
            return null;
        }

        return date;

    } catch (error) {

        return null;

    }

}


// =====================================================
// DATE ONLY
// =====================================================

function dateOnly(date) {

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value) {

    const date =
        getDateObject(value);

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


// =====================================================
// DATE KEY
// =====================================================

function dateKey(value) {

    const date =
        getDateObject(value);

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


// =====================================================
// SAME DAY
// =====================================================

function isSameDay(
    dateA,
    dateB
) {

    if (
        !dateA ||
        !dateB
    ) {

        return false;

    }

    return (

        dateA.getFullYear() ===
        dateB.getFullYear()

        &&

        dateA.getMonth() ===
        dateB.getMonth()

        &&

        dateA.getDate() ===
        dateB.getDate()

    );

}


// =====================================================
// LOAN AMOUNT
// =====================================================

function getLoanAmount(loan) {

    return Number(

        loan.totalPayable ??
        loan.totalAmount ??
        (
            Number(
                loan.loanAmount ??
                loan.principalAmount ??
                0
            ) +

            Number(
                loan.interestAmount ??
                0
            )
        )

    );

}


// =====================================================
// PAID AMOUNT
// =====================================================

function getPaidAmount(loan) {

    return Number(

        loan.amountPaid ??
        loan.paidAmount ??
        0

    );

}


// =====================================================
// OUTSTANDING
// =====================================================

function getOutstanding(loan) {

    const storedOutstanding =
        loan.outstandingAmount ??
        loan.balanceAmount ??
        loan.pendingAmount ??
        loan.remainingAmount;


    if (
        storedOutstanding !== undefined &&
        storedOutstanding !== null
    ) {

        return Math.max(
            Number(
                storedOutstanding
            ) || 0,
            0
        );

    }


    return Math.max(

        getLoanAmount(loan) -
        getPaidAmount(loan),

        0

    );

}


// =====================================================
// FREQUENCY
// =====================================================

function getFrequency(loan) {

    return (
        loan.repaymentFrequency ||
        loan.frequency ||
        loan.paymentFrequency ||
        "Monthly"
    );

}


// =====================================================
// INSTALLMENT AMOUNT
// =====================================================

function getInstallmentAmount(loan) {

    const installment =
        Number(

            loan.installmentAmount ??
            loan.emiAmount ??
            loan.monthlyInstallment ??
            loan.weeklyInstallment ??
            loan.dailyInstallment ??
            0

        );


    if (installment > 0) {

        return installment;

    }


    // Fallback:
    // If no installment is stored,
    // use complete outstanding.

    return getOutstanding(
        loan
    );

}


// =====================================================
// DUE DATE
// =====================================================

function getDueDate(loan) {

    return (

        loan.nextDueDate ||

        loan.dueDate ||

        loan.nextPaymentDate ||

        loan.firstDueDate ||

        loan.startDate ||

        loan.loanDate

    );

}


// =====================================================
// ADD FREQUENCY
// =====================================================

function addFrequency(
    date,
    frequency
) {

    const result =
        new Date(date);


    const normalized =
        String(
            frequency
        ).toLowerCase();


    if (
        normalized.includes("daily")
    ) {

        result.setDate(
            result.getDate() + 1
        );

    }

    else if (
        normalized.includes("weekly")
    ) {

        result.setDate(
            result.getDate() + 7
        );

    }

    else if (
        normalized.includes("biweekly")
    ) {

        result.setDate(
            result.getDate() + 14
        );

    }

    else {

        // Monthly

        const currentDay =
            result.getDate();

        result.setMonth(
            result.getMonth() + 1
        );

        /*
         * Prevent invalid dates like:
         * Jan 31 → Mar 03
         */

        if (
            result.getDate() !==
            currentDay
        ) {

            result.setDate(0);

        }

    }


    return result;

}


// =====================================================
// CALCULATE DUE STATUS
// =====================================================

function calculateDueStatus(
    dueDate
) {

    const today =
        dateOnly(
            new Date()
        );


    const due =
        dateOnly(
            dueDate
        );


    const difference =
        Math.round(
            (
                due.getTime() -
                today.getTime()
            ) /
            (
                1000 *
                60 *
                60 *
                24
            )
        );


    if (
        difference < 0
    ) {

        return {

            status:
                "overdue",

            label:
                "Overdue",

            days:
                Math.abs(
                    difference
                )

        };

    }


    if (
        difference === 0
    ) {

        return {

            status:
                "today",

            label:
                "Today",

            days:
                0

        };

    }


    return {

        status:
            "upcoming",

        label:
            "Upcoming",

        days:
            difference

    };

}


// =====================================================
// LOAD LOANS
// =====================================================

async function loadLoans() {

    showLoading();


    try {

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
            loanDoc => {

                loans.push({

                    id:
                        loanDoc.id,

                    ...loanDoc.data()

                });

            }
        );


        buildDueList();

    } catch (error) {

        console.error(
            "Due loading error:",
            error
        );


        showError(
            "Unable to load due accounts."
        );

    }

}


// =====================================================
// BUILD DUE LIST
// =====================================================

function buildDueList() {

    dueList = [];


    loans.forEach(
        loan => {

            const status =
                String(
                    loan.status ||
                    "Active"
                ).toLowerCase();


            /*
             * Ignore closed / cancelled loans
             */

            if (

                status === "closed" ||

                status === "cancelled" ||

                status === "canceled" ||

                status === "completed"

            ) {

                return;

            }


            const outstanding =
                getOutstanding(
                    loan
                );


            if (
                outstanding <= 0
            ) {

                return;

            }


            const dueDateValue =
                getDueDate(
                    loan
                );


            let dueDate =
                getDateObject(
                    dueDateValue
                );


            if (!dueDate) {

                return;

            }


            /*
             * If stored nextDueDate exists,
             * use it directly.
             *
             * Otherwise firstDueDate /
             * loanDate is used.
             */


            const frequency =
                getFrequency(
                    loan
                );


            let installment =
                getInstallmentAmount(
                    loan
                );


            /*
             * Never show due amount
             * greater than outstanding.
             */

            installment =
                Math.min(
                    installment,
                    outstanding
                );


            if (
                installment <= 0
            ) {

                return;

            }


            /*
             * If due date is far in the past,
             * calculate forward based on frequency.
             *
             * This helps older loans where
             * nextDueDate was not stored.
             */

            if (
                !loan.nextDueDate &&
                !loan.dueDate &&
                !loan.nextPaymentDate
            ) {

                const today =
                    dateOnly(
                        new Date()
                    );


                let safety =
                    0;


                while (

                    dateOnly(
                        dueDate
                    ) < today

                    &&

                    safety < 120

                ) {

                    dueDate =
                        addFrequency(
                            dueDate,
                            frequency
                        );

                    safety++;

                }

            }


            const dueStatus =
                calculateDueStatus(
                    dueDate
                );


            dueList.push({

                loanDocumentId:
                    loan.id,

                loanId:
                    loan.loanId ||
                    loan.loanNumber ||
                    loan.id,

                customerId:
                    loan.customerId ||
                    "",

                customerName:
                    loan.customerName ||
                    loan.name ||
                    "Unknown Customer",

                mobile:
                    loan.customerMobile ||
                    loan.mobile ||
                    loan.phone ||
                    "-",

                dueDate:
                    dueDate,

                dueAmount:
                    installment,

                outstanding:
                    outstanding,

                frequency:
                    frequency,

                status:
                    dueStatus.status,

                statusLabel:
                    dueStatus.label,

                days:
                    dueStatus.days

            });

        }
    );


    /*
     * Oldest due first
     */

    dueList.sort(
        (a, b) =>
            a.dueDate.getTime() -
            b.dueDate.getTime()
    );


    updateSummary();

    applyFilters();

}


// =====================================================
// SUMMARY
// =====================================================

function updateSummary() {

    let todayAmount =
        0;

    let overdueAmount =
        0;

    let upcomingAmount =
        0;


    dueList.forEach(
        due => {

            if (
                due.status ===
                "today"
            ) {

                todayAmount +=
                    due.dueAmount;

            }


            else if (
                due.status ===
                "overdue"
            ) {

                overdueAmount +=
                    due.dueAmount;

            }


            else if (
                due.status ===
                "upcoming"
            ) {

                upcomingAmount +=
                    due.dueAmount;

            }

        }
    );


    todayDueElement.textContent =
        formatCurrency(
            todayAmount
        );


    overdueDueElement.textContent =
        formatCurrency(
            overdueAmount
        );


    upcomingDueElement.textContent =
        formatCurrency(
            upcomingAmount
        );


    totalDueAccountsElement.textContent =
        dueList.length;

}


// =====================================================
// APPLY FILTERS
// =====================================================

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter.value
            .trim()
            .toLowerCase();


    const selectedDate =
        dateFilter.value;


    const selectedFrequency =
        frequencyFilter.value
            .trim()
            .toLowerCase();


    const filtered =
        dueList.filter(
            due => {

                const loanId =
                    String(
                        due.loanId
                    ).toLowerCase();


                const customerName =
                    String(
                        due.customerName
                    ).toLowerCase();


                const mobile =
                    String(
                        due.mobile
                    ).toLowerCase();


                const frequency =
                    String(
                        due.frequency
                    ).toLowerCase();


                const matchesSearch =

                    !search ||

                    loanId.includes(
                        search
                    ) ||

                    customerName.includes(
                        search
                    ) ||

                    mobile.includes(
                        search
                    );


                const matchesStatus =

                    !selectedStatus ||

                    due.status ===
                    selectedStatus;


                const matchesDate =

                    !selectedDate ||

                    dateKey(
                        due.dueDate
                    ) ===
                    selectedDate;


                const matchesFrequency =

                    !selectedFrequency ||

                    frequency.includes(
                        selectedFrequency
                    );


                return (

                    matchesSearch &&

                    matchesStatus &&

                    matchesDate &&

                    matchesFrequency

                );

            }
        );


    renderDueList(
        filtered
    );

}


// =====================================================
// RENDER DUE LIST
// =====================================================

function renderDueList(list) {

    if (!list.length) {

        dueTableBody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div
                        class="empty-state"
                    >

                        <div
                            class="empty-icon"
                        >
                            📅
                        </div>

                        <p>
                            No due accounts found.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    dueTableBody.innerHTML =
        list.map(
            due => {

                const dueClass =
                    due.status;


                let statusText =
                    due.statusLabel;


                if (
                    due.status ===
                    "overdue"
                ) {

                    statusText =
                        `Overdue ${due.days} day${due.days === 1 ? "" : "s"}`;

                }


                else if (
                    due.status ===
                    "upcoming"
                ) {

                    statusText =
                        due.days === 1
                            ? "Tomorrow"
                            : `${due.days} days`;

                }


                return `

                    <tr>


                        <!-- LOAN -->

                        <td>

                            <span
                                class="loan-id"
                            >

                                ${escapeHTML(
                                    due.loanId
                                )}

                            </span>

                        </td>


                        <!-- CUSTOMER -->

                        <td>

                            <span
                                class="customer-name"
                            >

                                ${escapeHTML(
                                    due.customerName
                                )}

                            </span>

                        </td>


                        <!-- MOBILE -->

                        <td>

                            ${escapeHTML(
                                due.mobile
                            )}

                        </td>


                        <!-- DATE -->

                        <td>

                            <span
                                class="
                                    due-date
                                    ${dueClass}
                                "
                            >

                                ${formatDate(
                                    due.dueDate
                                )}

                            </span>

                        </td>


                        <!-- AMOUNT -->

                        <td>

                            <span
                                class="amount"
                            >

                                ${formatCurrency(
                                    due.dueAmount
                                )}

                            </span>

                        </td>


                        <!-- FREQUENCY -->

                        <td>

                            ${escapeHTML(
                                due.frequency
                            )}

                        </td>


                        <!-- STATUS -->

                        <td>

                            <span
                                class="
                                    due-status
                                    ${dueClass}
                                "
                            >

                                ${escapeHTML(
                                    statusText
                                )}

                            </span>

                        </td>


                        <!-- ACTION -->

                        <td>

                            <button
                                class="collect-small"
                                data-loan-id="${escapeHTML(
                                    due.loanDocumentId
                                )}"
                                onclick="collectDue(this.dataset.loanId)"
                            >
                                Collect
                            </button>


                            <button
                                class="action-btn"
                                data-loan-id="${escapeHTML(
                                    due.loanDocumentId
                                )}"
                                onclick="viewDueLoan(this.dataset.loanId)"
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
// COLLECT DUE
// =====================================================

window.collectDue =
    function(loanDocumentId) {

        if (!loanDocumentId) {
            return;
        }


        window.location.href =
            `collection-form.html?loanId=${
                encodeURIComponent(
                    loanDocumentId
                )
            }`;

    };


// =====================================================
// VIEW LOAN
// =====================================================

window.viewDueLoan =
    function(loanDocumentId) {

        if (!loanDocumentId) {
            return;
        }


        window.location.href =
            `loan-view.html?id=${
                encodeURIComponent(
                    loanDocumentId
                )
            }`;

    };


// =====================================================
// FILTER EVENTS
// =====================================================

searchInput.addEventListener(
    "input",
    applyFilters
);


statusFilter.addEventListener(
    "change",
    applyFilters
);


dateFilter.addEventListener(
    "change",
    applyFilters
);


frequencyFilter.addEventListener(
    "change",
    applyFilters
);


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    dueTableBody.innerHTML = `

        <tr>

            <td colspan="8">

                <div
                    class="empty-state"
                >

                    <div
                        class="empty-icon"
                    >
                        ⏳
                    </div>

                    <p>
                        Loading dues...
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

    dueTableBody.innerHTML = `

        <tr>

            <td colspan="8">

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
                            message
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
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        await loadLoans();

    }
);
