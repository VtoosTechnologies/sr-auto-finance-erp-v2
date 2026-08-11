// =====================================================
// SR AUTO FINANCE ERP
// Dashboard Controller
// File: js/dashboard.js
// =====================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const userNameElement =
    document.getElementById("userName");

const userRoleElement =
    document.getElementById("userRole");

const companyNameElement =
    document.getElementById("companyName");

const welcomeTextElement =
    document.getElementById("welcomeText");

const companyInfoElement =
    document.getElementById("companyInfo");

const totalCustomersElement =
    document.getElementById("totalCustomers");

const activeLoansElement =
    document.getElementById("activeLoans");

const todayCollectionElement =
    document.getElementById("todayCollection");

const outstandingElement =
    document.getElementById("outstanding");

const logoutBtn =
    document.getElementById("logoutBtn");


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
// FORMAT DATE
// =====================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }


    let date;


    try {

        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else {

            date =
                new Date(value);

        }

    } catch {

        return "-";

    }


    if (
        !date ||
        isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =====================================================
// GET TODAY KEY
// =====================================================

function getTodayKey() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


// =====================================================
// GET DATE KEY
// =====================================================

function getDateKey(value) {

    if (!value) {
        return "";
    }


    let date;


    try {

        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else {

            date =
                new Date(value);

        }

    } catch {

        return "";

    }


    if (
        !date ||
        isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


// =====================================================
// GET LOAN TOTAL
// =====================================================

function getLoanTotal(
    loan
) {

    if (
        loan.totalPayable !==
        undefined &&
        loan.totalPayable !==
        null
    ) {

        return (
            Number(
                loan.totalPayable
            ) || 0
        );

    }


    if (
        loan.totalAmount !==
        undefined &&
        loan.totalAmount !==
        null
    ) {

        return (
            Number(
                loan.totalAmount
            ) || 0
        );

    }


    const principal =
        Number(
            loan.loanAmount ??
            loan.principalAmount ??
            loan.amount ??
            0
        );


    const interest =
        Number(
            loan.interestAmount ??
            0
        );


    return (
        principal +
        interest
    );

}


// =====================================================
// GET LOAN PAID
// =====================================================

function getLoanPaid(
    loan
) {

    return Number(

        loan.amountPaid ??
        loan.paidAmount ??
        0

    );

}


// =====================================================
// GET OUTSTANDING
// =====================================================

function getOutstanding(
    loan
) {

    if (
        loan.outstandingAmount !==
        undefined &&
        loan.outstandingAmount !==
        null
    ) {

        return Math.max(
            Number(
                loan.outstandingAmount
            ) || 0,
            0
        );

    }


    if (
        loan.balanceAmount !==
        undefined &&
        loan.balanceAmount !==
        null
    ) {

        return Math.max(
            Number(
                loan.balanceAmount
            ) || 0,
            0
        );

    }


    if (
       
    return Math.max(

        getLoanTotal(
            loan
        ) -

        getLoanPaid(
            loan
        ),

        0

    );

}


// =====================================================
// GET PAYMENT AMOUNT
// =====================================================

function getPaymentAmount(
    payment
) {

    return Number(

        payment.amountReceived ??
        payment.totalCollection ??
        payment.amountCollected ??
        payment.paymentAmount ??
        payment.paidAmount ??
        payment.emiPaid ??
        payment.amount ??
        0

    ) || 0;

}


// =====================================================
// GET PAYMENT DATE
// =====================================================

function getPaymentDate(
    payment
) {

    return (
        payment.paymentDate ||
        payment.paidDate ||
        payment.collectionDate ||
        payment.date ||
        payment.createdAt
    );

}


// =====================================================
// CHECK INVALID PAYMENT
// =====================================================

function isInvalidPaymentStatus(
    status
) {

    const value =
        String(
            status ||
            "Success"
        ).toLowerCase();


    return [

        "cancelled",
        "canceled",
        "reversed",
        "deleted"

    ].includes(
        value
    );

}


// =====================================================
// CHECK STAFF PAYMENT
// =====================================================

function isStaffPayment(
    payment
) {

    const staffId =
        payment.staffId ||
        payment.assignedStaffId ||
        payment.collectorStaffId ||
        payment.collectedByStaffId ||
        payment.staffDocumentId ||
        payment.staffCode ||
        payment.employeeId;


    return !!staffId;

}


// =====================================================
// LOAD USER PROFILE
// =====================================================

async function loadUserProfile(
    user
) {

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const userSnap =
            await getDoc(
                userRef
            );


        if (
            !userSnap.exists()
        ) {

            console.error(
                "User profile not found."
            );


            await signOut(
                auth
            );


            window.location.href =
                "login.html";


            return false;

        }


        const userData =
            userSnap.data();


        const active =
            userData.active ===
            true;


        const status =
            String(
                userData.status ||
                ""
            ).toLowerCase();


        if (
            !active ||
            status !==
            "active"
        ) {

            await signOut(
                auth
            );


            window.location.href =
                "login.html";


            return false;

        }


        const name =
            userData.name ||
            userData.username ||
            "User";


        const role =
            userData.role ||
            "Staff";


        if (
            userNameElement
        ) {

            userNameElement.textContent =
                name;

        }


        if (
            userRoleElement
        ) {

            userRoleElement.textContent =
                role;

        }


        if (
            welcomeTextElement
        ) {

            welcomeTextElement.textContent =
                `Welcome back, ${name}. Here's your business overview.`;

        }


        return true;


    } catch (
        error
    ) {

        console.error(
            "User profile error:",
            error
        );


        return false;

    }

}


// =====================================================
// LOAD COMPANY SETTINGS
// =====================================================

async function loadCompanySettings() {

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
            !companySnap.exists()
        ) {

            return;

        }


        const company =
            companySnap.data();


        const companyName =
            company.companyName ||
            company.brandName ||
            "SR Auto Finance";


        const ownerName =
            company.ownerName ||
            "";


        const mobile =
            company.mobile ||
            company.phone ||
            "";


        const address =
            company.address ||
            "";


        if (
            companyNameElement
        ) {

            companyNameElement.textContent =
                companyName;

        }


        if (
            companyInfoElement
        ) {

            companyInfoElement.innerHTML = `

                <div
                    style="
                        text-align:left;
                        line-height:1.8;
                        font-size:12px;
                        color:#334155;
                    "
                >

                    <div
                        style="
                            font-size:14px;
                            font-weight:800;
                            color:#0f172a;
                        "
                    >
                        ${companyName}
                    </div>


                    ${
                        ownerName
                            ? `
                                <div>
                                    Owner:
                                    ${ownerName}
                                </div>
                              `
                            : ""
                    }


                    ${
                        mobile
                            ? `
                                <div>
                                    Mobile:
                                    ${mobile}
                                </div>
                              `
                            : ""
                    }


                    ${
                        address
                            ? `
                                <div>
                                    ${address}
                                </div>
                              `
                            : ""
                    }

                </div>

            `;

        }


    } catch (
        error
    ) {

        console.error(
            "Company settings error:",
            error
        );

    }

}


// =====================================================
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "customers"
                )
            );


        if (
            totalCustomersElement
        ) {

            totalCustomersElement.textContent =
                snapshot.size;

        }


    } catch (
        error
    ) {

        console.error(
            "Customer loading error:",
            error
        );


        if (
            totalCustomersElement
        ) {

            totalCustomersElement.textContent =
                "0";

        }

    }

}


