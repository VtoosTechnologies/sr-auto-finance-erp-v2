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
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const totalCustomers =
    document.getElementById(
        "totalCustomers"
    );

const activeCustomers =
    document.getElementById(
        "activeCustomers"
    );

const inactiveCustomers =
    document.getElementById(
        "inactiveCustomers"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const customerTableBody =
    document.getElementById(
        "customerTableBody"
    );


// =====================================================
// DATA
// =====================================================

let customers = [];


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

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
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

    showLoading();

    try {

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

                customers.push({

                    id:
                        customerDoc.id,

                    ...customerDoc.data()

                });

            }
        );


        /*
         * Sort latest customers first
         * when createdAt exists.
         */

        customers.sort(
            (a, b) => {

                const dateA =
                    getDateValue(
                        a.createdAt
                    );

                const dateB =
                    getDateValue(
                        b.createdAt
                    );


                return (
                    dateB - dateA
                );

            }
        );


        updateSummary();

        applySearch();


    } catch (error) {

        console.error(
            "Customer loading error:",
            error
        );


        showError(
            "Unable to load customers."
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


    try {

        if (
            typeof value.toDate ===
            "function"
        ) {

            return value
                .toDate()
                .getTime();

        }


        const date =
            new Date(
                value
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return 0;

        }


        return date.getTime();

    } catch {

        return 0;

    }

}


// =====================================================
// CUSTOMER STATUS
// =====================================================

function getCustomerStatus(
    customer
) {

    const status =
        String(
            customer.status ||
            "active"
        )
        .trim()
        .toLowerCase();


    if (

        status === "inactive" ||

        status === "disabled" ||

        status === "blocked"

    ) {

        return "inactive";

    }


    return "active";

}


// =====================================================
// CUSTOMER NAME
// =====================================================

function getCustomerName(
    customer
) {

    return (

        customer.name ||

        customer.customerName ||

        customer.fullName ||

        customer.customer_name ||

        "Unnamed Customer"

    );

}


// =====================================================
// CUSTOMER ID
// =====================================================

function getCustomerId(
    customer
) {

    return (

        customer.customerId ||

        customer.customerCode ||

        customer.code ||

        customer.id

    );

}


// =====================================================
// MOBILE
// =====================================================

function getMobile(
    customer
) {

    return (

        customer.mobile ||

        customer.phone ||

        customer.phoneNumber ||

        customer.mobileNumber ||

        "-"

    );

}


// =====================================================
// LOCATION
// =====================================================

function getLocation(
    customer
) {

    /*
     * Support different possible
     * address field names.
     */

    if (
        customer.location
    ) {

        return customer.location;

    }


    if (
        customer.city
    ) {

        return customer.city;

    }


    if (
        customer.address
    ) {

        return customer.address;

    }


    if (
        customer.village
    ) {

        return customer.village;

    }


    if (
        customer.taluk
    ) {

        return customer.taluk;

    }


    return "-";

}


// =====================================================
// UPDATE SUMMARY
// =====================================================

function updateSummary() {

    let activeCount =
        0;

    let inactiveCount =
        0;


    customers.forEach(
        customer => {

            const status =
                getCustomerStatus(
                    customer
                );


            if (
                status === "active"
            ) {

                activeCount++;

            } else {

                inactiveCount++;

            }

        }
    );


    if (
        totalCustomers
    ) {

        totalCustomers.textContent =
            customers.length;

    }


    if (
        activeCustomers
    ) {

        activeCustomers.textContent =
            activeCount;

    }


    if (
        inactiveCustomers
    ) {

        inactiveCustomers.textContent =
            inactiveCount;

    }

}


// =====================================================
// SEARCH
// =====================================================

function applySearch() {

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        customers.filter(
            customer => {

                if (!search) {

                    return true;

                }


                const customerId =
                    String(
                        getCustomerId(
                            customer
                        )
                    )
                    .toLowerCase();


                const customerName =
                    String(
                        getCustomerName(
                            customer
                        )
                    )
                    .toLowerCase();


                const mobile =
                    String(
                        getMobile(
                            customer
                        )
                    )
                    .toLowerCase();


                const location =
                    String(
                        getLocation(
                            customer
                        )
                    )
                    .toLowerCase();


                return (

                    customerId.includes(
                        search
                    ) ||

                    customerName.includes(
                        search
                    ) ||

                    mobile.includes(
                        search
                    ) ||

                    location.includes(
                        search
                    )

                );

            }
        );


    renderCustomers(
        filtered
    );

}


// =====================================================
// RENDER CUSTOMERS
// =====================================================

function renderCustomers(
    list
) {

    if (!customerTableBody) {

        return;

    }


    if (!list.length) {

        customerTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                >

                    <div
                        class="empty-state"
                    >

                        <div
                            class="empty-icon"
                        >
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


    customerTableBody.innerHTML =
        list.map(
            customer => {

                const customerId =
                    getCustomerId(
                        customer
                    );


                const customerName =
                    getCustomerName(
                        customer
                    );


                const mobile =
                    getMobile(
                        customer
                    );


                const location =
                    getLocation(
                        customer
                    );


                const status =
                    getCustomerStatus(
                        customer
                    );


                const statusText =
                    status === "active"
                        ? "Active"
                        : "Inactive";


                return `

                    <tr>

                        <!-- CUSTOMER ID -->

                        <td>

                            <span
                                class="customer-id"
                            >

                                ${escapeHTML(
                                    customerId
                                )}

                            </span>

                        </td>


                        <!-- NAME -->

                        <td>

                            <span
                                class="customer-name"
                            >

                                ${escapeHTML(
                                    customerName
                                )}

                            </span>

                        </td>


                        <!-- MOBILE -->

                        <td>

                            ${escapeHTML(
                                mobile
                            )}

                        </td>


                        <!-- LOCATION -->

                        <td>

                            ${escapeHTML(
                                location
                            )}

                        </td>


                        <!-- STATUS -->

                        <td>

                            <span
                                class="
                                    status
                                    ${status}
                                "
                            >

                                ${statusText}

                            </span>

                        </td>


                        <!-- ACTION -->

                        <td>

                            <button
                                class="action-btn"
                                data-id="${escapeHTML(
                                    customer.id
                                )}"
                                onclick="viewCustomer(this.dataset.id)"
                            >
                                View
                            </button>


                            <button
                                class="action-btn delete-btn"
                                data-id="${escapeHTML(
                                    customer.id
                                )}"
                                data-name="${escapeHTML(
                                    customerName
                                )}"
                                onclick="deleteCustomer(this.dataset.id, this.dataset.name)"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `;

            }
        )
        .join("");

}


// =====================================================
// VIEW CUSTOMER
// =====================================================

window.viewCustomer =
    function(customerId) {

        if (
            !customerId
        ) {

            return;

        }


        window.location.href =
            `customer-view.html?id=${
                encodeURIComponent(
                    customerId
                )
            }`;

    };


// =====================================================
// DELETE CUSTOMER
// =====================================================

window.deleteCustomer =
    async function(
        customerId,
        customerName
    ) {

        if (
            !customerId
        ) {

            return;

        }


        const confirmed =
            window.confirm(

                `Delete customer "${customerName || "this customer"}"?\n\n` +

                "This action cannot be undone. Continue?"

            );


        if (!confirmed) {

            return;

        }


        try {

            await deleteDoc(

                doc(
                    db,
                    "customers",
                    customerId
                )

            );


            customers =
                customers.filter(
                    customer =>
                        String(
                            customer.id
                        ) !==
                        String(
                            customerId
                        )
                );


            updateSummary();

            applySearch();


            alert(
                "Customer deleted successfully."
            );


        } catch (error) {

            console.error(
                "Customer delete error:",
                error
            );


            alert(
                "Unable to delete customer. Please try again."
            );

        }

    };


// =====================================================
// SEARCH EVENT
// =====================================================

if (
    searchInput
) {

    searchInput.addEventListener(
        "input",
        applySearch
    );

}


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    if (
        !customerTableBody
    ) {

        return;

    }


    customerTableBody.innerHTML = `

        <tr>

            <td
                colspan="6"
            >

                <div
                    class="empty-state"
                >

                    <div
                        class="empty-icon"
                    >
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

function showError(
    message
) {

    if (
        !customerTableBody
    ) {

        return;

    }


    customerTableBody.innerHTML = `

        <tr>

            <td
                colspan="6"
            >

                <div
                    class="empty-state"
                >

                    <div
                        class="empty-icon"
                    >
                        ⚠️
                    </div>

                    <p>
                        ${escapeHTML(
                            message
                        )}
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
