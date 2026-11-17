import type { CompetitiveRanking, CreatorCode, IslandHistory, IslandsResponse, IslandSort, IslandScope } from "@/types/analytics.types"

export async function fetchLocal<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal })
  let data
  try { data = await response.json() }
  catch { throw new Error("El servidor no respondió correctamente. Inicia la web con npm run dev:full.") }
  if (!response.ok) throw new Error(data?.error || "No se pudieron consultar los datos. Inténtalo de nuevo.")
  return data as T
}

export const getIslands = (sort: IslandSort, signal?: AbortSignal, scope: IslandScope = "creators") => fetchLocal<IslandsResponse>(`/islands?sort=${sort}&scope=${scope}`, signal)
export const getIslandHistory = (code: string, signal?: AbortSignal) => fetchLocal<IslandHistory>(`/islands/${encodeURIComponent(code)}/metrics`, signal)
export const getCompetitiveRanking = (signal?: AbortSignal) => fetchLocal<CompetitiveRanking>("/competitive", signal)
export const lookupCreator = (code: string, signal?: AbortSignal) => fetchLocal<CreatorCode>(`/creatorcode?name=${encodeURIComponent(code)}`, signal)
