/* =========================================================
   LifeDesk Desktop App
   app.js
========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const APP_NAME = "LifeDesk";
const STORAGE_KEY = "lifedesk_database_v1";
const THEME_KEY = "lifedesk_theme";
const VERSION = "1.0.0";

const DEFAULT_DB = {
    user: {
        name: "کاربر",
        email: "",
        avatar: "ک",
        xp: 0,
        level: 1,
        createdAt: new Date().toISOString()
    },

    tasks: [],

    notes: [],

    habits: [],

    events: [],

    transactions: [],

    files: [],

    settings: {
        notifications: true,
        sound: true,
        autoSave: true,
        startPage: "dashboard",
        currency: "تومان",
        language: "fa",
        theme: "dark"
    },

    focus: {
        sessions: 0,
        completed: 0,
        totalMinutes: 0
    }
};


/* =========================================================
   STATE
========================================================= */

let db = loadDatabase();

let state = {
    currentPage: db.settings.startPage || "dashboard",

    search: "",

    taskFilter: "all",

    calendarDate: new Date(),

    focusMode: "focus",

    focusDuration: 25,

    focusRemaining: 25 * 60,

    focusRunning: false,

    focusInterval: null,

    sidebarCollapsed: false,

    modalOpen: false
};


/* =========================================================
   DOM
========================================================= */

const app = document.querySelector("#app");


/* =========================================================
   DATABASE
========================================================= */

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function loadDatabase() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return clone(DEFAULT_DB);
        }

        const parsed = JSON.parse(saved);

        return mergeDatabase(clone(DEFAULT_DB), parsed);
    } catch (error) {
        console.error(error);
        return clone(DEFAULT_DB);
    }
}

function mergeDatabase(base, source) {
    if (!source || typeof source !== "object") {
        return base;
    }

    for (const key of Object.keys(base)) {
        if (
            source[key] !== undefined &&
            typeof base[key] === "object" &&
            !Array.isArray(base[key]) &&
            base[key] !== null
        ) {
            base[key] = mergeDatabase(base[key], source[key]);
        } else if (source[key] !== undefined) {
            base[key] = source[key];
        }
    }

    return base;
}

function saveDatabase(showToast = false) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(db)
        );

        if (showToast) {
            toast("اطلاعات با موفقیت ذخیره شد", "success");
        }

        updateStatus();
    } catch (error) {
        console.error(error);
        toast("ذخیره اطلاعات انجام نشد", "error");
    }
}


/* =========================================================
   ID
========================================================= */

function uid(prefix = "id") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 8)
    );
}


/* =========================================================
   DATE HELPERS
========================================================= */

function todayISO() {
    const d = new Date();

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "";

    const d = new Date(dateString);

    if (Number.isNaN(d.getTime())) {
        return dateString;
    }

    return new Intl.DateTimeFormat(
        "fa-IR",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    ).format(d);
}

function formatMoney(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("fa-IR").format(number) +
        " " +
        (db.settings.currency || "تومان");
}

function monthName(month) {
    return new Intl.DateTimeFormat(
        "fa-IR",
        { month: "long" }
    ).format(
        new Date(2024, month, 1)
    );
}

function weekDayName(index) {
    const base = new Date(2024, 0, 7 + index);

    return new Intl.DateTimeFormat(
        "fa-IR",
        { weekday: "short" }
    ).format(base);
}


/* =========================================================
   XP
========================================================= */

function addXP(amount) {
    const value = Math.max(0, Number(amount || 0));

    db.user.xp += value;

    const newLevel =
        Math.floor(db.user.xp / 500) + 1;

    if (newLevel > db.user.level) {
        db.user.level = newLevel;

        toast(
            `تبریک! به سطح ${newLevel} رسیدید 🎉`,
            "success"
        );
    }

    saveDatabase();
}


/* =========================================================
   THEME
========================================================= */

function applyTheme(theme = db.settings.theme) {
    db.settings.theme = theme;

    document.body.classList.toggle(
        "light-theme",
        theme === "light"
    );

    localStorage.setItem(
        THEME_KEY,
        theme
    );
}

function loadTheme() {
    const savedTheme =
        localStorage.getItem(THEME_KEY);

    if (savedTheme) {
        db.settings.theme = savedTheme;
    }

    applyTheme(db.settings.theme);
}


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {
    if (!app) {
        console.error(
            "LifeDesk: #app پیدا نشد."
        );
        return;
    }

    loadTheme();

    renderShell();

    navigate(
        state.currentPage,
        false
    );

    bindGlobalEvents();

    updateClock();

    setInterval(
        updateClock,
        1000
    );

    updateStatus();
}

document.addEventListener(
    "DOMContentLoaded",
    init
);


/* =========================================================
   SHELL
========================================================= */

function renderShell() {
    app.innerHTML = `
        <div class="app-shell">

            <aside
                class="sidebar"
                id="sidebar"
            >

                <div class="brand">

                    <div class="brand-logo">
                        ✦
                    </div>

                    <div class="brand-info">
                        <strong>${APP_NAME}</strong>
                        <small>DESKTOP EDITION</small>
                    </div>

                </div>

                <div class="sidebar-profile">

                    <div class="profile-avatar">
                        ${escapeHTML(
                            db.user.avatar ||
                            db.user.name?.charAt(0) ||
                            "ک"
                        )}
                    </div>

                    <div>
                        <strong>
                            ${escapeHTML(
                                db.user.name || "کاربر"
                            )}
                        </strong>

                        <small>
                            سطح ${db.user.level}
                        </small>
                    </div>

                </div>

                <nav
                    class="main-navigation"
                    id="mainNavigation"
                >

                    ${navItem(
                        "dashboard",
                        "⌂",
                        "داشبورد"
                    )}

                    ${navItem(
                        "tasks",
                        "✓",
                        "کارها"
                    )}

                    ${navItem(
                        "calendar",
                        "▣",
                        "تقویم"
                    )}

                    ${navItem(
                        "notes",
                        "✎",
                        "یادداشت‌ها"
                    )}

                    ${navItem(
                        "habits",
                        "♧",
                        "عادت‌ها"
                    )}

                    ${navItem(
                        "focus",
                        "◷",
                        "تمرکز"
                    )}

                    ${navItem(
                        "finance",
                        "﷼",
                        "مالی"
                    )}

                    ${navItem(
                        "files",
                        "▱",
                        "فایل‌ها"
                    )}

                    ${navItem(
                        "reports",
                        "▥",
                        "گزارش‌ها"
                    )}

                    <div class="navigation-separator"></div>

                    ${navItem(
                        "settings",
                        "⚙",
                        "تنظیمات"
                    )}

                </nav>

                <div class="sidebar-xp">

                    <div class="xp-header">
                        <span>
                            پیشرفت
                        </span>

                        <strong>
                            سطح ${db.user.level}
                        </strong>
                    </div>

                    <div class="xp-progress">
                        <div
                            class="xp-progress-bar"
                            id="sidebarXP"
                            style="
                                width:
                                ${xpPercent()}%
                            "
                        ></div>
                    </div>

                    <small>
                        ${db.user.xp % 500}
                        / 500 XP
                    </small>

                </div>

                <div class="sidebar-footer">
                    <span>
                        LifeDesk
                    </span>

                    <span>
                        v${VERSION}
                    </span>
                </div>

            </aside>


            <main class="main-area">

                <header class="topbar">

                    <div class="topbar-left">

                        <button
                            class="icon-button"
                            id="sidebarToggle"
                            title="منو"
                        >
                            ☰
                        </button>

                        <div
                            class="page-heading"
                            id="pageHeading"
                        >
                        </div>

                    </div>


                    <div class="topbar-right">

                        <div class="search-box">

                            <span>⌕</span>

                            <input
                                id="globalSearch"
                                type="search"
                                placeholder="جستجو..."
                            >

                            <kbd>Ctrl K</kbd>

                        </div>


                        <button
                            class="icon-button"
                            id="quickAdd"
                            title="افزودن سریع"
                        >
                            ＋
                        </button>


                        <button
                            class="icon-button"
                            id="themeToggle"
                            title="تغییر تم"
                        >
                            ◐
                        </button>


                        <button
                            class="user-menu-button"
                            id="userMenu"
                        >

                            <div class="top-avatar">
                                ${escapeHTML(
                                    db.user.avatar ||
                                    db.user.name?.charAt(0) ||
                                    "ک"
                                )}
                            </div>

                            <span class="top-user-name">
                                ${escapeHTML(
                                    db.user.name ||
                                    "کاربر"
                                )}
                            </span>

                            <span>⌄</span>

                        </button>

                    </div>

                </header>


                <section
                    class="page-container"
                    id="pageContainer"
                >
                </section>


                <footer class="statusbar">

                    <span id="statusMessage">
                        آماده
                    </span>

                    <div class="status-right">

                        <span id="clock">
                            --
                        </span>

                        <span>
                            اطلاعات محلی
                        </span>

                    </div>

                </footer>

            </main>

        </div>

        <div
            id="modalRoot"
            class="modal-root hidden"
        ></div>

        <div
            id="toastContainer"
            class="toast-container"
        ></div>

        <div
            id="contextMenu"
            class="context-menu hidden"
        ></div>
    `;

    updateActiveNav();
}


/* =========================================================
   NAV
========================================================= */

function navItem(id, icon, label) {
    return `
        <button
            class="nav-item"
            data-page="${id}"
        >

            <span class="nav-icon">
                ${icon}
            </span>

            <span class="nav-label">
                ${label}
            </span>

        </button>
    `;
}

const PAGE_META = {
    dashboard: {
        title: "داشبورد",
        subtitle: "مرکز مدیریت زندگی و کارهای روزانه"
    },

    tasks: {
        title: "کارها",
        subtitle: "مدیریت کارهای روزانه"
    },

    calendar: {
        title: "تقویم",
        subtitle: "برنامه‌ها و رویدادها"
    },

    notes: {
        title: "یادداشت‌ها",
        subtitle: "ایده‌ها و نوشته‌های شما"
    },

    habits: {
        title: "عادت‌ها",
        subtitle: "ساخت عادت‌های بهتر"
    },

    focus: {
        title: "تمرکز",
        subtitle: "Pomodoro و مدیریت زمان"
    },

    finance: {
        title: "مدیریت مالی",
        subtitle: "درآمدها و هزینه‌ها"
    },

    files: {
        title: "فایل‌ها",
        subtitle: "مدیریت فایل‌های برنامه"
    },

    reports: {
        title: "گزارش‌ها",
        subtitle: "آمار و عملکرد شما"
    },

    settings: {
        title: "تنظیمات",
        subtitle: "تنظیم برنامه و اطلاعات کاربر"
    }
};


/* =========================================================
   NAVIGATE
========================================================= */

