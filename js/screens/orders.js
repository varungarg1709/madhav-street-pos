const ROW_HEIGHT = 80;
const VISIBLE_ROWS = 25;

let virtualStart = 0;
let currentFilteredOrders = [];

let ordersSearchCache = [];
let ordersState = {};
let ordersInitializing = false;
let dashboardPeriod = "today";

function getCurrentRole(){

  return (
    sessionStorage.getItem("ms_role") ||
    localStorage.getItem("ms_role") ||
    "guest"
  );

}

function normalizeDate(val) {
  if (!val) return "";
  return val.trim().slice(0, 10);
}

function initOrders() {

  showOrdersSkeleton();

  requestAnimationFrame(() => {

    ordersInitializing = true;

    const params = getRouteParams("orders");
    const today = getTodayLocal();

    ordersState = {
      from: params.orders_from || today,
      to: params.orders_to || today,
      customer: params.orders_customer || "",
      phone: params.orders_phone || "",
      status: params.orders_status || "",
      pending: params.orders_pending === "1"
    };

    const from = document.getElementById("ordersFromDate");
    const to = document.getElementById("ordersToDate");

    if (from) from.value = normalizeDate(ordersState.from);
    if (to) to.value = normalizeDate(ordersState.to);

    document.getElementById("filterCustomer").value =
      ordersState.customer;

    document.getElementById("filterPhone").value =
      ordersState.phone;

    document.getElementById("filterStatus").value =
      ordersState.status;

    document.getElementById("pendingOnly").checked =
      ordersState.pending;

    initVirtualScroll();
    buildOrdersCache();

    ordersInitializing = false;

    applyOrderFilters();

    if (!params.orders_from && !params.orders_to) {
      setDashboardPeriod("today");
    } else {
      dashboardPeriod = "custom";
    }

    hideOrdersSkeleton();
  });
}

function renderOrders(list) {

  const tableCard =
    document.querySelector(".orders-table-card");

  currentFilteredOrders = list;

  // reset virtual position after filtering
  virtualStart = 0;

  if (tableCard)
    tableCard.scrollTop = 0;

  renderVisibleRows();
}


