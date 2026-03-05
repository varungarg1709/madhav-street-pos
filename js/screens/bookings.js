function initBookings() {
  renderBookingDashboard();
  renderBookingList();
}

// =======================
// Booking Dashboard UI
// =======================
function renderBookingDashboard() {
  const container = document.getElementById("bookingDashboard");
  if (!container) return;

  container.innerHTML = `
    <div class="booking-grid">
      <div class="booking-card">
        <div class="booking-form">
          <h3 id="bookingFormTitle">New Booking</h3>

          <div class="row">
            <label>Date</label>
            <input type="date" id="bookingDate">
            <label>Start</label>
            <input type="time" id="bookingStart">
            <label>End</label>
            <input type="time" id="bookingEnd">
          </div>

          <div class="row">
            <input type="text" id="bookingCustomer" placeholder="Customer name">
            <input type="text" id="bookingHost" placeholder="Host name">
            <input type="text" id="bookingPhone" placeholder="Phone">
          </div>

          <div class="row">
            <select id="bookingTable"></select>
            <select id="bookingEvent"></select>
            <input type="number" id="bookingMembers" placeholder="Total members">
          </div>

          <div class="row">
            <input type="number" id="bookingAdvance" placeholder="Advance amount">
            <select id="bookingPaymentMode">
              <option value="">Payment mode</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
            <input type="text" id="bookingDecorations" placeholder="Decorations / notes">
          </div>

          <div class="row">
            <button id="saveBookingBtn">Save Booking</button>
            <button id="clearBookingBtn">Clear</button>
          </div>
        </div>
      </div>

      <div class="booking-list-card">
        <div class="booking-list">
          <h3>Upcoming Bookings</h3>
          <div id="bookingList"></div>
        </div>
      </div>
    </div>
  `;

  // Defaults
  const today = getTodayLocal();
  document.getElementById("bookingDate").value = today;

  // Tables
  const tableSelect = document.getElementById("bookingTable");
  tableSelect.innerHTML = "<option value=''>Select table</option>";
  (APP_STORE.tableData || []).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tableSelect.appendChild(opt);
  });

  // Event types
  const eventSelect = document.getElementById("bookingEvent");
  eventSelect.innerHTML = "<option value=''>Event type</option>";
  (APP_STORE.eventTypes || []).forEach(type => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    eventSelect.appendChild(opt);
  });

  document.getElementById("saveBookingBtn").addEventListener("click", saveBooking);
  document.getElementById("clearBookingBtn").addEventListener("click", clearBookingForm);
}

// =======================
// Booking List
// =======================
function renderBookingList() {
  const list = document.getElementById("bookingList");
  if (!list) return;

  list.innerHTML = "";

  const bookings = (APP_STORE.bookingData || []).slice().sort((a,b) => (a.date||"") > (b.date||"") ? 1 : -1);

  if (!bookings.length) {
    list.innerHTML = "<p>No bookings found.</p>";
    return;
  }

  const today = getTodayLocal();

  bookings.forEach(b => {
    // show upcoming only
    if ((b.date || "") < today) return;

    const row = document.createElement("div");
    row.className = "booking-row";

    const left = document.createElement("div");
    left.innerHTML = `
      <strong>${escapeHtml(b.name || b.customerName || "-")}</strong><br>
      Table: ${escapeHtml(b.table || "-")}<br>
      Date: ${escapeHtml(b.date || "-")} ${escapeHtml(b.start || "")} - ${escapeHtml(b.end || "")}<br>
      Members: ${b.totalMembers || "-"}<br>
      Advance: ₹${b.advanceAmount || 0}
    `;

    const right = document.createElement("div");
    right.className = "booking-actions";

    const loadBtn = document.createElement("button");
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => loadBooking(b.billNo || b.id));

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteBooking(b.billNo || b.id));

    right.appendChild(loadBtn);
    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(right);

    list.appendChild(row);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}

