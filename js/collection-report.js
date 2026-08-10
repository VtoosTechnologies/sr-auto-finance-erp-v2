import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// =====================================================
// SR AUTO FINANCE ERP
// COLLECTION REPORT
// Actual Firestore Collection:
// collections
// =====================================================


const $ = (id) =>
    document.getElementById(id);


// =====================================================
// STATE
// =====================================================

const state = {

    collections: [],

    loans: [],

    rows: [],

    group: "date",

    selectedRow: null

};


// =====================================================
// NUMBER
// =====================================================

function numberValue(value) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : 0;

}


// =====================================================
// MONEY
// =====================================================

function money(value) {

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


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// DATE VALUE
// =====================================================

function getDateValue(value) {

    if (!value) {

        return null;

    }


    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


// =====================================================
// STORAGE DATE
// =====================================================

function storageDate(value) {

    const date =
        getDateValue(value);


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
// DISPLAY DATE
// =====================================================

function displayDate(value) {

    const date =
        storageDate(value);


    if (!date) {

        return "-";

    }


    const [
        year,
        month,
        day
    ] = date.split("-");


    return `${day}-${month}-${year}`;

}


// =====================================================
// WEEK START
// Monday
// =====================================================

function getWeekStart(value) {

    const date =
        getDateValue(value);


    if (!date) {

        return null;

    }


    const result =
        new Date(date);


    const day =
        result.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    result.setDate(
        result.getDate() +
        difference
    );


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


// =====================================================
// WEEK KEY
// =====================================================

function getWeekKey(value) {

    const start =
        getWeekStart(value);


    if (!start) {

        return "";

    }


    return storageDate(start);

}


// =====================================================
// WEEK LABEL
// =====================================================

function getWeekLabel(value) {

    const start =
        getWeekStart(value);


    if (!start) {

        return "-";

    }


    const end =
        new Date(start);


    end.setDate(
        end.getDate() + 6
    );


    return `${displayDate(start)} - ${displayDate(end)}`;

}


// =====================================================
// MONTH KEY
// =====================================================

function getMonthKey(value) {

    const date =
        getDateValue(value);


    if (!date) {

        return "";

    }


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    return `${year}-${month}`;

}


// =====================================================
// MONTH LABEL
// =====================================================

function getMonthLabel(key) {

    if (!key) {

        return "-";

    }


    const [
        year,
        month
    ] = key.split("-");


    return new Date(
        Number(year),
        Number(month) - 1,
        1
    ).toLocaleDateString(
        "en-IN",
        {
            month: "long",
            year: "numeric"
        }
    );

}


// =====================================================
// LOAN MAP
// =====================================================

function createLoanMap() {

    const map =
        new Map();


    state.loans.forEach(
        loan => {

            const documentId =
                String(
                    loan.id || ""
                );


            const loanNumber =
                String(

                    loan.loanId ??
                    loan.loanNumber ??
                    ""

                );


            if (documentId) {

                map.set(
                    documentId,
                    loan
                );

            }


            if (loanNumber) {

                map.set(
                    loanNumber,
                    loan
                );

            }

        }
    );


    return map;

}


// =====================================================
// GET LOAN
// =====================================================

function getLoanForCollection(
    payment,
    loanMap
) {

    const loanDocumentId =
        String(
            payment.loanDocumentId ??
            ""
        );


    const loanId =
        String(
            payment.loanId ??
            ""
        );


    if (
        loanDocumentId &&
        loanMap.has(loanDocumentId)
    ) {

        return loanMap.get(
            loanDocumentId
        );

    }


    if (
        loanId &&
        loanMap.has(loanId)
    ) {

        return loanMap.get(
            loanId
        );

    }


    return {};

}


// =====================================================
// BUILD REPORT ROW
// =====================================================

function buildRow(
    payment,
    loanMap
) {

    const loan =
        getLoanForCollection(
            payment,
            loanMap
        );


    // ---------------------------------------------
    // BASIC
    // ---------------------------------------------

    const loanId =
        String(

            payment.loanId ??
            loan.loanId ??
            loan.loanNumber ??
            payment.loanDocumentId ??
            "-"

        );


    const customerId =
        String(

            payment.customerId ??
            loan.customerId ??
            ""

        );


    const customerName =
        String(

            payment.customerName ??
            loan.customerName ??
            "-"

        );


    const staffName =
        String(

            payment.staffName ??
            payment.collectedByName ??
            "-"

        );


    // ---------------------------------------------
    // DATES
    // ---------------------------------------------

    const dueDate =
        storageDate(
            payment.dueDate
        );


    const paidDate =
        storageDate(

            payment.paymentDate ??
            payment.createdAt

        );


    // ---------------------------------------------
    // EMI DUE
    // ---------------------------------------------
    //
    // Priority:
    //
    // 1. explicit dueAmount
    // 2. emiDue
    // 3. installmentAmount from loan
    //
    // IMPORTANT:
    // previousEmiBalance is NOT used as
    // monthly due amount.
    //
    // ---------------------------------------------

    const dueAmount =
        Math.max(

            numberValue(

                payment.dueAmount ??
                payment.emiDue ??
                payment.installmentDue ??
                loan.installmentAmount ??
                loan.monthlyInstallment ??
                loan.emi

            ),

            0

        );


    // ---------------------------------------------
    // EMI PAID
    // ---------------------------------------------

    const emiPaid =
        Math.max(

            numberValue(

                payment.emiPaid ??
                payment.amountReceived ??
                payment.paidAmount ??
                0

            ),

            0

        );


    // ---------------------------------------------
    // PENALTY
    // ---------------------------------------------

    const penalty =
        Math.max(

            numberValue(

                payment.penaltyCollected ??
                payment.penaltyAmount ??
                0

            ),

            0

        );


    // ---------------------------------------------
    // TOTAL RECEIVED
    // ---------------------------------------------
    //
    // Current collection.js stores:
    //
    // emiPaid
    // + interestPaid
    // + penalty
    //
    // as totalReceived.
    //
    // We display Total Collection exactly
    // from stored totalReceived.
    //
    // Interest is NOT shown as a separate
    // report column.
    //
    // ---------------------------------------------

    const totalReceived =
        Math.max(

            numberValue(

                payment.totalReceived ??
                payment.totalCollection ??
                (
                    emiPaid +
                    penalty
                )

            ),

            0

        );


    // ---------------------------------------------
    // PENDING EMI
    // ---------------------------------------------
    //
    // Current collection.js stores
    // newEmiBalance.
    //
    // This is the correct EMI balance after
    // this payment.
    //
    // ---------------------------------------------

    let pending =
        numberValue(
            payment.newEmiBalance
        );


    if (
        payment.newEmiBalance === undefined ||
        payment.newEmiBalance === null
    ) {

        pending =
            Math.max(

                numberValue(

                    payment.balanceAfterPayment ??
                    0

                ),

                0

            );

    }


    // ---------------------------------------------
    // IF NO NEW BALANCE
    // ---------------------------------------------

    if (
        pending === 0 &&
        dueAmount > 0 &&
        emiPaid > 0 &&
        payment.newEmiBalance === undefined
    ) {

        pending =
            Math.max(

                dueAmount -
                emiPaid,

                0

            );

    }


    return {

        id:
            payment.id,

        raw:
            payment,

        loanId,

        customerId,

        customerName,

        staffName,

        dueDate,

        paidDate,

        dueAmount,

        emiPaid,

        pending,

        penalty,

        totalReceived,

        paymentMode:
            String(
                payment.paymentMode ??
                "-"
            ),

        receiptNumber:
            String(

                payment.receiptNumber ??
                payment.paymentId ??
                payment.id ??
                "-"

            ),

        remarks:
            String(
                payment.remarks ??
                "-"
            ),

        daysDelayed:
            numberValue(
                payment.daysDelayed
            )

    };

}


// =====================================================
// BUILD ALL ROWS
// =====================================================

function buildRows() {

    const loanMap =
        createLoanMap();


    return state.collections.map(
        payment =>
            buildRow(
                payment,
                loanMap
            )
    );

}


// =====================================================
// DATE FILTER
// =====================================================

function isDateInRange(row) {

    const from =
        $("fromDate")?.value || "";


    const to =
        $("toDate")?.value || "";


    /*
     * Report date = PAID DATE
     *
     * This makes:
     *
     * Date Wise
     * Week Wise
     * Month Wise
     *
     * based on actual collection date.
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
        $("staffFilter")?.value || "";


    const customer =
        $("customerFilter")?.value || "";


    const loan =
        $("loanFilter")?.value || "";


    return buildRows()
        .filter(
            row => {

                if (
                    !isDateInRange(row)
                ) {

                    return false;

                }


                if (
                    staff &&
                    row.staffName !== staff
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

            }
        );

}


// =====================================================
// SUMMARY
// =====================================================

function renderSummary(
    rows
) {

    const due =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                row.dueAmount,
            0
        );


    const paid =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                row.emiPaid,
            0
        );


    const pending =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                row.pending,
            0
        );


    const penalty =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                row.penalty,
            0
        );


    const collection =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                row.totalReceived,
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
        money(collection);

}


// =====================================================
// GROUP ROWS
// =====================================================

function groupRows(
    rows,
    group
) {

    const map =
        new Map();


    rows.forEach(
        row => {

            let key = "";


            const reportDate =
                row.paidDate ||
                row.dueDate;


            if (
                group === "date"
            ) {

                key =
                    reportDate;

            }


            else if (
                group === "week"
            ) {

                key =
                    getWeekKey(
                        reportDate
                    );

            }


            else if (
                group === "month"
            ) {

                key =
                    getMonthKey(
                        reportDate
                    );

            }


            else if (
                group === "staff"
            ) {

                key =
                    row.staffName;

            }


            else if (
                group === "customer"
            ) {

                key =
                    row.customerName;

            }


            if (!key) {

                key = "Unknown";

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


            item.count += 1;

            item.due +=
                row.dueAmount;

            item.paid +=
                row.emiPaid;

            item.pending +=
                row.pending;

            item.penalty +=
                row.penalty;

            item.total +=
                row.totalReceived;

        }
    );


    return [...map.values()];

}


// =====================================================
// GROUP LABEL
// =====================================================

function getGroupLabel(
    key,
    group
) {

    if (
        group === "date"
    ) {

        return displayDate(key);

    }


    if (
        group === "week"
    ) {

        return getWeekLabel(key);

    }


    if (
        group === "month"
    ) {

        return getMonthLabel(key);

    }


    return key;

}


// =====================================================
// RENDER REPORT
// =====================================================

function renderReport() {

    state.rows =
        getFilteredRows();


    renderSummary(
        state.rows
    );


    if (
        state.group === "staff" ||
        state.group === "customer"
    ) {

        renderStaffCustomer();

    }

    else {

        renderDateWeekMonth();

    }

}


// =====================================================
// DATE / WEEK / MONTH
// =====================================================

function renderDateWeekMonth() {

    const group =
        state.group;


    const titleMap = {

        date:
            "Date Wise Collection",

        week:
            "Week Wise Collection",

        month:
            "Month Wise Collection"

    };


    $("reportTitle")
        .textContent =
        titleMap[group];


    $("head").innerHTML = `

        <tr>

            <th>
                ${group === "date"
                    ? "DATE"
                    : group === "week"
                        ? "WEEK"
                        : "MONTH"}
            </th>

            <th>
                COLLECTIONS
            </th>

            <th>
                DUE AMOUNT
            </th>

            <th>
                EMI PAID
            </th>

            <th>
                EMI PENDING
            </th>

            <th>
                PENALTY
            </th>

            <th>
                TOTAL COLLECTION
            </th>

            <th>
                ACTION
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
                        ${escapeHTML(
                            getGroupLabel(
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
                            data-group-key="${escapeHTML(item.key)}"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `
        ).join("");


    document
        .querySelectorAll(
            "[data-group-key]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const key =
                            button.dataset
                                .groupKey;


                        const rows =
                            state.rows.filter(
                                row => {

                                    const date =
                                        row.paidDate ||
                                        row.dueDate;


                                    let currentKey;


                                    if (
                                        group === "date"
                                    ) {

                                        currentKey =
                                            date;

                                    }

                                    else if (
                                        group === "week"
                                    ) {

                                        currentKey =
                                            getWeekKey(
                                                date
                                            );

                                    }

                                    else {

                                        currentKey =
                                            getMonthKey(
                                                date
                                            );

                                    }


                                    return (
                                        currentKey ===
                                        key
                                    );

                                }
                            );


                        showTransactionList(
                            getGroupLabel(
                                key,
                                group
                            ),
                            rows
                        );

                    }
                );

            }
        );

}


// =====================================================
// STAFF / CUSTOMER
// =====================================================

function renderStaffCustomer() {

    const isStaff =
        state.group === "staff";


    $("reportTitle")
        .textContent =
        isStaff
            ? "Staff Wise Collection"
            : "Customer Wise Collection";


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
                COLLECTIONS
            </th>

            <th>
                DUE AMOUNT
            </th>

            <th>
                EMI PAID
            </th>

            <th>
                EMI PENDING
            </th>

            <th>
                PENALTY
            </th>

            <th>
                TOTAL COLLECTION
            </th>

            <th>
                ACTION
            </th>

        </tr>

    `;


    const groups =
        groupRows(
            state.rows,
            state.group
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

                    No collection records found.

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
                                    ? row.staffName
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
                            ${escapeHTML(
                                item.key
                            )}
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
                                data-person="${escapeHTML(item.key)}"
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

                button.addEventListener(
                    "click",
                    () => {

                        openPersonReport(
                            button.dataset
                                .person,
                            isStaff
                        );

                    }
                );

            }
        );

}


// =====================================================
// PERSON REPORT
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
                        ? row.staffName
                        : row.customerName

                ) === name

        );


    $("modalContent").innerHTML = `

        <h3>
            ${escapeHTML(name)}
        </h3>

        <div
            style="
                margin-top:12px;
                display:flex;
                gap:8px;
                flex-wrap:wrap;
            "
        >

            <button
                class="mode active"
                data-person-group="date"
            >
                Date Wise
            </button>

            <button
                class="mode"
                data-person-group="week"
            >
                Week Wise
            </button>

            <button
                class="mode"
                data-person-group="month"
            >
                Month Wise
            </button>

        </div>

        <div
            id="personReport"
            style="margin-top:15px"
        >
        </div>

    `;


    $("modal")
        .classList
        .add("show");


    function renderPerson(
        group
    ) {

        const groups =
            groupRows(
                rows,
                group
            );


        let html = `

            <div class="table-wrap">

                <table class="table">

                    <thead>

                        <tr>

                            <th>
                                PERIOD
                            </th>

                            <th>
                                COLLECTIONS
                            </th>

                            <th>
                                DUE
                            </th>

                            <th>
                                EMI PAID
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
                        colspan="7"
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
                                ${escapeHTML(
                                    getGroupLabel(
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


        $("personReport")
            .innerHTML =
            html;

    }


    renderPerson(
        "date"
    );


    document
        .querySelectorAll(
            "[data-person-group]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                "[data-person-group]"
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


                        renderPerson(
                            button.dataset
                                .personGroup
                        );

                    }
                );

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
            ${escapeHTML(title)}
        </h3>

        <div
            class="table-wrap"
            style="margin-top:15px"
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
                            EMI PAID
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
                            MODE
                        </th>

                        <th>
                            ACTION
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
                No collection records found.
            </div>

        `;

        return;

    }


    const body =
        rows.map(
            (row,index) => `

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
                        ${escapeHTML(
                            row.customerName
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.loanId
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.staffName
                        )}
                    </td>

                    <td class="num">
                        ${money(
                            row.dueAmount
                        )}
                    </td>

                    <td class="num green">
                        ${money(
                            row.emiPaid
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
                            row.totalReceived
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.paymentMode
                        )}
                    </td>

                    <td>

                        <button
                            class="light"
                            data-transaction="${index}"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `
        )
        .join("");


    $("modalContent").innerHTML +=

        body +

        `

                </tbody>

            </table>

        </div>

        `;


    document
        .querySelectorAll(
            "[data-transaction]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset
                                    .transaction
                            );


                        showPaymentDetails(
                            rows[index]
                        );

                    }
                );

            }
        );

}


// =====================================================
// PAYMENT DETAILS
// =====================================================

function showPaymentDetails(
    row
) {

    state.selectedRow =
        row;


    $("modalContent").innerHTML = `

        <h3>
            Collection Details
        </h3>

        <div
            class="detail"
            style="margin-top:15px"
        >

            <div>
                <b>Receipt No</b>
                ${escapeHTML(
                    row.receiptNumber
                )}
            </div>

            <div>
                <b>Loan No</b>
                ${escapeHTML(
                    row.loanId
                )}
            </div>

            <div>
                <b>Customer</b>
                ${escapeHTML(
                    row.customerName
                )}
            </div>

            <div>
                <b>Staff</b>
                ${escapeHTML(
                    row.staffName
                )}
            </div>

            <div>
                <b>Due Date</b>
                ${displayDate(
                    row.dueDate
                )}
            </div>

            <div>
                <b>Paid Date</b>
                ${displayDate(
                    row.paidDate
                )}
            </div>

            <div>
                <b>Due Amount</b>
                ${money(
                    row.dueAmount
                )}
            </div>

            <div>
                <b>EMI Paid</b>
                ${money(
                    row.emiPaid
                )}
            </div>

            <div>
                <b>EMI Pending</b>
                ${money(
                    row.pending
                )}
            </div>

            <div>
                <b>Penalty</b>
                ${money(
                    row.penalty
                )}
            </div>

            <div>
                <b>Total Collection</b>
                ${money(
                    row.totalReceived
                )}
            </div>

            <div>
                <b>Payment Mode</b>
                ${escapeHTML(
                    row.paymentMode
                )}
            </div>

            <div>
                <b>Days Delayed</b>
                ${row.daysDelayed}
            </div>

            <div>
                <b>Remarks</b>
                ${escapeHTML(
                    row.remarks
                )}
            </div>

        </div>

    `;


    $("modalPrint").onclick =
        () => {

            printSingleCollection(
                row
            );

        };


    $("modalDownload").onclick =
        () => {

            downloadSingleCollection(
                row
            );

        };

}


// =====================================================
// PRINT SINGLE COLLECTION
// =====================================================

function printSingleCollection(
    row
) {

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=900,height=700"
        );


    if (!printWindow) {

        alert(
            "Please allow pop-ups."
        );

        return;

    }


    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

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

            </style>

        </head>

        <body>

            <h2>
                SR Auto Finance
            </h2>

            <h3>
                Collection Receipt
            </h3>

            <table>

                <tr>
                    <td>Receipt No</td>
                    <td>${escapeHTML(row.receiptNumber)}</td>
                </tr>

                <tr>
                    <td>Loan No</td>
                    <td>${escapeHTML(row.loanId)}</td>
                </tr>

                <tr>
                    <td>Customer</td>
                    <td>${escapeHTML(row.customerName)}</td>
                </tr>

                <tr>
                    <td>Staff</td>
                    <td>${escapeHTML(row.staffName)}</td>
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
                    <td>EMI Paid</td>
                    <td>${money(row.emiPaid)}</td>
                </tr>

                <tr>
                    <td>EMI Pending</td>
                    <td>${money(row.pending)}</td>
                </tr>

                <tr>
                    <td>Penalty</td>
                    <td>${money(row.penalty)}</td>
                </tr>

                <tr>
                    <td>Total Collection</td>
                    <td>${money(row.totalReceived)}</td>
                </tr>

                <tr>
                    <td>Payment Mode</td>
                    <td>${escapeHTML(row.paymentMode)}</td>
                </tr>

                <tr>
                    <td>Remarks</td>
                    <td>${escapeHTML(row.remarks)}</td>
                </tr>

            </table>

        </body>

        </html>

    `);


    printWindow.document.close();


    setTimeout(
        () => {

            printWindow.print();

            printWindow.close();

        },
        300
    );

}


// =====================================================
// DOWNLOAD SINGLE COLLECTION
// =====================================================

function downloadSingleCollection(
    row
) {

    const csv = [

        [
            "Receipt No",
            "Loan No",
            "Customer",
            "Staff",
            "Due Date",
            "Paid Date",
            "Due Amount",
            "EMI Paid",
            "EMI Pending",
            "Penalty",
            "Total Collection",
            "Payment Mode",
            "Remarks"
        ].join(","),

        [

            row.receiptNumber,

            row.loanId,

            `"${String(
                row.customerName
            ).replaceAll(
                '"',
                '""'
            )}"`,

            `"${String(
                row.staffName
            ).replaceAll(
                '"',
                '""'
            )}"`,

            row.dueDate,

            row.paidDate,

            row.dueAmount,

            row.emiPaid,

            row.pending,

            row.penalty,

            row.totalReceived,

            row.paymentMode,

            `"${String(
                row.remarks
            ).replaceAll(
                '"',
                '""'
            )}"`

        ].join(",")

    ].join("\n");


    downloadTextFile(

        csv,

        `Collection-${row.receiptNumber}.csv`

    );

}


// =====================================================
// DOWNLOAD FULL REPORT
// =====================================================

function downloadFullReport() {

    const rows =
        state.rows;


    if (
        rows.length === 0
    ) {

        alert(
            "No collection data available to download."
        );

        return;

    }


    const csv = [

        [

            "Due Date",
            "Paid Date",
            "Customer",
            "Loan No",
            "Staff",
            "Due Amount",
            "EMI Paid",
            "EMI Pending",
            "Penalty",
            "Total Collection",
            "Payment Mode",
            "Receipt No",
            "Days Delayed",
            "Remarks"

        ].join(",")

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
                        row.staffName
                    ).replaceAll(
                        '"',
                        '""'
                    )}"`,

                    row.dueAmount,

                    row.emiPaid,

                    row.pending,

                    row.penalty,

                    row.totalReceived,

                    row.paymentMode,

                    row.receiptNumber,

                    row.daysDelayed,

                    `"${String(
                        row.remarks
                    ).replaceAll(
                        '"',
                        '""'
                    )}"`

                ].join(",")

            );

        }
    );


    downloadTextFile(

        csv.join("\n"),

        "SR-Auto-Finance-Collection-Report.csv"

    );

}


// =====================================================
// DOWNLOAD TEXT FILE
// =====================================================

function downloadTextFile(
    text,
    fileName
) {

    const blob =
        new Blob(
            [
                text
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
        fileName;


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
                row.staffName &&
                row.staffName !== "-"
            ) {

                staffSet.add(
                    row.staffName
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
                row.loanId &&
                row.loanId !== "-"
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
                    staff =>
                        `
                        <option
                            value="${escapeHTML(staff)}"
                        >
                            ${escapeHTML(staff)}
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
                            value="${escapeHTML(id)}"
                        >
                            ${escapeHTML(name)}
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
                            value="${escapeHTML(loan)}"
                        >
                            ${escapeHTML(loan)}
                        </option>
                        `
                )
                .join("")
        }

    `;

}


// =====================================================
// LOAD FIRESTORE
// =====================================================

async function loadReportData() {

    const note =
        $("note");


    if (note) {

        note.style.display =
            "block";


        note.textContent =
            "Loading collection data...";

    }


    try {

        /*
         * IMPORTANT
         *
         * Actual collection data is stored
         * inside Firestore:
         *
         * collections
         *
         * NOT payments.
         */

        const [
            collectionSnapshot,
            loanSnapshot
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
                    "loans"
                )
            )

        ]);


        state.collections =
            collectionSnapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        state.loans =
            loanSnapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        populateFilters();


        if (note) {

            note.style.display =
                "none";

        }


        renderReport();

    }

    catch(error) {

        console.error(
            "Collection report loading error:",
            error
        );


        if (note) {

            note.style.display =
                "block";


            note.textContent =
                "Unable to load collection data: " +
                error.message;

        }

    }

}


// =====================================================
// SEARCH
// =====================================================

$("searchBtn")
    ?.addEventListener(
        "click",
        () => {

            renderReport();

        }
    );


// =====================================================
// DOWNLOAD
// =====================================================

$("downloadBtn")
    ?.addEventListener(
        "click",
        () => {

            downloadFullReport();

        }
    );


// =====================================================
// PRINT
// =====================================================

$("printBtn")
    ?.addEventListener(
        "click",
        () => {

            window.print();

        }
    );


// =====================================================
// CLOSE MODAL
// =====================================================

$("close")
    ?.addEventListener(
        "click",
        () => {

            $("modal")
                ?.classList
                .remove(
                    "show"
                );

        }
    );


// =====================================================
// CLOSE MODAL - OUTSIDE
// =====================================================

$("modal")
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("modal")
            ) {

                $("modal")
                    .classList
                    .remove(
                        "show"
                    );

            }

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
// DEFAULT DATE
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


if (
    $("fromDate")
) {

    $("fromDate").value =
        storageDate(
            firstDay
        );

}


if (
    $("toDate")
) {

    $("toDate").value =
        storageDate(
            today
        );

}


// =====================================================
// START REPORT
// =====================================================

loadReportData();
