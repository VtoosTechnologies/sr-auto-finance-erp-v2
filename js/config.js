/* ==========================================================
   SR AUTO FINANCE ERP
   Master Configuration
   Developed By : VTOOS Software Solutions
========================================================== */

export const APP_CONFIG = {

    /* ======================================================
       COMPANY
    ====================================================== */

    COMPANY_NAME: "SR Auto Finance",

    SOFTWARE_NAME: "SR Auto Finance ERP",

    DEVELOPER: "VTOOS Software Solutions",

    VERSION: "1.0.0",

    CURRENCY: "INR",

    COUNTRY: "India",

    LANGUAGE: "en",

    DATE_FORMAT: "dd-MM-yyyy",

    TIME_FORMAT: "12h"

};

/* ==========================================================
   NUMBER PREFIX
========================================================== */

export const PREFIX = {

    CUSTOMER: "CUS",

    LOAN: "SR",

    RECEIPT: "RC",

    COLLECTION: "COL",

    DEPOSIT: "DEP",

    SHOWROOM: "SHR",

    USER: "USR",

    AUDIT: "AUD",

    DOCUMENT: "DOC"

};

/* ==========================================================
   USER ROLE
========================================================== */

export const USER_ROLE = {

    ADMIN: "admin",

    OWNER: "owner",

    MANAGER: "manager",

    COLLECTION: "collection"

};
/* ==========================================================
   LOAN CONFIGURATION
========================================================== */

export const LOAN_CONFIG = {

    INTEREST_TYPE: "Flat",

    EMI_TYPE: "Monthly",

    ALLOW_MULTIPLE_ACTIVE_LOANS: true,

    ALLOW_RELOAN: true,

    AUTO_LOAN_NUMBER: true,

    AUTO_RECEIPT_NUMBER: true,

    AUTO_CUSTOMER_NUMBER: true

};

/* ==========================================================
   RC CONFIGURATION
========================================================== */

export const RC_CONFIG = {

    SIGNATURE_REQUIRED: true,

    PHOTO_REQUIRED: false,

    OWNER_APPROVAL_REQUIRED: true

};

/* ==========================================================
   COLLECTION CONFIGURATION
========================================================== */

export const COLLECTION_CONFIG = {

    OWNER_APPROVAL_REQUIRED: true,

    ALLOW_EDIT_MINUTES: 15,

    DAILY_DEPOSIT_REQUIRED: true,

    MAX_HOLD_DAYS: 2

};

/* ==========================================================
   DASHBOARD
========================================================== */

export const DASHBOARD = {

    SUMMARY_CARDS: 4,

    MENU_COLUMNS: 4,

    SHOW_RECENT_COLLECTIONS: true,

    SHOW_PENDING_DEPOSITS: true,

    SHOW_RC_PENDING: true

};
