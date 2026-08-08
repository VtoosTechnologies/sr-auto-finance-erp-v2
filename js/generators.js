/* ==========================================================
   SR AUTO FINANCE ERP
   Auto Number Generator Library
   Developed By : VTOOS Software Solutions
========================================================== */

/* ==========================================================
   GET CURRENT YEAR
========================================================== */

export function getCurrentYear() {

    return new Date().getFullYear();

}

/* ==========================================================
   PAD NUMBER
========================================================== */

export function padNumber(number, length = 6) {

    return String(number).padStart(length, "0");

}

/* ==========================================================
   CUSTOMER ID
========================================================== */

export function generateCustomerId(lastNumber) {

    return `CUS-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   LOAN NUMBER
========================================================== */

export function generateLoanNumber(lastNumber) {

    return `SR-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   RECEIPT NUMBER
========================================================== */

export function generateReceiptNumber(lastNumber) {

    return `RC-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   COLLECTION NUMBER
========================================================== */

export function generateCollectionNumber(lastNumber) {

    return `COL-${getCurrentYear()}-${padNumber(lastNumber)}`;

}
/* ==========================================================
   DEPOSIT NUMBER
========================================================== */

export function generateDepositNumber(lastNumber) {

    return `DEP-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   USER NUMBER
========================================================== */

export function generateUserNumber(lastNumber) {

    return `USR-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   SHOWROOM NUMBER
========================================================== */

export function generateShowroomNumber(lastNumber) {

    return `SHR-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   DOCUMENT NUMBER
========================================================== */

export function generateDocumentNumber(lastNumber) {

    return `DOC-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   AUDIT NUMBER
========================================================== */

export function generateAuditNumber(lastNumber) {

    return `AUD-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   RC NUMBER
========================================================== */

export function generateRCNumber(lastNumber) {

    return `RCM-${getCurrentYear()}-${padNumber(lastNumber)}`;

}

/* ==========================================================
   AUTO REFERENCE NUMBER
========================================================== */

export function generateReference(prefix, lastNumber) {

    return `${prefix}-${getCurrentYear()}-${padNumber(lastNumber)}`;

}
