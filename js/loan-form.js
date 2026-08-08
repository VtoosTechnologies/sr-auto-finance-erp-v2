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
    setDoc,
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


// =====================================================
// RELOAN
// =====================================================

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


// =====================================================
// VEHICLE
// =====================================================

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


// =====================================================
// LOAN
// =====================================================

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


// =====================================================
// ACTION
// =====================================================

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
// DEFAULT DATE
// =====================================================

function setDefaultDates() {

    const today =
        new Date();

    const dateString =
        today
            .toISOString()
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
// NORMALIZE
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


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "customers"
                )
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


        if (
            loanType.value ===
            "reloan"
        ) {

            resetPreviousLoanSection();

        }


        return;

    }


    const customer =
        customers.find(
            item =>
                item.id ===
                selectedId
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
        loanType.value ===
        "reloan"
    ) {

        await loadPreviousLoans(
            selectedId
        );

    }

}


customerSelect.addEventListener(
    "change",
    handleCustomerSelection
);


// =====================================================
// LOAN TYPE
// =====================================================

loanType.addEventListener(
    "change",
    async function () {

        clearMessage();


        const type =
            loanType.value;


        if (
            type ===
            "reloan"
        ) {

            reloanSection.classList.add(
                "show"
            );


            showroomBookingId.required =
                false;


            bookingRequired.textContent =
                "";


            showroomBookingId.placeholder =
                "Optional for ReLoan";


            if (
                customerSelect.value
            ) {

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


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
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

                return String(
                    b.loanDate ||
                    ""
                ).localeCompare(
                    String(
                        a.loanDate ||
                        ""
                    )
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
                    item.id ===
                    selectedId
            );


        if (!loan) {
            return;
        }


        previousLoanId.textContent =
            loan.loanId ||
            loan.id ||
            "-";


        previousLoanAmount.textContent =
            formatCurrency(
                loan.loanAmount ||
                loan.principalAmount ||
                0
            );


        previousLoanStatus.textContent =
            loan.status ||
            "-";


        previousLoanClosedDate.textContent =
            loan.closedDate ||
            loan.closingDate ||
            "-";


        previousLoanClosingAmount.textContent =
            formatCurrency(
                loan.agreedClosingAmount ||
                loan.closingAmount ||
                0
            );


        previousLoanCustomer.textContent =
            loan.customerName ||
            "-";


        previousLoanInfo.classList.add(
            "show"
        );

    }
);


// =====================================================
// CALCULATE LOAN
// =====================================================

function calculateLoan() {

    const principal =
        Number(
            loanAmount.value
        ) || 0;


    const rate =
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


    let interest =
        0;


    let totalPayable =
        0;


    let installment =
        0;


    // -----------------------------------------------
    // FLAT
    // -----------------------------------------------

    if (
        interestType.value ===
        "Flat"
    ) {

        interest =
            principal *
            (rate / 100) *
            periods;


        totalPayable =
            principal +
            interest;


        installment =
            periods > 0
                ? totalPayable / periods
                : 0;

    }


    // -----------------------------------------------
    // REDUCING
    // -----------------------------------------------

    else {

        if (
            principal > 0 &&
            rate > 0 &&
            periods > 0
        ) {

            const monthlyRate =
                rate / 100;


            const numerator =
                principal *
                monthlyRate *
                Math.pow(
                    1 + monthlyRate,
                    periods
                );


            const denominator =
                Math.pow(
                    1 + monthlyRate,
                    periods
                ) - 1;


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

        } else {

            totalPayable =
                principal;


            interest =
                0;


            installment =
                periods > 0
                    ? principal / periods
                    : 0;

        }

    }


    const netDisbursement =
        principal -
        fee;


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
// LIVE CALCULATION
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
// LOAN PREFIX
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


    return (
        `${prefix}${String(
            nextNumber
        ).padStart(
            6,
            "0"
        )}`
    );

}


// =====================================================
// VEHICLE DUPLICATE CHECK
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
        const loanDoc of
        snapshot.docs
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
            bookingId ===
            existingBooking
        ) {

            return (
                "This Showroom Booking ID is already linked to an active loan."
            );

        }


        if (
            chassis &&
            existingChassis &&
            chassis ===
            existingChassis
        ) {

            return (
                "This Chassis Number is already linked to an active loan."
            );

        }


        if (
            engine &&
            existingEngine &&
            engine ===
            existingEngine
        ) {

            return (
                "This Engine Number is already linked to an active loan."
            );

        }


        if (
            vehicleNo &&
            existingVehicleNo &&
            vehicleNo ===
            existingVehicleNo
        ) {

            return (
                "This Vehicle Number is already linked to an active loan."
            );

        }

    }


    return null;

}


