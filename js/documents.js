// =====================================================
// SR AUTO FINANCE ERP
// Document Management Controller
// File: js/documents.js
// =====================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// =====================================================
// ELEMENTS
// =====================================================

const documentTableBody =
    document.getElementById("documentTableBody");

const addDocumentBtn =
    document.getElementById("addDocumentBtn");

const documentModal =
    document.getElementById("documentModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelDocumentBtn =
    document.getElementById("cancelDocumentBtn");

const documentForm =
    document.getElementById("documentForm");

const modalTitle =
    document.getElementById("modalTitle");

const saveDocumentBtn =
    document.getElementById("saveDocumentBtn");

const message =
    document.getElementById("message");


// Form fields

const documentTypeInput =
    document.getElementById("documentType");

const customerIdInput =
    document.getElementById("customerId");

const customerNameInput =
    document.getElementById("customerName");

const loanIdInput =
    document.getElementById("loanId");

const documentStatusInput =
    document.getElementById("documentStatus");

const currentHolderInput =
    document.getElementById("currentHolder");

const staffIdInput =
    document.getElementById("staffId");

const receivedDateInput =
    document.getElementById("receivedDate");

const issuedDateInput =
    document.getElementById("issuedDate");

const returnedDateInput =
    document.getElementById("returnedDate");

const documentRemarksInput =
    document.getElementById("documentRemarks");


// Filters

const searchDocumentInput =
    document.getElementById("searchDocument");

const filterDocumentInput =
    document.getElementById("filterDocument");

const filterHolderInput =
    document.getElementById("filterHolder");

const filterStatusInput =
    document.getElementById("filterStatus");


// Summary

const totalDocumentsElement =
    document.getElementById("totalDocuments");

const receivedDocumentsElement =
    document.getElementById("receivedDocuments");

const staffDocumentsElement =
    document.getElementById("staffDocuments");

const pendingDocumentsElement =
    document.getElementById("pendingDocuments");


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let documents = [];

let staffList = [];

let editingDocumentId = null;


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

    message.textContent = text;

    message.className =
        `message ${type}`;

    setTimeout(
        function () {

            if (message) {

                message.textContent = "";

                message.className =
                    "message";

            }

        },
        4000
    );
}


// =====================================================
// TODAY DATE
// =====================================================

function getTodayDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =====================================================
// SAFE HTML
// =====================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================================
// NORMALIZE
// =====================================================

function normalize(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


// =====================================================
// LOAD STAFF
// =====================================================

async function loadStaff() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "staff"
                )
            );


        staffList = [];


        snapshot.forEach(
            staffDoc => {

                const data =
                    staffDoc.data();


                const status =
                    normalize(
                        data.status
                    );


                const active =
                    data.active !== false;


                if (
                    status &&
                    status !== "active"
                ) {

                    return;

                }


                if (!active) {

                    return;

                }


                const staffName =
                    data.name ||
                    data.staffName ||
                    data.fullName ||
                    data.username ||
                    "Staff";


                const staffCode =
                    data.staffId ||
                    data.employeeId ||
                    staffDoc.id;


                staffList.push({

                    id:
                        staffDoc.id,

                    staffId:
                        staffCode,

                    name:
                        staffName,

                    mobile:
                        data.mobile ||
                        data.phone ||
                        ""

                });

            }
        );


        populateStaffDropdown();


    } catch (error) {

        console.error(
            "Staff loading error:",
            error
        );

        populateStaffDropdown();

    }

}


// =====================================================
// STAFF DROPDOWN
// =====================================================

function populateStaffDropdown() {

    if (!staffIdInput) {
        return;
    }


    staffIdInput.innerHTML = `
        <option value="">
            Select Staff
        </option>
    `;


    staffList.forEach(
        staff => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                staff.id;


            option.textContent =
                `${staff.name} (${staff.staffId})`;


            option.dataset.staffName =
                staff.name;


            option.dataset.staffCode =
                staff.staffId;


            staffIdInput.appendChild(
                option
            );

        }
    );

}


