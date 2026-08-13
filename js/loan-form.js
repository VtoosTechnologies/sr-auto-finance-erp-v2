// =====================================================
// SR AUTO FINANCE ERP
// Loan Form Controller
// File: js/loan-form.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
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

const loanForm =
    document.getElementById("loanForm");

const loanType =
    document.getElementById("loanType");

const customerSelect =
    document.getElementById("customerSelect");

const customerInfo =
    document.getElementById("customerInfo");

const selectedCustomerId =
    document.getElementById("selectedCustomerId");

const selectedCustomerMobile =
    document.getElementById("selectedCustomerMobile");

const selectedCustomerStatus =
    document.getElementById("selectedCustomerStatus");


// ReLoan

const reloanSection =
    document.getElementById("reloanSection");

const previousLoanSelect =
    document.getElementById("previousLoanSelect");

const previousLoanInfo =
    document.getElementById("previousLoanInfo");

const previousLoanId =
    document.getElementById("previousLoanId");

const previousLoanAmount =
    document.getElementById("previousLoanAmount");

const previousLoanStatus =
    document.getElementById("previousLoanStatus");

const previousLoanClosedDate =
    document.getElementById("previousLoanClosedDate");

const previousLoanClosingAmount =
    document.getElementById("previousLoanClosingAmount");

const previousLoanCustomer =
    document.getElementById("previousLoanCustomer");


// Vehicle

const vehicleType =
    document.getElementById("vehicleType");

const vehicleBrand =
    document.getElementById("vehicleBrand");

const vehicleModel =
    document.getElementById("vehicleModel");

const vehicleVariant =
    document.getElementById("vehicleVariant");

const vehicleNumber =
    document.getElementById("vehicleNumber");

const chassisNumber =
    document.getElementById("chassisNumber");

const engineNumber =
    document.getElementById("engineNumber");

const manufacturingYear =
    document.getElementById("manufacturingYear");

const registrationDate =
    document.getElementById("registrationDate");

const vehicleColour =
    document.getElementById("vehicleColour");

const showroomName =
    document.getElementById("showroomName");

const showroomBookingId =
    document.getElementById("showroomBookingId");

const bookingRequired =
    document.getElementById("bookingRequired");

const vehicleCost =
    document.getElementById("vehicleCost");

const downPayment =
    document.getElementById("downPayment");


// Loan

const loanAmount =
    document.getElementById("loanAmount");

const interestRate =
    document.getElementById("interestRate");

const interestType =
    document.getElementById("interestType");

const tenure =
    document.getElementById("tenure");

const repaymentFrequency =
    document.getElementById("repaymentFrequency");

const loanDate =
    document.getElementById("loanDate");

const firstDueDate =
    document.getElementById("firstDueDate");

const processingFee =
    document.getElementById("processingFee");


// =====================================================
// DOCUMENTS
// =====================================================

const docAadhaar =
    document.getElementById("docAadhaar");

const docPan =
    document.getElementById("docPan");

const docRc =
    document.getElementById("docRc");

const docInsurance =
    document.getElementById("docInsurance");

const docInvoice =
    document.getElementById("docInvoice");

const docOther =
    document.getElementById("docOther");


// Actions

const saveLoanBtn =
    document.getElementById("saveLoanBtn");

const message =
    document.getElementById("message");


// =====================================================
// DATA
// =====================================================

let currentUser = null;

let customers = [];

let previousLoans = [];

// =====================================================
// EDIT MODE
// =====================================================

let editLoanDocumentId = null;

let editLoanData = null;
// =====================================================
// DEFAULT DATE
// =====================================================

function setDefaultDates() {

    const today =
        new Date();

    const dateString =
        today.toISOString()
            .split("T")[0];

    if (loanDate) {
        loanDate.value =
            dateString;
    }

    if (firstDueDate) {
        firstDueDate.value =
            dateString;
    }

}


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
// NORMALIZE TEXT
// =====================================================

function normalizeText(value) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase();

}


// =====================================================
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

    try {

        customerSelect.innerHTML = `

            <option value="">
                Loading customers...
            </option>

        `;


        const customersRef =
            collection(
                db,
                "customers"
            );


        const snapshot =
            await getDocs(
                customersRef
            );


        customers = [];


        snapshot.forEach(
            customerDoc => {

                const data =
                    customerDoc.data();


                const status =
                    String(
                        data.status ||
                        "Active"
                    ).toLowerCase();


                if (
                    status === "active"
                ) {

                    customers.push({

                        id:
                            customerDoc.id,

                        ...data

                    });

                }

            }
        );


        customers.sort(
            (a, b) => {

                const nameA =
                    String(
                        a.name ||
                        a.customerName ||
                        ""
                    ).toLowerCase();


                const nameB =
                    String(
                        b.name ||
                        b.customerName ||
                        ""
                    ).toLowerCase();


                return nameA.localeCompare(
                    nameB
                );

            }
        );


        customerSelect.innerHTML = `

            <option value="">
                Select Customer
            </option>

        `;


        customers.forEach(
            customer => {

                const customerId =
                    customer.customerId ||
                    customer.customerCode ||
                    customer.id;


                const name =
                    customer.name ||
                    customer.customerName ||
                    "Unknown Customer";


                const mobile =
                    customer.mobile ||
                    customer.phone ||
                    "";


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    customer.id;


                option.textContent =
                    `${customerId} - ${name}${mobile ? " - " + mobile : ""}`;


                customerSelect.appendChild(
                    option
                );

            }
        );


        if (!customers.length) {

            customerSelect.innerHTML = `

                <option value="">
                    No active customers found
                </option>

            `;

        }


    } catch (error) {

        console.error(
            "Customer loading error:",
            error
        );


        customerSelect.innerHTML = `

            <option value="">
                Unable to load customers
            </option>

        `;

    }

}


