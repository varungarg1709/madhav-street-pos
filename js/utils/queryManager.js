/* ================= QUERY MANAGER ================= */

const QUERY_CONFIG = {
  orders: [
    "orders_from",
    "orders_to",
    "orders_customer",
    "orders_phone",
    "orders_status",
    "orders_pending"
  ],

  expenses: [
    "expenses_from",
    "expenses_to",
    "expenses_partner",
    "expenses_pending",
    "expenses_sort"
  ]
};

function getRouteParams(route) {
  const queryString =
    window.location.hash.split("?")[1] || "";

  const params = new URLSearchParams(queryString);

  const allowed = QUERY_CONFIG[route] || [];
  const result = {};

  allowed.forEach(key => {
    result[key] = params.get(key);
  });

  return result;
}

function setRouteParams(route, data) {
  const hash = window.location.hash.split("?")[0];
  const params = new URLSearchParams();

  const allowed = QUERY_CONFIG[route] || [];

  allowed.forEach(key => {
    const value = data[key];

    if (value !== "" && value != null) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const newHash = query ? `${hash}?${query}` : hash;

  window.history.replaceState(null, "", newHash);
}

// Ensure a safe fallback for `window.getTodayLocal` without creating
// a global function that could overwrite the utility's implementation.
if (typeof window.getTodayLocal !== "function") {
  window.getTodayLocal = function () {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split("T")[0];
  };
}