const settingsModules = [
  {
    title: "Vendors",
    key: "vendors",
    data: () => vendors
  },
  {
    title: "Expense Categories",
    key: "expenseCategories",
    data: () => expenseCategories
  },
  {
    title: "Expense Types",
    key: "expenseTypes",
    data: () => expenseTypes
  },
  {
    title: "Partners",
    key: "partners",
    data: () => paidByList
  },
  {
    title: "Staff",
    key: "staff",
    data: () => staffData
  }
];

function initSettings() {
  renderSettingsModules();
}

function renderSettingsModules() {
  const container = document.getElementById("settingsContainer");
  if (!container) return;

  container.innerHTML = "";

  settingsModules.forEach(module => {
    container.innerHTML += `
      <div class="card settings-card">

        <div class="settings-header">
          <h3>${module.title}</h3>
        </div>

        <div class="settings-add-row">
          <input type="text"
            id="add_${module.key}"
            placeholder="Add ${module.title}">
          <button onclick="addSettingItem('${module.key}')">
            Add
          </button>
        </div>

        <table class="settings-table">
          <thead>
            <tr>
              <th>Name</th>
              <th width="140">Actions</th>
            </tr>
          </thead>
          <tbody id="table_${module.key}">
          </tbody>
        </table>

      </div>
    `;

    renderSettingsTable(module.key, module.data());
  });
}

function renderSettingsTable(key, list) {
  const tbody = document.getElementById("table_" + key);
  if (!tbody) return;

  tbody.innerHTML = "";

  list.forEach((item, index) => {
    tbody.innerHTML += `
      <tr>
        <td>
          <input
            type="text"
            value="${item}"
            id="${key}_${index}"
            class="setting-input"
          >
        </td>

        <td>
          <button onclick="updateSettingItem('${key}',${index})">
            Save
          </button>

          <button class="danger"
            onclick="deleteSettingItem('${key}',${index})">
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}

/* ===== ADD ===== */
function addSettingItem(key) {
  const input = document.getElementById("add_" + key);
  if (!input) return;

  const value = input.value.trim();
  if (!value) return;

  alert("Next step: save to Apps Script");

  input.value = "";
}

/* ===== UPDATE ===== */
function updateSettingItem(key, index) {
  const val = document.getElementById(`${key}_${index}`).value;
  alert("Update: " + val);
}

/* ===== DELETE ===== */
function deleteSettingItem(key, index) {
  if (!confirm("Delete this item?")) return;

  alert("Delete index: " + index);
}
