// ============================================================
// SR AUTO FINANCE ERP
// STAFF - MY CUSTOMERS
// File: js/staff-customers.js
//
// STAFF CAN VIEW:
// Customer
// Loan
// Repayment / Collection History
//
// COLLECTION:
// Existing collection-form.html is opened with
// Firestore Loan Document ID in ?id=
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ELEMENTS
// ============================================================

const customerList =
    document.getElementById("customerList");

const customerDetails =
    document.getElementById("customerDetails");

const searchInput =
    document.getElementById("searchInput");

const searchBtn =
    document.getElementById("searchBtn");

const clearBtn =
    document.getElementById("clearBtn");

const backBtn =
    document.getElementById("backBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const loadingOverlay =
    document.getElementById("loadingOverlay");


// ============================================================
// GLOBAL DATA
// ============================================================

let currentStaff = null;

let allCustomers = [];

let allLoans = [];

let allPayments = [];

let assignedCustomers = [];

let assignedLoans = [];

let selectedCustomerId = "";


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

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "Staff session parse error:",
            error
        );

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

    for (const field of fields) {

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

    for (const value of values) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            continue;
        }

        const number =
            Number(value);

        if (Number.isFinite(number)) {
            return number;
        }
    }

    return 0;
}


// ============================================================
// CURRENCY
// ============================================================

function formatCurrency(value) {

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

function parseDate(value) {

    if (!value) {
        return null;
    }

    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();
    }

    if (value instanceof Date) {

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

function formatDate(value) {

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
// STAFF MATCH
// ============================================================

function matchesStaff(record) {

    if (
        !record ||
        !currentStaff
    ) {

        return false;
    }

    const sessionDocumentId =
        String(
            currentStaff.staffDocumentId ||
            ""
        );

    const sessionStaffId =
        String(
            currentStaff.staffId ||
            ""
        );

    const recordStaffId =
        String(
            firstValue(
                record,
                [
                    "staffId",
                    "assignedStaffId",
                    "collectorStaffId",
                    "collectedByStaffId",
                    "staffCode",
                    "employeeId"
                ],
                ""
            )
        );

    const recordDocumentId =
        String(
            firstValue(
                record,
                [
                    "staffDocumentId",
                    "assignedStaffDocumentId"
                ],
                ""
            )
        );

    if (
        recordStaffId &&
        (
            recordStaffId ===
            sessionStaffId ||
            recordStaffId ===
            sessionDocumentId
        )
    ) {

        return true;
    }

    if (
        recordDocumentId &&
        recordDocumentId ===
        sessionDocumentId
    ) {

        return true;
    }

    return false;
}


// ============================================================
// CUSTOMER ID
// ============================================================

function getCustomerId(customer) {

    return String(
        firstValue(
            customer,
            [
                "customerId",
                "customerCode"
            ],
            customer?.id || ""
        )
    );
}


// ============================================================
// CUSTOMER NAME
// ============================================================

function getCustomerName(customer) {

    return String(
        firstValue(
            customer,
            [
                "customerName",
                "name",
                "fullName"
            ],
            "Customer"
        )
    );
}


// ============================================================
// CUSTOMER MOBILE
// ============================================================

function getCustomerMobile(customer) {

    return String(
        firstValue(
            customer,
            [
                "mobile",
                "phone",
                "mobileNumber",
                "contactNumber"
            ],
            "-"
        )
    );
}


// ============================================================
// CUSTOMER ADDRESS
// ============================================================

function getCustomerAddress(customer) {

    return String(
        firstValue(
            customer,
            [
                "address",
                "customerAddress",
                "fullAddress"
            ],
            "-"
        )
    );
}


// ============================================================
// LOAN CUSTOMER ID
// ============================================================

function getLoanCustomerId(loan) {

    return String(
        firstValue(
            loan,
            [
                "customerId",
                "customerDocumentId"
            ],
            ""
        )
    );
}


// ============================================================
// LOAN BUSINESS ID
// ============================================================

function getLoanId(loan) {

    return String(
        firstValue(
            loan,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ],
            loan?.id || ""
        )
    );
}


// ============================================================
// PAYMENT LOAN ID
// ============================================================

function getPaymentLoanId(payment) {

    return String(
        firstValue(
            payment,
            [
                "loanId",
                "loanNumber",
                "loanCode"
            ],
            ""
        )
    );
}


// ============================================================
// ACTIVE LOAN CHECK
// ============================================================

function isActiveLoan(loan) {

    const status =
        String(
            loan?.status ||
            "active"
        ).toLowerCase();

    return ![
        "closed",
        "completed",
        "cancelled",
        "canceled"
    ].includes(status);
}


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    showLoading(true);

    try {

        const [
            customersSnapshot,
            loansSnapshot,
            paymentsSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "customers"
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
                    "payments"
                )
            )

        ]);


        // ====================================================
        // CUSTOMERS
        // ====================================================

        allCustomers = [];

        customersSnapshot.forEach(
            docSnap => {

                allCustomers.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });

            }
        );


        // ====================================================
        // LOANS
        // ====================================================

        allLoans = [];

        loansSnapshot.forEach(
            docSnap => {

                allLoans.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });

            }
        );


        // ====================================================
        // PAYMENTS
        // ====================================================

        allPayments = [];

        paymentsSnapshot.forEach(
            docSnap => {

                const payment = {
                    id: docSnap.id,
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
                    ].includes(status)
                ) {

                    return;
                }

                allPayments.push(
                    payment
                );

            }
        );


        buildAssignedData();

        renderCustomerList();

    } catch (error) {

        console.error(
            "Staff customers loading error:",
            error
        );

        if (customerList) {

            customerList.innerHTML = `
                <div class="empty">
                    Unable to load customers.
                    Check browser console.
                </div>
            `;
        }

    } finally {

        showLoading(false);
    }
}