function navigate(page, push = true) {
    if (!PAGE_META[page]) {
        page = "dashboard";
    }

    state.currentPage = page;

    if (push) {
        window.location.hash = page;
    }

    renderPage(page);

    updateActiveNav();

    updatePageHeading();

    closeContextMenu();
}

function updateActiveNav() {
    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page ===
                state.currentPage
            );

        });
}

function updatePageHeading() {
    const heading =
        document.querySelector(
            "#pageHeading"
        );

    if (!heading) return;

    const meta =
        PAGE_META[state.currentPage];

    heading.innerHTML = `
        <h1>
            ${meta.title}
        </h1>

        <p>
            ${meta.subtitle}
        </p>
    `;
}


/* =========================================================
   RENDER PAGE
========================================================= */

function renderPage(page) {
    const container =
        document.querySelector(
            "#pageContainer"
        );

    if (!container) return;

    switch (page) {

        case "dashboard":
            container.innerHTML =
                renderDashboard();
            break;

        case "tasks":
            container.innerHTML =
                renderTasks();
            break;

        case "calendar":
            container.innerHTML =
                renderCalendar();
            break;

        case "notes":
            container.innerHTML =
                renderNotes();
            break;

        case "habits":
            container.innerHTML =
                renderHabits();
            break;

        case "focus":
            container.innerHTML =
                renderFocus();
            break;

        case "finance":
            container.innerHTML =
                renderFinance();
            break;

        case "files":
            container.innerHTML =
                renderFiles();
            break;

        case "reports":
            container.innerHTML =
                renderReports();
            break;

        case "settings":
            container.innerHTML =
                renderSettings();
            break;

        default:
            container.innerHTML =
                renderDashboard();
    }

    if (state.search) {
        applyPageSearch();
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
    const totalTasks =
        db.tasks.length;

    const completedTasks =
        db.tasks.filter(
            t => t.completed
        ).length;

    const pendingTasks =
        totalTasks - completedTasks;

    const habits =
        db.habits.length;

    const todayEvents =
        db.events.filter(
            e => e.date === todayISO()
        ).length;

    const balance =
        calculateBalance();

    return `
        <div class="page">

            <section class="welcome-hero">

                <div class="welcome-content">

                    <span class="eyebrow">
                        PERSONAL WORKSPACE
                    </span>

                    <h2>
                        سلام ${escapeHTML(
                            db.user.name || "کاربر"
                        )} 👋
                    </h2>

                    <p>
                        همه چیزهایی که برای مدیریت
                        روز، کار، تمرکز، عادت‌ها،
                        یادداشت‌ها و امور مالی نیاز داری
                        در یک برنامه.
                    </p>

                    <div class="hero-actions">

                        <button
                            class="primary-button"
                            data-action="add-task"
                        >
                            ＋ کار جدید
                        </button>

                        <button
                            class="secondary-button"
                            data-action="open-focus"
                        >
                            ◷ شروع تمرکز
                        </button>

                    </div>

                </div>

                <div class="welcome-visual">

                    <div
                        class="visual-circle circle-one"
                    ></div>

                    <div
                        class="visual-circle circle-two"
                    ></div>

                    <div class="visual-center">
                        ✦
                    </div>

                </div>

            </section>


            <section class="stats-grid">

                ${statCard(
                    "✓",
                    "purple",
                    "کل کارها",
                    totalTasks,
                    `${pendingTasks} باقی مانده`
                )}

                ${statCard(
                    "★",
                    "green",
                    "کارهای انجام‌شده",
                    completedTasks,
                    totalTasks
                        ? `${Math.round(
                            completedTasks /
                            totalTasks * 100
                        )}% تکمیل`
                        : "هنوز کاری ثبت نشده"
                )}

                ${statCard(
                    "♧",
                    "orange",
                    "عادت‌ها",
                    habits,
                    "عادت فعال"
                )}

                ${statCard(
                    "﷼",
                    "blue",
                    "موجودی",
                    formatMoney(balance),
                    `${todayEvents} رویداد امروز`
                )}

            </section>


            <section class="dashboard-grid">

                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                کارهای امروز
                            </h3>

                            <p>
                                کارهایی که باید انجام شوند
                            </p>
                        </div>

                        <button
                            class="text-button"
                            data-page-link="tasks"
                        >
                            مشاهده همه
                        </button>

                    </div>

                    <div class="task-preview-list">

                        ${renderDashboardTasks()}

                    </div>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                دسترسی سریع
                            </h3>

                            <p>
                                کارهای پرکاربرد
                            </p>
                        </div>

                    </div>

                    <div class="quick-actions">

                        <button
                            class="quick-action"
                            data-action="add-task"
                        >
                            <span>✓</span>
                            <b>کار جدید</b>
                            <small>افزودن وظیفه</small>
                        </button>

                        <button
                            class="quick-action"
                            data-action="add-note"
                        >
                            <span>✎</span>
                            <b>یادداشت</b>
                            <small>ثبت ایده</small>
                        </button>

                        <button
                            class="quick-action"
                            data-action="add-event"
                        >
                            <span>▣</span>
                            <b>رویداد</b>
                            <small>برنامه‌ریزی</small>
                        </button>

                        <button
                            class="quick-action"
                            data-action="add-transaction"
                        >
                            <span>﷼</span>
                            <b>تراکنش</b>
                            <small>ثبت هزینه</small>
                        </button>

                    </div>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                عادت‌های امروز
                            </h3>

                            <p>
                                روند پیشرفت
                            </p>
                        </div>

                        <button
                            class="text-button"
                            data-page-link="habits"
                        >
                            مدیریت
                        </button>

                    </div>

                    <div class="habit-preview-list">

                        ${renderDashboardHabits()}

                    </div>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                وضعیت تمرکز
                            </h3>

                            <p>
                                آمار جلسات تمرکز
                            </p>
                        </div>

                        <button
                            class="text-button"
                            data-page-link="focus"
                        >
                            باز کردن
                        </button>

                    </div>

                    <div class="summary-grid">

                        <div class="summary-item">
                            <span>جلسات</span>
                            <strong>
                                ${db.focus.sessions}
                            </strong>
                        </div>

                        <div class="summary-item">
                            <span>کامل‌شده</span>
                            <strong>
                                ${db.focus.completed}
                            </strong>
                        </div>

                        <div class="summary-item">
                            <span>دقیقه</span>
                            <strong>
                                ${db.focus.totalMinutes}
                            </strong>
                        </div>

                        <div class="summary-item">
                            <span>XP</span>
                            <strong>
                                ${db.user.xp}
                            </strong>
                        </div>

                    </div>

                </div>

            </section>

        </div>
    `;
}

function statCard(icon, color, title, value, subtitle) {
    return `
        <div class="stat-card">

            <div class="stat-icon ${color}">
                ${icon}
            </div>

            <div>

                <span>${title}</span>

                <strong>
                    ${value}
                </strong>

                <small>
                    ${subtitle}
                </small>

            </div>

        </div>
    `;
}

function renderDashboardTasks() {
    const tasks = db.tasks
        .filter(t =>
            t.date === todayISO() ||
            !t.date
        )
        .slice(0, 6);

    if (!tasks.length) {
        return emptyState(
            "✓",
            "هنوز کاری نداری",
            "یک کار جدید اضافه کن."
        );
    }

    return tasks
        .map(taskPreview)
        .join("");
}

function taskPreview(task) {
    return `
        <div class="task-preview">

            <button
                class="task-check ${
                    task.completed
                        ? "done"
                        : ""
                }"
                data-action="toggle-task"
                data-id="${task.id}"
            >
                ${task.completed ? "✓" : ""}
            </button>

            <div
                class="task-preview-title ${
                    task.completed
                        ? "done"
                        : ""
                }"
            >
                ${escapeHTML(task.title)}
            </div>

            <span
                class="priority-dot
                priority-${task.priority || "low"}"
            ></span>

        </div>
    `;
}

function renderDashboardHabits() {
    if (!db.habits.length) {
        return emptyState(
            "♧",
            "هنوز عادتی ثبت نشده",
            "اولین عادت خودت را بساز."
        );
    }

    return db.habits
        .slice(0, 5)
        .map(habit => {

            const progress =
                Math.min(
                    100,
                    Number(
                        habit.progress || 0
                    )
                );

            return `
                <div class="task-preview">

                    <div
                        class="habit-icon"
                        style="
                            width:32px;
                            height:32px;
                            font-size:15px;
                        "
                    >
                        ${habit.icon || "♧"}
                    </div>

                    <div
                        class="task-preview-title"
                    >
                        ${escapeHTML(
                            habit.name
                        )}

                        <div
                            class="habit-progress"
                            style="
                                margin-top:6px;
                            "
                        >
                            <div
                                style="
                                    width:${progress}%;
                                "
                            ></div>
                        </div>
                    </div>

                    <button
                        class="small-button"
                        data-action="habit-plus"
                        data-id="${habit.id}"
                    >
                        +
                    </button>

                </div>
            `;
        })
        .join("");
}


/* =========================================================
   TASKS
========================================================= */

function renderTasks() {
    let tasks = [...db.tasks];

    if (state.taskFilter === "pending") {
        tasks =
            tasks.filter(
                t => !t.completed
            );
    }

    if (state.taskFilter === "completed") {
        tasks =
            tasks.filter(
                t => t.completed
            );
    }

    tasks.sort(
        (a, b) =>
            Number(a.completed) -
            Number(b.completed)
    );

    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>کارها</h2>
                    <p>
                        ${db.tasks.length}
                        کار ثبت شده
                    </p>
                </div>

                <button
                    class="primary-button"
                    data-action="add-task"
                >
                    ＋ کار جدید
                </button>

            </div>


            <div class="filter-bar">

                ${filterButton(
                    "all",
                    "همه"
                )}

                ${filterButton(
                    "pending",
                    "در انتظار"
                )}

                ${filterButton(
                    "completed",
                    "انجام‌شده"
                )}

                <select
                    class="select-control"
                    id="taskSort"
                >
                    <option value="default">
                        مرتب‌سازی
                    </option>

                    <option value="high">
                        اولویت بالا
                    </option>

                    <option value="date">
                        تاریخ
                    </option>
                </select>

            </div>


            <div class="content-card">

                ${
                    tasks.length
                        ? tasks
                            .map(taskRow)
                            .join("")
                        : emptyState(
                            "✓",
                            "کاری پیدا نشد",
                            "یک کار جدید اضافه کن."
                        )
                }

            </div>

        </div>
    `;
}

function filterButton(id, label) {
    return `
        <button
            class="filter-button ${
                state.taskFilter === id
                    ? "active"
                    : ""
            }"
            data-task-filter="${id}"
        >
            ${label}
        </button>
    `;
}

function taskRow(task) {
    return `
        <div
            class="task-row"
            data-searchable="${escapeHTML(
                task.title
            )}"
        >

            <button
                class="task-check ${
                    task.completed
                        ? "done"
                        : ""
                }"
                data-action="toggle-task"
                data-id="${task.id}"
            >
                ${task.completed ? "✓" : ""}
            </button>


            <div class="task-row-info">

                <div
                    class="task-row-title ${
                        task.completed
                            ? "done"
                            : ""
                    }"
                >
                    ${escapeHTML(task.title)}
                </div>

                <div class="task-row-meta">

                    <span>
                        ${priorityText(
                            task.priority
                        )}
                    </span>

                    ${
                        task.date
                            ? `<span>
                                ${formatDate(
                                    task.date
                                )}
                               </span>`
                            : ""
                    }

                    ${
                        task.category
                            ? `<span>
                                ${escapeHTML(
                                    task.category
                                )}
                               </span>`
                            : ""
                    }

                </div>

            </div>


            <div class="task-actions">

                <button
                    class="small-button"
                    title="ویرایش"
                    data-action="edit-task"
                    data-id="${task.id}"
                >
                    ✎
                </button>

                <button
                    class="small-button"
                    title="حذف"
                    data-action="delete-task"
                    data-id="${task.id}"
                >
                    ×
                </button>

            </div>

        </div>
    `;
}

function priorityText(priority) {
    const map = {
        low: "کم",
        medium: "متوسط",
        high: "بالا"
    };

    return map[priority] || "کم";
}


/* =========================================================
   CALENDAR
========================================================= */

function renderCalendar() {
    const year =
        state.calendarDate.getFullYear();

    const month =
        state.calendarDate.getMonth();

    const firstDay =
        new Date(
            year,
            month,
            1
        );

    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );

    const days =
        lastDay.getDate();

    let start =
        firstDay.getDay();

    /*
      تبدیل برای نمایش راست‌به‌چپ
    */
    start = (start + 1) % 7;

    let cells = "";

    for (let i = 0; i < start; i++) {
        cells += `
            <div class="calendar-cell"></div>
        `;
    }

    for (let day = 1; day <= days; day++) {

        const date =
            `${year}-${String(
                month + 1
            ).padStart(2, "0")}-${String(
                day
            ).padStart(2, "0")}`;

        const today =
            date === todayISO();

        const events =
            db.events.filter(
                e => e.date === date
            );

        cells += `
            <div
                class="calendar-cell ${
                    today ? "today" : ""
                }"
                data-calendar-date="${date}"
                data-action="calendar-day"
            >

                <div class="calendar-number">
                    ${day}
                </div>

                ${
                    events
                        .slice(0, 3)
                        .map(event => `
                            <div
                                class="calendar-event"
                                title="${escapeHTML(
                                    event.title
                                )}"
                            >
                                ${escapeHTML(
                                    event.title
                                )}
                            </div>
                        `)
                        .join("")
                }

            </div>
        `;
    }

    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>تقویم</h2>
                    <p>
                        رویدادها و برنامه‌های شما
                    </p>
                </div>

                <button
                    class="primary-button"
                    data-action="add-event"
                >
                    ＋ رویداد
                </button>

            </div>


            <div class="content-card">

                <div class="calendar-toolbar">

                    <button
                        class="icon-button"
                        data-action="calendar-prev"
                    >
                        →
                    </button>

                    <h3>
                        ${monthName(month)}
                        ${new Intl.NumberFormat(
                            "fa-IR"
                        ).format(year)}
                    </h3>

                    <button
                        class="icon-button"
                        data-action="calendar-next"
                    >
                        ←
                    </button>

                    <button
                        class="secondary-button"
                        data-action="calendar-today"
                    >
                        امروز
                    </button>

                </div>


                <div class="calendar-grid">

                    ${[
                        "شنبه",
                        "یکشنبه",
                        "دوشنبه",
                        "سه‌شنبه",
                        "چهارشنبه",
                        "پنجشنبه",
                        "جمعه"
                    ]
                        .map(
                            d => `
                                <div
                                    class="calendar-day-name"
                                >
                                    ${d}
                                </div>
                            `
                        )
                        .join("")}

                    ${cells}

                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   NOTES
========================================================= */

function renderNotes() {
    const notes = [...db.notes]
        .sort(
            (a, b) =>
                new Date(b.updatedAt || b.createdAt) -
                new Date(a.updatedAt || a.createdAt)
        );

    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>یادداشت‌ها</h2>

                    <p>
                        ${notes.length}
                        یادداشت
                    </p>
                </div>

                <button
                    class="primary-button"
                    data-action="add-note"
                >
                    ＋ یادداشت جدید
                </button>

            </div>


            <div class="notes-grid">

                ${
                    notes.length
                        ? notes
                            .map(noteCard)
                            .join("")
                        : emptyState(
                            "✎",
                            "یادداشتی وجود ندارد",
                            "ایده‌ها و نوشته‌هایت را اینجا نگه دار."
                        )
                }

            </div>

        </div>
    `;
}

