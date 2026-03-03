const screenHTMLCache = {};
let dataLoaded = false;

const scriptURL = CONFIG.scriptURL;

const screenLifecycle = {
  pos:false,
  bookings:false,
  orders:false,
  expenses:false,
  items:false,
  settings:false,
  attendance:false,
  inventory:false   // ✅ ADD THIS
};

const loadedAssets = {
  css:new Set(),
  js:new Set()
};

window.storeReady = loadInitialData();

/* ================= GLOBAL STORE ================= */

window.APP_STORE = {
  loaded:false
};

/* ================= SCREEN CONFIG ================= */

const screenAssets = {
  pos:{
    css:["css/pos.css"],
    js:["js/screens/pos.js"],
    init:"initPOS"
  },

  bookings:{
    css:["css/bookings.css"],
    js:["js/screens/bookings.js"],
    init:"initBookings"
  },

  orders:{
    css:["css/orders.css"],
    js:["js/screens/orders.js"],
    init:"initOrders"
  },

  expenses:{
    css:["css/expenses.css"],
    js:["js/screens/expenses.js"],
    init:"initExpenses"
  },

  items:{
    css:["css/items.css"],
    js:["js/screens/items.js"],
    init:"initItemsStats"
  },

  inventory:{
    css:["css/inventory.css"],
    js:["js/inventory.js"],   // since you're loading directly
    init:"initInventory"
  },

  settings:{
    css:["css/settings.css"],
    js:["js/screens/settings.js"],
    init:"initSettings"
  },

  attendance:{
    css:["css/attendance.css"],
    js:["js/screens/attendance.js"],
    init:"initAttendance"
  }  
};

/* ================= LOADERS ================= */

function loadCSS(file){
  if(loadedAssets.css.has(file)) return;

  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=file;
  document.head.appendChild(link);

  loadedAssets.css.add(file);
}

function loadJS(file){
  return new Promise(resolve=>{

    if(loadedAssets.js.has(file)){
      resolve();
      return;
    }

    const script=document.createElement("script");
    script.src=file;

    script.onload=()=>{
      loadedAssets.js.add(file);
      resolve();
    };

    document.body.appendChild(script);
  });
}

async function loadScreenHTML(screen) {

  const container =
    document.getElementById("screenContainer");

  // already exists → just show
  const existing =
    document.getElementById(screen + "Screen");

  if (existing) {
    document.querySelectorAll(".screen")
      .forEach(s => s.style.display = "none");

    existing.style.display = "block";
    return;
  }

  // fetch first time only
  const res = await fetch(`html/${screen}.html`);
  const html = await res.text();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  container.appendChild(wrapper.firstElementChild);

  // hide others
  document.querySelectorAll(".screen")
    .forEach(s => s.style.display = "none");

  document.getElementById(screen + "Screen")
    .style.display = "block";
}

/* ================= ROUTING ================= */

window.onload = async function(){

  setFormActions();

  const appLayout =
    document.querySelector(".app-layout");

  // LOGIN CHECK
  if (!isLoggedIn()) {

    appLayout.style.display = "none";

    loadCSS("css/skeleton.css");
    loadCSS("css/login.css");

    const res = await fetch("html/login.html");

    document.body.insertAdjacentHTML(
      "beforeend",
      await res.text()
    );

    return;
  }

  // user already logged in
  appLayout.style.display = "flex";

  startApp();
};

async function startApp() {
  updateFormTokens();

  await loadInitialData();
  setFormActions();

  // force default screen
  if (!location.hash) {
    navigateTo("pos");
  } else {
    handleRoute();
  }
}

// Apply role-based visibility for sidebar items
function applyRolePermissions(){
  const role = sessionStorage.getItem("ms_role") || localStorage.getItem("ms_role") || "guest";

  const perms = {
    pos: ['admin','manager','chef','waiter','staff'],
    bookings: ['admin','manager'],
    orders: ['admin','manager','chef','waiter'],
    expenses: ['admin','manager'],
    inventory: ['admin','manager'],  // ✅ ADD THIS
    items: ['admin','manager'],
    attendance: ['admin','manager','staff'],
    settings: ['admin']
  };

  Object.keys(perms).forEach(screen => {
    const allowed = perms[screen];
    const btn = document.getElementById('nav-' + screen);
    if (!btn) return;
    if (!allowed.includes(role)) btn.style.display = 'none';
    else btn.style.display = '';
  });
}

// run permissions after app starts and whenever reloadData completes
const originalStartApp = startApp;
startApp = async function(){
  await originalStartApp();
  applyRolePermissions();
};

function navigateTo(screen){
  location.hash="/"+screen;
}

