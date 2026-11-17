import type { Island } from "../types/analytics.types"

export const formatMetric = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value)
export const formatPercent = (value: number | null | undefined) => value == null ? "—" : `${formatMetric(value * 100)}%`
export const formatUSD = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
export const formatTimestamp = (value: string | null) => !value || !Number.isFinite(Date.parse(value)) ? "Sin fecha disponible" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value))

function sumAvailable(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null)
  return known.length ? known.reduce((total, value) => total + value, 0) : null
}

export function rankCreators(islands: Island[], sort: "players" | "plays" | "earnings") {
  const groups = new Map<string, Island[]>()
  for (const island of islands) {
    if (!island.creator) continue
    const key = island.creator.toLowerCase()
    groups.set(key, [...(groups.get(key) ?? []), island])
  }
  return [...groups.values()].map(group => ({
    code: group[0].creator,
    islandCount: group.length,
    players: sumAvailable(group.map(island => island.players)),
    plays: sumAvailable(group.map(island => island.plays)),
    minutes: sumAvailable(group.map(island => island.minutesPlayed)),
    earnings: sumAvailable(group.map(island => island.estimatedDailyUSD)),
    islands: group,
  })).sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1))
}
