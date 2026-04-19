let expensesState = {};

function getAuthToken(){
  return sessionStorage.getItem("ms_token") || localStorage.getItem("ms_token") || "";
}

function initExpenses() {
  if (!APP_STORE.expenseData || !APP_STORE.expenseData.length) {
    console.warn("Expense data not ready yet");
    return;
  }

  const params = getRouteParams("expenses");
  const today = getTodayLocal();

  expensesState = {
    from: params.expenses_from || today,
    to: params.expenses_to || today,
    partner: decodeURIComponent(params.expenses_partner || ""),
    pending: params.expenses_pending || "",
    sort: params.expenses_sort || "date_desc",
    category: params.expenses_category || "",
    type: params.expenses_type || "",
    staff: params.expenses_staff || ""
  };

  const dateInput = document.getElementById("e_date");
  const from = document.getElementById("expensesFromDate");
  const to = document.getElementById("expensesToDate");

  const partner = document.getElementById("expensesPartnerFilter");
  const pending = document.getElementById("expensesPendingFilter");
  const sort = document.getElementById("expensesSort");
  const catFilter = document.getElementById("expensesCategoryFilter");
  const typeFilter = document.getElementById("expensesTypeFilter");
  const staffFilter = document.getElementById("expensesStaffFilter");

  if (dateInput) dateInput.value = today;

  if (from)
      from.value = expensesState.from;

  if (to)
    to.value = expensesState.to;

  if (partner)
    partner.value = expensesState.partner;

  if (pending)
    pending.value = expensesState.pending;

  if (sort)
    sort.value = expensesState.sort;

  if (catFilter) catFilter.value = expensesState.category;
  if (typeFilter) typeFilter.value = expensesState.type;
  if (staffFilter) staffFilter.value = expensesState.staff;

  populateExpenseDropdowns();
  applyExpenseFilters();

  const role = getUserRole();
  const actionHeader = document.getElementById("expenseActionHeader");

  if(actionHeader){
    actionHeader.style.display = role === "admin" ? "" : "none";
  }
}


function populateExpenseDropdowns() {
  function fillSelect(id, list, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = "";

    if (!select.multiple) {
      select.innerHTML = `<option value="">${placeholder}</option>`;
    }

    (list || []).forEach(item => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      select.appendChild(opt);
    });
  }

  fillSelect("e_category", APP_STORE.expenseCategories, "Expense Category");
  fillSelect("e_account", APP_STORE.payingAccounts, "Paying Account");
  fillSelect("e_type", APP_STORE.expenseTypes, "Expense Type");
  fillSelect("e_paidBy", APP_STORE.paidByList, "Paid by");
  fillSelect("e_mode", APP_STORE.expenseModes, "Expense Mode");
  fillSelect("e_vendor", APP_STORE.vendors, "Purchased from");

  // populate filter selects as well
  fillSelect("expensesCategoryFilter", APP_STORE.expenseCategories, "All");
  fillSelect("expensesTypeFilter", APP_STORE.expenseTypes, "All");

  function fillStaffSelect(id, list, placeholder) {

  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  (list || []).forEach(s => {

    const opt = document.createElement("option");

    opt.value = s.code;      // store code
    opt.textContent = s.name; // show name

    select.appendChild(opt);
  });
}

fillStaffSelect("e_staff", APP_STORE.staffData, "Staff name");
fillStaffSelect("expensesStaffFilter", APP_STORE.staffData, "All staff");
}

function getSelectedExpenseTypes() {
  const select = document.getElementById("e_type");
  if (!select) return "";

  return Array.from(select.selectedOptions)
    .map(opt => opt.value)
    .join(", ");
}

