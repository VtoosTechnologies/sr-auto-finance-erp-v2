// =====================================================
// SR AUTO FINANCE ERP
// Collection Form Controller
// File: js/collection-form.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const collectionForm =
    document.getElementById("collectionForm");

const loanSelect =
    document.getElementById("loanSelect");

const loanInfo =
    document.getElementById("loanInfo");

const selectedLoanId =
    document.getElementById("selectedLoanId");

const selectedCustomerName =
    document.getElementById("selectedCustomerName");

const selectedCustomerMobile =
    document.getElementById("selectedCustomerMobile");

const selectedFrequency =
    document.getElementById("selectedFrequency");

const paymentAmount =
    document.getElementById("paymentAmount");

const paymentDate =
    document.getElementById("paymentDate");

const paymentMode =
    document.getElementById("paymentMode");

const referenceNumber =
    document.getElementById("referenceNumber");

const remarks =
    document.getElementById("remarks");

const totalPayableElement =
    document.getElementById("totalPayable");

const alreadyPaidElement =
    document.getElementById("alreadyPaid");

const currentOutstandingElement =
    document.getElementById("currentOutstanding");

const thisPaymentElement =
    document.getElementById("thisPayment");

const balanceAfterElement =
    document.getElementById("balanceAfter");

const loanStatusElement =
    document.getElementById("loanStatus");

const saveCollectionBtn =
    document.getElementById("saveCollectionBtn");

const message =
    document.getElementById("message");


// =====================================================
// DATA
// =====================================================

let currentUser = null;

let loans = [];

let selectedLoan = null;


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
// SHOW MESSAGE
// =====================================================

function showMessage(
    text,
    type = "error"
) {

    message.textContent =
        text;

    message.className =
        `message ${type}`;

}


// =====================================================
// CLEAR MESSAGE
// =====================================================

function clearMessage() {

    message.textContent =
        "";

    message.className =
        "message";

}


// =====================================================
// TODAY DATE
// =====================================================

function setDefaultDate() {

    const today =
        new Date();

    const dateString =
        today.toISOString()
            .split("T")[0];

    paymentDate.value =
        dateString;

}


// =====================================================
// GET LOAN AMOUNT
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
// GET PAID AMOUNT
// =====================================================

function getPaidAmount(loan) {

    return Number(

        loan.amountPaid ??
        loan.paidAmount ??
        0

    );

}


// =====================================================
// GET OUTSTANDING
// =====================================================

function getOutstanding(loan) {

    // 1. Current outstanding
    if (
        loan.outstandingAmount !== undefined &&
        loan.outstandingAmount !== null &&
        loan.outstandingAmount !== ""
    ) {

        return Math.max(
            Number(
                loan.outstandingAmount
            ) || 0,
            0
        );

    }


    // 2. Current balance
    if (
        loan.balanceAmount !== undefined &&
        loan.balanceAmount !== null &&
        loan.balanceAmount !== ""
    ) {

        return Math.max(
            Number(
                loan.balanceAmount
            ) || 0,
            0
        );

    }


    // 3. Fallback calculation
    return Math.max(
        getLoanAmount(loan) -
        getPaidAmount(loan),
        0
    );

}

// =====================================================
// LOAD ACTIVE LOANS
// =====================================================

