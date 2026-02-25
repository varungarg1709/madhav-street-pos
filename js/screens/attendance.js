function initAttendance() {

  const today =
    new Date().toISOString().split("T")[0];

  document.getElementById("a_date").value = today;

  populateStaffDropdown();
  renderAttendance();
}

function populateStaffDropdown() {

  const staff =
    APP_STORE.staffData || [];

  const select =
    document.getElementById("a_staff");

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

function saveAttendance() {

  document.getElementById("f_token").value =
    sessionStorage.getItem("ms_token");

  document.getElementById("f_a_date").value =
    document.getElementById("a_date").value;

  document.getElementById("f_a_staff").value =
    document.getElementById("a_staff").value;

  document.getElementById("f_a_checkIn").value =
    document.getElementById("a_checkIn").value;

  document.getElementById("f_a_checkOut").value =
    document.getElementById("a_checkOut").value;

  document.getElementById("f_a_status").value =
    document.getElementById("a_status").value;

  document.getElementById("f_a_notes").value =
    document.getElementById("a_notes").value;

  document.getElementById("attendanceForm").submit();

  alert("Attendance saved");

  setTimeout(() => {
    reloadData();
  }, 700);
}