function noteCard(note) {
    return `
        <article
            class="note-card"
            data-searchable="
                ${escapeHTML(note.title)}
                ${escapeHTML(note.content)}
            "
        >

            <h3>
                ${escapeHTML(
                    note.title || "بدون عنوان"
                )}
            </h3>

            <p>
                ${escapeHTML(
                    note.content || ""
                ).slice(0, 400)}
            </p>

            <div class="note-footer">

                <span>
                    ${formatDate(
                        note.updatedAt ||
                        note.createdAt
                    )}
                </span>

                <span>

                    <button
                        class="small-button"
                        data-action="edit-note"
                        data-id="${note.id}"
                    >
                        ✎
                    </button>

                    <button
                        class="small-button"
                        data-action="delete-note"
                        data-id="${note.id}"
                    >
                        ×
                    </button>

                </span>

            </div>

        </article>
    `;
}


/* =========================================================
   HABITS
========================================================= */

function renderHabits() {
    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>عادت‌ها</h2>

                    <p>
                        عادت‌های کوچک،
                        نتیجه‌های بزرگ
                    </p>
                </div>

                <button
                    class="primary-button"
                    data-action="add-habit"
                >
                    ＋ عادت جدید
                </button>

            </div>


            <div class="habits-grid">

                ${
                    db.habits.length
                        ? db.habits
                            .map(habitCard)
                            .join("")
                        : emptyState(
                            "♧",
                            "هنوز عادتی نداری",
                            "یک عادت جدید بساز."
                        )
                }

            </div>

        </div>
    `;
}

function habitCard(habit) {
    const progress =
        Math.min(
            100,
            Number(habit.progress || 0)
        );

    return `
        <article
            class="habit-card"
            data-searchable="${escapeHTML(
                habit.name
            )}"
        >

            <div class="habit-top">

                <div class="habit-icon">
                    ${habit.icon || "♧"}
                </div>

                <div class="habit-streak">
                    🔥 ${habit.streak || 0}
                </div>

            </div>

            <h3>
                ${escapeHTML(habit.name)}
            </h3>

            <p>
                ${escapeHTML(
                    habit.description || ""
                )}
            </p>

            <div class="habit-progress">
                <div
                    style="
                        width:${progress}%;
                    "
                ></div>
            </div>

            <div class="note-footer">

                <span>
                    ${progress}%
                </span>

                <span>

                    <button
                        class="small-button"
                        data-action="habit-plus"
                        data-id="${habit.id}"
                    >
                        +
                    </button>

                    <button
                        class="small-button"
                        data-action="edit-habit"
                        data-id="${habit.id}"
                    >
                        ✎
                    </button>

                    <button
                        class="small-button"
                        data-action="delete-habit"
                        data-id="${habit.id}"
                    >
                        ×
                    </button>

                </span>

            </div>

        </article>
    `;
}


/* =========================================================
   FOCUS
========================================================= */

function renderFocus() {
    const minutes =
        Math.floor(
            state.focusRemaining / 60
        );

    const seconds =
        state.focusRemaining % 60;

    const percent =
        state.focusDuration > 0
            ? (
                (
                    state.focusDuration * 60 -
                    state.focusRemaining
                ) /
                (state.focusDuration * 60)
            ) * 100
            : 0;

    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>تمرکز</h2>
                    <p>
                        با Pomodoro بهتر کار کن
                    </p>
                </div>

            </div>


            <div class="focus-layout">

                <section class="focus-card">

                    <span class="eyebrow">
                        ${
                            state.focusMode === "focus"
                                ? "FOCUS SESSION"
                                : "BREAK SESSION"
                        }
                    </span>

                    <h2>
                        ${
                            state.focusMode === "focus"
                                ? "زمان تمرکز"
                                : "زمان استراحت"
                        }
                    </h2>

                    <div class="focus-timer">
                        ${String(
                            minutes
                        ).padStart(2, "0")}
                        :
                        ${String(
                            seconds
                        ).padStart(2, "0")}
                    </div>

                    <div class="focus-progress">

                        <div
                            class="focus-progress-bar"
                            style="
                                width:${percent}%;
                            "
                        ></div>

                    </div>


                    <div class="focus-controls">

                        ${
                            state.focusRunning
                                ? `
                                    <button
                                        class="primary-button"
                                        data-action="focus-pause"
                                    >
                                        ⏸ توقف
                                    </button>
                                  `
                                : `
                                    <button
                                        class="primary-button"
                                        data-action="focus-start"
                                    >
                                        ▶ شروع
                                    </button>
                                  `
                        }

                        <button
                            class="secondary-button"
                            data-action="focus-reset"
                        >
                            ↻ بازنشانی
                        </button>

                    </div>


                    <div class="focus-presets">

                        ${focusPreset(
                            15
                        )}

                        ${focusPreset(
                            25
                        )}

                        ${focusPreset(
                            50
                        )}

                    </div>

                </section>


                <aside class="focus-side">

                    <div class="content-card">

                        <div class="card-header">

                            <div>
                                <h3>
                                    آمار تمرکز
                                </h3>

                                <p>
                                    عملکرد شما
                                </p>
                            </div>

                        </div>

                        <div class="mini-stats">

                            <div>
                                <strong>
                                    ${db.focus.sessions}
                                </strong>

                                <span>
                                    جلسه
                                </span>
                            </div>

                            <div>
                                <strong>
                                    ${db.focus.completed}
                                </strong>

                                <span>
                                    کامل‌شده
                                </span>
                            </div>

                            <div>
                                <strong>
                                    ${db.focus.totalMinutes}
                                </strong>

                                <span>
                                    دقیقه
                                </span>
                            </div>

                            <div>
                                <strong>
                                    ${db.user.xp}
                                </strong>

                                <span>
                                    XP
                                </span>
                            </div>

                        </div>

                    </div>


                    <div class="content-card">

                        <div class="card-header">
                            <div>
                                <h3>
                                    نکته
                                </h3>
                            </div>
                        </div>

                        <p class="muted">
                            هنگام تمرکز اعلان‌های
                            غیرضروری را کنار بگذار،
                            یک هدف مشخص انتخاب کن
                            و تا پایان تایمر روی همان
                            کار بمان.
                        </p>

                    </div>

                </aside>

            </div>

        </div>
    `;
}

