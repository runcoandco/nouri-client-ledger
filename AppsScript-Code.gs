/**
 * NOURIALITY Client Statements Web App
 * Version: 1.0.0
 * Updated: 2026-07-03
 * Owner: ALDEA / NOURIALITY
 * Objective:
 * Serve client statement data from the Financials Master Workbook without exposing
 * the workbook itself. The web app validates a client access key from 20_CRM/CLIENTS,
 * filters 40_AP/Inflows Ledger for that client, and returns JSON for the Vercel app.
 * Architecture:
 * Vercel app -> Apps Script Web App -> Google Sheet
 * Notes:
 * - Access is controlled by the "Access Key" column in 20_CRM/CLIENTS
 * - Client matching uses CRM "Client_Name" against Inflows "Client Name"
 * - Response shape: { client, summary, items } or { error }
 */
function doGet(e) {
  var key = normalizeKey_(e && e.parameter ? e.parameter.key : "");
  if (!key) {
    return jsonResponse_({ error: "Missing or invalid key." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName("20_CRM/CLIENTS");
  var inflowsSheet = ss.getSheetByName("40_AP/Inflows Ledger");

  if (!clientsSheet || !inflowsSheet) {
    return jsonResponse_({ error: "Sheet configuration error." });
  }

  var client = findClientByKey_(clientsSheet, key);
  if (!client) {
    return jsonResponse_({ error: "Invalid access key." });
  }

  var items = getClientInflows_(inflowsSheet, client.clientName);
  var summary = summarize_(items);

  return jsonResponse_({
    client: client.clientName,
    summary: summary,
    items: items
  });
}

function normalizeKey_(value) {
  var key = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(key) ? key : "";
}

function findClientByKey_(sheet, key) {
  var data = sheet.getDataRange().getValues();
  if (!data.length) return null;

  var header = data[0];
  var indexes = indexHeaders_(header);
  var clientNameIndex = indexes["Client_Name"];
  var keyIndex = indexes["Access Key"];

  if (clientNameIndex === undefined || keyIndex === undefined) {
    return null;
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowKey = normalizeKey_(row[keyIndex]);
    if (rowKey && rowKey === key) {
      return {
        clientName: String(row[clientNameIndex] || "").trim()
      };
    }
  }

  return null;
}

function getClientInflows_(sheet, clientName) {
  var data = sheet.getDataRange().getValues();
  if (!data.length) return [];

  var header = data[0];
  var indexes = indexHeaders_(header);
  var clientNameIndex = indexes["Client Name"];

  if (clientNameIndex === undefined) {
    return [];
  }

  var out = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (normalizeText_(row[clientNameIndex]) !== normalizeText_(clientName)) continue;

    out.push({
      invoiceDate: valueAt_(row, indexes, "Invoice Date"),
      department: stringAt_(row, indexes, "Invoice Department"),
      description: stringAt_(row, indexes, "Description"),
      status: stringAt_(row, indexes, "Status"),
      amount: numberAt_(row, indexes, "Amount"),
      paymentDate: valueAt_(row, indexes, "Payment Date")
    });
  }

  return out;
}

function summarize_(items) {
  var totalPaid = 0;
  var totalPending = 0;
  var totalScheduled = 0;

  items.forEach(function(item) {
    var amount = Number(item.amount || 0);
    var status = String(item.status || "").trim().toLowerCase();

    if (status === "paid") totalPaid += amount;
    else if (status === "scheduled") totalScheduled += amount;
    else totalPending += amount;
  });

  return {
    totalPaid: totalPaid,
    totalPending: totalPending,
    totalScheduled: totalScheduled,
    balanceDue: totalPending + totalScheduled
  };
}

function indexHeaders_(headerRow) {
  var out = {};
  for (var i = 0; i < headerRow.length; i++) {
    out[String(headerRow[i]).trim()] = i;
  }
  return out;
}

function valueAt_(row, indexes, header) {
  var index = indexes[header];
  return index === undefined ? null : row[index];
}

function stringAt_(row, indexes, header) {
  var value = valueAt_(row, indexes, header);
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberAt_(row, indexes, header) {
  var value = valueAt_(row, indexes, header);
  var amount = Number(value);
  return isNaN(amount) ? 0 : amount;
}

function normalizeText_(value) {
  return String(value || "").trim().toLowerCase();
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
