let categories = [];
let tableOrders = {};
let currentTable = "GENERAL";
let editingBillNo = null; // for future edit support
let editOrderKey = null;

function initPOS() {
  if (!APP_STORE.loaded) {
    console.warn("Store not loaded yet");
    return;
  }
  setupPOS();
  populateOrderDetails();
  loadEditOrderIfAny();

  // Notify that POS screen finished initial rendering and is ready
  try {
    window.dispatchEvent(new CustomEvent('screen-ready', { detail: { screen: 'pos' } }));
  } catch (e) {}
}

function loadEditOrderIfAny() {
  const order = window.EDIT_ORDER;
  if (!order) return;

  editOrderKey = order.table || "GENERAL";
  currentTable = editOrderKey;

  editingBillNo = order.billNo;

  document.getElementById("billNumber").innerText =
    order.billNo || "";

  document.getElementById("customerName").value =
    order.name || "";

  document.getElementById("phone").value =
    order.phone || "";

  document.getElementById("orderDate").value =
    order.date || getTodayLocal();

  // tables (multi select support)
  const tableEl = document.getElementById("tableNo");
  if (tableEl && order.table) {
    const tables = order.table.split(",").map(t => t.trim());
    Array.from(tableEl.options).forEach(opt => {
      opt.selected = tables.includes(opt.value);
    });
  }

  // order type
  if (order.orderType) {
    const typeRadio = document.querySelector(
      `input[name="orderType"][value="${order.orderType}"]`
    );
    if (typeRadio) typeRadio.checked = true;
  }

  // load items
  tableOrders = {};
  let parsedItems = {};

  try {
    parsedItems = JSON.parse(order.itemsJSON || "{}");
  } catch {}

  tableOrders[currentTable] = parsedItems;

  renderBill();

  // restore async fields
  requestAnimationFrame(() => {

    function setSelectValue(selectEl, value) {
      if (!selectEl) return;
      const v = value || "";

      // try exact match first
      let opt = Array.from(selectEl.options).find(o => o.value === v);
      if (!opt) {
        // try case-insensitive match on value or text
        opt = Array.from(selectEl.options).find(o => (o.value||"").toLowerCase() === (v||"").toLowerCase() || (o.text||"").toLowerCase() === (v||"").toLowerCase());
      }

      if (opt) {
        selectEl.value = opt.value;
      } else {
        // if value is non-empty and option not found, append a custom option so it can be selected
        if (v) {
          const newOpt = document.createElement('option');
          newOpt.value = v;
          newOpt.textContent = v;
          selectEl.appendChild(newOpt);
          selectEl.value = v;
        } else {
          selectEl.value = "";
        }
      }
    }

    // populate order source with common alternate keys and simple inference
    const sourceVal = order.orderSource || order.order_source || order.source || "";
    // if still empty, infer Dine-in when table list looks like multiple tables
    let inferredSource = sourceVal;
    if (!inferredSource && order.table) {
      const t = String(order.table);
      if (t.includes(",") || /T\d+/i.test(t)) inferredSource = "Dine-in";
    }
    setSelectValue(document.getElementById("orderSource"), inferredSource);

    document.getElementById("discount").value = order.discount || "";

    // total members: accept common keys or infer from parsed items
    const membersEl = document.getElementById("totalMembers");
    if (membersEl) {
      let m = order.totalMembers || order.total_members || order.members || "";
      if (!m) {
        // infer from item quantities
        try {
          let sum = 0;
          Object.values(parsedItems || {}).forEach(raw => {
            if (raw == null) return;
            if (typeof raw === 'number') sum += Number(raw) || 0;
            else if (typeof raw === 'object') sum += Number(raw.qty || raw.quantity || 0) || 0;
          });
          if (sum) m = String(sum);
        } catch (e) {}
      }
      membersEl.value = m || "";
    }

    document.getElementById("feedback").value = order.feedback || "";

    setSelectValue(document.getElementById("eventType"), order.eventType || order.event_type || order.event || "");

    setSelectValue(document.getElementById("deliveredBy"), order.deliveredBy || order.receivedBy || "");

    // payment JSON
    let payment = {};
    try {
      payment = JSON.parse(order.paymentMode || "{}");
    } catch {}

    document.getElementById("cashAmount").value =
      payment.cash || "";

    document.getElementById("upiAmount").value =
      payment.upi || "";

    document.getElementById("cardAmount").value =
      payment.card || "";

    renderBill();
    updatePaymentStatus();
  });

  const saveBtn = document.getElementById("saveBillBtn");
  if (saveBtn) saveBtn.innerText = "UPDATE ORDER";

  window.EDIT_ORDER = null;
}

