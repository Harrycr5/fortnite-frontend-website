
export interface PlayerStats {
  score: number;
  wins: number;
  kills: number;
  deaths: number;
  kd: number;
  matches: number;
  winRate: number;
  minutesPlayed: number;
  playersOutlived: number;
  scorePerMin: number;
  scorePerMatch: number;
  killsPerMin: number;
  killsPerMatch: number;
}

export interface BattlePass {
  level: number;
  progress: number;
}

export interface PlayerAccount {
  id: string;
  name: string;
}

export interface StatsData {
  account: PlayerAccount;
  battlePass: BattlePass;
  image: string | null;
  stats: {
    all: {
      overall: PlayerStats | null;
      solo: PlayerStats | null;
      duo: PlayerStats | null;
      trio: PlayerStats | null;
      squad: PlayerStats | null;
    };
  };
}

export interface StatsResponse {
  status: number;
  data: StatsData;
}
