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

const saveLoanBtn =
    document.getElementById("saveLoanBtn");

const message =
    document.getElementById("message");


// =====================================================
// DATA
// =====================================================

let currentUser = null;

let customers = [];


// =====================================================
// DEFAULT DATE
// =====================================================

function setDefaultDates() {

    const today =
        new Date();

    const dateString =
        today.toISOString()
            .split("T")[0];

    loanDate.value =
        dateString;

    firstDueDate.value =
        dateString;

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


                // Only active customers

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


        // Sort by name

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

customerSelect.addEventListener(
    "change",
    function () {

        const selectedId =
            this.value;


        if (!selectedId) {

            customerInfo.classList.remove(
                "show"
            );

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


    let interest = 0;

    let totalPayable = 0;

    let installment = 0;


    // -----------------------------------------------
    // Flat Interest
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


        if (periods > 0) {

            installment =
                totalPayable /
                periods;

        }

    }


    // -----------------------------------------------
    // Reducing Interest
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
                    ? numerator / denominator
                    : principal / periods;


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
        principal - fee;


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
// SAVE LOAN
// =====================================================

async function saveLoan() {

    clearMessage();


    const selectedId =
        customerSelect.value;


    const customer =
        customers.find(
            item =>
                item.id === selectedId
        );


    if (!customer) {

        showMessage(
            "Please select a customer."
        );

        return;

    }


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


    if (principal <= 0) {

        showMessage(
            "Please enter a valid loan amount."
        );

        loanAmount.focus();

        return;

    }


    if (rate < 0) {

        showMessage(
            "Interest rate cannot be negative."
        );

        return;

    }


    if (periods <= 0) {

        showMessage(
            "Please enter a valid tenure."
        );

        tenure.focus();

        return;

    }


    if (!loanDate.value) {

        showMessage(
            "Please select loan date."
        );

        return;

    }


    const calculation =
        calculateLoan();


    saveLoanBtn.disabled =
        true;

    saveLoanBtn.textContent =
        "Creating Loan...";


    try {

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

                            loanId:
                                generatedLoanId,

                            customerId:
                                customerId,

                            customerDocumentId:
                                customer.id,

                            customerName:
                                customerName,

                            customerMobile:
                                customerMobile,

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

                            amountPaid:
                                0,

                            balanceAmount:
                                calculation.totalPayable,

                            outstandingAmount:
                                calculation.totalPayable,

                            loanDate:
                                loanDate.value,

                            firstDueDate:
                                firstDueDate.value ||
                                loanDate.value,

                            status:
                                "Active",

                            active:
                                true,

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp(),

                            createdBy:
                                currentUser.uid

                        }
                    );


                    return generatedLoanId;

                }
            );


        showMessage(
            `Loan ${loanId} created successfully.`,
            "success"
        );


        loanForm.reset();

        customerInfo.classList.remove(
            "show"
        );


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
