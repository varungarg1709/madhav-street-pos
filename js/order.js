const urlParams = new URLSearchParams(window.location.search);
const table = urlParams.get("table") || "GENERAL";

let cart = {};
let menu = [];

document.getElementById("tableLabel").innerText = "Table: " + table;

let categories = [];
let selectedCategory = "All";

/* ================= CATEGORY ================= */

function extractCategories(){
  categories = ["All", ...new Set(menu.map(i => i.category))];
  renderCategories();
}

function renderCategories(){

  const container = document.getElementById("categoryTabs");
  container.innerHTML = "";

  categories.forEach(cat => {

    const btn = document.createElement("button");
    btn.innerText = cat;

    if(cat === selectedCategory){
      btn.classList.add("active");
    }

    btn.onclick = () => {
      selectedCategory = cat;
      renderMenu();
      renderCategories();
    };

    container.appendChild(btn);
  });
}

/* ================= MENU ================= */

function loadMenu(){

  const d = new Date();
  d.setHours(12,0,0,0);
  const date = d.toISOString().split("T")[0];

  const url =
    CONFIG.scriptURL +
    "?mode=qrMenu&date=" + date;

  fetch(url)
    .then(r=>r.json())
    .then(data=>{

      menu = data.menu || [];

      if(menu.length === 0){
        document.getElementById("menuList").innerText = "Menu not available";
        return;
      }

      extractCategories();
      renderMenu();
      renderCart(); // ✅ ensure cart renders initially

    })
    .catch(err=>{
      console.error("Menu load failed", err);
      document.getElementById("menuList").innerText = "Failed to load menu";
    });
}

function renderMenu(){

  const container = document.getElementById("menuList");
  container.innerHTML = "";

  const filtered =
    selectedCategory === "All"
      ? menu
      : menu.filter(i => i.category === selectedCategory);

  filtered.forEach(item => {

    const qty = cart[item.item]?.qty || 0;

    const div = document.createElement("div");
    div.className = "menu-item";

    // ✅ safer button binding (no string injection)
    const minusBtn = document.createElement("button");
    minusBtn.innerText = "-";
    minusBtn.onclick = () => changeQty(item.item, item.price, -1);

    const plusBtn = document.createElement("button");
    plusBtn.innerText = "+";
    plusBtn.onclick = () => changeQty(item.item, item.price, 1);

    const qtySpan = document.createElement("span");
    qtySpan.innerText = qty;

    const left = document.createElement("div");
    left.innerHTML = `<div>${item.item}</div><div>₹${item.price}</div>`;

    const right = document.createElement("div");
    right.className = "qty-box";
    right.append(minusBtn, qtySpan, plusBtn);

    div.append(left, right);
    container.appendChild(div);
  });
}

/* ================= CART ================= */

function changeQty(name, price, delta){

  if(!cart[name]){
    cart[name] = {qty:0, price};
  }

  cart[name].qty += delta;

  if(cart[name].qty <= 0){
    delete cart[name];
  }

  renderMenu();
  renderCart();
}

function removeItem(name){
  delete cart[name];
  renderMenu();
  renderCart();
}

function renderCart(){

  const container = document.getElementById("cartItems");
  const summary = document.getElementById("cartSummary");

  container.innerHTML = "";

  let total = 0;

  const keys = Object.keys(cart);

  if(keys.length === 0){
    container.innerHTML = "Cart is empty";
    summary.innerText = "Cart: ₹0";
    return;
  }

  keys.forEach(item => {

    const qty = cart[item].qty;
    const price = cart[item].price;
    const amt = qty * price;

    total += amt;

    const row = document.createElement("div");

    const removeBtn = document.createElement("button");
    removeBtn.innerText = "❌";
    removeBtn.onclick = () => removeItem(item);

    row.innerText = `${item} x ${qty} = ₹${amt} `;
    row.appendChild(removeBtn);

    container.appendChild(row);
  });

  summary.innerText = "Cart: ₹" + total;
}

/* ================= ORDER ================= */

function placeOrder(){

  if(Object.keys(cart).length === 0){
    alert("Cart is empty");
    return;
  }

  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const cleanPhone = phone.replace(/\D/g,"").slice(-10);

  if(!name){
    alert("Please enter your name");
    return;
  }

  if(!cleanPhone || cleanPhone.length < 10){
    alert("Enter valid phone number");
    return;
  }

  const btn = event?.target;
  if(btn){
    btn.disabled = true;
    btn.innerText = "Placing...";
  }

  const d = new Date();
  d.setHours(12,0,0,0);
  const date = d.toISOString().split("T")[0];

  const payload = {
    mode: "order",
    tableNo: table,
    customerName: name,
    phone: cleanPhone,
    orderItems: JSON.stringify(cart),
    orderType: "QR",
    orderSource: "QR",
    amount: 0,
    paymentStatus: "Pending",
    orderDate: date,
  };

  fetch(CONFIG.scriptURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(payload)
  })
  .then(r => r.text())
  .then(res => {

    if(res.toLowerCase().includes("error") || res === "Unauthorized"){
      alert("Order failed: " + res);
      return;
    }

    alert("Order placed successfully!");

    cart = {};
    renderCart();
    renderMenu();

  })
  .catch(()=>{
    alert("Network error. Please try again.");
  })
  .finally(()=>{
    if(btn){
      btn.disabled = false;
      btn.innerText = "Place Order";
    }
  });
}

/* ================= CART MODAL ================= */

document.getElementById("cartSummary").onclick = () => {
  document.getElementById("cartModal").classList.add("open");
};

function closeCart(){
  document.getElementById("cartModal").classList.remove("open");
}

/* ================= INIT ================= */

loadMenu();