export type Team = {
  name: string;
  code: string; // ISO 3166-1 alpha-2 for flag-icons
  fifaRanking: number;
};

// All 48 WC2026 participating nations with FIFA rankings
// Ordered by FIFA ranking (best to worst)
// Source: FIFA/Coca-Cola Men's World Ranking (inside.fifa.com, June 2026)
export const WC26_TEAMS: Team[] = [
  { name: "Argentina", code: "ar", fifaRanking: 1 },
  { name: "Spain", code: "es", fifaRanking: 2 },
  { name: "France", code: "fr", fifaRanking: 3 },
  { name: "England", code: "gb-eng", fifaRanking: 4 },
  { name: "Portugal", code: "pt", fifaRanking: 5 },
  { name: "Brazil", code: "br", fifaRanking: 6 },
  { name: "Morocco", code: "ma", fifaRanking: 7 },
  { name: "Netherlands", code: "nl", fifaRanking: 8 },
  { name: "Belgium", code: "be", fifaRanking: 9 },
  { name: "Germany", code: "de", fifaRanking: 10 },
  { name: "Croatia", code: "hr", fifaRanking: 11 },
  { name: "Colombia", code: "co", fifaRanking: 13 },
  { name: "Mexico", code: "mx", fifaRanking: 14 },
  { name: "Senegal", code: "sn", fifaRanking: 15 },
  { name: "Uruguay", code: "uy", fifaRanking: 16 },
  { name: "USA", code: "us", fifaRanking: 17 },
  { name: "Japan", code: "jp", fifaRanking: 18 },
  { name: "Switzerland", code: "ch", fifaRanking: 19 },
  { name: "Iran", code: "ir", fifaRanking: 20 },
  { name: "Türkiye", code: "tr", fifaRanking: 22 },
  { name: "Ecuador", code: "ec", fifaRanking: 23 },
  { name: "Austria", code: "at", fifaRanking: 24 },
  { name: "South Korea", code: "kr", fifaRanking: 25 },
  { name: "Australia", code: "au", fifaRanking: 27 },
  { name: "Algeria", code: "dz", fifaRanking: 28 },
  { name: "Egypt", code: "eg", fifaRanking: 29 },
  { name: "Canada", code: "ca", fifaRanking: 30 },
  { name: "Norway", code: "no", fifaRanking: 31 },
  { name: "Ivory Coast", code: "ci", fifaRanking: 33 },
  { name: "Panama", code: "pa", fifaRanking: 34 },
  { name: "Sweden", code: "se", fifaRanking: 38 },
  { name: "Czechia", code: "cz", fifaRanking: 39 },
  { name: "Paraguay", code: "py", fifaRanking: 40 },
  { name: "Scotland", code: "gb-sct", fifaRanking: 42 },
  { name: "Congo DR", code: "cd", fifaRanking: 45 },
  { name: "Tunisia", code: "tn", fifaRanking: 46 },
  { name: "Uzbekistan", code: "uz", fifaRanking: 50 },
  { name: "Iraq", code: "iq", fifaRanking: 56 },
  { name: "Qatar", code: "qa", fifaRanking: 57 },
  { name: "South Africa", code: "za", fifaRanking: 60 },
  { name: "Saudi Arabia", code: "sa", fifaRanking: 61 },
  { name: "Jordan", code: "jo", fifaRanking: 63 },
  { name: "Bosnia and Herzegovina", code: "ba", fifaRanking: 64 },
  { name: "Cape Verde", code: "cv", fifaRanking: 67 },
  { name: "Ghana", code: "gh", fifaRanking: 73 },
  { name: "Curaçao", code: "cw", fifaRanking: 82 },
  { name: "Haiti", code: "ht", fifaRanking: 83 },
  { name: "New Zealand", code: "nz", fifaRanking: 85 },
];

export function getTopTierTeams(participantCount: number): Team[] {
  return WC26_TEAMS.slice(0, participantCount);
}

export function getBottomTierTeams(participantCount: number): Team[] {
  return WC26_TEAMS.slice(participantCount, participantCount * 2);
}
