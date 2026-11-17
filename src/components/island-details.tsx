import { useEffect, useState } from "react"
import type { Island, IslandHistory } from "@/types/analytics.types"
import { getIslandHistory } from "@/services/analytics.service"
import { formatMetric, formatPercent, formatTimestamp, formatUSD } from "@/lib/analytics"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function IslandDetails({ island, onClose }: { island: Island | null; onClose: () => void }) {
  const [history, setHistory] = useState<IslandHistory | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setHistory(null)
    setError(null)
    if (!island) return
    const controller = new AbortController()
    getIslandHistory(island.code, controller.signal).then(data => { if (!controller.signal.aborted) setHistory(data) })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Historial no disponible.") })
    return () => controller.abort()
  }, [island?.code])
  const timestamps = [...new Set([...(history?.plays ?? []), ...(history?.peakCCU ?? []), ...(history?.uniquePlayers ?? []), ...(history?.minutesPlayed ?? [])].map(point => point.timestamp))].sort()
  const at = (key: "plays" | "peakCCU" | "uniquePlayers" | "minutesPlayed", timestamp: string) => history?.[key].find(point => point.timestamp === timestamp)?.value ?? null
  return <Sheet open={!!island} onOpenChange={open => { if (!open) onClose() }}><SheetContent className="w-full! overflow-y-auto sm:max-w-xl!">{island && <>
    <SheetHeader className="pr-12"><SheetTitle>{island.title}</SheetTitle><SheetDescription>{island.code} · @{island.creator}</SheetDescription></SheetHeader>
    <div className="space-y-6 px-4 pb-8">
      <p className="text-xs text-muted-foreground">Jugadores medidos: {formatTimestamp(island.playersAt)} · Lima</p>
      <dl className="grid grid-cols-2 gap-3">{[
        ["Simultáneos (última muestra)", formatMetric(island.players)], ["Pico simultáneo 24 h", formatMetric(island.peak24h)], ["Pico histórico", formatMetric(island.peakAllTime)],
        ["Partidas 24 h", formatMetric(island.plays)], ["Jugadores únicos 24 h", formatMetric(island.uniquePlayers)],
        ["Minutos jugados 24 h", formatMetric(island.minutesPlayed)], ["Minutos por jugador", formatMetric(island.minutesPerPlayer)],
        ["Favoritos 24 h", formatMetric(island.favorites)], ["Recomendaciones 24 h", formatMetric(island.recommendations)],
        ["Retención D1", formatPercent(island.retentionD1)], ["Retención D7", formatPercent(island.retentionD7)],
      ].map(([label, value]) => <div key={label} className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd></div>)}</dl>
      <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4"><h3 className="text-sm font-semibold">Estimación externa de ingresos diarios</h3><p className="mt-2 text-xl font-semibold">{formatUSD(island.estimatedDailyUSD)}</p><p className="mt-1 text-xs text-muted-foreground">Rango: {formatUSD(island.estimateLow)} – {formatUSD(island.estimateHigh)}. Modelo de FNTerminal basado en tiempo de juego. No son pagos confirmados ni ingresos por código de creador.</p><a href="https://fnterminal.live/earnings#how" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">Ver metodología</a></div>
      <div><h3 className="mb-2 font-semibold">Historial diario · hasta 7 días</h3><p className="mb-3 text-xs text-muted-foreground">Fuente directa: Epic Data API. Días UTC; el día en curso puede estar incompleto. «—» indica información no publicada.</p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !history ? <p role="status" className="text-sm text-muted-foreground">Consultando historial…</p> : !timestamps.length ? <p className="text-sm text-muted-foreground">No hay datos públicos para este intervalo.</p> : <Table><TableHeader><TableRow><TableHead>Día UTC</TableHead><TableHead>Pico CCU</TableHead><TableHead>Partidas</TableHead><TableHead>Únicos</TableHead><TableHead>Minutos</TableHead></TableRow></TableHeader><TableBody>{timestamps.map(timestamp => <TableRow key={timestamp}><TableCell>{timestamp.slice(5, 10)}</TableCell><TableCell>{formatMetric(at("peakCCU", timestamp))}</TableCell><TableCell>{formatMetric(at("plays", timestamp))}</TableCell><TableCell>{formatMetric(at("uniquePlayers", timestamp))}</TableCell><TableCell>{formatMetric(at("minutesPlayed", timestamp))}</TableCell></TableRow>)}</TableBody></Table>}
      </div>
      <a href={island.isEpic ? "https://www.fortnite.com/play" : `https://www.fortnite.com/@${encodeURIComponent(island.creator)}/${island.code}`} target="_blank" rel="noreferrer" className="inline-block text-sm underline">Ver isla en Fortnite</a>
    </div>
  </>}</SheetContent></Sheet>
}

