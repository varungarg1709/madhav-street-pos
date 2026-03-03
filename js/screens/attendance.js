function initAttendance() {

  const today = getTodayLocal();

  // set date control used by the staff-list and quick actions
  const dateEl = document.getElementById("attendanceDate") || document.getElementById("a_date");
  if (dateEl) dateEl.value = today;

  populateStaffDropdown();
  // initialize UI cache and render enhanced views
  initAttendanceCache();
  renderQuickAttendance();
  renderAttendanceStats();
  renderStaffList();
}

function populateStaffDropdown() {

  const staff =
    APP_STORE.staffData || [];

  const select =
    document.getElementById("a_staff");

  // If legacy select not present (new UI), skip populating it
  if (!select) return;

  select.innerHTML = "";

  staff.forEach(s=>{
    const opt=document.createElement("option");
    opt.value=s;
    opt.textContent=s;
    select.appendChild(opt);
  });
}

function renderAttendance() {

  const list =
    APP_STORE.attendanceData || [];

  const tbody =
    document.getElementById("attendanceTableBody");

  tbody.innerHTML="";

  list.forEach(a=>{

    const tr=document.createElement("tr");

    tr.innerHTML=`
      <td>${a.date || ""}</td>
      <td>${a.staff || ""}</td>
      <td>${a.checkIn || "-"}</td>
      <td>${a.checkOut || "-"}</td>
      <td>${a.status || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderQuickAttendance() {

  const container =
    document.getElementById("quickAttendance");

  if (!container) return;

  const staff = APP_STORE.staffData || [];

  container.innerHTML = "";

  staff.forEach(name => {
    const row = document.createElement("div");
    row.className = "quick-row";
    row.innerHTML = `<span>${name}</span>`;
    const presentBtn = document.createElement('button'); presentBtn.className='present-btn'; presentBtn.innerText='Present'; presentBtn.onclick = ()=> toggleAttendanceLocal(name,'Present');
    const absentBtn = document.createElement('button'); absentBtn.className='absent-btn'; absentBtn.innerText='Absent'; absentBtn.onclick = ()=> toggleAttendanceLocal(name,'Absent');
    row.appendChild(presentBtn); row.appendChild(absentBtn);
    container.appendChild(row);
  });
}

function filterStaffList(){
  const q = (document.getElementById('staffSearch')||{}).value?.toLowerCase()||'';
  const items = Array.from(document.getElementById('staffList').children||[]);
  items.forEach(li=>{
    const name = li.querySelector('.staff-name')?.innerText.toLowerCase()||'';
    li.style.display = name.includes(q)?'flex':'none';
  });
}

async function toggleAttendanceLocal(staff, status){

  if (!attendanceCache[staff]) {
    attendanceCache[staff] = {
      status: '',
      checkIn: '',
      checkOut: '',
      notes: ''
    };
  }

  const oldStatus = attendanceCache[staff].status;

  // Optimistic UI update
  attendanceCache[staff].status = status;
  renderStaffList();

  const result = await saveAttendanceForStaff(staff, status);

  // If failed → revert UI
  if (!result) {
    attendanceCache[staff].status = oldStatus;
    renderStaffList();
    showToast("Save failed", { type: "error" });
  }
}

async function saveAttendanceForStaff(staff, status){

  const date =
    document.getElementById("attendanceDate")?.value
    || getTodayLocal();

  const result = await postAPI("attendance", {
    date: date,
    staff: staff,
    checkIn: "",
    checkOut: "",
    status: status,
    notes: "Marked from UI"
  });

  if (!result) return;

  attendanceCache[staff] = attendanceCache[staff] || {};
  attendanceCache[staff].status = status;

  renderAttendanceStats();
  showToast(staff + " marked " + status, { type: "success" });
  return true;
}

function markAllPresent(){
  (APP_STORE.staffData||[]).forEach(s=>{ attendanceCache[s] = attendanceCache[s]||{}; attendanceCache[s].status = 'Present'; });
  renderStaffList();
}

async function saveAllAttendance(){

  const date =
    document.getElementById("attendanceDate")?.value
    || getTodayLocal();

  const entries = Object.keys(attendanceCache || {});

  const requests = entries.map(staff => {

    const entry = attendanceCache[staff];

    return postAPI("attendance", {
      date: date,
      staff: staff,
      checkIn: entry.checkIn || "",
      checkOut: entry.checkOut || "",
      status: entry.status || "",
      notes: entry.notes || ""
    });

  });

  await Promise.all(requests);

  showToast("Attendance saved", { type: "success" });
  reloadData(() => initAttendance());
}

async function markAttendance(staff, status){
  const date =
    document.getElementById("attendanceDate")?.value
    || getTodayLocal();

  const result = await postAPI("attendance", {
    date: date,
    staff: staff,
    checkIn: "",
    checkOut: "",
    status: status,
    notes: "EOD mark"
  });

  if (!result) return;

  showToast(staff + " marked " + status, { type: "info" });

  reloadData(() => initAttendance());
}

// in-memory cache for UI interactions before persisting
let attendanceCache = {};

function initAttendanceCache(){
  attendanceCache = {};
  const list = APP_STORE.attendanceData || [];
  const today = (document.getElementById("attendanceDate")||{}).value || getTodayLocal();

  // populate from existing records for the selected date
  list.filter(a=>a.date === today).forEach(a=>{
    attendanceCache[a.staff] = {
      checkIn: a.checkIn || "",
      checkOut: a.checkOut || "",
      status: a.status || "Present",
      notes: a.notes || ""
    };
  });

  // ensure every staff has an entry
  (APP_STORE.staffData||[]).forEach(s=>{
    if (!attendanceCache[s]) attendanceCache[s] = { status: "", checkIn: "", checkOut: "", notes: "" };
  });
}

function renderAttendanceStats(){
  const staff = APP_STORE.staffData || [];
  const total = staff.length;
  let present = 0;
  let absent = 0;

  Object.keys(attendanceCache || {}).forEach(k => {
    const s = attendanceCache[k];
    if (!s || !s.status) return;
    if (s.status.toLowerCase() === 'present') present++;
    else if (s.status.toLowerCase() === 'absent') absent++;
  });

  const elTotal = document.getElementById('statTotal'); if (elTotal) elTotal.innerText = total;
  const elPresent = document.getElementById('statPresent'); if (elPresent) elPresent.innerText = present;
  const elAbsent = document.getElementById('statAbsent'); if (elAbsent) elAbsent.innerText = absent;
}

function renderStaffList(){
  const listEl = document.getElementById('staffList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const staff = APP_STORE.staffData || [];

  staff.forEach(name => {
    const entry = attendanceCache[name] || { status: '' };

    const li = document.createElement('li');
    li.className = 'staff-item';

    const left = document.createElement('div');
    left.className = 'staff-left';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerText = name.split(' ').map(p=>p[0]||'').slice(0,2).join('').toUpperCase();

    const meta = document.createElement('div');
    const n = document.createElement('div'); n.className='staff-name'; n.innerText = name;
    const r = document.createElement('div'); r.className='staff-role'; r.innerText = (APP_STORE.staffRoles||{})[name] || '';
    meta.appendChild(n); meta.appendChild(r);

    left.appendChild(avatar); left.appendChild(meta);

    const actions = document.createElement('div'); actions.className='staff-actions';

    const presentBtn = document.createElement('button');
    presentBtn.className = 'toggle-btn present' + (entry.status && entry.status.toLowerCase()==='present' ? ' active present' : '');
    presentBtn.innerText = 'Present';
    presentBtn.onclick = () => { toggleAttendanceLocal(name, 'Present'); };

    const absentBtn = document.createElement('button');
    absentBtn.className = 'toggle-btn absent' + (entry.status && entry.status.toLowerCase()==='absent' ? ' active absent' : '');
    absentBtn.innerText = 'Absent';
    absentBtn.onclick = () => { toggleAttendanceLocal(name, 'Absent'); };

    actions.appendChild(presentBtn);
    actions.appendChild(absentBtn);

    li.appendChild(left);
    li.appendChild(actions);

    listEl.appendChild(li);
  });

  renderAttendanceStats();
}