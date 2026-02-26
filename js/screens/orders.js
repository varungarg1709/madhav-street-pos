let ordersState = {};
let ordersInitializing = false;
let dashboardPeriod = "today";

function normalizeDate(val) {
  if (!val) return "";
  return val.trim().slice(0, 10);
}

function initOrders() {
  ordersInitializing = true;
  const params = getRouteParams("orders");

  const today = new Date().toISOString().split("T")[0];

  ordersState = {
    from: params.orders_from || today,
    to: params.orders_to || today,
    customer: params.orders_customer || "",
    phone: params.orders_phone || "",
    status: params.orders_status || "",
    pending: params.orders_pending === "1"
    };

    console.log("FROM:", ordersState.from);
console.log("TO:", ordersState.to);

  const from = document.getElementById("ordersFromDate");
  const to = document.getElementById("ordersToDate");

  if (from)
  from.value = normalizeDate(ordersState.from);

if (to)
    to.value = normalizeDate(ordersState.to);

  const customer = document.getElementById("filterCustomer");
  const phone = document.getElementById("filterPhone");
  const status = document.getElementById("filterStatus");
  const pending = document.getElementById("pendingOnly");

  if (customer) customer.value = ordersState.customer;
if (phone) phone.value = ordersState.phone;
if (status) status.value = ordersState.status;
if (pending) pending.checked = ordersState.pending;

  applyOrderFilters();
  ordersInitializing = false;
  setDashboardPeriod("today");
}




