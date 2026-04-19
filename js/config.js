// config.js (PRIVATE - DO NOT UPLOAD)

const CONFIG = {
  scriptURL: "https://script.google.com/macros/s/AKfycbzS-61t-5XEi8M3lpnp2GkOtoHTbbkuzRZ-5MOW0jLlORpjpbVE4VlZwV8F7u4R0lhz/exec",

  supabaseUrl: "https://nxxjqhaszlrtxcainlqo.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eGpxaGFzemxydHhjYWlubHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDI2ODgsImV4cCI6MjA4OTY3ODY4OH0.7Ci8E6aJWcLxQP63Z_lCDNemsEGpVklQVGvJnroOjpw",

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