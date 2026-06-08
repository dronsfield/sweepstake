import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        <span className={styles.turquoise}>World Cup</span>{" "}
        <span className={styles.coral}>2026</span>
      </h1>
      <p className={styles.subtitle}>Sweepstake Draw</p>
    </div>
  );
}