function clearBookingForm() {
  document.getElementById("bookingFormTitle").innerText = "New Booking";
  ["bookingDate","bookingStart","bookingEnd","bookingCustomer","bookingHost","bookingPhone","bookingTable","bookingEvent","bookingMembers","bookingAdvance","bookingPaymentMode","bookingDecorations"].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') el.value = "";
  });
  // reset date to today
  document.getElementById("bookingDate").value = getTodayLocal();
}

function saveBooking(e) {
  if (e && e.preventDefault) e.preventDefault();

  const data = {
    mode: 'booking',
    bookingDate: document.getElementById("bookingDate").value,
    start: document.getElementById("bookingStart").value,
    end: document.getElementById("bookingEnd").value,
    customerName: document.getElementById("bookingCustomer").value,
    hostName: document.getElementById("bookingHost").value,
    phone: document.getElementById("bookingPhone").value,
    tableNo: document.getElementById("bookingTable").value,
    eventType: document.getElementById("bookingEvent").value,
    totalMembers: document.getElementById("bookingMembers").value,
    advanceAmount: document.getElementById("bookingAdvance").value,
    paymentMode: document.getElementById("bookingPaymentMode").value,
    decorations: document.getElementById("bookingDecorations").value
  };

  // basic validation
  if (!data.bookingDate || !data.customerName) {
    alert('Please provide date and customer name');
    return;
  }

  // build a form and submit to Apps Script (same pattern used elsewhere)
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = scriptURL;
  form.target = 'hiddenFrame';

  Object.keys(data).forEach(k => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = data[k] || '';
    form.appendChild(input);
  });

  // include token if available
  const token = sessionStorage.getItem('ms_token');
  if (token) {
    const t = document.createElement('input');
    t.type = 'hidden';
    t.name = 'token';
    t.value = token;
    form.appendChild(t);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();

  alert('Booking saved');

  setTimeout(() => {
    reloadData(() => {
      renderBookingList();
    });
  }, 800);
}

function loadBooking(billNo) {
  const booking = (APP_STORE.bookingData || []).find(b => (b.billNo || b.id) == billNo);
  if (!booking) return alert('Booking not found');

  document.getElementById("bookingFormTitle").innerText = "Edit Booking";
  document.getElementById("bookingDate").value = booking.date || booking.bookingDate || getTodayLocal();
  document.getElementById("bookingStart").value = booking.start || '';
  document.getElementById("bookingEnd").value = booking.end || '';
  document.getElementById("bookingCustomer").value = booking.name || booking.customerName || '';
  document.getElementById("bookingHost").value = booking.hostName || '';
  document.getElementById("bookingPhone").value = booking.phone || '';
  document.getElementById("bookingTable").value = booking.table || booking.tableNo || '';
  document.getElementById("bookingEvent").value = booking.eventType || '';
  document.getElementById("bookingMembers").value = booking.totalMembers || '';
  document.getElementById("bookingAdvance").value = booking.advanceAmount || '';
  document.getElementById("bookingPaymentMode").value = booking.paymentMode || '';
  document.getElementById("bookingDecorations").value = booking.decorations || booking.notes || '';
}

function deleteBooking(billNo) {
  if (!confirm('Delete this booking?')) return;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = scriptURL;
  form.target = 'hiddenFrame';

  const mode = document.createElement('input');
  mode.type = 'hidden';
  mode.name = 'mode';
  mode.value = 'deleteBooking';
  form.appendChild(mode);

  const id = document.createElement('input');
  id.type = 'hidden';
  id.name = 'billNo';
  id.value = billNo;
  form.appendChild(id);

  const token = sessionStorage.getItem('ms_token');
  if (token) {
    const t = document.createElement('input');
    t.type = 'hidden';
    t.name = 'token';
    t.value = token;
    form.appendChild(t);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();

  alert('Booking deleted');

  setTimeout(() => {
    reloadData(() => renderBookingList());
  }, 800);
}