// ============================================================
// BUILD ASSIGNED DATA
// ============================================================
function buildAssignedData() {

    // ========================================================
    // CURRENT VERSION:
    // One staff only.
    // Staff can view ALL customers and ALL loans.
    //
    // Later Version 2:
    // Staff-wise customer/loan assignment can be enabled.
    // ========================================================

    assignedCustomers = [
        ...allCustomers
    ];

    assignedLoans = [
        ...allLoans
    ];

    // Sort customers by name
    assignedCustomers.sort(
        (a, b) =>
            getCustomerName(a)
                .localeCompare(
                    getCustomerName(b)
                )
    );
}

// ============================================================
// RENDER CUSTOMER LIST
// ============================================================

function renderCustomerList(
    customers = assignedCustomers
) {

    if (!customerList) {
        return;
    }

    if (!customers.length) {

        customerList.innerHTML = `
            <div class="empty">
                No customers assigned to this staff.
            </div>
        `;

        if (customerDetails) {

            customerDetails.innerHTML = `
                <div class="empty">
                    No assigned customer selected.
                </div>
            `;
        }

        return;
    }


    customerList.innerHTML =
        customers
            .map(
                customer =>
                    createCustomerListItem(
                        customer
                    )
            )
            .join("");


    document
        .querySelectorAll(
            ".customer-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectCustomer(
                            button.dataset.customerId
                        );

                    }
                );

            }
        );


    if (!selectedCustomerId) {

        selectCustomer(
            getCustomerId(
                customers[0]
            )
        );
    }
}


// ============================================================
// CUSTOMER LIST ITEM
// ============================================================

function createCustomerListItem(
    customer
) {

    const customerId =
        getCustomerId(
            customer
        );

    const customerLoans =
        assignedLoans.filter(
            loan =>
                getLoanCustomerId(
                    loan
                ) === customerId
        );

    const activeLoans =
        customerLoans.filter(
            loan =>
                isActiveLoan(loan)
        );

    const mobile =
        getCustomerMobile(
            customer
        );

    return `
        <button
            type="button"
            class="customer-item ${
                String(selectedCustomerId) ===
                String(customerId)
                    ? "active"
                    : ""
            }"
            data-customer-id="${escapeHtml(
                customerId
            )}"
        >

            <div class="customer-name">
                ${escapeHtml(
                    getCustomerName(
                        customer
                    )
                )}
            </div>

            <div class="customer-meta">

                <span class="badge blue">
                    ${activeLoans.length}
                    Active Loan${
                        activeLoans.length === 1
                            ? ""
                            : "s"
                    }
                </span>

                <span class="badge">
                    ${escapeHtml(
                        mobile
                    )}
                </span>

            </div>

        </button>
    `;
}


