// =====================================================
// SR AUTO FINANCE ERP
// Customer View Controller
// File: js/customer-view.js
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
// ELEMENTS
// =====================================================

const pageContent =
    document.getElementById("pageContent");


// =====================================================
// CUSTOMER ID FROM URL
// =====================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const customerDocumentId =
    urlParams.get("id");


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
// DATE FORMAT
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

            date = value.toDate();

        } else {

            date = new Date(value);

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
// GET CUSTOMER
// =====================================================

async function getCustomer() {

    const customerRef =
        doc(
            db,
            "customers",
            customerDocumentId
        );


    const customerSnap =
        await getDoc(customerRef);


    if (!customerSnap.exists()) {

        throw new Error(
            "Customer not found."
        );

    }


    return {

        documentId:
            customerSnap.id,

        ...customerSnap.data()

    };

}


// =====================================================
// GET ADDRESS
// =====================================================

async function getAddress(customer) {

    // ---------------------------------------------
    // First try addressId stored in customer
    // ---------------------------------------------

    if (customer.addressId) {

        const addressRef =
            doc(
                db,
                "address",
                customer.addressId
            );


        const addressSnap =
            await getDoc(addressRef);


        if (addressSnap.exists()) {

            return addressSnap.data();

        }

    }


    // ---------------------------------------------
    // Fallback: search by customerId
    // ---------------------------------------------

    const addressQuery =
        query(
            collection(db, "address"),
            where(
                "customerId",
                "==",
                customer.customerId ||
                customer.documentId
            )
        );


    const snapshot =
        await getDocs(addressQuery);


    if (!snapshot.empty) {

        return snapshot.docs[0].data();

    }


    return null;

}


// =====================================================
// GET NOMINEE
// =====================================================

async function getNominee(customer) {

    // ---------------------------------------------
    // First try nomineeId
    // ---------------------------------------------

    if (customer.nomineeId) {

        const nomineeRef =
            doc(
                db,
                "nominee",
                customer.nomineeId
            );


        const nomineeSnap =
            await getDoc(nomineeRef);


        if (nomineeSnap.exists()) {

            return nomineeSnap.data();

        }

    }


    // ---------------------------------------------
    // Fallback: search by customerId
    // ---------------------------------------------

    const nomineeQuery =
        query(
            collection(db, "nominee"),
            where(
                "customerId",
                "==",
                customer.customerId ||
                customer.documentId
            )
        );


    const snapshot =
        await getDocs(nomineeQuery);


    if (!snapshot.empty) {

        return snapshot.docs[0].data();

    }


    return null;

}


// =====================================================
// GET LOAN HISTORY
// =====================================================

async function getLoanHistory(customer) {

    const customerId =
        customer.customerId ||
        customer.documentId;


    try {

        const loanQuery =
            query(
                collection(db, "loans"),
                where(
                    "customerId",
                    "==",
                    customerId
                )
            );


        const snapshot =
            await getDocs(loanQuery);


        return snapshot.docs.map(
            loanDoc => ({
                id: loanDoc.id,
                ...loanDoc.data()
            })
        );


    } catch (error) {

        console.error(
            "Loan history error:",
            error
        );

        return [];

    }

}


// =====================================================
// RENDER CUSTOMER
// =====================================================

function renderCustomer(
    customer,
    address,
    nominee,
    loans
) {

    const customerId =
        customer.customerId ||
        customer.documentId;


    const name =
        customer.name ||
        customer.customerName ||
        "-";


    const mobile =
        customer.mobile ||
        customer.phone ||
        "-";


    const status =
        customer.status ||
        "Active";


    const firstLetter =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "C";


    // =================================================
    // LOAN HISTORY HTML
    // =================================================

    let loanHTML = "";


    if (!loans.length) {

        loanHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    💳
                </div>

                <p>
                    No loan accounts found for this customer.
                </p>

            </div>

        `;

    } else {

        loanHTML = `

            <div style="
                overflow-x:auto;
            ">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    min-width:650px;
                ">

                    <thead>

                        <tr>

                            <th style="
                                text-align:left;
                                padding:10px;
                                background:#f8fafc;
                                font-size:10px;
                                color:#64748b;
                            ">
                                Loan ID
                            </th>

                            <th style="
                                text-align:left;
                                padding:10px;
                                background:#f8fafc;
                                font-size:10px;
                                color:#64748b;
                            ">
                                Amount
                            </th>

                            <th style="
                                text-align:left;
                                padding:10px;
                                background:#f8fafc;
                                font-size:10px;
                                color:#64748b;
                            ">
                                Balance
                            </th>

                            <th style="
                                text-align:left;
                                padding:10px;
                                background:#f8fafc;
                                font-size:10px;
                                color:#64748b;
                            ">
                                Status
                            </th>

                            <th style="
                                text-align:left;
                                padding:10px;
                                background:#f8fafc;
                                font-size:10px;
                                color:#64748b;
                            ">
                                Date
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            loans.map(
                                loan => {

                                    const loanId =
                                        loan.loanId ||
                                        loan.loanNumber ||
                                        loan.id ||
                                        "-";


                                    const amount =
                                        loan.loanAmount ??
                                        loan.amount ??
                                        0;


                                    const balance =
                                        loan.balanceAmount ??
                                        loan.outstandingAmount ??
                                        loan.pendingAmount ??
                                        0;


                                    const loanStatus =
                                        loan.status ||
                                        "Active";


                                    const loanDate =
                                        loan.loanDate ||
                                        loan.startDate ||
                                        loan.createdAt;


                                    return `

                                        <tr>

                                            <td style="
                                                padding:11px 10px;
                                                border-bottom:1px solid #f1f5f9;
                                                font-size:11px;
                                                font-weight:700;
                                                color:#2563eb;
                                            ">
                                                ${escapeHTML(loanId)}
                                            </td>

                                            <td style="
                                                padding:11px 10px;
                                                border-bottom:1px solid #f1f5f9;
                                                font-size:11px;
                                            ">
                                                ${formatCurrency(amount)}
                                            </td>

                                            <td style="
                                                padding:11px 10px;
                                                border-bottom:1px solid #f1f5f9;
                                                font-size:11px;
                                            ">
                                                ${formatCurrency(balance)}
                                            </td>

                                            <td style="
                                                padding:11px 10px;
                                                border-bottom:1px solid #f1f5f9;
                                                font-size:11px;
                                            ">
                                                ${escapeHTML(loanStatus)}
                                            </td>

                                            <td style="
                                                padding:11px 10px;
                                                border-bottom:1px solid #f1f5f9;
                                                font-size:11px;
                                            ">
                                                ${formatDate(loanDate)}
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


    // =================================================
    // FULL PROFILE
    // =================================================

    pageContent.innerHTML = `

        <!-- PROFILE HEADER -->

        <section class="profile-header">

            <div class="profile-left">

                <div class="avatar">
                    ${escapeHTML(firstLetter)}
                </div>

                <div>

                    <div class="profile-name">
                        ${escapeHTML(name)}
                    </div>

                    <div class="customer-id">
                        ${escapeHTML(customerId)}
                    </div>

                    <span class="status">
                        ${escapeHTML(status)}
                    </span>

                </div>

            </div>


            <button
                class="edit-btn"
                onclick="editCustomer('${encodeURIComponent(customer.documentId)}')"
            >
                Edit Customer
            </button>

        </section>



        <!-- DETAILS -->

        <section class="details-grid">


            <!-- PERSONAL -->

            <div class="card">

                <div class="card-title">
                    Personal Information
                </div>


                <div class="info-grid">

                    <div>

                        <div class="info-label">
                            Full Name
                        </div>

                        <div class="info-value">
                            ${escapeHTML(name)}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Mobile
                        </div>

                        <div class="info-value">
                            ${escapeHTML(mobile)}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Alternate Mobile
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customer.alternateMobile || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Date of Birth
                        </div>

                        <div class="info-value">
                            ${formatDate(customer.dob)}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Gender
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customer.gender || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Occupation
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customer.occupation || "-"
                            )}
                        </div>

                    </div>

                </div>

            </div>



            <!-- IDENTITY -->

            <div class="card">

                <div class="card-title">
                    Identity Details
                </div>


                <div class="info-grid">

                    <div>

                        <div class="info-label">
                            Aadhaar
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customer.aadhaar || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            PAN
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                customer.pan || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Customer Since
                        </div>

                        <div class="info-value">
                            ${formatDate(
                                customer.createdAt
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Status
                        </div>

                        <div class="info-value">
                            ${escapeHTML(status)}
                        </div>

                    </div>

                </div>

            </div>



            <!-- ADDRESS -->

            <div class="card">

                <div class="card-title">
                    Address Details
                </div>


                <div class="info-grid">

                    <div style="grid-column:1/-1;">

                        <div class="info-label">
                            Address
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                address?.address || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Village / Area
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                address?.village || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Taluk
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                address?.taluk || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            District
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                address?.district || "-"
                            )}
                        </div>

                    </div>


                    <div>

                        <div class="info-label">
                            Pincode
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                address?.pincode || "-"
                            )}
                        </div>

                    </div>

                </div>

            </div>



            <!-- NOMINEE -->

            <div class="card">

                <div class="card-title">
                    Nominee Details
                </div>


                ${
                    nominee

                    ? `

                        <div class="info-grid">

                            <div>

                                <div class="info-label">
                                    Name
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        nominee.name || "-"
                                    )}
                                </div>

                            </div>


                            <div>

                                <div class="info-label">
                                    Relationship
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        nominee.relation ||
                                        nominee.relationship ||
                                        "-"
                                    )}
                                </div>

                            </div>


                            <div>

                                <div class="info-label">
                                    Mobile
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        nominee.mobile || "-"
                                    )}
                                </div>

                            </div>

                        </div>

                    `

                    : `

                        <div class="empty-state">

                            <div class="empty-icon">
                                👤
                            </div>

                            <p>
                                No nominee details available.
                            </p>

                        </div>

                    `
                }

            </div>



            <!-- LOAN HISTORY -->

            <div class="card full">

                <div class="card-title">
                    Loan History
                </div>

                ${loanHTML}

            </div>

        </section>

    `;

}


// =====================================================
// EDIT CUSTOMER
// =====================================================

window.editCustomer = function(id) {

    window.location.href =
        `customer-form.html?edit=${id}`;

};


// =====================================================
// LOAD PAGE
// =====================================================

async function loadCustomerPage() {

    if (!customerDocumentId) {

        pageContent.innerHTML = `

            <div class="error">
                Customer ID is missing.
            </div>

        `;

        return;

    }


    try {

        const customer =
            await getCustomer();


        const [
            address,
            nominee,
            loans
        ] = await Promise.all([

            getAddress(customer),

            getNominee(customer),

            getLoanHistory(customer)

        ]);


        renderCustomer(
            customer,
            address,
            nominee,
            loans
        );


    } catch (error) {

        console.error(
            "Customer view error:",
            error
        );


        pageContent.innerHTML = `

            <div class="error">

                ⚠️ ${escapeHTML(
                    error.message ||
                    "Unable to load customer."
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


        await loadCustomerPage();

    }
);
