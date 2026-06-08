import { Team } from "@/lib/teams";
import styles from "./TeamBadge.module.css";

export function TeamBadge({ team }: { team: Team }) {
  return (
    <span className={styles.badge}>
      <span className={`fi fi-${team.code}`} />
      <span>{team.name}</span>
      <span className={styles.ranking}>#{team.fifaRanking}</span>
    </span>
  );
}
