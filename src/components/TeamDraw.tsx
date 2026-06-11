"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Participant } from "@/lib/types";
import { getTopTierTeams, getBottomTierTeams } from "@/lib/teams";
import { FlagArena } from "./FlagArena";
import { TeamBadge } from "./TeamBadge";
import Link from "next/link";

type Stage = "bottom" | "top" | "done";

export function TeamDraw({
  participant,
  groupSlug,
  participantCount,
}: {
  participant: Participant;
  groupSlug: string;
  participantCount: number;
}) {
  const [stage, setStage] = useState<Stage>("bottom");
  const topTierTeams = getTopTierTeams(participantCount);
  const bottomTierTeams = getBottomTierTeams(participantCount);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2rem",
        marginTop: "1.5rem",
      }}
    >
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: "1.125rem" }}
      >
        <span style={{ color: "var(--wc-gold)", fontWeight: 600 }}>
          {participant.name}
        </span>
        , let&apos;s draw your teams!
      </motion.p>

      <AnimatePresence mode="wait">
        {stage === "bottom" && (
          <motion.div
            key="bottom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Bottom Tier
            </p>
            <FlagArena
              teams={bottomTierTeams}
              winner={participant.bottomTierTeam}
              onRevealComplete={() => setStage("top")}
            />
          </motion.div>
        )}

        {stage === "top" && (
          <motion.div
            key="top"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Top Tier
            </p>
            <FlagArena
              teams={topTierTeams}
              winner={participant.topTierTeam}
              onRevealComplete={() => setStage("done")}
            />
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
            }}
          >
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
              Your teams:
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "2px solid var(--wc-gold)",
                  background: "rgba(245, 166, 35, 0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Bottom Tier
                </p>
                <TeamBadge team={participant.bottomTierTeam} />
              </div>
              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "2px solid var(--wc-gold)",
                  background: "rgba(245, 166, 35, 0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Top Tier
                </p>
                <TeamBadge team={participant.topTierTeam} />
              </div>
            </div>
            <Link
              href={`/${groupSlug}`}
              style={{
                marginTop: "0.5rem",
                background: "var(--wc-turquoise)",
                color: "#fff",
                fontWeight: 600,
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
              }}
            >
              View All Results
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
