import { Router } from "express"
import type { IslandSort } from "../src/types/analytics.types.ts"
import { fetchEpicRanking } from "./epic-ranking.ts"
import { metricPoints, normalizeIsland, object, text, validIslandCode } from "./analytics-data.ts"

export const analytics = Router()
const cache = new Map<string, { expires: number; value: unknown }>()
const pending = new Map<string, Promise<unknown>>()

async function cached<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const running = pending.get(key)
  if (running) return running as Promise<T>
  const operation = loader().then(value => {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!)
    cache.set(key, { value, expires: Date.now() + ttl })
    return value
  }).finally(() => pending.delete(key))
  pending.set(key, operation)
  return operation
}

async function upstream(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
  if (response.status === 404) throw new Error("No se encontró información pública para esta consulta.")
  if (response.status === 401 || response.status === 403) throw new Error(`El proveedor rechazó el acceso al endpoint (HTTP ${response.status}). Comprueba los permisos de la clave.`)
  if (response.status === 429) throw new Error("La fuente alcanzó el límite de consultas. Espera un momento y vuelve a intentar.")
  if (!response.ok) throw new Error("La fuente de datos no está disponible en este momento.")
  try { return object(await response.json()) }
  catch { throw new Error("La fuente devolvió una respuesta inválida.") }
}

analytics.get("/islands", async (req, res) => {
  const sort = req.query.sort ?? "players"
  const scope = req.query.scope ?? "all"
  if (typeof scope !== "string" || !["all", "epic", "creators"].includes(scope)) return res.status(400).json({ error: "Filtro de origen inválido." })
  if (typeof sort !== "string" || !["players", "plays", "earnings", "retention"].includes(sort)) return res.status(400).json({ error: "Orden de islas inválido." })
  try {
    const result = await cached(`islands:${sort}:${scope}`, 300000, async () => {
      const epic = scope === "all" ? "" : `&epic=${scope === "epic"}`
      const payload = await upstream(`https://fnterminal.live/api/v1/islands?sort=${sort}&limit=200${epic}`)
      if (!Array.isArray(payload.islands)) throw new Error("La fuente no devolvió un catálogo de islas válido.")
      const islands = payload.islands.map(normalizeIsland).filter(item => item !== null)
      if (payload.islands.length && !islands.length) throw new Error("Las métricas recibidas no tienen el formato esperado.")
      return { islands, sort: sort as IslandSort, sampleLimit: 200, fetchedAt: new Date().toISOString(), source: "https://fnterminal.live" }
    })
    return res.json(result)
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudieron cargar las islas." }) }
})

analytics.get("/islands/:code/metrics", async (req, res) => {
  const code = String(req.params.code)
  if (!validIslandCode(code)) return res.status(400).json({ error: "Introduce un código de isla o identificador de modo válido." })
  try {
    const result = await cached(`history:${code}`, 300000, async () => {
      const to = new Date()
      const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
      const payload = await upstream(`https://api.fortnite.com/ecosystem/v1/islands/${code}/metrics/day?${params}`)
      if (!["peakCCU", "plays", "uniquePlayers", "minutesPlayed"].some(key => Array.isArray(payload[key]))) throw new Error("La fuente no devolvió un historial válido.")
      return {
        code, fetchedAt: new Date().toISOString(),
        peakCCU: metricPoints(payload.peakCCU), plays: metricPoints(payload.plays),
        uniquePlayers: metricPoints(payload.uniquePlayers), minutesPlayed: metricPoints(payload.minutesPlayed),
      }
    })
    return res.json(result)
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudo consultar el historial." }) }
})

analytics.get("/creatorcode", async (req, res) => {
  const name = req.query.name
  if (typeof name !== "string" || !/^[a-zA-Z0-9_-]{3,32}$/.test(name.trim())) return res.status(400).json({ error: "Introduce un código de 3 a 32 caracteres: letras, números, guiones o guiones bajos." })
  try {
    const result = await cached(`creator:${name.trim().toLowerCase()}`, 300000, async () => {
      const payload = await upstream(`https://fortnite-api.com/v2/creatorcode?name=${encodeURIComponent(name.trim())}`)
      const data = object(payload.data)
      const account = object(data.account)
      if (!text(data.code) || !text(account.id)) throw new Error("La fuente no devolvió un código válido.")
      return { code: text(data.code), status: text(data.status), verified: data.verified === true, account: { id: text(account.id), name: text(account.name) } }
    })
    return res.json(result)
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudo consultar el código." }) }
})

analytics.get("/competitive", async (_req, res) => {
  try {
    return res.json(await cached("competitive:epic", 300000, fetchEpicRanking))
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudo consultar el ranking de Epic Games." })
  }
})
