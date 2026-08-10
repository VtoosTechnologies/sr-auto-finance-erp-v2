import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";


// =====================================================
// SR AUTO FINANCE
// COLLECTION REPORT
// =====================================================

const $ = (id) => document.getElementById(id);


// =====================================================
// STATE
// =====================================================

const state = {

    loans: [],

    payments: [],

    rows: [],

    group: "date",

    selectedPayment: null

};


// =====================================================
// MONEY FORMAT
// =====================================================

function money(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(Number(value) || 0);

}


// =====================================================
// NUMBER
// =====================================================

function num(value) {

    const n = Number(value);

    return Number.isFinite(n) ? n : 0;

}


// =====================================================
// HTML ESCAPE
// =====================================================

function esc(value) {

    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// DATE ONLY
// =====================================================

function dateOnly(value) {

    if (!value) return "";

    if (
        typeof value === "object" &&
        value?.toDate
    ) {

        return value
            .toDate()
            .toISOString()
            .slice(0, 10);

    }

    const str = String(value);

    if (str.length >= 10) {

        return str.slice(0, 10);

    }

    return "";

}


// =====================================================
// DISPLAY DATE
// =====================================================

function displayDate(value) {

    const date = dateOnly(value);

    if (!date) return "-";

    const parts = date.split("-");

    return `${parts[2]}-${parts[1]}-${parts[0]}`;

}


// =====================================================
// DATE OBJECT
// =====================================================

function dateObject(value) {

    const date = dateOnly(value);

    if (!date) return null;

    const obj = new Date(
        `${date}T00:00:00`
    );

    if (Number.isNaN(obj.getTime())) {

        return null;

    }

    return obj;

}


// =====================================================
// WEEK START
// Monday = First Day
// =====================================================

function weekStart(date) {

    const d = new Date(date);

    const day = d.getDay();

    const diff =
        day === 0
            ? -6
            : 1 - day;

    d.setDate(
        d.getDate() + diff
    );

    d.setHours(
        0,
        0,
        0,
        0
    );

    return d;

}


// =====================================================
// GROUP KEY
// =====================================================

function groupKey(
    value,
    group
) {

    const date =
        dateObject(value);

    if (!date) {

        return "Unknown";

    }


    // DATE

    if (group === "date") {

        return dateOnly(value);

    }


    // MONTH

    if (group === "month") {

        return dateOnly(value)
            .slice(0, 7);

    }


    // WEEK

    if (group === "week") {

        const start =
            weekStart(date);

        return start
            .toISOString()
            .slice(0, 10);

    }


    return "all";

}


// =====================================================
// GROUP LABEL
// =====================================================

function groupLabel(
    key,
    group
) {

    if (group === "date") {

        return displayDate(key);

    }


    if (group === "month") {

        const parts =
            key.split("-");

        const year =
            Number(parts[0]);

        const month =
            Number(parts[1]) - 1;

        return new Date(
            year,
            month,
            1
        ).toLocaleDateString(
            "en-IN",
            {
                month: "long",
                year: "numeric"
            }
        );

    }


    if (group === "week") {

        const start =
            dateObject(key);

        if (!start) return key;

        const end =
            new Date(start);

        end.setDate(
            end.getDate() + 6
        );

        return (
            displayDate(start) +
            " - " +
            displayDate(end)
        );

    }


    return key;

}


// =====================================================
// GET LOAN ID
// =====================================================

function getLoanId(payment) {

    return String(

        payment.loanId ??
        payment.loanID ??
        payment.loanNumber ??
        payment.loanNo ??
        ""

    );

}


// =====================================================
// GET CUSTOMER ID
// =====================================================

function getCustomerId(payment) {

    return String(

        payment.customerId ??
        payment.customerID ??
        ""

    );

}


// =====================================================
// GET CUSTOMER NAME
// =====================================================

function getCustomerName(
    payment,
    loan = {}
) {

    return String(

        payment.customerName ??
        payment.customer ??
        payment.name ??
        loan.customerName ??
        "-"

    );

}


// =====================================================
// GET STAFF
// =====================================================

function getStaff(payment) {

    return String(

        payment.staffName ??
        payment.collectedByName ??
        payment.collectedBy ??
        payment.staff ??
        "-"

    );

}


// =====================================================
// GET DUE DATE
// =====================================================

function getDueDate(payment) {

    return dateOnly(

        payment.dueDate ??
        payment.actualDueDate ??
        payment.installmentDueDate

    );

}


// =====================================================
// GET PAID DATE
// =====================================================

function getPaidDate(payment) {

    return dateOnly(

        payment.paymentDate ??
        payment.paidDate ??
        payment.paidOn ??
        payment.createdAt

    );

}


// =====================================================
// GET DUE AMOUNT
// =====================================================

function getDueAmount(
    payment,
    loan
) {

    const explicitAmount =

        payment.dueAmount ??
        payment.emiDue ??
        payment.installmentDue ??
        payment.scheduledAmount ??
        payment.previousEmiDue;


    if (
        explicitAmount !== undefined &&
        explicitAmount !== null &&
        explicitAmount !== ""
    ) {

        return Math.max(
            num(explicitAmount),
            0
        );

    }


    // Fallback from loan EMI

    return Math.max(

        num(

            loan.installmentAmount ??
            loan.emiAmount ??
            loan.monthlyEmi

        ),

        0

    );

}


// =====================================================
// GET PAID AMOUNT
// =====================================================

function getPaidAmount(
    payment
) {

    return Math.max(

        num(

            payment.emiPaid ??
            payment.amountReceived ??
            payment.paidAmount ??
            payment.amount

        ),

        0

    );

}


// =====================================================
// GET PENALTY
// =====================================================

function getPenalty(
    payment
) {

    return Math.max(

        num(

            payment.penaltyCollected ??
            payment.penaltyAmount ??
            payment.penalty

        ),

        0

    );

}


// =====================================================
// GET TOTAL COLLECTION
// =====================================================

function getTotalCollection(
    payment
) {

    if (
        payment.totalReceived !== undefined &&
        payment.totalReceived !== null
    ) {

        return Math.max(
            num(payment.totalReceived),
            0
        );

    }


    if (
        payment.totalCollection !== undefined &&
        payment.totalCollection !== null
    ) {

        return Math.max(
            num(payment.totalCollection),
            0
        );

    }


    return (
        getPaidAmount(payment) +
        getPenalty(payment)
    );

}


// =====================================================
// CREATE LOAN MAP
// =====================================================

function createLoanMap() {

    const map =
        new Map();

    state.loans.forEach(
        loan => {

            const id = String(

                loan.id ??
                loan.loanId ??
                loan.loanNumber ??
                loan.loanNo ??
                ""

            );

            map.set(
                id,
                loan
            );

        }
    );

    return map;

}


// =====================================================
// BUILD REPORT ROWS
// =====================================================

function buildRows() {

    const loanMap =
        createLoanMap();


    return state.payments.map(
        payment => {

            const loan =
                loanMap.get(
                    getLoanId(payment)
                ) || {};


            const dueDate =
                getDueDate(payment);

            const paidDate =
                getPaidDate(payment);


            const dueAmount =
                getDueAmount(
                    payment,
                    loan
                );


            const paidAmount =
                getPaidAmount(
                    payment
                );


            const penalty =
                getPenalty(
                    payment
                );


            const total =
                getTotalCollection(
                    payment
                );


            /*
             * IMPORTANT
             *
             * Pending is only:
             *
             * Due Amount - Paid Amount
             *
             * Penalty is NOT added
             * to pending.
             */

            const pending =
                Math.max(
                    dueAmount -
                    paidAmount,
                    0
                );


            return {

                id: payment.id,

                raw: payment,

                loanId:
                    getLoanId(payment) ||
                    String(
                        loan.id ?? ""
                    ),

                customerId:
                    getCustomerId(payment) ||
                    String(
                        loan.customerId ?? ""
                    ),

                customerName:
                    getCustomerName(
                        payment,
                        loan
                    ),

                staff:
                    getStaff(payment),

                dueDate,

                paidDate,

                dueAmount,

                paidAmount,

                pending,

                penalty,

                total,

                mode:
                    String(
                        payment.paymentMode ??
                        payment.mode ??
                        "-"
                    ),

                remarks:
                    String(
                        payment.remarks ??
                        payment.paymentRemarks ??
                        "-"
                    ),

                receipt:
                    String(

                        payment.receiptNumber ??
                        payment.receiptNo ??
                        payment.receipt ??
                        payment.id ??
                        "-"

                    )

            };

        }
    );

}


// =====================================================
// DATE FILTER
// =====================================================

function isInDateRange(row) {

    const from =
        $("fromDate").value;

    const to =
        $("toDate").value;


    /*
     * For collection report,
     * Paid Date is primary date.
     *
     * If paid date unavailable,
     * Due Date is used.
     */

    const date =
        row.paidDate ||
        row.dueDate;


    if (!date) {

        return false;

    }


    if (
        from &&
        date < from
    ) {

        return false;

    }


    if (
        to &&
        date > to
    ) {

        return false;

    }


    return true;

}


// =====================================================
// FILTER ROWS
// =====================================================

function getFilteredRows() {

    const staff =
        $("staffFilter").value;

    const customer =
        $("customerFilter").value;

    const loan =
        $("loanFilter").value;


    return buildRows()
        .filter(row => {

            if (
                !isInDateRange(row)
            ) {

                return false;

            }


            if (
                staff &&
                row.staff !== staff
            ) {

                return false;

            }


            if (
                customer &&
                row.customerId !== customer
            ) {

                return false;

            }


            if (
                loan &&
                row.loanId !== loan
            ) {

                return false;

            }


            return true;

        });

}


// =====================================================
// SUMMARY
// =====================================================

function renderSummary(rows) {

    const due =
        rows.reduce(
            (total, row) =>
                total +
                row.dueAmount,
            0
        );


    const paid =
        rows.reduce(
            (total, row) =>
                total +
                row.paidAmount,
            0
        );


    const pending =
        rows.reduce(
            (total, row) =>
                total +
                row.pending,
            0
        );


    const penalty =
        rows.reduce(
            (total, row) =>
                total +
                row.penalty,
            0
        );


    const total =
        rows.reduce(
            (total, row) =>
                total +
                row.total,
            0
        );


    $("sumDue").textContent =
        money(due);

    $("sumPaid").textContent =
        money(paid);

    $("sumPending").textContent =
        money(pending);

    $("sumPenalty").textContent =
        money(penalty);

    $("sumTotal").textContent =
        money(total);

}


// =====================================================
// GROUP DATA
// =====================================================

function groupRows(
    rows,
    group
) {

    const map =
        new Map();


    rows.forEach(
        row => {

            let key;


            if (
                group === "staff"
            ) {

                key =
                    row.staff;

            }

            else if (
                group === "customer"
            ) {

                key =
                    row.customerName;

            }

            else {

                key =
                    groupKey(
                        row.paidDate ||
                        row.dueDate,
                        group
                    );

            }


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    {

                        key,

                        count:0,

                        due:0,

                        paid:0,

                        pending:0,

                        penalty:0,

                        total:0

                    }
                );

            }


            const item =
                map.get(key);


            item.count++;

            item.due +=
                row.dueAmount;

            item.paid +=
                row.paidAmount;

            item.pending +=
                row.pending;

            item.penalty +=
                row.penalty;

            item.total +=
                row.total;

        }
    );


    return [...map.values()]
        .sort(
            (a,b) =>
                String(
                    a.key
                ).localeCompare(
                    String(
                        b.key
                    )
                )
        );

}


