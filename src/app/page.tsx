import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Image
        src="/wclogoedit.png"
        alt="FIFA World Cup 2026"
        width={140}
        height={200}
        className={styles.logo}
        priority
      />
      <h1 className={styles.title}>
        <span className={styles.green}>WC26</span>{" "}
        <span className={styles.gold}>Sweepstake</span>
      </h1>
    </div>
  );
}
