export type StatementItem = {
  invoiceDate?: string | number | null;
  department?: string | null;
  description?: string | null;
  status?: string | null;
  amount?: number | string | null;
  paymentDate?: string | number | null;
};

export type StatementSummary = {
  totalPaid: number;
  totalPending: number;
  totalScheduled: number;
  balanceDue: number;
};

export type StatementPayload = {
  client: string;
  summary: StatementSummary;
  items: StatementItem[];
  error?: string;
  debug?: string;
};

const ALLOWED_KEY = /^[A-Za-z0-9]{6}$/;

export function normalizeKey(rawKey?: string | null) {
  if (!rawKey) return null;
  const key = rawKey.trim().toUpperCase();
  if (!ALLOWED_KEY.test(key)) return null;
  return key;
}

export async function fetchStatement(key: string): Promise<StatementPayload> {
  const upstream = process.env.STATEMENTS_UPSTREAM_URL;

  if (!upstream) {
    return emptyError("Missing server configuration.");
  }

  try {
    const url = new URL(upstream);
    url.searchParams.set("key", key);

    const response = await fetch(url.toString(), {
      next: { revalidate: 0 },
      cache: "no-store",
    });

    const raw = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return emptyError(`Upstream request failed (${response.status}).`, preview(raw));
    }

    if (!contentType.toLowerCase().includes("application/json")) {
      return emptyError("Upstream did not return JSON.", preview(raw));
    }

    const data = JSON.parse(raw) as Partial<StatementPayload>;

    if (data.error) {
      return emptyError(data.error, typeof data.debug === "string" ? data.debug : undefined);
    }

    return {
      client: data.client ?? "Client",
      summary: {
        totalPaid: toAmount(data.summary?.totalPaid),
        totalPending: toAmount(data.summary?.totalPending),
        totalScheduled: toAmount(data.summary?.totalScheduled),
        balanceDue: toAmount(data.summary?.balanceDue),
      },
      items: Array.isArray(data.items) ? data.items : [],
      debug: typeof data.debug === "string" ? data.debug : undefined,
    };
  } catch (error) {
    return emptyError(
      "Could not load statement right now.",
      error instanceof Error ? error.message : String(error)
    );
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function normalizeAmount(value: unknown) {
  return toAmount(value);
}

export function formatDate(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    const serialBase = new Date(Date.UTC(1899, 11, 30));
    const serialDate = new Date(serialBase.getTime() + value * 24 * 60 * 60 * 1000);
    return serialDate.toLocaleDateString("en-IE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function emptyError(message: string, debug?: string): StatementPayload {
  return {
    client: "",
    summary: {
      totalPaid: 0,
      totalPending: 0,
      totalScheduled: 0,
      balanceDue: 0,
    },
    items: [],
    error: message,
    debug,
  };
}

function preview(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
}

function toAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/,/g, ""));
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}
