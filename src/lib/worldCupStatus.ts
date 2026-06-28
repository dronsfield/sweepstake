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
  source: "wikipedia";
  sourcePage: string;
  fetchedAt: string;
  warnings: string[];
  teams: WorldCupTeamStatus[];
};

const SOURCE_PAGE = "2026_FIFA_World_Cup_knockout_stage";

const WIKI_TO_APP_NAME: Record<string, string> = {
  "United States": "USA",
  "DR Congo": "Congo DR",
};

function canonicaliseWikiTeamName(wikiName: string): string | null {
  const cleaned = wikiName
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const mapped = WIKI_TO_APP_NAME[cleaned] ?? cleaned;
  return WC26_TEAMS.some((t) => t.name === mapped) ? mapped : null;
}

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY = "world-cup-statuses";

export async function fetchWorldCupKnockoutHtml(): Promise<string> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "parse",
    page: SOURCE_PAGE,
    prop: "text",
    format: "json",
    formatversion: "2",
  }).toString();

  console.log("[worldCupStatus] Fetching knockout stage from Wikipedia");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "wc26-sweepstake/0.1 (personal project)",
    },
  });

  if (!res.ok) {
    throw new Error(`Wikipedia request failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    parse?: { text?: string };
    error?: { code: string; info: string };
  };

  if (json.error) {
    throw new Error(`Wikipedia error: ${json.error.code}: ${json.error.info}`);
  }

  if (!json.parse?.text) {
    throw new Error("Wikipedia response did not include parse.text");
  }

  return json.parse.text;
}

export function parseQualifiedTeams(html: string): Set<string> {
  const $ = cheerio.load(html);
  const teams = new Set<string>();

  const qualifiedHeading = $('[id="Qualified_teams"]');
  const section = qualifiedHeading
    .closest(".mw-heading")
    .nextUntil(".mw-heading")
    .filter("table");

  section
    .find('a[title*="football team"], a[title*="soccer team"]')
    .each((_, el) => {
      const candidate = canonicaliseWikiTeamName($(el).text());
      if (candidate) teams.add(candidate);
    });

  return teams;
}

export function parseKnockoutLosers(
  html: string,
  qualifiedTeams: Set<string>,
): Set<string> {
  const $ = cheerio.load(html);
  const losers = new Set<string>();

  const bracketHeading = $('[id="Bracket"]');
  const bracketTable = bracketHeading
    .closest(".mw-heading")
    .nextAll("table")
    .first();

  if (!bracketTable.length) return losers;

  const teamLinks = bracketTable.find(
    'a[title*="football team"], a[title*="soccer team"]',
  );

  const entries: { name: string; bold: boolean }[] = [];
  teamLinks.each((_, el) => {
    const $el = $(el);
    const name = canonicaliseWikiTeamName($el.text());
    if (!name || !qualifiedTeams.has(name)) return;
    const bold = $el.closest("b").length > 0;
    entries.push({ name, bold });
  });

  if (entries.length % 2 !== 0) {
    console.warn(
      `[worldCupStatus] Bracket has odd number of team entries (${entries.length}), skipping elimination parsing`,
    );
    return losers;
  }

  // Bracket entries come in pairs: [home, away] for each match
  for (let i = 0; i + 1 < entries.length; i += 2) {
    const home = entries[i];
    const away = entries[i + 1];

    // Same team appearing twice in a pair means the pairing is off
    if (home.name === away.name) {
      console.warn(
        `[worldCupStatus] Duplicate team in bracket pair: ${home.name}, skipping elimination parsing`,
      );
      return new Set<string>();
    }

    if (home.bold && !away.bold) {
      losers.add(away.name);
    } else if (away.bold && !home.bold) {
      losers.add(home.name);
    }
    // If neither is bold, match hasn't been played yet
    // If both are bold, something unexpected — skip
  }

  // A team can't be both a winner and a loser — if any overlap, bail out
  const winners = new Set(
    entries.filter((e) => e.bold).map((e) => e.name),
  );
  for (const loser of losers) {
    if (winners.has(loser)) {
      console.warn(
        `[worldCupStatus] ${loser} appears as both winner and loser, discarding all elimination data`,
      );
      return new Set<string>();
    }
  }

  return losers;
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

async function fetchAndParseStatuses(): Promise<WorldCupStatusResponse> {
  const warnings: string[] = [];

  let html: string;
  try {
    html = await fetchWorldCupKnockoutHtml();
  } catch (e) {
    return {
      source: "wikipedia",
      sourcePage: SOURCE_PAGE,
      fetchedAt: new Date().toISOString(),
      warnings: [
        `Failed to fetch Wikipedia page: ${e instanceof Error ? e.message : String(e)}`,
      ],
      teams: WC26_TEAMS.map(({ name }) => ({
        name,
        qualifiedForKnockouts: false,
        eliminatedInKnockouts: false,
        stillInTournament: true,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  const qualifiedTeams = parseQualifiedTeams(html);

  if (qualifiedTeams.size === 0) {
    warnings.push(
      "Found 0 qualified teams. The knockout stage may not have started yet.",
    );
    return {
      source: "wikipedia",
      sourcePage: SOURCE_PAGE,
      fetchedAt: new Date().toISOString(),
      warnings,
      teams: WC26_TEAMS.map(({ name }) => ({
        name,
        qualifiedForKnockouts: false,
        eliminatedInKnockouts: false,
        stillInTournament: true,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  if (qualifiedTeams.size !== 32) {
    warnings.push(
      `Expected 32 qualified teams, found ${qualifiedTeams.size}. Skipping knockout elimination parsing.`,
    );
    return {
      source: "wikipedia",
      sourcePage: SOURCE_PAGE,
      fetchedAt: new Date().toISOString(),
      warnings,
      teams: deriveWorldCupStatuses(qualifiedTeams, new Set()),
    };
  }

  const knockoutLosers = parseKnockoutLosers(html, qualifiedTeams);

  return {
    source: "wikipedia",
    sourcePage: SOURCE_PAGE,
    fetchedAt: new Date().toISOString(),
    warnings,
    teams: deriveWorldCupStatuses(qualifiedTeams, knockoutLosers),
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

  if (result.warnings.length === 0 || result.warnings.every((w) => !w.startsWith("Failed"))) {
    await db.collection("cache").updateOne(
      { key: CACHE_KEY },
      { $set: { data: result, fetchedAt: new Date() } },
      { upsert: true },
    );
  }

  return result;
}