function focusPreset(minutes) {
    return `
        <button
            class="preset ${
                state.focusDuration === minutes
                    ? "active"
                    : ""
            }"
            data-action="focus-preset"
            data-minutes="${minutes}"
        >

            <b>
                ${minutes}
            </b>

            <small>
                دقیقه
            </small>

        </button>
    `;
}


/* =========================================================
   FINANCE
========================================================= */

function calculateIncome() {
    return db.transactions
        .filter(
            t => t.type === "income"
        )
        .reduce(
            (sum, t) =>
                sum + Number(t.amount || 0),
            0
        );
}

function calculateExpenses() {
    return db.transactions
        .filter(
            t => t.type === "expense"
        )
        .reduce(
            (sum, t) =>
                sum + Number(t.amount || 0),
            0
        );
}

function calculateBalance() {
    return (
        calculateIncome() -
        calculateExpenses()
    );
}

function renderFinance() {
    const income =
        calculateIncome();

    const expenses =
        calculateExpenses();

    const balance =
        income - expenses;

    const transactions =
        [...db.transactions]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );

    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>
                        مدیریت مالی
                    </h2>

                    <p>
                        درآمد و هزینه‌ها
                    </p>
                </div>

                <button
                    class="primary-button"
                    data-action="add-transaction"
                >
                    ＋ تراکنش
                </button>

            </div>


            <div class="finance-stats">

                ${statCard(
                    "﷼",
                    "blue",
                    "موجودی",
                    formatMoney(balance),
                    "مانده فعلی"
                )}

                ${statCard(
                    "↑",
                    "green",
                    "درآمد",
                    formatMoney(income),
                    "کل درآمد"
                )}

                ${statCard(
                    "↓",
                    "orange",
                    "هزینه",
                    formatMoney(expenses),
                    "کل هزینه"
                )}

            </div>


            <div class="content-card">

                <div class="card-header">

                    <div>
                        <h3>
                            تراکنش‌ها
                        </h3>

                        <p>
                            آخرین تراکنش‌های ثبت‌شده
                        </p>
                    </div>

                </div>


                ${
                    transactions.length
                        ? transactions
                            .map(
                                financeTransaction
                            )
                            .join("")
                        : emptyState(
                            "﷼",
                            "تراکنشی وجود ندارد",
                            "اولین درآمد یا هزینه را ثبت کن."
                        )
                }

            </div>

        </div>
    `;
}

function financeTransaction(transaction) {
    const income =
        transaction.type === "income";

    return `
        <div
            class="finance-transaction"
            data-searchable="${escapeHTML(
                transaction.title
            )}"
        >

            <div class="transaction-info">

                <div class="transaction-icon">
                    ${income ? "↑" : "↓"}
                </div>

                <div>
                    <strong>
                        ${escapeHTML(
                            transaction.title
                        )}
                    </strong>

                    <small>
                        ${formatDate(
                            transaction.date
                        )}

                        ${
                            transaction.category
                                ? " · " +
                                  escapeHTML(
                                      transaction.category
                                  )
                                : ""
                        }
                    </small>
                </div>

            </div>


            <div>

                <span
                    class="transaction-amount ${
                        income
                            ? "income"
                            : "expense"
                    }"
                >
                    ${
                        income
                            ? "+"
                            : "-"
                    }
                    ${formatMoney(
                        transaction.amount
                    )}
                </span>

                <button
                    class="small-button"
                    data-action="delete-transaction"
                    data-id="${transaction.id}"
                >
                    ×
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   FILES
========================================================= */

function renderFiles() {
    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>فایل‌ها</h2>

                    <p>
                        فایل‌های داخلی برنامه
                    </p>
                </div>

                <div class="row-actions">

                    <button
                        class="secondary-button"
                        data-action="import-file"
                    >
                        ↑ وارد کردن
                    </button>

                    <button
                        class="primary-button"
                        data-action="add-file"
                    >
                        ＋ فایل
                    </button>

                </div>

            </div>


            <div class="content-card">

                <div class="file-toolbar">

                    <input
                        class="input-control"
                        id="fileSearch"
                        placeholder="جستجوی فایل..."
                    >

                </div>


                <div
                    class="file-grid"
                    id="fileGrid"
                >

                    ${
                        db.files.length
                            ? db.files
                                .map(fileItem)
                                .join("")
                            : emptyState(
                                "▱",
                                "فایلی وجود ندارد",
                                "فایل‌های موردنیازت را اضافه کن."
                            )
                    }

                </div>

            </div>

        </div>
    `;
}

function fileItem(file) {
    return `
        <div
            class="file-item"
            data-file-name="${escapeHTML(
                file.name
            )}"
        >

            <div class="file-icon">
                ${file.icon || "📄"}
            </div>

            <div class="file-name">
                ${escapeHTML(file.name)}
            </div>

            <div class="file-size">
                ${escapeHTML(
                    file.size || ""
                )}
            </div>

            <div class="row-actions">

                <button
                    class="small-button"
                    data-action="delete-file"
                    data-id="${file.id}"
                >
                    ×
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   REPORTS
========================================================= */

function renderReports() {
    const total =
        db.tasks.length;

    const completed =
        db.tasks.filter(
            t => t.completed
        ).length;

    const completion =
        total
            ? Math.round(
                completed /
                total *
                100
            )
            : 0;

    const income =
        calculateIncome();

    const expenses =
        calculateExpenses();

    const max =
        Math.max(
            1,
            income,
            expenses
        );

    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>
                        گزارش‌ها
                    </h2>

                    <p>
                        خلاصه عملکرد
                    </p>
                </div>

                <button
                    class="secondary-button"
                    data-action="export-report"
                >
                    ↓ خروجی
                </button>

            </div>


            <div class="reports-grid">

                <div class="content-card">

                    <div class="card-header">
                        <div>
                            <h3>
                                عملکرد کارها
                            </h3>

                            <p>
                                وضعیت تکمیل
                            </p>
                        </div>
                    </div>

                    <div class="report-chart">

                        ${[
                            {
                                label: "کل",
                                value: total
                            },
                            {
                                label: "انجام‌شده",
                                value: completed
                            },
                            {
                                label: "باقی‌مانده",
                                value:
                                    total -
                                    completed
                            }
                        ]
                            .map(
                                item => `
                                    <div
                                        class="report-bar"
                                        title="${
                                            item.label
                                        }: ${
                                            item.value
                                        }"
                                        style="
                                            height:${Math.max(
                                                8,
                                                (
                                                    item.value /
                                                    Math.max(
                                                        1,
                                                        total
                                                    )
                                                ) *
                                                180
                                            )}px;
                                        "
                                    ></div>
                                `
                            )
                            .join("")}

                    </div>

                    <p class="muted">
                        نرخ تکمیل:
                        ${completion}٪
                    </p>

                </div>


                <div class="content-card">

                    <div class="card-header">
                        <div>
                            <h3>
                                مالی
                            </h3>

                            <p>
                                مقایسه درآمد و هزینه
                            </p>
                        </div>
                    </div>

                    <div class="report-chart">

                        <div
                            class="report-bar"
                            title="درآمد"
                            style="
                                height:${Math.max(
                                    8,
                                    income /
                                    max *
                                    180
                                )}px;
                            "
                        ></div>

                        <div
                            class="report-bar"
                            title="هزینه"
                            style="
                                height:${Math.max(
                                    8,
                                    expenses /
                                    max *
                                    180
                                )}px;
                            "
                        ></div>

                    </div>

                    <div class="summary-grid">

                        <div class="summary-item">
                            <span>
                                درآمد
                            </span>

                            <strong>
                                ${formatMoney(
                                    income
                                )}
                            </strong>
                        </div>

                        <div class="summary-item">
                            <span>
                                هزینه
                            </span>

                            <strong>
                                ${formatMoney(
                                    expenses
                                )}
                            </strong>
                        </div>

                    </div>

                </div>

            </div>


            <div class="content-card">

                <div class="card-header">

                    <div>
                        <h3>
                            خلاصه کلی
                        </h3>
                    </div>

                </div>


                <div class="summary-grid">

                    <div class="summary-item">
                        <span>
                            XP
                        </span>
                        <strong>
                            ${db.user.xp}
                        </strong>
                    </div>

                    <div class="summary-item">
                        <span>
                            سطح
                        </span>
                        <strong>
                            ${db.user.level}
                        </strong>
                    </div>

                    <div class="summary-item">
                        <span>
                            جلسات تمرکز
                        </span>
                        <strong>
                            ${db.focus.completed}
                        </strong>
                    </div>

                    <div class="summary-item">
                        <span>
                            یادداشت‌ها
                        </span>
                        <strong>
                            ${db.notes.length}
                        </strong>
                    </div>

                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
    return `
        <div class="page">

            <div class="page-toolbar">

                <div>
                    <h2>
                        تنظیمات
                    </h2>

                    <p>
                        شخصی‌سازی LifeDesk
                    </p>
                </div>

            </div>


            <div class="settings-layout">


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                پروفایل
                            </h3>

                            <p>
                                اطلاعات کاربر
                            </p>
                        </div>

                    </div>


                    <div class="form-grid">

                        <label>
                            نام

                            <input
                                class="input-control"
                                id="settingsName"
                                value="${escapeAttr(
                                    db.user.name
                                )}"
                            >
                        </label>

                        <label>
                            ایمیل

                            <input
                                class="input-control"
                                id="settingsEmail"
                                value="${escapeAttr(
                                    db.user.email
                                )}"
                            >
                        </label>

                    </div>


                    <button
                        class="primary-button"
                        data-action="save-profile"
                    >
                        ذخیره پروفایل
                    </button>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                ظاهر
                            </h3>

                            <p>
                                انتخاب تم برنامه
                            </p>
                        </div>

                    </div>


                    <div class="theme-options">

                        <button
                            class="theme-option ${
                                db.settings.theme === "dark"
                                    ? "active"
                                    : ""
                            }"
                            data-action="theme"
                            data-theme="dark"
                        >
                            🌙
                            <span>
                                تاریک
                            </span>
                        </button>

                        <button
                            class="theme-option ${
                                db.settings.theme === "light"
                                    ? "active"
                                    : ""
                            }"
                            data-action="theme"
                            data-theme="light"
                        >
                            ☀
                            <span>
                                روشن
                            </span>
                        </button>

                    </div>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                برنامه
                            </h3>

                            <p>
                                رفتار LifeDesk
                            </p>
                        </div>

                    </div>


                    <div class="form-group">

                        <label>
                            واحد پول
                        </label>

                        <select
                            class="select-control"
                            id="settingsCurrency"
                        >
                            <option
                                value="تومان"
                                ${
                                    db.settings.currency === "تومان"
                                        ? "selected"
                                        : ""
                                }
                            >
                                تومان
                            </option>

                            <option
                                value="ریال"
                                ${
                                    db.settings.currency === "ریال"
                                        ? "selected"
                                        : ""
                                }
                            >
                                ریال
                            </option>

                            <option
                                value="$"
                                ${
                                    db.settings.currency === "$"
                                        ? "selected"
                                        : ""
                                }
                            >
                                دلار
                            </option>

                            <option
                                value="€"
                                ${
                                    db.settings.currency === "€"
                                        ? "selected"
                                        : ""
                                }
                            >
                                یورو
                            </option>
                        </select>

                    </div>


                    <div class="row-actions">

                        <button
                            class="secondary-button"
                            data-action="toggle-notifications"
                        >
                            🔔
                            اعلان‌ها:
                            ${
                                db.settings.notifications
                                    ? "فعال"
                                    : "خاموش"
                            }
                        </button>

                        <button
                            class="secondary-button"
                            data-action="toggle-sound"
                        >
                            🔊
                            صدا:
                            ${
                                db.settings.sound
                                    ? "فعال"
                                    : "خاموش"
                            }
                        </button>

                    </div>


                    <button
                        class="primary-button"
                        data-action="save-settings"
                        style="margin-top:15px"
                    >
                        ذخیره تنظیمات
                    </button>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                پشتیبان‌گیری
                            </h3>

                            <p>
                                اطلاعاتت را همیشه قابل بازگردانی نگه دار.
                            </p>
                        </div>

                    </div>


                    <div class="row-actions">

                        <button
                            class="primary-button"
                            data-action="backup"
                        >
                            ↓ ساخت Backup
                        </button>

                        <button
                            class="secondary-button"
                            data-action="restore"
                        >
                            ↑ Restore
                        </button>

                        <button
                            class="secondary-button"
                            data-action="save-now"
                        >
                            💾 ذخیره
                        </button>

                    </div>

                </div>


                <div class="content-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                درباره برنامه
                            </h3>

                            <p>
                                اطلاعات نسخه
                            </p>
                        </div>

                    </div>


                    <div class="about-info">

                        <div>
                            <span>
                                برنامه
                            </span>

                            <strong>
                                LifeDesk
                            </strong>
                        </div>

                        <div>
                            <span>
                                نسخه
                            </span>

                            <strong>
                                ${VERSION}
                            </strong>
                        </div>

                        <div>
                            <span>
                                سطح
                            </span>

                            <strong>
                                ${db.user.level}
                            </strong>
                        </div>

                    </div>

                </div>


                <div class="content-card danger-card">

                    <div class="card-header">

                        <div>
                            <h3>
                                بخش خطرناک
                            </h3>

                            <p>
                                حذف اطلاعات قابل بازگشت نیست.
                            </p>
                        </div>

                    </div>

                    <button
                        class="danger-button"
                        data-action="clear-data"
                    >
                        حذف کامل اطلاعات
                    </button>

                </div>


            </div>

        </div>
    `;
}


