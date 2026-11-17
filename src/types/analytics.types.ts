export interface Island {
  code: string
  title: string
  creator: string
  isEpic: boolean
  image: string | null
  genre: string
  tags: string[]
  players: number | null
  playersAt: string | null
  change24h: number | null
  peak24h: number | null
  peakAllTime: number | null
  plays: number | null
  uniquePlayers: number | null
  minutesPlayed: number | null
  minutesPerPlayer: number | null
  favorites: number | null
  recommendations: number | null
  retentionD1: number | null
  retentionD7: number | null
  estimatedDailyUSD: number | null
  estimateLow: number | null
  estimateHigh: number | null
  updatedAt: string | null
}

export type IslandSort = "players" | "plays" | "earnings" | "retention"
export type IslandScope = "all" | "epic" | "creators"
export interface IslandsResponse {
  islands: Island[]
  fetchedAt: string
  source: string
  sort: IslandSort
  sampleLimit: number
}

export interface CreatorCode {
  code: string
  account: { id: string; name: string }
  status: string
  verified: boolean
}

export interface CompetitivePlayer {
  rank: number
  name: string
  rating: number
  accountId?: string
}

export interface CompetitiveRanking {
  players: CompetitivePlayer[]
  fetchedAt: string
  source: string
  notice: string
}

export interface IslandMetricPoint { timestamp: string; value: number | null }
export interface IslandHistory {
  code: string
  fetchedAt: string
  peakCCU: IslandMetricPoint[]
  plays: IslandMetricPoint[]
  uniquePlayers: IslandMetricPoint[]
  minutesPlayed: IslandMetricPoint[]
}
