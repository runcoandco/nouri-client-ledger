# NOURIALITY Client Statements — Build Plan

## Goal

A standalone client-facing page showing what a client owes and has paid, without giving them access to the full Financials Master Workbook. Hosted on Vercel, backed by a Google Apps Script that reads directly from the Master Workbook.

## Architecture

```
Client browser
  -> statements.yourdomain.com/?key=482913   (Vercel static site)
       -> fetch() to Apps Script Web App URL, passing key
            -> Apps Script validates key against 20_CRM/CLIENTS
            -> Apps Script filters 40_AP/Inflows Ledger by Client Name
            -> returns JSON (summary + itemized rows)
       <- renders statement in the page
```

No new spreadsheet. No client login system. Access is gated by a per-client key stored in the CRM tab.

## Step 1: Add a key column to 20_CRM/CLIENTS

Add a column, e.g. `Access Key`, one per client row. Generate values with something like:

```
=TEXT(RANDBETWEEN(100000,999999),"000000")
```

Then copy and paste-as-values so the key doesn't change every time the sheet recalculates. Keep this column, since it is what the Apps Script will look up.

Rotating a client's key later is just editing that one cell.

## Step 2: Google Apps Script (bound to the Master Workbook)

Create a new Apps Script project (Extensions > Apps Script from within the Master Workbook, or a standalone script with the workbook opened by ID).

```javascript
function doGet(e) {
  var key = e.parameter.key;
  if (!key) {
    return jsonResponse({ error: "Missing key" }, 400);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName("20_CRMCLIENTS"); // adjust to actual tab name
  var ledgerSheet = ss.getSheetByName("40_APInflows Ledger");

  var clientName = lookupClientByKey(clientsSheet, key);
  if (!clientName) {
    return jsonResponse({ error: "Invalid key" }, 401);
  }

  var rows = getClientLedgerRows(ledgerSheet, clientName);
  var summary = summarize(rows);

  return jsonResponse({
    client: clientName,
    summary: summary,
    items: rows
  }, 200);
}

function lookupClientByKey(sheet, key) {
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var nameCol = header.indexOf("Client Name"); // adjust to actual header text
  var keyCol = header.indexOf("Access Key");
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyCol]) === String(key)) {
      return data[i][nameCol];
    }
  }
  return null;
}

function getClientLedgerRows(sheet, clientName) {
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var idx = {};
  header.forEach(function(h, i) { idx[h] = i; });

  var out = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[idx["Client Name"]] === clientName) {
      out.push({
        invoiceDate: row[idx["Invoice Date"]],
        department: row[idx["Invoice Department"]],
        amount: row[idx["Amount"]],
        status: row[idx["Status"]],
        paymentDate: row[idx["Payment Date"]],
        description: row[idx["Description"]]
        // deliberately excluded: Bank Account, Payment Reference #, Received by
      });
    }
  }
  return out;
}

function summarize(rows) {
  var paid = 0, pending = 0, scheduled = 0;
  rows.forEach(function(r) {
    if (r.status === "Paid") paid += r.amount;
    else if (r.status === "Pending") pending += r.amount;
    else if (r.status === "Scheduled") scheduled += r.amount;
  });
  return {
    totalPaid: paid,
    totalPending: pending,
    totalScheduled: scheduled,
    balanceDue: pending + scheduled
  };
}

function jsonResponse(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Notes:
- Adjust sheet/tab names and header strings to match the workbook exactly (they use slashes and spaces inconsistently, e.g. `40_APInflows Ledger` vs `40_AP/Inflows Ledger` in the UI label — check the actual tab name via `ss.getSheetName()` in a test run).
- `ContentService` can't set custom HTTP status codes in the response the browser sees (Apps Script Web Apps always return 200 at the transport level); the `error` field in the JSON body is what the front end should check.

### Deploy

Deploy > New deployment > Web app.
- Execute as: **Me**
- Who has access: **Anyone**

Copy the deployment URL — this is the endpoint the front end calls, e.g.:
`https://script.google.com/macros/s/XXXXXXXX/exec`

## Step 3: Front end (static site, deployed on Vercel)

Single `index.html`, no build step needed for v1.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NOURIALITY — Statement</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; color: #222; }
  h1 { font-size: 1.4rem; }
  .summary { display: flex; gap: 24px; margin: 24px 0; flex-wrap: wrap; }
  .summary div { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; }
  .summary .label { font-size: 0.8rem; color: #666; }
  .summary .value { font-size: 1.2rem; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; font-size: 0.9rem; }
  th { color: #666; font-weight: 500; }
  .status-Paid { color: #1a7f37; }
  .status-Pending, .status-Scheduled { color: #b45309; }
  .error { color: #b91c1c; padding: 24px; text-align: center; }
</style>
</head>
<body>
<div id="app">Loading...</div>

<script>
const API_URL = "https://script.google.com/macros/s/XXXXXXXX/exec"; // paste deployment URL

const params = new URLSearchParams(window.location.search);
const key = params.get("key");
const app = document.getElementById("app");

if (!key) {
  app.innerHTML = '<div class="error">No access key provided.</div>';
} else {
  fetch(`${API_URL}?key=${encodeURIComponent(key)}`)
    .then(r => r.json())
    .then(render)
    .catch(() => {
      app.innerHTML = '<div class="error">Could not load statement. Please try again later.</div>';
    });
}

function render(data) {
  if (data.error) {
    app.innerHTML = `<div class="error">${data.error}</div>`;
    return;
  }

  const s = data.summary;
  const fmt = n => n.toLocaleString(undefined, { style: "currency", currency: "EUR" });

  const rows = data.items.map(item => `
    <tr>
      <td>${formatDate(item.invoiceDate)}</td>
      <td>${item.department || ""}</td>
      <td>${item.description || ""}</td>
      <td class="status-${item.status}">${item.status}</td>
      <td>${fmt(item.amount)}</td>
    </tr>
  `).join("");

  app.innerHTML = `
    <h1>Statement for ${data.client}</h1>
    <div class="summary">
      <div><div class="label">Paid</div><div class="value">${fmt(s.totalPaid)}</div></div>
      <div><div class="label">Pending</div><div class="value">${fmt(s.totalPending)}</div></div>
      <div><div class="label">Scheduled</div><div class="value">${fmt(s.totalScheduled)}</div></div>
      <div><div class="label">Balance Due</div><div class="value">${fmt(s.balanceDue)}</div></div>
    </div>
    <table>
      <thead>
        <tr><th>Date</th><th>Department</th><th>Description</th><th>Status</th><th>Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString();
}
</script>
</body>
</html>
```

## Step 4: Deploy to Vercel

1. Put `index.html` in its own folder/repo.
2. `vercel deploy` (or connect the repo in the Vercel dashboard) — no build settings needed, static file.
3. Point a subdomain if desired, e.g. `statements.nouriality.com`.

## Step 5: Client links

For each client, send:
`https://statements.yourdomain.com/?key=482913`

## Known limitations / follow-ups (not built in v1)

- Google Apps Script has execution quotas (fine for occasional client checks, would need caching if this gets heavy traffic).
- No rate limiting on the key parameter — someone could brute-force 6-digit keys given enough time. Fine for informal use; move to longer random keys (e.g. UUID) if this becomes a concern.
- Header/tab name mismatches between the workbook's displayed names (with slashes) and actual sheet names need to be confirmed directly in Apps Script before this will run — check with `SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName())`.
- Currency formatting assumes EUR throughout, matching the workbook.