/* =========================================================
   MODAL SYSTEM
========================================================= */

function openModal(title, body, footer = "") {
    const root =
        document.querySelector(
            "#modalRoot"
        );

    if (!root) return;

    root.innerHTML = `
        <div class="modal">

            <div class="modal-header">

                <h3>
                    ${title}
                </h3>

                <button
                    class="icon-button"
                    data-action="close-modal"
                >
                    ×
                </button>

            </div>

            <div class="modal-body">
                ${body}
            </div>

            ${
                footer
                    ? `
                        <div class="modal-footer">
                            ${footer}
                        </div>
                      `
                    : ""
            }

        </div>
    `;

    root.classList.remove(
        "hidden"
    );

    state.modalOpen = true;
}

function closeModal() {
    const root =
        document.querySelector(
            "#modalRoot"
        );

    if (!root) return;

    root.classList.add(
        "hidden"
    );

    root.innerHTML = "";

    state.modalOpen = false;
}


/* =========================================================
   TASK MODAL
========================================================= */

function openTaskModal(task = null) {
    const editing =
        Boolean(task);

    openModal(
        editing
            ? "ویرایش کار"
            : "کار جدید",

        `
            <div class="form-group">

                <label>
                    عنوان
                </label>

                <input
                    class="input-control"
                    id="taskTitle"
                    placeholder="مثلاً مطالعه ریاضی"
                    value="${escapeAttr(
                        task?.title || ""
                    )}"
                    autofocus
                >

            </div>


            <div class="form-grid">

                <label>
                    تاریخ

                    <input
                        class="input-control"
                        id="taskDate"
                        type="date"
                        value="${escapeAttr(
                            task?.date ||
                            todayISO()
                        )}"
                    >
                </label>

                <label>
                    اولویت

                    <select
                        class="select-control"
                        id="taskPriority"
                    >
                        <option
                            value="low"
                            ${
                                task?.priority === "low"
                                    ? "selected"
                                    : ""
                            }
                        >
                            کم
                        </option>

                        <option
                            value="medium"
                            ${
                                task?.priority === "medium"
                                    ? "selected"
                                    : ""
                            }
                        >
                            متوسط
                        </option>

                        <option
                            value="high"
                            ${
                                task?.priority === "high"
                                    ? "selected"
                                    : ""
                            }
                        >
                            بالا
                        </option>

                    </select>
                </label>

            </div>


            <div class="form-grid">

                <label>
                    دسته

                    <input
                        class="input-control"
                        id="taskCategory"
                        placeholder="درس، کار، شخصی..."
                        value="${escapeAttr(
                            task?.category || ""
                        )}"
                    >
                </label>

                <label>
                    زمان

                    <input
                        class="input-control"
                        id="taskTime"
                        type="time"
                        value="${escapeAttr(
                            task?.time || ""
                        )}"
                    >
                </label>

            </div>
        `,

        `
            <button
                class="secondary-button"
                data-action="close-modal"
            >
                انصراف
            </button>

            <button
                class="primary-button"
                data-action="save-task"
                data-id="${task?.id || ""}"
            >
                ${editing ? "ذخیره تغییرات" : "افزودن"}
            </button>
        `
    );
}

function saveTask(id = null) {
    const title =
        document.querySelector(
            "#taskTitle"
        )?.value.trim();

    if (!title) {
        toast(
            "عنوان کار را وارد کن",
            "warning"
        );
        return;
    }

    const data = {
        title,

        date:
            document.querySelector(
                "#taskDate"
            )?.value || "",

        priority:
            document.querySelector(
                "#taskPriority"
            )?.value || "medium",

        category:
            document.querySelector(
                "#taskCategory"
            )?.value.trim() || "",

        time:
            document.querySelector(
                "#taskTime"
            )?.value || ""
    };

    if (id) {
        const task =
            db.tasks.find(
                t => t.id === id
            );

        if (task) {
            Object.assign(
                task,
                data,
                {
                    updatedAt:
                        new Date().toISOString()
                }
            );
        }
    } else {
        db.tasks.unshift({
            id: uid("task"),
            ...data,
            completed: false,
            createdAt:
                new Date().toISOString()
        });

        addXP(10);
    }

    saveDatabase();

    closeModal();

    renderPage(state.currentPage);

    toast(
        id
            ? "کار ویرایش شد"
            : "کار جدید اضافه شد",
        "success"
    );
}


/* =========================================================
   NOTE MODAL
========================================================= */

function openNoteModal(note = null) {
    openModal(
        note
            ? "ویرایش یادداشت"
            : "یادداشت جدید",

        `
            <div class="form-group">

                <label>
                    عنوان
                </label>

                <input
                    class="input-control"
                    id="noteTitle"
                    value="${escapeAttr(
                        note?.title || ""
                    )}"
                    placeholder="عنوان یادداشت"
                >

            </div>

            <div class="form-group">

                <label>
                    متن
                </label>

                <textarea
                    class="input-control"
                    id="noteContent"
                    placeholder="اینجا بنویس..."
                >${escapeHTML(
                    note?.content || ""
                )}</textarea>

            </div>
        `,

        `
            <button
                class="secondary-button"
                data-action="close-modal"
            >
                انصراف
            </button>

            <button
                class="primary-button"
                data-action="save-note"
                data-id="${note?.id || ""}"
            >
                ذخیره
            </button>
        `
    );
}

function saveNote(id = null) {
    const title =
        document.querySelector(
            "#noteTitle"
        )?.value.trim();

    const content =
        document.querySelector(
            "#noteContent"
        )?.value.trim();

    if (!title && !content) {
        toast(
            "یادداشت خالی است",
            "warning"
        );
        return;
    }

    if (id) {
        const note =
            db.notes.find(
                n => n.id === id
            );

        if (note) {
            note.title = title;
            note.content = content;
            note.updatedAt =
                new Date().toISOString();
        }
    } else {
        db.notes.unshift({
            id: uid("note"),
            title,
            content,
            createdAt:
                new Date().toISOString(),
            updatedAt:
                new Date().toISOString()
        });

        addXP(5);
    }

    saveDatabase();

    closeModal();

    renderPage(state.currentPage);

    toast(
        id
            ? "یادداشت ویرایش شد"
            : "یادداشت اضافه شد",
        "success"
    );
}


/* =========================================================
   HABIT MODAL
========================================================= */

function openHabitModal(habit = null) {
    openModal(
        habit
            ? "ویرایش عادت"
            : "عادت جدید",

        `
            <div class="form-group">

                <label>
                    نام عادت
                </label>

                <input
                    class="input-control"
                    id="habitName"
                    value="${escapeAttr(
                        habit?.name || ""
                    )}"
                    placeholder="مثلاً مطالعه روزانه"
                >

            </div>


            <div class="form-group">

                <label>
                    توضیحات
                </label>

                <textarea
                    class="input-control"
                    id="habitDescription"
                    placeholder="توضیحات..."
                >${escapeHTML(
                    habit?.description || ""
                )}</textarea>

            </div>


            <div class="form-grid">

                <label>
                    آیکن

                    <input
                        class="input-control"
                        id="habitIcon"
                        value="${escapeAttr(
                            habit?.icon || "♧"
                        )}"
                    >
                </label>

                <label>
                    هدف درصدی

                    <input
                        class="input-control"
                        id="habitProgress"
                        type="number"
                        min="0"
                        max="100"
                        value="${Number(
                            habit?.progress || 0
                        )}"
                    >
                </label>

            </div>
        `,

        `
            <button
                class="secondary-button"
                data-action="close-modal"
            >
                انصراف
            </button>

            <button
                class="primary-button"
                data-action="save-habit"
                data-id="${habit?.id || ""}"
            >
                ذخیره
            </button>
        `
    );
}

