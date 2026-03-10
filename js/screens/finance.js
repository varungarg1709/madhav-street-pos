let editingStaffCode = null
let salaryVisible = false


/* INIT */

function initFinance(){

  populateAdvanceStaffFilter();

  renderStaffTable();
  renderStaffAdvances();
  renderStaffLedger();

  const m = new Date()

  const monthEl = document.getElementById("payrollMonth")
  if(monthEl){
    monthEl.value = m.toISOString().slice(0,7)
  }

  openFinanceTab(null,"staffLedger")

}


/* STAFF TABLE */

function renderStaffTable(){

  const list = APP_STORE.staffData || []
  const tbody = document.getElementById("staffTableBody")

  if(!tbody) return

  tbody.innerHTML=""

  const sorted = [...list].sort((a,b)=>{

    const s1 = (a.status || "").toLowerCase()
    const s2 = (b.status || "").toLowerCase()

    if(s1==="active" && s2!=="active") return -1
    if(s1!=="active" && s2==="active") return 1

    return 0

  })

  let html = ""

sorted.forEach((s,i)=>{

  html += `
  <tr>
    <td>${i+1}</td>
    <td>${s.code||"-"}</td>
    <td>${s.name||"-"}</td>
    <td>${s.role||"-"}</td>
    <td>${formatDateUI(s.joinDate)}</td>

    <td>
      <span class="salary-mask"
            data-salary="${s.salary||0}">
        ₹ *****
      </span>
    </td>

    <td>
      <span class="staff-status ${(s.status||"").toLowerCase()}">
        ${s.status||""}
      </span>
    </td>

    <td>
      <button onclick="editStaff('${s.code}')">
        Edit
      </button>
    </td>
  </tr>
  `
})

tbody.innerHTML = html

}


/* SALARY HOVER */

document.addEventListener("mouseover",function(e){

  const el = e.target

  if(el.classList.contains("salary-mask") && !salaryVisible){

    el.innerText = "₹ " + el.dataset.salary

  }

})

document.addEventListener("mouseout",function(e){

  const el = e.target

  if(el.classList.contains("salary-mask") && !salaryVisible){

    el.innerText = "₹ *****"

  }

})


/* SALARY TOGGLE */

function toggleSalaryView(){

  salaryVisible = !salaryVisible

  const salaries = document.querySelectorAll(".salary-mask")

  salaries.forEach(el=>{

    if(salaryVisible){
      el.innerText = "₹ " + el.dataset.salary
    }else{
      el.innerText = "₹ *****"
    }

  })

}


/* DRAWER */

function openStaffDrawer(){

  const drawer = document.getElementById("staffDrawer")

  if(!drawer){
    console.error("staffDrawer not found")
    return
  }

  const title = document.getElementById("staffDrawerTitle")
  if(title) title.innerText = "Add Staff"

  editingStaffCode = null

  clearStaffForm()

  drawer.classList.add("open")

  const name = document.getElementById("staffName")
  if(name) name.focus()

}

function closeStaffDrawer(){
  const drawer = document.getElementById("staffDrawer")
  if(drawer) drawer.classList.remove("open")
}

/* EDIT */

function editStaff(code){

  const staff =
    (APP_STORE.staffData || [])
    .find(s => s.code === code)

  if(!staff) return

  editingStaffCode = staff.code

  const title = document.getElementById("staffDrawerTitle")
  if(title) title.innerText = "Edit Staff"

  const set = (id,val)=>{
    const el = document.getElementById(id)
    if(el) el.value = val || ""
  }

  set("staffCode",staff.code)
  set("staffName",staff.name)
  set("staffRole",staff.role)
  set("staffGender",staff.gender)
  set("staffDOB",staff.dob)
  set("staffMarital",staff.maritalStatus)
  set("staffJoinDate",staff.joinDate)
  set("staffLeaveDate",staff.leaveDate)
  set("staffSalary",staff.salary)
  set("staffStatus",staff.status)
  set("staffPhone",staff.phone)
  set("staffPermissions",staff.permissions)

  const drawer = document.getElementById("staffDrawer")
  if(drawer) drawer.classList.add("open")

}


/* SAVE STAFF */

async function saveStaff(){

  function val(id){
    const el = document.getElementById(id)
    return el ? el.value : ""
  }

  const payload = {

    staffCode: val("staffCode"),
    staffName: val("staffName"),
    role: val("staffRole"),
    gender: val("staffGender"),
    dob: val("staffDOB"),
    marital: val("staffMarital"),
    joinDate: val("staffJoinDate"),
    leaveDate: val("staffLeaveDate"),
    salary: val("staffSalary"),
    status: val("staffStatus"),
    phone: val("staffPhone"),
    permissions: val("staffPermissions"),

    editCode: editingStaffCode
  }

  const res = await postAPI("saveStaff",payload)

  if(!res) return

  closeStaffDrawer()

  reloadData(renderStaffTable)

}


/* STAFF ADVANCES */

function calculateStaffAdvances(){

  const expenses = APP_STORE.expenseData || []

  const advances={}

  expenses.forEach(e=>{

    if(!e.type || !e.type.toLowerCase().includes("staff")) return
    if(!e.staff) return

    if(!advances[e.staff]){
      advances[e.staff]={ total:0 }
    }

    advances[e.staff].total += Number(e.amount)||0

  })

  return advances

}