function saveExpense() {
  setSaveLoading(true);
  const amount = document.getElementById("e_amount").value;

  if (!amount) {
    alert("Enter amount");
    setSaveLoading(false); // ✅ IMPORTANT
    return;
  }

  document.getElementById("f_e_date").value =
    document.getElementById("e_date").value;

  document.getElementById("f_e_category").value =
    document.getElementById("e_category").value;

  document.getElementById("f_e_amount").value =
    document.getElementById("e_amount").value;

  document.getElementById("f_e_account").value =
    document.getElementById("e_account").value;

  document.getElementById("f_e_type").value =
    getSelectedExpenseTypes();

  document.getElementById("f_e_paidBy").value =
    document.getElementById("e_paidBy").value;

  const staffSelect = document.getElementById("e_staff");

document.getElementById("f_e_staffCode").value =
  staffSelect.value || "";

document.getElementById("f_e_staffName").value =
  staffSelect.options[staffSelect.selectedIndex]?.text || "";

  document.getElementById("f_e_mode").value = document.getElementById("e_mode").value;

  document.getElementById("f_e_vendor").value = document.getElementById("e_vendor").value;

  document.getElementById("f_e_comment").value = document.getElementById("e_comment").value;

  if (expensesState.editingId) {

  fetch(CONFIG.scriptURL, {
    method: "POST",
    body: new URLSearchParams({
      mode: "expense",
      action: "update",
      token: getAuthToken(),
      id: expensesState.editingId,

      expenseDate: document.getElementById("e_date").value,
      category: document.getElementById("e_category").value,
      amount: document.getElementById("e_amount").value,
      account: document.getElementById("e_account").value,
      type: getSelectedExpenseTypes(),
      paidBy: document.getElementById("e_paidBy").value,
      staffCode: document.getElementById("e_staff").value,
      staffName: document.getElementById("e_staff").selectedOptions[0]?.text || "",
      expenseMode: document.getElementById("e_mode").value,
      vendor: document.getElementById("e_vendor").value,
      comment: document.getElementById("e_comment").value
    })
  })
  .then(() => {
    alert("Expense updated");
    closeExpenseDrawer();
    reloadData(() => applyExpenseFilters());
  })
  .finally(() => {
    setSaveLoading(false);
  });

  return;
}

  fetch(CONFIG.scriptURL, {
    method: "POST",
    body: new URLSearchParams({
      mode: "expense",
      action: "create",
      token: getAuthToken(),

      expenseDate: document.getElementById("e_date").value,
      category: document.getElementById("e_category").value,
      amount: document.getElementById("e_amount").value,
      account: document.getElementById("e_account").value,
      type: getSelectedExpenseTypes(),
      paidBy: document.getElementById("e_paidBy").value,
      staffCode: document.getElementById("e_staff").value,
      staffName: document.getElementById("e_staff").selectedOptions[0]?.text || "",
      expenseMode: document.getElementById("e_mode").value,
      vendor: document.getElementById("e_vendor").value,
      comment: document.getElementById("e_comment").value
    })
  })
  .then(() => {
    alert("Expense saved");
    closeExpenseDrawer();
    reloadData(() => applyExpenseFilters());
  })
  .finally(() => {
    setSaveLoading(false);
  });
}


function applyExpenseFilters() {
  let filtered = [...APP_STORE.expenseData];

  const fromDate =
    document.getElementById("expensesFromDate")?.value;
  const toDate =
    document.getElementById("expensesToDate")?.value;

  const partner =
    document.getElementById("expensesPartnerFilter")?.value;

  const category =
    document.getElementById("expensesCategoryFilter")?.value;

  const typeFilterVal =
    document.getElementById("expensesTypeFilter")?.value;

  const staffFilterVal =
    document.getElementById("expensesStaffFilter")?.value;

  const pendingFilter =
    document.getElementById("expensesPendingFilter")?.value;

  const sort =
    document.getElementById("expensesSort")?.value;

  // Date filters
  if (fromDate) {
    filtered = filtered.filter(e =>
      (e.date || "").slice(0,10) >= fromDate
    );
  }

  if (toDate) {
    filtered = filtered.filter(e =>
      (e.date || "").slice(0,10) <= toDate
    );
  }

  // Paid By filter
  if (partner) {
    filtered = filtered.filter(e => {
      const p1 = (e.paidBy || "").toLowerCase().trim();
      const p2 = (partner || "").toLowerCase().trim();
      return p1 === p2;
    });
  }

  // Category filter
  if (category) {
    filtered = filtered.filter(e => (e.category || '') === category);
  }

  // Type filter
  if (typeFilterVal) {
    filtered = filtered.filter(e => (e.type || '') === typeFilterVal || (String(e.type||'')).split(',').map(s=>s.trim()).includes(typeFilterVal));
  }

  // Staff filter
  if (staffFilterVal) {
    filtered = filtered.filter(e => (e.staff || '') === staffFilterVal);
  }

  // Pending filter
  if (pendingFilter === "pending") {
    filtered = filtered.filter(
      e => !e.mode || e.mode === "" || e.mode === "Pending"
    );
  }

  if (pendingFilter === "cleared") {
    filtered = filtered.filter(
      e => e.mode && e.mode !== "Pending"
    );
  }

  // Sorting
  if (sort === "date_desc") {
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  }

  if (sort === "date_asc") {
    filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
  }

  if (sort === "amount_desc") {
    filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  }

  if (sort === "amount_asc") {
    filtered.sort((a, b) => (a.amount || 0) - (b.amount || 0));
  }

  renderExpensesTable(filtered);

  setRouteParams("expenses", {
    expenses_from: fromDate,
    expenses_to: toDate,
    expenses_partner: partner,
    expenses_pending: pendingFilter,
    expenses_sort: sort
    ,
    expenses_category: category,
    expenses_type: typeFilterVal,
    expenses_staff: staffFilterVal
    });


  renderExpenseSummary(filtered);
}