function handleRoute(){

  // SINGLE LOGIN CHECK
  if(!isLoggedIn()) return;

  let hash = location.hash.replace("#/","");
  hash = hash.split("?")[0];

  if(!hash) hash="pos";

  showScreen(hash);
}

window.addEventListener("hashchange",handleRoute);

/* ================= MAIN SCREEN LOADER ================= */

async function showScreen(screen){
  if (!APP_STORE.loaded) {
    await loadInitialData();
  }

  const assets=screenAssets[screen];
  if(!assets) return;

  // load html first
  await loadScreenHTML(screen);
  // ensure forms inside screen get latest token
  updateFormTokens();
  setFormActions();

  // load css/js
  assets.css?.forEach(loadCSS);
  await Promise.all(assets.js?.map(loadJS)||[]);

  // nav active
  document.querySelectorAll(".sidebar-nav button")
    .forEach(btn=>btn.classList.remove("active"));

  document.getElementById("nav-"+screen)
    ?.classList.add("active");

  // init once
  if(!screenLifecycle[screen]){

    const fn=window[assets.init];

    if(typeof fn==="function"){
      fn();
    }

    screenLifecycle[screen]=true;
  }
  else{

    if(screen==="orders" && window.applyOrderFilters)
      applyOrderFilters();

    if(screen==="expenses" && window.applyExpenseFilters)
      applyExpenseFilters();

    if(screen==="items" && window.applyItemsFilters)
      applyItemsFilters();
  }
}

/* ================= DATA LOADING ================= */

async function loadInitialData(){
  try{

    const token = getAuthToken();

    const res = await fetch(
      `${scriptURL}?token=${token}&apiKey=MadhavStreetSecret`
    );
    const data=await res.json();

    Object.assign(APP_STORE,{
      menuData:data.menu||[],
      staffData:data.staffNames||[],
      tableData:data.tables||[],
      bookingData:data.bookings||[],
      eventTypes:data.eventTypes||[],
      orderTypes:data.orderTypes||[],
      orderSources:data.orderSources||[],

      orderData:data.orders||[],
      tableStatusData:data.tableStatus||{},
      summaryData:data.summary||{},

      expenseCategories:data.expenseCategories||[],
      payingAccounts:data.payingAccounts||[],
      expenseTypes:data.expenseTypes||[],
      paidByList:data.paidByList||[],
      expenseModes:data.expenseModes||[],
      vendors:data.vendors||[],
      expenseData:data.expenses||[],
      attendanceData: data.attendance || [],
      inventoryData: data.inventory || [],
    });

    APP_STORE.loaded=true;

  }catch(err){
    console.error("Data load error:",err);
  }
}

/* ================= RELOAD ================= */

function reloadData(callback){

  loadInitialData().then(()=>{

    if(window.applyOrderFilters) applyOrderFilters();
    if(window.applyExpenseFilters) applyExpenseFilters();

    if(callback) callback();
  });
}

/* ================= UI ================= */

function toggleSidebar(){
  const sidebar = document.getElementById("sidebar");

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle("mobile-open");
  } else {
    sidebar.classList.toggle("collapsed");
  }
}

function setFormActions() {

  const forms = [
    "hiddenForm",
    "bookingForm",
    "expenseForm",
    "attendanceForm"
  ];

  forms.forEach(id => {

    const form = document.getElementById(id);
    if (!form) return;

    form.action = CONFIG.scriptURL;

    // 🔥 ADD SECURITY FIELDS
    addHidden(form,"apiKey","MadhavStreetSecret");
    addHidden(form,"token", getAuthToken());
  });
}

function addHidden(form,name,value){

  let input = form.querySelector(`[name="${name}"]`);

  if(!input){
    input=document.createElement("input");
    input.type="hidden";
    input.name=name;
    form.appendChild(input);
  }

  input.value=value;
}

function renderAppVersion() {
  const el = document.getElementById("appVersion");
  if (el) {
    el.innerText = "Version " + APP_VERSION;
  }
}

function getAuthToken() {
  return (
    sessionStorage.getItem("ms_token") ||
    localStorage.getItem("ms_token") ||
    ""
  );
}

function showSkeleton(screen, html) {
  const el = document.getElementById(screen + "Screen");
  if (!el) return;

  el.innerHTML = html;
}

function hideSkeleton(screen) {
  // real screen init will overwrite automatically
}

function updateFormTokens(){

  const token =
    sessionStorage.getItem("ms_token") ||
    localStorage.getItem("ms_token") ||
    "";

  const forms = [
    "hiddenForm",
    "bookingForm",
    "expenseForm",
    "attendanceForm"
  ];

  forms.forEach(id => {
    const form = document.getElementById(id);
    if (!form) return;

    addHidden(form,"apiKey","MadhavStreetSecret");
    addHidden(form,"token",token);
  });
}