import Image from "next/image";
import aldeaInline from "../assets/aldea-inline.png";
import { FRONTEND_UPDATED_AT } from "../lib/build-meta";
import { fetchStatement, formatCurrency, formatDate, normalizeAmount, normalizeKey } from "../lib/statements";

type PageProps = {
  searchParams: Promise<{
    key?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const key = normalizeKey(params.key);
  const data = key ? await fetchStatement(key) : null;
  const sortedItems = data?.items.length ? [...data.items].sort(sortNewestFirst) : [];
  const frontendUpdated = formatTimestamp(new Date(FRONTEND_UPDATED_AT));
  const totalValue = totalStatementValue(data?.summary);
  const balanceValue = balanceDelta(data?.summary);

  return (
    <main className="shell-screen">
      <section className="shell-panel">
        <div className="statement-topbar">
          <div>
            <Image
              alt="ALDEA"
              className="brand-logo"
              priority
              src={aldeaInline}
            />
            <p className="brand">Client finance</p>
            <h1>Statement</h1>
            <p className="statement-copy">
              {key
                ? "Live balance, payment status, and invoice history."
                : "Open your secure statement link to view your balance and payment history."}
            </p>
          </div>
          <div className="shell-meta shell-meta-single">
            <a aria-label="Sign out" className="signout-chip" href="/">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 21V3" />
              </svg>
            </a>
          </div>
        </div>

        {!key ? (
          <KeyEntry />
        ) : data?.error ? (
          <>
            <KeyEntry errorMessage={data.error} debugMessage={data.debug} />
          </>
        ) : (
          <>
            <section className="statement-header">
              <div>
                <p className="shell-kicker">Client</p>
                <h2>{data?.client}</h2>
              </div>
              <div className="statement-header-actions">
                <a className="statement-badge" href={`/?key=${key}`}>
                  Refresh
                </a>
                <p className="statement-timestamp">Updated {frontendUpdated}</p>
              </div>
            </section>

            <section className="summary-grid">
              <SummaryCard
                label="Total"
                value={formatCurrency(totalValue)}
                tone="total"
              />
              <SummaryCard label="Paid" value={formatCurrency(data?.summary.totalPaid ?? 0)} tone="paid" />
              <SummaryCard
                label="Scheduled"
                value={formatCurrency(data?.summary.totalScheduled ?? 0)}
                tone="scheduled"
              />
              <SummaryCard
                label="Balance due"
                value={formatCurrency(balanceValue)}
                tone={balanceValue < 0 ? "pending" : "due"}
              />
            </section>

            <section className="statement-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment date</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length ? (
                    sortedItems.map((item, index) => (
                      <tr key={`${item.invoiceDate}-${item.description}-${index}`}>
                        <td>{formatDate(item.invoiceDate)}</td>
                        <td>{item.department || "—"}</td>
                        <td>{item.description || "—"}</td>
                        <td>{formatCurrency(normalizeAmount(item.amount))}</td>
                        <td>
                          <span className={`status-chip status-${(item.status || "").toLowerCase()}`}>
                            {item.status || "Unknown"}
                          </span>
                        </td>
                        <td>{formatDate(item.paymentDate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        No ledger items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function sortNewestFirst(a: {
  invoiceDate?: string | number | null;
}, b: {
  invoiceDate?: string | number | null;
}) {
  return toSortTime(b.invoiceDate) - toSortTime(a.invoiceDate);
}

function toSortTime(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    const serialBase = new Date(Date.UTC(1899, 11, 30));
    return serialBase.getTime() + value * 24 * 60 * 60 * 1000;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatTimestamp(date: Date) {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "total" | "paid" | "pending" | "scheduled" | "due";
}) {
  return (
    <article className={`summary-card summary-card-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function totalStatementValue(summary?: {
  totalPaid: number;
  totalPending: number;
  totalScheduled: number;
}) {
  if (!summary) return 0;
  return summary.totalPaid + summary.totalPending + summary.totalScheduled;
}

function balanceDelta(summary?: {
  totalPaid: number;
  totalPending: number;
  totalScheduled: number;
}) {
  if (!summary) return 0;
  return summary.totalPaid - totalStatementValue(summary);
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="auth-error statement-error">
      <h2>Statement unavailable</h2>
      <p>{message}</p>
    </section>
  );
}

function KeyEntry({
  errorMessage,
  debugMessage,
}: {
  errorMessage?: string;
  debugMessage?: string;
}) {
  return (
    <>
      <section className="entry-panel">
        <div className="entry-copy">
          <p className="shell-kicker">Secure access</p>
          <h2>Enter your statement key</h2>
          <p>
            Use the 6-character key shared with you to open your client statement.
          </p>
        </div>

        <form className="entry-form" method="get">
          <label className="entry-label" htmlFor="key">
            Access key
          </label>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            className="entry-input"
            id="key"
            inputMode="text"
            maxLength={6}
            name="key"
            pattern="[A-Za-z0-9]{6}"
            placeholder="ABC123"
            required
          />
          <button className="entry-button" type="submit">
            Open statement
          </button>
        </form>
      </section>

      {errorMessage ? (
        <section className="auth-error statement-error">
          <h2>Statement unavailable</h2>
          <p>{errorMessage}</p>
          {debugMessage ? <code className="debug-copy">{debugMessage}</code> : null}
        </section>
      ) : null}
    </>
  );
}