// =====================================================
// GET STAFF DETAILS
// =====================================================

function getSelectedStaff() {

    if (!staffIdInput) {

        return {
            staffId: "",
            staffName: ""
        };

    }


    const selectedId =
        staffIdInput.value;


    if (!selectedId) {

        return {
            staffId: "",
            staffName: ""
        };

    }


    const staff =
        staffList.find(
            item =>
                item.id === selectedId
        );


    if (!staff) {

        return {
            staffId: selectedId,
            staffName: ""
        };

    }


    return {

        staffId:
            staff.id,

        staffCode:
            staff.staffId,

        staffName:
            staff.name

    };

}


// =====================================================
// LOAD DOCUMENTS
// =====================================================

async function loadDocuments() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "documents"
                )
            );


        documents = [];


        snapshot.forEach(
            documentDoc => {

                const data =
                    documentDoc.data();


                documents.push({

                    id:
                        documentDoc.id,

                    ...data

                });

            }
        );


        // Latest first

        documents.sort(
            function (a, b) {

                const aTime =
                    getTimeValue(
                        a.updatedAt ||
                        a.createdAt
                    );


                const bTime =
                    getTimeValue(
                        b.updatedAt ||
                        b.createdAt
                    );


                return bTime - aTime;

            }
        );


        updateSummary();

        renderDocuments();


    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );


        if (documentTableBody) {

            documentTableBody.innerHTML = `

                <tr>

                    <td colspan="8">

                        <div class="empty-state">

                            <div class="empty-icon">
                                ⚠️
                            </div>

                            Unable to load documents.

                        </div>

                    </td>

                </tr>

            `;

        }

    }

}


// =====================================================
// TIME VALUE
// =====================================================

function getTimeValue(value) {

    if (!value) {
        return 0;
    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        value.seconds !== undefined
    ) {

        return (
            Number(value.seconds) * 1000
        );

    }


    const parsed =
        new Date(value).getTime();


    return (
        Number.isFinite(parsed)
            ? parsed
            : 0
    );

}


// =====================================================
// UPDATE SUMMARY
// =====================================================

function updateSummary() {

    const total =
        documents.length;


    let received =
        0;

    let withStaff =
        0;

    let pending =
        0;


    documents.forEach(
        item => {

            const status =
                normalize(
                    item.status
                );


            const holder =
                normalize(
                    item.currentHolder
                );


            if (
                status === "received" ||
                status === "issued" ||
                status === "returned"
            ) {

                received++;

            }


            if (
                holder === "staff"
            ) {

                withStaff++;

            }


            if (
                status === "not received"
            ) {

                pending++;

            }

        }
    );


    if (totalDocumentsElement) {

        totalDocumentsElement.textContent =
            total;

    }


    if (receivedDocumentsElement) {

        receivedDocumentsElement.textContent =
            received;

    }


    if (staffDocumentsElement) {

        staffDocumentsElement.textContent =
            withStaff;

    }


    if (pendingDocumentsElement) {

        pendingDocumentsElement.textContent =
            pending;

    }

}


// =====================================================
// FILTER DOCUMENTS
// =====================================================

function getFilteredDocuments() {

    const search =
        normalize(
            searchDocumentInput?.value
        );


    const documentFilter =
        normalize(
            filterDocumentInput?.value
        );


    const holderFilter =
        normalize(
            filterHolderInput?.value
        );


    const statusFilter =
        normalize(
            filterStatusInput?.value
        );


    return documents.filter(
        item => {

            const searchableText = [

                item.documentType,

                item.customerId,

                item.customerName,

                item.loanId,

                item.staffName,

                item.currentHolder,

                item.status,

                item.remarks

            ]
                .join(" ")
                .toLowerCase();


            if (
                search &&
                !searchableText.includes(
                    search
                )
            ) {

                return false;

            }


            if (
                documentFilter &&
                normalize(
                    item.documentType
                ) !== documentFilter
            ) {

                return false;

            }


            if (
                holderFilter &&
                normalize(
                    item.currentHolder
                ) !== holderFilter
            ) {

                return false;

            }


            if (
                statusFilter &&
                normalize(
                    item.status
                ) !== statusFilter
            ) {

                return false;

            }


            return true;

        }
    );

}


