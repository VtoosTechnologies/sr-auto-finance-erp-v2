// =====================================================
// SR AUTO FINANCE ERP
// Customers Controller
// File: js/customers.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const tableBody =
    document.getElementById("customerTableBody");

const searchInput =
    document.getElementById("searchInput");

const totalCustomers =
    document.getElementById("totalCustomers");

const activeCustomers =
    document.getElementById("activeCustomers");

const inactiveCustomers =
    document.getElementById("inactiveCustomers");


// =====================================================
// DATA
// =====================================================

let customers = [];


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
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

    try {

        showLoading();

        const customersRef =
            collection(db, "customers");

        const snapshot =
            await getDocs(customersRef);


        customers = [];


        snapshot.forEach((docSnapshot) => {

            const data =
                docSnapshot.data();


            customers.push({

                id: docSnapshot.id,

                ...data

            });

        });


        // Newest first
        customers.sort((a, b) => {

            const dateA =
                getDateValue(a.createdAt);

            const dateB =
                getDateValue(b.createdAt);

            return dateB - dateA;

        });


        updateSummary();

        renderCustomers(customers);


    } catch (error) {

        console.error(
            "Customer loading error:",
            error
        );

        showError(
            "Unable to load customers. Please try again."
        );

    }

}


// =====================================================
// DATE VALUE
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


    if (!isNaN(date.getTime())) {

        return date.getTime();

    }


    return 0;

}


// =====================================================
// UPDATE SUMMARY
// =====================================================

function updateSummary() {

    let active = 0;
    let inactive = 0;


    customers.forEach((customer) => {

        const status =
            String(
                customer.status ?? "Active"
            ).toLowerCase();


        if (
            status === "active"
        ) {

            active++;

        } else {

            inactive++;

        }

    });


    totalCustomers.textContent =
        customers.length;


    activeCustomers.textContent =
        active;


    inactiveCustomers.textContent =
        inactive;

}


// =====================================================
// RENDER CUSTOMERS
// =====================================================

function renderCustomers(list) {

    if (!list.length) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="6">

                    <div class="empty-state">

                        <div class="empty-icon">
                            👤
                        </div>

                        <p>
                            No customers found.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    tableBody.innerHTML =
        list.map((customer) => {

            const customerId =
                customer.customerId ||
                customer.customerCode ||
                customer.id ||
                "-";


            const name =
                customer.name ||
                customer.customerName ||
                "-";


            const mobile =
                customer.mobile ||
                customer.phone ||
                customer.mobileNumber ||
                "-";


            const location =
                customer.location ||
                customer.city ||
                customer.address?.city ||
                "-";


            const status =
                String(
                    customer.status ?? "Active"
                );


            const isActive =
                status.toLowerCase() === "active";


            return `

                <tr>

                    <td>

                        <span class="customer-id">
                            ${escapeHTML(customerId)}
                        </span>

                    </td>


                    <td>

                        <span class="customer-name">
                            ${escapeHTML(name)}
                        </span>

                    </td>


                    <td>
                        ${escapeHTML(mobile)}
                    </td>


                    <td>
                        ${escapeHTML(location)}
                    </td>


                    <td>

                        <span class="status ${
                            isActive
                                ? "active"
                                : "inactive"
                        }">

                            ${escapeHTML(status)}

                        </span>

                    </td>


                    <td>

                        <button
                            class="action-btn"
                            data-id="${escapeHTML(customer.id)}"
                            onclick="viewCustomer(this.dataset.id)"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `;

        }).join("");

}


// =====================================================
// SEARCH
// =====================================================

searchInput.addEventListener(
    "input",
    function () {

        const search =
            this.value
                .trim()
                .toLowerCase();


        if (!search) {

            renderCustomers(customers);

            return;

        }


        const filtered =
            customers.filter((customer) => {

                const customerId =
                    String(
                        customer.customerId ||
                        customer.customerCode ||
                        customer.id ||
                        ""
                    ).toLowerCase();


                const name =
                    String(
                        customer.name ||
                        customer.customerName ||
                        ""
                    ).toLowerCase();


                const mobile =
                    String(
                        customer.mobile ||
                        customer.phone ||
                        customer.mobileNumber ||
                        ""
                    ).toLowerCase();


                return (
                    customerId.includes(search) ||
                    name.includes(search) ||
                    mobile.includes(search)
                );

            });


        renderCustomers(filtered);

    }
);


// =====================================================
// VIEW CUSTOMER
// =====================================================

window.viewCustomer = function(customerId) {

    if (!customerId) {
        return;
    }


    window.location.href =
        `customer-view.html?id=${encodeURIComponent(customerId)}`;

};


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    tableBody.innerHTML = `

        <tr>

            <td colspan="6">

                <div class="empty-state">

                    <div class="empty-icon">
                        ⏳
                    </div>

                    <p>
                        Loading customers...
                    </p>

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

    tableBody.innerHTML = `

        <tr>

            <td colspan="6">

                <div class="empty-state">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>

            </td>

        </tr>

    `;

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


        await loadCustomers();

    }
);
