let menuMap = {};
let itemsListenersAttached = false;

/* ================= INIT ================= */

function initItemsStats() {

  if (!APP_STORE.loaded) return;

  const menuData = APP_STORE.menuData || [];

  menuMap = {};

  menuData.forEach(m => {
    menuMap[m.item.trim().toLowerCase()] = m;
  });

  const today = new Date().toISOString().slice(0,10);

  document.getElementById("itemsFromDate").value = today;
  document.getElementById("itemsToDate").value = today;

  populateItemCategories();
  attachItemsListeners();

  applyItemsFilters();
}

/* ================= CATEGORY ================= */

function populateItemCategories() {

  const select =
    document.getElementById("itemsCategoryFilter");

  if (!select) return;

  const menuData = APP_STORE.menuData || [];

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

  const orderData = APP_STORE.orderData || [];

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

    const orderDate =
      (order.date || "").slice(0,10);

    if (from && orderDate < from) return;
    if (to && orderDate > to) return;

    let items = {};

    try {
      if (order.itemsJSON) {
        items = JSON.parse(order.itemsJSON);
      }
    } catch (e) {
      console.warn("Item parse error", e);
      return;
    }

    Object.keys(items).forEach(name => {

      const cleanName =
        name.trim().toLowerCase();

      let raw = items[name];
      let qty = 0;

      if (typeof raw === "number")
        qty = raw;

      if (typeof raw === "object" && raw)
        qty = Number(raw.qty || raw.quantity || 0);

      if (!qty) return;

      const menuItem = menuMap[cleanName];

      const itemCategory =
        menuItem?.category || "Other";

      const price =
        Number(menuItem?.price) || 0;

      if (category && itemCategory !== category)
        return;

      if (search &&
          !cleanName.includes(search))
        return;

      if (!stats[cleanName]) {
        stats[cleanName] = {
          name: name.trim(),
          category: itemCategory,
          qty: 0,
          revenue: 0
        };
      }

      stats[cleanName].qty += qty;
      stats[cleanName].revenue += qty * price;
    });
  });

  const list = Object.values(stats)
    .sort((a,b)=>b.qty-a.qty);

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

  list.forEach((item,index)=>{

    const tr=document.createElement("tr");

    tr.innerHTML = `
      <td>${index+1}</td>
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