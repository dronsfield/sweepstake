"use client";

import { useState, useEffect, useMemo } from "react";
import { Team, getTopTierTeams, getBottomTierTeams } from "@/lib/teams";
import { FlagArena } from "@/components/FlagArena";
import { SpinWheel } from "@/components/SpinWheel";

const PARTICIPANT_COUNT = 20;

type AnimStyle = "arena" | "wheel";

function pickRandom(teams: Team[]): Team {
  return teams[Math.floor(Math.random() * teams.length)];
}

const STYLES: { key: AnimStyle; label: string }[] = [
  { key: "arena", label: "Flag Arena" },
  { key: "wheel", label: "Spin Wheel" },
];

export default function TestAnimationPage() {
  const [key, setKey] = useState(0);
  const [style, setStyle] = useState<AnimStyle>("wheel");
  const [tier, setTier] = useState<"top" | "bottom">("bottom");
  const [teamsLeft, setTeamsLeft] = useState(20);
  const [winner, setWinner] = useState<Team | null>(null);

  const allTeams = useMemo(
    () =>
      tier === "top"
        ? getTopTierTeams(PARTICIPANT_COUNT)
        : getBottomTierTeams(PARTICIPANT_COUNT),
    [tier]
  );

  const teams = useMemo(
    () => allTeams.slice(0, Math.max(2, Math.min(teamsLeft, allTeams.length))),
    [allTeams, teamsLeft]
  );

  function pickAndReset() {
    setWinner(pickRandom(teams));
    setKey((k) => k + 1);
  }

  useEffect(() => {
    setWinner(pickRandom(teams));
    setKey((k) => k + 1);
  }, [tier, teamsLeft]);

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
              color: "var(--green)",
            }}
          >
            Animation Test
          </h1>
          <button
            onClick={pickAndReset}
            style={{
              background: "var(--green)",
              color: "var(--text)",
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

        {/* Style picker */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {STYLES.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setStyle(s.key);
                setKey((k) => k + 1);
              }}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "2px solid",
                borderColor:
                  style === s.key
                    ? "var(--green)"
                    : "var(--border)",
                background:
                  style === s.key
                    ? "var(--green-muted)"
                    : "var(--surface)",
                color: style === s.key ? "var(--text)" : "var(--text-tertiary)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tier picker + teams left */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {(["bottom", "top"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              style={{
                flex: 1,
                padding: "0.4rem",
                borderRadius: "0.375rem",
                border: "1px solid",
                borderColor:
                  tier === t
                    ? t === "top" ? "var(--top-tier)" : "var(--bottom-tier)"
                    : "var(--border)",
                background:
                  tier === t
                    ? t === "top" ? "var(--top-tier-muted)" : "var(--bottom-tier-muted)"
                    : "transparent",
                color:
                  tier === t
                    ? t === "top" ? "var(--top-tier)" : "var(--bottom-tier)"
                    : "var(--text-tertiary)",
                fontWeight: 500,
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              {t === "top" ? "Top Tier" : "Bottom Tier"}
            </button>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <label
              style={{
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              Teams:
            </label>
            <input
              type="number"
              min={2}
              max={allTeams.length}
              value={teamsLeft}
              onChange={(e) => setTeamsLeft(Number(e.target.value))}
              style={{
                width: "3.5rem",
                padding: "0.3rem 0.4rem",
                borderRadius: "0.375rem",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: "0.75rem",
                textAlign: "center",
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--surface)",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
            color: "var(--text-tertiary)",
          }}
        >
          {winner && (
            <p>
              Winner: {winner.name} (#{winner.fifaRanking}) &middot;{" "}
              {teams.length} teams on wheel
            </p>
          )}
        </div>

        {/* Animation */}
        {winner && (
          <>
            {style === "arena" && (
              <FlagArena
                key={key}
                teams={teams}
                winner={winner}
                onRevealComplete={() => {}}
              />
            )}
            {style === "wheel" && (
              <SpinWheel
                key={key}
                teams={teams}
                winner={winner}
                onRevealComplete={() => {}}
                actionLabel={tier === "bottom" ? "Draw Top Tier" : "View Results"}
                tier={tier}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
