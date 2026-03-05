/* ================= DATE UTILS ================= */

// Always returns local date (India safe)
function getTodayLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split("T")[0];
}

// Converts any date → YYYY-MM-DD safely
function toLocalDateString(date) {
  if (!date) return "";

  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

  return d.toISOString().split("T")[0];
}

// UI formatter (SAFE — no timezone shift)
function formatDateUI(dateStr) {
  if (!dateStr) return "-";

  const d = new Date(toLocalDateString(dateStr));

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* ================= EXPORT ================= */

window.getTodayLocal = getTodayLocal;
window.toLocalDateString = toLocalDateString;
window.formatDateUI = formatDateUI;

// Simple toast notification utility
window._toastQueue = [];
window._toastContainer = null;

function _ensureToastContainer(){
  if (window._toastContainer) return window._toastContainer;
  const c = document.createElement('div');
  c.className = 'toast-container';
  document.body.appendChild(c);
  window._toastContainer = c;
  return c;
}

function showToast(message, opts){
  opts = opts || {};
  const duration = typeof opts.duration === 'number' ? opts.duration : 3500;
  const type = opts.type || 'info';
  const container = _ensureToastContainer();

  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerText = message;
  container.appendChild(t);

  // trigger animation
  requestAnimationFrame(()=> t.classList.add('show'));

  const id = setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=>{ try{ container.removeChild(t); }catch(e){} }, 220);
  }, duration);

  return {
    dismiss: ()=>{ clearTimeout(id); t.classList.remove('show'); setTimeout(()=>{ try{ container.removeChild(t); }catch(e){} },220); }
  };
}

function hideAllToasts(){
  const c = window._toastContainer; if (!c) return;
  Array.from(c.children).forEach(ch=>{ ch.classList.remove('show'); setTimeout(()=>{ try{ c.removeChild(ch); }catch(e){} },220); });
}

window.showToast = showToast;
window.hideAllToasts = hideAllToasts;