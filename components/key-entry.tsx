"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { LoadingIndicator } from "./loading-indicator";

export function KeyEntry({ errorMessage }: { errorMessage?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const key = String(formData.get("key") || "").trim().toUpperCase();
    startTransition(() => {
      if (new URLSearchParams(window.location.search).get("key")?.toUpperCase() === key) {
        router.refresh();
      } else {
        router.push(`/?key=${encodeURIComponent(key)}`);
      }
    });
  }

  return (
    <>
      <section className="entry-panel">
        <div className="entry-copy">
          <p className="shell-kicker">Secure access</p>
          <h2>Enter your statement key</h2>
          <p>Use the 6-character key shared with you to open your client statement.</p>
        </div>

        <form className="entry-form" method="get" onSubmit={handleSubmit}>
          <label className="entry-label" htmlFor="key">Access key</label>
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
          <button className="entry-button" disabled={isPending} type="submit">
            {isPending ? "Opening statement" : "Open statement"}
          </button>
        </form>
      </section>

      {errorMessage ? (
        <section className="auth-error statement-error" role="alert">
          <h2>Statement unavailable</h2>
          <p>{errorMessage}</p>
        </section>
      ) : null}
      {isPending ? <LoadingIndicator message="Opening your statement" /> : null}
    </>
  );
}
