import { Router } from "express"
import { publicData } from "./public-data.ts"
import { normalizeLeaderboard, normalizeTournamentSessions, eventPattern } from "./tournaments-data.ts"
import { tournamentRegions, tournamentStatus } from "../src/lib/tournaments.ts"

export const tournaments = Router()

const validRegion = (value: unknown): value is string => typeof value === "string" && tournamentRegions.some(region => region.value === value)

async function sessions(region: string) {
  const data = await publicData(`/v1/tournaments?lang=es&region=${region}`, 60000)
  return normalizeTournamentSessions(data.tournaments).filter(session => session.regions.includes(region))
}

tournaments.get("/tournaments", async (req, res) => {
  const region = req.query.region ?? "EU"
  if (region !== "ALL" && !validRegion(region)) return res.status(400).json({ error: "La región del torneo no es válida." })
  try {
    if (region === "ALL") {
      const results = await Promise.allSettled(tournamentRegions.map(item => sessions(item.value)))
      const unavailableRegions = results.flatMap((result,index) => result.status === "rejected" ? [tournamentRegions[index].value] : [])
      if (unavailableRegions.length === tournamentRegions.length) throw new Error("No se pudo consultar el calendario de ninguna región. Inténtalo de nuevo.")
      const merged = results.flatMap(result => result.status === "fulfilled" ? result.value : [])
      const unique = [...new Map(merged.map(session => [`${session.eventId}:${session.windowId}`,session])).values()]
      return res.json({ sessions: unique, fetchedAt: new Date().toISOString(), region, unavailableRegions })
    }
    return res.json({ sessions: await sessions(region), fetchedAt: new Date().toISOString(), region, unavailableRegions: [] })
  }
  catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudieron cargar los torneos." }) }
})

tournaments.get("/tournaments/leaderboard", async (req, res) => {
  const { eventId, windowId, board = "0", page = "0", region = "EU" } = req.query
  if (typeof eventId !== "string" || typeof windowId !== "string" || !eventPattern.test(eventId) || !eventPattern.test(windowId)
    || typeof page !== "string" || !/^\d{1,3}$/.test(page) || Number(page) > 100
    || typeof board !== "string" || !/^\d{1,2}$/.test(board) || !validRegion(region)) return res.status(400).json({ error: "El torneo, la región, la ronda o la página no son válidos." })
  try {
    const session = (await sessions(region)).find(item => item.eventId === eventId && item.windowId === windowId)
    if (!session) return res.status(404).json({ error: "No se encontró la ronda en el calendario publicado." })
    if (tournamentStatus(session) === "upcoming") return res.status(409).json({ error: "Esta ronda todavía no ha comenzado; aún no tiene clasificación." })
    const selected = session.boards[Number(board)]
    if (!selected) return res.status(404).json({ error: "La fuente no publica una clasificación para esta ronda." })
    const params = new URLSearchParams({ leaderboardEventId: selected.eventId, leaderboardEventWindowId: selected.windowId, page })
    const data = await publicData(`/v1/tournaments/leaderboard?${params}`, 60000)
    return res.json(normalizeLeaderboard(data.leaderboard, Number(page)))
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudo consultar la clasificación." }) }
})
