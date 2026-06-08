"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Participant } from "@/lib/types";
import { TeamReveal } from "@/components/TeamReveal";
import Link from "next/link";
import styles from "./page.module.css";

type DrawState =
  | { step: "enter" }
  | { step: "loading" }
  | { step: "reveal"; participant: Participant }
  | { step: "already-drawn"; participant: Participant }
  | { step: "error"; message: string };

export default function DrawPage() {
  const { group } = useParams<{ group: string }>();
  const [state, setState] = useState<DrawState>({ step: "enter" });
  const [phoneNumber, setPhoneNumber] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ step: "loading" });

    try {
      const res = await fetch(`/api/${group}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setState({ step: "already-drawn", participant: data.participant });
      } else if (!res.ok) {
        setState({ step: "error", message: data.error });
      } else {
        setState({ step: "reveal", participant: data.participant });
      }
    } catch {
      setState({ step: "error", message: "Something went wrong. Try again." });
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href={`/${group}`} className={styles.backLink}>
          &larr; Back to results
        </Link>

        <h1 className={styles.title}>
          <span className={styles.turquoise}>Draw</span>{" "}
          <span className={styles.coral}>Your Teams</span>
        </h1>

        {state.step === "enter" && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label htmlFor="phone" className={styles.label}>
                Enter your phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+44 7000 000000"
                className={styles.input}
                required
              />
            </div>
            <button type="submit" className={styles.submitButton}>
              Draw My Teams
            </button>
          </form>
        )}

        {state.step === "loading" && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Drawing your teams...</p>
          </div>
        )}

        {state.step === "reveal" && (
          <TeamReveal participant={state.participant} isNew groupSlug={group} />
        )}

        {state.step === "already-drawn" && (
          <TeamReveal
            participant={state.participant}
            isNew={false}
            groupSlug={group}
          />
        )}

        {state.step === "error" && (
          <div className={styles.error}>
            <p className={styles.errorMessage}>{state.message}</p>
            <button
              onClick={() => setState({ step: "enter" })}
              className={styles.retryButton}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