// =====================================================
// CUSTOMER SELECTION
// =====================================================

async function handleCustomerSelection() {

    const selectedId =
        customerSelect.value;


    if (!selectedId) {

        customerInfo.classList.remove(
            "show"
        );

        if (loanType.value === "reloan") {

            resetPreviousLoanSection();

        }

        return;

    }


    const customer =
        customers.find(
            item =>
                item.id === selectedId
        );


    if (!customer) {
        return;
    }


    const customerId =
        customer.customerId ||
        customer.customerCode ||
        customer.id ||
        "-";


    const mobile =
        customer.mobile ||
        customer.phone ||
        "-";


    const status =
        customer.status ||
        "Active";


    selectedCustomerId.textContent =
        customerId;


    selectedCustomerMobile.textContent =
        mobile;


    selectedCustomerStatus.textContent =
        status;


    customerInfo.classList.add(
        "show"
    );


    if (
        loanType.value === "reloan"
    ) {

        await loadPreviousLoans(
            selectedId
        );

    }

}


// =====================================================
// CUSTOMER EVENT
// =====================================================

customerSelect.addEventListener(
    "change",
    handleCustomerSelection
);


// =====================================================
// LOAN TYPE CHANGE
// =====================================================

loanType.addEventListener(
    "change",
    async function () {

        clearMessage();


        const type =
            loanType.value;


        if (type === "reloan") {

            reloanSection.classList.add(
                "show"
            );


            showroomBookingId.required =
                false;


            bookingRequired.textContent =
                "";


            showroomBookingId.placeholder =
                "Optional for ReLoan";


            if (customerSelect.value) {

                await loadPreviousLoans(
                    customerSelect.value
                );

            } else {

                resetPreviousLoanSection();

            }


        } else {

            reloanSection.classList.remove(
                "show"
            );


            showroomBookingId.required =
                true;


            bookingRequired.textContent =
                "*";


            showroomBookingId.placeholder =
                "Enter showroom booking ID";


            resetPreviousLoanSection();

        }

    }
);


// =====================================================
// RESET PREVIOUS LOAN
// =====================================================

function resetPreviousLoanSection() {

    previousLoans = [];


    previousLoanSelect.innerHTML = `

        <option value="">
            Select previous closed loan
        </option>

    `;


    previousLoanInfo.classList.remove(
        "show"
    );


    previousLoanId.textContent =
        "-";

    previousLoanAmount.textContent =
        "₹0";

    previousLoanStatus.textContent =
        "-";

    previousLoanClosedDate.textContent =
        "-";

    previousLoanClosingAmount.textContent =
        "₹0";

    previousLoanCustomer.textContent =
        "-";

}


// =====================================================
// LOAD PREVIOUS CLOSED LOANS
// =====================================================

async function loadPreviousLoans(
    customerDocumentId
) {

    try {

        resetPreviousLoanSection();


        const loansRef =
            collection(
                db,
                "loans"
            );


        const snapshot =
            await getDocs(
                loansRef
            );


        previousLoans = [];


        snapshot.forEach(
            loanDoc => {

                const loan =
                    loanDoc.data();


                const loanCustomerDocumentId =
                    loan.customerDocumentId ||
                    "";


                const status =
                    String(
                        loan.status ||
                        ""
                    ).toLowerCase();


                const closed =
                    status === "closed" ||
                    status === "completed";


                if (
                    loanCustomerDocumentId ===
                        customerDocumentId &&
                    closed
                ) {

                    previousLoans.push({

                        id:
                            loanDoc.id,

                        ...loan

                    });

                }

            }
        );


        previousLoans.sort(
            (a, b) => {

                const dateA =
                    String(
                        a.loanDate ||
                        ""
                    );

                const dateB =
                    String(
                        b.loanDate ||
                        ""
                    );

                return dateB.localeCompare(
                    dateA
                );

            }
        );


        previousLoans.forEach(
            loan => {

                const id =
                    loan.loanId ||
                    loan.id;


                const amount =
                    Number(
                        loan.loanAmount ||
                        loan.principalAmount ||
                        0
                    );


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    loan.id;


                option.textContent =
                    `${id} - ${formatCurrency(amount)} - Closed`;


                previousLoanSelect.appendChild(
                    option
                );

            }
        );


        if (
            !previousLoans.length
        ) {

            previousLoanSelect.innerHTML = `

                <option value="">
                    No completed previous loan found
                </option>

            `;

        }

    } catch (error) {

        console.error(
            "Previous loan loading error:",
            error
        );


        showMessage(
            "Unable to load previous loan details."
        );

    }

}


// =====================================================
// PREVIOUS LOAN SELECTION
// =====================================================

