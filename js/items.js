let menuMap = {};
let itemsState = {};
let itemsInitializing = false;
let itemsListenersAttached = false;

/* ================= INIT ================= */

function initItemsStats() {

    menuMap = {};

menuData.forEach(m => {
  menuMap[m.item.trim().toLowerCase()] = m;
});

  itemsInitializing = true;

  const today = new Date().toISOString().split("T")[0];

  itemsState = {
    from: today,
    to: today,
    category: "",
    search: ""
  };

  const from = document.getElementById("itemsFromDate");
  const to = document.getElementById("itemsToDate");

  if (from) from.value = today;
  if (to) to.value = today;

  menuMap = {};

menuData.forEach(m => {
  menuMap[m.item.trim().toLowerCase()] = m;
});

  populateItemCategories();
  attachItemsListeners();

  applyItemsFilters();

  itemsInitializing = false;
}

/* ================= CATEGORY ================= */

function populateItemCategories() {

  const select =
    document.getElementById("itemsCategoryFilter");

  if (!select) return;

  // CLEAR OLD OPTIONS (important)
  select.innerHTML =
    `<option value="">All Categories</option>`;

  const categories =
    [...new Set(menuData.map(m => m.category))];

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

/* ================= FILTER ================= */

function applyItemsFilters() {
console.log("menuData length:", menuData.length);
  let stats = {};

  const from =
    document.getElementById("itemsFromDate")?.value;

  const to =
    document.getElementById("itemsToDate")?.value;

  const category =
    document.getElementById("itemsCategoryFilter")?.value;

  const search =
    (document.getElementById("itemsSearch")?.value || "")
      .toLowerCase();

  orderData.forEach(order => {

    if (from && order.date < from) return;
    if (to && order.date > to) return;

    let items = {};

    try {
    if (typeof order.itemsJSON === "string") {
        items = JSON.parse(order.itemsJSON);
    }
    } catch (e) {
    console.error("Item parse error", e);
    }

    Object.keys(items).forEach(name => {
        let raw = items[name];

        let qty = 0;

        if (typeof raw === "number") {
            qty = raw;
        }

        if (typeof raw === "object" && raw !== null) {
            qty = Number(raw.qty || raw.quantity || 0);
        }

        if (!qty) return;

        const menuItem =
  menuMap[name.trim().toLowerCase()];

        console.log("Order Item:", name);
console.log("Matched Menu:", menuItem);

      const itemCategory =
        menuItem?.category || "Other";

      const price =
        Number(menuItem?.price) || 0;

      if (category && itemCategory !== category)
        return;

      if (
        search &&
        !name.toLowerCase().includes(search)
      )
        return;

      if (!stats[name]) {
        stats[name] = {
          name,
          category: itemCategory,
          qty: 0,
          revenue: 0
        };
      }

      stats[name].qty += qty;
      stats[name].revenue += qty * price;

      console.log(order.itemsJSON);
    });
  });

  

  const list = Object.values(stats)
    .sort((a, b) => b.qty - a.qty);

  renderItemsStats(list);
}

/* ================= RENDER ================= */

function renderItemsStats(list) {

  const tbody =
    document.getElementById("itemsStatsTableBody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      "<tr><td colspan='5'>No data found</td></tr>";
    return;
  }

  list.forEach((item, index) => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.qty}</td>
      <td>₹${item.revenue}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* ================= LISTENERS ================= */

function attachItemsListeners() {

  // prevent duplicate listeners
  if (itemsListenersAttached) return;

  ["itemsFromDate",
   "itemsToDate",
   "itemsCategoryFilter",
   "itemsSearch"]
  .forEach(id => {
    document.getElementById(id)
      ?.addEventListener("input", applyItemsFilters);
  });

  itemsListenersAttached = true;
}