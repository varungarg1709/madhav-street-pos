// config.js (PRIVATE - DO NOT UPLOAD)

const CONFIG = {
  scriptURL: "https://script.google.com/macros/s/AKfycbzrgasorr-x53tES2tlK3xz21SrIMR0HAJmxBRORsbQRfYDaXBFgjmh8laG-94vaEm_/exec",

  apiKey: "MadhavStreetSecret",

  rolePermissions: {
   pos: ['admin','manager','chef','waiter','staff','co_owner'],
    bookings: ['admin','manager','co_owner'],
    orders: ['admin','manager','chef','waiter','co_owner'],
    expenses: ['admin','manager','co_owner'],
    inventory: ['admin','manager'],
    items: ['admin','manager','co_owner'],
    attendance: ['admin','manager','staff','co_owner'],
    finance: ['admin','manager','co_owner'],
    customers:["admin","manager","co_owner"],
    settings: ['admin'] 
  },
};