previousLoanSelect.addEventListener(
    "change",
    function () {

        const selectedId =
            this.value;


        if (!selectedId) {

            previousLoanInfo.classList.remove(
                "show"
            );

            return;

        }


        const loan =
            previousLoans.find(
                item =>
                    item.id === selectedId
            );


        if (!loan) {
            return;
        }


        const loanId =
            loan.loanId ||
            loan.id ||
            "-";


        const amount =
            Number(
                loan.loanAmount ||
                loan.principalAmount ||
                0
            );


        const status =
            loan.status ||
            "-";


        const closedDate =
            loan.closedDate ||
            loan.closingDate ||
            loan.updatedAt ||
            "-";


        const closingAmount =
            Number(
                loan.agreedClosingAmount ||
                loan.closingAmount ||
                0
            );


        const customerName =
            loan.customerName ||
            "-";


        previousLoanId.textContent =
            loanId;


        previousLoanAmount.textContent =
            formatCurrency(
                amount
            );


        previousLoanStatus.textContent =
            status;


        previousLoanClosedDate.textContent =
            typeof closedDate === "string"
                ? closedDate
                : "-";


        previousLoanClosingAmount.textContent =
            formatCurrency(
                closingAmount
            );


        previousLoanCustomer.textContent =
            customerName;


        previousLoanInfo.classList.add(
            "show"
        );

    }
);


// =====================================================
// CALCULATION
// =====================================================

function calculateLoan() {

    const principal =
        Number(
            loanAmount.value
        ) || 0;


    // =================================================
    // ANNUAL INTEREST RATE
    // =================================================

    const annualRate =
        Number(
            interestRate.value
        ) || 0;


    const periods =
        Number(
            tenure.value
        ) || 0;


    const fee =
        Number(
            processingFee.value
        ) || 0;


    let interest = 0;

    let totalPayable = 0;

    let installment = 0;


    // =================================================
    // FLAT INTEREST
    // Annual Rate Based
    // =================================================

    if (
        interestType.value ===
        "Flat"
    ) {

        /*
         * Example:
         *
         * Principal = ₹1,00,000
         * Annual Rate = 24%
         * Tenure = 24 months
         *
         * Interest =
         *
         * 1,00,000
         * × 24/100
         * × 24/12
         *
         * = ₹48,000
         */

        interest =
            principal *
            (annualRate / 100) *
            (periods / 12);


        totalPayable =
            principal +
            interest;


        installment =
            periods > 0
                ? totalPayable / periods
                : 0;

    }


    // =================================================
    // REDUCING BALANCE
    // Annual Rate → Monthly Rate
    // =================================================

    else {

        if (
            principal > 0 &&
            annualRate > 0 &&
            periods > 0
        ) {

            /*
             * Example:
             *
             * Annual Rate = 24%
             *
             * Monthly Rate =
             * 24 / 12
             * = 2%
             *
             * Decimal =
             * 2 / 100
             * = 0.02
             */

            const monthlyRate =
                (
                    annualRate /
                    12
                ) / 100;


            const numerator =
                principal *
                monthlyRate *
                Math.pow(
                    1 +
                    monthlyRate,
                    periods
                );


            const denominator =
                Math.pow(
                    1 +
                    monthlyRate,
                    periods
                ) -
                1;


            installment =
                denominator !== 0
                    ? numerator /
                      denominator
                    : principal /
                      periods;


            totalPayable =
                installment *
                periods;


            interest =
                totalPayable -
                principal;

        }

        else {

            totalPayable =
                principal;


            interest =
                0;


            installment =
                periods > 0
                    ? principal /
                      periods
                    : 0;

        }

    }


    // =================================================
    // NET DISBURSEMENT
    // =================================================

    const netDisbursement =
        principal -
        fee;


    // =================================================
    // DISPLAY CALCULATION
    // =================================================

    document.getElementById(
        "calcPrincipal"
    ).textContent =
        formatCurrency(
            principal
        );


    document.getElementById(
        "calcInterest"
    ).textContent =
        formatCurrency(
            interest
        );


    document.getElementById(
        "calcTotal"
    ).textContent =
        formatCurrency(
            totalPayable
        );


    document.getElementById(
        "calcInstallment"
    ).textContent =
        formatCurrency(
            installment
        );


    document.getElementById(
        "calcFee"
    ).textContent =
        formatCurrency(
            fee
        );


    document.getElementById(
        "calcNet"
    ).textContent =
        formatCurrency(
            netDisbursement
        );


    return {

        principal,

        interest,

        totalPayable,

        installment,

        fee,

        netDisbursement

    };

}

// =====================================================
// LIVE CALCULATION EVENTS
// =====================================================

[
    loanAmount,
    interestRate,
    interestType,
    tenure,
    processingFee
].forEach(
    element => {

        element.addEventListener(
            "input",
            calculateLoan
        );


        element.addEventListener(
            "change",
            calculateLoan
        );

    }
);


// =====================================================
// GET LOAN PREFIX
// =====================================================

async function getLoanPrefix() {

    try {

        const companyRef =
            doc(
                db,
                "settings",
                "company"
            );


        const companySnap =
            await getDoc(
                companyRef
            );


        if (
            companySnap.exists()
        ) {

            const data =
                companySnap.data();


            return (

                data.loanPrefix ||

                data.loanCodePrefix ||

                data.prefixes?.loan ||

                data.prefixes?.loanNo ||

                "LN"

            );

        }

    } catch (error) {

        console.error(
            "Loan prefix error:",
            error
        );

    }


    return "LN";

}


// =====================================================
// GENERATE LOAN ID
// =====================================================