function renderExpensesTable(list){

  const isAdmin = getUserRole() === "admin";

  const columns = [
    { field: "date", label: "Date", format: v => formatDateUI(v) },
    { field: "category", label: "Category" },
    { field: "type", label: "Type" },
    { field: "vendor", label: "Vendor" },
    { field: "mode", label: "Mode" },
    { field: "staffName", label: "Procured By" },
    { field: "paidBy", label: "Paid By" },
    { field: "amount", label: "Amount", format: v => `₹${v}` },
    { field: "comment", label: "Comment" }
  ];

  // ✅ Add action column for admin
  if(isAdmin){
    columns.push({
      field: "action",
      label: "Action",
      format: (v,row) => `
        <div class="action-icons">
          <span class="icon-btn edit"
                title="Edit"
                onclick="editExpenseById('${row.id}')">
            ✏️
          </span>

          <span class="icon-btn delete"
                title="Delete"
                onclick="deleteExpense('${row.id}')">
            🗑️
          </span>
        </div>
      `
    });
  }

  createTable({
    container: "#expensesCustomTable",
    data: list,
    pageSize: 10,
    columns
  });
}

function renderExpenseSummary(list) {
  const container = document.getElementById("expenseSummary");
  if (!container) return;

  let total = 0;
  let cash = 0;
  let upi = 0;

  let varun = 0;
  let amit = 0;
  let counter = 0;

  list.forEach(e => {
    let amt = Number(e.amount) || 0;
    total += amt;

    if (e.mode === "Cash") cash += amt;
    else if (e.mode === "UPI") upi += amt;

    if (e.paidBy === "Varun Garg") varun += amt;
    else if (e.paidBy === "Amit Nagpal") amit += amt;
    else counter += amt;
  });

  // Aggregations by category and staff
  const catTotals = {};
  // const staffTotals = {};

  list.forEach(e => {
    const amt = Number(e.amount) || 0;
    const cat = e.category || 'Uncategorized';
    // const st = e.staff || 'Unknown';

    catTotals[cat] = (catTotals[cat] || 0) + amt;
    // staffTotals[st] = (staffTotals[st] || 0) + amt;
  });

  function topList(map, n){
    return Object.keys(map).map(k=>({k, v: map[k]})).sort((a,b)=>b.v-a.v).slice(0,n);
  }

  const topCats = topList(catTotals,5);
  // const topStaff = topList(staffTotals,5);

  let html = `
    <div class="summary-card">
      Total
      <span>₹${total}</span>
    </div>
    <div class="summary-card">
      Cash
      <span>₹${cash}</span>
    </div>
    <div class="summary-card">
      UPI
      <span>₹${upi}</span>
    </div>
  `;

  // top categories
  html += `<div class="summary-card"><div class="stat-title">Top Categories</div>`;
  topCats.forEach(it=>{ html += `<div style="margin-top:6px">${it.k} — ₹${it.v}</div>` });
  html += `</div>`;

  // top staff
  // html += `<div class="summary-card"><div class="stat-title">Top Staff</div>`;
  // topStaff.forEach(it=>{ html += `<div style="margin-top:6px">${it.k} — ₹${it.v}</div>` });
  // html += `</div>`;

  container.innerHTML = html;
}

