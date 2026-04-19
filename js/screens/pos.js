if (window.__POS_LOADED__) {
  console.warn("pos.js already loaded");
  throw new Error("Duplicate load blocked");
}
window.__POS_LOADED__ = true;

let CURRENT_POS_REQUEST = null;

const SUPABASE_URL = CONFIG.supabaseUrl;
const SUPABASE_ANON_KEY = CONFIG.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase config missing");
}

// cache to avoid multiple calls
let SUPABASE_MENU_CACHE = null;
let SUPABASE_MENU_TS = 0;
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 mins

let MASTER_CACHE = null;
let MASTER_TS = 0;
const MASTER_TTL = 5 * 60 * 1000;

let isMenuLoading = false;
let selectedTables = [];
let categories = [];
let tableOrders = {};
let currentTable = "GENERAL";
let editingBillNo = null; // for future edit support
let editOrderKey = null;

function getSupabaseClient() {
  console.log("Supabase init check:", !!window.supabase);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!window.supabase) {
    if (!window.__SUPABASE_WARNED__) {
      console.warn("Supabase library not loaded");
      window.__SUPABASE_WARNED__ = true;
    }
    return null;
  }

  if (!window._supabaseClient) {
    window._supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
  }

  return window._supabaseClient;
}

function initPOS() {
  loadPOSData(() => {
    setupPOS();
    console.log("🚀 setupPOS triggered");
    populateOrderDetails();
    loadEditOrderIfAny();
    buildStaffDropdown();
    buildStaffSelector();
    renderTableGrid();

    try {
      window.dispatchEvent(
        new CustomEvent("screen-ready", { detail: { screen: "pos" } })
      );
    } catch (e) {}
  });
}