function renderOrders(list) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list || !list.length) {
    tbody.innerHTML =
      "<tr><td colspan='8'>No orders found</td></tr>";
    return;
  }

  list.forEach((order, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${order.billNo}</td>
      <td>${formatDateUI(order.date) || "-"}</td>
      <td>${order.name || "-"}</td>
      <td>${order.phone || "-"}</td>
      <td>${order.table || "-"}</td>
      <td>₹${order.amount || 0}</td>
      <td>
  <span class="status-badge status-${(order.status || "").toLowerCase()}">
    ${order.status}
  </span>
</td>

      <td>
        <button onclick="editOrder('${order.billNo}')">
          Edit
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}


function applyOrderFilters() {
  let filtered = [...APP_STORE.orderData];

  const today = new Date();
const todayStr = today.toISOString().split("T")[0];

// RESET date filters when dashboard toggle used
if (dashboardPeriod === "today") {
  document.getElementById("ordersFromDate").value = todayStr;
  document.getElementById("ordersToDate").value = todayStr;
}

if (dashboardPeriod === "month") {
  const monthStart = todayStr.slice(0, 7) + "-01";
  document.getElementById("ordersFromDate").value = monthStart;
  document.getElementById("ordersToDate").value = todayStr;
}

  const fromDate = document.getElementById("ordersFromDate")?.value;
  const toDate = document.getElementById("ordersToDate")?.value;

    const customerRaw = document.getElementById("filterCustomer")?.value || "";
    const customer = customerRaw.toLowerCase();

  const phone = document
    .getElementById("filterPhone")
    ?.value;

  const status = document
    .getElementById("filterStatus")
    ?.value;

  const pendingOnly = document
    .getElementById("pendingOnly")
    ?.checked;

  // Date range filter
  if (fromDate) {
    filtered = filtered.filter(o => o.date >= fromDate);
  }

  if (toDate) {
    filtered = filtered.filter(o => o.date <= toDate);
  }

  // Customer filter
  if (customer) {
    filtered = filtered.filter(o =>
      (o.name || "").toLowerCase().includes(customer)
    );
  }

  // Phone filter
  if (phone) {
    filtered = filtered.filter(o =>
      (o.phone || "").includes(phone)
    );
  }

  // Status filter
  if (status) {
    filtered = filtered.filter(o => o.status === status);
  }

  // Pending only
  if (pendingOnly) {
    filtered = filtered.filter(
      o => o.status === "Pending" || o.status === "Partial"
    );
  }

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

  renderOrders(filtered);
  renderFilteredSummary(filtered);
  renderPartnerStats(filtered);
}

function editOrder(billNo) {

  const order =
    (APP_STORE.orderData || [])
      .find(o => o.billNo === billNo);

  if (!order) {
    alert("Order not found");
    return;
  }

  // store globally so POS can access
  window.EDIT_ORDER = order;

  // switch screen
  navigateTo("pos");

  // wait until POS DOM loads
  setTimeout(() => {

    // tell POS we are editing
    editingBillNo = billNo;

    // show bill number
    const billEl =
      document.getElementById("billNumber");

    if (billEl) billEl.innerText = billNo;

    // customer name
    const nameEl =
      document.getElementById("customerName");

    if (nameEl)
      nameEl.value = order.name || "";

    // phone
    const phoneEl =
      document.getElementById("phone");

    if (phoneEl)
      phoneEl.value = order.phone || "";

    // date
    const dateEl =
      document.getElementById("orderDate");

    if (dateEl && order.date)
      dateEl.value = order.date;

    // discount
    const discEl =
      document.getElementById("discount");

    if (discEl)
      discEl.value = order.discount || "";

    // received by
    if (order.receivedBy) {
      const receiverRadio = document.querySelector(
        `input[name="receivedBy"][value="${order.receivedBy}"]`
      );
      if (receiverRadio)
        receiverRadio.checked = true;
    }

    // clear table memory
    tableOrders = {};

    // parse items safely
    let parsedItems = {};

    try {
      if (order.itemsJSON &&
          order.itemsJSON.startsWith("{")) {
        parsedItems =
          JSON.parse(order.itemsJSON);
      }
    } catch (e) {
      console.error("Item parse error:", e);
    }

    currentTable = "EDIT_ORDER";
    tableOrders[currentTable] = parsedItems;

    renderBill();

  }, 150); // IMPORTANT delay

}

function renderFilteredSummary(list) {
  const container = document.getElementById("salesSummary");
  if (!container) return;

  let totalSales = 0;
  let cash = 0;
  let upi = 0;
  let totalBills = 0;

  list.forEach(o => {
  if (o.status === "Paid") {
    totalSales += Number(o.amount) || 0;
    totalBills++;

    if ((o.paymentMode || "").includes("Cash"))
      cash += Number(o.amount) || 0;

    if ((o.paymentMode || "").includes("UPI"))
      upi += Number(o.amount) || 0;
  }
});


  let avgBill =
    totalBills > 0
      ? Math.round(totalSales / totalBills)
      : 0;

  const pendingAmount = list
  .filter(o => o.status === "Pending" || o.status === "Partial")
  .reduce((sum, o) => sum + Number(o.amount || 0), 0);

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


function renderPartnerStats(list) {
  const container = document.getElementById("partnerStats");
  if (!container) return;

  let partnerTotals = {
    "Varun Garg": 0,
    "Amit Nagpal": 0,
    "Cash Counter": 0
  };

  list.forEach(o => {
    if (o.status === "Paid") {
      let amt = Number(o.amount) || 0;
      let partner = o.receivedBy || "Cash Counter";

      if (!partnerTotals[partner]) {
        partnerTotals[partner] = 0;
      }

      partnerTotals[partner] += amt;
    }
  });

  container.innerHTML = `
<div class="sales-grid">

  <div class="sales-card card-varun">
    Varun
    <span>₹${partnerTotals["Varun Garg"]}</span>
  </div>

  <div class="sales-card card-amit">
    Amit
    <span>₹${partnerTotals["Amit Nagpal"]}</span>
  </div>

  <div class="sales-card card-counter">
    Cash Counter
    <span>₹${partnerTotals["Cash Counter"]}</span>
  </div>

</div>
`;
}


function formatDateUI(dateStr) {
  if (!dateStr) return "";

  const d = new Date(dateStr);

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function setDashboardPeriod(period) {

  dashboardPeriod = period;

  document
    .getElementById("periodToday")
    ?.classList.toggle("active", period === "today");

  document
    .getElementById("periodMonth")
    ?.classList.toggle("active", period === "month");

  applyOrderFilters();
}

window.initOrders = initOrders;
window.applyOrderFilters = applyOrderFilters;
window.editOrder = editOrder;
window.setDashboardPeriod = setDashboardPeriod;