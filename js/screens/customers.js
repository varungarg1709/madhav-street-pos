let customersCache = []

async function initCustomers(){

    await loadCustomers()
  renderCustomers()

  renderCustomerStats()
    calculateCustomerTypes()
    calculateInactiveCustomers()
}

async function loadCustomers(){

  const url =
    CONFIG.scriptURL +
    "?mode=customers" +
    "&token=" + encodeURIComponent(getToken());

  const res = await fetch(url);

  const text = await res.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON:", text);

    if (text.includes("Unauthorized")) {
      alert("Session expired. Please login again.");

      localStorage.clear();
      sessionStorage.clear();

      location.reload();
      return;
    }

    throw err;
  }

  customersCache = data.customers || [];

}

function renderCustomerStats(){
  const list = customersCache
  if(!list.length) return
  const top = list[0]
  document.getElementById("topCustomerName").innerText = top.name + " (₹" + top.totalSpent + ")"
  document.getElementById("totalCustomers").innerText = list.length

  const totalSpent = list.reduce((s,c)=>s + c.totalSpent,0)
  const avg = Math.round(totalSpent / list.length)
  document.getElementById("avgSpend").innerText = "₹" + avg
    let vip = customersCache.filter(c => c.totalSpent >= 3000)
    document.getElementById("vipCustomers").innerText = vip.length
}

function renderCustomers(){

//   const search =
//     document.getElementById("customerSearch")
//       ?.value.toLowerCase() || ""

  let list = customersCache

//   if(search){
//     list = list.filter(c =>
//       (c.name || "").toLowerCase().includes(search) ||
//       (c.phone || "").includes(search)
//     )
//   }

  createTable({

container:"#customersTable",

data:list,

pageSize:10,

columns:[

{
field:"name",
label:"Name",
format:(v,r)=>`
<span class="customer-link"
onclick="openCustomerProfile('${r.phone}')">
${v}
</span>
`
},

{ field:"phone", label:"Phone" },

{ field:"visits", label:"Visits" },

{
field:"totalSpent",
label:"Spent",
format:v=>"₹"+v
},

{
field:"lastVisit",
label:"Last Visit",
format:v=>formatDateUI(v)
}

]

})

}

window.initCustomers = initCustomers

function calculateCustomerTypes(){

  const orders = APP_STORE.orderData || []

  const today = getTodayLocal()

  const seen = new Set()

  let newCustomers = 0
  let returning = 0

  orders.forEach(o=>{

    if(!o.phone) return

    const phone = String(o.phone || "").trim()

    if(o.date === today){

      if(!seen.has(phone)){
        newCustomers++
      }else{
        returning++
      }

    }

    seen.add(phone)

  })

  document.getElementById("newCustomers").innerText =
    newCustomers

  document.getElementById("returnCustomers").innerText =
    returning

}

function sendMarketingWhatsApp(){

  const msg =
    document.getElementById("marketingMessage").value.trim()

  if(!msg){
    alert("Enter marketing message")
    return
  }

  const selected = Array.from(
    document.querySelectorAll(".ms-row-check:checked")
  ).map(cb => cb.value)

  if(!selected.length){
    alert("Select customers first")
    return
  }

  const text = encodeURIComponent(msg)

  selected.forEach((p,i)=>{

    setTimeout(()=>{

      let phone = p.replace(/\D/g,"")

      if(phone.length===10)
        phone="91"+phone

      const url =
        `https://wa.me/${phone}?text=${text}`

      window.open(url,"_blank")

    }, i * 700)

  })

}

function calculateInactiveCustomers(){

  const today = new Date()

  let inactive = 0

  customersCache.forEach(c=>{

    const last = new Date(c.lastVisit)

    const diff =
      (today - last) / (1000*60*60*24)

    if(diff >= 30) inactive++

  })

  document.getElementById("inactiveCustomers")
    .innerText = inactive

}

