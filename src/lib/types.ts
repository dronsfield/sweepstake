import { Team } from "./teams";

export type Participant = {
  group: string;
  phoneNumber: string;
  name: string;
  topTierTeam: Team;
  bottomTierTeam: Team;
  drawnAt: string;
};
