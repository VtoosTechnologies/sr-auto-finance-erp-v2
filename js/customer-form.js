// =====================================================
// SR AUTO FINANCE ERP
// Customer Form Controller
// File: js/customer-form.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
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

const customerForm =
    document.getElementById("customerForm");

const saveBtn =
    document.getElementById("saveBtn");

const message =
    document.getElementById("message");


// =====================================================
// CURRENT USER
// =====================================================

let currentUser = null;


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, type = "error") {

    message.textContent = text;

    message.className =
        `message ${type}`;

}


// =====================================================
// CLEAR MESSAGE
// =====================================================

function clearMessage() {

    message.textContent = "";

    message.className =
        "message";

}


// =====================================================
// GET VALUE
// =====================================================

function getValue(id) {

    const element =
        document.getElementById(id);

    return element
        ? element.value.trim()
        : "";

}


// =====================================================
// VALIDATE MOBILE
// =====================================================

function isValidMobile(value) {

    return /^[6-9]\d{9}$/.test(value);

}


// =====================================================
// VALIDATE PINCODE
// =====================================================

function isValidPincode(value) {

    if (!value) {
        return true;
    }

    return /^\d{6}$/.test(value);

}


// =====================================================
// VALIDATE AADHAAR
// =====================================================

function isValidAadhaar(value) {

    if (!value) {
        return true;
    }

    return /^\d{12}$/.test(value);

}


// =====================================================
// VALIDATE PAN
// =====================================================

function isValidPAN(value) {

    if (!value) {
        return true;
    }

    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(
        value.toUpperCase()
    );

}


// =====================================================
// GET CUSTOMER PREFIX
// =====================================================

async function getCustomerPrefix() {

    try {

        const companyRef =
            doc(
                db,
                "settings",
                "company"
            );

        const companySnap =
            await getDoc(companyRef);


        if (companySnap.exists()) {

            const data =
                companySnap.data();


            /*
             * Existing project settings-la
             * customer prefix irundha adha use pannum.
             */

            return (
                data.customerPrefix ||
                data.customerCodePrefix ||
                data.prefixes?.customer ||
                data.prefixes?.customerNo ||
                "CUS"
            );

        }

    } catch (error) {

        console.error(
            "Prefix loading error:",
            error
        );

    }


    return "CUS";
}


// =====================================================
// GENERATE CUSTOMER ID
// =====================================================

