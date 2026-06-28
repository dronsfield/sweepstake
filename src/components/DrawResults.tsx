"use client";

import { Participant } from "@/lib/types";
import { TeamBadge } from "./TeamBadge";
import styles from "./DrawResults.module.css";

export function DrawResults({
  participants,
  allNames,
  eliminatedTeams = [],
}: {
  participants: Participant[];
  allNames: string[];
  eliminatedTeams?: string[];
}) {
  const eliminated = new Set(eliminatedTeams);
  const sorted = [...participants].sort((a, b) => {
    const rankDiff = a.topTierTeam.fifaRanking - b.topTierTeam.fifaRanking;
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });
  const drawnNames = new Set(participants.map((p) => p.name));
  const waitingNames = allNames
    .filter((name) => !drawnNames.has(name))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
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
              <td className={`${styles.name} ${bothOut ? styles.eliminated : ""}`}>{p.name}</td>
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
  );
}