async function generateLoanId(
    transaction
) {

    const counterRef =
        doc(
            db,
            "counters",
            "loanNo"
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


    const prefix =
        await getLoanPrefix();


    const number =
        String(
            nextNumber
        ).padStart(
            6,
            "0"
        );


    return `${prefix}${number}`;

}


// =====================================================
// CHECK DUPLICATES
// =====================================================

async function checkVehicleDuplicates() {

    const bookingId =
        normalizeText(
            showroomBookingId.value
        );


    const chassis =
        normalizeText(
            chassisNumber.value
        );


    const engine =
        normalizeText(
            engineNumber.value
        );


    const vehicleNo =
        normalizeText(
            vehicleNumber.value
        );


    if (
        !bookingId &&
        !chassis &&
        !engine &&
        !vehicleNo
    ) {

        return null;

    }


    const snapshot =
        await getDocs(
            collection(
                db,
                "loans"
            )
        );


    for (
        const loanDoc of snapshot.docs
    ) {

        const loan =
            loanDoc.data();


        const status =
            String(
                loan.status ||
                ""
            ).toLowerCase();


        const closed =
            status === "closed" ||
            status === "completed" ||
            status === "cancelled" ||
            status === "canceled";


        if (closed) {
            continue;
        }


        const existingBooking =
            normalizeText(
                loan.showroomBookingId
            );


        const existingChassis =
            normalizeText(
                loan.chassisNumber
            );


        const existingEngine =
            normalizeText(
                loan.engineNumber
            );


        const existingVehicleNo =
            normalizeText(
                loan.vehicleNumber
            );


        if (
            bookingId &&
            existingBooking &&
            bookingId === existingBooking
        ) {

            return (
                "This Showroom Booking ID is already linked to an active loan."
            );

        }


        if (
            chassis &&
            existingChassis &&
            chassis === existingChassis
        ) {

            return (
                "This Chassis Number is already linked to an active loan."
            );

        }


        if (
            engine &&
            existingEngine &&
            engine === existingEngine
        ) {

            return (
                "This Engine Number is already linked to an active loan."
            );

        }


        if (
            vehicleNo &&
            existingVehicleNo &&
            vehicleNo === existingVehicleNo
        ) {

            return (
                "This Vehicle Number is already linked to an active loan."
            );

        }

    }


    return null;

}


// =====================================================
// VALIDATE FORM
// =====================================================

function validateLoanForm() {

    const type =
        loanType.value;


    if (!customerSelect.value) {

        return "Please select a customer.";

    }


    if (!vehicleType.value) {

        return "Please select vehicle type.";

    }


    if (!vehicleBrand.value.trim()) {

        return "Please enter vehicle brand.";

    }


    if (!vehicleModel.value.trim()) {

        return "Please enter vehicle model.";

    }


    if (!chassisNumber.value.trim()) {

        return "Please enter chassis number.";

    }


    if (!engineNumber.value.trim()) {

        return "Please enter engine number.";

    }


    if (!showroomName.value.trim()) {

        return "Please enter showroom name.";

    }


    if (
        type === "new" &&
        !showroomBookingId.value.trim()
    ) {

        return "Showroom Booking ID is required for New Loan.";

    }


    if (
        type === "reloan"
    ) {

        if (
            !previousLoanSelect.value
        ) {

            return (
                "Please select the previous completed loan for ReLoan."
            );

        }


        const previousLoan =
            previousLoans.find(
                item =>
                    item.id ===
                    previousLoanSelect.value
            );


        if (!previousLoan) {

            return (
                "Previous loan details could not be found."
            );

        }


        const status =
            String(
                previousLoan.status ||
                ""
            ).toLowerCase();


        if (
            status !== "closed" &&
            status !== "completed"
        ) {

            return (
                "ReLoan is allowed only after the previous loan is closed."
            );

        }

    }


    const principal =
        Number(
            loanAmount.value
        ) || 0;


    if (principal <= 0) {

        return "Please enter a valid loan amount.";

    }


    const rate =
        Number(
            interestRate.value
        ) || 0;


    if (rate < 0) {

        return "Interest rate cannot be negative.";

    }


    const periods =
        Number(
            tenure.value
        ) || 0;


    if (periods <= 0) {

        return "Please enter a valid tenure.";

    }


    if (!loanDate.value) {

        return "Please select loan date.";

    }


    return null;

}


// =====================================================
// COLLECT DOCUMENT DETAILS
// =====================================================

function getDocumentDetails() {

    return {

        aadhaar:
            docAadhaar?.value || "pending",

        pan:
            docPan?.value || "pending",

        rcBook:
            docRc?.value || "pending",

        insurance:
            docInsurance?.value || "pending",

        saleInvoice:
            docInvoice?.value || "pending",

        other:
            docOther?.value.trim() || ""

    };

}
// =====================================================
// CREATE DEFAULT LOAN DOCUMENT RECORDS
// =====================================================
// Every newly created loan gets 5 document records.
// These records are stored in TOP-LEVEL `documents`.
// They are linked using `loanDocumentId`.
// Status starts as Pending and can be edited later.
// =====================================================

function createLoanDocumentRecords(
    transaction,
    loanRef,
    generatedLoanId,
    customerId,
    customerName,
    customerMobile
) {

    const details =
        getDocumentDetails();

    const today =
        loanDate.value ||
        new Date()
            .toISOString()
            .split("T")[0];

    const documentDefinitions = [

        {
            documentType: "Aadhaar Card",
            documentName: "Aadhaar Card",
            value: details.aadhaar
        },

        {
            documentType: "PAN Card",
            documentName: "PAN Card",
            value: details.pan
        },

        {
            documentType: "RC Book",
            documentName: "RC Book",
            value: details.rcBook
        },

        {
            documentType: "Insurance",
            documentName: "Insurance",
            value: details.insurance
        },

        {
            documentType: "Sale Invoice",
            documentName: "Sale Invoice",
            value: details.saleInvoice
        }

    ];

    documentDefinitions.forEach(
        definition => {

            const rawStatus =
                String(
                    definition.value ||
                    "pending"
                )
                    .trim()
                    .toLowerCase();

            let status =
                "Pending";

            if (
                rawStatus === "received"
            ) {
                status =
                    "Received";
            }

            else if (
                rawStatus === "issued"
            ) {
                status =
                    "Issued";
            }

            else if (
                rawStatus === "returned"
            ) {
                status =
                    "Returned";
            }

            const documentRef =
                doc(
                    collection(
                        db,
                        "documents"
                    )
                );

            const receivedDate =
                (
                    status === "Received" ||
                    status === "Issued" ||
                    status === "Returned"
                )
                    ? today
                    : "";

            const issuedDate =
                status === "Issued"
                    ? today
                    : "";

            const returnedDate =
                status === "Returned"
                    ? today
                    : "";

            const currentHolder =
                status === "Returned"
                    ? "Customer"
                    : "Office";

            const lastAction =
                status === "Pending"
                    ? "Document Pending"
                    : status === "Received"
                        ? "Document Received"
                        : status === "Issued"
                            ? "Document Issued"
                            : "Document Returned";

            transaction.set(
                documentRef,
                {

                    // ---------------------------------
                    // DOCUMENT
                    // ---------------------------------

                    documentType:
                        definition.documentType,

                    documentName:
                        definition.documentName,

                    // ---------------------------------
                    // LOAN LINK
                    // ---------------------------------

                    loanId:
                        generatedLoanId,

                    loanDocumentId:
                        loanRef.id,

                    // ---------------------------------
                    // CUSTOMER
                    // ---------------------------------

                    customerId:
                        customerId || "",

                    customerName:
                        customerName || "",

                    customerMobile:
                        customerMobile || "",

                    // ---------------------------------
                    // STATUS
                    // ---------------------------------

                    status:
                        status,

                    currentHolder:
                        currentHolder,

                    // ---------------------------------
                    // STAFF
                    // ---------------------------------

                    staffId:
                        "",

                    staffCode:
                        "",

                    staffName:
                        "",

                    // ---------------------------------
                    // DATES
                    // ---------------------------------

                    receivedDate:
                        receivedDate,

                    issuedDate:
                        issuedDate,

                    returnedDate:
                        returnedDate,

                    // ---------------------------------
                    // REMARKS
                    // ---------------------------------

                    remarks:
                        "",

                    // ---------------------------------
                    // LAST ACTION
                    // ---------------------------------

                    lastAction:
                        lastAction,

                    lastActionDate:
                        today,

                    // ---------------------------------
                    // HISTORY
                    // ---------------------------------

                    history: [

                        {

                            action:
                                lastAction,

                            status:
                                status,

                            currentHolder:
                                currentHolder,

                            staffId:
                                "",

                            staffName:
                                "",

                            date:
                                today,

                            remarks:
                                ""

                        }

                    ],

                    // ---------------------------------
                    // META
                    // ---------------------------------

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    createdBy:
                        currentUser.uid

                }
            );

        }
    );

}

// =====================================================
// BUSINESS FUND HELPERS
// =====================================================
//
// Available Fund = Owner Investment
//              - Loan Net Disbursement
//              + Customer Collections
//
// Owner investments: ownerInvestments
// Loan disbursement: loans.netDisbursement
// Collections: collections
// =====================================================

function numberValue(...values) {

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


        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }


    return 0;

}


