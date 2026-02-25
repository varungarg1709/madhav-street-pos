const APP_PASSWORD = "madhav123";
const SECRET_TOKEN = "MS_SUPER_SECRET_2026";

function getAttendance() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("StaffAttendance");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var list = [];

  for (var i = 1; i < data.length; i++) {

    list.push({
      date: data[i][0],
      staff: data[i][1],
      checkIn: data[i][2],
      checkOut: data[i][3],
      status: data[i][4],
      notes: data[i][5]
    });

  }

  return list;
}



function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  function getSingleColumnData(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        list.push(data[i][0]);
      }
    }
    return list;
  }

  function getColumnData(sheetName, colIndex) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][colIndex]) {
        list.push(data[i][colIndex]);
      }
    }
    return list;
  }

  // ================= MENU =================
  var menuSheet = ss.getSheetByName("Menu");
  var menuData = menuSheet.getDataRange().getValues();
  var menu = [];

  for (var i = 1; i < menuData.length; i++) {
    menu.push({
      category: menuData[i][0],
      item: menuData[i][1],
      price: Number(menuData[i][2])
    });
  }

  // ================= BILLING =================
  var billingSheet = ss.getSheetByName("MadhavStreetBilling");
  var billingData = billingSheet.getDataRange().getValues();
  var headers = billingData[0];

  var billIndex = headers.indexOf("Bill No");
  var nameIndex = headers.indexOf("Customer Name");
  var phoneIndex = headers.indexOf("Phone");
  var tableIndex = headers.indexOf("Table No");
  var amountIndex = headers.indexOf("Amount");
  var discountIndex = headers.indexOf("Discount");
  var statusIndex = headers.indexOf("Payment Status");
  var modeIndex = headers.indexOf("Payment Mode");
  var receivedByIndex = headers.indexOf("Received By");
  var dateIndex = headers.indexOf("Date");
  var itemsIndex = headers.indexOf("Order Items");

  var orders = [];
  var tableStatus = {};
  var totalSales = 0;
  var totalBills = 0;
  var cashTotal = 0;
  var upiTotal = 0;

  var today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );

  for (var r = 1; r < billingData.length; r++) {
    var status = billingData[r][statusIndex];
    var amount = Number(billingData[r][amountIndex]) || 0;
    var table = billingData[r][tableIndex];
    var mode = billingData[r][modeIndex] || "";
    var dateCell = billingData[r][dateIndex];

    var billDate = Utilities.formatDate(
      new Date(dateCell),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    orders.push({
      billNo: billingData[r][billIndex],
      date: billDate,
      name: billingData[r][nameIndex],
      phone: billingData[r][phoneIndex],
      table: table,
      amount: amount,
      discount: billingData[r][discountIndex] || "",
      status: status,
      paymentMode: mode,
      receivedBy: billingData[r][receivedByIndex] || "",
      itemsJSON: billingData[r][itemsIndex] || ""
    });

    if (status === "Pending" || status === "Partial") {
      if (table) tableStatus[table] = "Running";
    }

    if (billDate === today && status === "Paid") {
      totalSales += amount;
      totalBills++;

      if (mode.includes("Cash")) cashTotal += amount;
      if (mode.includes("UPI")) upiTotal += amount;
    }
  }

  var avgBill = totalBills ? Math.round(totalSales / totalBills) : 0;

  // ================= EXPENSES =================
var expenseSheet = ss.getSheetByName("Expenses");
var expenses = [];

if (expenseSheet) {
  var expData = expenseSheet.getDataRange().getValues();

  for (var i = 1; i < expData.length; i++) {
    var row = expData[i];

    var rawDate = row[1];   // Column 2 = Expense Date
    var amount = row[3];    // Column 4 = Amount

    if (!amount) continue;

    var formattedDate = Utilities.formatDate(
      new Date(rawDate),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    expenses.push({
      date: formattedDate,
      category: row[2],
      amount: row[3],
      type: row[5],
      mode: row[8],
      vendor: row[9],
      comment: row[10],
      partner: row[6] || "Cash Counter"   // PaidBy column
    });
  }
}


  // ================= RESULT =================
  var result = {
    menu: menu,
    staff: getSingleColumnData("Staff"),
    tables: getSingleColumnData("Tables"),
    eventTypes: getSingleColumnData("EventTypes"),
    orderTypes: getSingleColumnData("OrderTypes"),
    orderSources: getSingleColumnData("OrderSources"),

    expenseCategories: getColumnData("Settings_Expenses", 0),
    payingAccounts: getColumnData("Settings_Expenses", 1),
    expenseTypes: getColumnData("Settings_Expenses", 2),
    paidByList: getColumnData("Settings_Expenses", 3),
    staffNames: getColumnData("Settings_Expenses", 4),
    expenseModes: getColumnData("Settings_Expenses", 5),
    vendors: getColumnData("Settings_Expenses", 6),

    bookings: [],
    orders: orders,
    expenses: expenses,
    tableStatus: tableStatus,
    attendance: getAttendance(),

    summary: {
      totalSales: totalSales,
      totalBills: totalBills,
      cash: cashTotal,
      upi: upiTotal,
      avgBill: avgBill
    }
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


function doPost(e) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  /* ================= LOGIN (JSON REQUEST) ================= */

  try {

    if (e.postData && e.postData.contents) {

      var data = JSON.parse(e.postData.contents);

      if (data.mode === "login") {

        if (data.password === APP_PASSWORD) {

          return ContentService
            .createTextOutput(JSON.stringify({
              success: true,
              token: SECRET_TOKEN
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService
          .createTextOutput(JSON.stringify({
            success:false
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

  } catch(err) {
    // ignore → normal form submit
  }

  // SECURITY CHECK (FOR FORM SUBMISSIONS)

if (
  e.parameter.apiKey !== "MadhavStreetSecret" ||
  e.parameter.token !== SECRET_TOKEN
) {
  return ContentService
    .createTextOutput("Unauthorized");
}


  /* ================= NORMAL FORM MODE ================= */

  var mode = e.parameter.mode || "order";

  // ===== EXPENSE =====
  if (mode === "expense") {

    var sheet = ss.getSheetByName("Expenses");

    sheet.appendRow([
      new Date(),
      e.parameter.expenseDate,
      e.parameter.category,
      e.parameter.amount,
      e.parameter.account,
      e.parameter.type,
      e.parameter.paidBy,
      e.parameter.staffName,
      e.parameter.expenseMode,
      e.parameter.vendor,
      e.parameter.comment
    ]);

    return ContentService.createTextOutput("Expense saved");
  }

  // ===== ATTENDANCE =====
if (mode === "attendance") {

  var sheet = ss.getSheetByName("StaffAttendance");

  sheet.appendRow([
    new Date(e.parameter.date),
    e.parameter.staff,
    e.parameter.checkIn,
    e.parameter.checkOut,
    e.parameter.status,
    e.parameter.notes
  ]);

  return ContentService.createTextOutput("attendance saved");
}


  // ===== BOOKING =====
  if (mode === "booking") {

    var sheet = ss.getSheetByName("MadhavStreetBilling");
    var headers = sheet.getRange(1,1,1,sheet.getLastColumn())
      .getValues()[0];

    var selectedDate =
      e.parameter.bookingDate ?
      new Date(e.parameter.bookingDate) :
      new Date();

    var bookingId = "BOOK-" + new Date().getTime();

    var rowData = {};
    rowData["Bill No"] = bookingId;
    rowData["Date"] = selectedDate;
    rowData["Customer Name"] = e.parameter.customerName || "";
    rowData["Phone"] = e.parameter.phone || "";
    rowData["Table No"] = e.parameter.tableNo || "";
    rowData["Order Type"] = "Booking";
    rowData["Order Source"] = "Advance Booking";
    rowData["Payment Status"] = "Partial";
    rowData["Event Type"] = e.parameter.eventType || "";
    rowData["Booking Status"] = "Booked";
    rowData["Advance Amount"] = e.parameter.advanceAmount || "";
    rowData["Total Members"] = e.parameter.totalMembers || "";

    var newRow =
      headers.map(h => rowData[h] || "");

    sheet.appendRow(newRow);

    return ContentService.createTextOutput("booking saved");
  }

  /* ===== ORDER MODE (YOUR EXISTING CODE BELOW — KEEP SAME) ===== */

  var sheet = ss.getSheetByName("MadhavStreetBilling");
  var headers = sheet
    .getRange(1,1,1,sheet.getLastColumn())
    .getValues()[0];

  var billNo = e.parameter.billNo || "";
  var selectedDate = e.parameter.orderDate
    ? new Date(e.parameter.orderDate)
    : new Date();

  var totalAmount =
    parseFloat(e.parameter.amount) || 0;

  var rowData = {};

  rowData["Bill No"] = billNo;
  rowData["Date"] = selectedDate;
  rowData["Customer Name"] = e.parameter.customerName || "";
  rowData["Phone"] = e.parameter.phone || "";
  rowData["Table No"] = e.parameter.tableNo || "";
  rowData["Order Type"] = e.parameter.orderType || "";
  rowData["Order Source"] = e.parameter.orderSource || "";
  rowData["Delivered By"] = e.parameter.deliveredBy || "";
  rowData["Order Items"] = e.parameter.orderItems || "";
  rowData["Amount"] = totalAmount;
  rowData["Discount"] = e.parameter.discount || "";
  rowData["Payment Mode"] = e.parameter.paymentMode || "";
  rowData["Payment Status"] = e.parameter.paymentStatus || "";
  rowData["Received By"] = e.parameter.receivedBy || "";
  rowData["Event Type"] = e.parameter.eventType || "";
  rowData["Total Members"] = e.parameter.totalMembers || "";
  rowData["Feedback"] = e.parameter.feedback || "";

  var newRow = headers.map(h => rowData[h] || "");

  // UPDATE EXISTING
  if (billNo) {

    var data =
      sheet.getRange(2,1,sheet.getLastRow()-1,1)
      .getValues();

    for (var i=0;i<data.length;i++) {

      if (data[i][0] == billNo) {

        sheet.getRange(i+2,1,1,newRow.length)
          .setValues([newRow]);

        return ContentService
          .createTextOutput("order updated");
      }
    }
  }

  // ===== CREATE NEW BILL =====

var tz = Session.getScriptTimeZone();
var year = selectedDate.getFullYear();
var month = selectedDate.getMonth() + 1;

var fyStart, fyEnd;

if (month >= 4) {
  fyStart = year.toString().slice(-2);
  fyEnd = (year + 1).toString().slice(-2);
} else {
  fyStart = (year - 1).toString().slice(-2);
  fyEnd = year.toString().slice(-2);
}

var financialYear = fyStart + "-" + fyEnd;
var datePart = Utilities.formatDate(selectedDate, tz, "ddMM");

var lastRow = sheet.getLastRow();
var maxSerial = 0;

if (lastRow > 1) {

  var data =
    sheet.getRange(2,1,lastRow-1,1).getValues();

  data.forEach(function(row){

    if (row[0]) {

      var bill = row[0].toString();

      if (bill.indexOf("/" + datePart + "/") !== -1) {

        var parts = bill.split("/");
        var serialNum = parseInt(parts[3]);

        if (serialNum > maxSerial)
          maxSerial = serialNum;
      }
    }
  });
}

var serial =
  ("000" + (maxSerial + 1)).slice(-3);

billNo =
  "MS/" + financialYear + "/" + datePart + "/" + serial;

rowData["Bill No"] = billNo;

newRow =
  headers.map(h => rowData[h] || "");

sheet.appendRow(newRow);

return ContentService
  .createTextOutput("order created");
}

function convertOldOrderItems() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var billingSheet = ss.getSheetByName("MadhavStreetBilling");
  var menuSheet = ss.getSheetByName("Menu");

  var billingData = billingSheet.getDataRange().getValues();
  var headers = billingData[0];
  var itemsIndex = headers.indexOf("Order Items");

  Logger.log("Items column index: " + itemsIndex);

  if (itemsIndex === -1) {
    Logger.log("Order Items column not found");
    return;
  }

  // Build menu price lookup
  var menuData = menuSheet.getDataRange().getValues();
  var priceMap = {};

  for (var i = 1; i < menuData.length; i++) {
    var itemName = menuData[i][1].toString().trim();
    var price = Number(menuData[i][2]);
    priceMap[itemName] = price;
  }

  var updatedRows = 0;

  for (var r = 1; r < billingData.length; r++) {
    var cell = billingData[r][itemsIndex];
    if (!cell) continue;

    var text = cell.toString().trim();

    // Skip if already JSON
    if (text.startsWith("{")) continue;

    Logger.log("Row " + (r+1) + " raw: " + text);

    var order = {};
    var parts = text.split(",");

    parts.forEach(function(part) {
      part = part.trim();

      var match = part.match(/(.+?)\s*x\s*(\d+)/i);

      if (match) {
        var name = match[1].trim();
        var qty = Number(match[2]);

        Logger.log("Found item: " + name + " qty: " + qty);

        var price = priceMap[name];

        if (price) {
          order[name] = {
            qty: qty,
            price: price
          };
        } else {
          Logger.log("Price not found for: " + name);
        }
      }
    });

    if (Object.keys(order).length > 0) {
      var json = JSON.stringify(order);
      billingSheet.getRange(r + 1, itemsIndex + 1).setValue(json);
      updatedRows++;
    }
  }

  Logger.log("Updated rows: " + updatedRows);
}


function debugBillingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("MadhavStreetBilling");

  if (!sheet) {
    Logger.log("Sheet not found!");
    return;
  }

  var data = sheet.getDataRange().getValues();

  Logger.log("Total rows: " + data.length);

  // Print headers
  Logger.log("Headers:");
  Logger.log(data[0]);

  // Print first 5 rows of Order Items column
  var headers = data[0];
  var itemsIndex = headers.indexOf("Order Items");

  Logger.log("Order Items column index: " + itemsIndex);

  for (var i = 1; i < Math.min(6, data.length); i++) {
    Logger.log("Row " + (i + 1) + ": " + data[i][itemsIndex]);
  }
}
