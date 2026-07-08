/* =====================================================
   NAGARIK AAWAZ — DASHBOARD SCRIPT
===================================================== */

/* =====================================================
   CONTENTS

   1. Language Toggle
   2. Mobile Navigation
   3. Notification Menu
   4. Profile Dropdown
   5. Complaint Search
   6. Complaint Status Filter
   7. Table Animation
   8. Initialize Dashboard

===================================================== */



/* =====================================================
   1. LANGUAGE TOGGLE
===================================================== */

function setLang(lang) {

    document.body.classList.toggle(
        "lang-mode-en",
        lang === "en"
    );

    document
        .getElementById("btn-ne")
        .classList.toggle("active", lang === "ne");

    document
        .getElementById("btn-en")
        .classList.toggle("active", lang === "en");

    localStorage.setItem(
        "nagarikAawazLang",
        lang
    );

}



/* =====================================================
   2. MOBILE NAVIGATION
===================================================== */

function initMobileNav() {

    const menuBtn = document.getElementById("menuToggle");
    const nav = document.getElementById("navLinks");

    if (!menuBtn || !nav) return;

    menuBtn.addEventListener("click", () => {

        nav.classList.toggle("open");

    });

}



/* =====================================================
   3. NOTIFICATION DROPDOWN
===================================================== */

function initNotifications() {

    const btn = document.getElementById("notificationBtn");
    const menu = document.getElementById("notificationMenu");

    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {

        e.stopPropagation();

        menu.classList.toggle("show");

    });

    document.addEventListener("click", () => {

        menu.classList.remove("show");

    });

}



/* =====================================================
   4. PROFILE MENU
===================================================== */

function initProfileMenu() {

    const btn = document.getElementById("profileBtn");
    const menu = document.getElementById("profileMenu");

    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {

        e.stopPropagation();

        menu.classList.toggle("show");

    });

    document.addEventListener("click", () => {

        menu.classList.remove("show");

    });

}



/* =====================================================
   5. SEARCH COMPLAINTS
===================================================== */

function initSearch() {

    const input = document.getElementById("searchComplaint");

    if (!input) return;

    input.addEventListener("keyup", function () {

        const value = this.value.toLowerCase();

        const rows = document.querySelectorAll(
            "#complaintTable tbody tr"
        );

        rows.forEach(row => {

            row.style.display = row.innerText
                .toLowerCase()
                .includes(value)
                ? ""
                : "none";

        });

    });

}



/* =====================================================
   6. FILTER COMPLAINT STATUS
===================================================== */

function initStatusFilter() {

    const filter = document.getElementById("statusFilter");

    if (!filter) return;

    filter.addEventListener("change", function () {

        const status = this.value.toLowerCase();

        const rows = document.querySelectorAll(
            "#complaintTable tbody tr"
        );

        rows.forEach(row => {

            const rowStatus = row.dataset.status;

            if (
                status === "all" ||
                rowStatus === status
            ) {

                row.style.display = "";

            } else {

                row.style.display = "none";

            }

        });

    });

}



/* =====================================================
   7. TABLE FADE ANIMATION
===================================================== */

function animateRows() {

    const rows = document.querySelectorAll(
        "#complaintTable tbody tr"
    );

    rows.forEach((row, index) => {

        row.style.opacity = "0";

        row.style.transform = "translateY(12px)";

        setTimeout(() => {

            row.style.transition =
                "all .4s ease";

            row.style.opacity = "1";

            row.style.transform =
                "translateY(0px)";

        }, index * 70);

    });

}



/* =====================================================
   8. INITIALIZE
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* Restore Language */

    const savedLang =
        localStorage.getItem(
            "nagarikAawazLang"
        );

    if (savedLang === "en") {

        setLang("en");

    }

    /* Initialize Components */

    initMobileNav();

    initNotifications();

    initProfileMenu();

    initSearch();

    initStatusFilter();

    animateRows();

});