// =====================================================
// RENDER DOCUMENTS
// =====================================================

function renderDocuments() {

    if (!documentTableBody) {
        return;
    }


    const filtered =
        getFilteredDocuments();


    if (!filtered.length) {

        documentTableBody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div class="empty-state">

                        <div class="empty-icon">
                            📄
                        </div>

                        No documents found.

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    documentTableBody.innerHTML =
        filtered.map(
            item =>
                createDocumentRow(
                    item
                )
        ).join("");

}


// =====================================================
// DOCUMENT ROW
// =====================================================

function createDocumentRow(item) {

    const status =
        String(
            item.status ||
            "Not Received"
        );


    const holder =
        String(
            item.currentHolder ||
            "Office"
        );


    return `

        <tr>

            <!-- DOCUMENT -->

            <td>

                <div class="document-name">
                    ${escapeHtml(
                        item.documentType ||
                        "Document"
                    )}
                </div>

                <div class="document-id">
                    DOC-${escapeHtml(
                        item.id.slice(-6)
                    ).toUpperCase()}
                </div>

            </td>


            <!-- CUSTOMER -->

            <td>

                <strong>
                    ${escapeHtml(
                        item.customerName ||
                        "-"
                    )}
                </strong>

                ${
                    item.customerId
                        ? `
                            <div class="sub-text">
                                ${escapeHtml(
                                    item.customerId
                                )}
                            </div>
                          `
                        : ""
                }

            </td>


            <!-- LOAN -->

            <td>

                ${
                    item.loanId
                        ? escapeHtml(
                            item.loanId
                        )
                        : "-"
                }

            </td>


            <!-- STATUS -->

            <td>

                <span
                    class="badge ${getStatusClass(
                        status
                    )}"
                >
                    ${escapeHtml(status)}
                </span>

            </td>


            <!-- HOLDER -->

            <td>

                <span
                    class="badge ${getHolderClass(
                        holder
                    )}"
                >
                    ${escapeHtml(holder)}
                </span>

            </td>


            <!-- STAFF -->

            <td>

                ${
                    item.staffName
                        ? `
                            <strong>
                                ${escapeHtml(
                                    item.staffName
                                )}
                            </strong>

                            ${
                                item.staffCode
                                    ? `
                                        <div class="sub-text">
                                            ${escapeHtml(
                                                item.staffCode
                                            )}
                                        </div>
                                      `
                                    : ""
                            }
                          `
                        : "-"
                }

            </td>


            <!-- LAST ACTION -->

            <td>

                ${
                    item.lastAction
                        ? `
                            <strong>
                                ${escapeHtml(
                                    item.lastAction
                                )}
                            </strong>
                          `
                        : "-"
                }

                ${
                    item.lastActionDate
                        ? `
                            <div class="sub-text">
                                ${escapeHtml(
                                    item.lastActionDate
                                )}
                            </div>
                          `
                        : ""
                }

            </td>


            <!-- ACTION -->

            <td>

                <button
                    class="action-btn"
                    onclick="window.editDocument('${escapeHtml(
                        item.id
                    )}')"
                >
                    View / Edit
                </button>

            </td>

        </tr>

    `;

}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    switch (
        normalize(status)
    ) {

        case "received":
            return "received";

        case "issued":
            return "with-staff";

        case "returned":
            return "returned";

        case "not received":
            return "not-received";

        default:
            return "not-received";

    }

}


// =====================================================
// HOLDER CLASS
// =====================================================

function getHolderClass(holder) {

    switch (
        normalize(holder)
    ) {

        case "staff":
            return "with-staff";

        case "owner":
            return "with-owner";

        case "customer":
            return "with-customer";

        case "office":
            return "office";

        default:
            return "office";

    }

}


// =====================================================
// OPEN MODAL
// =====================================================

