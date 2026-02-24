let categories = [];
let tableOrders = {};
let currentTable = "GENERAL";
let editingBillNo = null; // for future edit support

function initPOS() {
  if (!APP_STORE.loaded) {
    console.warn("Store not loaded yet");
    return;
  }
  setupPOS();
  populateOrderDetails();
}

function setupPOS() {
  let today = new Date().toISOString().split("T")[0];
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

  let name = item.item.toLowerCase();

  // Default class
  let colorClass = "menu-regular";

  if (name.includes("half")) {
    colorClass = "menu-half";
  }
  if (name.includes("full")) {
    colorClass = "menu-full";
  }
  if (name.includes("white base")) {
    colorClass = "menu-white";
  }
  if (name.includes("brown base") || name.includes("wheat")) {
    colorClass = "menu-brown";
  }

  btn.classList.add(colorClass);

  btn.innerHTML = `
    <div class="item-name">${item.item}</div>
    <div class="item-price">₹${item.price}</div>
  `;

  btn.onclick = () => addItem(item);
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
  if (currentTable === "EDIT_ORDER") {
    return "EDIT_ORDER";
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
    line.innerHTML = `
      <div class="bill-item-name">${item}</div>

      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQty('${item}', -1)">−</button>
        <input 
          class="qty-input" 
          type="number" 
          min="1"
          value="${order[item].qty}" 
          onchange="setQty('${item}', this.value)">
        <button class="qty-btn" onclick="changeQty('${item}', 1)">+</button>
      </div>

      <div class="bill-item-total">₹${lineTotal}</div>

      <button class="remove-btn" onclick="removeItem('${item}')">✖</button>
    `;

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
  currentTable = getSelectedTable();
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

  document.getElementById("billNumber").innerText = "MS/--/----/---";
  editingBillNo = null;

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

  let paymentMode = [];
  if (cash > 0) paymentMode.push("Cash");
  if (upi > 0) paymentMode.push("UPI");
  if (card > 0) paymentMode.push("Card");

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

  setHidden("f_paymentMode", paymentMode.join(", "));
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
