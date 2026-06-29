import * as cheerio from "cheerio";
import { getDb } from "./mongodb";
import { WC26_TEAMS } from "./teams";

export type WorldCupTeamStatus = {
  name: string;
  qualifiedForKnockouts: boolean;
  eliminatedInKnockouts: boolean;
  stillInTournament: boolean;
};

export type WorldCupStatusResponse = {
  source: "fotmob";
  fetchedAt: string;
  warnings: string[];
  teams: WorldCupTeamStatus[];
};

const FOTMOB_URL =
  "https://www.fotmob.com/en-GB/leagues/77/playoff/world-cup";

const FOTMOB_TO_APP_NAME: Record<string, string> = {
  "USA": "USA",
  "DR Congo": "Congo DR",
  "Ivory Coast": "Ivory Coast",
};

function canonicaliseFotmobName(fotmobName: string): string | null {
  const mapped = FOTMOB_TO_APP_NAME[fotmobName] ?? fotmobName;
  return WC26_TEAMS.some((t) => t.name === mapped) ? mapped : null;
}

type FotmobMatchup = {
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: string;
  awayTeam: string;
  tbdTeam1: boolean;
  tbdTeam2: boolean;
  aggregatedWinner: number | null;
  aggregatedLoser: number | null;
  matches: {
    status: { finished: boolean };
  }[];
};

type FotmobPlayoff = {
  rounds: {
    stage: string;
    matchups: FotmobMatchup[];
  }[];
};

export async function fetchFotmobPlayoff(): Promise<FotmobPlayoff> {
  console.log("[worldCupStatus] Fetching knockout data from FotMob");
  const res = await fetch(FOTMOB_URL, {
    headers: {
      "User-Agent": "wc26-sweepstake/0.1 (personal project)",
    },
  });

  if (!res.ok) {
    throw new Error(`FotMob request failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const nextDataScript = $("#__NEXT_DATA__").html();
  if (!nextDataScript) {
    throw new Error("Could not find __NEXT_DATA__ in FotMob response");
  }

  const nextData = JSON.parse(nextDataScript);
  const playoff = nextData?.props?.pageProps?.playoff as
    | FotmobPlayoff
    | undefined;
  if (!playoff?.rounds?.length) {
    throw new Error("No playoff rounds found in FotMob data");
  }

  return playoff;
}

export function parsePlayoffStatuses(
  playoff: FotmobPlayoff,
): { qualified: Set<string>; losers: Set<string> } {
  const qualified = new Set<string>();
  const losers = new Set<string>();

  for (const round of playoff.rounds) {
    for (const matchup of round.matchups) {
      // Collect all real (non-TBD) teams as qualified for knockouts
      if (!matchup.tbdTeam1) {
        const name = canonicaliseFotmobName(matchup.homeTeam);
        if (name) qualified.add(name);
      }
      if (!matchup.tbdTeam2) {
        const name = canonicaliseFotmobName(matchup.awayTeam);
        if (name) qualified.add(name);
      }

      // If match is finished, record the loser
      if (matchup.aggregatedLoser != null) {
        const loserName =
          matchup.aggregatedLoser === matchup.homeTeamId
            ? matchup.homeTeam
            : matchup.awayTeam;
        const name = canonicaliseFotmobName(loserName);
        if (name) losers.add(name);
      }
    }
  }

  return { qualified, losers };
}

export function deriveWorldCupStatuses(
  qualifiedTeams: Set<string>,
  knockoutLosers: Set<string>,
): WorldCupTeamStatus[] {
  return WC26_TEAMS.map(({ name }) => {
    const qualifiedForKnockouts = qualifiedTeams.has(name);
    const eliminatedInKnockouts = knockoutLosers.has(name);
    return {
      name,
      qualifiedForKnockouts,
      eliminatedInKnockouts,
      stillInTournament: qualifiedForKnockouts && !eliminatedInKnockouts,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY = "world-cup-statuses";

async function fetchAndParseStatuses(): Promise<WorldCupStatusResponse> {
  const warnings: string[] = [];

  let playoff: FotmobPlayoff;
  try {
    playoff = await fetchFotmobPlayoff();
  } catch (e) {
    return {
      source: "fotmob",
      fetchedAt: new Date().toISOString(),
      warnings: [
        `Failed to fetch FotMob data: ${e instanceof Error ? e.message : String(e)}`,
      ],
      teams: WC26_TEAMS.map(({ name }) => ({
        name,
        qualifiedForKnockouts: false,
        eliminatedInKnockouts: false,
        stillInTournament: true,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  const { qualified, losers } = parsePlayoffStatuses(playoff);

  if (qualified.size === 0) {
    warnings.push(
      "Found 0 qualified teams. The knockout stage may not have started yet.",
    );
  }

  return {
    source: "fotmob",
    fetchedAt: new Date().toISOString(),
    warnings,
    teams: deriveWorldCupStatuses(qualified, losers),
  };
}

export async function getWorldCupStatuses(): Promise<WorldCupStatusResponse> {
  const db = await getDb();
  const cached = await db.collection("cache").findOne({ key: CACHE_KEY });

  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_MAX_AGE_MS) return cached.data as WorldCupStatusResponse;
  }

  const result = await fetchAndParseStatuses();

  if (result.warnings.every((w) => !w.startsWith("Failed"))) {
    await db.collection("cache").updateOne(
      { key: CACHE_KEY },
      { $set: { data: result, fetchedAt: new Date() } },
      { upsert: true },
    );
  }

  return result;
}
