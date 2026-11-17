import { useEffect, useState } from "react"
import { getIslands } from "@/services/analytics.service"
import type { IslandsResponse, IslandSort, IslandScope } from "@/types/analytics.types"

export function useIslands(sort: IslandSort, scope: IslandScope = "creators") {
  const [data, setData] = useState<IslandsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setData(null)
    setError(null)
    getIslands(sort, controller.signal, scope).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudieron cargar las islas.")
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [sort, scope, revision])
  return { data, loading, error, refresh: () => setRevision(value => value + 1) }
}