function saveHabit(id = null) {
    const name =
        document.querySelector(
            "#habitName"
        )?.value.trim();

    if (!name) {
        toast(
            "نام عادت را وارد کن",
            "warning"
        );
        return;
    }

    const data = {
        name,

        description:
            document.querySelector(
                "#habitDescription"
            )?.value.trim() || "",

        icon:
            document.querySelector(
                "#habitIcon"
            )?.value.trim() || "♧",

        progress:
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        document.querySelector(
                            "#habitProgress"
                        )?.value || 0
                    )
                )
            )
    };

    if (id) {
        const habit =
            db.habits.find(
                h => h.id === id
            );

        if (habit) {
            Object.assign(
                habit,
                data
            );
        }
    } else {
        db.habits.push({
            id: uid("habit"),
            ...data,
            streak: 0,
            createdAt:
                new Date().toISOString()
        });

        addXP(15);
    }

    saveDatabase();

    closeModal();

    renderPage(state.currentPage);

    toast(
        id
            ? "عادت ویرایش شد"
            : "عادت جدید ساخته شد",
        "success"
    );
}


/* =========================================================
   EVENT MODAL
========================================================= */

function openEventModal(event = null, date = "") {
    openModal(
        event
            ? "ویرایش رویداد"
            : "رویداد جدید",

        `
            <div class="form-group">

                <label>
                    عنوان
                </label>

                <input
                    class="input-control"
                    id="eventTitle"
                    value="${escapeAttr(
                        event?.title || ""
                    )}"
                    placeholder="عنوان رویداد"
                >

            </div>


            <div class="form-grid">

                <label>
                    تاریخ

                    <input
                        class="input-control"
                        id="eventDate"
                        type="date"
                        value="${escapeAttr(
                            event?.date ||
                            date ||
                            todayISO()
                        )}"
                    >
                </label>

                <label>
                    زمان

                    <input
                        class="input-control"
                        id="eventTime"
                        type="time"
                        value="${escapeAttr(
                            event?.time || ""
                        )}"
                    >
                </label>

            </div>


            <div class="form-group">

                <label>
                    توضیحات
                </label>

                <textarea
                    class="input-control"
                    id="eventDescription"
                >${escapeHTML(
                    event?.description || ""
                )}</textarea>

            </div>
        `,

        `
            <button
                class="secondary-button"
                data-action="close-modal"
            >
                انصراف
            </button>

            <button
                class="primary-button"
                data-action="save-event"
                data-id="${event?.id || ""}"
            >
                ذخیره
            </button>
        `
    );
}

function saveEvent(id = null) {
    const title =
        document.querySelector(
            "#eventTitle"
        )?.value.trim();

    if (!title) {
        toast(
            "عنوان رویداد را وارد کن",
            "warning"
        );
        return;
    }

    const data = {
        title,

        date:
            document.querySelector(
                "#eventDate"
            )?.value || todayISO(),

        time:
            document.querySelector(
                "#eventTime"
            )?.value || "",

        description:
            document.querySelector(
                "#eventDescription"
            )?.value.trim() || ""
    };

    if (id) {
        const event =
            db.events.find(
                e => e.id === id
            );

        if (event) {
            Object.assign(
                event,
                data
            );
        }
    } else {
        db.events.push({
            id: uid("event"),
            ...data,
            createdAt:
                new Date().toISOString()
        });

        addXP(5);
    }

    saveDatabase();

    closeModal();

    renderPage(state.currentPage);

    toast(
        id
            ? "رویداد ویرایش شد"
            : "رویداد اضافه شد",
        "success"
    );
}


/* =========================================================
   TRANSACTION MODAL
========================================================= */

function openTransactionModal() {
    openModal(
        "ثبت تراکنش",

        `
            <div class="form-group">

                <label>
                    عنوان
                </label>

                <input
                    class="input-control"
                    id="transactionTitle"
                    placeholder="مثلاً خرید کتاب"
                >

            </div>


            <div class="form-grid">

                <label>
                    مبلغ

                    <input
                        class="input-control"
                        id="transactionAmount"
                        type="number"
                        min="0"
                        placeholder="0"
                    >
                </label>

                <label>
                    نوع

                    <select
                        class="select-control"
                        id="transactionType"
                    >
                        <option value="expense">
                            هزینه
                        </option>

                        <option value="income">
                            درآمد
                        </option>
                    </select>

                </label>

            </div>


            <div class="form-grid">

                <label>
                    تاریخ

                    <input
                        class="input-control"
                        id="transactionDate"
                        type="date"
                        value="${todayISO()}"
                    >
                </label>

                <label>
                    دسته

                    <input
                        class="input-control"
                        id="transactionCategory"
                        placeholder="خوراک، کار..."
                    >
                </label>

            </div>
        `,

        `
            <button
                class="secondary-button"
                data-action="close-modal"
            >
                انصراف
            </button>

            <button
                class="primary-button"
                data-action="save-transaction"
            >
                ثبت
            </button>
        `
    );
}

function saveTransaction() {
    const title =
        document.querySelector(
            "#transactionTitle"
        )?.value.trim();

    const amount =
        Number(
            document.querySelector(
                "#transactionAmount"
            )?.value || 0
        );

    if (!title || amount <= 0) {
        toast(
            "عنوان و مبلغ معتبر وارد کن",
            "warning"
        );
        return;
    }

    db.transactions.unshift({
        id: uid("transaction"),

        title,

        amount,

        type:
            document.querySelector(
                "#transactionType"
            )?.value || "expense",

        date:
            document.querySelector(
                "#transactionDate"
            )?.value || todayISO(),

        category:
            document.querySelector(
                "#transactionCategory"
            )?.value.trim() || "",

        createdAt:
            new Date().toISOString()
    });

    addXP(5);

    saveDatabase();

    closeModal();

    renderPage(
        state.currentPage
    );

    toast(
        "تراکنش ثبت شد",
        "success"
    );
}


/* =========================================================
   QUICK ADD
========================================================= */

function openQuickAdd() {
    openModal(
        "افزودن سریع",

        `
            <div class="quick-actions">

                <button
                    class="quick-action"
                    data-action="quick-task"
                >
                    <span>✓</span>
                    <b>کار</b>
                    <small>
                        افزودن کار جدید
                    </small>
                </button>

                <button
                    class="quick-action"
                    data-action="quick-note"
                >
                    <span>✎</span>
                    <b>یادداشت</b>
                    <small>
                        یادداشت جدید
                    </small>
                </button>

                <button
                    class="quick-action"
                    data-action="quick-event"
                >
                    <span>▣</span>
                    <b>رویداد</b>
                    <small>
                        برنامه جدید
                    </small>
                </button>

                <button
                    class="quick-action"
                    data-action="quick-habit"
                >
                    <span>♧</span>
                    <b>عادت</b>
                    <small>
                        ساخت عادت
                    </small>
                </button>

                <button
                    class="quick-action"
                    data-action="quick-money"
                >
                    <span>﷼</span>
                    <b>مالی</b>
                    <small>
                        ثبت تراکنش
                    </small>
                </button>

                <button
                    class="quick-action"
                    data-action="quick-focus"
                >
                    <span>◷</span>
                    <b>تمرکز</b>
                    <small>
                        Pomodoro
                    </small>
                </button>

            </div>
        `
    );
}


/* =========================================================
   BACKUP
========================================================= */

function createBackup() {
    const data = {
        app: APP_NAME,
        version: VERSION,
        exportedAt:
            new Date().toISOString(),
        database: db
    };

    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        `LifeDesk-Backup-${
            todayISO()
        }.json`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

    toast(
        "فایل Backup ساخته شد",
        "success"
    );
}

function restoreBackup() {
    const input =
        document.createElement("input");

    input.type = "file";

    input.accept = ".json,application/json";

    input.onchange = event => {

        const file =
            event.target.files?.[0];

        if (!file) return;

        const reader =
            new FileReader();

        reader.onload = () => {

            try {

                const parsed =
                    JSON.parse(
                        reader.result
                    );

                const restored =
                    parsed.database ||
                    parsed;

                db =
                    mergeDatabase(
                        clone(DEFAULT_DB),
                        restored
                    );

                saveDatabase();

                applyTheme(
                    db.settings.theme
                );

                renderShell();

                navigate(
                    db.settings.startPage ||
                    "dashboard",
                    false
                );

                toast(
                    "Backup با موفقیت بازگردانی شد",
                    "success"
                );

            } catch (error) {

                console.error(error);

                toast(
                    "فایل Backup معتبر نیست",
                    "error"
                );

            }

        };

        reader.readAsText(
            file,
            "utf-8"
        );
    };

    input.click();
}


/* =========================================================
   EXPORT REPORT
========================================================= */

function exportReport() {
    const report = {
        generatedAt:
            new Date().toISOString(),

        user: db.user,

        tasks: {
            total: db.tasks.length,
            completed:
                db.tasks.filter(
                    t => t.completed
                ).length
        },

        finance: {
            income:
                calculateIncome(),

            expenses:
                calculateExpenses(),

            balance:
                calculateBalance()
        },

        focus: db.focus,

        habits: db.habits.length,

        notes: db.notes.length,

        events: db.events.length
    };

    downloadText(
        JSON.stringify(
            report,
            null,
            2
        ),
        `LifeDesk-Report-${todayISO()}.json`,
        "application/json"
    );

    toast(
        "گزارش خروجی گرفته شد",
        "success"
    );
}


/* =========================================================
   FILE IMPORT
========================================================= */

function importFile() {
    const input =
        document.createElement("input");

    input.type = "file";

    input.multiple = true;

    input.onchange = event => {

        const files =
            Array.from(
                event.target.files || []
            );

        for (const file of files) {

            db.files.unshift({
                id: uid("file"),

                name: file.name,

                size:
                    formatFileSize(
                        file.size
                    ),

                type: file.type,

                icon:
                    getFileIcon(
                        file.name
                    ),

                createdAt:
                    new Date().toISOString()
            });

        }

        saveDatabase();

        renderPage("files");

        toast(
            `${files.length} فایل اضافه شد`,
            "success"
        );
    };

    input.click();
}

function formatFileSize(bytes) {
    if (!bytes) return "0 B";

    const units =
        ["B", "KB", "MB", "GB"];

    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        (bytes /
            Math.pow(
                1024,
                index
            )
        ).toFixed(1)
        +
        " " +
        units[index]
    );
}

