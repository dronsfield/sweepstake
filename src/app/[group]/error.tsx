"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./error.module.css";

export default function GroupError({ reset }: { reset: () => void }) {
  const { group } = useParams<{ group: string }>();

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>
          We couldn&apos;t load this page. Please try again.
        </p>
        <div className={styles.actions}>
          <button onClick={reset} className={styles.retryButton}>
            Try again
          </button>
          <Link href={`/${group}`} className={styles.homeLink}>
            Back to group
          </Link>
        </div>
      </div>
    </div>
  );
}