// =====================================================
// LOAD LOANS
// =====================================================

async function loadLoans() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
            );


        let activeLoans =
            0;


        let totalOutstanding =
            0;


        snapshot.forEach(
            loanDoc => {

                const loan =
                    loanDoc.data();


                const status =
                    String(
                        loan.status ||
                        "Active"
                    ).toLowerCase();


                const outstanding =
                    getOutstanding(
                        loan
                    );


                const isClosed = [

                    "closed",
                    "cancelled",
                    "canceled",
                    "completed"

                ].includes(
                    status
                );


                if (
                    !isClosed &&
                    outstanding > 0
                ) {

                    activeLoans++;

                }


                if (
                    outstanding > 0
                ) {

                    totalOutstanding +=
                        outstanding;

                }

            }
        );


        if (
            activeLoansElement
        ) {

            activeLoansElement.textContent =
                activeLoans;

        }


        if (
            outstandingElement
        ) {

            outstandingElement.textContent =
                formatCurrency(
                    totalOutstanding
                );

        }


    } catch (
        error
    ) {

        console.error(
            "Loan loading error:",
            error
        );


        if (
            activeLoansElement
        ) {

            activeLoansElement.textContent =
                "0";

        }


        if (
            outstandingElement
        ) {

            outstandingElement.textContent =
                formatCurrency(
                    0
                );

        }

    }

}


// =====================================================
// LOAD TODAY'S COLLECTION
//
// OWNER COLLECTION
// +
// STAFF COLLECTION
//
// Staff payment is already customer collection.
// Deposit acceptance is NOT added here again.
// =====================================================

