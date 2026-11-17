export type TournamentStatus = "live" | "upcoming" | "ended"
export interface ScoringRule {
  stat: string
  condition: string
  tiers: { threshold: number; points: number; multiplicative: boolean }[]
}
export interface TournamentBoard {
  eventId: string
  windowId: string
  primary: boolean
  rules: ScoringRule[]
  payouts: { scoringType: string; ranks: { threshold: number; rewards: { type: string; value: string; quantity: number | null }[] }[] }[]
}
export interface TournamentSession {
  eventId: string
  windowId: string
  title: string
  description: string
  image: string | null
  regions: string[]
  platforms: string[]
  startsAt: string
  endsAt: string
  round: number | null
  matchCap: number | null
  minimumLevel: number | null
  systemRequirements: string[]
  requirements: (string | string[])[]
  allTokens: string[]
  anyTokens: string[]
  excludedTokens: string[]
  boards: TournamentBoard[]
}
export interface TournamentCatalog { sessions: TournamentSession[]; fetchedAt: string; region: string; unavailableRegions?: string[] }
export interface TournamentMatch {
  id: string
  endedAt: string | null
  eliminations: number | null
  placement: number | null
  aliveSeconds: number | null
}
export interface TournamentEntry {
  id: string
  rank: number | null
  points: number | null
  players: { id: string; name: string }[]
  matches: number | null
  wins: number | null
  eliminations: number | null
  matchHistory: TournamentMatch[]
}
export interface TournamentLeaderboard {
  page: number
  totalPages: number | null
  updatedAt: string | null
  fetchedAt: string
  entries: TournamentEntry[]
}
