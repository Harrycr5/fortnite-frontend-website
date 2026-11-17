import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Search, RefreshCw, Users, Map, Clock, DollarSign } from "lucide-react"
import { useIslands } from "@/hooks/use-islands"
import { getCreatorCode } from "@/services/creatorCode.service"
import type { CreatorCode, Island } from "@/types/analytics.types"
import { formatMetric, formatTimestamp, formatUSD, rankCreators } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IslandDetails } from "@/components/island-details"

export default function CreatorCodePage() {
  const [sort, setSort] = useState<"players" | "plays" | "earnings">("players")
  const [query, setQuery] = useState("")
  const [code, setCode] = useState("")
  const [request, setRequest] = useState<{ code: string } | null>(null)
  const [creator, setCreator] = useState<CreatorCode | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Island | null>(null)
  const { data, loading, error, refresh } = useIslands(sort)
  const ranked = useMemo(() => rankCreators(data?.islands ?? [], sort), [data, sort])
  const rows = ranked.map((item, index) => ({ ...item, rank: index + 1 })).filter(item => item.code.toLowerCase().includes(query.trim().toLowerCase()))
  const top = ranked[0]

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    setSearching(true)
    setCreator(null)
    setLookupError(null)
    getCreatorCode(request.code, controller.signal).then(result => {
      if (!controller.signal.aborted) setCreator(result)
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setLookupError(err instanceof Error ? err.message : "No se pudo consultar el código.")
    }).finally(() => { if (!controller.signal.aborted) setSearching(false) })
    return () => controller.abort()
  }, [request])
  const submit = (event: FormEvent) => { event.preventDefault(); if (code.trim()) setRequest({ code: code.trim() }) }

  return <main className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fortnite / Creadores</p><h1 className="text-3xl font-semibold tracking-tight">Los creadores detrás de las islas.</h1><p className="mt-2 text-sm text-muted-foreground">Descubre quién reúne más actividad y consulta códigos de Apoya a un creador.</p></div><Button variant="outline" disabled={loading} onClick={refresh}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "Creadores en la muestra", value: data ? formatMetric(ranked.length) : "—", icon: Users },
      { label: "Islas analizadas", value: data ? formatMetric(data.islands.length) : "—", icon: Map },
      { label: "Líder del criterio elegido", value: top ? `@${top.code}` : "—", icon: Clock },
      { label: "Ingresos confirmados", value: "No públicos", icon: DollarSign },
    ].map(({ label, value, icon: Icon }) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between"><CardDescription>{label}</CardDescription><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><p className="truncate text-xl font-semibold">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Consultar código de creador</CardTitle><CardDescription>Consulta el titular y el estado público de un código. El código de una isla y el de Apoya a un creador son datos distintos.</CardDescription></CardHeader><CardContent className="space-y-4">
      <form onSubmit={submit} className="flex flex-wrap gap-3"><div className="min-w-48 flex-1"><label htmlFor="creator-code" className="sr-only">Código de creador</label><Input id="creator-code" placeholder="Código de creador, por ejemplo ninja" value={code} onChange={event => setCode(event.target.value)} required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_-]+" /></div><Button type="submit" disabled={searching || !code.trim()}><Search className="size-4" />{searching ? "Consultando…" : "Consultar código"}</Button></form>
      {lookupError && <p role="alert" className="text-sm text-destructive">{lookupError}</p>}
      {creator && <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4"><div><p className="font-semibold">{creator.account.name || "Nombre no publicado"}</p><p className="text-sm text-muted-foreground">Código: {creator.code}</p></div><div className="flex gap-2"><Badge variant={creator.status === "ACTIVE" ? "default" : "outline"}>{creator.status === "ACTIVE" ? "Activo" : creator.status || "Estado no publicado"}</Badge>{creator.verified && <Badge variant="secondary">Verificado por la fuente</Badge>}</div></div>}
      <p className="text-xs text-muted-foreground">Fuente: <a href="https://dash.fortnite-api.com/endpoints/creatorcode" target="_blank" rel="noreferrer" className="underline">Fortnite-API</a>. Esta consulta no revela cuántas personas usan el código ni cuánto genera.</p>
    </CardContent></Card>
    <div className="space-y-4 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Ranking de creadores de islas</h2><p className="mt-1 text-xs text-muted-foreground">Agrupado entre las {data?.islands.length ?? "hasta 200"} islas principales para el criterio seleccionado. Es una muestra, no un censo global de creadores.</p></div><div><label htmlFor="creator-sort" className="sr-only">Orden del ranking de creadores</label><select id="creator-sort" className="h-9 rounded-lg border bg-background px-3 text-sm" value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="players">Simultáneos en sus islas</option><option value="plays">Partidas de sus islas · 24 h</option><option value="earnings">Ingresos estimados · día</option></select></div></div><label htmlFor="creator-filter" className="sr-only">Filtrar creadores de la muestra</label><Input id="creator-filter" placeholder="Filtrar creadores de esta muestra…" value={query} onChange={event => setQuery(event.target.value)} /></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Consultando actividad de creadores…</p>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"><p className="text-destructive">{error}</p><Button variant="outline" onClick={refresh}>Reintentar</Button></div>}
    {data && <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Creador</TableHead><TableHead>Islas en muestra</TableHead><TableHead>Simultáneos*</TableHead><TableHead>Partidas 24 h</TableHead><TableHead>Minutos 24 h</TableHead><TableHead>USD/día estimados</TableHead><TableHead>Isla destacada</TableHead></TableRow></TableHeader><TableBody>{rows.map(item => <TableRow key={item.code}><TableCell className={item.rank <= 3 ? "font-bold text-amber-400" : "text-muted-foreground"}>#{item.rank}</TableCell><TableCell className="font-medium">@{item.code}</TableCell><TableCell>{item.islandCount}</TableCell><TableCell className="tabular-nums">{formatMetric(item.players)}</TableCell><TableCell>{formatMetric(item.plays)}</TableCell><TableCell>{formatMetric(item.minutes)}</TableCell><TableCell>{formatUSD(item.earnings)}</TableCell><TableCell><button type="button" className="max-w-48 truncate text-left text-sm underline underline-offset-4" onClick={() => setSelected(item.islands[0])}>{item.islands[0].title}</button></TableCell></TableRow>)}</TableBody></Table>{!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">No hay creadores que coincidan con la búsqueda.</p>}</div>}
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground"><p>* Suma de las últimas muestras de sus islas incluidas; los horarios pueden variar. Partidas y minutos se suman solo donde hay datos disponibles. No representa personas únicas entre islas.</p><p>Los USD/día son estimaciones de FNTerminal basadas en tiempo de juego, no pagos confirmados. No incluyen ingresos por códigos, patrocinios ni ventas dentro de islas. <a href="https://fnterminal.live/earnings#how" target="_blank" rel="noreferrer" className="underline">Metodología</a>.</p>{data && <p>Consultado: {formatTimestamp(data.fetchedAt)} · Lima. <a href={data.source} target="_blank" rel="noreferrer" className="underline">Fuente: FNTerminal / Epic Data API</a>.</p>}</div>
    <Card><CardHeader><CardTitle>¿Quién tiene el código más usado?</CardTitle><CardDescription>Las fuentes públicas conectadas no publican un ranking de usos o ganancias de códigos. Cada creador consulta sus propios datos en su panel de Apoya a un creador.</CardDescription></CardHeader><CardContent><a href="https://sac.epicgames.com/dashboard/insights" target="_blank" rel="noreferrer" className="text-sm underline">Abrir mi panel de Apoya a un creador</a></CardContent></Card>
    <IslandDetails island={selected} onClose={() => setSelected(null)} />
  </main>
}