// ============================================================
// SELECT CUSTOMER
// ============================================================

function selectCustomer(
    customerId
) {

    selectedCustomerId =
        String(
            customerId
        );


    document
        .querySelectorAll(
            ".customer-item"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    String(
                        button.dataset.customerId
                    ) ===
                    selectedCustomerId
                );

            }
        );


    const customer =
        assignedCustomers.find(
            item =>
                getCustomerId(
                    item
                ) ===
                selectedCustomerId
        );


    if (!customer) {

        if (customerDetails) {

            customerDetails.innerHTML = `
                <div class="empty">
                    Customer details not found.
                </div>
            `;
        }

        return;
    }


    renderCustomerDetails(
        customer
    );
}


// ============================================================
// CUSTOMER DETAILS
// ============================================================

function renderCustomerDetails(
    customer
) {

    const customerId =
        getCustomerId(
            customer
        );

    const customerLoans =
        assignedLoans.filter(
            loan =>
                getLoanCustomerId(
                    loan
                ) === customerId
        );

    const mobile =
        getCustomerMobile(
            customer
        );

    const address =
        getCustomerAddress(
            customer
        );


    // ========================================================
    // TOTAL LOAN AMOUNT
    // ========================================================

    const totalLoanAmount =
        customerLoans.reduce(
            (
                total,
                loan
            ) => {

                return (
                    total +
                    numberValue(
                        loan.loanAmount,
                        loan.principalAmount,
                        loan.amount
                    )
                );

            },
            0
        );


    // ========================================================
    // TOTAL PAID
    // ========================================================

    const totalPaid =
        customerLoans.reduce(
            (
                total,
                loan
            ) => {

                return (
                    total +
                    numberValue(
                        loan.totalPaid,
                        loan.paidAmount,
                        loan.amountPaid
                    )
                );

            },
            0
        );


    // ========================================================
    // TOTAL PENDING
    // ========================================================

    const totalPending =
    customerLoans.reduce(
        (
            total,
            loan
        ) => {

            // ====================================================
            // CURRENT OUTSTANDING
            // ====================================================

            if (
                loan.outstandingAmount !==
                    undefined &&
                loan.outstandingAmount !==
                    null &&
                loan.outstandingAmount !==
                    ""
            ) {

                return (
                    total +
                    Math.max(
                        numberValue(
                            loan.outstandingAmount
                        ),
                        0
                    )
                );

            }


            // ====================================================
            // BALANCE AMOUNT
            // ====================================================

            if (
                loan.balanceAmount !==
                    undefined &&
                loan.balanceAmount !==
                    null &&
                loan.balanceAmount !==
                    ""
            ) {

                return (
                    total +
                    Math.max(
                        numberValue(
                            loan.balanceAmount
                        ),
                        0
                    )
                );

            }


            // ====================================================
            // FALLBACK
            // ====================================================

            const payable =
                numberValue(
                    loan.totalPayable,
                    loan.totalAmount
                );


            const paid =
                numberValue(
                    loan.totalPaid,
                    loan.paidAmount,
                    loan.amountPaid
                );


            return (
                total +
                Math.max(
                    payable -
                    paid,
                    0
                )
            );

        },
        0
    );


    if (!customerDetails) {
        return;
    }


    customerDetails.innerHTML = `

        <div class="customer-header">

            <div class="customer-header-top">

                <div>

                    <h2 class="customer-main-name">
                        ${escapeHtml(
                            getCustomerName(
                                customer
                            )
                        )}
                    </h2>

                    <div class="customer-main-meta">

                        ID:
                        ${escapeHtml(
                            customerId
                        )}

                        &nbsp; | &nbsp;

                        Mobile:
                        ${escapeHtml(
                            mobile
                        )}

                    </div>

                </div>


                <button
                    type="button"
                    class="collect-main-btn"
                    data-action="collect"
                >
                    Collect Payment
                </button>

            </div>


            <div class="customer-main-meta">

                Address:
                ${escapeHtml(
                    address
                )}

            </div>


            <div class="customer-info-grid">

                <div class="info-card">

                    <div class="info-label">
                        Total Loans
                    </div>

                    <div class="info-value">
                        ${customerLoans.length}
                    </div>

                </div>


                <div class="info-card">

                    <div class="info-label">
                        Loan Amount
                    </div>

                    <div class="info-value">
                        ${formatCurrency(
                            totalLoanAmount
                        )}
                    </div>

                </div>


                <div class="info-card">

                    <div class="info-label">
                        Total Paid
                    </div>

                    <div class="info-value">
                        ${formatCurrency(
                            totalPaid
                        )}
                    </div>

                </div>


                <div class="info-card">

                    <div class="info-label">
                        Total Pending
                    </div>

                    <div class="info-value">
                        ${formatCurrency(
                            totalPending
                        )}
                    </div>

                </div>

            </div>

        </div>


        <div class="loans-section">

            ${
                customerLoans.length
                    ? customerLoans
                        .map(
                            loan =>
                                renderLoan(
                                    loan
                                )
                        )
                        .join("")
                    : `
                        <div class="empty">
                            No loans assigned for this customer.
                        </div>
                    `
            }

        </div>

    `;


    // ========================================================
    // CUSTOMER LEVEL COLLECT BUTTON
    // ========================================================

    const collectButton =
        customerDetails.querySelector(
            '[data-action="collect"]'
        );


    if (collectButton) {

        collectButton.addEventListener(
            "click",
            () => {

                const activeLoans =
                    customerLoans.filter(
                        loan =>
                            isActiveLoan(
                                loan
                            )
                    );


                if (!activeLoans.length) {

                    alert(
                        "This customer has no active loan."
                    );

                    return;
                }


                // One active loan:
                // Directly open collection
                if (
                    activeLoans.length === 1
                ) {

                    openCollectionPage(
                        activeLoans[0].id
                    );

                    return;
                }


                // Multiple active loans
                alert(
                    "This customer has multiple active loans. Please use the Collect Payment button under the required loan."
                );

            }
        );
    }


    // ========================================================
    // LOAN-WISE COLLECT BUTTON
    // ========================================================

    customerDetails
        .querySelectorAll(
            ".collect-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const loanDocumentId =
                            button.dataset.loanId;


                        if (!loanDocumentId) {

                            alert(
                                "Loan document ID not found."
                            );

                            return;
                        }


                        openCollectionPage(
                            loanDocumentId
                        );

                    }
                );

            }
        );


    // ========================================================
    // PAYMENT HISTORY COLLECT BUTTON
    // ========================================================

    customerDetails
        .querySelectorAll(
            ".payment-collect-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const loanDocumentId =
                            button.dataset.loanId;


                        if (!loanDocumentId) {

                            alert(
                                "Loan document ID not found."
                            );

                            return;
                        }


                        openCollectionPage(
                            loanDocumentId
                        );

                    }
                );

            }
        );
}


