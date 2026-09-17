"use client";

import { useEffect, useState } from "react";

export function LoadingIndicator({ message }: { message: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="loading-backdrop" role="status" aria-live="polite">
      <div className="loading-dialog">
        <span className="loading-spinner" aria-hidden="true" />
        <p>{message}</p>
        <small>Checking the latest ledger data. {elapsed}s elapsed.</small>
      </div>
    </div>
  );
}