// =====================================================
// VALIDATE LOAN
// =====================================================

function validateLoanForm() {

    const type =
        loanType.value;


    if (
        !customerSelect.value
    ) {

        return (
            "Please select a customer."
        );

    }


    if (
        !vehicleType.value
    ) {

        return (
            "Please select vehicle type."
        );

    }


    if (
        !vehicleBrand.value.trim()
    ) {

        return (
            "Please enter vehicle brand."
        );

    }


    if (
        !vehicleModel.value.trim()
    ) {

        return (
            "Please enter vehicle model."
        );

    }


    if (
        !chassisNumber.value.trim()
    ) {

        return (
            "Please enter chassis number."
        );

    }


    if (
        !engineNumber.value.trim()
    ) {

        return (
            "Please enter engine number."
        );

    }


    if (
        !showroomName.value.trim()
    ) {

        return (
            "Please enter showroom name."
        );

    }


    if (
        type === "new" &&
        !showroomBookingId.value.trim()
    ) {

        return (
            "Showroom Booking ID is required for New Loan."
        );

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


    if (
        principal <= 0
    ) {

        return (
            "Please enter a valid loan amount."
        );

    }


    const rate =
        Number(
            interestRate.value
        ) || 0;


    if (
        rate < 0
    ) {

        return (
            "Interest rate cannot be negative."
        );

    }


    const periods =
        Number(
            tenure.value
        ) || 0;


    if (
        periods <= 0
    ) {

        return (
            "Please enter a valid tenure."
        );

    }


    if (
        !loanDate.value
    ) {

        return (
            "Please select loan date."
        );

    }


    return null;

}


// =====================================================
// DOCUMENT DEFINITIONS
// =====================================================

function getRequiredDocuments() {

    return [

        {
            key: "aadhaar",
            name: "Aadhaar Card",
            requiredForClosure: true,
            selectedStatus:
                docAadhaar?.value ||
                "pending"
        },

        {
            key: "pan",
            name: "PAN Card",
            requiredForClosure: true,
            selectedStatus:
                docPan?.value ||
                "pending"
        },

        {
            key: "rcBook",
            name: "RC Book",
            requiredForClosure: true,
            selectedStatus:
                docRc?.value ||
                "pending"
        },

        {
            key: "insurance",
            name: "Insurance",
            requiredForClosure: true,
            selectedStatus:
                docInsurance?.value ||
                "pending"
        },

        {
            key: "saleInvoice",
            name: "Sale Invoice",
            requiredForClosure: true,
            selectedStatus:
                docInvoice?.value ||
                "pending"
        }

    ];

}


// =====================================================
// CREATE AUTOMATIC DOCUMENT RECORDS
// =====================================================

async function createLoanDocuments(
    loanRef,
    generatedLoanId,
    customer
) {

    const documentsRef =
        collection(
            db,
            "documents"
        );


    const definitions =
        getRequiredDocuments();


    for (
        const item of
        definitions
    ) {

        const documentRef =
            doc(
                documentsRef
            );


        const status =
            item.selectedStatus ===
            "received"
                ? "Received"
                : "Pending";


        const holder =
            status === "Received"
                ? "Office"
                : "Customer";


        const today =
            loanDate.value ||
            new Date()
                .toISOString()
                .split("T")[0];


        const history = [

            {

                action:
                    status ===
                    "Received"
                        ? "Document Received"
                        : "Document Created",

                status:
                    status,

                currentHolder:
                    holder,

                staffId:
                    "",

                staffName:
                    "",

                date:
                    today,

                remarks:
                    status ===
                    "Received"
                        ? "Received during loan creation."
                        : "Automatically created with loan."

            }

        ];


        await setDoc(
            documentRef,
            {

                // ---------------------------------------
                // DOCUMENT
                // ---------------------------------------

                documentId:
                    documentRef.id,

                documentType:
                    item.name,

                documentKey:
                    item.key,

                requiredForClosure:
                    item.requiredForClosure,

                // ---------------------------------------
                // LOAN LINK
                // ---------------------------------------

                loanDocumentId:
                    loanRef.id,

                loanId:
                    generatedLoanId,

                // ---------------------------------------
                // CUSTOMER LINK
                // ---------------------------------------

                customerDocumentId:
                    customer.id,

                customerId:
                    customer.customerId ||
                    customer.customerCode ||
                    customer.id,

                customerName:
                    customer.name ||
                    customer.customerName ||
                    "",

                // ---------------------------------------
                // STATUS
                // ---------------------------------------

                status:
                    status,

                currentHolder:
                    holder,

                // ---------------------------------------
                // DATES
                // ---------------------------------------

                receivedDate:
                    status === "Received"
                        ? today
                        : null,

                issuedDate:
                    null,

                returnedDate:
                    null,

                // ---------------------------------------
                // STAFF
                // ---------------------------------------

                staffId:
                    "",

                staffCode:
                    "",

                staffName:
                    "",

                // ---------------------------------------
                // HISTORY
                // ---------------------------------------

                history:
                    history,

                lastAction:
                    status === "Received"
                        ? "Document Received"
                        : "Document Created",

                lastActionDate:
                    today,

                // ---------------------------------------
                // META
                // ---------------------------------------

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp(),

                createdBy:
                    currentUser.uid

            }
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
                item.id ===
                selectedId
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

        // ---------------------------------------------
        // DUPLICATE CHECK
        // ---------------------------------------------

        const duplicateMessage =
            await checkVehicleDuplicates();


        if (duplicateMessage) {

            showMessage(
                duplicateMessage
            );

            return;

        }


        // ---------------------------------------------
        // CALCULATION
        // ---------------------------------------------

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


        // ---------------------------------------------
        // CREATE LOAN REFERENCE
        // ---------------------------------------------

        const loanRef =
            doc(
                collection(
                    db,
                    "loans"
                )
            );


        // ---------------------------------------------
        // CREATE LOAN + COUNTER
        // ---------------------------------------------

        const generatedLoanId =
            await runTransaction(
                db,
                async transaction => {

                    const generatedId =
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

                            // =========================
                            // LOAN IDENTIFICATION
                            // =========================

                            loanId:
                                generatedId,

                            loanType:
                                type,

                            // =========================
                            // CUSTOMER
                            // =========================

                            customerId:
                                customerId,

                            customerDocumentId:
                                customer.id,

                            customerName:
                                customerName,

                            customerMobile:
                                customerMobile,

                            // =========================
                            // RELOAN
                            // =========================

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

                            // =========================
                            // VEHICLE
                            // =========================

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

                            // =========================
                            // LOAN
                            // =========================

                            loanAmount:
                                calculation.principal,

                            principalAmount:
                                calculation.principal,

                            interestRate:
                                Number(
                                    interestRate.value
                                ) || 0,

                            interestType:
                                interestType.value,

                            interestAmount:
                                calculation.interest,

                            totalPayable:
                                calculation.totalPayable,

                            installmentAmount:
                                calculation.installment,

                            tenure:
                                Number(
                                    tenure.value
                                ) || 0,

                            repaymentFrequency:
                                repaymentFrequency.value,

                            processingFee:
                                calculation.fee,

                            netDisbursement:
                                calculation.netDisbursement,

                            amountPaid:
                                0,

                            balanceAmount:
                                calculation.totalPayable,

                            outstandingAmount:
                                calculation.totalPayable,

                            // =========================
                            // DATES
                            // =========================

                            loanDate:
                                loanDate.value,

                            firstDueDate:
                                firstDueDate.value ||
                                loanDate.value,

                            // =========================
                            // STATUS
                            // =========================

                            status:
                                "Active",

                            active:
                                true,

                            // =========================
                            // DOCUMENT CONTROL
                            // =========================

                            documentsCreated:
                                true,

                            documentsStatus:
                                "Pending / Received",

                            // =========================
                            // META
                            // =========================

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp(),

                            createdBy:
                                currentUser.uid

                        }
                    );


                    return generatedId;

                }
            );


        // ---------------------------------------------
        // CREATE DOCUMENTS
        // ---------------------------------------------

        await createLoanDocuments(
            loanRef,
            generatedLoanId,
            customer
        );


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        showMessage(
            `${type === "reloan" ? "ReLoan" : "Loan"} ${generatedLoanId} created successfully with document records.`,
            "success"
        );


        loanForm.reset();


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

    }
);