function isExcludedInvestmentStatus(
    status
) {

    return [

        "cancelled",
        "canceled",
        "reversed",
        "deleted",
        "inactive"

    ].includes(

        String(
            status || ""
        )
            .trim()
            .toLowerCase()

    );

}


function getCollectionAmount(
    record
) {

    return numberValue(

        record?.totalCollection,
        record?.paidAmount,
        record?.collectionAmount,
        record?.amount,
        record?.paymentAmount

    );

}


function getLoanDisbursementAmount(
    loan
) {

    return numberValue(

        loan?.netDisbursement,
        loan?.disbursedAmount

    );

}


async function getBusinessFundSnapshot() {

    const ownerInvestmentsQuery =
        collection(
            db,
            "ownerInvestments"
        );


    const loansQuery =
        collection(
            db,
            "loans"
        );


    const collectionsQuery =
        collection(
            db,
            "collections"
        );


    const [
        investmentsSnapshot,
        loansSnapshot,
        collectionsSnapshot
    ] = await Promise.all([

        getDocs(
            ownerInvestmentsQuery
        ),

        getDocs(
            loansQuery
        ),

        getDocs(
            collectionsQuery
        )

    ]);


    let totalInvested = 0;

    let totalDisbursed = 0;

    let totalCollected = 0;


    investmentsSnapshot.forEach(
        investmentDoc => {

            const investment =
                investmentDoc.data();


            const status =
                String(
                    investment.status ||
                    "active"
                )
                    .trim()
                    .toLowerCase();


            if (
                isExcludedInvestmentStatus(
                    status
                )
            ) {

                return;

            }


            totalInvested +=
                numberValue(

                    investment.investmentAmount,
                    investment.amount

                );

        }
    );


    loansSnapshot.forEach(
        loanDoc => {

            const loan =
                loanDoc.data();


            const status =
                String(
                    loan.status ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                [
                    "cancelled",
                    "canceled"
                ].includes(status)
            ) {

                return;

            }


            totalDisbursed +=
                getLoanDisbursementAmount(
                    loan
                );

        }
    );


    collectionsSnapshot.forEach(
        collectionDoc => {

            const record =
                collectionDoc.data();


            const status =
                String(
                    record.status ||
                    "success"
                )
                    .trim()
                    .toLowerCase();


            if (
                [
                    "reversed",
                    "cancelled",
                    "canceled",
                    "failed",
                    "deleted"
                ].includes(status)
            ) {

                return;

            }


            totalCollected +=
                getCollectionAmount(
                    record
                );

        }
    );


    const availableFund =
        Math.max(

            totalInvested -
            totalDisbursed +
            totalCollected,

            0

        );


    return {

        totalInvested,

        totalDisbursed,

        totalCollected,

        availableFund

    };

}
// =====================================================
// LOAD LOAN FOR EDIT
// =====================================================

