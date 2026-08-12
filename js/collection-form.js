// =====================================================
// SR AUTO FINANCE ERP
// COLLECTION FORM CONTROLLER
// FINAL STAFF + OWNER COLLECTION FLOW
//
// File:
// js/collection-form.js
//
// STAFF:
// - Can collect payment
// - Cannot create/edit loan
//
// OWNER:
// - Can use collection flow
//
// PAYMENT MASTER:
// collections
//
// IMPORTANT:
// - URL supports ?id=Firestore Loan Document ID
// - Also supports ?loanId=Loan Business ID
// - Full payment automatically closes loan
// =====================================================


import {
    onAuthStateChanged,
    signOut
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
    document.getElementById(
        "collectionForm"
    );

const loanSelect =
    document.getElementById(
        "loanSelect"
    );

const loanInfo =
    document.getElementById(
        "loanInfo"
    );

const selectedLoanId =
    document.getElementById(
        "selectedLoanId"
    );

const selectedCustomerName =
    document.getElementById(
        "selectedCustomerName"
    );

const selectedCustomerMobile =
    document.getElementById(
        "selectedCustomerMobile"
    );

const selectedFrequency =
    document.getElementById(
        "selectedFrequency"
    );

const paymentAmount =
    document.getElementById(
        "paymentAmount"
    );

const paymentDate =
    document.getElementById(
        "paymentDate"
    );

const paymentMode =
    document.getElementById(
        "paymentMode"
    );

const referenceNumber =
    document.getElementById(
        "referenceNumber"
    );

const remarks =
    document.getElementById(
        "remarks"
    );

const totalPayableElement =
    document.getElementById(
        "totalPayable"
    );

const alreadyPaidElement =
    document.getElementById(
        "alreadyPaid"
    );

const currentOutstandingElement =
    document.getElementById(
        "currentOutstanding"
    );

const thisPaymentElement =
    document.getElementById(
        "thisPayment"
    );

const balanceAfterElement =
    document.getElementById(
        "balanceAfter"
    );

const loanStatusElement =
    document.getElementById(
        "loanStatus"
    );

const saveCollectionBtn =
    document.getElementById(
        "saveCollectionBtn"
    );

const message =
    document.getElementById(
        "message"
    );


// =====================================================
// DATA
// =====================================================

let currentUser = null;

let currentRole = "";

let loans = [];

let selectedLoan = null;

let initialized = false;

let saving = false;


// =====================================================
// STAFF SESSION
// =====================================================

function getStaffSession() {

    const raw =
        sessionStorage.getItem(
            "srStaffSession"
        );


    if (!raw) {
        return null;
    }


    try {

        return JSON.parse(
            raw
        );

    } catch (error) {

        console.error(
            "Staff session parse error:",
            error
        );

        return null;
    }
}


// =====================================================
// GET COLLECTION STAFF IDENTITY
// =====================================================

function getCollectionStaffIdentity() {

    const session =
        getStaffSession();

    const user =
        currentUser || {};


    const staffName =
        String(

            session?.staffName ||

            session?.employeeName ||

            session?.displayName ||

            session?.name ||

            user?.displayName ||

            user?.email ||

            "Owner"

        ).trim();


    const staffDocumentId =
        String(

            session?.staffDocumentId ||

            session?.staffDocId ||

            session?.documentId ||

            session?.staffDocID ||

            session?.staffId ||

            session?.id ||

            ""

        ).trim();


    const staffId =
        String(

            session?.staffId ||

            session?.employeeId ||

            session?.staffCode ||

            session?.employeeCode ||

            session?.id ||

            staffDocumentId ||

            user?.uid ||

            ""

        ).trim();


    const collectorUid =
        String(

            user?.uid ||

            session?.uid ||

            session?.userId ||

            ""

        ).trim();


    const collectorEmail =
        String(

            session?.email ||

            user?.email ||

            ""

        ).trim();


    const role =
        String(

            session?.role ||

            currentRole ||

            "owner"

        )
            .trim()
            .toLowerCase();


    return {

        staffId,

        staffDocumentId,

        staffName,

        collectorName:
            staffName,

        collectorStaffId:
            staffId,

        collectorUid,

        collectorEmail,

        collectorRole:
            role

    };

}


// =====================================================
// FORMAT CURRENCY
// =====================================================

function formatCurrency(
    value
) {

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

function escapeHTML(
    value
) {

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
// SHOW MESSAGE
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
// CLEAR MESSAGE
// =====================================================

function clearMessage() {

    if (!message) {
        return;
    }


    message.textContent =
        "";


    message.className =
        "message";

}


// =====================================================
// TODAY DATE
// =====================================================

function setDefaultDate() {

    if (!paymentDate) {
        return;
    }


    const today =
        new Date();


    const dateString =
        today
            .toISOString()
            .split("T")[0];


    paymentDate.value =
        dateString;

}


// =====================================================
// GET LOAN AMOUNT
// =====================================================

function getLoanAmount(
    loan
) {

    if (!loan) {
        return 0;
    }


    return Number(

        loan.totalPayable ??

        loan.totalAmount ??

        (

            Number(
                loan.loanAmount ??
                loan.principalAmount ??
                0
            )

            +

            Number(
                loan.interestAmount ??
                0
            )

        )

    ) || 0;

}


// =====================================================
// GET PAID AMOUNT
// =====================================================

function getPaidAmount(
    loan
) {

    if (!loan) {
        return 0;
    }


    return Number(

        loan.amountPaid ??

        loan.paidAmount ??

        loan.totalPaid ??

        0

    ) || 0;

}


// =====================================================
// GET OUTSTANDING
// =====================================================

function getOutstanding(
    loan
) {

    if (!loan) {
        return 0;
    }


    // -----------------------------------------------------
    // 1. MASTER OUTSTANDING
    // -----------------------------------------------------

    if (
        loan.outstandingAmount !==
            undefined &&
        loan.outstandingAmount !==
            null &&
        loan.outstandingAmount !==
            ""
    ) {

        return Math.max(

            Number(
                loan.outstandingAmount
            ) || 0,

            0

        );

    }


    // -----------------------------------------------------
    // 2. BALANCE AMOUNT
    // -----------------------------------------------------

    if (
        loan.balanceAmount !==
            undefined &&
        loan.balanceAmount !==
            null &&
        loan.balanceAmount !==
            ""
    ) {

        return Math.max(

            Number(
                loan.balanceAmount
            ) || 0,

            0

        );

    }


    // -----------------------------------------------------
    // 3. FALLBACK
    // -----------------------------------------------------

    return Math.max(

        getLoanAmount(
            loan
        ) -

        getPaidAmount(
            loan
        ),

        0

    );

}


// =====================================================
// GET LOAN BUSINESS ID
// =====================================================

function getLoanBusinessId(
    loan
) {

    return String(

        loan?.loanId ||

        loan?.loanNumber ||

        loan?.loanCode ||

        loan?.id ||

        ""

    ).trim();

}


// =====================================================
// GET URL LOAN IDENTIFIER
// =====================================================

function getUrlLoanIdentifier() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    /*
     * FINAL STAFF CUSTOMERS PAGE
     *
     * ?id=Firestore Document ID
     *
     * Also support old:
     *
     * ?loanId=Loan ID
     */

    return {

        documentId:
            String(

                params.get(
                    "id"
                ) ||

                ""

            ).trim(),

        businessId:
            String(

                params.get(
                    "loanId"
                ) ||

                ""

            ).trim()

    };

}


// =====================================================
// LOAD ACTIVE LOANS
// =====================================================

async function loadLoans() {

    try {

        if (loanSelect) {

            loanSelect.innerHTML = `

                <option value="">

                    Loading active loans...

                </option>

            `;

        }


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

                    )
                        .trim()
                        .toLowerCase();


                const outstanding =
                    getOutstanding(
                        data
                    );


                /*
                 * Only active/running/open
                 * loans with outstanding.
                 */

                if (

                    [

                        "active",

                        "running",

                        "open"

                    ].includes(
                        status
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


        // =====================================================
        // SORT CUSTOMER NAME
        // =====================================================

        loans.sort(

            (
                a,
                b
            ) => {

                const nameA =
                    String(

                        a.customerName ||

                        a.name ||

                        ""

                    ).toLowerCase();


                const nameB =
                    String(

                        b.customerName ||

                        b.name ||

                        ""

                    ).toLowerCase();


                return nameA.localeCompare(
                    nameB
                );

            }

        );


        if (!loanSelect) {
            return;
        }


        loanSelect.innerHTML = `

            <option value="">

                Select Loan Account

            </option>

        `;


        loans.forEach(
            loan => {

                const loanId =
                    getLoanBusinessId(
                        loan
                    );


                const customerName =
                    loan.customerName ||

                    loan.name ||

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

                    `${loanId} - ${customerName} - Outstanding ${formatCurrency(
                        outstanding
                    )}`;


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


        // =====================================================
        // URL AUTO SELECT
        // =====================================================

        const url =
            getUrlLoanIdentifier();


        let matchingLoan =
            null;


        // -----------------------------------------------------
        // FIRST PRIORITY:
        // Firestore document ID
        // -----------------------------------------------------

        if (
            url.documentId
        ) {

            matchingLoan =
                loans.find(

                    loan =>

                        loan.id ===
                        url.documentId

                );

        }


        // -----------------------------------------------------
        // SECOND PRIORITY:
        // Business Loan ID
        // -----------------------------------------------------

        if (
            !matchingLoan &&
            url.businessId
        ) {

            matchingLoan =
                loans.find(

                    loan =>

                        getLoanBusinessId(
                            loan
                        ) ===
                        url.businessId

                );

        }


        if (
            matchingLoan
        ) {

            loanSelect.value =
                matchingLoan.id;


            displaySelectedLoan(
                matchingLoan
            );

        }


    } catch (error) {

        console.error(
            "Loan loading error:",
            error
        );


        if (loanSelect) {

            loanSelect.innerHTML = `

                <option value="">

                    Unable to load loans

                </option>

            `;

        }


        showMessage(

            "Unable to load loan accounts. Please refresh and try again."

        );

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
        getLoanBusinessId(
            loan
        ) ||
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

        loan.frequency ||

        "-";


    if (selectedLoanId) {

        selectedLoanId.textContent =
            loanId;

    }


    if (selectedCustomerName) {

        selectedCustomerName.textContent =
            customerName;

    }


    if (selectedCustomerMobile) {

        selectedCustomerMobile.textContent =
            mobile;

    }


    if (selectedFrequency) {

        selectedFrequency.textContent =
            frequency;

    }


    if (loanInfo) {

        loanInfo.classList.add(
            "show"
        );

    }


    updatePaymentSummary();

}


// =====================================================
// LOAN SELECTION
// =====================================================

if (loanSelect) {

    loanSelect.addEventListener(

        "change",

        function () {

            clearMessage();


            const selectedId =
                this.value;


            if (!selectedId) {

                selectedLoan =
                    null;


                if (loanInfo) {

                    loanInfo.classList.remove(
                        "show"
                    );

                }


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

}


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
            paymentAmount?.value
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

        outstanding > 0 &&

        safePayment > 0 &&

        balanceAfter <= 0

    ) {

        status =
            "Closed";

    }


    if (
        outstanding <= 0
    ) {

        status =
            "Closed";

    }


    if (totalPayableElement) {

        totalPayableElement.textContent =
            formatCurrency(
                totalPayable
            );

    }


    if (alreadyPaidElement) {

        alreadyPaidElement.textContent =
            formatCurrency(
                paid
            );

    }


    if (currentOutstandingElement) {

        currentOutstandingElement.textContent =
            formatCurrency(
                outstanding
            );

    }


    if (thisPaymentElement) {

        thisPaymentElement.textContent =
            formatCurrency(
                safePayment
            );

    }


    if (balanceAfterElement) {

        balanceAfterElement.textContent =
            formatCurrency(
                balanceAfter
            );

    }


    if (loanStatusElement) {

        loanStatusElement.textContent =
            status;

    }

}


// =====================================================
// RESET SUMMARY
// =====================================================

function resetSummary() {

    if (totalPayableElement) {

        totalPayableElement.textContent =
            "₹0";

    }


    if (alreadyPaidElement) {

        alreadyPaidElement.textContent =
            "₹0";

    }


    if (currentOutstandingElement) {

        currentOutstandingElement.textContent =
            "₹0";

    }


    if (thisPaymentElement) {

        thisPaymentElement.textContent =
            "₹0";

    }


    if (balanceAfterElement) {

        balanceAfterElement.textContent =
            "₹0";

    }


    if (loanStatusElement) {

        loanStatusElement.textContent =
            "-";

    }

}


// =====================================================
// PAYMENT INPUT
// =====================================================

if (paymentAmount) {

    paymentAmount.addEventListener(

        "input",

        function () {

            clearMessage();

            updatePaymentSummary();

        }

    );

}


// =====================================================
// PAYMENT MODE
// =====================================================

if (paymentMode) {

    paymentMode.addEventListener(

        "change",

        function () {

            const mode =
                this.value;


            if (
                mode ===
                "Cash"
            ) {

                if (referenceNumber) {

                    referenceNumber.placeholder =
                        "Optional reference";

                }

            } else {

                if (referenceNumber) {

                    referenceNumber.placeholder =
                        "Enter transaction / cheque reference";

                }

            }

        }

    );

}


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

            merge:
                true

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

    if (saving) {
        return;
    }


    clearMessage();


    if (!selectedLoan) {

        showMessage(
            "Please select a loan account."
        );

        return;

    }


    const payment =
        Number(
            paymentAmount?.value
        ) || 0;


    if (
        payment <= 0
    ) {

        showMessage(
            "Please enter a valid collection amount."
        );


        paymentAmount?.focus();

        return;

    }


    const outstanding =
        getOutstanding(
            selectedLoan
        );


    if (
        outstanding <= 0
    ) {

        showMessage(
            "This loan has no outstanding balance."
        );

        return;

    }


    if (
        payment >
        outstanding
    ) {

        showMessage(

            `Collection amount cannot exceed outstanding balance of ${formatCurrency(
                outstanding
            )}.`

        );


        paymentAmount?.focus();

        return;

    }


    if (
        !paymentDate?.value
    ) {

        showMessage(
            "Please select payment date."
        );

        return;

    }


    if (
        !paymentMode?.value
    ) {

        showMessage(
            "Please select payment mode."
        );

        return;

    }


    saving =
        true;


    if (saveCollectionBtn) {

        saveCollectionBtn.disabled =
            true;

        saveCollectionBtn.textContent =
            "Saving Collection...";

    }


    try {

        // =====================================================
        // COLLECTION STAFF IDENTITY
        // =====================================================

        const collector =
            getCollectionStaffIdentity();


        console.log(
            "Collection Collector Identity:",
            collector
        );


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

                async transaction => {

                    // =========================================
                    // READ LATEST LOAN
                    // =========================================

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
                        currentOutstanding <=
                        0
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


                    // =========================================
                    // FINAL LOAN STATUS
                    // =========================================

                    const newStatus =

                        newOutstanding <= 0

                            ? "Closed"

                            : "Active";


                    const newActive =
                        newStatus ===
                        "Active";


                    // =========================================
                    // RECEIPT NUMBER
                    // =========================================

                    const receiptNo =
                        await generateReceiptNumber(
                            transaction
                        );


                    // =========================================
                    // COLLECTION DOCUMENT
                    // =========================================

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

                                loan.loanCode ||

                                loanSnap.id,


                            customerId:

                                loan.customerId ||

                                "",


                            customerDocumentId:

                                loan.customerDocumentId ||

                                "",


                            customerName:

                                loan.customerName ||

                                loan.name ||

                                "",


                            customerMobile:

                                loan.customerMobile ||

                                loan.mobile ||

                                loan.phone ||

                                "",


                            amount:
                                payment,


                            paidAmount:
                                payment,


                            balanceBeforePayment:
                                currentOutstanding,


                            balanceAfterPayment:
                                newOutstanding,


                            paymentDate:
                                paymentDate.value,


                            paymentMode:
                                paymentMode.value,


                            referenceNumber:

                                referenceNumber?.value
                                    ?.trim() ||

                                "",


                            remarks:

                                remarks?.value
                                    ?.trim() ||

                                "",


                            status:
                                "Success",


                            createdAt:
                                serverTimestamp(),


                            updatedAt:
                                serverTimestamp(),


                            // =====================================================
                            // STAFF / OWNER COLLECTION IDENTITY
                            // =====================================================

                            staffId:
                                collector.staffId,


                            staffDocumentId:
                                collector.staffDocumentId,


                            staffName:
                                collector.staffName,


                            collectorName:
                                collector.collectorName,


                            collectorStaffId:
                                collector.collectorStaffId,


                            collectorUid:
                                collector.collectorUid,


                            collectorEmail:
                                collector.collectorEmail,


                            collectorRole:
                                collector.collectorRole,


                            createdBy:
                                currentUser.uid,


                            createdByUid:
                                currentUser.uid,


                            createdByRole:
                                currentRole || "staff"

                        }

                    );


                    // =========================================
                    // UPDATE LOAN
                    // =========================================

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
                                newActive,


                            lastPaymentAmount:
                                payment,


                            lastPaymentDate:
                                paymentDate.value,


                            lastReceiptNo:
                                receiptNo,


                            updatedAt:
                                serverTimestamp(),


                            updatedBy:
                                currentUser.uid,


                            updatedByUid:
                                currentUser.uid,


                            updatedByRole:
                                currentRole || "staff",


                            lastCollectorStaffId:
                                collector.staffId,


                            lastCollectorStaffDocumentId:
                                collector.staffDocumentId,


                            lastCollectorName:
                                collector.staffName,


                            lastCollectorUid:
                                collector.collectorUid

                        }

                    );


                    return {

                        receiptNo:
                            receiptNo,


                        loanId:

                            loan.loanId ||

                            loan.loanNumber ||

                            loan.loanCode ||

                            loanSnap.id,


                        newPaid:
                            newPaid,


                        newOutstanding:
                            newOutstanding,


                        newStatus:
                            newStatus

                    };

                }

            );


        // =====================================================
        // SUCCESS
        // =====================================================

        showMessage(

            `Collection saved successfully. Receipt: ${result.receiptNo}`,

            "success"

        );


        // =====================================================
        // CLEAR FORM
        // =====================================================

        if (collectionForm) {

            collectionForm.reset();

        }


        if (loanInfo) {

            loanInfo.classList.remove(
                "show"
            );

        }


        selectedLoan =
            null;


        resetSummary();


        setDefaultDate();


        // =====================================================
        // REDIRECT TO RECEIPT
        // =====================================================

        setTimeout(

            function () {

                window.location.href =

                    `collection-view.html?id=${encodeURIComponent(
                        result.receiptNo
                    )}`;

            },

            1000

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

        saving =
            false;


        if (saveCollectionBtn) {

            saveCollectionBtn.disabled =
                false;

            saveCollectionBtn.textContent =
                "Save Collection";

        }

    }

}


// =====================================================
// FORM SUBMIT
// =====================================================

if (collectionForm) {

    collectionForm.addEventListener(

        "submit",

        async function (event) {

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

}


// =====================================================
// AUTH + ROLE CHECK
// =====================================================

onAuthStateChanged(

    auth,

    async function (user) {

        if (!user) {

            window.location.replace(
                "login.html"
            );

            return;

        }


        currentUser =
            user;


        // =====================================================
        // DETERMINE ROLE
        // =====================================================

        const staffSession =
            getStaffSession();


        if (

            staffSession &&

            String(

                staffSession.role ||

                ""

            ).toLowerCase() ===
            "staff"

        ) {

            currentRole =
                "staff";

        } else {

            /*
             * Owner/admin can continue
             * through existing authenticated flow.
             */

            currentRole =
                String(

                    staffSession?.role ||

                    "owner"

                ).toLowerCase();

        }


        if (initialized) {
            return;
        }


        initialized =
            true;


        setDefaultDate();

        resetSummary();


        await loadLoans();

    }

);
