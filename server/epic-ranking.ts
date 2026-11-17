import type { CompetitivePlayer, CompetitiveRanking } from "../src/types/analytics.types.ts"

export const EPIC_RANKING_URL = "https://www.fortnite.com/competitive/power-rankings?region=NAC"

function cellText(html: string) {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }
  return html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key: string) => {
      if (!key.startsWith("#")) return entities[key.toLowerCase()] ?? entity
      const point = key.toLowerCase().startsWith("#x") ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10)
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""
    }).replace(/\s+/g," ").trim()
}

export function parseEpicRanking(html: string): CompetitivePlayer[] {
  const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? []
  for (const table of tables) {
    if (!/PR\s*(Rating|Position)/i.test(cellText(table))) continue
    const players = new Map<number, CompetitivePlayer>()
    for (const row of table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => cellText(match[1]))
      if (cells.length < 3) continue
      const rank = Number(cells[0].match(/^#?(\d+)/)?.[1])
      const name = cells[1]
      const ratingText = cells[2].replace(/[,\s]/g,"")
      if (!Number.isInteger(rank) || rank < 1 || rank > 10 || !name || name.length > 100 || !/^\d+(\.\d+)?$/.test(ratingText)) continue
      players.set(rank, { rank, name, rating: Number(ratingText) })
    }
    if (players.size === 10) return [...players.values()].sort((a,b) => a.rank-b.rank)
  }
  throw new Error("La página de Epic no devolvió un top 10 legible. Consulta el ranking en su web oficial.")
}

export async function fetchEpicRanking(): Promise<CompetitiveRanking> {
  const response = await fetch(EPIC_RANKING_URL, { signal: AbortSignal.timeout(20000), headers: { Accept: "text/html" } })
  if (response.status === 401 || response.status === 403) throw new Error(`Epic bloqueó la consulta automática (HTTP ${response.status}). Puedes consultar el top 10 en su página oficial.`)
  if (!response.ok) throw new Error(`Epic no pudo cargar el ranking (HTTP ${response.status}). Inténtalo más tarde.`)
  const players = parseEpicRanking(await response.text())
  return { players, fetchedAt: new Date().toISOString(), source: EPIC_RANKING_URL, notice: "Consultado directamente en la web de Epic Games. Power Rankings se actualiza según su publicación oficial; no equivale a los últimos 30 días ni certifica estatus profesional." }
}