async function loadTodayCollection() {

    try {

        const todayKey =
            getTodayKey();


        let todayAmount =
            0;


        const countedIds =
            new Set();


        // =================================================
        // OWNER DIRECT COLLECTIONS
        // =================================================

        const collectionsSnapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        collectionsSnapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                const paymentDate =
                    data.paymentDate ||
                    data.collectionDate ||
                    data.date ||
                    data.createdAt;


                if (
                    getDateKey(
                        paymentDate
                    ) !==
                    todayKey
                ) {

                    return;

                }


                const amount =
                    Number(

                        data.amount ??
                        data.paidAmount ??
                        data.paymentAmount ??
                        data.amountReceived ??
                        0

                    ) || 0;


                todayAmount +=
                    amount;


                countedIds.add(
                    `collections_${collectionDoc.id}`
                );

            }
        );


        // =================================================
        // STAFF COLLECTION
        // =================================================

        const paymentsSnapshot =
            await getDocs(
                collection(
                    db,
                    "payments"
                )
            );


        paymentsSnapshot.forEach(
            paymentDoc => {

                const data =
                    paymentDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                /*
                 * Only staff-linked payment
                 * records are added.
                 *
                 * This prevents normal owner
                 * payments from duplicate counting.
                 */

                if (
                    !isStaffPayment(
                        data
                    )
                ) {

                    return;

                }


                const paymentDate =
                    getPaymentDate(
                        data
                    );


                if (
                    getDateKey(
                        paymentDate
                    ) !==
                    todayKey
                ) {

                    return;

                }


                const uniqueId =
                    `payments_${paymentDoc.id}`;


                if (
                    countedIds.has(
                        uniqueId
                    )
                ) {

                    return;

                }


                countedIds.add(
                    uniqueId
                );


                todayAmount +=
                    getPaymentAmount(
                        data
                    );

            }
        );


        // =================================================
        // UPDATE
        // =================================================

        if (
            todayCollectionElement
        ) {

            todayCollectionElement.textContent =
                formatCurrency(
                    todayAmount
                );

        }


    } catch (
        error
    ) {

        console.error(
            "Today's collection error:",
            error
        );


        if (
            todayCollectionElement
        ) {

            todayCollectionElement.textContent =
                formatCurrency(
                    0
                );

        }

    }

}


// =====================================================
// LOAD RECENT COLLECTIONS
//
// OWNER COLLECTIONS
// +
// STAFF PAYMENTS
// =====================================================

