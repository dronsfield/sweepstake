"use client";

import { useState } from "react";
import { Participant } from "@/lib/types";
import { getTopTierTeams, getBottomTierTeams } from "@/lib/teams";
import { SpinWheel } from "./SpinWheel";
import { TeamBadge } from "./TeamBadge";
import Link from "next/link";
import styles from "./TeamReveal.module.css";

type RevealStep = "spin-bottom" | "spin-top" | "done";

export function TeamReveal({
  participant,
  isNew,
  groupSlug,
  participantCount,
}: {
  participant: Participant;
  isNew: boolean;
  groupSlug: string;
  participantCount: number;
}) {
  const [step, setStep] = useState<RevealStep>("spin-bottom");

  const topTeams = getTopTierTeams(participantCount);
  const bottomTeams = getBottomTierTeams(participantCount);

  return (
    <div className={styles.container}>
      <p className={styles.greeting}>
        {isNew ? (
          <>
            <span className={styles.playerName}>{participant.name}</span>, spin
            to reveal your teams!
          </>
        ) : (
          <>
            <span className={styles.playerName}>{participant.name}</span>,
            you&apos;ve already drawn:
          </>
        )}
      </p>

      {isNew ? (
        <>
          {step === "spin-bottom" && (
            <div className={styles.wheelSection}>
              <p className={`${styles.tierLabel} ${styles.tierLabelBottom}`}>Bottom Tier</p>
              <SpinWheel
                teams={bottomTeams}
                winner={participant.bottomTierTeam}
                onRevealComplete={() => setStep("spin-top")}
                actionLabel="Draw Top Tier"
                tier="bottom"
              />
            </div>
          )}
          {step === "spin-top" && (
            <div className={styles.wheelSection}>
              <p className={`${styles.tierLabel} ${styles.tierLabelTop}`}>Top Tier</p>
              <SpinWheel
                teams={topTeams}
                winner={participant.topTierTeam}
                onRevealComplete={() => setStep("done")}
                actionLabel="View Results"
                tier="top"
              />
            </div>
          )}
          {step === "done" && (
            <div className={styles.cards}>
              <div>
                <p className={`${styles.cardLabel} ${styles.cardLabelBottom}`}>Bottom Tier</p>
                <div className={`${styles.card} ${styles.cardBottomTier}`}>
                  <TeamBadge team={participant.bottomTierTeam} />
                </div>
              </div>
              <div>
                <p className={`${styles.cardLabel} ${styles.cardLabelTop}`}>Top Tier</p>
                <div className={`${styles.card} ${styles.cardTopTier}`}>
                  <TeamBadge team={participant.topTierTeam} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.cards}>
          <div>
            <p className={`${styles.cardLabel} ${styles.cardLabelBottom}`}>Bottom Tier</p>
            <div className={`${styles.card} ${styles.cardBottomTier}`}>
              <TeamBadge team={participant.bottomTierTeam} />
            </div>
          </div>
          <div>
            <p className={`${styles.cardLabel} ${styles.cardLabelTop}`}>Top Tier</p>
            <div className={`${styles.card} ${styles.cardTopTier}`}>
              <TeamBadge team={participant.topTierTeam} />
            </div>
          </div>
        </div>
      )}

      {(step === "done" || !isNew) && (
        <Link href={`/${groupSlug}`} className={styles.resultsLink}>
          View All Results
        </Link>
      )}
    </div>
  );
}