async function loadLoans() {

    try {

        loanSelect.innerHTML = `

            <option value="">
                Loading active loans...
            </option>

        `;


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

                const data =
                    loanDoc.data();


                const status =
                    String(
                        data.status ||
                        "Active"
                    ).toLowerCase();


                const outstanding =
                    getOutstanding(
                        data
                    );


                // Only active loans
                // with balance

                if (

                    (
                        status === "active" ||
                        status === "running" ||
                        status === "open"
                    )

                    &&

                    outstanding > 0

                ) {

                    loans.push({

                        id:
                            loanDoc.id,

                        ...data

                    });

                }

            }
        );


        // Sort by customer name

        loans.sort(
            (a, b) => {

                const nameA =
                    String(
                        a.customerName ||
                        ""
                    ).toLowerCase();


                const nameB =
                    String(
                        b.customerName ||
                        ""
                    ).toLowerCase();


                return nameA.localeCompare(
                    nameB
                );

            }
        );


        loanSelect.innerHTML = `

            <option value="">
                Select Loan Account
            </option>

        `;


        loans.forEach(
            loan => {

                const loanId =
                    loan.loanId ||
                    loan.loanNumber ||
                    loan.id;


                const customerName =
                    loan.customerName ||
                    "Unknown Customer";


                const outstanding =
                    getOutstanding(
                        loan
                    );


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    loan.id;


                option.textContent =
                    `${loanId} - ${customerName} - Outstanding ${formatCurrency(outstanding)}`;


                loanSelect.appendChild(
                    option
                );

            }
        );


        if (!loans.length) {

            loanSelect.innerHTML = `

                <option value="">
                    No active loans with outstanding balance
                </option>

            `;

        }


        // URL loanId support

        const urlParams =
            new URLSearchParams(
                window.location.search
            );


        const urlLoanId =
            urlParams.get(
                "loanId"
            );


        if (urlLoanId) {

            const matchingLoan =
                loans.find(
                    loan => (

                        loan.loanId ===
                        urlLoanId

                        ||

                        loan.loanNumber ===
                        urlLoanId

                        ||

                        loan.id ===
                        urlLoanId

                    )
                );


            if (matchingLoan) {

                loanSelect.value =
                    matchingLoan.id;


                displaySelectedLoan(
                    matchingLoan
                );

            }

        }


    } catch (error) {

        console.error(
            "Loan loading error:",
            error
        );


        loanSelect.innerHTML = `

            <option value="">
                Unable to load loans
            </option>

        `;

    }

}


// =====================================================
// DISPLAY SELECTED LOAN
// =====================================================

function displaySelectedLoan(
    loan
) {

    selectedLoan =
        loan;


    const loanId =
        loan.loanId ||
        loan.loanNumber ||
        loan.id ||
        "-";


    const customerName =
        loan.customerName ||
        loan.name ||
        "-";


    const mobile =
        loan.customerMobile ||
        loan.mobile ||
        loan.phone ||
        "-";


    const frequency =
        loan.repaymentFrequency ||
        "-";


    selectedLoanId.textContent =
        loanId;


    selectedCustomerName.textContent =
        customerName;


    selectedCustomerMobile.textContent =
        mobile;


    selectedFrequency.textContent =
        frequency;


    loanInfo.classList.add(
        "show"
    );


    updatePaymentSummary();

}


// =====================================================
// LOAN SELECTION
// =====================================================

loanSelect.addEventListener(
    "change",
    function () {

        clearMessage();


        const selectedId =
            this.value;


        if (!selectedId) {

            selectedLoan =
                null;


            loanInfo.classList.remove(
                "show"
            );


            resetSummary();

            return;

        }


        const loan =
            loans.find(
                item =>
                    item.id ===
                    selectedId
            );


        if (!loan) {

            selectedLoan =
                null;

            return;

        }


        displaySelectedLoan(
            loan
        );

    }
);


// =====================================================
// UPDATE PAYMENT SUMMARY
// =====================================================

function updatePaymentSummary() {

    if (!selectedLoan) {

        resetSummary();

        return;

    }


    const totalPayable =
        getLoanAmount(
            selectedLoan
        );


    const paid =
        getPaidAmount(
            selectedLoan
        );


    const outstanding =
        getOutstanding(
            selectedLoan
        );


    const payment =
        Number(
            paymentAmount.value
        ) || 0;


    const safePayment =
        Math.min(
            Math.max(
                payment,
                0
            ),
            outstanding
        );


    const balanceAfter =
        Math.max(
            outstanding -
            safePayment,
            0
        );


    let status =
        "Active";


    if (
        balanceAfter <= 0 &&
        outstanding > 0
    ) {

        status =
            "Closed";

    }


    totalPayableElement.textContent =
        formatCurrency(
            totalPayable
        );


    alreadyPaidElement.textContent =
        formatCurrency(
            paid
        );


    currentOutstandingElement.textContent =
        formatCurrency(
            outstanding
        );


    thisPaymentElement.textContent =
        formatCurrency(
            safePayment
        );


    balanceAfterElement.textContent =
        formatCurrency(
            balanceAfter
        );


    loanStatusElement.textContent =
        status;

}


