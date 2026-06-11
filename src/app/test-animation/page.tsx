"use client";

import { useState, useEffect } from "react";
import { TeamDraw } from "@/components/TeamDraw";
import { WC26_TEAMS, Team } from "@/lib/teams";
import { Participant } from "@/lib/types";

const PARTICIPANT_COUNT = 19;

function pickRandom(teams: Team[]): Team {
  return teams[Math.floor(Math.random() * teams.length)];
}

function generateDummyParticipant(): Participant {
  const topTier = WC26_TEAMS.slice(0, PARTICIPANT_COUNT);
  const bottomTier = WC26_TEAMS.slice(PARTICIPANT_COUNT, PARTICIPANT_COUNT * 2);

  return {
    group: "test",
    phoneNumber: "+447000000000",
    name: "James",
    topTierTeam: pickRandom(topTier),
    bottomTierTeam: pickRandom(bottomTier),
    drawnAt: new Date().toISOString(),
  };
}

export default function TestAnimationPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setParticipant(generateDummyParticipant());
  }, []);

  function reset() {
    setParticipant(generateDummyParticipant());
    setKey((k) => k + 1);
  }

  if (!participant) return null;

  return (
    <div style={{ minHeight: "100vh", padding: "2rem" }}>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--wc-turquoise)",
            }}
          >
            Animation Test
          </h1>
          <button
            onClick={reset}
            style={{
              background: "var(--wc-purple)",
              color: "#fff",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Reset
          </button>
        </div>

        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <p>
            Bottom: {participant.bottomTierTeam.name} (#
            {participant.bottomTierTeam.fifaRanking})
          </p>
          <p>
            Top: {participant.topTierTeam.name} (#
            {participant.topTierTeam.fifaRanking})
          </p>
        </div>

        <TeamDraw
          key={key}
          participant={participant}
          groupSlug="test"
          participantCount={PARTICIPANT_COUNT}
        />
      </div>
    </div>
  );
}
