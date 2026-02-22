const screenLifecycle = {
  pos: false,
  bookings: false,
  orders: false,
  expenses: false,
  items: false,
  settings: false
};

const scriptURL = "https://script.google.com/macros/s/AKfycbzjUEudtEexSWR2RCS3FCTEdUP9scpwyi7Pou64p0m_GQMOsXptazuLmW8qjPGv0VBd/exec";

let orderData = [];
let tableStatusData = {};
let summaryData = {};
let menuData = [];
let staffData = [];
let tableData = [];
let bookingData = [];
let eventTypes = [];
let orderTypes = [];
let orderSources = [];

/* ===== EXPENSE DATA ===== */
let expenseCategories = [];
let payingAccounts = [];
let expenseTypes = [];
let paidByList = [];
let expenseModes = [];
let vendors = [];

window.onload = async function () {
  await loadInitialData();
  handleRoute();
};

// Navigation function
function navigateTo(screen) {
  location.hash = "/" + screen;
}

// Route handler
function handleRoute() {
  let hash = location.hash.replace("#/", "");

  // REMOVE query params (IMPORTANT)
  hash = hash.split("?")[0];

  if (!hash) hash = "pos";

  showScreen(hash);
}

// Listen to URL changes
window.addEventListener("hashchange", handleRoute);

function showScreen(screen) {

  // Hide all screens
  document.getElementById("posScreen").style.display = "none";
  document.getElementById("bookingsScreen").style.display = "none";
  document.getElementById("ordersScreen").style.display = "none";
  document.getElementById("expensesScreen").style.display = "none";
  document.getElementById("itemsScreen").style.display = "none";
  document.getElementById("settingsScreen").style.display = "none";

  // remove nav active
  document.querySelectorAll(".sidebar-nav button")
    .forEach(btn => btn.classList.remove("active"));

  /* ========= POS ========= */
  if (screen === "pos") {
    document.getElementById("posScreen").style.display = "block";
    document.getElementById("nav-pos").classList.add("active");

    if (!screenLifecycle.pos) {
      initPOS();
      screenLifecycle.pos = true;
    }
  }

  /* ========= BOOKINGS ========= */
  if (screen === "bookings") {
    document.getElementById("bookingsScreen").style.display = "block";
    document.getElementById("nav-bookings").classList.add("active");

    if (!screenLifecycle.bookings) {
      initBookings();
      screenLifecycle.bookings = true;
    }
  }

  /* ========= ORDERS ========= */
  if (screen === "orders") {
    document.getElementById("ordersScreen").style.display = "block";
    document.getElementById("nav-orders").classList.add("active");

    if (!screenLifecycle.orders) {
      initOrders();
      screenLifecycle.orders = true;
    } else {
      // only refresh render
      applyOrderFilters();
    }
  }

  /* ========= EXPENSES ========= */
  if (screen === "expenses") {
    document.getElementById("expensesScreen").style.display = "block";
    document.getElementById("nav-expenses").classList.add("active");

    if (!screenLifecycle.expenses) {
      initExpenses();
      screenLifecycle.expenses = true;
    } else {
      applyExpenseFilters();
    }
  }

  if (screen === "items") {
  document.getElementById("itemsScreen").style.display = "block";
  document.getElementById("nav-items").classList.add("active");

  if (!screenLifecycle.items) {
    initItemsStats();
    screenLifecycle.items = true;
  } else {
    applyItemsFilters();
  }
}

  /* ========= SETTINGS ========= */
  if (screen === "settings") {
    document.getElementById("settingsScreen").style.display = "block";
    document.getElementById("nav-settings").classList.add("active");

    if (!screenLifecycle.settings) {
      initSettings();
      screenLifecycle.settings = true;
    }
  }
}



async function loadInitialData() {
    try {
        const res = await fetch(scriptURL);
        const data = await res.json();

        console.log("Loaded data:", data);
      
        // POS data
        menuData = data.menu || [];
        staffData = data.staffNames || [];
        tableData = data.tables || [];
        bookingData = data.bookings || [];
        eventTypes = data.eventTypes || [];
        orderTypes = data.orderTypes || [];
        orderSources = data.orderSources || [];
        orderData = data.orders || [];
        tableStatusData = data.tableStatus || {};
        summaryData = data.summary || {};
      
        // EXPENSE data
        expenseCategories = data.expenseCategories || [];
        payingAccounts = data.payingAccounts || [];
        expenseTypes = data.expenseTypes || [];
        paidByList = data.paidByList || [];
        expenseModes = data.expenseModes || [];
        vendors = data.vendors || [];
        expenseData = data.expenses || [];
    } catch (err) {
        console.error("Data load error:", err);
    }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
}


function reloadData(callback) {
  fetch(scriptURL)
    .then(res => res.json())
    .then(data => {
      console.log("Reloaded data:", data);

      // POS data
      menuData = data.menu || [];
      staffData = data.staffNames || [];
      tableData = data.tables || [];
      bookingData = data.bookings || [];
      eventTypes = data.eventTypes || [];
      orderTypes = data.orderTypes || [];
      orderSources = data.orderSources || [];
      orderData = data.orders || [];
      tableStatusData = data.tableStatus || {};
      summaryData = data.summary || {};

      // EXPENSE data
      expenseCategories = data.expenseCategories || [];
      payingAccounts = data.payingAccounts || [];
      expenseTypes = data.expenseTypes || [];
      paidByList = data.paidByList || [];
      expenseModes = data.expenseModes || [];
      vendors = data.vendors || [];
      expenseData = data.expenses || [];

      // Refresh screens safely
      if (typeof applyOrderFilters === "function") {
        applyOrderFilters();
      }

      if (typeof applyExpenseFilters === "function") {
        applyExpenseFilters();
      }

      if (callback) callback();
    })
    .catch(err => console.error("Reload error:", err));
}