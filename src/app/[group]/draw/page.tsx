"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Participant } from "@/lib/types";
import { TeamReveal } from "@/components/TeamReveal";
import Link from "next/link";
import styles from "./page.module.css";

type DrawState =
  | { step: "enter" }
  | { step: "confirm" }
  | { step: "loading" }
  | { step: "reveal"; participant: Participant; takenTopTeams: string[]; takenBottomTeams: string[] }
  | { step: "already-drawn"; participant: Participant; takenTopTeams: string[]; takenBottomTeams: string[] }
  | { step: "error"; message: string }
  | { step: "fatal" };

export default function DrawPage() {
  const { group } = useParams<{ group: string }>();
  const [state, setState] = useState<DrawState>({ step: "enter" });
  const [name, setName] = useState("");
  const [names, setNames] = useState<{ name: string; drawn: boolean }[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/${group}/names`)
      .then((r) => {
        if (!r.ok) throw new Error(`Names API returned ${r.status}`);
        return r.json();
      })
      .then((data) => setNames(data.names ?? []))
      .catch((error) => {
        console.error("Failed to load names:", error);
        setState({ step: "fatal" });
      });
  }, [group]);

  const filtered = names.filter((entry) =>
    entry.name.toLowerCase().includes(name.toLowerCase())
  );

  function selectName(n: string) {
    setName(n);
    setOpen(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(highlightIndex + 1, filtered.length - 1);
      setHighlightIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(highlightIndex - 1, 0);
      setHighlightIndex(prev);
      listRef.current?.children[prev]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectName(filtered[highlightIndex].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entry = names.find((n) => n.name.toLowerCase() === name.trim().toLowerCase());
    if (!entry) return;
    setName(entry.name);
    if (entry.drawn) {
      handleConfirm();
    } else {
      setState({ step: "confirm" });
    }
  }

  async function handleConfirm() {
    setState({ step: "loading" });

    try {
      const res = await fetch(`/api/${group}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setState({ step: "already-drawn", participant: data.participant, takenTopTeams: data.takenTopTeams, takenBottomTeams: data.takenBottomTeams });
      } else if (!res.ok) {
        setState({ step: "error", message: data.error });
      } else {
        setState({ step: "reveal", participant: data.participant, takenTopTeams: data.takenTopTeams, takenBottomTeams: data.takenBottomTeams });
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
          <span className={styles.green}>Draw</span>{" "}
          <span className={styles.gold}>Your Teams</span>
        </h1>

        {state.step === "enter" && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.combobox}>
              <label htmlFor="name" className={styles.label}>
                Select your name
              </label>
              <input
                ref={inputRef}
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setOpen(true);
                  setHighlightIndex(-1);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={handleKeyDown}
                placeholder="Start typing your name..."
                className={styles.input}
                autoComplete="off"
                required
              />
              <ul ref={listRef} className={styles.listbox} role="listbox">
                  {name.trim() && filtered.length === 0 && (
                  <li className={styles.listboxMessage}>
                    No matching names found
                  </li>
                )}
                {filtered.map((entry, i) => (
                  <li
                    key={entry.name}
                    role="option"
                    aria-selected={i === highlightIndex}
                    className={`${styles.option} ${i === highlightIndex ? styles.optionHighlighted : ""} ${entry.drawn ? styles.optionDrawn : ""}`}
                    onMouseDown={() => selectName(entry.name)}
                  >
                    {entry.name}
                    {entry.drawn && (
                      <span className={styles.drawnBadge}>already drawn</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!names.some((n) => n.name.toLowerCase() === name.trim().toLowerCase())}
            >
              Next
            </button>
          </form>
        )}

        {state.step === "confirm" && (
          <div className={styles.confirm}>
            <h2 className={styles.confirmTitle}>
              Are you DEFINITELY{" "}
              <span className={styles.confirmName}>{name}</span>?
            </h2>
            <p className={styles.confirmBody}>
              Please don&apos;t draw for someone else and ruin the sweepstake :(
            </p>
            <div className={styles.confirmActions}>
              <button onClick={handleConfirm} className={styles.submitButton}>
                Yes, that&apos;s me!
              </button>
              <button
                onClick={() => setState({ step: "enter" })}
                className={styles.confirmBack}
              >
                Go back
              </button>
            </div>
          </div>
        )}

        {state.step === "loading" && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Drawing your teams...</p>
          </div>
        )}

        {state.step === "reveal" && (
          <TeamReveal participant={state.participant} isNew groupSlug={group} participantCount={names.length} takenTopTeams={state.takenTopTeams} takenBottomTeams={state.takenBottomTeams} />
        )}

        {state.step === "already-drawn" && (
          <TeamReveal
            participant={state.participant}
            isNew={false}
            groupSlug={group}
            participantCount={names.length}
            takenTopTeams={state.takenTopTeams}
            takenBottomTeams={state.takenBottomTeams}
          />
        )}

        {state.step === "fatal" && (
          <div className={styles.error}>
            <p className={styles.errorMessage}>
              Something went wrong loading this page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              Reload page
            </button>
          </div>
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
