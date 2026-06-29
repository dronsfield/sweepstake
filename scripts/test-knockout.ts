import { config } from "dotenv";
config({ path: ".env.local" });

import {
  fetchFotmobPlayoff,
  parsePlayoffStatuses,
  deriveWorldCupStatuses,
} from "../src/lib/worldCupStatus";

async function main() {
  console.log("Fetching FotMob knockout data...\n");
  const playoff = await fetchFotmobPlayoff();

  for (const round of playoff.rounds) {
    console.log(`=== ${round.stage} (${round.matchups.length} matchups) ===`);
    for (const m of round.matchups) {
      const h = m.tbdTeam1 ? "TBD" : m.homeTeam;
      const a = m.tbdTeam2 ? "TBD" : m.awayTeam;
      const finished = m.matches[0]?.status?.finished;
      const winner =
        m.aggregatedWinner === m.homeTeamId
          ? m.homeTeam
          : m.aggregatedWinner === m.awayTeamId
            ? m.awayTeam
            : null;
      const loser =
        m.aggregatedLoser === m.homeTeamId
          ? m.homeTeam
          : m.aggregatedLoser === m.awayTeamId
            ? m.awayTeam
            : null;
      console.log(
        `  ${h} vs ${a}${finished ? ` => W:${winner} L:${loser}` : ""}`,
      );
    }
  }

  const { qualified, losers } = parsePlayoffStatuses(playoff);
  console.log(`\nQualified for knockouts (${qualified.size}):`);
  for (const t of [...qualified].sort()) console.log(`  ${t}`);

  console.log(`\nKnockout losers (${losers.size}):`);
  for (const t of [...losers].sort()) console.log(`  ${t}`);

  const statuses = deriveWorldCupStatuses(qualified, losers);
  const stillIn = statuses.filter((s) => s.stillInTournament);
  const eliminated = statuses.filter((s) => s.eliminatedInKnockouts);
  console.log(`\nStill in tournament (${stillIn.length}):`);
  for (const s of stillIn) console.log(`  ${s.name}`);
  console.log(`\nEliminated (${eliminated.length}):`);
  for (const s of eliminated) console.log(`  ${s.name}`);
}

main().catch(console.error);