function openModal(
    documentData = null
) {

    if (!documentModal) {
        return;
    }


    if (documentData) {

        editingDocumentId =
            documentData.id;


        if (modalTitle) {

            modalTitle.textContent =
                "Edit Document";

        }


        documentTypeInput.value =
            documentData.documentType ||
            "";

        customerIdInput.value =
            documentData.customerId ||
            "";

        customerNameInput.value =
            documentData.customerName ||
            "";

        loanIdInput.value =
            documentData.loanId ||
            "";

        documentStatusInput.value =
            documentData.status ||
            "Not Received";

        currentHolderInput.value =
            documentData.currentHolder ||
            "Office";

        staffIdInput.value =
            documentData.staffId ||
            "";

        receivedDateInput.value =
            documentData.receivedDate ||
            "";

        issuedDateInput.value =
            documentData.issuedDate ||
            "";

        returnedDateInput.value =
            documentData.returnedDate ||
            "";

        documentRemarksInput.value =
            documentData.remarks ||
            "";


        if (saveDocumentBtn) {

            saveDocumentBtn.textContent =
                "Update Document";

        }

    } else {

        editingDocumentId =
            null;


        if (modalTitle) {

            modalTitle.textContent =
                "Add Document";

        }


        documentForm.reset();


        documentStatusInput.value =
            "Not Received";


        currentHolderInput.value =
            "Office";


        if (saveDocumentBtn) {

            saveDocumentBtn.textContent =
                "Save Document";

        }

    }


    documentModal.classList.add(
        "show"
    );

}


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal() {

    if (!documentModal) {
        return;
    }


    documentModal.classList.remove(
        "show"
    );


    editingDocumentId =
        null;


    if (documentForm) {

        documentForm.reset();

    }


    if (modalTitle) {

        modalTitle.textContent =
            "Add Document";

    }


    if (saveDocumentBtn) {

        saveDocumentBtn.textContent =
            "Save Document";

    }

}


// =====================================================
// CHECK DUPLICATE DOCUMENT
// =====================================================

function findDuplicateDocument(
    documentType,
    customerId,
    loanId,
    ignoreId = null
) {

    const type =
        normalize(
            documentType
        );


    const customer =
        normalize(
            customerId
        );


    const loan =
        normalize(
            loanId
        );


    return documents.find(
        item => {

            if (
                ignoreId &&
                item.id === ignoreId
            ) {

                return false;

            }


            const sameType =
                normalize(
                    item.documentType
                ) === type;


            const sameCustomer =
                normalize(
                    item.customerId
                ) === customer;


            const sameLoan =
                normalize(
                    item.loanId
                ) === loan;


            if (
                !sameType ||
                !sameCustomer
            ) {

                return false;

            }


            /*
             * Loan-linked document:
             * same customer + same loan + same document
             */

            if (loan) {

                return sameLoan;

            }


            /*
             * No loan ID:
             * same customer + same document
             */

            return true;

        }
    );

}


// =====================================================
// SAVE DOCUMENT
// =====================================================

