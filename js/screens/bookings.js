function initBookings() {
  renderBookingDashboard();
  renderBookingList();
}

// =======================
// Booking Dashboard UI
// =======================
function renderBookingDashboard() {
  const container = document.getElementById("bookingDashboard");

  container.innerHTML = `
    <div class="booking-form">
      <h3>New Booking</h3>

      <input type="date" id="bookingDate">

      <input type="text" id="bookingCustomer" placeholder="Customer name">
      <input type="text" id="bookingPhone" placeholder="Phone">

      <select id="bookingTable"></select>
      <select id="bookingEvent"></select>

      <input type="number" id="bookingMembers" placeholder="Total members">
      <input type="number" id="bookingAdvance" placeholder="Advance amount">

      <button onclick="saveBooking()">Save Booking</button>
    </div>

    <div class="booking-list">
      <h3>Upcoming Bookings</h3>
      <div id="bookingList"></div>
    </div>
  `;

  // Set today date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("bookingDate").value = today;

  // Load tables
  const tableSelect = document.getElementById("bookingTable");
  tableSelect.innerHTML = "<option value=''>Select table</option>";
  tableData.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tableSelect.appendChild(opt);
  });

  // Load event types
// Load event types (force refresh)
const eventSelect = document.getElementById("bookingEvent");

eventSelect.innerHTML = "<option value=''>Event type</option>";

console.log("Booking screen eventTypes:", eventTypes);

eventTypes.forEach(type => {
  const opt = document.createElement("option");
  opt.value = type;
  opt.textContent = type;
  eventSelect.appendChild(opt);
});



}

// =======================
// Booking List
// =======================
function renderBookingList() {
  const list = document.getElementById("bookingList");

  if (!list) return;

  list.innerHTML = "";

  if (!bookingData || bookingData.length === 0) {
    list.innerHTML = "<p>No bookings found.</p>";
    return;
  }

  bookingData.forEach(b => {
    const row = document.createElement("div");
    row.className = "booking-row";

    row.innerHTML = `
      <div>
        <strong>${b.name}</strong><br>
        Table: ${b.table}<br>
        Date: ${b.date}
      </div>
      <div>
        ₹${b.amount || 0}
      </div>
      <button onclick="loadBooking('${b.billNo}')">Load</button>
    `;

    list.appendChild(row);
  });
}


function saveBooking() {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = scriptURL;
  form.target = "hiddenFrame";

  function addField(name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  addField("mode", "booking");
  addField("bookingDate", document.getElementById("bookingDate").value);
  addField("customerName", document.getElementById("bookingCustomer").value);
  addField("phone", document.getElementById("bookingPhone").value);
  addField("tableNo", document.getElementById("bookingTable").value);
  addField("eventType", document.getElementById("bookingEvent").value);
  addField("totalMembers", document.getElementById("bookingMembers").value);
  addField("advanceAmount", document.getElementById("bookingAdvance").value);

  document.body.appendChild(form);
  form.submit();
  form.remove();

  alert("Booking saved");
}