function checkBirthdays(){

  const today = new Date()

  const month = today.getMonth()
  const day = today.getDate()

  let birthdays = []

  customersCache.forEach(c=>{

    if(!c.dob) return

    const d = new Date(c.dob)

    if(d.getMonth()===month && d.getDate()===day){
      birthdays.push(c)
    }

  })

  return birthdays

}

function openCustomerProfile(phone){

  const callbackName = "cb_" + Date.now();

  const url =
    CONFIG.scriptURL +
    "?mode=customerOrders" +
    "&phone=" + encodeURIComponent(phone) +
    "&token=" + encodeURIComponent(getToken()) +
    "&callback=" + callbackName;

  window[callbackName] = function(data){

    delete window[callbackName];

    renderCustomerOrdersUI(phone, data);

  };

  const script = document.createElement("script");
  script.src = url;

  document.body.appendChild(script);
}

function renderCustomerOrdersUI(phone, data){

  const orders = data.orders || []

  if(!orders.length){
    alert("No orders found for this customer")
    return
  }

  const name = orders[0].name || "Customer"

  document.getElementById("customerNameTitle").innerText = name

  document.getElementById("customerBadges").innerHTML =
    generateCustomerBadges(orders)

  let total = 0

  orders.forEach(o=>{
    total += Number(o.amount) || 0
  })

  document.getElementById("customerSummary").innerHTML = `
    Phone: ${phone}<br>
    Visits: ${orders.length}<br>
    Total Spend: ₹${total}
  `

  const favItems = getFavoriteItems(orders)

  let favHTML = "<b>Favorite Items</b><br>"

  if(!favItems.length){
    favHTML += "No data"
  }else{
    favItems.forEach(f=>{
      favHTML += `${f[0]} × ${f[1]}<br>`
    })
  }

  document.getElementById("customerFavorites").innerHTML = favHTML

  const tbody = document.getElementById("customerOrders")

  let html = ""

  orders.forEach((o, i)=>{
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDateUI(new Date(o.date))}</td>
        <td>₹${o.amount}</td>
        <td>${formatItems(o.itemsJSON)}</td>
      </tr>
    `
  })

  tbody.innerHTML = html

  document
    .getElementById("customerDrawer")
    .classList.add("open")
}



function closeCustomerDrawer(){
  document
    .getElementById("customerDrawer")
    .classList.remove("open")
}

function getFavoriteItems(orders){

  const items = {}

  orders.forEach(o=>{

    let parsed={}

    try{
      parsed = JSON.parse(o.itemsJSON || "{}")
    }catch{}

    Object.keys(parsed).forEach(item=>{

      items[item] =
        (items[item] || 0) + parsed[item].qty

    })

  })

  return Object.entries(items)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)

}

function normalizePhone(phone){

  return String(phone || "")
    .replace(/\D/g,"")
    .slice(-10)

}

function toggleSelectAllCustomers(){

  const checked =
    document.getElementById("selectAllCustomers").checked

  document
    .querySelectorAll("#customersTableBody .customer-checkbox")
    .forEach(cb => cb.checked = checked)

}

function formatItems(json){

  let parsed = {}

  try{
    parsed = JSON.parse(json || "{}")
  }catch{}

  return Object.keys(parsed)
    .map(i => `${i} × ${parsed[i].qty}`)
    .join("<br>")

}


function generateCustomerBadges(orders){

  if(!orders.length) return ""

  const visits = orders.length

  let total = 0
  let lastVisit = null

  orders.forEach(o=>{
    total += Number(o.amount) || 0

    const d = new Date(o.date)

    if(!lastVisit || d > lastVisit){
      lastVisit = d
    }
  })

  const today = new Date()

  const diffDays =
    (today - lastVisit) / (1000*60*60*24)

  let badges = []

  if(total >= 3000)
    badges.push(`<span class="badge vip">⭐ VIP</span>`)

  if(visits >= 5)
    badges.push(`<span class="badge frequent">🔥 Frequent</span>`)

  if(visits === 1)
    badges.push(`<span class="badge new">🆕 New</span>`)

  if(diffDays >= 30)
    badges.push(`<span class="badge inactive">⚠ Inactive</span>`)

  return badges.join("")
}