async function saveDocument(
    event
) {

    event.preventDefault();


    if (!currentUser) {

        showMessage(
            "User session not available."
        );

        return;

    }


    const documentType =
        documentTypeInput.value.trim();


    const customerId =
        customerIdInput.value.trim();


    const customerName =
        customerNameInput.value.trim();


    const loanId =
        loanIdInput.value.trim();


    const status =
        documentStatusInput.value;


    const currentHolder =
        currentHolderInput.value;


    const receivedDate =
        receivedDateInput.value;


    const issuedDate =
        issuedDateInput.value;


    const returnedDate =
        returnedDateInput.value;


    const remarks =
        documentRemarksInput.value.trim();


    if (!documentType) {

        showMessage(
            "Please select document type."
        );

        return;

    }


    if (!status) {

        showMessage(
            "Please select document status."
        );

        return;

    }


    if (!currentHolder) {

        showMessage(
            "Please select current holder."
        );

        return;

    }


    /*
     * Staff is mandatory when holder is Staff
     */

    if (
        normalize(currentHolder) ===
        "staff" &&
        !staffIdInput.value
    ) {

        showMessage(
            "Please select the responsible staff."
        );

        return;

    }


    /*
     * Duplicate protection
     */

    const duplicate =
        findDuplicateDocument(
            documentType,
            customerId,
            loanId,
            editingDocumentId
        );


    if (duplicate) {

        showMessage(
            `This document already exists for ${duplicate.customerName || "this customer"}${duplicate.loanId ? ` / ${duplicate.loanId}` : ""}. Please edit the existing document instead.`,
            "error"
        );

        return;

    }


    if (saveDocumentBtn) {

        saveDocumentBtn.disabled =
            true;

        saveDocumentBtn.textContent =
            "Saving...";

    }


    try {

        const selectedStaff =
            getSelectedStaff();


        /*
         * Determine action
         */

        let lastAction =
            "Document Updated";


        if (
            normalize(status) ===
            "received"
        ) {

            lastAction =
                "Document Received";

        }


        if (
            normalize(status) ===
            "issued"
        ) {

            lastAction =
                "Document Issued";

        }


        if (
            normalize(status) ===
            "returned"
        ) {

            lastAction =
                "Document Returned";

        }


        /*
         * New document
         */

        if (!editingDocumentId) {

            const documentData = {

                documentType:
                    documentType,

                customerId:
                    customerId,

                customerName:
                    customerName,

                loanId:
                    loanId,

                status:
                    status,

                currentHolder:
                    currentHolder,

                staffId:
                    selectedStaff.staffId || "",

                staffCode:
                    selectedStaff.staffCode || "",

                staffName:
                    selectedStaff.staffName || "",

                receivedDate:
                    receivedDate,

                issuedDate:
                    issuedDate,

                returnedDate:
                    returnedDate,

                remarks:
                    remarks,

                lastAction:
                    lastAction,

                lastActionDate:
                    getTodayDate(),

                history: [

                    {

                        action:
                            lastAction,

                        status:
                            status,

                        currentHolder:
                            currentHolder,

                        staffId:
                            selectedStaff.staffId || "",

                        staffName:
                            selectedStaff.staffName || "",

                        date:
                            getTodayDate(),

                        remarks:
                            remarks

                    }

                ],

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp(),

                createdBy:
                    currentUser.uid

            };


            await addDoc(
                collection(
                    db,
                    "documents"
                ),
                documentData
            );


            showMessage(
                "Document saved successfully.",
                "success"
            );

        }


        /*
         * Existing document update
         */

        else {

            const existing =
                documents.find(
                    item =>
                        item.id ===
                        editingDocumentId
                );


            if (!existing) {

                throw new Error(
                    "Document not found."
                );

            }


            /*
             * History
             */

            const oldHistory =
                Array.isArray(
                    existing.history
                )
                    ? existing.history
                    : [];


            const history = [
                ...oldHistory
            ];


            const changed =
                hasDocumentChanged(
                    existing,
                    {
                        documentType,
                        customerId,
                        customerName,
                        loanId,
                        status,
                        currentHolder,
                        receivedDate,
                        issuedDate,
                        returnedDate,
                        remarks,
                        staffId:
                            selectedStaff.staffId || "",
                        staffName:
                            selectedStaff.staffName || ""
                    }
                );


            if (changed) {

                history.push({

                    action:
                        lastAction,

                    status:
                        status,

                    currentHolder:
                        currentHolder,

                    staffId:
                        selectedStaff.staffId || "",

                    staffName:
                        selectedStaff.staffName || "",

                    date:
                        getTodayDate(),

                    remarks:
                        remarks

                });

            }


            const documentRef =
                doc(
                    db,
                    "documents",
                    editingDocumentId
                );


            await updateDoc(
                documentRef,
                {

                    documentType:
                        documentType,

                    customerId:
                        customerId,

                    customerName:
                        customerName,

                    loanId:
                        loanId,

                    status:
                        status,

                    currentHolder:
                        currentHolder,

                    staffId:
                        selectedStaff.staffId || "",

                    staffCode:
                        selectedStaff.staffCode || "",

                    staffName:
                        selectedStaff.staffName || "",

                    receivedDate:
                        receivedDate,

                    issuedDate:
                        issuedDate,

                    returnedDate:
                        returnedDate,

                    remarks:
                        remarks,

                    lastAction:
                        lastAction,

                    lastActionDate:
                        getTodayDate(),

                    history:
                        history,

                    updatedAt:
                        serverTimestamp()

                }
            );


            showMessage(
                "Document updated successfully.",
                "success"
            );

        }


        closeModal();

        await loadDocuments();


    } catch (error) {

        console.error(
            "Document save error:",
            error
        );


        showMessage(
            "Unable to save document. Please try again."
        );

    } finally {

        if (saveDocumentBtn) {

            saveDocumentBtn.disabled =
                false;

            saveDocumentBtn.textContent =
                editingDocumentId
                    ? "Update Document"
                    : "Save Document";

        }

    }

}


