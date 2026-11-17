import type { ScoringRule, TournamentSession, TournamentStatus, TournamentMatch, TournamentBoard } from "../types/tournaments.types.ts"

export function summarizeTournamentMatches(matches: TournamentMatch[]) {
  const average = (field: "eliminations" | "placement" | "aliveSeconds") => {
    const values = matches.map(match => match[field]).filter((value): value is number => value !== null && Number.isFinite(value))
    return { value: values.length ? values.reduce((a,b) => a + b,0) / values.length : null, samples: values.length }
  }
  return { eliminations: average("eliminations"), placement: average("placement"), aliveSeconds: average("aliveSeconds") }
}

export function formatAliveTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—"
  const rounded = Math.round(seconds)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2,"0")}`
}

export const tournamentRegions = [
  { value: "EU", label: "Europa" }, { value: "BR", label: "Brasil" },
  { value: "NAC", label: "Norteamérica Central" }, { value: "NAE", label: "Norteamérica Este" },
  { value: "NAW", label: "Norteamérica Oeste" }, { value: "ASIA", label: "Asia" },
  { value: "OCE", label: "Oceanía" }, { value: "ME", label: "Oriente Medio" },
  { value: "ONSITE", label: "Presencial / LAN" },
] as const

export function findRegionalSession(sessions: TournamentSession[], eventId: string, windowId: string) {
  const regionCodes = new Set<string>(tournamentRegions.map(region => region.value))
  const canonical = (id: string) => id.split("_").filter(part => !regionCodes.has(part)).join("_")
  return sessions.find(session => session.eventId === eventId && session.windowId === windowId)
    ?? sessions.find(session => canonical(session.eventId) === canonical(eventId) && canonical(session.windowId) === canonical(windowId))
}

export function tournamentStatus(session: Pick<TournamentSession, "startsAt" | "endsAt">, now = Date.now()): TournamentStatus {
  if (Date.parse(session.startsAt) > now) return "upcoming"
  return Date.parse(session.endsAt) > now ? "live" : "ended"
}

export function placementPoints(rules: ScoringRule[]) {
  const placement = rules.filter(rule => rule.stat === "PLACEMENT_STAT_INDEX")
  if (!placement.length || placement.some(rule => !["lte", "gte", "eq"].includes(rule.condition) || rule.tiers.some(tier => tier.multiplicative))) return []
  const max = Math.min(100, Math.max(...placement.flatMap(rule => rule.tiers.map(tier => tier.threshold))))
  return Array.from({ length: max }, (_, index) => {
    const position = index + 1
    const points = placement.reduce((sum, rule) => sum + rule.tiers.reduce((total, tier) => total + ((rule.condition === "lte" ? position <= tier.threshold : rule.condition === "gte" ? position >= tier.threshold : position === tier.threshold) ? tier.points : 0), 0), 0)
    return { position, points }
  })
}

export function eliminationPoints(rules: ScoringRule[]) {
  return eliminationScoring(rules)?.points ?? null
}

export function eliminationScoring(rules: ScoringRule[]): { points: number; cap: number | null } | null {
  const byStat = new Map<string, ScoringRule[]>()
  for (const rule of rules.filter(rule => /(?:^|_)TEAM_ELIMS_STAT_INDEX$/.test(rule.stat))) byStat.set(rule.stat, [...(byStat.get(rule.stat) ?? []), rule])
  if (!byStat.size) return null
  const variants: { points: number; cap: number | null }[] = []
  for (const group of byStat.values()) {
    let points = 0
    let cap: number | null | undefined
    for (const rule of group) {
      const tiers = [...rule.tiers].sort((a,b) => a.threshold - b.threshold)
      if (rule.condition !== "gte" || !tiers.length || tiers[0].threshold !== 1) return null
      const unlimited = tiers.length === 1 && tiers[0].multiplicative
      if (!unlimited && !tiers.every((tier,index) => !tier.multiplicative && tier.threshold === index + 1 && tier.points === tiers[0].points)) return null
      const nextCap = unlimited ? null : tiers.length
      if (cap !== undefined && cap !== nextCap) return null
      cap = nextCap
      points += tiers[0].points
    }
    variants.push({ points, cap: cap ?? null })
  }
  // Rank brackets are alternatives, not bonuses to add together.
  return variants.every(value => value.points === variants[0].points && value.cap === variants[0].cap) ? variants[0] : null
}

export function resolveEliminationScoring(boards: TournamentBoard[], selectedIndex: number) {
  const selected = boards[selectedIndex]
  if (!selected) return null
  if (selected.rules.some(rule => /(?:^|_)TEAM_ELIMS_STAT_INDEX$/.test(rule.stat))) return eliminationScoring(selected.rules)
  const alternatives = boards.filter(board => board.rules.some(rule => /(?:^|_)TEAM_ELIMS_STAT_INDEX$/.test(rule.stat))).map(board => eliminationScoring(board.rules))
  const first = alternatives[0]
  return first && alternatives.every(value => value?.points === first.points && value.cap === first.cap) ? first : null
}
