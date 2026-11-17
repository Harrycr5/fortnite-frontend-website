import { useMemo, useState } from "react"
import { Map, RefreshCw } from "lucide-react"
import { useIslands } from "@/hooks/use-islands"
import type { Island, IslandSort, IslandScope } from "@/types/analytics.types"
import { formatMetric, formatPercent, formatTimestamp, formatUSD } from "@/lib/analytics"
import { IslandDetails } from "@/components/island-details"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function IslandsPage() {
  const [sort, setSort] = useState<IslandSort>("players")
  const [scope, setScope] = useState<IslandScope>("all")
  const [query, setQuery] = useState("")
  const [genre, setGenre] = useState("")
  const [selected, setSelected] = useState<Island | null>(null)
  const { data, loading, error, refresh } = useIslands(sort, scope)
  const genres = useMemo(() => [...new Set(data?.islands.map(island => island.genre).filter(Boolean))].sort(), [data])
  const rows = useMemo(() => (data?.islands ?? []).map((island, index) => ({ island, rank: index + 1 })).filter(({ island }) => (!genre || island.genre === genre) && `${island.title} ${island.creator} ${island.code}`.toLowerCase().includes(query.trim().toLowerCase())), [data, query, genre])
  return <main className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fortnite / Islas</p><h1 className="text-3xl font-semibold tracking-tight">Dónde está jugando la comunidad.</h1><p className="mt-2 text-sm text-muted-foreground">Ranking de modos de Epic e islas de creadores, actividad reciente y métricas de participación.</p></div><Button variant="outline" disabled={loading} onClick={refresh}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button></div>
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3"><div><label htmlFor="island-search" className="mb-2 block text-sm font-medium">Buscar en resultados</label><Input id="island-search" placeholder="Isla, creador o código" value={query} onChange={event => setQuery(event.target.value)} /></div><div><label htmlFor="island-sort" className="mb-2 block text-sm font-medium">Ranking</label><select id="island-sort" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={sort} onChange={event => setSort(event.target.value as IslandSort)}><option value="players">Jugadores simultáneos</option><option value="plays">Más partidas · 24 h</option><option value="retention">Retención D1</option><option value="earnings">Ingresos estimados · día</option></select></div><div><label htmlFor="island-genre" className="mb-2 block text-sm font-medium">Género</label><select id="island-genre" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={genre} onChange={event => setGenre(event.target.value)}><option value="">Todos los géneros</option>{genres.map(value => <option key={value}>{value}</option>)}</select></div></div>
    <p className="text-xs leading-relaxed text-muted-foreground">Hasta 200 islas principales para el criterio elegido. Los filtros buscan dentro de esa muestra. «Simultáneos» es la última muestra publicada, no jugadores únicos ni un contador en directo. No se publican identidades de jugadores de estas islas.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Origen de las islas">
      {([['all', 'Todos los modos'], ['epic', 'Epic Games'], ['creators', 'Creadores']] as const).map(([value, label]) => <Button key={value} variant={scope === value ? "default" : "outline"} size="sm" aria-pressed={scope === value} onClick={() => { setScope(value); setGenre("") }}>{label}</Button>)}
    </div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Cargando ranking de islas…</p>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"><p className="text-destructive">{error}</p><Button variant="outline" onClick={refresh}>Reintentar</Button></div>}
    {data && <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Isla / creador</TableHead><TableHead>Simultáneos</TableHead><TableHead>Pico histórico</TableHead><TableHead>Cambio 24 h</TableHead><TableHead>Partidas 24 h</TableHead><TableHead>Retención D1</TableHead><TableHead>USD/día estimados</TableHead><TableHead><span className="sr-only">Detalles</span></TableHead></TableRow></TableHeader><TableBody>{rows.map(({ island, rank }) => <TableRow key={island.code}><TableCell className="text-muted-foreground">{rank}</TableCell><TableCell><div className="flex items-center gap-3"><span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">{island.image ? <img src={island.image} alt="" className="h-full w-full object-cover" loading="lazy" onError={event => { event.currentTarget.style.display = "none" }} /> : <Map className="size-5" />}</span><div className="min-w-44"><p className="max-w-72 truncate font-medium">{island.title}</p><p className="text-xs text-muted-foreground">@{island.creator} · {island.code}</p></div></div></TableCell><TableCell className="font-semibold tabular-nums">{formatMetric(island.players)}</TableCell><TableCell className="font-semibold text-sky-400 tabular-nums">{formatMetric(island.peakAllTime)}</TableCell><TableCell className={island.change24h == null ? "text-muted-foreground" : island.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}>{island.change24h != null && island.change24h > 0 ? "+" : ""}{formatPercent(island.change24h)}</TableCell><TableCell>{formatMetric(island.plays)}</TableCell><TableCell>{formatPercent(island.retentionD1)}</TableCell><TableCell>{formatUSD(island.estimatedDailyUSD)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(island)} aria-label={`Analizar ${island.title}`}>Analizar</Button></TableCell></TableRow>)}</TableBody></Table>{!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">No hay islas que coincidan con los filtros.</p>}</div>}
    {data && <p className="text-xs text-muted-foreground">Consultado: {formatTimestamp(data.fetchedAt)} · Lima. <a href={data.source} target="_blank" rel="noreferrer" className="underline">Fuente: FNTerminal, basada en Epic Data API</a>. Las estimaciones monetarias son externas y no incluyen ingresos por códigos de creador.</p>}
    <IslandDetails island={selected} onClose={() => setSelected(null)} />
  </main>
}

