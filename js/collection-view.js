// =====================================================
// SR AUTO FINANCE ERP
// Collection View Controller
// File: js/collection-view.js
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

const collectionId =
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
// DATE FORMAT
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
// DATE + TIME
// =====================================================

function formatDateTime(value) {

    const date =
        getDateObject(value);

    if (!date) {
        return "-";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =====================================================
// LOAD COLLECTION BY DOCUMENT ID
// =====================================================

async function getCollectionByDocumentId() {

    const collectionRef =
        doc(
            db,
            "collections",
            collectionId
        );

    const snapshot =
        await getDoc(
            collectionRef
        );

    if (!snapshot.exists()) {
        return null;
    }

    return {

        id:
            snapshot.id,

        ...snapshot.data()

    };

}


// =====================================================
// LOAD COLLECTION BY RECEIPT NUMBER
// =====================================================

async function getCollectionByReceiptNo() {

    const collectionRef =
        collection(
            db,
            "collections"
        );

    const receiptQuery =
        query(
            collectionRef,
            where(
                "receiptNo",
                "==",
                collectionId
            )
        );

    const snapshot =
        await getDocs(
            receiptQuery
        );

    if (snapshot.empty) {
        return null;
    }

    const collectionDoc =
        snapshot.docs[0];

    return {

        id:
            collectionDoc.id,

        ...collectionDoc.data()

    };

}


// =====================================================
// GET COLLECTION
// =====================================================

async function getCollection() {

    if (!collectionId) {

        throw new Error(
            "Receipt ID is missing."
        );

    }


    // First try document ID

    const byDocumentId =
        await getCollectionByDocumentId();


    if (byDocumentId) {

        return byDocumentId;

    }


    // Then try receipt number

    const byReceiptNo =
        await getCollectionByReceiptNo();


    if (byReceiptNo) {

        return byReceiptNo;

    }


    throw new Error(
        "Payment receipt not found."
    );

}


// =====================================================
// GET LOAN
// =====================================================

async function getLoan(payment) {

    // -------------------------------------------------
    // Try loanDocumentId
    // -------------------------------------------------

    if (payment.loanDocumentId) {

        const loanRef =
            doc(
                db,
                "loans",
                payment.loanDocumentId
            );

        const loanSnap =
            await getDoc(
                loanRef
            );

        if (loanSnap.exists()) {

            return {

                id:
                    loanSnap.id,

                ...loanSnap.data()

            };

        }

    }


    // -------------------------------------------------
    // Try loanId
    // -------------------------------------------------

    const loanId =
        payment.loanId;


    if (!loanId) {
        return null;
    }


    const loanRef =
        doc(
            db,
            "loans",
            loanId
        );

    const loanSnap =
        await getDoc(
            loanRef
        );


    if (loanSnap.exists()) {

        return {

            id:
                loanSnap.id,

            ...loanSnap.data()

        };

    }


    // -------------------------------------------------
    // Search by loanId field
    // -------------------------------------------------

    try {

        const loanQuery =
            query(
                collection(
                    db,
                    "loans"
                ),
                where(
                    "loanId",
                    "==",
                    loanId
                )
            );

        const snapshot =
            await getDocs(
                loanQuery
            );


        if (!snapshot.empty) {

            const loanDoc =
                snapshot.docs[0];

            return {

                id:
                    loanDoc.id,

                ...loanDoc.data()

            };

        }

    } catch (error) {

        console.error(
            "Loan search error:",
            error
        );

    }


    return null;

}


// =====================================================
// GET CUSTOMER
// =====================================================

async function getCustomer(
    payment,
    loan
) {

    // -------------------------------------------------
    // Try customerDocumentId from payment
    // -------------------------------------------------

    const customerDocumentId =
        payment.customerDocumentId ||
        loan?.customerDocumentId;


    if (customerDocumentId) {

        const customerRef =
            doc(
                db,
                "customers",
                customerDocumentId
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
    // Search by customerId
    // -------------------------------------------------

    const customerId =
        payment.customerId ||
        loan?.customerId;


    if (!customerId) {
        return null;
    }


    try {

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

    } catch (error) {

        console.error(
            "Customer search error:",
            error
        );

    }


    return null;

}


// =====================================================
// RENDER RECEIPT
// =====================================================

function renderReceipt(
    payment,
    loan,
    customer
) {

    const receiptNo =
        payment.receiptNo ||
        payment.receiptNumber ||
        payment.receiptId ||
        payment.id ||
        "-";


    const loanId =
        payment.loanId ||
        loan?.loanId ||
        loan?.loanNumber ||
        "-";


    const customerName =
        payment.customerName ||
        customer?.name ||
        customer?.customerName ||
        loan?.customerName ||
        "-";


    const customerId =
        payment.customerId ||
        customer?.customerId ||
        customer?.customerCode ||
        "-";


    const mobile =
        payment.customerMobile ||
        customer?.mobile ||
        customer?.phone ||
        loan?.customerMobile ||
        "-";


    const amount =
        Number(
            payment.amount ??
            payment.paidAmount ??
            payment.paymentAmount ??
            0
        );


    const paymentDate =
        payment.paymentDate ||
        payment.collectionDate ||
        payment.date;


    const paymentMode =
        payment.paymentMode ||
        payment.mode ||
        "-";


    const referenceNumber =
        payment.referenceNumber ||
        payment.transactionNumber ||
        payment.reference ||
        "-";


    const remarks =
        payment.remarks ||
        payment.remark ||
        "-";


    const totalPayable =
        Number(
            loan?.totalPayable ??
            loan?.totalAmount ??
            0
        );


    const loanAmount =
        Number(
            loan?.loanAmount ??
            loan?.principalAmount ??
            0
        );


    const currentPaid =
        Number(
            loan?.amountPaid ??
            loan?.paidAmount ??
            0
        );


    const currentOutstanding =
        Number(
            loan?.outstandingAmount ??
            loan?.balanceAmount ??
            loan?.pendingAmount ??
            Math.max(
                totalPayable -
                currentPaid,
                0
            )
        );


    /*
     * Amount paid BEFORE this receipt.
     *
     * Current loan amountPaid normally
     * includes this payment already.
     */

    const paidBefore =
        Math.max(
            currentPaid -
            amount,
            0
        );


    const outstandingBefore =
        Math.max(
            totalPayable -
            paidBefore,
            0
        );


    const loanStatus =
        loan?.status ||
        "Active";


    pageContent.innerHTML = `

        <!-- ==========================================
             RECEIPT
        =========================================== -->

        <section class="receipt">


            <!-- RECEIPT HEADER -->

            <div class="receipt-header">

                <div>

                    <div class="company-name">
                        SR Auto Finance
                    </div>

                    <div class="company-subtitle">
                        Finance Management ERP
                    </div>

                </div>


                <div class="receipt-title">

                    <h2>
                        PAYMENT RECEIPT
                    </h2>

                    <p>
                        ${escapeHTML(
                            receiptNo
                        )}
                    </p>

                </div>

            </div>



            <!-- RECEIPT BODY -->

            <div class="receipt-body">


                <!-- SUCCESS -->

                <div class="success-banner">

                    <div class="success-icon">
                        ✓
                    </div>

                    Payment received successfully

                </div>



                <!-- AMOUNT -->

                <div class="amount-box">

                    <div class="amount-label">
                        Amount Received
                    </div>

                    <div class="amount-value">

                        ${formatCurrency(
                            amount
                        )}

                    </div>

                </div>



                <!-- PAYMENT DETAILS -->

                <section class="section">

                    <div class="section-title">
                        Payment Details
                    </div>


                    <div class="info-grid">


                        <div class="info-item">

                            <div class="info-label">
                                Receipt Number
                            </div>

                            <div class="info-value blue">
                                ${escapeHTML(
                                    receiptNo
                                )}
                            </div>

                        </div>


                        <div class="info-item">

                            <div class="info-label">
                                Payment Date
                            </div>

                            <div class="info-value">
                                ${formatDate(
                                    paymentDate
                                )}
                            </div>

                        </div>


                        <div class="info-item">

                            <div class="info-label">
                                Payment Mode
                            </div>

                            <div class="info-value">
                                ${escapeHTML(
                                    paymentMode
                                )}
                            </div>

                        </div>


                        <div class="info-item">

                            <div class="info-label">
                                Reference Number
                            </div>

                            <div class="info-value">
                                ${escapeHTML(
                                    referenceNumber
                                )}
                            </div>

                        </div>


                    </div>

                </section>



                <!-- CUSTOMER DETAILS -->

                <section class="section">

                    <div class="section-title">
                        Customer Information
                    </div>


                    <div class="info-grid">


                        <div class="info-item">

                            <div class="info-label">
                                Customer ID
                            </div>

                            <div class="info-value">
                                ${escapeHTML(
                                    customerId
                                )}
                            </div>

                        </div>


                        <div class="info-item">

                            <div class="info-label">
                                Customer Name
                            </div>

                            <div class="info-value">
                                ${escapeHTML(
                                    customerName
                                )}
                            </div>

                        </div>


                        <div class="info-item">

                            <div class="info-label">
                                Mobile
                            </div>

                            <div class="info-value">
                                ${escapeHTML(
                                    mobile
                                )}
                            </div>

                        </div>


                        <div class="info-item">

                            <div class="info-label">
                                Loan Account
                            </div>

                            <div class="info-value blue">
                                ${escapeHTML(
                                    loanId
                                )}
                            </div>

                        </div>


                    </div>

                </section>



                <!-- LOAN BALANCE -->

                <section class="section">

                    <div class="section-title">
                        Loan Balance
                    </div>


                    <div class="balance-grid">


                        <div class="balance-card">

                            <div class="balance-label">
                                Loan Amount
                            </div>

                            <div class="balance-value">
                                ${formatCurrency(
                                    loanAmount
                                )}
                            </div>

                        </div>


                        <div class="balance-card">

                            <div class="balance-label">
                                Total Payable
                            </div>

                            <div class="balance-value">
                                ${formatCurrency(
                                    totalPayable
                                )}
                            </div>

                        </div>


                        <div class="balance-card">

                            <div class="balance-label">
                                Paid Before
                            </div>

                            <div class="balance-value green">
                                ${formatCurrency(
                                    paidBefore
                                )}
                            </div>

                        </div>


                        <div class="balance-card">

                            <div class="balance-label">
                                This Payment
                            </div>

                            <div class="balance-value green">
                                ${formatCurrency(
                                    amount
                                )}
                            </div>

                        </div>


                        <div class="balance-card">

                            <div class="balance-label">
                                Outstanding Before
                            </div>

                            <div class="balance-value blue">
                                ${formatCurrency(
                                    outstandingBefore
                                )}
                            </div>

                        </div>


                        <div class="balance-card">

                            <div class="balance-label">
                                Outstanding After
                            </div>

                            <div class="balance-value blue">
                                ${formatCurrency(
                                    currentOutstanding
                                )}
                            </div>

                        </div>


                    </div>

                </section>



                <!-- REMARKS -->

                ${
                    remarks !== "-"
                        ? `

                            <section class="section">

                                <div class="section-title">
                                    Remarks
                                </div>

                                <div class="info-item">

                                    <div class="info-value">
                                        ${escapeHTML(
                                            remarks
                                        )}
                                    </div>

                                </div>

                            </section>

                        `
                        : ""
                }


            </div>



            <!-- FOOTER -->

            <div class="receipt-footer">

                <div class="footer-note">

                    Receipt generated from
                    <strong>
                        SR Auto Finance ERP
                    </strong>

                    <br>

                    Generated:
                    ${formatDateTime(
                        payment.createdAt
                    )}

                </div>


                <button
                    class="print-btn"
                    onclick="window.print()"
                >
                    🖨 Print Receipt
                </button>

            </div>


        </section>

    `;

}


// =====================================================
// LOAD RECEIPT
// =====================================================

async function loadReceipt() {

    if (!collectionId) {

        pageContent.innerHTML = `

            <div class="error">

                ⚠️ Receipt ID is missing.

            </div>

        `;

        return;

    }


    try {

        const payment =
            await getCollection();


        const loan =
            await getLoan(
                payment
            );


        const customer =
            await getCustomer(
                payment,
                loan
            );


        renderReceipt(
            payment,
            loan,
            customer
        );


    } catch (error) {

        console.error(
            "Receipt loading error:",
            error
        );


        pageContent.innerHTML = `

            <div class="error">

                ⚠️
                ${escapeHTML(
                    error.message ||
                    "Unable to load payment receipt."
                )}

                <br><br>

                <button
                    onclick="location.href='collections.html'"
                    style="
                        border:none;
                        background:#2563eb;
                        color:white;
                        padding:10px 15px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                >
                    ← Back to Collections
                </button>

            </div>

        `;

    }

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


        await loadReceipt();

    }
);
