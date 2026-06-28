"use client";

import { WC26_TEAMS } from "@/lib/teams";
import { Participant } from "@/lib/types";
import { TeamBadge } from "./TeamBadge";
import styles from "./AllTeams.module.css";

export function AllTeams({
  participants,
  participantCount,
  eliminatedTeams = [],
}: {
  participants: Participant[];
  participantCount: number;
  eliminatedTeams?: string[];
}) {
  const eliminated = new Set(eliminatedTeams);
  const topTeamOwners = new Map<string, string>();
  const bottomTeamOwners = new Map<string, string>();

  for (const p of participants) {
    topTeamOwners.set(p.topTierTeam.name, p.name);
    bottomTeamOwners.set(p.bottomTierTeam.name, p.name);
  }

  const topTier = WC26_TEAMS.slice(0, participantCount);
  const bottomTier = WC26_TEAMS.slice(participantCount, participantCount * 2);
  const unassigned = WC26_TEAMS.slice(participantCount * 2);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Team</th>
            <th>Drawn by</th>
          </tr>
        </thead>
        <tbody>
          <tr className={styles.dividerRow}>
            <td colSpan={2}>
              <span className={`${styles.dividerLabel} ${styles.potTop}`}>
                Top Tier ({topTier.length} teams)
              </span>
            </td>
          </tr>
          {topTier.map((team) => {
            const owner = topTeamOwners.get(team.name);
            const isEliminated = eliminated.has(team.name);
            return (
              <tr key={team.code}>
                <td>
                  <TeamBadge team={team} eliminated={isEliminated} />
                </td>
                <td>
                  {owner ? (
                    <span className={styles.drawnBy}>{owner}</span>
                  ) : (
                    <span className={styles.available}>Available</span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className={styles.dividerRow}>
            <td colSpan={2}>
              <span className={`${styles.dividerLabel} ${styles.potBottom}`}>
                Second Tier ({bottomTier.length} teams)
              </span>
            </td>
          </tr>
          {bottomTier.map((team) => {
            const owner = bottomTeamOwners.get(team.name);
            const isEliminated = eliminated.has(team.name);
            return (
              <tr key={team.code}>
                <td>
                  <TeamBadge team={team} eliminated={isEliminated} />
                </td>
                <td>
                  {owner ? (
                    <span className={styles.drawnBy}>{owner}</span>
                  ) : (
                    <span className={styles.available}>Available</span>
                  )}
                </td>
              </tr>
            );
          })}
          {unassigned.length > 0 && (
            <>
              <tr className={styles.dividerRow}>
                <td colSpan={2}>
                  <span className={`${styles.dividerLabel} ${styles.potNone}`}>
                    Not in draw ({unassigned.length} teams)
                  </span>
                </td>
              </tr>
              {unassigned.map((team) => (
                <tr key={team.code}>
                  <td>
                    <TeamBadge team={team} eliminated={eliminated.has(team.name)} />
                  </td>
                  <td>
                    <span className={styles.available}>—</span>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
