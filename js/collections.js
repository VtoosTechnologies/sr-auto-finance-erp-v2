// =====================================================
// SR AUTO FINANCE ERP
// Collections Controller
// File: js/collections.js
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
    document.getElementById("collectionTableBody");

const searchInput =
    document.getElementById("searchInput");

const modeFilter =
    document.getElementById("modeFilter");

const totalCollectionsElement =
    document.getElementById("totalCollections");

const todayCollectionElement =
    document.getElementById("todayCollection");

const totalCollectedElement =
    document.getElementById("totalCollected");

const monthCollectionElement =
    document.getElementById("monthCollection");


// =====================================================
// DATA
// =====================================================

let collections = [];


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
// GET DATE
// =====================================================

function getDateObject(value) {

    if (!value) {
        return null;
    }


    try {

        if (
            value &&
            typeof value.toDate === "function"
        ) {

            return value.toDate();

        }


        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return date;

    } catch (error) {

        return null;

    }

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value) {

    const date =
        getDateObject(value);


    if (!date) {
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

}


// =====================================================
// GET PAYMENT DATE
// =====================================================

function getPaymentDate(item) {

    return (
        item.paymentDate ||
        item.collectionDate ||
        item.date ||
        item.createdAt
    );

}


// =====================================================
// GET AMOUNT
// =====================================================

function getAmount(item) {

    return Number(

        item.amount ??
        item.paidAmount ??
        item.paymentAmount ??
        item.collectionAmount ??
        0

    );

}


// =====================================================
// GET PAYMENT MODE
// =====================================================

function getPaymentMode(item) {

    return (
        item.paymentMode ||
        item.mode ||
        "Cash"
    );

}


// =====================================================
// LOAD COLLECTIONS
// =====================================================

async function loadCollections() {

    try {

        showLoading();


        const collectionsRef =
            collection(
                db,
                "collections"
            );


        const snapshot =
            await getDocs(
                collectionsRef
            );


        collections = [];


        snapshot.forEach(
            collectionDoc => {

                collections.push({

                    id:
                        collectionDoc.id,

                    ...collectionDoc.data()

                });

            }
        );


        // Newest collection first

        collections.sort(
            (a, b) => {

                const dateA =
                    getDateValue(
                        getPaymentDate(a)
                    );


                const dateB =
                    getDateValue(
                        getPaymentDate(b)
                    );


                return dateB - dateA;

            }
        );


        updateSummary();

        renderCollections(
            collections
        );


    } catch (error) {

        console.error(
            "Collection loading error:",
            error
        );


        showError(
            "Unable to load collections. Please try again."
        );

    }

}


// =====================================================
// GET DATE VALUE
// =====================================================

function getDateValue(value) {

    const date =
        getDateObject(value);


    return date
        ? date.getTime()
        : 0;

}


// =====================================================
// CHECK SAME DAY
// =====================================================

function isToday(value) {

    const date =
        getDateObject(value);


    if (!date) {
        return false;
    }


    const today =
        new Date();


    return (

        date.getFullYear() ===
        today.getFullYear()

        &&

        date.getMonth() ===
        today.getMonth()

        &&

        date.getDate() ===
        today.getDate()

    );

}


// =====================================================
// CHECK SAME MONTH
// =====================================================

function isThisMonth(value) {

    const date =
        getDateObject(value);


    if (!date) {
        return false;
    }


    const today =
        new Date();


    return (

        date.getFullYear() ===
        today.getFullYear()

        &&

        date.getMonth() ===
        today.getMonth()

    );

}


// =====================================================
// CHECK VALID COLLECTION
// =====================================================

function isValidCollection(item) {

    const status =
        String(
            item.status ||
            "Success"
        ).toLowerCase();


    return (

        status !== "cancelled" &&

        status !== "canceled" &&

        status !== "reversed"

    );

}


// =====================================================
// UPDATE SUMMARY
// =====================================================

function updateSummary() {

    let todayAmount = 0;

    let monthAmount = 0;

    let totalAmount = 0;

    let validCount = 0;


    collections.forEach(
        item => {

            if (
                !isValidCollection(item)
            ) {

                return;

            }


            const amount =
                getAmount(item);


            const paymentDate =
                getPaymentDate(item);


            totalAmount +=
                amount;


            validCount++;


            if (
                isToday(
                    paymentDate
                )
            ) {

                todayAmount +=
                    amount;

            }


            if (
                isThisMonth(
                    paymentDate
                )
            ) {

                monthAmount +=
                    amount;

            }

        }
    );


    totalCollectionsElement.textContent =
        validCount;


    todayCollectionElement.textContent =
        formatCurrency(
            todayAmount
        );


    totalCollectedElement.textContent =
        formatCurrency(
            totalAmount
        );


    monthCollectionElement.textContent =
        formatCurrency(
            monthAmount
        );

}


// =====================================================
// RENDER COLLECTIONS
// =====================================================

function renderCollections(list) {

    if (!list.length) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div class="empty-state">

                        <div class="empty-icon">
                            💰
                        </div>

                        <p>
                            No collections found.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    tableBody.innerHTML =
        list.map(
            item => {

                const receiptId =
                    item.receiptNo ||
                    item.receiptNumber ||
                    item.receiptId ||
                    item.id ||
                    "-";


                const paymentDate =
                    getPaymentDate(item);


                const loanId =
                    item.loanId ||
                    item.loanNumber ||
                    "-";


                const customerName =
                    item.customerName ||
                    item.name ||
                    "-";


                const amount =
                    getAmount(item);


                const mode =
                    getPaymentMode(item);


                const status =
                    item.status ||
                    "Success";


                const statusClass =
                    String(status)
                        .toLowerCase()
                        .includes("cancel")
                        ? "cancelled"
                        : "success";


                return `

                    <tr>

                        <td>

                            <span class="receipt-id">

                                ${escapeHTML(
                                    receiptId
                                )}

                            </span>

                        </td>


                        <td>

                            ${formatDate(
                                paymentDate
                            )}

                        </td>


                        <td>

                            <span class="receipt-id">

                                ${escapeHTML(
                                    loanId
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="customer-name">

                                ${escapeHTML(
                                    customerName
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="amount">

                                ${formatCurrency(
                                    amount
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="payment-mode">

                                ${escapeHTML(
                                    mode
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="
                                status
                                ${statusClass}
                            ">

                                ${escapeHTML(
                                    status
                                )}

                            </span>

                        </td>


                        <td>

                            <button
                                class="action-btn"
                                data-id="${escapeHTML(
                                    item.id
                                )}"
                                onclick="viewCollection(this.dataset.id)"
                            >
                                View
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// =====================================================
// FILTER COLLECTIONS
// =====================================================

function filterCollections() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedMode =
        modeFilter.value
            .trim()
            .toLowerCase();


    const filtered =
        collections.filter(
            item => {

                const receiptId =
                    String(

                        item.receiptNo ||
                        item.receiptNumber ||
                        item.receiptId ||
                        item.id ||
                        ""

                    ).toLowerCase();


                const loanId =
                    String(

                        item.loanId ||
                        item.loanNumber ||
                        ""

                    ).toLowerCase();


                const customerName =
                    String(

                        item.customerName ||
                        item.name ||
                        ""

                    ).toLowerCase();


                const mobile =
                    String(

                        item.mobile ||
                        item.customerMobile ||
                        item.phone ||
                        ""

                    ).toLowerCase();


                const mode =
                    getPaymentMode(
                        item
                    ).toLowerCase();


                const matchesSearch =

                    !search ||

                    receiptId.includes(
                        search
                    ) ||

                    loanId.includes(
                        search
                    ) ||

                    customerName.includes(
                        search
                    ) ||

                    mobile.includes(
                        search
                    );


                const matchesMode =

                    !selectedMode ||

                    mode === selectedMode;


                return (

                    matchesSearch &&

                    matchesMode

                );

            }
        );


    renderCollections(
        filtered
    );

}


// =====================================================
// SEARCH
// =====================================================

searchInput.addEventListener(
    "input",
    filterCollections
);


// =====================================================
// PAYMENT MODE FILTER
// =====================================================

modeFilter.addEventListener(
    "change",
    filterCollections
);


// =====================================================
// VIEW COLLECTION
// =====================================================

window.viewCollection =
    function(collectionId) {

        if (!collectionId) {
            return;
        }


        window.location.href =
            `collection-view.html?id=${
                encodeURIComponent(
                    collectionId
                )
            }`;

    };


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    tableBody.innerHTML = `

        <tr>

            <td colspan="8">

                <div class="empty-state">

                    <div class="empty-icon">
                        ⏳
                    </div>

                    <p>
                        Loading collections...
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

            <td colspan="8">

                <div class="empty-state">

                    <div class="empty-icon">
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


        await loadCollections();

    }
);