function renderVisibleRows() {

  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  const isMobile = window.innerWidth <= 768;

  // ================= MOBILE MODE =================
  if (isMobile) {

    if (!currentFilteredOrders.length) {
      tbody.innerHTML =
        "<tr><td colspan='10'>No orders found</td></tr>";
      return;
    }

    let html = "";

    currentFilteredOrders.forEach((order, index) => {

      /* ===== PARSE ITEMS (LIMITED + TOOLTIP) ===== */
      let itemsHTML = "-";
      let tooltipText = "";

      try {
        const parsed = JSON.parse(order.itemsJSON || "{}");

        const entries = Object.keys(parsed).map(item => {
          return item + " × " + (parsed[item].qty || 0);
        });

        if (entries.length > 0) {

          tooltipText = entries.join("\n");

          const visibleItems = entries.slice(0, 3);

          itemsHTML = visibleItems
            .map(e => `<div class="order-item-line">${e}</div>`)
            .join("");

          if (entries.length > 3) {
            const remaining = entries.length - 3;
            itemsHTML += `
              <div class="order-item-more">
                +${remaining} more
              </div>
            `;
          }
        }

      } catch (err) {}

      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${order.billNo}</td>
          <td>${formatDateUI(order.date) || "-"}</td>
          <td>${order.name || "-"}</td>
          <td class="items-cell" title="${tooltipText}">
            ${itemsHTML}
          </td>
          <td>${order.phone || "-"}</td>
          <td>${order.table || "-"}</td>
          <td>₹${order.amount || 0}</td>
          <td>
            <span class="status-badge status-${(order.status || "").toLowerCase()}">
              ${order.status}
            </span>
          </td>
          <td>
            ${
              (order.status === "Paid" && getCurrentRole() !== "admin")
                ? `<span class="order-locked">🔒</span>`
                : `<button onclick="editOrder('${order.billNo}')">Edit</button>`
            }
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    return;
  }

  // ================= DESKTOP MODE (VIRTUAL SCROLL) =================

  const start = Math.min(
    virtualStart,
    Math.max(0, currentFilteredOrders.length - VISIBLE_ROWS)
  );

  const end = Math.min(
    start + VISIBLE_ROWS,
    currentFilteredOrders.length
  );

  if (!currentFilteredOrders.length) {
    tbody.innerHTML =
      "<tr><td colspan='10'>No orders found</td></tr>";
    return;
  }

  let html = "";

  html += `
    <tr style="height:${start * ROW_HEIGHT}px">
      <td colspan="10"></td>
    </tr>
  `;

  for (let i = start; i < end; i++) {

    const order = currentFilteredOrders[i];

    let itemsHTML = "-";
    let tooltipText = "";

    try {
      const parsed = JSON.parse(order.itemsJSON || "{}");

      const entries = Object.keys(parsed).map(item => {
        return item + " × " + (parsed[item].qty || 0);
      });

      if (entries.length > 0) {

        tooltipText = entries.join("\n");

        const visibleItems = entries.slice(0, 3);

        itemsHTML = visibleItems
          .map(e => `<div class="order-item-line">${e}</div>`)
          .join("");

        if (entries.length > 3) {
          const remaining = entries.length - 3;
          itemsHTML += `
            <div class="order-item-more">
              +${remaining} more
            </div>
          `;
        }
      }

    } catch (err) {}

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${order.billNo}</td>
        <td>${formatDateUI(order.date) || "-"}</td>
        <td>${order.name || "-"}</td>
        <td class="items-cell" title="${tooltipText}">
          ${itemsHTML}
        </td>
        <td>${order.phone || "-"}</td>
        <td>${order.table || "-"}</td>
        <td>₹${order.amount || 0}</td>
        <td>
          <span class="status-badge status-${(order.status || "").toLowerCase()}">
            ${order.status}
          </span>
        </td>
        <td>
          ${
            (order.status === "Paid" && getCurrentRole() !== "admin")
              ? `<span class="order-locked">🔒</span>`
              : `<button onclick="editOrder('${order.billNo}')">Edit</button>`
          }
        </td>
      </tr>
    `;
  }

  const remaining =
    (currentFilteredOrders.length - end) * ROW_HEIGHT;

  html += `
    <tr style="height:${remaining}px">
      <td colspan="10"></td>
    </tr>
  `;

  requestAnimationFrame(() => {
    tbody.innerHTML = html;
  });
}

function initVirtualScroll() {
  if (window.innerWidth <= 768) return;
  const tableCard =
    document.querySelector(".orders-table-card");

  if (!tableCard) return;

  tableCard.addEventListener("scroll", () => {

    const newStart =
      Math.floor(tableCard.scrollTop / ROW_HEIGHT);

    if (newStart !== virtualStart) {
      virtualStart = newStart;
      renderVisibleRows();
    }
  }, { passive : true });
}


function buildOrderStats(list) {

  let totalSales = 0;
  let cash = 0;
  let upi = 0;
  let totalBills = 0;
  let pendingAmount = 0;

  let partnerTotals = {
    "Varun Garg": 0,
    "Amit Nagpal": 0,
    "Cash Counter": 0
  };

  for (const o of list) {

    const amt = Number(o.amount) || 0;

    // paid stats
    if (o.status === "Paid") {

      totalSales += amt;
      totalBills++;

      let payRaw = o.paymentMode || "";
      let pay = { cash: 0, upi: 0, card: 0 };

      try {
        const parsed = JSON.parse(payRaw);
        pay.cash = Number(parsed.cash || 0);
        pay.upi  = Number(parsed.upi || 0);
        pay.card = Number(parsed.card || 0);
      } catch (err) {
        // fallback old format
        if (payRaw.includes("Cash")) pay.cash = amt;
        if (payRaw.includes("UPI"))  pay.upi  = amt;
        if (payRaw.includes("Card")) pay.card = amt;
      }

      cash += pay.cash;
      upi  += pay.upi;

      const partner = o.receivedBy || "Cash Counter";

      if (!partnerTotals[partner])
        partnerTotals[partner] = 0;

      partnerTotals[partner] += amt;
    }

    // pending
    if (o.status === "Pending" || o.status === "Partial") {
      pendingAmount += amt;
    }
  }

  return {
    totalSales,
    cash,
    upi,
    totalBills,
    avgBill: totalBills ? Math.round(totalSales / totalBills) : 0,
    pendingAmount,
    partnerTotals
  };
}

function applyOrderFilters() {

  // use cached data (FAST)
  let source = ordersSearchCache;
  const filtered = [];

  const fromDate =
    document.getElementById("ordersFromDate")?.value;

  const toDate =
    document.getElementById("ordersToDate")?.value;

  const customerRaw =
    document.getElementById("filterCustomer")?.value || "";

  const customer = customerRaw.toLowerCase();

  const phone =
    document.getElementById("filterPhone")?.value || "";

  const status =
    document.getElementById("filterStatus")?.value || "";

  const pendingOnly =
    document.getElementById("pendingOnly")?.checked;

  // 🔥 SINGLE LOOP FILTER (VERY FAST)
  for (const o of source) {

    if (fromDate && o._date < fromDate) continue;
    if (toDate && o._date > toDate) continue;
    if (customer && !o._name.includes(customer)) continue;
    if (phone && !o._phone.includes(phone)) continue;
    if (status && o._status !== status) continue;

    if (
      pendingOnly &&
      o._status !== "Pending" &&
      o._status !== "Partial"
    ) continue;

    filtered.push(o);
  }

  // save filters in URL
  if (!ordersInitializing) {
    setRouteParams("orders", {
      orders_from: fromDate,
      orders_to: toDate,
      orders_customer: customerRaw,
      orders_phone: phone,
      orders_status: status,
      orders_pending: pendingOnly ? "1" : ""
    });
  }

  // build stats once
  const stats = buildOrderStats(filtered);

  // render
  renderOrders(filtered);
  renderFilteredSummary(stats);
  renderPartnerStats(stats);
}


function editOrder(billNo) {

  const order =
    (APP_STORE.orderData || [])
      .find(o => o.billNo === billNo);

  if (!order) {
    alert("Order not found");
    return;
  }

  // store globally for POS
  window.EDIT_ORDER = order;

  // go to POS
  navigateTo("pos");

  // Try to instruct POS to load the edit order immediately. If POS
  // isn't ready yet, wait for the `screen-ready` event for the POS
  // screen and call the loader once — avoids fragile timeouts.
  try {
    if (typeof window.loadEditOrderIfAny === 'function') {
      // attempt immediate call (works if POS already initialized)
      window.loadEditOrderIfAny();
      return;
    }
  } catch (e) {}

  function onScreenReady(e) {
    if (!e || !e.detail || e.detail.screen !== 'pos') return;
    try {
      if (typeof window.loadEditOrderIfAny === 'function') {
        window.loadEditOrderIfAny();
      }
    } catch (err) {}
    window.removeEventListener('screen-ready', onScreenReady);
  }

  window.addEventListener('screen-ready', onScreenReady);
}

function renderFilteredSummary(stats) {
  const container = document.getElementById("salesSummary");
  if (!container) return;

  const {
    totalSales,
    cash,
    upi,
    avgBill,
    pendingAmount
  } = stats;

  container.innerHTML = `
<div class="sales-grid">

  <div class="sales-card card-total">
    Total Sales
    <span>₹${Number(totalSales).toLocaleString("en-IN")}</span>
  </div>

  <div class="sales-card card-cash">
    Cash
    <span>₹${cash}</span>
  </div>

  <div class="sales-card card-upi">
    UPI
    <span>₹${upi}</span>
  </div>

  <div class="sales-card card-avg">
    Avg Bill
    <span>₹${avgBill}</span>
  </div>

  <div class="sales-card card-pending">
    Pending
    <span>₹${pendingAmount}</span>
  </div>

</div>
`;
}


function renderPartnerStats(stats) {
  const container = document.getElementById("partnerStats");
  if (!container) return;

  const partnerTotals = stats.partnerTotals;

  container.innerHTML = `
<div class="sales-grid">
  <div class="sales-card card-varun">
    Varun
    <span>₹${partnerTotals["Varun Garg"] || 0}</span>
  </div>

  <div class="sales-card card-amit">
    Amit
    <span>₹${partnerTotals["Amit Nagpal"] || 0}</span>
  </div>

  <div class="sales-card card-counter">
    Cash Counter
    <span>₹${partnerTotals["Cash Counter"] || 0}</span>
  </div>
</div>
`;
}

function setDashboardPeriod(period) {

  dashboardPeriod = period;

  const todayStr = getTodayLocal();

  const fromEl = document.getElementById("ordersFromDate");
  const toEl = document.getElementById("ordersToDate");

  // 🔥 SAFE GUARD (fixes skeleton timing issue)
  if (!fromEl || !toEl) return;

  if (period === "today") {
    fromEl.value = todayStr;
    toEl.value = todayStr;
  }

  if (period === "month") {
    const monthStart = todayStr.slice(0, 7) + "-01";
    fromEl.value = monthStart;
    toEl.value = todayStr;
  }

  document
    .getElementById("periodToday")
    ?.classList.toggle("active", period === "today");

  document
    .getElementById("periodMonth")
    ?.classList.toggle("active", period === "month");

  applyOrderFilters();
}

function onDateChange() {

  // User selected custom range
  dashboardPeriod = "custom";

  // remove active styles
  document
    .getElementById("periodToday")
    ?.classList.remove("active");

  document
    .getElementById("periodMonth")
    ?.classList.remove("active");

  applyOrderFilters();
}

function buildOrdersCache() {

  const source = APP_STORE.orderData || [];

  ordersSearchCache = source.map(o => ({
    ...o,

    // precomputed fields (BIG SPEED BOOST)
    _name: (o.name || "").toLowerCase(),
    _phone: (o.phone || ""),
    _date: o.date || "",
    _status: o.status || ""
  }));
}

let filterTimer;

function debounceFilter() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(applyOrderFilters, 120);
}

window.initOrders = initOrders;
window.applyOrderFilters = applyOrderFilters;
window.editOrder = editOrder;
window.setDashboardPeriod = setDashboardPeriod;
window.onDateChange = onDateChange;
window.debounceFilter = debounceFilter;

function showOrdersSkeleton() {

  const screen = document.getElementById("ordersScreen");
  if (!screen) return;

  let sk = document.getElementById("ordersSkeleton");

  if (!sk) {
    sk = document.createElement("div");
    sk.id = "ordersSkeleton";
    sk.className = "orders-skeleton-overlay";

    sk.innerHTML = `
      <div class="skeleton skeleton-title"></div>

      <div class="orders-skeleton-cards">
        ${'<div class="skeleton skeleton-card"></div>'.repeat(5)}
      </div>

      ${'<div class="skeleton skeleton-table-row"></div>'.repeat(8)}
    `;

    screen.appendChild(sk);
  }

  sk.style.display = "block";
}

function hideOrdersSkeleton() {
  const sk = document.getElementById("ordersSkeleton");
  if (sk) sk.style.display = "none";
}

function getStaffName(code){

  const staff = APP_STORE.staffData || [];

  const found = staff.find(s => s.code === code);

  return found ? found.name : code;

}