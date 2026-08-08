/* ==========================================================
   SR AUTO FINANCE ERP
   Common Utility Library
   Developed By : VTOOS Software Solutions
========================================================== */

/* ==========================================================
   LOADER
========================================================== */

const loader = document.getElementById("loadingOverlay");

/* ==========================================================
   SHOW LOADER
========================================================== */

export function showLoader() {

    if (!loader) return;

    loader.style.display = "flex";

}

/* ==========================================================
   HIDE LOADER
========================================================== */

export function hideLoader() {

    if (!loader) return;

    loader.style.display = "none";

}

/* ==========================================================
   MESSAGE CONTAINER
========================================================== */

const messageBox = document.getElementById("messageBox");

/* ==========================================================
   SHOW MESSAGE
========================================================== */

export function showMessage(message, type = "success") {

    if (!messageBox) {

        alert(message);

        return;

    }

    messageBox.innerText = message;

    messageBox.className = "";

    messageBox.classList.add("message");

    messageBox.classList.add(type);

    messageBox.style.display = "block";

    setTimeout(() => {

        messageBox.style.display = "none";

    }, 3000);

}

/* ==========================================================
   CLEAR MESSAGE
========================================================== */

export function clearMessage() {

    if (!messageBox) return;

    messageBox.innerHTML = "";

    messageBox.style.display = "none";

}
/* ==========================================================
   CURRENCY FORMAT
========================================================== */

export function formatCurrency(amount) {

    return new Intl.NumberFormat(

        "en-IN",

        {

            style: "currency",

            currency: "INR",

            maximumFractionDigits: 0

        }

    ).format(Number(amount));

}

/* ==========================================================
   NUMBER FORMAT
========================================================== */

export function formatNumber(number) {

    return new Intl.NumberFormat(

        "en-IN"

    ).format(Number(number));

}

/* ==========================================================
   DATE FORMAT
========================================================== */

export function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleDateString(

        "en-IN",

        {

            day: "2-digit",

            month: "2-digit",

            year: "numeric"

        }

    );

}

/* ==========================================================
   DATE & TIME FORMAT
========================================================== */

export function formatDateTime(date) {

    if (!date) return "";

    return new Date(date).toLocaleString(

        "en-IN"

    );

}

/* ==========================================================
   CONFIRM DIALOG
========================================================== */

export function confirmAction(message) {

    return confirm(message);

}

/* ==========================================================
   SUCCESS MESSAGE
========================================================== */

export function success(message) {

    showMessage(message, "success");

}

/* ==========================================================
   ERROR MESSAGE
========================================================== */

export function error(message) {

    showMessage(message, "error");

}
/* ==========================================================
   WARNING MESSAGE
========================================================== */

export function warning(message) {

    showMessage(message, "warning");

}

/* ==========================================================
   INFO MESSAGE
========================================================== */

export function info(message) {

    showMessage(message, "info");

}

/* ==========================================================
   DELAY
========================================================== */

export function delay(milliseconds) {

    return new Promise(resolve => {

        setTimeout(resolve, milliseconds);

    });

}

/* ==========================================================
   PRINT PAGE
========================================================== */

export function printPage() {

    window.print();

}

/* ==========================================================
   TIMESTAMP
========================================================== */

export function getTimestamp() {

    return new Date();

}

/* ==========================================================
   RANDOM ID
========================================================== */

export function randomId(length = 10) {

    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let result = "";

    for (let i = 0; i < length; i++) {

        result += chars.charAt(

            Math.floor(Math.random() * chars.length)

        );

    }

    return result;

}

/* ==========================================================
   DOWNLOAD JSON
========================================================== */

export function downloadJson(fileName, data) {

    const json = JSON.stringify(

        data,

        null,

        2

    );

    const blob = new Blob(

        [json],

        {

            type: "application/json"

        }

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = fileName;

    link.click();

    URL.revokeObjectURL(url);

}

/* ==========================================================
   SCROLL TO TOP
========================================================== */

export function scrollToTop() {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

/* ==========================================================
   END OF COMMON LIBRARY
========================================================== */
