/* ==========================================================
   SR AUTO FINANCE ERP
   Validation Library
   Developed By : VTOOS Software Solutions
========================================================== */

/* ==========================================================
   REQUIRED FIELD
========================================================== */

export function isRequired(value) {

    return value !== null &&
           value !== undefined &&
           value.toString().trim() !== "";

}

/* ==========================================================
   EMAIL
========================================================== */

export function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
    );

}

/* ==========================================================
   PASSWORD
========================================================== */

export function isValidPassword(password) {

    return password.trim().length >= 6;

}

/* ==========================================================
   MOBILE NUMBER
========================================================== */

export function isValidMobile(number) {

    return /^[6-9]\d{9}$/.test(
        number.trim()
    );

}

/* ==========================================================
   CUSTOMER NAME
========================================================== */

export function isValidCustomerName(name) {

    return /^[A-Za-z .]+$/.test(
        name.trim()
    ) &&
    name.trim().length >= 3;

}

/* ==========================================================
   FATHER NAME
========================================================== */

export function isValidFatherName(name) {

    return /^[A-Za-z .]+$/.test(
        name.trim()
    ) &&
    name.trim().length >= 3;

}

/* ==========================================================
   ADDRESS
========================================================== */

export function isValidAddress(address){

    return address.trim().length >= 10;

}

/* ==========================================================
   PINCODE
========================================================== */

export function isValidPincode(code){

    return /^\d{6}$/.test(
        code.trim()
    );

}
/* ==========================================================
   AADHAAR NUMBER
========================================================== */

export function isValidAadhaar(aadhaar) {

    return /^\d{12}$/.test(
        aadhaar.trim()
    );

}

/* ==========================================================
   PAN NUMBER
========================================================== */

export function isValidPAN(pan) {

    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(
        pan.trim().toUpperCase()
    );

}

/* ==========================================================
   VEHICLE NUMBER
========================================================== */

export function isValidVehicleNumber(vehicleNo) {

    const pattern =
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

    return pattern.test(
        vehicleNo
            .replace(/\s+/g, "")
            .toUpperCase()
    );

}

/* ==========================================================
   ENGINE NUMBER
========================================================== */

export function isValidEngineNumber(engineNo) {

    return /^[A-Za-z0-9-]+$/.test(
        engineNo.trim()
    ) &&
    engineNo.trim().length >= 5;

}

/* ==========================================================
   CHASSIS NUMBER
========================================================== */

export function isValidChassisNumber(chassisNo) {

    return /^[A-Za-z0-9]+$/.test(
        chassisNo.trim()
    ) &&
    chassisNo.trim().length >= 10;

}

/* ==========================================================
   RC NUMBER
========================================================== */

export function isValidRCNumber(rcNumber) {

    return rcNumber.trim().length >= 5;

}

/* ==========================================================
   SHOWROOM REFERENCE
========================================================== */

export function isValidShowroomReference(reference) {

    return reference.trim().length >= 3;

}
/* ==========================================================
   LOAN AMOUNT
========================================================== */

export function isValidLoanAmount(amount) {

    return !isNaN(amount) &&
           Number(amount) > 0;

}

/* ==========================================================
   INTEREST
========================================================== */

export function isValidInterest(rate) {

    return !isNaN(rate) &&
           Number(rate) >= 0 &&
           Number(rate) <= 100;

}

/* ==========================================================
   EMI AMOUNT
========================================================== */

export function isValidEMI(amount) {

    return !isNaN(amount) &&
           Number(amount) > 0;

}

/* ==========================================================
   TENURE
========================================================== */

export function isValidTenure(months) {

    return !isNaN(months) &&
           Number(months) > 0;

}

/* ==========================================================
   COLLECTION AMOUNT
========================================================== */

export function isValidCollectionAmount(amount) {

    return !isNaN(amount) &&
           Number(amount) > 0;

}

/* ==========================================================
   DEPOSIT AMOUNT
========================================================== */

export function isValidDepositAmount(amount) {

    return !isNaN(amount) &&
           Number(amount) > 0;

}

/* ==========================================================
   POSITIVE NUMBER
========================================================== */

export function isPositiveNumber(value) {

    return !isNaN(value) &&
           Number(value) > 0;

}

/* ==========================================================
   DATE VALIDATION
========================================================== */

export function isValidDate(date) {

    if (!date) return false;

    const selectedDate = new Date(date);

    const today = new Date();

    today.setHours(23,59,59,999);

    return selectedDate <= today;

}

/* ==========================================================
   REMARK
========================================================== */

export function isValidRemark(text) {

    return text.trim().length <= 250;

}

/* ==========================================================
   CLEAN VALUE
========================================================== */

export function cleanValue(value) {

    return value.toString().trim();

}

/* ==========================================================
   REMOVE SPECIAL CHARACTERS
========================================================== */

export function removeSpecialCharacters(text) {

    return text.replace(/[^\w\s]/gi,"");

}

/* ==========================================================
   CURRENCY VALUE
========================================================== */

export function isCurrency(value){

    return !isNaN(value);

}

/* ==========================================================
   END OF VALIDATION LIBRARY
========================================================== */
