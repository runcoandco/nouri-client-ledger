import Image from "next/image";
import aldeaInline from "../assets/aldea-inline.png";
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
            <span>Ledger View</span>
          </div>
        </div>

        {!key ? (
          <EmptyState message="No valid access key was provided." />
        ) : data?.error ? (
          <EmptyState message={data.error} />
        ) : (
          <>
            <section className="statement-header">
              <div>
                <p className="shell-kicker">Client</p>
                <h2>{data?.client}</h2>
              </div>
              <span className="statement-badge">Live from master ledger</span>
            </section>

            <section className="summary-grid">
              <SummaryCard label="Paid" value={formatCurrency(data?.summary.totalPaid ?? 0)} tone="paid" />
              <SummaryCard
                label="Pending"
                value={formatCurrency(data?.summary.totalPending ?? 0)}
                tone="pending"
              />
              <SummaryCard
                label="Scheduled"
                value={formatCurrency(data?.summary.totalScheduled ?? 0)}
                tone="scheduled"
              />
              <SummaryCard
                label="Balance due"
                value={formatCurrency(data?.summary.balanceDue ?? 0)}
                tone="due"
              />
            </section>

            <section className="statement-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.length ? (
                    data.items.map((item, index) => (
                      <tr key={`${item.invoiceDate}-${item.description}-${index}`}>
                        <td>{formatDate(item.invoiceDate)}</td>
                        <td>{item.department || "—"}</td>
                        <td>{item.description || "—"}</td>
                        <td>
                          <span className={`status-chip status-${(item.status || "").toLowerCase()}`}>
                            {item.status || "Unknown"}
                          </span>
                        </td>
                        <td>{formatCurrency(normalizeAmount(item.amount))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-row">
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "paid" | "pending" | "scheduled" | "due";
}) {
  return (
    <article className={`summary-card summary-card-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="auth-error statement-error">
      <h2>Statement unavailable</h2>
      <p>{message}</p>
    </section>
  );
}