// =====================================================
// RESET SUMMARY
// =====================================================

function resetSummary() {

    totalPayableElement.textContent =
        "₹0";


    alreadyPaidElement.textContent =
        "₹0";


    currentOutstandingElement.textContent =
        "₹0";


    thisPaymentElement.textContent =
        "₹0";


    balanceAfterElement.textContent =
        "₹0";


    loanStatusElement.textContent =
        "-";

}


// =====================================================
// PAYMENT INPUT
// =====================================================

paymentAmount.addEventListener(
    "input",
    function () {

        clearMessage();

        updatePaymentSummary();

    }
);


// =====================================================
// PAYMENT MODE
// =====================================================

paymentMode.addEventListener(
    "change",
    function () {

        const mode =
            this.value;


        if (
            mode === "Cash"
        ) {

            referenceNumber.placeholder =
                "Optional reference";

        } else {

            referenceNumber.placeholder =
                "Enter transaction / cheque reference";

        }

    }
);


// =====================================================
// GENERATE RECEIPT NUMBER
// =====================================================

async function generateReceiptNumber(
    transaction
) {

    const counterRef =
        doc(
            db,
            "counters",
            "receiptNo"
        );


    const counterSnap =
        await transaction.get(
            counterRef
        );


    let nextNumber =
        1;


    if (
        counterSnap.exists()
    ) {

        const data =
            counterSnap.data();


        nextNumber =
            Number(

                data.current ??
                data.value ??
                data.number ??
                data.lastNumber ??
                0

            ) + 1;

    }


    transaction.set(
        counterRef,
        {

            current:
                nextNumber,

            updatedAt:
                serverTimestamp()

        },
        {
            merge: true
        }
    );


    const year =
        new Date()
            .getFullYear();


    return `RCPT-${year}-${String(
        nextNumber
    ).padStart(
        6,
        "0"
    )}`;

}


// =====================================================
// SAVE COLLECTION
// =====================================================

