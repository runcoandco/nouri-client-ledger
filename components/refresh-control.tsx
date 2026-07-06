"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function formatRefreshTimestamp(value: Date) {
  return value.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RefreshControl() {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(() => formatRefreshTimestamp(new Date()));
  const [isRefreshing, setIsRefreshing] = useState(false);

  function handleRefresh() {
    setIsRefreshing(true);
    setLastRefresh(formatRefreshTimestamp(new Date()));
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  }

  return (
    <div className="statement-header-actions">
      <button className="statement-badge statement-refresh-button" onClick={handleRefresh} type="button">
        {isRefreshing ? "Refreshing" : "Refresh"}
      </button>
      <p className="statement-timestamp">Updated {lastRefresh}</p>
    </div>
  );
}