function openExpenseDrawer() {
  expensesState.editingId = null; // ✅ fix

  document.querySelector(".drawer-header h3").innerText = "Add Expense";

  document.getElementById("expenseDrawer")
    .classList.add("open");
}

function closeExpenseDrawer() {
  document.getElementById("expenseDrawer")
    .classList.remove("open");
}


function editExpense(index) {
  const expense = APP_STORE.expenseData[index];
  if (!expense) return;

  expensesState.editingExpense = expense;

  openExpenseDrawer();

  // change title
  document.querySelector(".drawer-header h3").innerText = "Edit Expense";

  // fill fields
  document.getElementById("e_date").value = (expense.date || "").slice(0,10);
  document.getElementById("e_category").value = expense.category || "";
  document.getElementById("e_amount").value = expense.amount || "";
  document.getElementById("e_account").value = expense.account || "";
  document.getElementById("e_paidBy").value = expense.paidBy || "";
  document.getElementById("e_mode").value = expense.mode || "";
  document.getElementById("e_vendor").value = expense.vendor || "";
  document.getElementById("e_comment").value = expense.comment || "";

  // staff
  document.getElementById("e_staff").value = expense.staff || "";

  // type (multi-select)
  const typeSelect = document.getElementById("e_type");
  const types = (expense.type || "").split(",").map(t => t.trim());

  Array.from(typeSelect.options).forEach(opt => {
    opt.selected = types.includes(opt.value);
  });
}

function fillExpenseForm(expense) {
  expensesState.editingId = expense.id;
  document.getElementById("e_date").value = (expense.date || "").slice(0,10);
  document.getElementById("e_category").value = expense.category || "";
  document.getElementById("e_amount").value = expense.amount || "";
  document.getElementById("e_account").value = expense.account || "";
  document.getElementById("e_paidBy").value = expense.paidBy || "";
  document.getElementById("e_mode").value = expense.mode || "";
  document.getElementById("e_vendor").value = expense.vendor || "";
  document.getElementById("e_comment").value = expense.comment || "";
  document.getElementById("e_staff").value = expense.staff || "";

  const typeSelect = document.getElementById("e_type");

  // normalize stored types
  const types = (expense.type || "")
    .split(",")
    .map(t => t.trim().toLowerCase());

  Array.from(typeSelect.options).forEach(opt => {
    const val = (opt.value || "").trim().toLowerCase();
    opt.selected = types.includes(val);
  });
}

function deleteExpense(id){

  if(!confirm("Delete this expense?")) return;

  fetch(CONFIG.scriptURL, {
    method: "POST",
    body: new URLSearchParams({
      mode: "expense",
      action: "delete",
      token: getAuthToken(),
      id: id
    })
  })
  .then(() => {
    alert("Deleted");
    reloadData(() => applyExpenseFilters());
  });
}

function editExpenseById(id){

  const expense = APP_STORE.expenseData.find(e => e.id === id);

  if(!expense){
    alert("Expense not found");
    return;
  }

  expensesState.editingId = expense.id;

  openExpenseDrawer();

  document.querySelector(".drawer-header h3").innerText = "Edit Expense";

  fillExpenseForm(expense);
}

function setSaveLoading(isLoading){

  const btn = document.getElementById("saveExpenseBtn");
  if(!btn) return;

  if(isLoading){
    btn.disabled = true;
    btn.dataset.originalText = btn.innerText;
    btn.innerText = "Saving...";
  }else{
    btn.disabled = false;
    btn.innerText = btn.dataset.originalText || "Save Expense";
  }
}

function getUserRole(){
  return sessionStorage.getItem("ms_role") || localStorage.getItem("ms_role") || "";
}