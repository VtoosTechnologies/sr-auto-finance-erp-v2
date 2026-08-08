/* ==========================================================
   SR AUTO FINANCE ERP
   Customer Module
   Developed By : VTOOS Software Solutions
========================================================== */

import { db } from "./firebase.js";

import {

    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    serverTimestamp

} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {

    showLoader,
    hideLoader,
    showMessage

} from "./common.js";

/* ==========================================================
   COLLECTION
========================================================== */

const customerCollection = collection(

    db,

    "customers"

);

/* ==========================================================
   DOM
========================================================== */

const searchBox =

    document.getElementById("searchCustomer");

const customerTable =

    document.getElementById("customerTable");

const totalCustomers =

    document.getElementById("totalCustomers");

const activeCustomers =

    document.getElementById("activeCustomers");

const dueCustomers =

    document.getElementById("dueCustomers");

const loanCustomers =

    document.getElementById("loanCustomers");

const addCustomerBtn =

    document.getElementById("addCustomerBtn");

/* ==========================================================
   GLOBAL
========================================================== */

let customers = [];

let filteredCustomers = [];

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initialize();

    }

);

async function initialize(){

    setupEvents();

    await loadCustomers();

}

/* ==========================================================
   EVENTS
========================================================== */

function setupEvents(){

    if(searchBox){

        searchBox.addEventListener(

            "input",

            searchCustomers

        );

    }

    if(addCustomerBtn){

        addCustomerBtn.addEventListener(

            "click",

            openCustomerModal

        );

    }

}

/* ==========================================================
   LOAD CUSTOMERS
========================================================== */

async function loadCustomers(){

    showLoader();

    try{

        const q = query(

            customerCollection,

            orderBy(

                "customerName"

            )

        );

        const snapshot =

            await getDocs(q);

        customers = [];

        snapshot.forEach(doc=>{

            customers.push({

                id:doc.id,

                ...doc.data()

            });

        });

        filteredCustomers=[

            ...customers

        ];

        updateSummary();

        renderTable();

    }

    catch(error){

        console.error(error);

        showMessage(

            "Unable to load customers.",

            "error"

        );

    }

    hideLoader();

}
/* ==========================================================
   SEARCH
========================================================== */

function searchCustomers(){

    const keyword =

        searchBox.value
            .toLowerCase()
            .trim();

    filteredCustomers = customers.filter(customer=>{

        return (

            (customer.customerName || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (customer.mobile || "")
                .includes(keyword)

            ||

            (customer.customerId || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (customer.aadhaar || "")
                .includes(keyword)

            ||

            (customer.vehicleNumber || "")
                .toLowerCase()
                .includes(keyword)

        );

    });

    renderTable();

}

/* ==========================================================
   SUMMARY
========================================================== */

function updateSummary(){

    totalCustomers.textContent =

        customers.length;

    activeCustomers.textContent =

        customers.filter(

            customer=>customer.status==="Active"

        ).length;

    dueCustomers.textContent =

        customers.filter(

            customer=>customer.dueToday===true

        ).length;

    loanCustomers.textContent =

        customers.filter(

            customer=>

            Number(customer.loanCount)>0

        ).length;

}

/* ==========================================================
   TABLE
========================================================== */

function renderTable(){

    if(!customerTable) return;

    customerTable.innerHTML="";

    if(filteredCustomers.length===0){

        customerTable.innerHTML=`

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;padding:40px;">

                    No Customers Found

                </td>

            </tr>

        `;

        return;

    }

    filteredCustomers.forEach(customer=>{

        customerTable.innerHTML += `

<tr>

<td>

${customer.customerId || "-"}

</td>

<td>

${customer.customerName || "-"}

</td>

<td>

${customer.mobile || "-"}

</td>

<td>

${customer.loanCount || 0}

</td>

<td>

<span class="badge badge-success">

${customer.status || "Active"}

</span>

</td>

<td>

<button
class="icon-btn"
onclick="viewCustomer('${customer.id}')">

<span class="material-symbols-rounded">

visibility

</span>

</button>

<button
class="icon-btn"
onclick="editCustomer('${customer.id}')">

<span class="material-symbols-rounded">

edit

</span>

</button>

<button
class="icon-btn"
onclick="newLoan('${customer.id}')">

<span class="material-symbols-rounded">

account_balance_wallet

</span>

</button>

</td>

</tr>

`;

    });

}
/* ==========================================================
   AUTO CUSTOMER ID
========================================================== */

async function generateCustomerId(){

    return "CUS" +

        String(customers.length + 1)

        .padStart(6,"0");

}

/* ==========================================================
   DUPLICATE MOBILE
========================================================== */

function isDuplicateMobile(mobile){

    return customers.some(customer =>

        customer.mobile === mobile

    );

}

/* ==========================================================
   DUPLICATE AADHAAR
========================================================== */

function isDuplicateAadhaar(aadhaar){

    if(!aadhaar) return false;

    return customers.some(customer =>

        customer.aadhaar === aadhaar

    );

}

/* ==========================================================
   MODAL
========================================================== */

function openCustomerModal(){

    const modal =

        document.getElementById("customerModal");

    if(modal){

        modal.classList.remove("hidden");

    }

}

function closeCustomerModal(){

    const modal =

        document.getElementById("customerModal");

    if(modal){

        modal.classList.add("hidden");

    }

}

const closeModalButton =

document.getElementById("closeCustomerModal");

if(closeModalButton){

    closeModalButton.addEventListener(

        "click",

        closeCustomerModal

    );

}

/* ==========================================================
   VIEW CUSTOMER
========================================================== */

window.viewCustomer = async function(id){

    try{

        const customerRef =

            doc(db,"customers",id);

        const customerSnap =

            await getDoc(customerRef);

        if(customerSnap.exists()){

            console.log(

                customerSnap.data()

            );

            showMessage(

                "Customer details loaded.",

                "success"

            );

        }

    }

    catch(error){

        console.error(error);

        showMessage(

            "Unable to load customer.",

            "error"

        );

    }

};

/* ==========================================================
   EDIT CUSTOMER
========================================================== */

window.editCustomer = function(id){

    console.log(

        "Edit Customer :",id

    );

    showMessage(

        "Edit feature will be enabled.",

        "success"

    );

};

/* ==========================================================
   NEW LOAN
========================================================== */

window.newLoan = function(id){

    sessionStorage.setItem(

        "selectedCustomer",

        id

    );

    window.location.href =

        "loan.html";

};

/* ==========================================================
   REFRESH
========================================================== */

export async function refreshCustomers(){

    await loadCustomers();

}

/* ==========================================================
   END
========================================================== */