function getFileIcon(name) {
    const ext =
        name
            .split(".")
            .pop()
            .toLowerCase();

    const map = {
        pdf: "📕",
        doc: "📘",
        docx: "📘",
        xls: "📗",
        xlsx: "📗",
        ppt: "📙",
        pptx: "📙",
        zip: "🗜️",
        rar: "🗜️",
        jpg: "🖼️",
        jpeg: "🖼️",
        png: "🖼️",
        gif: "🖼️",
        mp3: "🎵",
        wav: "🎵",
        mp4: "🎬",
        mov: "🎬",
        exe: "⚙️",
        js: "📜",
        html: "🌐",
        css: "🎨",
        json: "🧩"
    };

    return map[ext] || "📄";
}


/* =========================================================
   FOCUS TIMER
========================================================= */

function setFocusDuration(minutes) {
    if (state.focusRunning) {
        toast(
            "ابتدا تایمر را متوقف کن",
            "warning"
        );
        return;
    }

    state.focusDuration =
        Number(minutes);

    state.focusRemaining =
        Number(minutes) * 60;

    renderPage("focus");
}

function startFocus() {
    if (state.focusRunning) {
        return;
    }

    state.focusRunning = true;

    db.focus.sessions += 1;

    saveDatabase();

    state.focusInterval =
        setInterval(
            () => {

                if (
                    state.focusRemaining > 0
                ) {

                    state.focusRemaining--;

                    updateFocusDisplay();

                } else {

                    completeFocus();

                }

            },
            1000
        );

    renderPage("focus");

    toast(
        "جلسه تمرکز شروع شد",
        "success"
    );
}

function pauseFocus() {
    state.focusRunning = false;

    if (state.focusInterval) {
        clearInterval(
            state.focusInterval
        );

        state.focusInterval = null;
    }

    renderPage("focus");

    toast(
        "تایمر متوقف شد",
        "warning"
    );
}

function resetFocus() {
    pauseFocus();

    state.focusRemaining =
        state.focusDuration * 60;

    renderPage("focus");
}

function completeFocus() {
    pauseFocus();

    db.focus.completed += 1;

    db.focus.totalMinutes +=
        state.focusDuration;

    addXP(25);

    saveDatabase();

    state.focusMode =
        state.focusMode === "focus"
            ? "break"
            : "focus";

    state.focusDuration =
        state.focusMode === "focus"
            ? 25
            : 5;

    state.focusRemaining =
        state.focusDuration * 60;

    notifyUser(
        "جلسه تمرکز تمام شد",
        "آفرین! وقت استراحت رسیده."
    );

    renderPage("focus");

    toast(
        "جلسه تمرکز تمام شد 🎉",
        "success"
    );
}

