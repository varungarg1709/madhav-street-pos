let expensesState = {};
let expenseData = [];

function initExpenses() {
  const params = getRouteParams("expenses");
  const today = new Date().toISOString().split("T")[0];

  expensesState = {
  from: params.expenses_from || today,
  to: params.expenses_to || today,
  partner: params.expenses_partner || "",
  pending: params.expenses_pending || "",
  sort: params.expenses_sort || "date_desc"
};

  const dateInput = document.getElementById("e_date");
  const from = document.getElementById("expensesFromDate");
  const to = document.getElementById("expensesToDate");

  const partner = document.getElementById("expensesPartnerFilter");
  const pending = document.getElementById("expensesPendingFilter");
  const sort = document.getElementById("expensesSort");

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

  populateExpenseDropdowns();
  applyExpenseFilters();
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

  fillSelect("e_category", expenseCategories, "Expense Category");
  fillSelect("e_account", payingAccounts, "Paying Account");
  fillSelect("e_type", expenseTypes, "Expense Type");
  fillSelect("e_paidBy", paidByList, "Paid by");
  fillSelect("e_staff", staffData, "Staff name");
  fillSelect("e_mode", expenseModes, "Expense Mode");
  fillSelect("e_vendor", vendors, "Purchased from");
}

function getSelectedExpenseTypes() {
  const select = document.getElementById("e_type");
  if (!select) return "";

  return Array.from(select.selectedOptions)
    .map(opt => opt.value)
    .join(", ");
}

function saveExpense() {
  const amount = document.getElementById("e_amount").value;

  if (!amount) {
    alert("Enter amount");
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

  document.getElementById("f_e_staff").value =
    document.getElementById("e_staff").value;

  document.getElementById("f_e_mode").value =
    document.getElementById("e_mode").value;

  document.getElementById("f_e_vendor").value =
    document.getElementById("e_vendor").value;

  document.getElementById("f_e_comment").value =
    document.getElementById("e_comment").value;

  document.getElementById("expenseForm").submit();

  alert("Expense saved");
  closeExpenseDrawer();

  document.getElementById("e_amount").value = "";
  document.getElementById("e_comment").value = "";

  // Correct auto reload
  setTimeout(() => {
    reloadData(() => {
      applyExpenseFilters();
    });
  }, 800);
}


function applyExpenseFilters() {
  let filtered = [...expenseData];

  const fromDate =
    document.getElementById("expensesFromDate")?.value;
  const toDate =
    document.getElementById("expensesToDate")?.value;

  const partner =
    document.getElementById("expensesPartnerFilter")?.value;

  const pendingFilter =
    document.getElementById("expensesPendingFilter")?.value;

  const sort =
    document.getElementById("expensesSort")?.value;

  // Date filters
  if (fromDate) {
    filtered = filtered.filter(e => e.date >= fromDate);
  }

  if (toDate) {
    filtered = filtered.filter(e => e.date <= toDate);
  }

  // Partner filter
  if (partner) {
    filtered = filtered.filter(e => e.partner === partner);
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
    filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  if (sort === "date_asc") {
    filtered.sort((a, b) => a.date.localeCompare(b.date));
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
    });


  renderExpenseSummary(filtered);
}



function renderExpensesTable(list) {
  const tbody = document.getElementById("expensesTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      "<tr><td colspan='7'>No expenses found</td></tr>";
    return;
  }

  list.forEach((e, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>${index + 1}</td>
      <td>${e.date}</td>
      <td>${e.category || "-"}</td>
      <td>${e.type || "-"}</td>
      <td>${e.vendor || "-"}</td>
      <td>${e.mode || "-"}</td>
      <td>${e.partner || "-"}</td>
      <td>₹${e.amount}</td>
      <td>${e.comment || "-"}</td>
    `;
    tbody.appendChild(tr);
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

    if (e.partner === "Varun Garg") varun += amt;
    else if (e.partner === "Amit Nagpal") amit += amt;
    else counter += amt;
  });

  container.innerHTML = `
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
    <div class="summary-card">
      Varun
      <span>₹${varun}</span>
    </div>
    <div class="summary-card">
      Amit
      <span>₹${amit}</span>
    </div>
    <div class="summary-card">
      Counter
      <span>₹${counter}</span>
    </div>
  `;
}



function openExpenseDrawer() {
  document.getElementById("expenseDrawer")
    .classList.add("open");
}

function closeExpenseDrawer() {
  document.getElementById("expenseDrawer")
    .classList.remove("open");
}