function renderStaffAdvances(){

  const tbody =
    document.getElementById("staffAdvancesTable")

  if(!tbody) return

  const filterStaff =
    document.getElementById("advanceStaffFilter")?.value || ""

  let expenses =
    APP_STORE.expenseData || []

  /* ONLY STAFF PAYOUTS */

  expenses = expenses.filter(e =>
    e.type && e.type.toLowerCase().includes("staff")
  )

  /* STAFF FILTER */

  if(filterStaff){

    expenses = expenses.filter(e =>
      e.staff === filterStaff
    )

  }

  /* SORT DESC DATE */

  expenses.sort((a,b)=>{

    return new Date(b.date) - new Date(a.date)

  })

  let html = ""

  expenses.forEach((e,i)=>{

    html += `
      <tr>

        <td>${i+1}</td>

        <td>${formatFinanceDate(e.date)}</td>

        <td>${e.staffName || "-"}</td>

        <td>₹${e.amount}</td>

        <td>${e.mode || "-"}</td>

        <td>${e.comment || "-"}</td>

      </tr>
    `

  })

  if(!html){

    html = `
      <tr>
        <td colspan="6">No advances found</td>
      </tr>
    `

  }

  tbody.innerHTML = html

}


/* STAFF LEDGER */

function buildStaffLedger(){

  const staff = APP_STORE.staffData || []
  const expenses = APP_STORE.expenseData || []
  const attendance = APP_STORE.attendanceData || []

  const ledger={}

  staff.forEach(s=>{

    ledger[s.code]={

      name:s.name,
      salary:Number(s.salary)||0,
      advances:0,
      presentDays:0,
      payable:0

    }

  })


  expenses.forEach(e => {

  if(!e.type || !e.type.toLowerCase().includes("staff")) return
  if(!e.staff) return

  if(ledger[e.staff]){
    ledger[e.staff].advances += Number(e.amount) || 0
  }

})


  attendance.forEach(a=>{

    if(a.status!=="Present") return

    const code=a.staffCode

    if(ledger[code]){
      ledger[code].presentDays++
    }

  })


  Object.values(ledger).forEach(l=>{

    const perDay = l.salary/30

    const earned = perDay*l.presentDays

    l.payable = Math.round(earned - l.advances)

    if(l.payable<0) l.payable=0

  })


  return ledger

}


function renderStaffLedger(){

  const tbody=document.getElementById("staffLedgerBody")

  if(!tbody) return

  const ledger=buildStaffLedger()

  let html=""

  let i=1

  Object.values(ledger).forEach(l=>{

    html+=`

      <tr>

        <td>${i++}</td>
        <td>${l.name}</td>
        <td>₹${l.salary}</td>
        <td>₹${l.advances}</td>
        <td>${l.presentDays}</td>
        <td><b>₹${l.payable}</b></td>

      </tr>

    `

  })

  tbody.innerHTML=html

}


/* TAB SWITCH */

function openFinanceTab(event,tab){

  document
    .querySelectorAll(".finance-tab-screen")
    .forEach(s=>s.classList.remove("active"))

  document
    .getElementById(tab+"Tab")
    .classList.add("active")

  document
    .querySelectorAll(".finance-tab")
    .forEach(t=>t.classList.remove("active"))

  if(event) event.target.classList.add("active")

}


window.initFinance = initFinance

function formatFinanceDate(dateStr){

  if(!dateStr) return "-"

  const d = new Date(dateStr)

  return d.toLocaleDateString("en-IN",{
    day:"2-digit",
    month:"short",
    year:"numeric"
  })

}

function populateAdvanceStaffFilter(){

  const select =
    document.getElementById("advanceStaffFilter")

  if(!select) return

  const staff = APP_STORE.staffData || []

  select.innerHTML =
    `<option value="">All Staff</option>`

  staff.forEach(s=>{

    const opt = document.createElement("option")

    opt.value = s.code
    opt.textContent = s.name

    select.appendChild(opt)

  })

}

async function generatePayrollUI(){

  const monthEl = document.getElementById("payrollMonth")
  if(!monthEl){
    alert("Payroll input missing")
    return
  }

  const month = monthEl.value

  const data =
    await postAPI("generatePayroll",{month})

  renderPayrollTable(data)

}


function renderPayrollTable(list){

  const tbody =
    document.getElementById("payrollTableBody")

  if(!tbody) return

  if(!list || !list.length){

    tbody.innerHTML =
      `<tr><td colspan="5">No payroll data</td></tr>`

    return

  }

  let html = ""

  list.forEach((s,i)=>{

    html += `

      <tr>

        <td>${i+1}</td>

        <td>${s.name}</td>

        <td>${s.presentDays}</td>

        <td>₹${s.salary}</td>

        <td><b>₹${s.payable}</b></td>

      </tr>

    `

  })

  tbody.innerHTML = html

}

function clearStaffForm(){

  const fields = [
    "staffName",
    "staffRole",
    "staffGender",
    "staffDOB",
    "staffMarital",
    "staffJoinDate",
    "staffLeaveDate",
    "staffSalary",
    "staffStatus",
    "staffPhone",
    "staffPermissions"
  ]

  const code = document.getElementById("staffCode")
  if(code) code.value = ""

  fields.forEach(id=>{
    const el = document.getElementById(id)
    if(!el) return

    if(el.tagName === "SELECT"){
      el.selectedIndex = 0
    }else{
      el.value = ""
    }
  })

}