// =====================================================
// MAIN RENDER
// =====================================================

function renderReport() {

    state.rows =
        getFilteredRows();


    renderSummary(
        state.rows
    );


    const group =
        state.group;


    const titles = {

        date:
            "Date Wise Collection",

        week:
            "Week Wise Collection",

        month:
            "Month Wise Collection",

        staff:
            "Staff Wise Collection",

        customer:
            "Customer Wise Collection"

    };


    $("reportTitle")
        .textContent =
        titles[group];


    if (
        group === "staff" ||
        group === "customer"
    ) {

        renderStaffCustomer(
            group
        );

    }

    else {

        renderPeriod(
            group
        );

    }

}


// =====================================================
// PERIOD REPORT
// =====================================================

function renderPeriod(
    group
) {

    $("head").innerHTML = `

        <tr>

            <th>PERIOD</th>

            <th>TRANSACTIONS</th>

            <th>DUE AMOUNT</th>

            <th>PAID AMOUNT</th>

            <th>PENDING</th>

            <th>PENALTY</th>

            <th>TOTAL COLLECTION</th>

            <th>VIEW</th>

        </tr>

    `;


    const groups =
        groupRows(
            state.rows,
            group
        );


    if (
        groups.length === 0
    ) {

        $("body").innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty"
                >

                    No collection records found.

                </td>

            </tr>

        `;

        return;

    }


    $("body").innerHTML =
        groups.map(
            item => `

                <tr>

                    <td>
                        ${esc(
                            groupLabel(
                                item.key,
                                group
                            )
                        )}
                    </td>

                    <td>
                        ${item.count}
                    </td>

                    <td class="num">
                        ${money(item.due)}
                    </td>

                    <td class="num green">
                        ${money(item.paid)}
                    </td>

                    <td class="num red">
                        ${money(item.pending)}
                    </td>

                    <td class="num orange">
                        ${money(item.penalty)}
                    </td>

                    <td class="num green">
                        ${money(item.total)}
                    </td>

                    <td>

                        <button
                            class="light"
                            data-period-view="${esc(item.key)}"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `
        ).join("");


    document
        .querySelectorAll(
            "[data-period-view]"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        const key =
                            button.dataset
                                .periodView;


                        const rows =
                            state.rows.filter(
                                row =>
                                    groupKey(
                                        row.paidDate ||
                                        row.dueDate,
                                        group
                                    ) === key
                            );


                        showTransactionList(

                            `${groupLabel(
                                key,
                                group
                            )} - Transactions`,

                            rows

                        );

                    };

            }
        );

}


// =====================================================
// STAFF / CUSTOMER REPORT
// =====================================================

function renderStaffCustomer(
    group
) {

    const isStaff =
        group === "staff";


    $("head").innerHTML = `

        <tr>

            <th>
                ${isStaff
                    ? "STAFF"
                    : "CUSTOMER"}
            </th>

            <th>
                ${isStaff
                    ? "CUSTOMERS"
                    : "LOANS"}
            </th>

            <th>
                TRANSACTIONS
            </th>

            <th>
                DUE AMOUNT
            </th>

            <th>
                PAID AMOUNT
            </th>

            <th>
                PENDING
            </th>

            <th>
                PENALTY
            </th>

            <th>
                TOTAL COLLECTION
            </th>

            <th>
                OPEN
            </th>

        </tr>

    `;


    const groups =
        groupRows(
            state.rows,
            group
        );


    if (
        groups.length === 0
    ) {

        $("body").innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    No records found.

                </td>

            </tr>

        `;

        return;

    }


    $("body").innerHTML =
        groups.map(
            item => {

                const related =
                    state.rows.filter(
                        row =>
                            (
                                isStaff
                                    ? row.staff
                                    : row.customerName
                            ) === item.key
                    );


                const secondCount =
                    new Set(

                        related.map(
                            row =>
                                isStaff
                                    ? row.customerName
                                    : row.loanId
                        )

                    ).size;


                return `

                    <tr>

                        <td>
                            ${esc(item.key)}
                        </td>

                        <td>
                            ${secondCount}
                        </td>

                        <td>
                            ${item.count}
                        </td>

                        <td class="num">
                            ${money(item.due)}
                        </td>

                        <td class="num green">
                            ${money(item.paid)}
                        </td>

                        <td class="num red">
                            ${money(item.pending)}
                        </td>

                        <td class="num orange">
                            ${money(item.penalty)}
                        </td>

                        <td class="num green">
                            ${money(item.total)}
                        </td>

                        <td>

                            <button
                                class="light"
                                data-person="${esc(item.key)}"
                            >
                                Open
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    document
        .querySelectorAll(
            "[data-person]"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        openPersonReport(

                            button.dataset
                                .person,

                            isStaff

                        );

                    };

            }
        );

}


// =====================================================
// STAFF / CUSTOMER DRILL DOWN
// =====================================================

function openPersonReport(
    name,
    isStaff
) {

    const rows =
        state.rows.filter(
            row =>

                (
                    isStaff
                        ? row.staff
                        : row.customerName
                ) === name

        );


    $("modalContent").innerHTML = `

        <h3>
            ${esc(name)}
        </h3>

        <div class="modes">

            <button
                class="mode active"
                data-sub-group="date"
            >
                Date Wise
            </button>

            <button
                class="mode"
                data-sub-group="week"
            >
                Week Wise
            </button>

            <button
                class="mode"
                data-sub-group="month"
            >
                Month Wise
            </button>

        </div>

        <div id="subReport"></div>

    `;


    $("modal")
        .classList.add("show");


    function renderSubReport(
        subGroup
    ) {

        const groups =
            groupRows(
                rows,
                subGroup
            );


        let html = `

            <div
                class="table-wrap"
                style="margin-top:15px"
            >

                <table class="table">

                    <thead>

                        <tr>

                            <th>
                                PERIOD
                            </th>

                            <th>
                                TRANSACTIONS
                            </th>

                            <th>
                                DUE
                            </th>

                            <th>
                                PAID
                            </th>

                            <th>
                                PENDING
                            </th>

                            <th>
                                PENALTY
                            </th>

                            <th>
                                TOTAL
                            </th>

                            <th>
                                VIEW
                            </th>

                        </tr>

                    </thead>

                    <tbody>

        `;


        if (
            groups.length === 0
        ) {

            html += `

                <tr>

                    <td
                        colspan="8"
                        class="empty"
                    >

                        No records.

                    </td>

                </tr>

            `;

        }

        else {

            groups.forEach(
                item => {

                    html += `

                        <tr>

                            <td>

                                ${esc(
                                    groupLabel(
                                        item.key,
                                        subGroup
                                    )
                                )}

                            </td>

                            <td>
                                ${item.count}
                            </td>

                            <td class="num">
                                ${money(item.due)}
                            </td>

                            <td class="num green">
                                ${money(item.paid)}
                            </td>

                            <td class="num red">
                                ${money(item.pending)}
                            </td>

                            <td class="num orange">
                                ${money(item.penalty)}
                            </td>

                            <td class="num green">
                                ${money(item.total)}
                            </td>

                            <td>

                                <button
                                    class="light"
                                    data-sub-view="${esc(item.key)}"
                                >
                                    View
                                </button>

                            </td>

                        </tr>

                    `;

                }
            );

        }


        html += `

                    </tbody>

                </table>

            </div>

        `;


        $("subReport")
            .innerHTML =
            html;


        document
            .querySelectorAll(
                "[data-sub-view]"
            )
            .forEach(
                button => {

                    button.onclick =
                        () => {

                            const key =
                                button.dataset
                                    .subView;


                            const filtered =
                                rows.filter(
                                    row =>
                                        groupKey(
                                            row.paidDate ||
                                            row.dueDate,
                                            subGroup
                                        ) === key
                                );


                            showTransactionList(

                                `${esc(name)} - ${
                                    groupLabel(
                                        key,
                                        subGroup
                                    )
                                }`,

                                filtered

                            );

                        };

                }
            );

    }


    renderSubReport(
        "date"
    );


    document
        .querySelectorAll(
            "[data-sub-group]"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        document
                            .querySelectorAll(
                                "[data-sub-group]"
                            )
                            .forEach(
                                item =>
                                    item.classList
                                        .remove(
                                            "active"
                                        )
                            );


                        button.classList
                            .add(
                                "active"
                            );


                        renderSubReport(
                            button.dataset
                                .subGroup
                        );

                    };

            }
        );

}


// =====================================================
// TRANSACTION LIST
// =====================================================

function showTransactionList(
    title,
    rows
) {

    $("modalContent").innerHTML = `

        <h3>
            ${esc(title)}
        </h3>


        <div
            class="table-wrap"
            style="margin-top:12px"
        >

            <table class="table">

                <thead>

                    <tr>

                        <th>
                            DUE DATE
                        </th>

                        <th>
                            PAID DATE
                        </th>

                        <th>
                            CUSTOMER
                        </th>

                        <th>
                            LOAN NO
                        </th>

                        <th>
                            STAFF
                        </th>

                        <th>
                            DUE AMOUNT
                        </th>

                        <th>
                            PAID AMOUNT
                        </th>

                        <th>
                            PENDING
                        </th>

                        <th>
                            PENALTY
                        </th>

                        <th>
                            TOTAL
                        </th>

                        <th>
                            MODE
                        </th>

                        <th>
                            VIEW
                        </th>

                    </tr>

                </thead>

                <tbody>

    `;


    if (
        rows.length === 0
    ) {

        $("modalContent").innerHTML += `

            <div class="empty">
                No transactions found.
            </div>

        `;

        return;

    }


    let html = "";


    rows.forEach(
        (row,index) => {

            html += `

                <tr>

                    <td>
                        ${displayDate(
                            row.dueDate
                        )}
                    </td>

                    <td>
                        ${displayDate(
                            row.paidDate
                        )}
                    </td>

                    <td>
                        ${esc(
                            row.customerName
                        )}
                    </td>

                    <td>
                        ${esc(
                            row.loanId
                        )}
                    </td>

                    <td>
                        ${esc(
                            row.staff
                        )}
                    </td>

                    <td class="num">
                        ${money(
                            row.dueAmount
                        )}
                    </td>

                    <td class="num green">
                        ${money(
                            row.paidAmount
                        )}
                    </td>

                    <td class="num red">
                        ${money(
                            row.pending
                        )}
                    </td>

                    <td class="num orange">
                        ${money(
                            row.penalty
                        )}
                    </td>

                    <td class="num green">
                        ${money(
                            row.total
                        )}
                    </td>

                    <td>
                        ${esc(
                            row.mode
                        )}
                    </td>

                    <td>

                        <button
                            class="light"
                            data-transaction-index="${index}"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `;

        }
    );


    $("modalContent").innerHTML += `

                ${html}

                </tbody>

            </table>

        </div>

    `;


    document
        .querySelectorAll(
            "[data-transaction-index]"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        const index =
                            Number(
                                button.dataset
                                    .transactionIndex
                            );


                        showPaymentDetails(
                            rows[index]
                        );

                    };

            }
        );

}


// =====================================================
// PAYMENT DETAILS
// =====================================================

function showPaymentDetails(
    row
) {

    state.selectedPayment =
        row;


    $("modalContent").innerHTML = `

        <h3>
            Collection Transaction
        </h3>


        <div class="detail">

            <div>
                <b>Receipt No</b>
                ${esc(row.receipt)}
            </div>

            <div>
                <b>Loan No</b>
                ${esc(row.loanId)}
            </div>

            <div>
                <b>Customer</b>
                ${esc(row.customerName)}
            </div>

            <div>
                <b>Staff</b>
                ${esc(row.staff)}
            </div>

            <div>
                <b>Due Date</b>
                ${displayDate(row.dueDate)}
            </div>

            <div>
                <b>Paid Date</b>
                ${displayDate(row.paidDate)}
            </div>

            <div>
                <b>Due Amount</b>
                ${money(row.dueAmount)}
            </div>

            <div>
                <b>Paid Amount</b>
                ${money(row.paidAmount)}
            </div>

            <div>
                <b>Pending</b>
                ${money(row.pending)}
            </div>

            <div>
                <b>Penalty</b>
                ${money(row.penalty)}
            </div>

            <div>
                <b>Total Collection</b>
                ${money(row.total)}
            </div>

            <div>
                <b>Payment Mode</b>
                ${esc(row.mode)}
            </div>

            <div>
                <b>Remarks</b>
                ${esc(row.remarks)}
            </div>

        </div>

    `;


    $("modalPrint").onclick =
        () => printReceipt(row);


    $("modalDownload").onclick =
        () => downloadReceipt(row);

}


// =====================================================
// RECEIPT HTML
// =====================================================

function receiptHTML(
    row
) {

    return `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
SR Auto Finance Collection
</title>

<style>

body{
    font-family:Arial;
    max-width:800px;
    margin:30px auto;
    padding:20px;
}

h2,
h3{
    text-align:center;
}

table{
    width:100%;
    border-collapse:collapse;
    margin-top:20px;
}

td{
    border:1px solid #ddd;
    padding:10px;
}

td:first-child{
    font-weight:bold;
    width:35%;
}

.total{
    font-size:18px;
    font-weight:bold;
}

</style>

</head>

<body>

<h2>
SR Auto Finance
</h2>

<h3>
Collection Statement
</h3>

<table>

<tr>
<td>Receipt No</td>
<td>${esc(row.receipt)}</td>
</tr>

<tr>
<td>Loan No</td>
<td>${esc(row.loanId)}</td>
</tr>

<tr>
<td>Customer</td>
<td>${esc(row.customerName)}</td>
</tr>

<tr>
<td>Staff</td>
<td>${esc(row.staff)}</td>
</tr>

<tr>
<td>Due Date</td>
<td>${displayDate(row.dueDate)}</td>
</tr>

<tr>
<td>Paid Date</td>
<td>${displayDate(row.paidDate)}</td>
</tr>

<tr>
<td>Due Amount</td>
<td>${money(row.dueAmount)}</td>
</tr>

<tr>
<td>Paid Amount</td>
<td>${money(row.paidAmount)}</td>
</tr>

<tr>
<td>Pending</td>
<td>${money(row.pending)}</td>
</tr>

<tr>
<td>Penalty</td>
<td>${money(row.penalty)}</td>
</tr>

<tr class="total">
<td>Total Collection</td>
<td>${money(row.total)}</td>
</tr>

<tr>
<td>Payment Mode</td>
<td>${esc(row.mode)}</td>
</tr>

<tr>
<td>Remarks</td>
<td>${esc(row.remarks)}</td>
</tr>

</table>

<p style="text-align:center;margin-top:30px">

Generated from SR Auto Finance ERP

</p>

</body>

</html>

`;

}


// =====================================================
// PRINT RECEIPT
// =====================================================

function printReceipt(
    row
) {

    const windowObject =
        window.open(
            "",
            "_blank",
            "width=900,height=700"
        );


    if (!windowObject) {

        alert(
            "Please allow pop-ups for printing."
        );

        return;

    }


    windowObject.document.write(
        receiptHTML(row)
    );

    windowObject.document.close();


    setTimeout(
        () => {

            windowObject.print();

            windowObject.close();

        },
        300
    );

}


// =====================================================
// DOWNLOAD RECEIPT
// =====================================================

function downloadReceipt(
    row
) {

    const blob =
        new Blob(

            [
                receiptHTML(row)
            ],

            {
                type:
                    "text/html;charset=utf-8"
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
        `SR-Auto-Finance-${row.loanId || "Receipt"}-${row.paidDate || "Payment"}.html`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


// =====================================================
// POPULATE FILTERS
// =====================================================

function populateFilters() {

    const rows =
        buildRows();


    const staffSet =
        new Set();


    const customerMap =
        new Map();


    const loanSet =
        new Set();


    rows.forEach(
        row => {

            if (
                row.staff &&
                row.staff !== "-"
            ) {

                staffSet.add(
                    row.staff
                );

            }


            if (
                row.customerId
            ) {

                customerMap.set(

                    row.customerId,

                    row.customerName

                );

            }


            if (
                row.loanId
            ) {

                loanSet.add(
                    row.loanId
                );

            }

        }
    );


    $("staffFilter").innerHTML = `

        <option value="">
            All Staff
        </option>

        ${
            [...staffSet]
                .sort()
                .map(
                    name =>
                        `
                        <option
                            value="${esc(name)}"
                        >
                            ${esc(name)}
                        </option>
                        `
                )
                .join("")
        }

    `;


    $("customerFilter").innerHTML = `

        <option value="">
            All Customers
        </option>

        ${
            [...customerMap.entries()]
                .sort(
                    (a,b) =>
                        a[1].localeCompare(
                            b[1]
                        )
                )
                .map(
                    ([id,name]) =>
                        `
                        <option
                            value="${esc(id)}"
                        >
                            ${esc(name)}
                        </option>
                        `
                )
                .join("")
        }

    `;


    $("loanFilter").innerHTML = `

        <option value="">
            All Loans
        </option>

        ${
            [...loanSet]
                .sort()
                .map(
                    loan =>
                        `
                        <option
                            value="${esc(loan)}"
                        >
                            ${esc(loan)}
                        </option>
                        `
                )
                .join("")
        }

    `;

}


// =====================================================
// LOAD FIREBASE DATA
// =====================================================

async function loadReportData() {

    $("note").style.display =
        "block";


    $("note").textContent =
        "Loading collection data...";


    try {

        const [
            loanSnapshot,
            paymentSnapshot
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


        state.loans =
            loanSnapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        state.payments =
            paymentSnapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        populateFilters();


        $("note").style.display =
            "none";


        renderReport();

    }

    catch(error) {

        console.error(
            "Collection Report Error:",
            error
        );


        $("note").style.display =
            "block";


        $("note").textContent =
            "Unable to load collection report: " +
            error.message;

    }

}


// =====================================================
// DOWNLOAD FULL REPORT
// =====================================================

function downloadFullReport() {

    const rows =
        state.rows;


    const headers = [

        "Due Date",

        "Paid Date",

        "Customer",

        "Loan No",

        "Staff",

        "Due Amount",

        "Paid Amount",

        "Pending",

        "Penalty",

        "Total Collection",

        "Payment Mode"

    ];


    const csv = [

        headers.join(",")

    ];


    rows.forEach(
        row => {

            csv.push(

                [

                    row.dueDate,

                    row.paidDate,

                    `"${String(
                        row.customerName
                    ).replaceAll(
                        '"',
                        '""'
                    )}"`,

                    row.loanId,

                    `"${String(
                        row.staff
                    ).replaceAll(
                        '"',
                        '""'
                    )}"`,

                    row.dueAmount,

                    row.paidAmount,

                    row.pending,

                    row.penalty,

                    row.total,

                    `"${String(
                        row.mode
                    ).replaceAll(
                        '"',
                        '""'
                    )}"`

                ].join(",")

            );

        }
    );


    const blob =
        new Blob(

            [
                csv.join("\n")
            ],

            {
                type:
                    "text/csv;charset=utf-8"
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
        "SR-Auto-Finance-Collection-Report.csv";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


// =====================================================
// EVENT - SEARCH
// =====================================================

$("searchBtn").addEventListener(
    "click",
    () => {

        renderReport();

    }
);


// =====================================================
// EVENT - DOWNLOAD
// =====================================================

$("downloadBtn").addEventListener(
    "click",
    () => {

        downloadFullReport();

    }
);


// =====================================================
// EVENT - PRINT
// =====================================================

$("printBtn").addEventListener(
    "click",
    () => {

        window.print();

    }
);


// =====================================================
// EVENT - CLOSE MODAL
// =====================================================

$("close").addEventListener(
    "click",
    () => {

        $("modal")
            .classList
            .remove("show");

    }
);


// =====================================================
// REPORT MODE BUTTONS
// =====================================================

document
    .querySelectorAll(
        ".mode[data-group]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".mode[data-group]"
                        )
                        .forEach(
                            item =>
                                item.classList
                                    .remove(
                                        "active"
                                    )
                        );


                    button.classList
                        .add(
                            "active"
                        );


                    state.group =
                        button.dataset
                            .group;


                    renderReport();

                }
            );

        }
    );


// =====================================================
// DEFAULT DATES
// Current Month
// =====================================================

const today =
    new Date();


const firstDay =
    new Date(

        today.getFullYear(),

        today.getMonth(),

        1

    );


$("fromDate").value =
    firstDay
        .toISOString()
        .slice(0,10);


$("toDate").value =
    today
        .toISOString()
        .slice(0,10);


// =====================================================
// START
// =====================================================

loadReportData();