function updateFocusDisplay() {
    if (
        state.currentPage !== "focus"
    ) {
        return;
    }

    const timer =
        document.querySelector(
            ".focus-timer"
        );

    const progress =
        document.querySelector(
            ".focus-progress-bar"
        );

    if (!timer) return;

    const min =
        Math.floor(
            state.focusRemaining / 60
        );

    const sec =
        state.focusRemaining % 60;

    timer.textContent =
        `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

    if (progress) {
        const percent =
            (
                (
                    state.focusDuration * 60 -
                    state.focusRemaining
                ) /
                (
                    state.focusDuration * 60
                )
            ) * 100;

        progress.style.width =
            `${percent}%`;
    }
}


/* =========================================================
   TASK ACTIONS
========================================================= */

function toggleTask(id) {
    const task =
        db.tasks.find(
            t => t.id === id
        );

    if (!task) return;

    task.completed =
        !task.completed;

    if (task.completed) {
        addXP(20);
    }

    task.updatedAt =
        new Date().toISOString();

    saveDatabase();

    renderPage(
        state.currentPage
    );

    toast(
        task.completed
            ? "کار انجام شد ✓"
            : "کار دوباره فعال شد",
        task.completed
            ? "success"
            : "warning"
    );
}

function deleteTask(id) {
    confirmAction(
        "حذف کار",
        "آیا از حذف این کار مطمئنی؟",
        () => {

            db.tasks =
                db.tasks.filter(
                    t => t.id !== id
                );

            saveDatabase();

            renderPage(
                state.currentPage
            );

            toast(
                "کار حذف شد",
                "success"
            );
        }
    );
}


/* =========================================================
   HABIT ACTIONS
========================================================= */

function incrementHabit(id) {
    const habit =
        db.habits.find(
            h => h.id === id
        );

    if (!habit) return;

    habit.progress =
        Math.min(
            100,
            Number(
                habit.progress || 0
            ) + 10
        );

    habit.streak =
        Number(
            habit.streak || 0
        ) + 1;

    addXP(5);

    saveDatabase();

    renderPage(
        state.currentPage
    );

    toast(
        "عادت ثبت شد 🔥",
        "success"
    );
}

function deleteHabit(id) {
    confirmAction(
        "حذف عادت",
        "آیا می‌خواهی این عادت حذف شود؟",
        () => {

            db.habits =
                db.habits.filter(
                    h => h.id !== id
                );

            saveDatabase();

            renderPage(
                state.currentPage
            );
        }
    );
}


/* =========================================================
   NOTE ACTIONS
========================================================= */

function deleteNote(id) {
    confirmAction(
        "حذف یادداشت",
        "این یادداشت حذف شود؟",
        () => {

            db.notes =
                db.notes.filter(
                    n => n.id !== id
                );

            saveDatabase();

            renderPage(
                state.currentPage
            );

            toast(
                "یادداشت حذف شد",
                "success"
            );
        }
    );
}


/* =========================================================
   EVENT ACTIONS
========================================================= */

function deleteEvent(id) {
    confirmAction(
        "حذف رویداد",
        "این رویداد حذف شود؟",
        () => {

            db.events =
                db.events.filter(
                    e => e.id !== id
                );

            saveDatabase();

            renderPage(
                state.currentPage
            );
        }
    );
}


/* =========================================================
   TRANSACTION ACTIONS
========================================================= */

function deleteTransaction(id) {
    confirmAction(
        "حذف تراکنش",
        "این تراکنش حذف شود؟",
        () => {

            db.transactions =
                db.transactions.filter(
                    t => t.id !== id
                );

            saveDatabase();

            renderPage(
                state.currentPage
            );

            toast(
                "تراکنش حذف شد",
                "success"
            );
        }
    );
}


/* =========================================================
   FILE ACTIONS
========================================================= */

function deleteFile(id) {
    confirmAction(
        "حذف فایل",
        "این فایل از فهرست برنامه حذف شود؟",
        () => {

            db.files =
                db.files.filter(
                    f => f.id !== id
                );

            saveDatabase();

            renderPage(
                "files"
            );
        }
    );
}


/* =========================================================
   SETTINGS
========================================================= */

function saveProfile() {
    const name =
        document.querySelector(
            "#settingsName"
        )?.value.trim();

    const email =
        document.querySelector(
            "#settingsEmail"
        )?.value.trim();

    if (!name) {
        toast(
            "نام نمی‌تواند خالی باشد",
            "warning"
        );
        return;
    }

    db.user.name = name;

    db.user.email = email;

    db.user.avatar =
        name.charAt(0);

    saveDatabase();

    renderShell();

    navigate(
        "settings",
        false
    );

    toast(
        "پروفایل ذخیره شد",
        "success"
    );
}

function saveSettings() {
    const currency =
        document.querySelector(
            "#settingsCurrency"
        )?.value;

    if (currency) {
        db.settings.currency =
            currency;
    }

    saveDatabase();

    renderPage(
        "settings"
    );

    toast(
        "تنظیمات ذخیره شد",
        "success"
    );
}

function toggleNotifications() {
    db.settings.notifications =
        !db.settings.notifications;

    saveDatabase();

    renderPage("settings");
}

function toggleSound() {
    db.settings.sound =
        !db.settings.sound;

    saveDatabase();

    renderPage("settings");
}


/* =========================================================
   CLEAR DATA
========================================================= */

function clearAllData() {
    confirmAction(
        "حذف همه اطلاعات",
        "تمام کارها، یادداشت‌ها، عادت‌ها، رویدادها و اطلاعات مالی حذف می‌شوند. ادامه می‌دهی؟",
        () => {

            db = clone(
                DEFAULT_DB
            );

            saveDatabase();

            localStorage.removeItem(
                THEME_KEY
            );

            applyTheme("dark");

            renderShell();

            navigate(
                "dashboard",
                false
            );

            toast(
                "تمام اطلاعات پاک شد",
                "success"
            );
        }
    );
}


/* =========================================================
   CONFIRM
========================================================= */

function confirmAction(
    title,
    message,
    callback
) {
    openModal(
        title,

        `
            <p class="muted">
                ${message}
            </p>
        `,

        `
            <button
                class="secondary-button"
                data-action="close-modal"
            >
                انصراف
            </button>

            <button
                class="danger-button"
                id="confirmActionButton"
            >
                تأیید
            </button>
        `
    );

    setTimeout(() => {

        const button =
            document.querySelector(
                "#confirmActionButton"
            );

        if (!button) return;

        button.onclick = () => {

            closeModal();

            callback();

        };

    }, 0);
}


/* =========================================================
   GLOBAL EVENTS
========================================================= */

function bindGlobalEvents() {

    document.addEventListener(
        "click",
        handleClick
    );

    document.addEventListener(
        "keydown",
        handleKeyboard
    );

    document.addEventListener(
        "input",
        handleInput
    );

    window.addEventListener(
        "hashchange",
        () => {

            const page =
                window.location.hash
                    .replace("#", "");

            if (PAGE_META[page]) {
                navigate(
                    page,
                    false
                );
            }

        }
    );

    const initialHash =
        window.location.hash
            .replace("#", "");

    if (PAGE_META[initialHash]) {
        state.currentPage =
            initialHash;
    }
}


/* =========================================================
   CLICK HANDLER
========================================================= */

function handleClick(event) {

    const pageButton =
        event.target.closest(
            "[data-page]"
        );

    if (pageButton) {
        navigate(
            pageButton.dataset.page
        );
        return;
    }


    const pageLink =
        event.target.closest(
            "[data-page-link]"
        );

    if (pageLink) {
        navigate(
            pageLink.dataset.pageLink
        );
        return;
    }


    const taskFilter =
        event.target.closest(
            "[data-task-filter]"
        );

    if (taskFilter) {

        state.taskFilter =
            taskFilter.dataset.taskFilter;

        renderPage("tasks");

        return;
    }


    const action =
        event.target.closest(
            "[data-action]"
        );

    if (!action) return;

    const name =
        action.dataset.action;

    switch (name) {

        case "add-task":
            openTaskModal();
            break;

        case "edit-task": {

            const task =
                db.tasks.find(
                    t =>
                        t.id ===
                        action.dataset.id
                );

            if (task) {
                openTaskModal(task);
            }

            break;
        }

        case "save-task":
            saveTask(
                action.dataset.id || null
            );
            break;

        case "toggle-task":
            toggleTask(
                action.dataset.id
            );
            break;

        case "delete-task":
            deleteTask(
                action.dataset.id
            );
            break;


        case "add-note":
            openNoteModal();
            break;

        case "edit-note": {

            const note =
                db.notes.find(
                    n =>
                        n.id ===
                        action.dataset.id
                );

            if (note) {
                openNoteModal(note);
            }

            break;
        }

        case "save-note":
            saveNote(
                action.dataset.id || null
            );
            break;

        case "delete-note":
            deleteNote(
                action.dataset.id
            );
            break;


        case "add-habit":
            openHabitModal();
            break;

        case "edit-habit": {

            const habit =
                db.habits.find(
                    h =>
                        h.id ===
                        action.dataset.id
                );

            if (habit) {
                openHabitModal(habit);
            }

            break;
        }

        case "save-habit":
            saveHabit(
                action.dataset.id || null
            );
            break;

        case "habit-plus":
            incrementHabit(
                action.dataset.id
            );
            break;

        case "delete-habit":
            deleteHabit(
                action.dataset.id
            );
            break;


        case "add-event":
            openEventModal();
            break;

        case "save-event":
            saveEvent(
                action.dataset.id || null
            );
            break;

        case "delete-event":
            deleteEvent(
                action.dataset.id
            );
            break;


        case "calendar-prev":

            state.calendarDate.setMonth(
                state.calendarDate.getMonth() - 1
            );

            renderPage("calendar");

            break;

        case "calendar-next":

            state.calendarDate.setMonth(
                state.calendarDate.getMonth() + 1
            );

            renderPage("calendar");

            break;

        case "calendar-today":

            state.calendarDate =
                new Date();

            renderPage("calendar");

            break;

        case "calendar-day":

            openEventModal(
                null,
                action.dataset.date ||
                action.closest(
                    "[data-calendar-date]"
                )?.dataset.calendarDate
            );

            break;


        case "open-focus":
            navigate("focus");
            break;

        case "focus-start":
            startFocus();
            break;

        case "focus-pause":
            pauseFocus();
            break;

        case "focus-reset":
            resetFocus();
            break;

        case "focus-preset":
            setFocusDuration(
                action.dataset.minutes
            );
            break;


        case "add-transaction":
            openTransactionModal();
            break;

        case "save-transaction":
            saveTransaction();
            break;

        case "delete-transaction":
            deleteTransaction(
                action.dataset.id
            );
            break;


        case "import-file":
            importFile();
            break;

        case "add-file":
            importFile();
            break;

        case "delete-file":
            deleteFile(
                action.dataset.id
            );
            break;


        case "backup":
            createBackup();
            break;

        case "restore":
            restoreBackup();
            break;

        case "export-report":
            exportReport();
            break;

        case "save-now":
            saveDatabase(true);
            break;


        case "save-profile":
            saveProfile();
            break;

        case "save-settings":
            saveSettings();
            break;

        case "toggle-notifications":
            toggleNotifications();
            break;

        case "toggle-sound":
            toggleSound();
            break;

        case "clear-data":
            clearAllData();
            break;


        case "theme":
            applyTheme(
                action.dataset.theme
            );

            renderPage(
                state.currentPage
            );

            break;


        case "quickAdd":
            openQuickAdd();
            break;

        case "quick-task":
            closeModal();
            openTaskModal();
            break;

        case "quick-note":
            closeModal();
            openNoteModal();
            break;

        case "quick-event":
            closeModal();
            openEventModal();
            break;

        case "quick-habit":
            closeModal();
            openHabitModal();
            break;

        case "quick-money":
            closeModal();
            openTransactionModal();
            break;

        case "quick-focus":
            closeModal();
            navigate("focus");
            break;


        case "close-modal":
            closeModal();
            break;


        case "themeToggle":

            applyTheme(
                db.settings.theme ===
                "dark"
                    ? "light"
                    : "dark"
            );

            break;


        default:
            break;
    }


    if (
        action.id ===
        "sidebarToggle"
    ) {
        toggleSidebar();
    }
}


/* =========================================================
   INPUT HANDLER
========================================================= */

function handleInput(event) {

    if (
        event.target.id ===
        "globalSearch"
    ) {

        state.search =
            event.target.value
                .trim()
                .toLowerCase();

        applyPageSearch();
    }


    if (
        event.target.id ===
        "fileSearch"
    ) {

        const value =
            event.target.value
                .trim()
                .toLowerCase();

        document
            .querySelectorAll(
                ".file-item"
            )
            .forEach(item => {

                const name =
                    (
                        item.dataset.fileName ||
                        ""
                    ).toLowerCase();

                item.classList.toggle(
                    "hidden",
                    value &&
                    !name.includes(value)
                );

            });
    }
}


/* =========================================================
   KEYBOARD
========================================================= */

function handleKeyboard(event) {

    if (
        (event.ctrlKey ||
            event.metaKey) &&
        event.key.toLowerCase() === "k"
    ) {

        event.preventDefault();

        const search =
            document.querySelector(
                "#globalSearch"
            );

        search?.focus();

        return;
    }


    if (event.key === "Escape") {

        closeModal();

        closeContextMenu();

        return;
    }


    if (
        (event.ctrlKey ||
            event.metaKey) &&
        event.key.toLowerCase() === "s"
    ) {

        event.preventDefault();

        saveDatabase(true);

        return;
    }


    if (
        (event.ctrlKey ||
            event.metaKey) &&
        event.key.toLowerCase() === "n"
    ) {

        event.preventDefault();

        openTaskModal();

        return;
    }


    if (
        event.code === "Space" &&
        state.currentPage === "focus" &&
        !isTypingTarget(event.target)
    ) {

        event.preventDefault();

        if (state.focusRunning) {
            pauseFocus();
        } else {
            startFocus();
        }

    }

}


/* =========================================================
   SIDEBAR
========================================================= */

function toggleSidebar() {

    const sidebar =
        document.querySelector(
            "#sidebar"
        );

    if (!sidebar) return;

    state.sidebarCollapsed =
        !state.sidebarCollapsed;

    sidebar.classList.toggle(
        "collapsed",
        state.sidebarCollapsed
    );
}


/* =========================================================
   SEARCH
========================================================= */

function applyPageSearch() {

    const query =
        state.search;

    const searchable =
        document.querySelectorAll(
            "[data-searchable]"
        );

    searchable.forEach(item => {

        if (!query) {

            item.classList.remove(
                "hidden"
            );

            return;
        }

        const text =
            (
                item.dataset.searchable ||
                item.textContent ||
                ""
            ).toLowerCase();

        item.classList.toggle(
            "hidden",
            !text.includes(query)
        );

    });
}


/* =========================================================
   STATUS
========================================================= */

function updateStatus() {

    const status =
        document.querySelector(
            "#statusMessage"
        );

    if (!status) return;

    status.textContent =
        "ذخیره محلی فعال";
}

function updateClock() {

    const clock =
        document.querySelector(
            "#clock"
        );

    if (!clock) return;

    clock.textContent =
        new Intl.DateTimeFormat(
            "fa-IR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        ).format(
            new Date()
        );
}


/* =========================================================
   XP
========================================================= */

function xpPercent() {
    return (
        (
            db.user.xp % 500
        ) /
        500 *
        100
    ).toFixed(1);
}


/* =========================================================
   TOAST
========================================================= */

function toast(
    message,
    type = "success",
    duration = 3000
) {

    const container =
        document.querySelector(
            "#toastContainer"
        );

    if (!container) return;

    const item =
        document.createElement(
            "div"
        );

    item.className =
        `toast ${type}`;

    item.textContent =
        message;

    container.appendChild(item);

    setTimeout(
        () => {

            item.style.opacity =
                "0";

            item.style.transform =
                "translateY(8px)";

            setTimeout(
                () => item.remove(),
                250
            );

        },
        duration
    );
}


/* =========================================================
   NOTIFICATION
========================================================= */

function notifyUser(
    title,
    message
) {

    if (
        !db.settings.notifications
    ) {
        return;
    }

    if (
        "Notification" in window
    ) {

        if (
            Notification.permission ===
            "granted"
        ) {

            new Notification(
                title,
                {
                    body: message
                }
            );

        } else if (
            Notification.permission !==
            "denied"
        ) {

            Notification
                .requestPermission()
                .then(permission => {

                    if (
                        permission ===
                        "granted"
                    ) {

                        new Notification(
                            title,
                            {
                                body:
                                    message
                            }
                        );

                    }

                });

        }

    }
}


/* =========================================================
   EMPTY STATE
========================================================= */

function emptyState(
    icon,
    title,
    description
) {
    return `
        <div class="empty-state">

            <div class="empty-state-icon">
                ${icon}
            </div>

            <strong>
                ${title}
            </strong>

            <p>
                ${description}
            </p>

        </div>
    `;
}


/* =========================================================
   DOWNLOAD
========================================================= */

function downloadText(
    content,
    filename,
    type = "text/plain"
) {

    const blob =
        new Blob(
            [content],
            { type }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


/* =========================================================
   UTILITIES
========================================================= */

function escapeHTML(value) {
    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
    return escapeHTML(value);
}

function isTypingTarget(element) {
    if (!element) return false;

    const tag =
        element.tagName?.toLowerCase();

    return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        element.isContentEditable
    );
}


/* =========================================================
   CONTEXT MENU
========================================================= */

function closeContextMenu() {
    const menu =
        document.querySelector(
            "#contextMenu"
        );

    if (!menu) return;

    menu.classList.add(
        "hidden"
    );
}


/* =========================================================
   AUTO SAVE
========================================================= */

setInterval(
    () => {

        if (
            db.settings.autoSave
        ) {
            saveDatabase();
        }

    },
    30000
);


/* =========================================================
   WINDOW API
   اگر بعداً Electron/Tauri وصل شود
========================================================= */

window.LifeDesk = {

    getDatabase() {
        return clone(db);
    },

    save() {
        saveDatabase(true);
    },

    navigate(page) {
        navigate(page);
    },

    addXP(amount) {
        addXP(amount);
    },

    backup() {
        createBackup();
    },

    restore() {
        restoreBackup();
    },

    reset() {
        clearAllData();
    },

    version: VERSION

};


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "LifeDesk error:",
            event.error
        );

    }
);

window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "LifeDesk promise error:",
            event.reason
        );

    }
);