function setupPOS() {
  let today = getTodayLocal();
  document.getElementById("orderDate").value = today;

  // Tables
  const tableSelect = document.getElementById("tableNo");
  tableSelect.innerHTML = "";
  (APP_STORE.tableData || []).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tableSelect.appendChild(opt);
  });

  // Re-render bill when table changes
  tableSelect.addEventListener("change", renderBill);

  // Order sources
  const sourceSelect = document.getElementById("orderSource");
  sourceSelect.innerHTML = "";
  (APP_STORE.orderSources || []).forEach(src => {
    const opt = document.createElement("option");
    opt.value = src;
    opt.textContent = src;
    sourceSelect.appendChild(opt);
  });

  // Order types
  const typeContainer = document.getElementById("orderTypeContainer");
  typeContainer.innerHTML = "";
  (APP_STORE.orderTypes || []).forEach((type, index) => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="radio" name="orderType" value="${type}" ${index === 0 ? "checked" : ""}>
      <span>${type}</span>
    `;
    typeContainer.appendChild(label);
  });

  // Categories
  categories = [...new Set((APP_STORE.menuData || []).map(i => i.category))].sort();
  
  renderCategories();

// Mobile: show full menu
if (window.innerWidth <= 768) {
  showAllItems();
} else {
  showCategory(categories[0]);
}

  renderBill();
}

function renderCategories() {
  const bar = document.getElementById("categoryBar");
  bar.innerHTML = "";

  categories.forEach(cat => {
    const btn = document.createElement("div");
    btn.className = "category-btn";
    btn.innerText = cat;
    btn.onclick = () => showCategory(cat);
    bar.appendChild(btn);
  });
}

function createMenuItemButton(item) {
  const btn = document.createElement("div");
  btn.className = "menu-item";

  let name = (item.item || "").toLowerCase();

  // Default class
  let colorClass = "menu-regular";

  if (name.includes("half")) colorClass = "menu-half";
  if (name.includes("full")) colorClass = "menu-full";
  if (name.includes("white base")) colorClass = "menu-white";
  if (name.includes("brown base") || name.includes("wheat")) colorClass = "menu-brown";

  btn.classList.add(colorClass);

  const nameDiv = document.createElement("div");
  nameDiv.className = "item-name";
  nameDiv.textContent = item.item || "";

  const priceDiv = document.createElement("div");
  priceDiv.className = "item-price";
  priceDiv.textContent = "₹" + (item.price || "");

  btn.appendChild(nameDiv);
  btn.appendChild(priceDiv);

  btn.addEventListener("click", () => addItem(item));

  return btn;
}



function showCategory(category) {
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = "";

  // clear search when category changes
  const search = document.getElementById("menuSearch");
  if (search) search.value = "";

  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.classList.toggle("active", btn.innerText === category);
  });

  (APP_STORE.menuData || [])
  .filter(i => i.category === category)
  .forEach(item => {
    grid.appendChild(createMenuItemButton(item));
  });
}


function filterMenu() {
  const query = document.getElementById("menuSearch").value.toLowerCase();
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = "";

  let filtered = (APP_STORE.menuData|| []).filter(item =>
    item.item.toLowerCase().includes(query)
  );

  filtered.forEach(item => {
    grid.appendChild(createMenuItemButton(item));
  });
}

function getSelectedTable() {
  // If editing, always use edit table
  if (editingBillNo && editOrderKey) {
    return editOrderKey;
  }

  const typeEl = document.querySelector(
    'input[name="orderType"]:checked'
  );
  if (!typeEl) return "GENERAL";

  let orderType = typeEl.value;
  let orderSource =
    document.getElementById("orderSource").value;

  let selectedTables = Array.from(
    document.getElementById("tableNo").selectedOptions
  )
    .map(opt => opt.value)
    .join(", ");

  if (orderType === "Dine-in") {
    return selectedTables || null;
  }

  if (orderSource && orderSource !== "Walk-in") {
    return orderSource.toUpperCase();
  }

  return orderType.toUpperCase();
}


function addItem(item) {
  currentTable = getSelectedTable();

  if (!currentTable) {
    alert("Please select table for dine-in order");
    return;
  }

  if (!tableOrders[currentTable]) {
    tableOrders[currentTable] = {};
  }

  let order = tableOrders[currentTable];

  if (!order[item.item]) {
    order[item.item] = { qty: 0, price: item.price };
  }

  order[item.item].qty++;
  renderBill();
}

function changeQty(item, delta) {
  currentTable = getSelectedTable();
  let order = tableOrders[currentTable];

  if (!order || !order[item]) return;

  order[item].qty += delta;

  if (order[item].qty <= 0) {
    delete order[item];
  }

  renderBill();
}

function setQty(item, value) {
  currentTable = getSelectedTable();
  let order = tableOrders[currentTable];

  if (!order || !order[item]) return;

  let qty = parseInt(value) || 0;

  if (qty <= 0) {
    delete order[item];
  } else {
    order[item].qty = qty;
  }

  renderBill();
}

function removeItem(item) {
  currentTable = getSelectedTable();
  let order = tableOrders[currentTable];

  if (!order) return;

  delete order[item];
  renderBill();
}


function renderBill() {
  const container = document.getElementById("billItems");
  container.innerHTML = "";

  currentTable = getSelectedTable();
  let order = tableOrders[currentTable] || {};

  let subtotal = 0;
  let hasItems = false;

  for (let item in order) {
    hasItems = true;

    const lineTotal = order[item].qty * order[item].price;
    subtotal += lineTotal;

    const line = document.createElement("div");
    line.className = "bill-line";

    const nameDiv = document.createElement("div");
    nameDiv.className = "bill-item-name";
    nameDiv.textContent = item;

    const qtyControls = document.createElement("div");
    qtyControls.className = "qty-controls";

    const minusBtn = document.createElement("button");
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "−";
    minusBtn.addEventListener("click", () => changeQty(item, -1));

    const qtyInput = document.createElement("input");
    qtyInput.className = "qty-input";
    qtyInput.type = "number";
    qtyInput.min = 1;
    qtyInput.value = order[item].qty;
    qtyInput.addEventListener("change", function () {
      setQty(item, this.value);
    });

    const plusBtn = document.createElement("button");
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => changeQty(item, 1));

    qtyControls.appendChild(minusBtn);
    qtyControls.appendChild(qtyInput);
    qtyControls.appendChild(plusBtn);

    const totalDiv = document.createElement("div");
    totalDiv.className = "bill-item-total";
    totalDiv.textContent = "₹" + lineTotal;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✖";
    removeBtn.addEventListener("click", () => removeItem(item));

    line.appendChild(nameDiv);
    line.appendChild(qtyControls);
    line.appendChild(totalDiv);
    line.appendChild(removeBtn);

    container.appendChild(line);
  }

  // Show empty state
  if (!hasItems) {
    container.innerHTML =
      '<div class="empty-text">Tap menu items to add</div>';
  }

  document.getElementById("subtotal").innerText = subtotal;

  let discount = parseFloat(document.getElementById("discount").value) || 0;
  let total = subtotal - discount;
  if (total < 0) total = 0;

  document.getElementById("total").innerText = total;
  updatePaymentStatus();
  const mobileTotal = document.getElementById("mobileTotal");
if (mobileTotal) {
  mobileTotal.innerText = total;
}

}

function clearBill() {

  if (!editingBillNo) {
    currentTable = getSelectedTable();
  }
  delete tableOrders[currentTable];

  document.getElementById("billItems").innerHTML =
    '<div class="empty-text">Tap menu items to add</div>';

  document.getElementById("subtotal").innerText = "0";
  document.getElementById("total").innerText = "0";

  document.getElementById("discount").value = "";

  document.getElementById("cashAmount").value = "";
  document.getElementById("upiAmount").value = "";
  document.getElementById("cardAmount").value = "";

  document.getElementById("paidTotal").innerText = "0";
  document.getElementById("paymentStatus").innerText = "Pending";

  document.getElementById("customerName").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("feedback").value = "";

  const membersEl = document.getElementById("totalMembers");
  if (membersEl) membersEl.value = "";

  const sourceEl = document.getElementById("orderSource");
  if (sourceEl) sourceEl.selectedIndex = 0;

  const eventEl = document.getElementById("eventType");
  if (eventEl) eventEl.selectedIndex = 0;

  const deliveredEl = document.getElementById("deliveredBy");
  if (deliveredEl) deliveredEl.selectedIndex = 0;

  document.getElementById("billNumber").innerText =
    "MS/--/----/---";

  // reset edit mode
  editingBillNo = null;
  currentTable = "GENERAL";

  // reset save button text
  const saveBtn = document.getElementById("saveBillBtn");
  if (saveBtn) saveBtn.innerText = "SAVE BILL";
}


function updatePaymentStatus() {
  let cash = parseFloat(document.getElementById("cashAmount").value) || 0;
  let upi = parseFloat(document.getElementById("upiAmount").value) || 0;
  let card = parseFloat(document.getElementById("cardAmount").value) || 0;

  let paid = cash + upi + card;
  let total = parseFloat(document.getElementById("total").innerText) || 0;

  document.getElementById("paidTotal").innerText = paid;

  let status = "Pending";
  if (paid >= total && total > 0) status = "Paid";
  else if (paid > 0 && paid < total) status = "Partial";

  document.getElementById("paymentStatus").innerText = status;
}


function sendBillToWhatsApp(phone, billText) {
  let cleanPhone = phone.replace(/\D/g, "");

  // Add country code if missing
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  if (cleanPhone.length < 12) {
    alert("Invalid phone number");
    return;
  }

  let encodedText = encodeURIComponent(billText);
  let url = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  window.open(url, "_blank");
}

function generateTempBillNumber() {
  const now = new Date();

  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);

  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `MS-${dd}${mm}${yy}-${hh}${min}`;
}


function generateWhatsappBillText(order, total, subtotal, discount) {
  let billNoEl = document.getElementById("billNumber");
let billNo = billNoEl.innerText;

if (!billNo || billNo.includes("--")) {
  billNo = generateTempBillNumber();
}

  let orderType = document.querySelector('input[name="orderType"]:checked').value;
  let customer = document.getElementById("customerName").value || "Guest";
  let date = new Date().toLocaleString("en-IN");

  let text = "🍽 *MADHAV STREET*\n\n";
  text += `*Bill No:* ${billNo}\n`;
  text += `*Date:* ${date}\n`;
  text += `*Order Type:* ${orderType}\n`;
  text += `*Customer:* ${customer}\n\n`;
  text += "-----------------------------\n";
  text += "*ITEMS*\n";

  for (let item in order) {
  let qty = order[item].qty;
  let price = order[item].price;
  let lineTotal = qty * price;
  text += `${item} ${price}×${qty} = ₹${lineTotal}\n`;
}


  text += "\n-----------------------------\n";
text += `*Subtotal:* ₹${subtotal}\n`;

if (discount > 0) {
  text += `*Discount:* ₹${discount}\n`;
}

text += `*Grand Total:* *₹${total}*\n\n`;

  text += "🙏 Thank you for visiting\n*Madhav Street*";

  return text;
}


function saveBill() {
  currentTable = getSelectedTable();
  let order = tableOrders[currentTable] || {};

  if (Object.keys(order).length === 0) {
    alert("No items in this bill");
    return;
  }

  // Save items as JSON
  let items = JSON.stringify(order);

  let cash = parseFloat(document.getElementById("cashAmount").value) || 0;
  let upi = parseFloat(document.getElementById("upiAmount").value) || 0;
  let card = parseFloat(document.getElementById("cardAmount").value) || 0;

  const paymentJSON = JSON.stringify({
    cash,
    upi,
    card
  });

  // Helper to safely set hidden fields
  function setHidden(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  // Use editingBillNo to decide update vs new
  setHidden("f_billNo", editingBillNo || "");

  setHidden("f_orderDate", document.getElementById("orderDate").value);
  setHidden("f_customerName", document.getElementById("customerName").value);
  setHidden("f_phone", document.getElementById("phone").value);
  setHidden("f_tableNo", currentTable);

  const typeEl = document.querySelector('input[name="orderType"]:checked');
  setHidden("f_orderType", typeEl ? typeEl.value : "");

  setHidden("f_orderSource", document.getElementById("orderSource").value);
  setHidden("f_deliveredBy", document.getElementById("deliveredBy").value);
  setHidden("f_orderItems", items);

  setHidden("f_amount", document.getElementById("total").innerText);
  setHidden("f_discount", document.getElementById("discount").value);

  setHidden("f_paymentMode", paymentJSON);
  setHidden(
    "f_paymentStatus",
    document.getElementById("paymentStatus").innerText
  );

  // Received by
const receiverEl = document.querySelector(
  'input[name="receivedBy"]:checked'
);
setHidden(
  "f_receivedBy",
  receiverEl ? receiverEl.value : "Varun Garg"
);


  setHidden("f_eventType", document.getElementById("eventType").value);
  setHidden("f_totalMembers", document.getElementById("totalMembers").value);
  setHidden("f_feedback", document.getElementById("feedback").value);

  // Submit form
  document.getElementById("hiddenForm").submit();

  // reload after backend writes
setTimeout(() => {
  reloadData(() => {
    clearBill();
  });
}, 800);

  // WhatsApp sending
  const sendWA = document.getElementById("sendWhatsapp");
  const phone = document.getElementById("phone").value;

  if (sendWA && sendWA.checked && phone) {
    let cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    if (cleanPhone.length >= 12) {
      let subtotal = 0;
      for (let item in order) {
        subtotal += order[item].qty * order[item].price;
      }

      let discount =
        parseFloat(document.getElementById("discount").value) || 0;
      let total = subtotal - discount;

      let billText = generateWhatsappBillText(
        order,
        total,
        subtotal,
        discount
      );

      let encodedText = encodeURIComponent(billText);
      let url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      window.open(url, "_blank");
    }
  }

  // Reset edit state
  editingBillNo = null;

  delete tableOrders[currentTable];
  clearBill();

  alert("Bill saved successfully");
}



function populateOrderDetails() {
  // Event Types
  const eventSelect = document.getElementById("eventType");
  if (eventSelect) {
    eventSelect.innerHTML = '<option value="">Event type</option>';
    (APP_STORE.eventTypes || []).forEach(type => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      eventSelect.appendChild(opt);
    });
  }

  // Staff (Delivered By)
  const staffSelect = document.getElementById("deliveredBy");
  if (staffSelect) {
    staffSelect.innerHTML = '<option value="">Delivered by</option>';
    (APP_STORE.staffData || []).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      staffSelect.appendChild(opt);
    });
  }
}

function toggleBill() {
  const bill = document.querySelector(".bill");
  bill.classList.toggle("open");
}

function showAllItems() {
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = "";

  (APP_STORE.menuData || []).forEach(item => {
    grid.appendChild(createMenuItemButton(item));
  });
}


function printBill() {
  currentTable = getSelectedTable();
  let order = tableOrders[currentTable] || {};

  if (Object.keys(order).length === 0) {
    alert("No items to print");
    return;
  }

  // Bill no
  let billNo = document.getElementById("billNumber").innerText;
  if (!billNo || billNo.includes("--")) {
    billNo = generateTempBillNumber();
  }

  document.getElementById("p_billNo").innerText = billNo;
  document.getElementById("p_date").innerText =
    new Date().toLocaleString("en-IN");

  document.getElementById("p_customer").innerText =
    document.getElementById("customerName").value || "Guest";

  document.getElementById("p_orderType").innerText =
    document.querySelector('input[name="orderType"]:checked').value;

  // Items
  let itemsDiv = document.getElementById("p_items");
  itemsDiv.innerHTML = "";

  let subtotal = 0;

  for (let item in order) {
    let qty = order[item].qty;
    let price = order[item].price;
    let total = qty * price;
    subtotal += total;

    let row = document.createElement("div");
    row.className = "print-item";
    row.innerHTML = `
      <div class="print-name">${item}</div>
      <div class="print-qty">${qty}</div>
      <div class="print-price">₹${total}</div>
    `;
    itemsDiv.appendChild(row);
  }

  let discount =
    parseFloat(document.getElementById("discount").value) || 0;

  let grandTotal = subtotal - discount;

  document.getElementById("p_subtotal").innerText = subtotal;
  document.getElementById("p_total").innerText = grandTotal;

  if (discount > 0) {
    document.getElementById("p_discount").innerText = discount;
    document.getElementById("p_discount_row").style.display = "block";
  } else {
    document.getElementById("p_discount_row").style.display = "none";
  }

  window.print();
}

function autoFillCustomerFromPhone() {
  const phoneInput = document.getElementById("phone");
  const nameInput = document.getElementById("customerName");

  if (!phoneInput || !nameInput) return;
  if (!APP_STORE.orderData || !APP_STORE.orderData.length) return;

  let phone = phoneInput.value.replace(/\D/g, ""); // digits only

  if (phone.length < 10) return;

  // search latest orders first
  const match = APP_STORE.orderData
    .slice()
    .reverse()
    .find(o => {
      if (!o.phone) return false;
      let p = o.phone.toString().replace(/\D/g, "");
      return p.endsWith(phone);
    });

  if (match && match.name) {
    nameInput.value = match.name;
  }
}

// expose helper so other screens can request POS to load an edit order
window.loadEditOrderIfAny = loadEditOrderIfAny;
