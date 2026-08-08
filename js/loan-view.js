// =====================================================
// SR AUTO FINANCE ERP
// Loan View Controller
// File: js/loan-view.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENT
// =====================================================

const pageContent =
    document.getElementById("pageContent");


// =====================================================
// URL PARAMETER
// =====================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const loanDocumentId =
    urlParams.get("id");


// =====================================================
// HELPERS
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
// DATE
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

            date =
                value.toDate();

        } else {

            date =
                new Date(value);

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
// GET LOAN
// =====================================================

async function getLoan() {

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

        throw new Error(
            "Loan account not found."
        );

    }

    return {

        documentId:
            loanSnap.id,

        ...loanSnap.data()

    };

}


// =====================================================
// GET CUSTOMER
// =====================================================

async function getCustomer(loan) {

    // -------------------------------------------------
    // First try customerDocumentId
    // -------------------------------------------------

    if (loan.customerDocumentId) {

        const customerRef =
            doc(
                db,
                "customers",
                loan.customerDocumentId
            );

        const customerSnap =
            await getDoc(
                customerRef
            );

        if (customerSnap.exists()) {

            return {

                id:
                    customerSnap.id,

                ...customerSnap.data()

            };

        }

    }


    // -------------------------------------------------
    // Fallback using customerId
    // -------------------------------------------------

    const customerId =
        loan.customerId;


    if (!customerId) {
        return null;
    }


    const customerQuery =
        query(
            collection(
                db,
                "customers"
            ),
            where(
                "customerId",
                "==",
                customerId
            )
        );


    const snapshot =
        await getDocs(
            customerQuery
        );


    if (!snapshot.empty) {

        const customerDoc =
            snapshot.docs[0];

        return {

            id:
                customerDoc.id,

            ...customerDoc.data()

        };

    }


    return null;

}


// =====================================================
// GET COLLECTION HISTORY
// =====================================================

