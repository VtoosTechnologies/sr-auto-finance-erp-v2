// =====================================================
// SR AUTO FINANCE ERP
// Settings Controller
// File: js/settings.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const settingsForm =
    document.getElementById("companyForm");

const companyNameInput =
    document.getElementById("companyName");

const ownerNameInput =
    document.getElementById("ownerName");

const mobileInput =
    document.getElementById("mobile");

const emailInput =
    document.getElementById("email");

const addressInput =
    document.getElementById("address");

const saveBtn =
    document.getElementById("saveBtn");

const message =
    document.getElementById("message");


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, type = "error") {

    if (!message) {
        return;
    }

    message.textContent = text;

    message.className =
        `message ${type}`;

}


// =====================================================
// LOAD COMPANY SETTINGS
// =====================================================

async function loadSettings() {

    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "company"
            );

        const settingsSnap =
            await getDoc(settingsRef);


        if (!settingsSnap.exists()) {
            return;
        }


        const data =
            settingsSnap.data();


        if (companyNameInput) {
            companyNameInput.value =
                data.companyName || "";
        }


        if (ownerNameInput) {
            ownerNameInput.value =
                data.ownerName || "";
        }


        if (mobileInput) {
            mobileInput.value =
                data.mobile || "";
        }


        if (emailInput) {
            emailInput.value =
                data.email || "";
        }


        if (addressInput) {
            addressInput.value =
                data.address || "";
        }


    } catch (error) {

        console.error(
            "Settings load error:",
            error
        );

        showMessage(
            "Unable to load company information."
        );

    }

}


// =====================================================
// SAVE COMPANY SETTINGS
// =====================================================

if (settingsForm) {

    settingsForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const companyName =
                companyNameInput?.value.trim() || "";

            const ownerName =
                ownerNameInput?.value.trim() || "";

            const mobile =
                mobileInput?.value.trim() || "";

            const email =
                emailInput?.value.trim() || "";

            const address =
                addressInput?.value.trim() || "";


            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

            if (!companyName) {

                showMessage(
                    "Please enter company name."
                );

                return;

            }


            if (!ownerName) {

                showMessage(
                    "Please enter owner name."
                );

                return;

            }


            if (!mobile) {

                showMessage(
                    "Please enter mobile number."
                );

                return;

            }


            // -----------------------------------------
            // BUTTON
            // -----------------------------------------

            if (saveBtn) {

                saveBtn.disabled = true;

                saveBtn.textContent =
                    "Saving...";

            }


            try {

                // -------------------------------------
                // FIRESTORE DOCUMENT
                // -------------------------------------

                const settingsRef =
                    doc(
                        db,
                        "settings",
                        "company"
                    );


                // -------------------------------------
                // SAVE
                // -------------------------------------

                await setDoc(
                    settingsRef,
                    {

                        companyName:
                            companyName,

                        ownerName:
                            ownerName,

                        mobile:
                            mobile,

                        email:
                            email,

                        address:
                            address,

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                // -------------------------------------
                // SUCCESS
                // -------------------------------------

                showMessage(
                    "Company information saved successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Settings save error:",
                    error
                );


                showMessage(
                    "Unable to save settings. Please try again."
                );

            } finally {

                if (saveBtn) {

                    saveBtn.disabled = false;

                    saveBtn.textContent =
                        "Save Company Details";

                }

            }

        }
    );

}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async function (user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        await loadSettings();

    }
);
