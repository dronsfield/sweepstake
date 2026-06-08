"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import Link from "next/link";

type GroupInfo = {
  slug: string;
  displayName: string;
  participantCount: number;
  drawnCount: number;
};

function adminHeaders(pin: string) {
  return { "x-admin-pin": pin };
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const loadGroups = useCallback(async (p: string) => {
    const res = await fetch("/api/admin/groups", {
      headers: adminHeaders(p),
    });
    if (res.status === 401) {
      setAuthed(false);
      setPinError(true);
      return;
    }
    const data = await res.json();
    setGroups(data.groups ?? []);
    setAuthed(true);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-pin");
    if (saved) {
      setPin(saved);
      loadGroups(saved);
    }
  }, [loadGroups]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError(false);
    sessionStorage.setItem("admin-pin", pin);
    await loadGroups(pin);
  }

  async function handleReset(slug: string) {
    setConfirming(null);
    setStatuses((s) => ({ ...s, [slug]: "Resetting..." }));

    try {
      const res = await fetch(`/api/${slug}/admin/reset`, {
        method: "POST",
        headers: adminHeaders(pin),
      });
      const data = await res.json();

      if (res.status === 401) {
        setAuthed(false);
        setPinError(true);
        return;
      }

      if (!res.ok) {
        setStatuses((s) => ({ ...s, [slug]: `Error: ${data.error}` }));
      } else {
        setStatuses((s) => ({
          ...s,
          [slug]: `Deleted ${data.deletedCount} draw(s).`,
        }));
        setGroups((gs) =>
          gs.map((g) => (g.slug === slug ? { ...g, drawnCount: 0 } : g))
        );
      }
    } catch {
      setStatuses((s) => ({ ...s, [slug]: "Something went wrong." }));
    }
  }

  if (!authed) {
    return (
      <div className={styles.container}>
        <div className={styles.inner}>
          <Link href="/" className={styles.backLink}>
            &larr; Home
          </Link>
          <h1 className={styles.title}>Admin</h1>
          <form onSubmit={handlePinSubmit} className={styles.pinForm}>
            <label htmlFor="pin" className={styles.pinLabel}>
              Enter PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={styles.pinInput}
              placeholder="••••"
              autoFocus
              required
            />
            {pinError && (
              <p className={styles.pinError}>Wrong PIN. Try again.</p>
            )}
            <button type="submit" className={styles.pinButton}>
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          &larr; Home
        </Link>

        <h1 className={styles.title}>Admin</h1>

        {groups.length === 0 && (
          <p className={styles.empty}>No groups configured.</p>
        )}

        {groups.map((group) => (
          <div key={group.slug} className={styles.groupCard}>
            <div className={styles.groupHeader}>
              <div>
                <h2 className={styles.groupName}>{group.displayName}</h2>
                <p className={styles.groupMeta}>
                  {group.drawnCount} / {group.participantCount} drawn
                </p>
              </div>
              <Link href={`/${group.slug}`} className={styles.viewLink}>
                View
              </Link>
            </div>

            {confirming === group.slug ? (
              <div className={styles.confirmBox}>
                <p className={styles.confirmText}>
                  Reset all draws for {group.displayName}?
                </p>
                <div className={styles.confirmActions}>
                  <button
                    onClick={() => handleReset(group.slug)}
                    className={styles.dangerButton}
                  >
                    Yes, delete all
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(group.slug)}
                className={styles.dangerButton}
              >
                Reset Draws
              </button>
            )}

            {statuses[group.slug] && (
              <p className={styles.status}>{statuses[group.slug]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