async function loadLoanForEdit() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const editId =
        params.get("editId");

    if (!editId) {

        return;

    }


    editLoanDocumentId =
        editId;


    try {

        const loanRef =
            doc(
                db,
                "loans",
                editId
            );


        const loanSnap =
            await getDoc(
                loanRef
            );


        if (
            !loanSnap.exists()
        ) {

            showMessage(
                "Loan not found."
            );

            return;

        }


        editLoanData = {

            id:
                loanSnap.id,

            ...loanSnap.data()

        };


        // =================================================
        // LOAN TYPE
        // =================================================

        if (
            loanType &&
            editLoanData.loanType
        ) {

            loanType.value =
                editLoanData.loanType;

        }


        // =================================================
        // CUSTOMER
        // =================================================

        if (
            customerSelect &&
            editLoanData.customerDocumentId
        ) {

            customerSelect.value =
                editLoanData.customerDocumentId;

        }


        // Show customer information
        if (
            customerSelect &&
            customerSelect.value
        ) {

            await handleCustomerSelection();

        }


        // =================================================
        // VEHICLE
        // =================================================

        if (vehicleType) {

            vehicleType.value =
                editLoanData.vehicleType ||
                "";

        }


        if (vehicleBrand) {

            vehicleBrand.value =
                editLoanData.vehicleBrand ||
                "";

        }


        if (vehicleModel) {

            vehicleModel.value =
                editLoanData.vehicleModel ||
                "";

        }


        if (vehicleVariant) {

            vehicleVariant.value =
                editLoanData.vehicleVariant ||
                "";

        }


        if (vehicleNumber) {

            vehicleNumber.value =
                editLoanData.vehicleNumber ||
                "";

        }


        if (chassisNumber) {

            chassisNumber.value =
                editLoanData.chassisNumber ||
                "";

        }


        if (engineNumber) {

            engineNumber.value =
                editLoanData.engineNumber ||
                "";

        }


        if (manufacturingYear) {

            manufacturingYear.value =
                editLoanData.manufacturingYear ||
                "";

        }


        if (registrationDate) {

            registrationDate.value =
                editLoanData.registrationDate ||
                "";

        }


        if (vehicleColour) {

            vehicleColour.value =
                editLoanData.vehicleColour ||
                "";

        }


        if (showroomName) {

            showroomName.value =
                editLoanData.showroomName ||
                "";

        }


        if (showroomBookingId) {

            showroomBookingId.value =
                editLoanData.showroomBookingId ||
                "";

        }


        if (vehicleCost) {

            vehicleCost.value =
                editLoanData.vehicleCost ||
                "";

        }


        if (downPayment) {

            downPayment.value =
                editLoanData.downPayment ||
                "";

        }


        // =================================================
        // LOAN FINANCIAL DETAILS
        // =================================================

        if (loanAmount) {

            loanAmount.value =
                editLoanData.loanAmount ||
                editLoanData.principalAmount ||
                "";

        }


        if (interestRate) {

            interestRate.value =
                editLoanData.interestRate ||
                "";

        }


        if (interestType) {

            interestType.value =
                editLoanData.interestType ||
                "Flat";

        }


        if (tenure) {

            tenure.value =
                editLoanData.tenure ||
                "";

        }


        if (repaymentFrequency) {

            repaymentFrequency.value =
                editLoanData.repaymentFrequency ||
                "Monthly";

        }


        if (processingFee) {

            processingFee.value =
                editLoanData.processingFee ||
                "";

        }


        // =================================================
        // DATES
        // =================================================

        if (loanDate) {

            loanDate.value =
                editLoanData.loanDate ||
                "";

        }


        if (firstDueDate) {

            firstDueDate.value =
                editLoanData.firstDueDate ||
                editLoanData.loanDate ||
                "";

        }


        // =================================================
        // DOCUMENT STATUS VALUES
        // =================================================

        const documents =
            editLoanData.documents ||
            {};


        if (docAadhaar) {

            docAadhaar.value =
                documents.aadhaar ||
                "pending";

        }


        if (docPan) {

            docPan.value =
                documents.pan ||
                "pending";

        }


        if (docRc) {

            docRc.value =
                documents.rcBook ||
                "pending";

        }


        if (docInsurance) {

            docInsurance.value =
                documents.insurance ||
                "pending";

        }


        if (docInvoice) {

            docInvoice.value =
                documents.saleInvoice ||
                "pending";

        }


        if (docOther) {

            docOther.value =
                documents.other ||
                "";

        }


        // =================================================
        // RELOAN
        // =================================================

        if (
            editLoanData.loanType ===
            "reloan"
        ) {

            await loadPreviousLoans(
                editLoanData.customerDocumentId
            );


            if (
                previousLoanSelect &&
                editLoanData.previousLoanDocumentId
            ) {

                previousLoanSelect.value =
                    editLoanData.previousLoanDocumentId;

                previousLoanSelect.dispatchEvent(
                    new Event(
                        "change"
                    )
                );

            }

        }


        // =================================================
        // RECALCULATE
        // =================================================

        calculateLoan();


        // =================================================
        // CHANGE BUTTON
        // =================================================

        if (saveLoanBtn) {

            saveLoanBtn.textContent =
                "Update Loan";

        }


        // =================================================
        // CHANGE PAGE TITLE
        // =================================================

        const heading =
            document.querySelector(
                "h1"
            );


        if (heading) {

            heading.textContent =
                "Edit Loan";

        }


        console.log(
            "Edit Loan loaded:",
            editLoanData
        );


    } catch (error) {

        console.error(
            "Edit loan loading error:",
            error
        );


        showMessage(
            "Unable to load existing loan details."
        );

    }

}

