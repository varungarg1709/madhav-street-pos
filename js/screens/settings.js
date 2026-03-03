const settingsModules = [
  { title: "Vendors", key: "vendors", getter: () => APP_STORE.vendors || [] },
  { title: "Expense Categories", key: "expenseCategories", getter: () => APP_STORE.expenseCategories || [] },
  { title: "Expense Types", key: "expenseTypes", getter: () => APP_STORE.expenseTypes || [] },
  { title: "Paid By / Partners", key: "paidByList", getter: () => APP_STORE.paidByList || [] },
  { title: "Staff", key: "staffData", getter: () => APP_STORE.staffData || [] },
  { title: "Tables", key: "tableData", getter: () => APP_STORE.tableData || [] },
  { title: "Menu (names)", key: "menuData", getter: () => (APP_STORE.menuData || []).map(i=>i.item || "") }
];

let currentSettingsKey = null;

function initSettings(){
  renderSettingsTabs();
  // open first tab
  if (settingsModules.length) selectSettingsTab(settingsModules[0].key);
}

function renderSettingsTabs(){
  const tabs = document.getElementById('settingsTabs');
  if (!tabs) return;
  tabs.innerHTML = '';

  settingsModules.forEach(m=>{
    const b = document.createElement('div');
    b.className = 'settings-tab';
    b.innerText = m.title;
    b.onclick = () => selectSettingsTab(m.key);
    b.id = 'tab_' + m.key;
    tabs.appendChild(b);
  });
}

function selectSettingsTab(key){
  currentSettingsKey = key;
  // mark active
  settingsModules.forEach(m=>{
    const el = document.getElementById('tab_' + m.key);
    if (el) el.classList.toggle('active', m.key === key);
  });
  renderSettingsModule(key);
}

function renderSettingsModule(key){
  const container = document.getElementById('settingsContainer');
  if (!container) return;
  const mod = settingsModules.find(m=>m.key===key);
  if (!mod) return;

  const list = mod.getter() || [];

  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'module-card';

  const header = document.createElement('div'); header.className='module-actions';
  const input = document.createElement('input'); input.className='setting-input'; input.id = 'add_' + key; input.placeholder = 'Add new';
  const addBtn = document.createElement('button'); addBtn.innerText = 'Add'; addBtn.onclick = ()=> addSettingItem(key);
  const saveBtn = document.createElement('button'); saveBtn.innerText = 'Save to server'; saveBtn.className='secondary-btn'; saveBtn.onclick = ()=> saveSettingsToServer(key);
  header.appendChild(input); header.appendChild(addBtn); header.appendChild(saveBtn);

  card.appendChild(header);

  const table = document.createElement('table'); table.className = 'settings-list';
  const tbody = document.createElement('tbody'); tbody.id = 'table_' + key;

  list.forEach((item, idx) => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const inputEl = document.createElement('input'); inputEl.value = item; inputEl.id = `${key}_${idx}`; inputEl.className='setting-input';
    td1.appendChild(inputEl);

    const td2 = document.createElement('td');
    const save = document.createElement('button'); save.innerText='Save'; save.className='small-btn'; save.onclick = ()=> updateSettingItem(key, idx);
    const del = document.createElement('button'); del.innerText='Delete'; del.className='small-btn danger'; del.onclick = ()=> deleteSettingItem(key, idx);
    td2.appendChild(save); td2.appendChild(del);

    tr.appendChild(td1); tr.appendChild(td2);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  card.appendChild(table);

  container.appendChild(card);
}

function getSettingsListRef(key){
  // return direct array reference in APP_STORE when possible
  if (!window.APP_STORE) return null;
  switch(key){
    case 'vendors': return APP_STORE.vendors;
    case 'expenseCategories': return APP_STORE.expenseCategories;
    case 'expenseTypes': return APP_STORE.expenseTypes;
    case 'paidByList': return APP_STORE.paidByList;
    case 'staffData': return APP_STORE.staffData;
    case 'tableData': return APP_STORE.tableData;
    case 'menuData': return APP_STORE.menuData; // note: menuData is array of objects
  }
  return null;
}

function addSettingItem(key){
  const input = document.getElementById('add_' + key);
  if (!input) return;
  const v = input.value.trim(); if (!v) return;

  const ref = getSettingsListRef(key);
  if (ref === null){ showToast('Cannot edit this setting', { type: 'error' }); return; }

  if (key === 'menuData'){
    // add new menu item as simple object
    ref.push({ item: v, price: 0, category: '' });
  } else {
    ref.push(v);
  }

  input.value = '';
  showToast('Added', { type: 'success' });
  renderSettingsModule(key);
}

function updateSettingItem(key, index){
  const el = document.getElementById(`${key}_${index}`);
  if (!el) return;
  const v = el.value.trim();
  const ref = getSettingsListRef(key);
  if (!ref) return showToast('Cannot update', { type: 'error' });

  if (key === 'menuData'){
    // update item's name
    if (ref[index]) ref[index].item = v;
  } else {
    ref[index] = v;
  }

  showToast('Updated', { type: 'success' });
  renderSettingsModule(key);
}

function deleteSettingItem(key, index){
  if (!confirm('Delete this item?')) return;
  const ref = getSettingsListRef(key);
  if (!ref) return showToast('Cannot delete', { type: 'error' });
  ref.splice(index,1);
  showToast('Deleted', { type: 'info' });
  renderSettingsModule(key);
}

async function saveSettingsToServer(key){
  const ref = getSettingsListRef(key);
  if (!ref) return showToast('Nothing to save', { type: 'error' });

  // normalize menuData when saving: keep entire object array
  const payload = (key === 'menuData') ? ref : ref.slice();

  const form = new FormData();
  form.append('mode','save_settings');
  form.append('apiKey', CONFIG.apiKey);
  form.append('token', sessionStorage.getItem('ms_token'));
  form.append('settingKey', key);
  form.append('data', JSON.stringify(payload));

  try{
    await fetch(CONFIG.scriptURL, { method: 'POST', body: form });
    showToast('Saved to server', { type: 'success' });
  }catch(e){
    showToast('Save failed', { type: 'error' });
  }
}

// expose for debugging
window.selectSettingsTab = selectSettingsTab;