function loadEditOrderIfAny(){
  const order = window.EDIT_ORDER;
  if(!order) return;

  editOrderKey = order.table || "GENERAL";
  editingBillNo = order.billNo;

  /* BASIC FIELDS */

  document.getElementById("billNumber").innerText = order.billNo || "";
  document.getElementById("customerName").value = order.name || "";
  document.getElementById("phone").value = order.phone || "";
  document.getElementById("orderDate").value = order.date || getTodayLocal();
  const dateInput = document.getElementById("orderDate");
  if(dateInput){
    dateInput.disabled = true;
  }

  /* TABLE RESTORE */

  selectedTables = (order.table || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  currentTable = selectedTables.join(",");

  const tableSelect = document.getElementById("tableNo");

  if(tableSelect && selectedTables.length){
    Array.from(tableSelect.options).forEach(opt=>{
      opt.selected = selectedTables.includes(opt.value);
    });
  }

  renderTableGrid();

  /* ORDER TYPE */

  if(order.orderType){

    const typeRadio = document.querySelector(
      `input[name="orderType"][value="${order.orderType}"]`
    );

    if(typeRadio) typeRadio.checked = true;

  }

  /* ITEMS */

  tableOrders = {};

  let parsedItems = {};

  try{
    parsedItems = JSON.parse(order.itemsJSON || "{}");
  }catch{}

  tableOrders[currentTable] = parsedItems;

  /* DISCOUNT BEFORE RENDER */

  const discountEl = document.getElementById("discount");
  if(discountEl) discountEl.value = order.discount || "";

  renderBill();

  /* RESTORE REMAINING FIELDS AFTER UI READY */

  requestAnimationFrame(()=>{

    function setSelectValue(selectEl,value){

      if(!selectEl) return;

      const v = value || "";

      let opt = Array.from(selectEl.options)
        .find(o => o.value === v);

      if(!opt){
        opt = Array.from(selectEl.options)
          .find(o =>
            (o.value || "").toLowerCase() === v.toLowerCase() ||
            (o.text || "").toLowerCase() === v.toLowerCase()
          );
      }

      if(opt){
        selectEl.value = opt.value;
      }else if(v){
        const newOpt = document.createElement("option");
        newOpt.value = v;
        newOpt.textContent = v;
        selectEl.appendChild(newOpt);
        selectEl.value = v;
      }

    }

    /* TOTAL MEMBERS */

    const membersEl = document.getElementById("totalMembers");

    if(membersEl){
      membersEl.value =
        order.totalMembers ||
        order.total_members ||
        order.members ||
        "";
    }

    /* FEEDBACK */

    const feedbackEl = document.getElementById("feedback");
    if(feedbackEl){
      feedbackEl.value = order.feedback || "";
    }

    /* EVENT TYPE */

    setSelectValue(
      document.getElementById("eventType"),
      order.eventType ||
      order.event_type ||
      order.event ||
      ""
    );

    /* ORDER SOURCE */

    setSelectValue(
      document.getElementById("orderSource"),
      order.orderSource ||
      order.order_source ||
      order.source ||
      ""
    );

    /* DELIVERED BY */

    setSelectValue(
      document.getElementById("deliveredBy"),
      order.deliveredBy ||
      order.receivedBy ||
      ""
    );

    /* STAFF CHIP HIGHLIGHT */

    if(order.deliveredBy){

      const chips = document.querySelectorAll(".staff-chip");

      chips.forEach(chip=>{

        if(
          chip.innerText.trim() ===
          getStaffName(order.deliveredBy).trim()
        ){
          chip.classList.add("active");
        }

      });

    }

    /* PAYMENT RESTORE */

    let payment = {};

    try{

      const rawPayment =
        order.paymentMode ||
        order.payment_mode ||
        order.paymentJSON ||
        order.payment ||
        "{}";

      payment =
        typeof rawPayment === "string"
        ? JSON.parse(rawPayment)
        : rawPayment;

    }catch(e){
      console.warn("Payment parse error",e);
    }

    const cashEl = document.getElementById("cashAmount");
    const upiEl = document.getElementById("upiAmount");
    const cardEl = document.getElementById("cardAmount");

    if(cashEl) cashEl.value = payment.cash || "";
    if(upiEl) upiEl.value = payment.upi || "";
    if(cardEl) cardEl.value = payment.card || "";

    updatePaymentStatus();
    renderBill();

  });

  /* BUTTON */

  const saveBtn = document.getElementById("saveBillBtn");
  if(saveBtn) saveBtn.innerText = "UPDATE ORDER";

  window.EDIT_ORDER = null;

}

function setupPOS() {
  APP_STORE.tableData = APP_STORE.tableData || [];
  APP_STORE.menuData = APP_STORE.menuData || [];

  const grid = document.getElementById("menuGrid");
  if (grid) {
    grid.innerHTML = "<div class='empty-text'>Loading menu...</div>";
  }
  const dateInput = document.getElementById("orderDate");

  if(dateInput && !dateInput.value){
    dateInput.value = getTodayLocal(); // ✅ set once only
  }

  if(dateInput && !dateInput.dataset.lastValue){
    dateInput.dataset.lastValue = dateInput.value;
  }

  if(dateInput && !dateInput.dataset.bound){

    dateInput.dataset.bound = "true";

    dateInput.addEventListener("change", () => {
      // 🚫 prevent change if items already added
      const currentTableKey = getSelectedTable();
      const hasItems = Object.values(tableOrders).some(order => Object.keys(order).length > 0);

      if(hasItems){
        alert("Cannot change date after adding items");
        dateInput.value = dateInput.dataset.lastValue || getTodayLocal();
        return;
      }

      
      loadPOSData(() => {
        const categoryMap = {};

        (APP_STORE.menuData || []).forEach(i => {
          // if (!(i.category in categoryMap)) {
            categoryMap[i.category] = Math.min(
              categoryMap[i.category] ?? 999,
              i.sort_order ?? 999
            );
          // }
        });

        categories = Object.keys(categoryMap).sort(
          (a, b) => categoryMap[a] - categoryMap[b]
        );

        if(!categories.length){
          document.getElementById("menuGrid").innerHTML =
            "<div class='empty-text'>⚠️ Menu not available</div>";
          // return;
        }
        
        renderCategories();
        renderTableGrid();
        renderBill();
        
        dateInput.dataset.lastValue = dateInput.value;

        updateMenuLabel(); // 👈 NEW
      });
    });
  }

  const discountEl = document.getElementById("discount");

  if(discountEl && !discountEl.dataset.bound){
    discountEl.dataset.bound = "true";
    discountEl.addEventListener("input", renderBill);
  }

  // Tables
  const tableSelect = document.getElementById("tableNo");
  tableSelect.innerHTML = "";
  console.log("TableStatus:", APP_STORE.tableStatus);
  
  const runningItems = getRunningTableItems();

  (APP_STORE.tableData || []).forEach(t => {

    const status =
      (APP_STORE.tableStatus || {})[t.trim()] || "Available";

    const opt = document.createElement("option");

    opt.value = t;

    let icon = "🟢";

    if(status === "Running") icon = "🔴";
    if(status === "Partial") icon = "🟡";

    const itemCount = runningItems[t] || 0;

    if(itemCount > 0){
      opt.textContent = `${t} (${itemCount}) ${icon}`;
    }else{
      opt.textContent = `${t} ${icon}`;
    }

    tableSelect.appendChild(opt);

  });

  // Re-render bill when table changes
  if(tableSelect && !tableSelect.dataset.bound){
    tableSelect.dataset.bound = "true";

    tableSelect.addEventListener("change", () => {
      const table = tableSelect.value;
      const runningOrder = findRunningOrderForTable(table);

      if(runningOrder){
        const confirmEdit = confirm(
          `Table ${table} already has a running order.\nOpen existing bill?`
        );

        if(confirmEdit){
          window.EDIT_ORDER = runningOrder;
          loadEditOrderIfAny();
          return;
        }
      }
      currentTable = table;   // ✅ ADD THIS LINE
      renderBill();
    });
  }

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

  document
  .querySelectorAll('input[name="orderType"]')
  .forEach(radio => {

    if(radio.dataset.bound) return;
    radio.dataset.bound = "true";

    radio.addEventListener("change", () => {
      const type = radio.value;
      const tableEl = document.getElementById("tableNo");

      if(type === "Dine-in"){
        tableEl.disabled = false;
      }else{
        tableEl.disabled = true;
        tableEl.selectedIndex = -1;
      }
    });

  });

  // Categories
  const categoryMap = {};

  (APP_STORE.menuData || []).forEach(i => {
    // if (!(i.category in categoryMap)) {
        categoryMap[i.category] = Math.min(
          categoryMap[i.category] ?? 999,
          i.sort_order ?? 999
        );
    // }
  });

  categories = Object.keys(categoryMap).sort(
    (a, b) => categoryMap[a] - categoryMap[b]
  );

  if(!categories.length){
    document.getElementById("menuGrid").innerHTML =
      "<div class='empty-text'>⚠️ Menu not available</div>";
    // return;
  }
  
  renderCategories();

  // Mobile: show full menu
  if (window.innerWidth <= 768) {
    showAllItems();
  } else if(categories.length){
    showCategory(categories[0]);
  }

  renderBill();
}

function renderCategories() {
  if (!categories || !categories.length) return;

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

function getSelectedTable(){

  if(editingBillNo && editOrderKey){
    return editOrderKey;
  }

  const typeEl = document.querySelector(
    'input[name="orderType"]:checked'
  );

  if(!typeEl) return "GENERAL";

  const orderType = typeEl.value;
  const orderSource =
    document.getElementById("orderSource").value;

  if(orderType === "Dine-in"){

    if(selectedTables.length === 0){
      return null;
    }

    return selectedTables.join(",");

  }

  if(orderSource && orderSource !== "Walk-in"){
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

  selectedTables = [];

  document
  .querySelectorAll(".table-btn")
  .forEach(b => b.classList.remove("table-selected"));

  const tableSelect = document.getElementById("tableNo");

  if(tableSelect){
    tableSelect.selectedIndex = -1;
  }

  const dateInput = document.getElementById("orderDate");
  if(dateInput){
    dateInput.disabled = false;
  }

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

  editingBillNo = null;
  currentTable = "GENERAL";

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
  } else if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
    // ok
  } else {
    alert("Invalid phone number");
    return;
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


function generateWhatsappBillText(order, total, subtotal, discount, billDate) {
  let billNoEl = document.getElementById("billNumber");
  let billNo = billNoEl.innerText;

  if (!billNo || billNo.includes("--")) {
    billNo = generateTempBillNumber();
  }

  let orderType = document.querySelector('input[name="orderType"]:checked').value;
  let customer = document.getElementById("customerName").value || "Guest";
  let date = billDate
    ? new Date(billDate + "T12:00:00").toLocaleString("en-IN")
    : new Date().toLocaleString("en-IN");

  let text = "🍽 *MADHAV STREET*\n\n";
  text += `*Bill No:* ${billNo}\n`;
  text += `*Date:* ${date}\n`;
  text += `*Order Type:* ${orderType}\n`;
  text += `*Customer:* ${customer}\n\n`;
  text += "-----------------------------\n";
  text += "*ITEMS*\n";

  for (let item in order) {
    if(
      !order[item] ||
      typeof order[item] !== "object" ||
      order[item].qty == null ||
      order[item].price == null
    ){
      continue;
    }

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


async function saveBill() {
  const saveBtn = document.getElementById("saveBillBtn");
  if (saveBtn) saveBtn.disabled = true;

  currentTable = getSelectedTable();
  let order = tableOrders[currentTable] || {};

  if (Object.keys(order).length === 0) {
    alert("No items in this bill");
    if (saveBtn) saveBtn.disabled = false; // ✅ ADD THIS
    return;
  }

  // Save items as JSON
  let items = JSON.stringify(order);

  let cash = parseFloat(document.getElementById("cashAmount").value) || 0;
  let upi = parseFloat(document.getElementById("upiAmount").value) || 0;
  let card = parseFloat(document.getElementById("cardAmount").value) || 0;

  const paymentJSON = {
    cash,
    upi,
    card
  };

  // Helper to safely set hidden fields
  function setHidden(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  // Use editingBillNo to decide update vs new
  setHidden("f_billNo", editingBillNo || "");

  setHidden("f_orderDate", document.getElementById("orderDate").value);
  setHidden("f_customerName", document.getElementById("customerName").value);
  const cleanPhone = document.getElementById("phone").value.replace(/\D/g, "");
  setHidden("f_phone", cleanPhone);
  setHidden("f_tableNo", currentTable);

  const typeEl = document.querySelector('input[name="orderType"]:checked');
  setHidden("f_orderType", typeEl ? typeEl.value : "");

  setHidden("f_orderSource", document.getElementById("orderSource").value);
  setHidden("f_deliveredBy", document.getElementById("deliveredBy").value);
  setHidden("f_orderItems", items);

  const subtotal = document.getElementById("subtotal").innerText;
  const total = document.getElementById("total").innerText;
  const discount = document.getElementById("discount").value;

  setHidden("f_subtotal", subtotal);
  setHidden("f_total", total);
  setHidden("f_discount", discount);

  setHidden("f_paymentMode", JSON.stringify(paymentJSON));
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
    receiverEl ? receiverEl.value : "MS001"
  );


  setHidden("f_eventType", document.getElementById("eventType").value);
  setHidden("f_totalMembers", document.getElementById("totalMembers").value);
  setHidden("f_feedback", document.getElementById("feedback").value);

  // 🎡 CONTEST BEFORE SUBMIT
  try {
    const totalAmount = parseFloat(document.getElementById("total").innerText) || 0;

    let bill_no = document.getElementById("billNumber").innerText;

    if (!bill_no || bill_no.includes("--")) {
      bill_no = generateTempBillNumber();

      const billEl = document.getElementById("billNumber");
      if (billEl) billEl.innerText = bill_no;
    }

    if (totalAmount >= 500) {
      const customer_name = document.getElementById("customerName").value || "Guest";

      createContestEntry({
        bill_no,
        customer_name,
        total: totalAmount
      }).then(() => {
        setTimeout(() => openSpin(bill_no, customer_name), 300);
      }).catch(e => {
        console.warn("Contest failed", e);
      });
    }
  } catch (e) {
    console.warn("Contest integration failed", e);
  }

  // ✅ THEN SUBMIT
  document.getElementById("hiddenForm").submit();

  // reload after backend writes
  setTimeout(() => {
    reloadData(() => {
      setupPOS();      // rebuild tables
      renderTableGrid();
      clearBill();
    });
  }, 1200);

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
        if(
          !order[item] ||
          typeof order[item] !== "object" ||
          order[item].qty == null ||
          order[item].price == null
        ){
          continue;
        }

        subtotal += order[item].qty * order[item].price;
      }

      let discount =
        parseFloat(document.getElementById("discount").value) || 0;
      let total = subtotal - discount;

      let billText = generateWhatsappBillText(
        order,
        total,
        subtotal,
        discount,
        document.getElementById("orderDate").value
      );

      let encodedText = encodeURIComponent(billText);
      let url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      window.open(url, "_blank");
    }
  }

  // Reset edit state
  editingBillNo = null;

  const dateInput = document.getElementById("orderDate");
  if(dateInput){
    dateInput.disabled = false;
  }

  alert("Bill saved successfully");
  if (saveBtn) saveBtn.disabled = false;
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
  const billDate = document.getElementById("orderDate").value;

  document.getElementById("p_date").innerText =
    billDate
      ? new Date(billDate + "T12:00:00").toLocaleString("en-IN")
      : new Date().toLocaleString("en-IN");

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

function autoFillCustomerFromPhone(){

  const phoneInput = document.getElementById("phone");
  const nameInput = document.getElementById("customerName");

  if(!phoneInput || !nameInput) return;

  let phone = phoneInput.value.replace(/\D/g,"");

  if(phone.length < 10) return;

  const url =
    CONFIG.scriptURL +
    "?mode=customerLookup" +
    "&token=" + encodeURIComponent(getToken()) +
    "&phone=" + encodeURIComponent(phone);

  fetch(url)
    .then(r=>r.json())
    .then(data=>{

      if(data && data.name){
        nameInput.value = data.name;
      }

    })
    .catch(err=>{
      console.warn("Customer lookup failed",err);
    });

}

// expose helper so other screens can request POS to load an edit order
window.loadEditOrderIfAny = loadEditOrderIfAny;


function buildStaffDropdown(){

  const staff = APP_STORE.staffData || [];

  const delivered = document.getElementById("deliveredBy");
  const received = document.getElementById("receivedBy");

  if(delivered) delivered.innerHTML = `<option value="">Delivered by</option>`;
  if(received) received.innerHTML = `<option value="">Received by</option>`;

  staff
    .filter(s => (s.status || "").toLowerCase() === "active")
    .sort((a,b)=>a.name.localeCompare(b.name))
    .forEach(s=>{

      const opt1 = document.createElement("option");
      opt1.value = s.code;
      opt1.textContent = s.name;

      const opt2 = opt1.cloneNode(true);

      if(delivered) delivered.appendChild(opt1);
      if(received) received.appendChild(opt2);

    });

}

function buildStaffSelector(){

  const container = document.getElementById("staffSelector");

  if(!container) return;

  container.innerHTML = "";

  const staff = (APP_STORE.staffData || [])
  .filter(s => (s.status || "").toLowerCase() === "active")
  .sort((a,b)=>a.name.localeCompare(b.name));

  staff.forEach(s => {

    const btn = document.createElement("div");

    btn.className = "staff-chip";

    btn.innerText = s.name;

    btn.onclick = () => {

      document
        .querySelectorAll(".staff-chip")
        .forEach(el => el.classList.remove("active"));

      btn.classList.add("active");

      document.getElementById("deliveredBy").value = s.code;

    };

    container.appendChild(btn);

  });

}

function getStaffName(code){

  const staff = APP_STORE.staffData || [];

  const found = staff.find(s => s.code === code);

  return found ? found.name : code;

}

function findRunningOrderForTable(table){

  const orders = APP_STORE.orderData || [];

  const selectedDate =
    document.getElementById("orderDate")?.value ||
    getTodayLocal();

  return orders.find(o => {

    if(!o.table) return false;

    const tables = o.table.split(",").map(t => t.trim());

    return (
      tables.includes(table) &&
      o.date === selectedDate &&
      (o.status === "Pending" || o.status === "Partial")
    );

  });

}

function getRunningTableItems(){

  const orders = APP_STORE.orderData || [];

  const selectedDate =
    document.getElementById("orderDate")?.value ||
    getTodayLocal();

  const tableItems = {};

  orders.forEach(o => {

    if(
      o.orderType === "Dine-in" &&
      o.date === selectedDate &&
      (o.status === "Pending" || o.status === "Partial") &&
      o.table
    ){

      let parsed = {};

      try{
        parsed = JSON.parse(o.itemsJSON || "{}");
      }catch{}

      let count = 0;

      Object.values(parsed).forEach(it=>{
        count += Number(it.qty || 0);
      });

      const tables = o.table.split(",").map(t=>t.trim());

      tables.forEach(t=>{
        tableItems[t] = (tableItems[t] || 0) + count;
      });

    }

  });

  return tableItems;

}

function renderTableGrid(){

  const grid = document.getElementById("tableGrid");
  if(!grid) return;

  grid.innerHTML = "";

  const tables = APP_STORE.tableData || [];
  const status = APP_STORE.tableStatus || {};
  const runningItems = getRunningTableItems();

  tables.forEach(t=>{

    const btn = document.createElement("button");

    btn.className = "table-btn";
    btn.id = "tableBtn_" + t;

    const itemCount = runningItems[t] || 0;
    const tableStatus = status[t];

    if(tableStatus === "Running"){

      btn.classList.add("table-running");
      btn.innerText = `${t} 🔴 ${itemCount}`;

    } else {

      btn.classList.add("table-free");
      btn.innerText = `${t} 🟢`;

    }

    if(selectedTables.includes(t)){
      btn.classList.add("table-selected");
    }

    btn.onclick = () => toggleTable(t);

    grid.appendChild(btn);

  });

}

function selectTable(table){

  const runningOrder = findRunningOrderForTable(table);

  if(runningOrder){

    const confirmEdit = confirm(
      `Table ${table} already has a running order.\nOpen existing bill?`
    );

    if(confirmEdit){

      window.EDIT_ORDER = runningOrder;

      loadEditOrderIfAny();

      return;
    }

  }

  currentTable = table;

  renderTableGrid();

  renderBill();

}

function toggleTable(table){

  const runningOrder = findRunningOrderForTable(table);

  if(runningOrder){

    const confirmEdit = confirm(
      `Table ${table} already has a running order.\nOpen existing bill?`
    );

    if(confirmEdit){

      window.EDIT_ORDER = runningOrder;
      loadEditOrderIfAny();
      return;

    }

  }

  const btn = document.getElementById("tableBtn_" + table);

  if(selectedTables.includes(table)){

    selectedTables = selectedTables.filter(t => t !== table);

    if(btn) btn.classList.remove("table-selected");

  } else {

    if(!selectedTables.includes(table)){
      selectedTables.push(table);
    }

    if(btn) btn.classList.add("table-selected");

  }

  currentTable = selectedTables.join(",");

  /* sync dropdown if present */

  const tableSelect = document.getElementById("tableNo");

  if(tableSelect){

    Array.from(tableSelect.options).forEach(opt=>{
      opt.selected = selectedTables.includes(opt.value);
    });

  }

}

async function fetchMenuFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("Supabase not initialized");
    return null;
  }

  try {
    if (
      SUPABASE_MENU_CACHE &&
      Date.now() - SUPABASE_MENU_TS < MENU_CACHE_TTL
    ) {
      return SUPABASE_MENU_CACHE;
    }

    // 1. Get active menu
    const { data: activeMenu, error: menuError } = await supabase
      .from("menus")
      .select("id")
      .eq("is_active", true)
      .single();

    if (menuError || !activeMenu) {
      throw new Error("No active menu found");
    }

    // 2. Fetch menu items with category
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        item,
        price,
        menu_categories: category_id (
          name,
          sort_order
        )
      `)
      .eq("menu_id", activeMenu.id);

    if (error) throw error;

    // 3. Map to POS format
    const mapped = (data || []).map(item => ({
      item: item.item,
      price: Number(item.price) || 0,
      category: item.menu_categories?.name || "Other",
      sort_order: item.menu_categories?.sort_order || 999
    }));

    SUPABASE_MENU_CACHE = mapped;
    SUPABASE_MENU_TS = Date.now();

    return mapped;

  } catch (err) {
    console.warn("⚠️ Supabase menu fetch failed:", err.message);
    return null; // fallback trigger
  }
}

function loadPOSData(callback){

  const token = getToken();
  const date = document.getElementById("orderDate")?.value || getTodayLocal();

  const requestId = Date.now();
  CURRENT_POS_REQUEST = requestId;

  const cbName = "POS_CB_" + requestId;

  const url =
    CONFIG.scriptURL +
    "?mode=pos" +
    "&token=" + encodeURIComponent(token) +
    "&date=" + encodeURIComponent(date) +
    "&callback=" + cbName;

    console.log("📅 POS DATE:", date);

  window[cbName] = function(data){
    console.log("✅ POS CALLBACK RECEIVED:", data);
    
    // 🚫 Ignore stale response
    if (CURRENT_POS_REQUEST !== requestId) {
      console.warn("Stale POS response ignored");
      return;
    }

    delete window[cbName];

    if(!data){
      console.error("No data received");
      return;
    }

    // keep Apps Script menu as fallback
    const fallbackMenu = data.menu || [];

    // assign other data first
    const fallbackMaster = {
      tableData: data.tables || [],
      orderTypes: data.orderTypes || [],
      orderSources: data.orderSources || [],
      eventTypes: data.eventTypes || [],
      staffData: data.staff || []
    };

    if (isMenuLoading) {
      console.warn("Menu already loading, skipping duplicate call");
      // return;
    }
    isMenuLoading = true;

    APP_STORE.tableStatus = data.tableStatus || {};
    APP_STORE.summary = data.summary || {};
    APP_STORE.orderData = data.orders || [];

    console.log("📦 Orders loaded:", APP_STORE.orderData.length);

    Promise.all([
      fetchMenuFromSupabase(),
      fetchMasterDataFromSupabase()
    ]).then(([supabaseMenu, master]) => {

      // ✅ MASTER DATA
      if (master) {
        APP_STORE.tableData = master.tableData;
        APP_STORE.orderTypes = master.orderTypes;
        APP_STORE.orderSources = master.orderSources;
        APP_STORE.eventTypes = master.eventTypes;
        APP_STORE.staffData = master.staffData;

        console.log("✅ Supabase master data loaded");
      } else {
        APP_STORE.tableData = fallbackMaster.tableData;
        APP_STORE.orderTypes = fallbackMaster.orderTypes;
        APP_STORE.orderSources = fallbackMaster.orderSources;
        APP_STORE.eventTypes = fallbackMaster.eventTypes;
        APP_STORE.staffData = fallbackMaster.staffData;

        console.log("⚠️ Using Apps Script master fallback");
      }

      console.log("📦 Tables loaded:", APP_STORE.tableData?.length);
      console.log("✅ FINAL DATA READY → calling setupPOS");

      // ✅ MENU
      if (supabaseMenu && supabaseMenu.length) {
        APP_STORE.menuData = supabaseMenu;
        console.log("✅ Supabase menu loaded:", supabaseMenu.length);
        console.log("Menu source: Supabase");
      } else {
        APP_STORE.menuData = fallbackMenu;
        console.log("⚠️ Using Apps Script menu fallback");
        console.log("Menu source: Apps Script");
      }

      if (callback) callback();
    })
    .catch(err => {
      console.error("❌ Supabase load failed:", err);
    })
    .finally(() => {
      isMenuLoading = false;
    });

    setTimeout(() => {
      if (isMenuLoading) {
        console.warn("⚠️ Force reset loading flag");
        isMenuLoading = false;
      }
    }, 5000);

    APP_STORE.menuDataFallback = fallbackMenu;
  };

  const script = document.createElement("script");
  script.src = url;

  script.onload = () => {
    script.remove(); // ✅ cleanup
  };

  script.onerror = () => {
    script.remove();
    console.error("❌ JSONP failed");

    Promise.all([
      fetchMenuFromSupabase(),
      fetchMasterDataFromSupabase()
    ]).then(([menu, master]) => {

      APP_STORE.menuData = menu || [];

      if (master) {
        APP_STORE.tableData = master.tableData;
        APP_STORE.orderTypes = master.orderTypes;
        APP_STORE.orderSources = master.orderSources;
        APP_STORE.eventTypes = master.eventTypes;
        APP_STORE.staffData = master.staffData;
      } else {
        APP_STORE.tableData = [];
        APP_STORE.orderTypes = [];
        APP_STORE.orderSources = [];
        APP_STORE.eventTypes = [];
        APP_STORE.staffData = [];
      }

      APP_STORE.tableStatus = {};
      APP_STORE.summary = {};
      APP_STORE.orderData = [];

      if (callback) callback();
    });
  };

  document.body.appendChild(script);
}

function updateMenuLabel(){
  const label = document.getElementById("menuLabel");
  const dateInput = document.getElementById("orderDate");

  if(!label || !dateInput) return; // ✅ safety

  const date = new Date(dateInput.value);
  const ym = date.toISOString().slice(0,7);

  if(ym === "2026-01"){
    label.innerText = "📜 January Menu";
  } else {
    label.innerText = "📜 Current Menu";
  }
}

async function fetchMasterDataFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    if (MASTER_CACHE && Date.now() - MASTER_TS < MASTER_TTL) {
      console.log("⚡ Using cached master data");
      return MASTER_CACHE;
    }
    const [
      tablesRes,
      typesRes,
      sourcesRes,
      eventsRes,
      staffRes
    ] = await Promise.all([
      supabase.from("tables").select("name").order("sort_order"),
      supabase.from("order_types").select("name"),
      supabase.from("order_sources").select("name"),
      supabase.from("event_types").select("name"),
      supabase.from("staff").select("name, code, status")
    ]);

    if (tablesRes.error || typesRes.error || sourcesRes.error || eventsRes.error || staffRes.error) {
      throw new Error("One or more master queries failed");
    }

    const result = {
      tableData: (tablesRes.data || [])
        .map(t => t.name)
        .filter(Boolean),
      orderTypes: typesRes.data?.map(t => t.name) || [],
      orderSources: sourcesRes.data?.map(s => s.name) || [],
      eventTypes: eventsRes.data?.map(e => e.name) || [],
      staffData: (staffRes.data || []).filter(
        s => (s.status || "").toLowerCase() === "active"
      )
    };

    MASTER_CACHE = result;
    MASTER_TS = Date.now();

    return result;

  } catch (err) {
    console.warn("⚠️ Supabase master fetch failed:", err.message);
    return null;
  }
}

async function migrateOrdersFromSheet() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error("Supabase not initialized");
    return;
  }

  const token = getAuthToken();
  const url = `${CONFIG.scriptURL}?mode=orders&token=${token}`;

  console.log("📦 Fetching orders from Apps Script...");

  const res = await fetch(url);
  const data = await res.json();

  console.log("📦 Raw API response:", data);

  const rows = data.orders || [];

  console.log(`🚀 Migrating ${rows.length} orders...`);
  console.log("🔍 Sample row:", rows[0]);

  let successCount = 0;
  let failCount = 0;

  const { data: allCustomers } = await supabase
    .from("customers")
    .select("id, phone");

  const customerMap = {};
  (allCustomers || []).forEach(c => {
    customerMap[c.phone] = c.id;
  });

  for (const row of rows) {
    try {
      const billNo = row.billNo;   // ✅ FIXED
      if (!billNo) continue;

      // 🧠 Parse items
      let items = {};

      try {
        items = JSON.parse(row.itemsJSON || "{}");

        if (!items || typeof items !== "object" || Array.isArray(items)) {
          console.warn("⚠️ Invalid items skipped:", billNo);
          continue;
        }

      } catch (e) {
        console.warn("⚠️ Invalid JSON for:", billNo);
        continue; // ❗ IMPORTANT
      }

      console.log("🍽 Items parsed:", billNo, items);

      // 🧠 CUSTOMER UPSERT
      const phone = (row.phone || "")
        .toString()
        .trim()
        .replace(/\D/g, "");

      let customerId = null;

      if (phone.length >= 10) {
        customerId = customerMap[phone];

        if (!customerId) {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({ name: row.name || "Guest", phone })
            .select()
            .single();

          if (newCustomer) {
            customerId = newCustomer.id;
            customerMap[phone] = customerId;
          }
        }
      } else {
        console.warn("⚠️ Skipping invalid phone:", row.phone);
      }

      // 🧠 Calculations
      const finalAmount = Number(row.amount) || 0;
      if (finalAmount <= 0) {
        console.warn("⚠️ Skipping zero amount order:", billNo);
        continue;
      }
      const discount = Number(row.discount) || 0;
      const subtotal = finalAmount + discount;

      // 🧠 Payment JSON
      const paymentMode = row.paymentMode || "";
      const payment_json = {
        method: paymentMode,
        amount: finalAmount
      };

      // if (paymentMode.includes("Cash")) payment_json.cash = finalAmount;
      // if (paymentMode.includes("UPI")) payment_json.upi = finalAmount;
      // if (paymentMode.includes("Card")) payment_json.card = finalAmount;

      // 🧠 Date parsing
      const dateObj = row.date ? new Date(row.date) : new Date();

      if (isNaN(dateObj)) {
        console.warn("Invalid date for:", billNo);
        continue;
      }

      const order_date = dateObj.toISOString().split("T")[0];
      const order_time = dateObj.toTimeString().split(" ")[0];

      console.log("🔁 Upserting bill:", billNo);
      // ✅ UPSERT ORDER
      const { data: order, error } = await supabase
        .from("orders")
        .upsert({
          bill_no: billNo,
          order_date,
          order_time,
          customer_id: customerId,
          customer_name: row.name,
          phone: phone,
          table_no: row.table,
          order_type: row.orderType,
          order_source: row.orderSource,
          delivered_by: row.deliveredBy,
          subtotal,
          discount,
          total: finalAmount,
          payment_mode: paymentMode,
          payment_json,
          payment_status: row.status,
          received_by: row.receivedBy,
          event_type: row.eventType,
          total_members: Number(row.totalMembers) || 0,
          feedback: row.feedback,
          items_json: items
        }, { onConflict: "bill_no" })
        .select()
        .single();

      if (error) {
        console.error("❌ Order insert failed:", billNo, error);
        failCount++;
        continue;
      }

      if (!order) {
        console.warn("⚠️ No order returned:", billNo);
        failCount++;
        continue;
      }

      console.log("🧾 Inserted order:", billNo, order.id);

      // 🧾 Insert items
      const itemsPayload = Object.entries(items).map(([name, val]) => ({
        order_id: order.id,
        item_name: name,
        qty: Number(val.qty) || 0,
        price: Number(val.price) || 0
      }));

      if (itemsPayload.length) {
        await supabase.from("order_items").delete().eq("order_id", order.id);

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsPayload);

        if (itemsError) {
          console.error("❌ Items insert failed:", billNo, itemsError);
        }
      }

      console.log(`✅ Migrated: ${billNo}`);
      successCount++;
      if (successCount % 25 === 0) {
        console.log(`⏳ Progress: ${successCount}/${rows.length}`);
      }

    } catch (err) {
      console.error("🔥 Error processing row:", err);
      failCount++;
    }
  }

  console.log(`🎉 Migration completed! ✅ ${successCount} success, ❌ ${failCount} failed`);
}

function openKitchen() {
  window.open("kitchen.html", "_blank");
}