// =====================================================
// SAVE LOAN
// =====================================================

async function saveLoan() {

    clearMessage();


    const validationError =
        validateLoanForm();


    if (validationError) {

        showMessage(
            validationError
        );

        return;

    }


    const selectedId =
        customerSelect.value;


    const customer =
        customers.find(
            item =>
                item.id === selectedId
        );


    if (!customer) {

        showMessage(
            "Please select a valid customer."
        );

        return;

    }


    saveLoanBtn.disabled =
        true;

    saveLoanBtn.textContent =
        "Checking...";


    try {

        const duplicateMessage =
            await checkVehicleDuplicates();


        if (duplicateMessage) {

            showMessage(
                duplicateMessage
            );

            return;

        }


        const rate =
            Number(
                interestRate.value
            ) || 0;


        const periods =
            Number(
                tenure.value
            ) || 0;


        const calculation =
            calculateLoan();


        const type =
            loanType.value;


        const previousLoan =
            type === "reloan"
                ? previousLoans.find(
                    item =>
                        item.id ===
                        previousLoanSelect.value
                )
                : null;


        saveLoanBtn.textContent =
            "Creating Loan...";


        // =================================================
        // BUSINESS FUND CHECK
        // =================================================

        const fundSnapshot =
            await getBusinessFundSnapshot();


        const requiredFund =
            Number(
                calculation.netDisbursement
            ) || 0;


        if (
            requiredFund <= 0
        ) {

            showMessage(
                "Net disbursement must be greater than zero."
            );

            return;

        }


        if (
            requiredFund >
            fundSnapshot.availableFund
        ) {

            const shortage =
                requiredFund -
                fundSnapshot.availableFund;


            showMessage(

                `Insufficient Business Fund. Available: ${formatCurrency(
                    fundSnapshot.availableFund
                )} | Required: ${formatCurrency(
                    requiredFund
                )} | Shortage: ${formatCurrency(
                    shortage
                )}`

            );

            return;

        }


        const loanRef =
            doc(
                collection(
                    db,
                    "loans"
                )
            );


        const loanId =
            await runTransaction(

                db,

                async (
                    transaction
                ) => {

                    const generatedLoanId =
                        await generateLoanId(
                            transaction
                        );


                    const customerId =
                        customer.customerId ||
                        customer.customerCode ||
                        customer.id;


                    const customerName =
                        customer.name ||
                        customer.customerName ||
                        "";


                    const customerMobile =
                        customer.mobile ||
                        customer.phone ||
                        "";


                    transaction.set(

                        loanRef,

                        {

                            // ---------------------------------
                            // LOAN IDENTIFICATION
                            // ---------------------------------

                            loanId:
                                generatedLoanId,

                            loanType:
                                type,


                            // ---------------------------------
                            // CUSTOMER
                            // ---------------------------------

                            customerId:
                                customerId,

                            customerDocumentId:
                                customer.id,

                            customerName:
                                customerName,

                            customerMobile:
                                customerMobile,


                            // ---------------------------------
                            // RELOAN LINK
                            // ---------------------------------

                            previousLoanId:
                                previousLoan
                                    ? (
                                        previousLoan.loanId ||
                                        previousLoan.id
                                    )
                                    : null,

                            previousLoanDocumentId:
                                previousLoan
                                    ? previousLoan.id
                                    : null,


                            // ---------------------------------
                            // DOCUMENTS
                            // ---------------------------------

                            documents:
                                getDocumentDetails(),


                            // ---------------------------------
                            // VEHICLE
                            // ---------------------------------

                            vehicleType:
                                vehicleType.value,

                            vehicleBrand:
                                vehicleBrand.value.trim(),

                            vehicleModel:
                                vehicleModel.value.trim(),

                            vehicleVariant:
                                vehicleVariant.value.trim(),

                            vehicleNumber:
                                normalizeText(
                                    vehicleNumber.value
                                ),

                            chassisNumber:
                                normalizeText(
                                    chassisNumber.value
                                ),

                            engineNumber:
                                normalizeText(
                                    engineNumber.value
                                ),

                            manufacturingYear:
                                manufacturingYear.value
                                    ? Number(
                                        manufacturingYear.value
                                    )
                                    : null,

                            registrationDate:
                                registrationDate.value ||
                                null,

                            vehicleColour:
                                vehicleColour.value.trim(),

                            showroomName:
                                showroomName.value.trim(),

                            showroomBookingId:
                                normalizeText(
                                    showroomBookingId.value
                                ) || null,

                            vehicleCost:
                                Number(
                                    vehicleCost.value
                                ) || 0,

                            downPayment:
                                Number(
                                    downPayment.value
                                ) || 0,


                            // ---------------------------------
                            // LOAN
                            // ---------------------------------

                            loanAmount:
                                calculation.principal,

                            principalAmount:
                                calculation.principal,

                            interestRate:
                                rate,

                            interestType:
                                interestType.value,

                            interestAmount:
                                calculation.interest,

                            totalPayable:
                                calculation.totalPayable,

                            installmentAmount:
                                calculation.installment,

                            tenure:
                                periods,

                            repaymentFrequency:
                                repaymentFrequency.value,

                            processingFee:
                                calculation.fee,

                            netDisbursement:
                                calculation.netDisbursement,


                            // ---------------------------------
                            // BUSINESS FUND CONTROL
                            // ---------------------------------

                            fundSource:
                                "BUSINESS_FUND",

                            fundTransactionType:
                                "LOAN_DISBURSEMENT",

                            fundAmount:
                                calculation.netDisbursement,

                            fundBalanceBefore:
                                fundSnapshot.availableFund,

                            fundBalanceAfter:
                                fundSnapshot.availableFund -
                                calculation.netDisbursement,


                            // ---------------------------------
                            // PAYMENT STATUS
                            // ---------------------------------

                            amountPaid:
                                0,

                            balanceAmount:
                                calculation.totalPayable,

                            outstandingAmount:
                                calculation.totalPayable,


                            // ---------------------------------
                            // DATES
                            // ---------------------------------

                            loanDate:
                                loanDate.value,

                            firstDueDate:
                                firstDueDate.value ||
                                loanDate.value,


                            // ---------------------------------
                            // STATUS
                            // ---------------------------------

                            status:
                                "Active",

                            active:
                                true,


                            // ---------------------------------
                            // META
                            // ---------------------------------

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp(),

                            createdBy:
                                currentUser.uid

                        }

                    );


                    // =================================================
                    // BUSINESS FUND LEDGER ENTRY
                    // =================================================

                    const fundTransactionRef =
                        doc(
                            collection(
                                db,
                                "fundTransactions"
                            )
                        );


                    transaction.set(

                        fundTransactionRef,

                        {

                            transactionType:
                                "LOAN_DISBURSEMENT",

                            type:
                                "DEBIT",

                            direction:
                                "DEBIT",

                            source:
                                "loan",

                            sourceType:
                                type,

                            loanId:
                                generatedLoanId,

                            loanDocumentId:
                                loanRef.id,

                            customerId:
                                customerId,

                            customerName:
                                customerName,

                            amount:
                                calculation.netDisbursement,

                            principalAmount:
                                calculation.principal,

                            processingFee:
                                calculation.fee,

                            transactionDate:
                                loanDate.value,

                            status:
                                "posted",

                            referenceNumber:
                                generatedLoanId,

                            remarks:
                                `${type === "reloan"
                                    ? "ReLoan"
                                    : "New Loan"} disbursement`,

                            createdByUid:
                                currentUser.uid,

                            createdByEmail:
                                currentUser.email ||
                                "",

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp()

                        }

                    );

// =================================================
// CREATE DEFAULT DOCUMENT REGISTER
// =================================================
// Create 5 document records together with the loan.
// Because this is inside the same Firestore
// transaction, loan + documents are saved together.
// =================================================

createLoanDocumentRecords(

    transaction,

    loanRef,

    generatedLoanId,

    customerId,

    customerName,

    customerMobile

);
                    
                    return generatedLoanId;

                }

            );


        showMessage(

            `${type === "reloan"
                ? "ReLoan"
                : "Loan"} ${loanId} created successfully.`,

            "success"

        );


        loanForm.reset();


        // =================================================
        // RESET DOCUMENT FIELDS
        // =================================================

        if (docAadhaar) {

            docAadhaar.value =
                "pending";

        }


        if (docPan) {

            docPan.value =
                "pending";

        }


        if (docRc) {

            docRc.value =
                "pending";

        }


        if (docInsurance) {

            docInsurance.value =
                "pending";

        }


        if (docInvoice) {

            docInvoice.value =
                "pending";

        }


        if (docOther) {

            docOther.value =
                "";

        }


        customerInfo.classList.remove(
            "show"
        );


        reloanSection.classList.remove(
            "show"
        );


        resetPreviousLoanSection();


        showroomBookingId.required =
            true;


        bookingRequired.textContent =
            "*";


        showroomBookingId.placeholder =
            "Enter showroom booking ID";


        calculateLoan();


        setTimeout(

            function () {

                window.location.href =
                    "loans.html";

            },

            1200

        );


    } catch (error) {

        console.error(
            "Loan save error:",
            error
        );


        showMessage(

            error?.message ||
            "Unable to create loan. Please try again."

        );

    } finally {

        saveLoanBtn.disabled =
            false;

        saveLoanBtn.textContent =
            "Create Loan";

    }

}


// =====================================================
// FORM SUBMIT
// =====================================================

loanForm.addEventListener(

    "submit",

    async function(event) {

        event.preventDefault();


        if (!currentUser) {

            showMessage(
                "Session expired. Please login again."
            );

            return;

        }


        await saveLoan();

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


        setDefaultDates();


        calculateLoan();


        await loadCustomers();
        await loadLoanForEdit();

    }

);