// ============================================================
// OPEN COLLECTION PAGE
// ============================================================
//
// Existing collection.js expects:
// collection-form.html?id=LOAN_DOCUMENT_ID
//
// ============================================================

function openCollectionPage(
    loanDocumentId
) {

    const id =
        String(
            loanDocumentId ||
            ""
        ).trim();


    if (!id) {

        alert(
            "Loan document ID not found."
        );

        return;
    }


    window.location.href =
        `collection-form.html?id=${encodeURIComponent(
            id
        )}`;
}


// ============================================================
// RENDER LOAN
// ============================================================

function renderLoan(
    loan
) {

    const loanId =
        getLoanId(
            loan
        );


    const status =
        String(
            loan.status ||
            "Active"
        );


    const statusLower =
        status.toLowerCase();


    const loanAmount =
        numberValue(
            loan.loanAmount,
            loan.principalAmount,
            loan.amount
        );


    const principal =
        numberValue(
            loan.principalAmount,
            loan.principal,
            loan.loanAmount
        );


    const interest =
        numberValue(
            loan.interestAmount,
            loan.totalInterest,
            loan.interest
        );


    const tenure =
        numberValue(
            loan.tenure,
            loan.tenureMonths,
            loan.duration
        );


    const emi =
        numberValue(
            loan.installmentAmount,
            loan.emiAmount,
            loan.monthlyInstallment
        );


  const pending =
    (
        loan.outstandingAmount !==
            undefined &&
        loan.outstandingAmount !==
            null &&
        loan.outstandingAmount !==
            ""
    )
        ? Math.max(
            numberValue(
                loan.outstandingAmount
            ),
            0
        )
        : (
            loan.balanceAmount !==
                undefined &&
            loan.balanceAmount !==
                null &&
            loan.balanceAmount !==
                ""
        )
            ? Math.max(
                numberValue(
                    loan.balanceAmount
                ),
                0
            )
            : Math.max(
                numberValue(
                    loan.totalPayable,
                    loan.totalAmount
                ) -
                numberValue(
                    loan.totalPaid,
                    loan.paidAmount,
                    loan.amountPaid
                ),
                0
            );


    const paymentRows =
        getLoanPayments(
            loan
        );


    const closedLoan =
        [
            "closed",
            "completed",
            "cancelled",
            "canceled"
        ].includes(
            statusLower
        );


    return `

        <div class="loan-card">

            <div class="loan-header">

                <div class="loan-number">

                    Loan:
                    ${escapeHtml(
                        loanId
                    )}

                </div>


                <span
                    class="
                        loan-status
                        ${
                            closedLoan
                                ? "closed"
                                : ""
                        }
                    "
                >
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-action-row">

                ${
                    closedLoan
                        ? ""
                        : `
                            <button
                                type="button"
                                class="collect-btn"
                                data-loan-id="${escapeHtml(
                                    loan.id
                                )}"
                            >
                                Collect Payment
                            </button>
                        `
                }

            </div>


            <div class="loan-summary">

                <div class="loan-stat">

                    <div class="loan-stat-label">
                        Loan Amount
                    </div>

                    <div class="loan-stat-value">
                        ${formatCurrency(
                            loanAmount
                        )}
                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">
                        Principal
                    </div>

                    <div class="loan-stat-value">
                        ${formatCurrency(
                            principal
                        )}
                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">
                        Interest
                    </div>

                    <div class="loan-stat-value">
                        ${formatCurrency(
                            interest
                        )}
                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">
                        Tenure
                    </div>

                    <div class="loan-stat-value">
                        ${tenure || "-"}
                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">
                        EMI
                    </div>

                    <div class="loan-stat-value">
                        ${formatCurrency(
                            emi
                        )}
                    </div>

                </div>


                <div class="loan-stat">

                    <div class="loan-stat-label">
                        Pending
                    </div>

                    <div class="loan-stat-value">
                        ${formatCurrency(
                            pending
                        )}
                    </div>

                </div>

            </div>


            <div class="schedule-section">

                <div class="schedule-title">
                    Repayment / Collection History
                </div>


                <div class="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>
                                    Due Date
                                </th>

                                <th>
                                    Due Amount
                                </th>

                                <th>
                                    Paid Date
                                </th>

                                <th>
                                    Paid Amount
                                </th>

                                <th>
                                    Penalty
                                </th>

                                <th>
                                    Pending
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                paymentRows.length
                                    ? paymentRows
                                        .map(
                                            (
                                                payment,
                                                index
                                            ) =>
                                                renderPaymentRow(
                                                    payment,
                                                    index + 1,
                                                    loan.id
                                                )
                                        )
                                        .join("")
                                    : `
                                        <tr>

                                            <td
                                                colspan="9"
                                                style="
                                                    text-align:center;
                                                    color:#64748b;
                                                    padding:25px;
                                                "
                                            >
                                                No repayment records found.
                                            </td>

                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    `;
}


// ============================================================
// GET LOAN PAYMENTS
// ============================================================

function getLoanPayments(
    loan
) {

    const loanDocumentId =
        String(
            loan.id ||
            ""
        );


    const loanBusinessId =
        getLoanId(
            loan
        );


    return allPayments
        .filter(
            payment => {

                const paymentLoanId =
                    getPaymentLoanId(
                        payment
                    );


                const paymentLoanDocumentId =
                    String(
                        firstValue(
                            payment,
                            [
                                "loanDocumentId"
                            ],
                            ""
                        )
                    );


                return (
                    paymentLoanId ===
                    loanBusinessId ||

                    paymentLoanId ===
                    loanDocumentId ||

                    paymentLoanDocumentId ===
                    loanDocumentId ||

                    paymentLoanDocumentId ===
                    loanBusinessId
                );

            }
        )
        .sort(
            (
                a,
                b
            ) => {

                const dateA =
                    parseDate(
                        firstValue(
                            a,
                            [
                                "paymentDate",
                                "paidDate",
                                "collectionDate",
                                "date"
                            ],
                            ""
                        )
                    );


                const dateB =
                    parseDate(
                        firstValue(
                            b,
                            [
                                "paymentDate",
                                "paidDate",
                                "collectionDate",
                                "date"
                            ],
                            ""
                        )
                    );


                return (
                    (
                        dateA?.getTime() ||
                        0
                    ) -
                    (
                        dateB?.getTime() ||
                        0
                    )
                );
            }
        );
}


// ============================================================
// RENDER PAYMENT ROW
// ============================================================

function renderPaymentRow(
    payment,
    index,
    loanDocumentId
) {

    const dueDate =
        firstValue(
            payment,
            [
                "dueDate",
                "emiDueDate",
                "installmentDueDate"
            ],
            ""
        );


    const paymentDate =
        firstValue(
            payment,
            [
                "paymentDate",
                "paidDate",
                "collectionDate",
                "date"
            ],
            ""
        );


    const dueAmount =
        numberValue(
            payment.dueAmount,
            payment.installmentAmount,
            payment.emiAmount
        );


    const paidAmount =
        numberValue(
            payment.paidAmount,
            payment.amountReceived,
            payment.emiPaid,
            payment.totalReceived
        );


    const penalty =
        numberValue(
            payment.penalty,
            payment.penaltyAmount,
            payment.penaltyCollected
        );


    let pending =
        numberValue(
            payment.pendingAmount,
            payment.emiPending
        );


    if (
        pending === 0 &&
        dueAmount > 0
    ) {

        pending =
            Math.max(
                dueAmount -
                paidAmount,
                0
            );
    }


    const status =
        getPaymentStatus(
            payment,
            dueDate,
            dueAmount,
            paidAmount,
            pending
        );


    const actionAllowed =
        status.key !== "paid";


    return `

        <tr>

            <td>
                ${index}
            </td>


            <td>
                ${formatDate(
                    dueDate
                )}
            </td>


            <td>
                ${formatCurrency(
                    dueAmount
                )}
            </td>


            <td>
                ${formatDate(
                    paymentDate
                )}
            </td>


            <td>
                ${formatCurrency(
                    paidAmount
                )}
            </td>


            <td>
                ${formatCurrency(
                    penalty
                )}
            </td>


            <td>
                ${formatCurrency(
                    pending
                )}
            </td>


            <td>

                <span
                    class="status ${status.key}"
                >
                    ${status.label}
                </span>

            </td>


            <td>

                ${
                    actionAllowed
                        ? `
                            <button
                                type="button"
                                class="payment-collect-btn"
                                data-loan-id="${escapeHtml(
                                    loanDocumentId
                                )}"
                            >
                                Collect
                            </button>
                        `
                        : `
                            <button
                                type="button"
                                class="payment-collect-btn"
                                disabled
                            >
                                Paid
                            </button>
                        `
                }

            </td>

        </tr>

    `;
}


// ============================================================
// PAYMENT STATUS
// ============================================================

function getPaymentStatus(
    payment,
    dueDate,
    dueAmount,
    paidAmount,
    pending
) {

    const existingStatus =
        String(
            payment?.status ||
            ""
        ).toLowerCase();


    if (
        [
            "paid",
            "success",
            "completed"
        ].includes(
            existingStatus
        ) &&
        pending <= 0 &&
        paidAmount > 0
    ) {

        return {
            key: "paid",
            label: "Paid"
        };
    }


    if (
        pending <= 0 &&
        paidAmount > 0
    ) {

        return {
            key: "paid",
            label: "Paid"
        };
    }


    if (
        paidAmount > 0 &&
        pending > 0
    ) {

        return {
            key: "partial",
            label: "Partial"
        };
    }


    const due =
        parseDate(
            dueDate
        );


    if (due) {

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        due.setHours(
            0,
            0,
            0,
            0
        );


        if (
            due.getTime() <
            today.getTime()
        ) {

            return {
                key: "overdue",
                label: "Overdue"
            };
        }


        if (
            due.getTime() ===
            today.getTime()
        ) {

            return {
                key: "due",
                label: "Due Today"
            };
        }
    }


    return {
        key: "upcoming",
        label: "Upcoming"
    };
}


// ============================================================
// SEARCH CUSTOMERS
// ============================================================

function searchCustomers() {

    const value =
        String(
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    if (!value) {

        selectedCustomerId =
            "";

        renderCustomerList(
            assignedCustomers
        );

        return;
    }


    const filtered =
        assignedCustomers.filter(
            customer => {

                const customerId =
                    getCustomerId(
                        customer
                    )
                        .toLowerCase();


                const name =
                    getCustomerName(
                        customer
                    )
                        .toLowerCase();


                const mobile =
                    getCustomerMobile(
                        customer
                    )
                        .toLowerCase();


                const loanMatch =
                    assignedLoans.some(
                        loan => {

                            if (
                                getLoanCustomerId(
                                    loan
                                ) !==
                                customerId
                            ) {

                                return false;
                            }


                            return getLoanId(
                                loan
                            )
                                .toLowerCase()
                                .includes(
                                    value
                                );
                        }
                    );


                return (
                    name.includes(
                        value
                    ) ||

                    customerId.includes(
                        value
                    ) ||

                    mobile.includes(
                        value
                    ) ||

                    loanMatch
                );
            }
        );


    selectedCustomerId =
        "";


    renderCustomerList(
        filtered
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

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

function showLoading(show) {

    if (!loadingOverlay) {
        return;
    }

    loadingOverlay.style.display =
        show
            ? "flex"
            : "none";
}


// ============================================================
// LOGOUT
// ============================================================

async function logoutStaff() {

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


    window.location.href =
        "staff-login.html";
}


// ============================================================
// BACK TO DASHBOARD
// ============================================================

if (backBtn) {

    backBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "staff-dashboard.html";

        }
    );
}


// ============================================================
// LOGOUT BUTTON
// ============================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logoutStaff
    );
}


// ============================================================
// SEARCH BUTTON
// ============================================================

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        searchCustomers
    );
}


// ============================================================
// SEARCH ENTER
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchCustomers();
            }
        }
    );
}


// ============================================================
// SEARCH LIVE
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            const value =
                String(
                    searchInput.value ||
                    ""
                ).trim();

            if (!value) {

                selectedCustomerId =
                    "";

                renderCustomerList(
                    assignedCustomers
                );
            }
        }
    );
}


// ============================================================
// CLEAR SEARCH
// ============================================================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        () => {

            if (searchInput) {

                searchInput.value =
                    "";
            }

            selectedCustomerId =
                "";

            renderCustomerList(
                assignedCustomers
            );

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


        if (!user) {

            window.location.href =
                "staff-login.html";

            return;
        }


        currentStaff =
            session;


        await loadData();

    }
);
