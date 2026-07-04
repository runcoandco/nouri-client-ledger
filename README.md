# NOURI Client Ledger

Standalone Vercel app for client-facing statements.

Architecture:

`Vercel app -> Google Apps Script Web App -> Google Sheet`

The client opens a secure link with a 6-character access key:

`https://your-app.vercel.app/?key=ABC123`

The Vercel app sends that key to the Apps Script Web App. The Apps Script checks the key in the CRM sheet, finds the matching client, filters the inflows ledger, and returns JSON for the page.

## Scope

- Standalone app
- Separate from Task Manager
- Separate from Signal
- No client login
- No direct access to the master workbook

## Stack

- Next.js 15
- React 19
- Vercel
- Google Apps Script

## Spreadsheet

Spreadsheet ID:

`1t8c7RUHyMtBvBaY6E37TYcInSjgmKMAozhVlUimGmC8`

Tabs used:

- `20_CRM/CLIENTS`
- `40_AP/Inflows Ledger`

Headers used:

CRM:

- `Client_Name`
- `Access Key`

Inflows:

- `Client Name`
- `Invoice Date`
- `Invoice Department`
- `Amount`
- `Status`
- `Payment Date`
- `Description`

## Access Keys

Each client row in `20_CRM/CLIENTS` must have one key in:

`Access Key`

Current expected format:

- 6 characters
- uppercase alphanumeric

Example:

`ABC123`

After generating keys in Sheets, paste them as values only so they do not keep changing.

## Apps Script

Apps Script source file:

[`AppsScript-Code.gs`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/AppsScript-Code.gs)

What it does:

- receives `?key=...`
- validates the key
- finds the matching client in `20_CRM/CLIENTS`
- filters `40_AP/Inflows Ledger`
- returns:
  - `client`
  - `summary`
  - `items`

Example response:

[`statement-response.sample.json`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/statement-response.sample.json)

### Deploy Apps Script

1. Open the Apps Script project.
2. Replace the code with the contents of `AppsScript-Code.gs`.
3. Save.
4. Click `Deploy` -> `New deployment`.
5. Type: `Web app`
6. Execute as: `Me`
7. Who has access: `Anyone`
8. Deploy.
9. Copy the final Web App URL.

The final URL must look like:

`https://script.google.com/macros/s/.../exec`

Current deployed URL:

`https://script.google.com/macros/s/AKfycbzKb4m6bVBAwsEqvXePzfyMJuU3klCZtH7o4zTX9gWsWUuYbBatew2REd666nrooySW0g/exec`

## Environment Variable

This app needs one environment variable only:

```env
STATEMENTS_UPSTREAM_URL=https://script.google.com/macros/s/AKfycbzKb4m6bVBAwsEqvXePzfyMJuU3klCZtH7o4zTX9gWsWUuYbBatew2REd666nrooySW0g/exec
```

Example env file:

[`/.env.example`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/.env.example)

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local` with:

```env
STATEMENTS_UPSTREAM_URL=https://script.google.com/macros/s/AKfycbzKb4m6bVBAwsEqvXePzfyMJuU3klCZtH7o4zTX9gWsWUuYbBatew2REd666nrooySW0g/exec
```

Run locally:

```bash
npm run dev
```

Open:

`http://localhost:3000/?key=ABC123`

## Deploy to Vercel

1. Push this folder to its own GitHub repo.
2. Create a new Vercel project from that repo.
3. Add the environment variable:
   - `STATEMENTS_UPSTREAM_URL`
4. Deploy.

## Main Files

- [`app/page.tsx`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/app/page.tsx)
- [`app/globals.css`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/app/globals.css)
- [`lib/statements.ts`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/lib/statements.ts)
- [`AppsScript-Code.gs`](/Users/jaba23/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/Trabajo/ALDEA/Software%20Tools%20&%20Docs/Web%20Apps/NOURI-Client-Ledger/AppsScript-Code.gs)

## Notes

- Apps Script returns JSON, not HTML.
- The page treats any response with `error` as a failed lookup.
- Transport-level HTTP status is not relied on.
- Currency is formatted as EUR.