async function generateCustomerId(transaction) {

    const counterRef =
        doc(
            db,
            "counters",
            "customerNo"
        );


    const counterSnap =
        await transaction.get(
            counterRef
        );


    let nextNumber = 1;


    if (counterSnap.exists()) {

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


    /*
     * Counter update
     */

    transaction.set(
        counterRef,
        {
            current: nextNumber,
            updatedAt: serverTimestamp()
        },
        {
            merge: true
        }
    );


    const prefix =
        await getCustomerPrefix();


    const customerNumber =
        String(nextNumber)
            .padStart(6, "0");


    return `${prefix}${customerNumber}`;
}


// =====================================================
// SAVE CUSTOMER
// =====================================================

async function saveCustomer() {

    clearMessage();


    // -------------------------------------------------
    // Personal Information
    // -------------------------------------------------

    const customerName =
        getValue("customerName");

    const mobile =
        getValue("mobile");

    const alternateMobile =
        getValue("alternateMobile");

    const dob =
        getValue("dob");

    const gender =
        getValue("gender");

    const occupation =
        getValue("occupation");


    // -------------------------------------------------
    // Address
    // -------------------------------------------------

    const address =
        getValue("address");

    const village =
        getValue("village");

    const taluk =
        getValue("taluk");

    const district =
        getValue("district");

    const pincode =
        getValue("pincode");


    // -------------------------------------------------
    // Identity
    // -------------------------------------------------

    const aadhaar =
        getValue("aadhaar");

    const pan =
        getValue("pan")
            .toUpperCase();


    // -------------------------------------------------
    // Nominee
    // -------------------------------------------------

    const nomineeName =
        getValue("nomineeName");

    const nomineeRelation =
        getValue("nomineeRelation");

    const nomineeMobile =
        getValue("nomineeMobile");


    // =================================================
    // VALIDATION
    // =================================================

    if (!customerName) {

        showMessage(
            "Please enter customer name."
        );

        document
            .getElementById("customerName")
            .focus();

        return;

    }


    if (!isValidMobile(mobile)) {

        showMessage(
            "Please enter a valid 10-digit mobile number."
        );

        document
            .getElementById("mobile")
            .focus();

        return;

    }


    if (
        alternateMobile &&
        !isValidMobile(alternateMobile)
    ) {

        showMessage(
            "Please enter a valid alternate mobile number."
        );

        return;

    }


    if (!address) {

        showMessage(
            "Please enter customer address."
        );

        document
            .getElementById("address")
            .focus();

        return;

    }


    if (!isValidPincode(pincode)) {

        showMessage(
            "Please enter a valid 6-digit pincode."
        );

        return;

    }


    if (!isValidAadhaar(aadhaar)) {

        showMessage(
            "Aadhaar number must contain 12 digits."
        );

        return;

    }


    if (!isValidPAN(pan)) {

        showMessage(
            "Please enter a valid PAN number."
        );

        return;

    }


    if (
        nomineeMobile &&
        !isValidMobile(nomineeMobile)
    ) {

        showMessage(
            "Please enter a valid nominee mobile number."
        );

        return;

    }


    // =================================================
    // BUTTON STATE
    // =================================================

    saveBtn.disabled = true;

    saveBtn.textContent =
        "Saving Customer...";


    try {

        // =================================================
        // REFERENCES
        // =================================================

        const customerRef =
            doc(
                collection(
                    db,
                    "customers"
                )
            );


        const addressRef =
            doc(
                collection(
                    db,
                    "address"
                )
            );


        const nomineeRef =
            doc(
                collection(
                    db,
                    "nominee"
                )
            );


        // =================================================
        // TRANSACTION
        // =================================================

        const customerId =
            await runTransaction(
                db,
                async (transaction) => {

                    /*
                     * Generate customer ID
                     */

                    const generatedId =
                        await generateCustomerId(
                            transaction
                        );


                    // -------------------------------------
                    // Customer
                    // -------------------------------------

                    transaction.set(
                        customerRef,
                        {

                            customerId:
                                generatedId,

                            name:
                                customerName,

                            mobile:
                                mobile,

                            alternateMobile:
                                alternateMobile,

                            dob:
                                dob || null,

                            gender:
                                gender || null,

                            occupation:
                                occupation || null,

                            addressId:
                                addressRef.id,

                            nomineeId:
                                nomineeName
                                    ? nomineeRef.id
                                    : null,

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


                    // -------------------------------------
                    // Address
                    // -------------------------------------

                    transaction.set(
                        addressRef,
                        {

                            customerId:
                                generatedId,

                            address:
                                address,

                            village:
                                village || "",

                            taluk:
                                taluk || "",

                            district:
                                district || "",

                            pincode:
                                pincode || "",

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp()

                        }
                    );


                    // -------------------------------------
                    // Nominee
                    // -------------------------------------

                    if (nomineeName) {

                        transaction.set(
                            nomineeRef,
                            {

                                customerId:
                                    generatedId,

                                name:
                                    nomineeName,

                                relation:
                                    nomineeRelation || "",

                                mobile:
                                    nomineeMobile || "",

                                createdAt:
                                    serverTimestamp(),

                                updatedAt:
                                    serverTimestamp()

                            }
                        );

                    }


                    return generatedId;

                }
            );


        // =================================================
        // SUCCESS
        // =================================================

        showMessage(
            `Customer ${customerId} created successfully.`,
            "success"
        );


        customerForm.reset();


        // -------------------------------------------------
        // Redirect after success
        // -------------------------------------------------

        setTimeout(
            function () {

                window.location.href =
                    "customers.html";

            },
            1200
        );


    } catch (error) {

        console.error(
            "Customer save error:",
            error
        );


        showMessage(
            "Unable to save customer. Please try again."
        );


    } finally {

        saveBtn.disabled = false;

        saveBtn.textContent =
            "Save Customer";

    }

}


// =====================================================
// FORM SUBMIT
// =====================================================

customerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        if (!currentUser) {

            showMessage(
                "Session expired. Please login again."
            );

            return;

        }

        await saveCustomer();

    }
);


// =====================================================
// AUTH CHECK
// =====================================================

onAuthStateChanged(
    auth,
    function (user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        currentUser =
            user;

    }
);
