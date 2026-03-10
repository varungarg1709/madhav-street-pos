let attendanceCache = {};

/* ================= INIT ================= */

function initAttendance(){

  const today = getTodayLocal();

  const dateEl =
    document.getElementById("attendanceDate") ||
    document.getElementById("a_date");

  if(dateEl) dateEl.value = today;

  populateStaffDropdown();

  initAttendanceCache();

  renderQuickAttendance();
  renderAttendanceStats();
  renderStaffList();

}

/* ================= STAFF DROPDOWN ================= */

function populateStaffDropdown(){

  const staff = APP_STORE.staffData || [];
  const select = document.getElementById("a_staff");

  if(!select) return;

  select.innerHTML = "";

  staff.forEach(s=>{

    const opt = document.createElement("option");

    opt.value = s.code;
    opt.textContent = s.name;

    select.appendChild(opt);

  });

}

/* ================= QUICK ATTENDANCE ================= */

function renderQuickAttendance(){

  const container =
    document.getElementById("quickAttendance");

  if(!container) return;

  const staff = APP_STORE.staffData || [];

  container.innerHTML = "";

  staff.forEach(s=>{

    const row = document.createElement("div");
    row.className = "quick-row";

    row.innerHTML = `<span>${s.name}</span>`;

    const presentBtn = document.createElement("button");
    presentBtn.className = "present-btn";
    presentBtn.innerText = "Present";
    presentBtn.onclick = ()=>toggleAttendanceLocal(s.code,"Present");

    const absentBtn = document.createElement("button");
    absentBtn.className = "absent-btn";
    absentBtn.innerText = "Absent";
    absentBtn.onclick = ()=>toggleAttendanceLocal(s.code,"Absent");

    row.appendChild(presentBtn);
    row.appendChild(absentBtn);

    container.appendChild(row);

  });

}

/* ================= LOCAL TOGGLE ================= */

async function toggleAttendanceLocal(code,status){

  if(!attendanceCache[code]){

    attendanceCache[code] = {
      status:"",
      checkIn:"",
      checkOut:"",
      notes:""
    };

  }

  const oldStatus = attendanceCache[code].status;

  attendanceCache[code].status = status;

  renderStaffList();

  const result = await saveAttendanceForStaff(code,status);

  if(!result){

    attendanceCache[code].status = oldStatus;

    renderStaffList();

    showToast("Save failed",{type:"error"});

  }

}

/* ================= SAVE STAFF ATTENDANCE ================= */

async function saveAttendanceForStaff(code,status){

  const date =
    document.getElementById("attendanceDate")?.value ||
    getTodayLocal();

  const staff =
    (APP_STORE.staffData||[])
    .find(s=>s.code===code);

  const result = await postAPI("attendance",{

    date:date,
    staffCode:code,
    staffName:staff?.name || "",

    checkIn:"",
    checkOut:"",
    status:status,
    notes:"Marked from UI"

  });

  if(!result) return;

  attendanceCache[code].status = status;

  renderAttendanceStats();

  showToast(staff?.name+" marked "+status,{type:"success"});

  return true;

}

/* ================= MARK ALL ================= */

function markAllPresent(){

  (APP_STORE.staffData||[]).forEach(s=>{

    attendanceCache[s.code] =
      attendanceCache[s.code] || {};

    attendanceCache[s.code].status = "Present";

  });

  renderStaffList();

}

/* ================= SAVE ALL ================= */

async function saveAllAttendance(){

  const date =
    document.getElementById("attendanceDate")?.value ||
    getTodayLocal();

  const entries = Object.keys(attendanceCache||{});

  const requests = entries.map(code=>{

    const entry = attendanceCache[code];

    const staff =
      (APP_STORE.staffData||[])
      .find(s=>s.code===code);

    return postAPI("attendance",{

      date:date,
      staffCode:code,
      staffName:staff?.name || "",

      checkIn:entry.checkIn || "",
      checkOut:entry.checkOut || "",
      status:entry.status || "",
      notes:entry.notes || ""

    });

  });

  await Promise.all(requests);

  showToast("Attendance saved",{type:"success"});

  reloadData(()=>initAttendance());

}

