"use client";

import { useRef, useState } from "react";
import { captureTable, buildShareFilename } from "@/lib/captureTable";
import { Participant } from "@/lib/types";
import { TeamBadge } from "./TeamBadge";
import styles from "./DrawResults.module.css";

export function DrawResults({
  participants,
  allNames,
  eliminatedTeams = [],
  groupName,
}: {
  participants: Participant[];
  allNames: string[];
  eliminatedTeams?: string[];
  groupName: string;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [copied, setCopied] = useState(false);

  const eliminated = new Set(eliminatedTeams);

  function bestAliveRanking(p: Participant): number | null {
    const topAlive = !eliminated.has(p.topTierTeam.name);
    const bottomAlive = !eliminated.has(p.bottomTierTeam.name);
    if (topAlive && bottomAlive)
      return Math.min(p.topTierTeam.fifaRanking, p.bottomTierTeam.fifaRanking);
    if (topAlive) return p.topTierTeam.fifaRanking;
    if (bottomAlive) return p.bottomTierTeam.fifaRanking;
    return null;
  }

  const sorted = [...participants].sort((a, b) => {
    const aRank = bestAliveRanking(a);
    const bRank = bestAliveRanking(b);
    if (aRank !== null && bRank === null) return -1;
    if (aRank === null && bRank !== null) return 1;
    if (aRank !== null && bRank !== null && aRank !== bRank) return aRank - bRank;
    const bestRank = (p: Participant) =>
      Math.min(p.topTierTeam.fifaRanking, p.bottomTierTeam.fifaRanking);
    const fallbackDiff = bestRank(a) - bestRank(b);
    if (fallbackDiff !== 0) return fallbackDiff;
    return a.name.localeCompare(b.name);
  });
  const drawnNames = new Set(participants.map((p) => p.name));
  const waitingNames = allNames
    .filter((name) => !drawnNames.has(name))
    .sort((a, b) => a.localeCompare(b));

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);
    setCopied(false);

    try {
      const blob = await captureTable(tableRef.current!);
      setCapturedBlob(blob);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setCapturing(false);
    }
  }

  async function handleShare() {
    if (!capturedBlob) return;

    try {
      const file = new File([capturedBlob], buildShareFilename(groupName), {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: window.location.href,
        });
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": capturedBlob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Share failed:", err);
    }
  }

  function handleDismiss() {
    setCapturedBlob(null);
    setCopied(false);
  }

  return (
    <>
      <div className={styles.tableWrap}>
        <table ref={tableRef} className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Top Tier</th>
              <th>Second Tier</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const bothOut =
                eliminated.has(p.topTierTeam.name) &&
                eliminated.has(p.bottomTierTeam.name);
              return (
                <tr key={p.name}>
                  <td
                    className={`${styles.name} ${bothOut ? styles.eliminated : ""}`}
                  >
                    {p.name}
                  </td>
                  <td>
                    <TeamBadge
                      team={p.topTierTeam}
                      eliminated={eliminated.has(p.topTierTeam.name)}
                    />
                  </td>
                  <td>
                    <TeamBadge
                      team={p.bottomTierTeam}
                      eliminated={eliminated.has(p.bottomTierTeam.name)}
                    />
                  </td>
                </tr>
              );
            })}
            {waitingNames.map((name) => (
              <tr key={name} className={styles.waitingRow}>
                <td className={styles.name}>{name}</td>
                <td>
                  <span className={styles.waiting}>Waiting...</span>
                </td>
                <td>
                  <span className={styles.waiting}>Waiting...</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {participants.length > 0 && (
        <div className={styles.shareRow}>
          {!capturedBlob ? (
            <button
              className={styles.shareButton}
              onClick={handleCapture}
              disabled={capturing}
            >
              {capturing ? "Capturing..." : "Share results"}
            </button>
          ) : (
            <>
              <button className={styles.shareButton} onClick={handleShare}>
                {copied ? "Copied to clipboard!" : "Tap to share"}
              </button>
              <button className={styles.dismissButton} onClick={handleDismiss}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
