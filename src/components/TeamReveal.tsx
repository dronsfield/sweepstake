"use client";

import { useState, useEffect } from "react";
import { Participant } from "@/lib/types";
import { WC26_TEAMS, Team } from "@/lib/teams";
import { TeamBadge } from "./TeamBadge";
import Link from "next/link";
import styles from "./TeamReveal.module.css";

function SlotCard({
  team,
  label,
  delay,
}: {
  team: Team;
  label: string;
  delay: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [displayTeam, setDisplayTeam] = useState<Team>(
    WC26_TEAMS[Math.floor(Math.random() * WC26_TEAMS.length)]
  );

  useEffect(() => {
    const spinTimeout = setTimeout(() => {
      setSpinning(true);

      let count = 0;
      const maxSpins = 12;
      const interval = setInterval(() => {
        setDisplayTeam(
          WC26_TEAMS[Math.floor(Math.random() * WC26_TEAMS.length)]
        );
        count++;
        if (count >= maxSpins) {
          clearInterval(interval);
          setDisplayTeam(team);
          setSpinning(false);
          setRevealed(true);
        }
      }, 100);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(spinTimeout);
  }, [team, delay]);

  const cardClass = [
    styles.card,
    revealed ? styles.cardRevealed : spinning ? styles.cardSpinning : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <p className={styles.cardLabel}>{label}</p>
      <div className={cardClass}>
        <div className={styles.cardContent}>
          <span className={`fi fi-${displayTeam.code} ${styles.flag}`} />
          <div>
            <p className={styles.teamName}>{displayTeam.name}</p>
            <p className={styles.teamRanking}>
              FIFA Ranking: #{displayTeam.fifaRanking}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamReveal({
  participant,
  isNew,
  groupSlug,
}: {
  participant: Participant;
  isNew: boolean;
  groupSlug: string;
}) {
  return (
    <div className={styles.container}>
      <p className={styles.greeting}>
        {isNew ? (
          <>
            <span className={styles.playerName}>{participant.name}</span>, here
            are your teams!
          </>
        ) : (
          <>
            <span className={styles.playerName}>{participant.name}</span>,
            you&apos;ve already drawn:
          </>
        )}
      </p>

      {isNew ? (
        <div className={styles.cards}>
          <SlotCard
            team={participant.bottomTierTeam}
            label="Bottom Tier"
            delay={500}
          />
          <SlotCard
            team={participant.topTierTeam}
            label="Top Tier"
            delay={2500}
          />
        </div>
      ) : (
        <div className={styles.cards}>
          <div>
            <p className={styles.cardLabel}>Bottom Tier</p>
            <div className={`${styles.card} ${styles.cardStatic}`}>
              <TeamBadge team={participant.bottomTierTeam} />
            </div>
          </div>
          <div>
            <p className={styles.cardLabel}>Top Tier</p>
            <div className={`${styles.card} ${styles.cardStatic}`}>
              <TeamBadge team={participant.topTierTeam} />
            </div>
          </div>
        </div>
      )}

      <Link href={`/${groupSlug}`} className={styles.resultsLink}>
        View All Results
      </Link>
    </div>
  );
}
