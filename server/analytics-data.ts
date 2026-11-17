import type { Island, IslandMetricPoint } from "../src/types/analytics.types.ts"

export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
export const numeric = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null
export const text = (value: unknown): string => typeof value === "string" ? value : ""
export const validIslandCode = (code: string) => /^(?:\d{4}-\d{4}-\d{4}|(?:experience|playlist|set)_[a-zA-Z0-9_-]{1,90})$/.test(code)
const httpsUrl = (value: unknown) => {
  try { const url = new URL(text(value)); return url.protocol === "https:" ? url.href : null } catch { return null }
}

export function normalizeIsland(value: unknown): Island | null {
  const item = object(value)
  if (!validIslandCode(text(item.code)) || !text(item.title)) return null
  if (item.isEpic !== true && !/^\d{4}-\d{4}-\d{4}$/.test(text(item.code))) return null
  const players = object(item.players)
  const daily = object(item.last24h)
  const retention = object(item.retention)
  const earnings = object(item.estimatedEarnings)
  return {
    code: text(item.code), title: text(item.title), creator: text(item.creator), isEpic: item.isEpic === true,
    image: httpsUrl(item.image), genre: text(item.genre),
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
    players: numeric(players.now), playersAt: text(players.at) || null,
    change24h: numeric(players.change24h), peak24h: numeric(players.peak24h), peakAllTime: numeric(players.peakAllTime),
    plays: numeric(daily.plays), uniquePlayers: numeric(daily.uniquePlayers),
    minutesPlayed: numeric(daily.minutesPlayed), minutesPerPlayer: numeric(daily.minutesPerPlayer),
    favorites: numeric(daily.favorites), recommendations: numeric(daily.recommendations),
    retentionD1: numeric(retention.day1), retentionD7: numeric(retention.day7),
    estimatedDailyUSD: earnings.currency === "USD" ? numeric(earnings.perDay) : null,
    estimateLow: earnings.currency === "USD" ? numeric(earnings.low) : null,
    estimateHigh: earnings.currency === "USD" ? numeric(earnings.high) : null,
    updatedAt: text(item.updatedAt) || null,
  }
}

export function metricPoints(value: unknown): IslandMetricPoint[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(point => {
    const item = object(point)
    const timestamp = text(item.timestamp)
    return Number.isFinite(Date.parse(timestamp)) ? [{ timestamp, value: numeric(item.value) }] : []
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}
