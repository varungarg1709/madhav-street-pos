// config.js (PRIVATE - DO NOT UPLOAD)

const CONFIG = {
  scriptURL: "https://script.google.com/macros/s/AKfycby02sF7AV4eihYYZI5QDdMiTblYwx0K4M7Wjh1Xikhm1exUs-VmmRK9YPu8atzoxeUL/exec",

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
    settings: ['admin'] 
  },
};