import { Team } from "@/lib/teams";
import styles from "./TeamBadge.module.css";

export function TeamBadge({
  team,
  eliminated,
}: {
  team: Team;
  eliminated?: boolean;
}) {
  return (
    <span className={styles.badge}>
      <span className={`fi fi-${team.code}`} style={eliminated ? { opacity: 0.5 } : undefined} />
      <span className={eliminated ? styles.eliminated : undefined}>{team.name}</span>
      <span className={styles.ranking}>#{team.fifaRanking}</span>
    </span>
  );
}