async function getCollections(loan) {

    const loanId =
        loan.loanId ||
        loan.loanNumber ||
        loan.documentId;


    try {

        // ---------------------------------------------
        // Try loanId based query
        // ---------------------------------------------

        const collectionQuery =
            query(
                collection(
                    db,
                    "collections"
                ),
                where(
                    "loanId",
                    "==",
                    loanId
                )
            );


        const snapshot =
            await getDocs(
                collectionQuery
            );


        return snapshot.docs
            .map(
                collectionDoc => ({

                    id:
                        collectionDoc.id,

                    ...collectionDoc.data()

                })
            )
            .sort(
                (a, b) => {

                    const dateA =
                        getDateValue(
                            a.paymentDate ||
                            a.collectionDate ||
                            a.createdAt
                        );

                    const dateB =
                        getDateValue(
                            b.paymentDate ||
                            b.collectionDate ||
                            b.createdAt
                        );

                    return dateB - dateA;

                }
            );


    } catch (error) {

        console.error(
            "Collection history error:",
            error
        );

        return [];

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
// RENDER COLLECTION HISTORY
// =====================================================

function renderCollectionHistory(
    collections
) {

    if (!collections.length) {

        return `

            <div class="empty-state">

                <div class="empty-icon">
                    💰
                </div>

                <p>
                    No repayment history available.
                </p>

            </div>

        `;

    }


    return `

        <div style="
            overflow-x:auto;
        ">

            <table style="
                width:100%;
                border-collapse:collapse;
                min-width:700px;
            ">

                <thead>

                    <tr>

                        <th style="
                            text-align:left;
                            padding:11px;
                            background:#f8fafc;
                            font-size:10px;
                            color:#64748b;
                        ">
                            Receipt
                        </th>

                        <th style="
                            text-align:left;
                            padding:11px;
                            background:#f8fafc;
                            font-size:10px;
                            color:#64748b;
                        ">
                            Date
                        </th>

                        <th style="
                            text-align:right;
                            padding:11px;
                            background:#f8fafc;
                            font-size:10px;
                            color:#64748b;
                        ">
                            Amount
                        </th>

                        <th style="
                            text-align:left;
                            padding:11px;
                            background:#f8fafc;
                            font-size:10px;
                            color:#64748b;
                        ">
                            Mode
                        </th>

                        <th style="
                            text-align:left;
                            padding:11px;
                            background:#f8fafc;
                            font-size:10px;
                            color:#64748b;
                        ">
                            Remarks
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        collections.map(
                            item => {

                                const receipt =
                                    item.receiptNo ||
                                    item.receiptNumber ||
                                    item.receiptId ||
                                    item.id ||
                                    "-";

                                const date =
                                    item.paymentDate ||
                                    item.collectionDate ||
                                    item.createdAt;

                                const amount =
                                    item.amount ||
                                    item.paidAmount ||
                                    item.paymentAmount ||
                                    0;

                                const mode =
                                    item.paymentMode ||
                                    item.mode ||
                                    "-";

                                const remarks =
                                    item.remarks ||
                                    item.remark ||
                                    "-";


                                return `

                                    <tr>

                                        <td style="
                                            padding:12px 11px;
                                            border-bottom:1px solid #f1f5f9;
                                            font-size:11px;
                                            color:#2563eb;
                                            font-weight:700;
                                        ">
                                            ${escapeHTML(
                                                receipt
                                            )}
                                        </td>

                                        <td style="
                                            padding:12px 11px;
                                            border-bottom:1px solid #f1f5f9;
                                            font-size:11px;
                                        ">
                                            ${formatDate(
                                                date
                                            )}
                                        </td>

                                        <td style="
                                            padding:12px 11px;
                                            border-bottom:1px solid #f1f5f9;
                                            font-size:11px;
                                            text-align:right;
                                            font-weight:700;
                                        ">
                                            ${formatCurrency(
                                                amount
                                            )}
                                        </td>

                                        <td style="
                                            padding:12px 11px;
                                            border-bottom:1px solid #f1f5f9;
                                            font-size:11px;
                                        ">
                                            ${escapeHTML(
                                                mode
                                            )}
                                        </td>

                                        <td style="
                                            padding:12px 11px;
                                            border-bottom:1px solid #f1f5f9;
                                            font-size:11px;
                                        ">
                                            ${escapeHTML(
                                                remarks
                                            )}
                                        </td>

                                    </tr>

                                `;

                            }
                        ).join("")
                    }

                </tbody>

            </table>

        </div>

    `;

}


// =====================================================
// RENDER PAGE
// =====================================================

function renderLoan(
    loan,
    customer,
    collections
) {

    const loanId =
        loan.loanId ||
        loan.loanNumber ||
        loan.documentId ||
        "-";


    const customerName =
        customer?.name ||
        customer?.customerName ||
        loan.customerName ||
        "-";


    const customerId =
        customer?.customerId ||
        loan.customerId ||
        "-";


    const mobile =
        customer?.mobile ||
        customer?.phone ||
        loan.customerMobile ||
        "-";


    const amount =
        Number(
            loan.loanAmount ??
            loan.principalAmount ??
            loan.amount ??
            0
        );


    const interest =
        Number(
            loan.interestAmount ??
            0
        );


    const totalPayable =
        Number(
            loan.totalPayable ??
            amount + interest
        );


    const paid =
        collections.reduce(
            (
                total,
                item
            ) => {

                return total +
                    Number(
                        item.amount ||
                        item.paidAmount ||
                        item.paymentAmount ||
                        0
                    );

            },
            Number(
                loan.amountPaid || 0
            )
        );


    const outstanding =
        Math.max(
            totalPayable - paid,
            0
        );


    const status =
        loan.status ||
        "Active";


    const frequency =
        loan.repaymentFrequency ||
        "-";


    const interestType =
        loan.interestType ||
        "-";


    const rate =
        loan.interestRate ??
        0;


    const tenure =
        loan.tenure ??
        "-";


    const installment =
        Number(
            loan.installmentAmount ??
            0
        );


    pageContent.innerHTML = `

        <!-- ==========================================
             LOAN HEADER
        =========================================== -->

        <section class="loan-header">

            <div class="loan-left">

                <div class="loan-icon">
                    💳
                </div>

                <div>

                    <div class="loan-title">
                        ${escapeHTML(
                            loanId
                        )}
                    </div>

                    <div class="loan-id">
                        ${escapeHTML(
                            customerName
                        )}
                    </div>

                    <span class="loan-status">
                        ${escapeHTML(
                            status
                        )}
                    </span>

                </div>

            </div>


            <div class="header-actions">

                <button
                    class="action-btn"
                    onclick="viewCustomer(
                        '${encodeURIComponent(
                            customer?.id || ""
                        )}'
                    )"
                >
                    Customer
                </button>


                <button
                    class="action-btn"
                    onclick="location.href='collections.html?loanId=${encodeURIComponent(
                        loanId
                    )}'"
                >
                    Collect Payment
                </button>

            </div>

        </section>



        <!-- ==========================================
             SUMMARY
        =========================================== -->

        <section class="summary-grid">

            <div class="summary-card">

                <div class="summary-label">
                    Loan Amount
                </div>

                <div class="summary-value highlight">
                    ${formatCurrency(
                        amount
                    )}
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-label">
                    Total Payable
                </div>

                <div class="summary-value">
                    ${formatCurrency(
                        totalPayable
                    )}
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-label">
                    Amount Paid
                </div>

                <div class="summary-value">
                    ${formatCurrency(
                        paid
                    )}
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-label">
                    Outstanding
                </div>

                <div class="summary-value">
                    ${formatCurrency(
                        outstanding
                    )}
                </div>

            </div>

        </section>



        <!-- ==========================================
             DETAILS
        =========================================== -->

        <section class="details-grid">


            <!-- CUSTOMER -->

            <div class="card">

                <div class="card-title">
                    Customer Information
                </div>

                <div class="info-grid">

                    <div>

                        <div class="info-label">
                            Customer ID
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customerId
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Customer Name
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customerName
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Mobile
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                mobile
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Customer Status
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customer?.status ||
                                "-"
                            )}
                        </div>

                    </div>

                </div>

            </div>



            <!-- LOAN TERMS -->

            <div class="card">

                <div class="card-title">
                    Loan Terms
                </div>

                <div class="info-grid">

                    <div>

                        <div class="info-label">
                            Interest Rate
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                rate
                            )}%
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Interest Type
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                interestType
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Tenure
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                tenure
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Frequency
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                frequency
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Installment
                        </div>

                        <div class="info-value">
                            ${formatCurrency(
                                installment
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Interest Amount
                        </div>

                        <div class="info-value">
                            ${formatCurrency(
                                interest
                            )}
                        </div>

                    </div>

                </div>

            </div>



            <!-- DATES -->

            <div class="card">

                <div class="card-title">
                    Loan Dates
                </div>

                <div class="info-grid">

                    <div>

                        <div class="info-label">
                            Loan Date
                        </div>

                        <div class="info-value">
                            ${formatDate(
                                loan.loanDate
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            First Due Date
                        </div>

                        <div class="info-value">
                            ${formatDate(
                                loan.firstDueDate
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Created On
                        </div>

                        <div class="info-value">
                            ${formatDate(
                                loan.createdAt
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Processing Fee
                        </div>

                        <div class="info-value">
                            ${formatCurrency(
                                loan.processingFee
                            )}
                        </div>

                    </div>

                </div>

            </div>



            <!-- REPAYMENT -->

            <div class="card">

                <div class="card-title">
                    Repayment Summary
                </div>

                <div class="info-grid">

                    <div>

                        <div class="info-label">
                            Total Payable
                        </div>

                        <div class="info-value">
                            ${formatCurrency(
                                totalPayable
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Amount Paid
                        </div>

                        <div class="info-value">
                            ${formatCurrency(
                                paid
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Outstanding
                        </div>

                        <div class="info-value">
                            ${formatCurrency(
                                outstanding
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Payments
                        </div>

                        <div class="info-value">
                            ${collections.length}
                        </div>

                    </div>

                </div>

            </div>



            <!-- COLLECTION HISTORY -->

            <div class="card full">

                <div class="card-title">
                    Collection History
                </div>

                ${renderCollectionHistory(
                    collections
                )}

            </div>

        </section>

    `;

}


// =====================================================
// VIEW CUSTOMER
// =====================================================

window.viewCustomer =
    function(customerId) {

        if (!customerId) {
            return;
        }

        window.location.href =
            `customer-view.html?id=${encodeURIComponent(
                customerId
            )}`;

    };


// =====================================================
// LOAD PAGE
// =====================================================

async function loadLoanPage() {

    if (!loanDocumentId) {

        pageContent.innerHTML = `

            <div class="error">
                Loan ID is missing.
            </div>

        `;

        return;

    }


    try {

        const loan =
            await getLoan();


        const [
            customer,
            collections
        ] = await Promise.all([

            getCustomer(loan),

            getCollections(loan)

        ]);


        renderLoan(
            loan,
            customer,
            collections
        );


    } catch (error) {

        console.error(
            "Loan view error:",
            error
        );


        pageContent.innerHTML = `

            <div class="error">

                ⚠️
                ${escapeHTML(
                    error.message ||
                    "Unable to load loan details."
                )}

            </div>

        `;

    }

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


        await loadLoanPage();

    }
);