async function loadRecentCollections() {

    try {

        const panel =
            document.querySelector(
                ".bottom-grid .panel:first-child"
            );


        if (
            !panel
        ) {

            return;

        }


        const existingEmpty =
            panel.querySelector(
                ".empty-state"
            );


        const records = [];


        // =================================================
        // OWNER COLLECTIONS
        // =================================================

        const collectionsSnapshot =
            await getDocs(
                collection(
                    db,
                    "collections"
                )
            );


        collectionsSnapshot.forEach(
            collectionDoc => {

                const data =
                    collectionDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                records.push({

                    id:
                        collectionDoc.id,

                    source:
                        "owner",

                    ...data

                });

            }
        );


        // =================================================
        // STAFF PAYMENTS
        // =================================================

        const paymentsSnapshot =
            await getDocs(
                collection(
                    db,
                    "payments"
                )
            );


        paymentsSnapshot.forEach(
            paymentDoc => {

                const data =
                    paymentDoc.data();


                if (
                    isInvalidPaymentStatus(
                        data.status
                    )
                ) {

                    return;

                }


                if (
                    !isStaffPayment(
                        data
                    )
                ) {

                    return;

                }


                records.push({

                    id:
                        paymentDoc.id,

                    source:
                        "staff",

                    ...data

                });

            }
        );


        // =================================================
        // SORT LATEST
        // =================================================

        records.sort(
            (
                a,
                b
            ) => {

                const dateA =
                    a.createdAt &&
                    typeof a.createdAt.toDate ===
                    "function"

                        ? a.createdAt.toDate()

                        : new Date(
                            a.paymentDate ||
                            a.collectionDate ||
                            a.date ||
                            0
                        );


                const dateB =
                    b.createdAt &&
                    typeof b.createdAt.toDate ===
                    "function"

                        ? b.createdAt.toDate()

                        : new Date(
                            b.paymentDate ||
                            b.collectionDate ||
                            b.date ||
                            0
                        );


                return (
                    dateB.getTime() -
                    dateA.getTime()
                );

            }
        );


        const latest =
            records.slice(
                0,
                5
            );


        // Remove old generated list

        const oldList =
            panel.querySelector(
                ".dashboard-recent-list"
            );


        if (
            oldList
        ) {

            oldList.remove();

        }


        if (
            existingEmpty
        ) {

            existingEmpty.remove();

        }


        if (
            !latest.length
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "empty-state";


            empty.textContent =
                "No collections yet.";


            panel.appendChild(
                empty
            );


            return;

        }


        const list =
            document.createElement(
                "div"
            );


        list.className =
            "dashboard-recent-list";


        list.style.display =
            "flex";

        list.style.flexDirection =
            "column";

        list.style.gap =
            "10px";


        // =================================================
        // ROWS
        // =================================================

        latest.forEach(
            payment => {

                const receiptNo =
                    payment.receiptNo ||
                    payment.receiptNumber ||
                    payment.id;


                const customerName =
                    payment.customerName ||
                    "Customer";


                const staffName =
                    payment.staffName ||
                    payment.collectorName ||
                    "Staff";


                const amount =
                    getPaymentAmount(
                        payment
                    );


                const paymentMode =
                    payment.paymentMode ||
                    payment.mode ||
                    "";


                const paymentDate =
                    getPaymentDate(
                        payment
                    );


                const sourceLabel =
                    payment.source ===
                    "staff"

                        ? `Staff: ${staffName}`

                        : "Owner";


                const row =
                    document.createElement(
                        "div"
                    );


                row.style.display =
                    "flex";

                row.style.alignItems =
                    "center";

                row.style.justifyContent =
                    "space-between";

                row.style.gap =
                    "12px";

                row.style.padding =
                    "11px";

                row.style.border =
                    "1px solid #e2e8f0";

                row.style.borderRadius =
                    "10px";

                row.style.background =
                    "#f8fafc";

                row.style.cursor =
                    "pointer";


                row.innerHTML = `

                    <div
                        style="
                            min-width:0;
                            flex:1;
                        "
                    >

                        <div
                            style="
                                font-size:12px;
                                font-weight:700;
                                color:#0f172a;
                                white-space:nowrap;
                                overflow:hidden;
                                text-overflow:ellipsis;
                            "
                        >
                            ${customerName}
                        </div>


                        <div
                            style="
                                font-size:10px;
                                color:#64748b;
                                margin-top:3px;
                            "
                        >

                            ${receiptNo}

                            ${
                                paymentMode
                                    ? ` • ${paymentMode}`
                                    : ""
                            }

                            • ${sourceLabel}

                        </div>

                    </div>


                    <div
                        style="
                            text-align:right;
                            flex-shrink:0;
                        "
                    >

                        <div
                            style="
                                font-size:13px;
                                font-weight:800;
                                color:#15803d;
                            "
                        >
                            ${formatCurrency(
                                amount
                            )}
                        </div>


                        <div
                            style="
                                font-size:9px;
                                color:#94a3b8;
                                margin-top:3px;
                            "
                        >
                            ${formatDate(
                                paymentDate
                            )}
                        </div>

                    </div>

                `;


                row.addEventListener(
                    "click",
                    function() {

                        if (
                            payment.source ===
                            "staff"
                        ) {

                            /*
                             * Staff collection
                             * view page.
                             *
                             * If this page is not
                             * created yet, change
                             * this path later.
                             */

                            window.location.href =
                                `staff-collection-view.html?id=${encodeURIComponent(
                                    payment.id
                                )}`;

                        } else {

                            window.location.href =
                                `collection-view.html?id=${encodeURIComponent(
                                    payment.id
                                )}`;

                        }

                    }
                );


                list.appendChild(
                    row
                );

            }
        );


        panel.appendChild(
            list
        );


    } catch (
        error
    ) {

        console.error(
            "Recent collections error:",
            error
        );

    }

}


// =====================================================
// LOGOUT
// =====================================================

if (
    logoutBtn
) {

    logoutBtn.addEventListener(
        "click",
        async function() {

            try {

                logoutBtn.disabled =
                    true;


                logoutBtn.textContent =
                    "Logging out...";


                sessionStorage.clear();


                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";


            } catch (
                error
            ) {

                console.error(
                    "Logout error:",
                    error
                );


                logoutBtn.disabled =
                    false;


                logoutBtn.textContent =
                    "Logout";

            }

        }
    );

}


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
    auth,
    async function(user) {

        if (
            !user
        ) {

            window.location.href =
                "login.html";

            return;

        }


        const validUser =
            await loadUserProfile(
                user
            );


        if (
            !validUser
        ) {

            return;

        }


        /*
         * Load independently.
         *
         * One module failure should not
         * stop the complete dashboard.
         */

        await Promise.all([

            loadCompanySettings(),

            loadCustomers(),

            loadLoans(),

            loadTodayCollection(),

            loadRecentCollections()

        ]);

    }
);
