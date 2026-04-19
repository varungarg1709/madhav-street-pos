const supabaseClient = window.supabase.createClient(
"https://nxxjqhaszlrtxcainlqo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eGpxaGFzemxydHhjYWlubHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDI2ODgsImV4cCI6MjA4OTY3ODY4OH0.7Ci8E6aJWcLxQP63Z_lCDNemsEGpVklQVGvJnroOjpw"
);

let allItems = [];
let categories = [];
let selected = {};
let activeCategory = "";

// ---------- INIT ----------
async function init() {
await loadItems();
renderTabs();
renderItems();
}

// ---------- LOAD ----------
async function loadItems() {
const { data, error } = await supabaseClient
.from("inventory_items")
.select("id, item_name, category, default_unit");

if (error) {
alert("Error loading items");
console.error(error);
return;
}

allItems = data || [];
categories = [...new Set(allItems.map(i => i.category))];
activeCategory = categories[0] || "";
}

// ---------- TABS ----------
function renderTabs() {
const tabs = document.getElementById("tabs");
tabs.innerHTML = "";

categories.forEach(c => {
const el = document.createElement("div");
el.className = "tab" + (c === activeCategory ? " active" : "");
el.innerText = c;

el.onclick = () => {
  activeCategory = c;
  renderTabs();
  renderItems();
};

tabs.appendChild(el);
});
}

// ---------- ITEMS ----------
function renderItems() {
const container = document.getElementById("items");
const search = (document.getElementById("search")?.value || "").toLowerCase();

container.innerHTML = "";

allItems
.filter(i => i.category === activeCategory)
.filter(i => i.item_name.toLowerCase().includes(search))
.forEach(item => {
const qty = selected[item.id]?.qty || 0;
const unit = selected[item.id]?.unit || item.default_unit;

  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <div class="icon">🥦</div>
    <div>${item.item_name}</div>

    <div class="controls">
      <input type="number"
        value="${qty || ""}"
        min="0.1"
        step="0.1"
        oninput="updateQty('${item.id}', this.value)"
      />

      <select onchange="updateUnit('${item.id}', this.value)">
        ${["KG","GRAM","PCS","DOZEN"].map(u => `
          <option value="${u}" ${unit === u ? "selected" : ""}>${u}</option>
        `).join("")}
      </select>
    </div>

    ${
      qty === 0
        ? `<button class="add-btn" onclick="add('${item.id}', '${item.default_unit}')">ADD</button>`
        : `<div class="stepper">
            <button onclick="step('${item.id}', -1)">-</button>
            <span>${qty}</span>
            <button onclick="step('${item.id}', 1)">+</button>
          </div>`
    }
  `;

  container.appendChild(div);
});


updateCart();
}

// ---------- ACTIONS ----------
function add(id, unit) {
selected[id] = { qty: 1, unit };
renderItems();
}

function step(id, d) {
let q = selected[id]?.qty || 0;
q += d;

if (q <= 0) delete selected[id];
else selected[id].qty = q;

renderItems();
}

function updateQty(id, val) {
const q = parseFloat(val);

if (!isNaN(q) && q > 0) {
if (!selected[id]) selected[id] = {};
selected[id].qty = q;
} else {
delete selected[id];
}

updateCart();
}

function updateUnit(id, u) {
if (!selected[id]) selected[id] = { qty: 1 };
selected[id].unit = u;
}

// ---------- CART ----------
function updateCart() {
const count = Object.keys(selected).length;
const bar = document.getElementById("cartBar");

if (count === 0) {
bar.classList.add("hidden");
return;
}

bar.classList.remove("hidden");
document.getElementById("cartText").innerText = `${count} items added`;
}

// ---------- MODAL ----------
function openCart() {
const modal = document.getElementById("modal");

const itemsList = Object.entries(selected)
.map(([id, v], i) => {
const item = allItems.find(x => x.id == id);
if (!item) return "";
return `${i + 1}. ${item.item_name} - ${v.qty} ${v.unit}`;
})
.join("<br>");

const html = `
  <div class="modal-backdrop" onclick="closeModal()"></div>

  <div class="modal-content" onclick="event.stopPropagation()">
    <h3>Your Order</h3>
    <div style="margin:10px 0;">${itemsList}</div>

    <button onclick="submit()">Submit</button>
    <button onclick="closeModal()">Close</button>
  </div>
`;

modal.innerHTML = html;
modal.classList.remove("hidden");
}

function closeModal() {
document.getElementById("modal").classList.add("hidden");
}

// ---------- ORDER ----------
function submit() {
const name = document.getElementById("name").value.trim();

if (!name) {
alert("Enter your name");
return;
}

const itemsArr = Object.entries(selected).map(([id, v], i) => {
const item = allItems.find(x => x.id == id);
return `${i + 1}. ${item.item_name} - ${v.qty} ${v.unit}`;
});

const message = `
Madhav Street - ${activeCategory} Order

Ordered By: ${name}
Time: ${new Date().toLocaleString("en-IN")}

Items Ordered:
${itemsArr.join("\n")}

---

Deliver to: Madhav Street Kitchen
Contact: ${name}

Please confirm availability.
`;

window.open(`https://wa.me/918950246972?text=${encodeURIComponent(message)}`);

selected = {};
closeModal();
renderItems();
}

// ---------- INIT ----------
init();