// =====================================================
// CHECK CHANGES
// =====================================================

function hasDocumentChanged(
    oldData,
    newData
) {

    const fields = [

        "documentType",
        "customerId",
        "customerName",
        "loanId",
        "status",
        "currentHolder",
        "receivedDate",
        "issuedDate",
        "returnedDate",
        "remarks",
        "staffId",
        "staffName"

    ];


    return fields.some(
        field => {

            return normalize(
                oldData[field]
            ) !== normalize(
                newData[field]
            );

        }
    );

}


// =====================================================
// EDIT DOCUMENT
// =====================================================

window.editDocument =
    function (id) {

        const item =
            documents.find(
                document =>
                    document.id === id
            );


        if (!item) {

            showMessage(
                "Document not found."
            );

            return;

        }


        openModal(item);

    };


// =====================================================
// EVENTS
// =====================================================

if (addDocumentBtn) {

    addDocumentBtn.addEventListener(
        "click",
        function () {

            openModal();

        }
    );

}


if (closeModalBtn) {

    closeModalBtn.addEventListener(
        "click",
        closeModal
    );

}


if (cancelDocumentBtn) {

    cancelDocumentBtn.addEventListener(
        "click",
        closeModal
    );

}


if (documentForm) {

    documentForm.addEventListener(
        "submit",
        saveDocument
    );

}


// =====================================================
// FILTER EVENTS
// =====================================================

[
    searchDocumentInput,
    filterDocumentInput,
    filterHolderInput,
    filterStatusInput
].forEach(
    element => {

        if (!element) {
            return;
        }


        element.addEventListener(
            "input",
            renderDocuments
        );


        element.addEventListener(
            "change",
            renderDocuments
        );

    }
);


// =====================================================
// AUTO HOLDER / STAFF LOGIC
// =====================================================

if (currentHolderInput) {

    currentHolderInput.addEventListener(
        "change",
        function () {

            const holder =
                normalize(
                    currentHolderInput.value
                );


            if (holder !== "staff") {

                staffIdInput.value =
                    "";

            }

        }
    );

}


// =====================================================
// AUTO DATE LOGIC
// =====================================================

if (documentStatusInput) {

    documentStatusInput.addEventListener(
        "change",
        function () {

            const status =
                normalize(
                    documentStatusInput.value
                );


            const today =
                getTodayDate();


            if (
                status === "received" &&
                !receivedDateInput.value
            ) {

                receivedDateInput.value =
                    today;

            }


            if (
                status === "issued" &&
                !issuedDateInput.value
            ) {

                issuedDateInput.value =
                    today;

            }


            if (
                status === "returned" &&
                !returnedDateInput.value
            ) {

                returnedDateInput.value =
                    today;

            }

        }
    );

}


// =====================================================
// MODAL OUTSIDE CLICK
// =====================================================

if (documentModal) {

    documentModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                documentModal
            ) {

                closeModal();

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


        currentUser =
            user;


        await loadStaff();

        await loadDocuments();

    }
);