/* ================= CACHE INIT ================= */

function initAttendanceCache(){

  attendanceCache = {};

  const list = APP_STORE.attendanceData || [];

  const today =
    document.getElementById("attendanceDate")?.value ||
    getTodayLocal();

  list
  .filter(a=>a.date===today)
  .forEach(a=>{

    attendanceCache[a.staffCode] = {

      checkIn:a.checkIn || "",
      checkOut:a.checkOut || "",
      status:a.status || "",
      notes:a.notes || ""

    };

  });

  (APP_STORE.staffData||[]).forEach(s=>{

    if(!attendanceCache[s.code]){

      attendanceCache[s.code] = {

        status:"",
        checkIn:"",
        checkOut:"",
        notes:""

      };

    }

  });

}

/* ================= STATS ================= */

function renderAttendanceStats(){

  const staff = APP_STORE.staffData || [];

  const total = staff.length;

  let present = 0;
  let absent = 0;

  Object.values(attendanceCache).forEach(s=>{

    if(!s.status) return;

    if(s.status.toLowerCase()==="present") present++;
    if(s.status.toLowerCase()==="absent") absent++;

  });

  document.getElementById("statTotal").innerText = total;
  document.getElementById("statPresent").innerText = present;
  document.getElementById("statAbsent").innerText = absent;

}

/* ================= STAFF LIST ================= */

function renderStaffList(){

  const listEl = document.getElementById("staffList");
  if(!listEl) return;

  listEl.innerHTML = "";

  const selectedDate =
    document.getElementById("attendanceDate")?.value ||
    getTodayLocal();

  let staff = APP_STORE.staffData || [];

  /* ===== SORT ACTIVE FIRST ===== */

  staff = [...staff].sort((a,b)=>{

    const s1 = (a.status||"").toLowerCase();
    const s2 = (b.status||"").toLowerCase();

    if(s1==="active" && s2!=="active") return -1;
    if(s1!=="active" && s2==="active") return 1;

    return 0;

  });

  staff.forEach(s=>{

    const entry =
      attendanceCache[s.code] || {status:""};

    /* ===== DATE RANGE CHECK ===== */

    let disabled = false;

    if(s.joinDate && selectedDate < s.joinDate)
      disabled = true;

    if(s.leaveDate && selectedDate > s.leaveDate)
      disabled = true;

    if((s.status||"").toLowerCase()==="inactive")
      disabled = true;

    const avatar =
      s.name.split(" ")
      .map(p=>p[0])
      .slice(0,2)
      .join("")
      .toUpperCase();

    const li = document.createElement("li");
    li.className =
      "staff-item"+(disabled?" staff-disabled":"");

    li.innerHTML = `

      <div class="staff-left">

        <div class="avatar">${avatar}</div>

        <div>

          <div class="staff-name">${s.name}</div>

          <div class="staff-role">${s.role || ""}</div>

        </div>

      </div>

      <div class="staff-actions">

        <button
          class="toggle-btn present ${entry.status==='Present'?'active':''}"
          onclick="toggleAttendanceLocal('${s.code}','Present')"
          ${disabled?"disabled":""}
        >
          Present
        </button>

        <button
          class="toggle-btn absent ${entry.status==='Absent'?'active':''}"
          onclick="toggleAttendanceLocal('${s.code}','Absent')"
          ${disabled?"disabled":""}
        >
          Absent
        </button>

      </div>

    `;

    listEl.appendChild(li);

  });

  renderAttendanceStats();

}

function filterStaffList(){

  const q =
    document.getElementById("staffSearch")
    ?.value.toLowerCase() || "";

  const items =
    document.querySelectorAll("#staffList .staff-item");

  items.forEach(li => {

    const name =
      li.querySelector(".staff-name")
      ?.innerText.toLowerCase() || "";

    li.style.display =
      name.includes(q) ? "flex" : "none";

  });

}