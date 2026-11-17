import { object } from "./analytics-data.ts"
const cache = new Map<string, { expires: number; data: Record<string, unknown> }>()
const running = new Map<string, Promise<Record<string, unknown>>>()

export async function publicData(path: string, ttl = 300000) {
  const hit = cache.get(path)
  if (hit && hit.expires > Date.now()) return hit.data
  const pending = running.get(path)
  if (pending) return pending
  const operation = (async () => {
    const response = await fetch(`https://fnapi.osirion.gg${path}`, { signal: AbortSignal.timeout(25000) })
    if (!response.ok) throw new Error(response.status === 429 ? "La fuente alcanzó el límite de consultas. Inténtalo más tarde." : "La fuente de datos no está disponible en este momento.")
    const data = object(await response.json())
    if (data.success !== true) throw new Error("La fuente no devolvió datos válidos.")
    if (cache.size >= 100) cache.delete(cache.keys().next().value!)
    cache.set(path, { data, expires: Date.now() + ttl })
    return data
  })().finally(() => running.delete(path))
  running.set(path, operation)
  return operation
}
