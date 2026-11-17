import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, CalendarDays, RefreshCw, Trophy } from "lucide-react"
import { fetchLocal } from "@/services/analytics.service"
import type { TournamentCatalog, TournamentSession } from "@/types/tournaments.types"
import { findRegionalSession, tournamentRegions, tournamentStatus } from "@/lib/tournaments"
import { formatTimestamp } from "@/lib/analytics"
import { TournamentDetails } from "@/components/tournament-details"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TournamentsPage() {
  const [data, setData] = useState<TournamentCatalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("active")
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const showingDetail = params.has("event") && params.has("round")
  const inferredRegion = tournamentRegions.find(item => params.get("event")?.split("_").includes(item.value))?.value ?? "EU"
  const region = tournamentRegions.some(item => item.value === params.get("region")) ? params.get("region")! : showingDetail ? inferredRegion : "ALL"
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  useEffect(() => { const timer = setInterval(() => setRevision(value => value + 1), 60000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    fetchLocal<TournamentCatalog>(`/tournaments?region=${region}`, controller.signal).then(result => { if (!controller.signal.aborted) setData(result) })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudo cargar el calendario.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision, region])
  const sessions = data?.region === region ? data.sessions : []
  const selected = showingDetail ? findRegionalSession(sessions, params.get("event")!, params.get("round")!) : undefined
  useEffect(() => {
    if (!selected || (selected.eventId === params.get("event") && selected.windowId === params.get("round"))) return
    setParams({ region, event: selected.eventId, round: selected.windowId }, { replace: true, state: location.state })
  }, [selected, region, params, setParams, location.state])
  const counts = { live: sessions.filter(item => tournamentStatus(item, now) === 'live').length, upcoming: sessions.filter(item => tournamentStatus(item, now) === 'upcoming').length, ended: sessions.filter(item => tournamentStatus(item, now) === 'ended').length }
  const rows = useMemo(() => sessions.filter(item => {
    const current = tournamentStatus(item, now)
    return (status === 'active' ? current !== 'ended' : current === status)
      && (region === "ALL" || item.regions.includes(region))
      && `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))
  }).sort((a,b) => {
    const aStatus = tournamentStatus(a,now); const bStatus = tournamentStatus(b,now)
    if (aStatus !== bStatus) return aStatus === 'live' ? -1 : bStatus === 'live' ? 1 : aStatus === 'upcoming' ? -1 : 1
    return aStatus === 'ended' ? b.endsAt.localeCompare(a.endsAt) : a.startsAt.localeCompare(b.startsAt)
  }), [sessions, status, region, query, now])
  const open = (session: TournamentSession) => setParams({ event: session.eventId, round: session.windowId, region: region === "ALL" ? session.regions[0] : region }, { state: { fromTournaments: true } })
  const back = () => location.state?.fromTournaments ? navigate(-1) : navigate(`/tournaments?region=${region}`, { replace: true })
  const changeRegion = (value: string) => {
    const next = new URLSearchParams(params)
    next.set("region", value)
    setParams(next, { replace: true, state: location.state })
  }
  const regionSelector = (id: string) => <div className="flex flex-wrap items-center gap-3"><label htmlFor={id} className="text-sm font-medium">Región del torneo</label><select id={id} value={region} onChange={event => changeRegion(event.target.value)} className="h-10 min-w-48 rounded-lg border bg-card px-3 text-sm">{!showingDetail && <option value="ALL">Todas las regiones</option>}{tournamentRegions.map(item => <option key={item.value} value={item.value}>{item.label} ({item.value})</option>)}</select></div>
  return <main className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fortnite / Competitivo</p><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Trophy className="size-7 text-amber-400" />Torneos</h1><p className="mt-2 text-sm text-muted-foreground">Calendario, clasificaciones, requisitos, puntuación y premios por ronda.</p></div><Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar calendario</Button></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Consultando calendario competitivo…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Reintentar</Button></div>}
    {data?.region === region && !!data.unavailableRegions?.length && <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">Calendario parcial: no se pudieron consultar {data.unavailableRegions.join(', ')}. Los contadores solo incluyen las regiones disponibles.</p>}
    {showingDetail ? <>
      <div className="flex flex-wrap items-center justify-between gap-4"><Button variant="ghost" onClick={back}><ArrowLeft className="size-4" />Volver a torneos</Button>{regionSelector("detail-tournament-region")}</div>
      {selected ? <TournamentDetails key={`${region}:${selected.eventId}:${selected.windowId}`} session={selected} sessions={sessions} now={now} /> : !loading && data?.region === region && <div role="status" className="rounded-xl border p-6 text-sm text-muted-foreground">Esta sesión del torneo no está publicada para {tournamentRegions.find(item => item.value === region)?.label}. Selecciona otra región o vuelve al calendario para consultar sus rondas disponibles.</div>}
    </> : <>
      {params.has('event') && data && !loading && <div role="alert" className="rounded-xl border p-4 text-sm text-muted-foreground">Esta ronda no está en el calendario publicado. <button type="button" className="underline" onClick={() => setParams({}, { replace: true })}>Ver calendario</button></div>}
      <div className="grid gap-3 sm:grid-cols-3">{[['En curso',counts.live,'text-emerald-400'],['Próximas rondas',counts.upcoming,'text-sky-400'],['Finalizadas · 30 días',counts.ended,'text-muted-foreground']].map(([label,count,color]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-3xl font-semibold ${color}`}>{data?.region === region ? count : '—'}</p></div>)}</div>
      <div className="space-y-4 rounded-xl border bg-card p-4"><div className="flex flex-wrap gap-2" role="group" aria-label="Estado de los torneos">{[['active','Actuales y próximos'],['live','En curso'],['upcoming','Próximos'],['ended','Finalizados']].map(([value,label]) => <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</Button>)}</div><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><label htmlFor="tournament-search" className="sr-only">Buscar torneo</label><Input id="tournament-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar FNCS, copas, Recarga…" /></div>{regionSelector("events-region")}</div></div>
      {data && <p role="status" className="text-xs text-muted-foreground">{rows.length} rondas encontradas · {region === "ALL" ? "Todas las regiones" : tournamentRegions.find(item => item.value === region)?.label}. Todos los horarios se muestran en Lima (UTC−5).</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(session => {
        const current = tournamentStatus(session, now)
        const rewards = session.boards.flatMap(board => board.payouts.flatMap(table => table.ranks.flatMap(rank => rank.rewards)))
        const money = rewards.some(reward => reward.type === 'ecomm' && /^[A-Z]{3}$/.test(reward.value))
        const access = rewards.some(reward => reward.type === 'token')
        return <button key={`${session.eventId}:${session.windowId}`} type="button" className="group overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" onClick={() => open(session)}>
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">{session.image ? <img src={session.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={event => { event.currentTarget.style.visibility = 'hidden' }} /> : <Trophy className="size-12 text-muted-foreground" />}<span className={`absolute top-3 left-3 rounded-md px-2 py-1 text-xs font-semibold ${current === 'live' ? 'bg-emerald-400 text-emerald-950' : current === 'upcoming' ? 'bg-sky-400 text-sky-950' : 'bg-black/75 text-white'}`}>{current === 'live' ? '● En curso' : current === 'upcoming' ? 'Próximamente' : 'Finalizado'}</span></div>
          <div className="space-y-3 p-4"><p className="text-xs font-medium text-muted-foreground">{session.regions.join(' / ')}{session.round !== null ? ` · Ronda ${session.round+1}` : ''}</p><h2 className="line-clamp-2 min-h-12 text-lg font-semibold leading-snug">{session.title}</h2><p className="flex items-start gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4 shrink-0" />{formatTimestamp(session.startsAt)} · Lima</p><div className="flex flex-wrap gap-2 text-[11px]">{money && <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-emerald-400">Premios en dinero</span>}{access && <span className="rounded-md bg-sky-400/10 px-2 py-1 text-sky-400">Acceso competitivo</span>}{!money && !access && <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">Ver recompensas y reglamento</span>}</div><p className="text-sm font-medium">Ver detalles y posiciones →</p></div>
        </button>
      })}</div>
      {!loading && !error && !rows.length && <div className="rounded-xl border border-dashed p-12 text-center"><Trophy className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">No hay rondas para estos filtros</h2><p className="mt-2 text-sm text-muted-foreground">Prueba otra región o revisa los próximos torneos. La fuente puede no haber publicado nuevas fechas todavía.</p>{status === "live" && region !== "ALL" && <Button variant="outline" className="mt-4" onClick={() => changeRegion("ALL")}>Ver en curso en todas las regiones</Button>}</div>}
    </>}
    <p className="text-xs leading-relaxed text-muted-foreground">Datos: <a href="https://fnapi.osirion.gg/" target="_blank" rel="noreferrer" className="underline">Osirion</a>. Calendario consultado: {formatTimestamp(data?.fetchedAt ?? null)} · Lima. Los eventos y las condiciones pueden cambiar; verifica su ficha dentro de Fortnite.</p>
  </main>
}




