"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LoadingIndicator } from "./loading-indicator";

function formatRefreshTimestamp(value: Date) {
  return value.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RefreshControl({ loadedAt }: { loadedAt: string }) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLastRefresh(formatRefreshTimestamp(new Date(loadedAt)));
    setIsRefreshing(false);
  }, [loadedAt]);

  function handleRefresh() {
    setIsRefreshing(true);
    startTransition(() => router.refresh());
  }

  return (
    <div className="statement-header-actions">
      <button className="statement-badge statement-refresh-button" disabled={isRefreshing} onClick={handleRefresh} type="button">
        {isRefreshing ? "Refreshing" : "Refresh"}
      </button>
      <p className="statement-timestamp">{lastRefresh ? `Updated ${lastRefresh}` : ""}</p>
      {isRefreshing ? <LoadingIndicator message="Refreshing your statement" /> : null}
    </div>
  );
}
