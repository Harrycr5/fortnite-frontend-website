import type { ScoringRule, TournamentBoard, TournamentLeaderboard, TournamentSession, TournamentMatch } from "../src/types/tournaments.types.ts"
import { numeric, object, text } from "./analytics-data.ts"

export const eventPattern = /^[a-zA-Z0-9:_-]{1,160}$/
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
const imageUrl = (value: unknown) => { try { const url = new URL(text(value)); return url.protocol === "https:" ? url.href : null } catch { return null } }

export function normalizeTournamentSessions(raw: unknown, now = Date.now()): TournamentSession[] {
  if (!Array.isArray(raw)) throw new Error("La fuente no devolvió una lista de torneos válida.")
  const sessions = new Map<string, TournamentSession>()
  for (const value of raw) {
    const event = object(value)
    const display = object(event.displayData)
    const metadata = object(event.metadata)
    for (const value of Array.isArray(event.eventWindows) ? event.eventWindows : []) {
      const window = object(value)
      const start = Date.parse(text(window.beginTime))
      const end = Date.parse(text(window.endTime))
      if (!eventPattern.test(text(event.eventId)) || !eventPattern.test(text(window.eventWindowId)) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end < now - 30 * 86400000) continue
      const locations = Array.isArray(window.scoreLocations) ? window.scoreLocations : []
      const boards: TournamentBoard[] = locations.flatMap(value => {
        const location = object(value)
        if (!eventPattern.test(text(location.leaderboardEventId)) || !eventPattern.test(text(location.leaderboardEventWindowId))) return []
        const rules: ScoringRule[] = (Array.isArray(location.scoringRules) ? location.scoringRules : []).map(value => {
          const rule = object(value)
          return {
            stat: text(rule.trackedStat), condition: text(rule.matchRule),
            tiers: (Array.isArray(rule.rewardTiers) ? rule.rewardTiers : []).flatMap(value => {
              const tier = object(value)
              const threshold = numeric(tier.keyValue); const points = numeric(tier.pointsEarned)
              return threshold !== null && points !== null ? [{ threshold, points, multiplicative: tier.multiplicative === true }] : []
            }),
          }
        })
        return [{
          eventId: text(location.leaderboardEventId), windowId: text(location.leaderboardEventWindowId), primary: location.isMain === true, rules,
          payouts: (Array.isArray(location.payoutTables) ? location.payoutTables : []).map(value => {
            const table = object(value)
            return { scoringType: text(table.scoringType), ranks: (Array.isArray(table.ranks) ? table.ranks : []).flatMap(value => {
              const rank = object(value); const threshold = numeric(rank.threshold)
              if (threshold === null) return []
              return [{ threshold, rewards: (Array.isArray(rank.payouts) ? rank.payouts : []).map(value => {
                const reward = object(value)
                return { type: text(reward.rewardType), value: text(reward.value), quantity: numeric(reward.quantity) }
              }) }]
            }).sort((a, b) => a.threshold - b.threshold) }
          }),
        }]
      }).sort((a, b) => Number(b.primary) - Number(a.primary))
      const requirements = Array.isArray(window.additionalRequirements) ? window.additionalRequirements.flatMap<string | string[]>(value => typeof value === "string" ? [value] : Array.isArray(value) ? [strings(value)] : []) : []
      const session: TournamentSession = {
        eventId: text(event.eventId), windowId: text(window.eventWindowId),
        title: text(display.longFormatTitle) || [text(display.titleLine1), text(display.titleLine2)].filter(Boolean).join(" ") || text(event.eventId),
        description: text(display.detailsDescription) || text(display.flavorDescription),
        image: imageUrl(display.playlistTileImage) || imageUrl(display.squarePosterImage),
        regions: strings(event.regions), platforms: strings(event.platforms), startsAt: text(window.beginTime), endsAt: text(window.endTime),
        round: numeric(window.round), matchCap: numeric(window.matchCap), minimumLevel: numeric(metadata.minimumAccountLevel),
        systemRequirements: strings(metadata.requireSystemFeatures), requirements,
        allTokens: [...strings(window.requireAllTokens), ...strings(window.requireAllTokensCaller)],
        anyTokens: [...strings(window.requireAnyTokens), ...strings(window.requireAnyTokensCaller)],
        excludedTokens: strings(window.requireNoneTokensCaller), boards,
      }
      sessions.set(`${session.eventId}:${session.windowId}`, session)
    }
  }
  return [...sessions.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function normalizeLeaderboard(raw: unknown, page: number): TournamentLeaderboard {
  const board = object(raw)
  if (!Array.isArray(board.entries)) throw new Error("La clasificación recibida no tiene el formato esperado.")
  return {
    page, totalPages: numeric(board.totalPages), updatedAt: text(board.updatedAt) || null, fetchedAt: new Date().toISOString(),
    entries: board.entries.map((value,index) => {
      const entry = object(value)
      const matches = Array.isArray(entry.sessionHistory) ? entry.sessionHistory.map(object) : null
      const matchHistory = new Map<string, TournamentMatch>()
      const nonnegative = (value: unknown) => { const number = numeric(value); return number !== null && number >= 0 ? number : null }
      matches?.forEach((match,index) => {
        const stats = object(match.trackedStats)
        const id = text(match.sessionId) || `unidentified-${index}`
        const endedAt = text(match.endTime)
        const placement = numeric(stats.PLACEMENT_STAT_INDEX)
        matchHistory.set(id, {
          id, endedAt: Number.isFinite(Date.parse(endedAt)) ? endedAt : null,
          eliminations: nonnegative(stats.TEAM_ELIMS_STAT_INDEX),
          placement: placement !== null && placement >= 1 ? placement : null,
          aliveSeconds: nonnegative(stats.TIME_ALIVE_STAT),
        })
      })
      const history = [...matchHistory.values()].sort((a,b) => (a.endedAt ?? "9999").localeCompare(b.endedAt ?? "9999"))
      const placements = history.flatMap(match => match.placement === null ? [] : [match.placement])
      const eliminations = history.flatMap(match => match.eliminations === null ? [] : [match.eliminations])
      return {
        id: text(entry.teamId) || `rank-${numeric(entry.rank) ?? index}`,
        rank: numeric(entry.rank), points: numeric(entry.pointsEarned),
        players: (Array.isArray(entry.players) ? entry.players : []).map(value => { const player = object(value); return { id: text(player.accountId), name: text(player.username) } }),
        matches: matches === null ? null : history.length,
        wins: placements.length ? placements.filter(value => value === 1).length : null,
        eliminations: eliminations.length ? eliminations.reduce((a, b) => a + b, 0) : null,
        matchHistory: history,
      }
    }),
  }
}
