import { Team } from "./teams";

export type Participant = {
  group: string;
  name: string;
  topTierTeam: Team;
  bottomTierTeam: Team;
  drawnAt: string;
};