async function saveCollection() {

    clearMessage();


    if (!selectedLoan) {

        showMessage(
            "Please select a loan account."
        );

        return;

    }


    const payment =
        Number(
            paymentAmount.value
        ) || 0;


    const outstanding =
        getOutstanding(
            selectedLoan
        );


    if (payment <= 0) {

        showMessage(
            "Please enter a valid collection amount."
        );

        paymentAmount.focus();

        return;

    }


    if (payment > outstanding) {

        showMessage(
            `Collection amount cannot exceed outstanding balance of ${formatCurrency(outstanding)}.`
        );

        paymentAmount.focus();

        return;

    }


    if (!paymentDate.value) {

        showMessage(
            "Please select payment date."
        );

        return;

    }


    if (!paymentMode.value) {

        showMessage(
            "Please select payment mode."
        );

        return;

    }


    saveCollectionBtn.disabled =
        true;

    saveCollectionBtn.textContent =
        "Saving Collection...";


    try {

        const loanRef =
            doc(
                db,
                "loans",
                selectedLoan.id
            );


        const collectionRef =
            doc(
                collection(
                    db,
                    "collections"
                )
            );


        const result =
            await runTransaction(
                db,
                async (
                    transaction
                ) => {

                    // ---------------------------------
                    // READ LATEST LOAN
                    // ---------------------------------

                    const loanSnap =
                        await transaction.get(
                            loanRef
                        );


                    if (
                        !loanSnap.exists()
                    ) {

                        throw new Error(
                            "Loan account no longer exists."
                        );

                    }


                    const loan =
                        loanSnap.data();


                    const currentOutstanding =
                        getOutstanding(
                            loan
                        );


                    if (
                        currentOutstanding <= 0
                    ) {

                        throw new Error(
                            "This loan has no outstanding balance."
                        );

                    }


                    if (
                        payment >
                        currentOutstanding
                    ) {

                        throw new Error(
                            "Collection amount exceeds the latest outstanding balance."
                        );

                    }


                    const currentPaid =
                        getPaidAmount(
                            loan
                        );


                    const newPaid =
                        currentPaid +
                        payment;


                    const newOutstanding =
                        Math.max(
                            currentOutstanding -
                            payment,
                            0
                        );


                    const newStatus =
    "Active";


                    // ---------------------------------
                    // RECEIPT NUMBER
                    // ---------------------------------

                    const receiptNo =
                        await generateReceiptNumber(
                            transaction
                        );


                    // ---------------------------------
                    // COLLECTION DATA
                    // ---------------------------------

                    transaction.set(
                        collectionRef,
                        {

                            receiptNo:
                                receiptNo,

                            loanDocumentId:
                                loanSnap.id,

                            loanId:
                                loan.loanId ||
                                loan.loanNumber ||
                                loanSnap.id,

                            customerId:
                                loan.customerId ||
                                "",

                            customerDocumentId:
                                loan.customerDocumentId ||
                                "",

                            customerName:
                                loan.customerName ||
                                "",

                            customerMobile:
                                loan.customerMobile ||
                                "",

                            amount:
                                payment,

                            paidAmount:
                                payment,
                            balanceAfterPayment:
    newOutstanding,

                            paymentDate:
                                paymentDate.value,

                            paymentMode:
                                paymentMode.value,

                            referenceNumber:
                                referenceNumber.value.trim(),

                            remarks:
                                remarks.value.trim(),

                            status:
                                "Success",

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp(),

                            createdBy:
                                currentUser.uid

                        }
                    );


                    // ---------------------------------
                    // UPDATE LOAN
                    // ---------------------------------

                    transaction.update(
                        loanRef,
                        {

                            amountPaid:
                                newPaid,

                            paidAmount:
                                newPaid,

                            balanceAmount:
                                newOutstanding,

                            outstandingAmount:
                                newOutstanding,

                            status:
                                newStatus,

                            active:
                                newStatus ===
                                "Active",

                            lastPaymentAmount:
                                payment,

                            lastPaymentDate:
                                paymentDate.value,

                            lastReceiptNo:
                                receiptNo,

                            updatedAt:
                                serverTimestamp(),

                            updatedBy:
                                currentUser.uid

                        }
                    );


                    return {

                        receiptNo:
                            receiptNo,

                        loanId:
                            loan.loanId ||
                            loan.loanNumber ||
                            loanSnap.id,

                        newOutstanding:
                            newOutstanding,

                        newStatus:
                            newStatus

                    };

                }
            );


        showMessage(
            `Collection saved successfully. Receipt: ${result.receiptNo}`,
            "success"
        );


        collectionForm.reset();


        loanInfo.classList.remove(
            "show"
        );


        selectedLoan =
            null;


        resetSummary();


        setDefaultDate();


        /*
         * Redirect after successful save
         */

        setTimeout(
            function () {

                window.location.href =
                    `collection-view.html?id=${encodeURIComponent(
                        result.receiptNo
                    )}`;

            },
            1200
        );


    } catch (error) {

        console.error(
            "Collection save error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to save collection. Please try again."
        );


    } finally {

        saveCollectionBtn.disabled =
            false;

        saveCollectionBtn.textContent =
            "Save Collection";

    }

}


// =====================================================
// FORM SUBMIT
// =====================================================

collectionForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        if (!currentUser) {

            showMessage(
                "Session expired. Please login again."
            );

            return;

        }


        await saveCollection();

    }
);


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


        setDefaultDate();

        resetSummary();

        await loadLoans();

    }
);
