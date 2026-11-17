import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react"
import type { TournamentLeaderboard, TournamentSession } from "@/types/tournaments.types"
import { placementPoints, resolveEliminationScoring, tournamentStatus } from "@/lib/tournaments"
import { formatMetric, formatTimestamp } from "@/lib/analytics"
import { fetchLocal } from "@/services/analytics.service"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { TournamentPlayerMatches, type MatchSelection } from "@/components/tournament-player-matches"

function requirementLabel(value: string) {
  if (value === "mfa") return "Autenticación en dos pasos (2FA) activada"
  if (value.startsWith("eula:")) return "Aceptar el reglamento del torneo en Fortnite"
  if (value.startsWith("adps:")) return "Cumplir la autorización de participación exigida por Epic"
  if (value.startsWith("currentRanking:") || value.startsWith("trackRanking:")) return "Cumplir el rango competitivo exigido en el reglamento"
  return value
}

function rewardLabel(reward: { type: string; value: string; quantity: number | null }, sessions: TournamentSession[], region: string[]) {
  if (reward.type === "ecomm" && /^[A-Z]{3}$/.test(reward.value) && reward.quantity !== null) {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: reward.value, maximumFractionDigits: 0 }).format(reward.quantity)
  }
  if (reward.type === "token") {
    const target = sessions.find(session => session.regions.some(value => region.includes(value)) && (session.allTokens.includes(reward.value) || session.anyTokens.includes(reward.value)))
    if (target) return `Acceso a ${target.title} · ${target.regions.join(' / ')}`
  }
  const label = reward.type === "token" ? "Acceso competitivo" : reward.type === "item" ? "Objeto" : "Recompensa"
  return `${label}: ${reward.value || "No especificada"}${reward.quantity !== null ? ` × ${formatMetric(reward.quantity)}` : ""}`
}

function Leaderboard({ session, board, status }: { session: TournamentSession; board: number; status: string }) {
  const [data, setData] = useState<TournamentLeaderboard | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [matchSelection, setMatchSelection] = useState<MatchSelection | null>(null)
  useEffect(() => {
    if (!data) return
    setMatchSelection(previous => {
      if (!previous) return previous
      const entry = data.entries.find(entry => entry.id === previous.entry.id)
      return entry ? { ...previous, entry, updatedAt: data.updatedAt } : previous
    })
  }, [data])
  useEffect(() => {
    if (status !== "live") return
    const timer = setInterval(() => setRevision(value => value + 1), 60000)
    return () => clearInterval(timer)
  }, [status])
  useEffect(() => {
    if (status === "upcoming" || !session.boards.length) return
    const controller = new AbortController()
    setLoading(true); setError(null); setData(null)
    const params = new URLSearchParams({ eventId: session.eventId, windowId: session.windowId, board: String(board), page: String(page), region: session.regions[0] || "EU" })
    fetchLocal<TournamentLeaderboard>(`/tournaments/leaderboard?${params}`, controller.signal).then(value => { if (!controller.signal.aborted) setData(value) })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudo cargar la clasificación.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session.eventId, session.windowId, session.boards.length, session.regions, board, page, revision, status])
  return <><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Tabla de posiciones</CardTitle><Button variant="outline" size="sm" disabled={loading || status === "upcoming" || !session.boards.length} onClick={() => setRevision(value => value + 1)}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div><CardDescription>{status === "live" ? "Se consulta automáticamente cada minuto. La fuente puede publicar los resultados con retraso." : "Resultados públicos de la clasificación seleccionada."}</CardDescription></CardHeader><CardContent className="space-y-4">
    {status === "upcoming" ? <p className="rounded-lg bg-muted/30 p-5 text-sm text-muted-foreground">La ronda todavía no ha comenzado. La clasificación estará disponible cuando la fuente publique resultados.</p> : !session.boards.length ? <p className="text-sm text-muted-foreground">No hay una clasificación publicada para esta sesión.</p> : <>
      {loading && <p role="status" className="text-sm text-muted-foreground">Cargando posiciones…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {data && <><p className="text-xs text-muted-foreground">Pulsa un puesto o jugador para ver sus partidas y promedios.</p><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Jugador / equipo</TableHead><TableHead>Puntos</TableHead><TableHead>Partidas</TableHead><TableHead>Victorias</TableHead><TableHead>Eliminaciones</TableHead></TableRow></TableHeader><TableBody>{data.entries.map((entry,index) => <TableRow key={`${entry.rank}-${index}`}><TableCell className={entry.rank !== null && entry.rank <= 3 ? "font-bold text-amber-400" : "text-muted-foreground"}><button type="button" className="font-inherit hover:underline focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Ver partidas del puesto ${entry.rank}`} onClick={() => setMatchSelection({ entry, playerName: entry.players.length === 1 ? entry.players[0].name : "", updatedAt: data.updatedAt })}>{formatMetric(entry.rank)}</button></TableCell><TableCell><div className="flex flex-wrap gap-x-2 gap-y-1">{entry.players.map((player,index) => player.name ? <button type="button" key={player.id || index} onClick={() => setMatchSelection({ entry, playerName: player.name, updatedAt: data.updatedAt })} className="text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Ver partidas de ${player.name}`}>{player.name}</button> : <span key={player.id || index} className="text-muted-foreground">Jugador privado</span>)}</div></TableCell><TableCell className="font-semibold tabular-nums">{formatMetric(entry.points)}</TableCell><TableCell>{formatMetric(entry.matches)}</TableCell><TableCell>{formatMetric(entry.wins)}</TableCell><TableCell>{formatMetric(entry.eliminations)}</TableCell></TableRow>)}</TableBody></Table>
        {!data.entries.length && <p className="p-6 text-center text-sm text-muted-foreground">La fuente todavía no publica posiciones para esta página.</p>}
        <div className="flex items-center justify-center gap-4"><Button variant="outline" size="sm" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}><ArrowLeft className="size-4" />Anterior</Button><span className="text-sm">Página {data.page + 1}{data.totalPages !== null ? ` de ${Math.max(1,data.totalPages)}` : ''}</span><Button variant="outline" size="sm" disabled={loading || !data.entries.length || page >= 100 || (data.totalPages !== null && page + 1 >= data.totalPages)} onClick={() => setPage(value => value + 1)}>Siguiente<ArrowRight className="size-4" /></Button></div>
        <p className="text-xs text-muted-foreground">Publicado: {formatTimestamp(data.updatedAt)} · Lima. Victorias y eliminaciones se calculan solo con las partidas publicadas del equipo. «—» indica un dato ausente. La paginación está limitada a lo que ofrece la fuente.</p>
      </>}
    </>}
  </CardContent></Card><TournamentPlayerMatches selection={matchSelection} tournament={session.title} onClose={() => setMatchSelection(null)} /></>
}

export function TournamentDetails({ session, sessions, now }: { session: TournamentSession; sessions: TournamentSession[]; now: number }) {
  const [board, setBoard] = useState(0)
  const selected = session.boards[board]
  const status = tournamentStatus(session, now)
  const placement = placementPoints(selected?.rules ?? [])
  const eliminationRule = resolveEliminationScoring(session.boards, board)
  const eliminations = eliminationRule?.points ?? null
  const requirements = session.requirements.map(value => typeof value === "string" ? requirementLabel(value) : [...new Set(value.map(requirementLabel))].join(" O "))
  const allPayouts = session.boards.flatMap((board,index) => board.payouts.map(table => ({ board, index, table })))
  return <div className="space-y-6">
    <div className="grid gap-5 rounded-xl border bg-card p-5 md:grid-cols-[200px_1fr]">
      {session.image && <img src={session.image} alt="" className="aspect-video w-full rounded-lg object-cover md:aspect-square" onError={event => { event.currentTarget.style.display = "none" }} />}
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-400">{session.regions.join(' / ')} · {status === 'live' ? 'En curso' : status === 'upcoming' ? 'Próximamente' : 'Finalizado'}</p><h1 className="text-2xl font-bold tracking-tight">{session.title}</h1><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[['Inicio (Lima)',formatTimestamp(session.startsAt)],['Fin (Lima)',formatTimestamp(session.endsAt)],['Ronda',session.round !== null ? String(session.round + 1) : 'No publicada'],['Máximo de partidas',formatMetric(session.matchCap)]].map(([label,value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl></div>
    </div>
    {session.description && <Card><CardHeader><CardTitle>Acerca del torneo</CardTitle></CardHeader><CardContent><p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{session.description}</p></CardContent></Card>}
    {session.boards.length > 1 && <div><label htmlFor="tournament-board" className="mr-3 text-sm font-medium">Clasificación y puntuación</label><select id="tournament-board" className="h-9 max-w-full rounded-lg border bg-background px-3 text-sm" value={board} onChange={event => setBoard(Number(event.target.value))}>{session.boards.map((item,index) => <option value={index} key={index}>{item.primary ? 'Clasificación de esta ronda' : `Clasificación adicional / acumulada ${index}`}</option>)}</select></div>}
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Requisitos de participación</CardTitle><CardDescription>Condiciones publicadas para esta ronda. Fortnite verifica la elegibilidad de cada cuenta.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm">
        <ul className="list-disc space-y-2 pl-4">{session.minimumLevel !== null && <li>Nivel de cuenta mínimo: <strong>{session.minimumLevel}</strong></li>}{[...new Set(requirements)].map((value,index) => <li key={index}>{value}</li>)}{session.allTokens.length > 0 && <li>Se requiere acceso o clasificación previa a esta fase.</li>}{session.anyTokens.length > 0 && <li>Debes cumplir al menos una de las vías de acceso publicadas.</li>}{session.excludedTokens.length > 0 && <li>La cuenta no debe tener las restricciones competitivas excluidas por el torneo.</li>}</ul>
        {session.platforms.length > 0 && <div><h3 className="font-medium">Plataformas admitidas</h3><p className="mt-1 break-words text-xs text-muted-foreground">{session.platforms.join(' · ')}</p></div>}
        {session.systemRequirements.length > 0 && <div><h3 className="font-medium">Seguridad del sistema, según plataforma</h3><p className="mt-1 text-xs text-muted-foreground">{session.systemRequirements.join(' · ')}</p></div>}
        {(session.allTokens.length > 0 || session.anyTokens.length > 0) && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Ver condiciones de acceso publicadas</summary>{session.allTokens.length > 0 && <p className="mt-2 break-all">Todas: {session.allTokens.join(' · ')}</p>}{session.anyTokens.length > 0 && <p className="mt-2 break-all">Alguna: {session.anyTokens.join(' · ')}</p>}</details>}
        {!requirements.length && session.minimumLevel === null && <p className="text-muted-foreground">La fuente no detalla los requisitos; consulta el reglamento oficial.</p>}
        <a href="https://www.fortnite.com/competitive/rules-guidelines" target="_blank" rel="noreferrer" className="inline-block underline">Consultar reglamentos oficiales</a>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Puntos por eliminación y posición</CardTitle><CardDescription>Se aplican las reglas de la clasificación seleccionada. Los umbrales por posición se acumulan cuando corresponde.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Puntos por kill</p><p className="text-2xl font-semibold">{eliminations === null ? 'Consulta las reglas de esta clasificación' : `${formatMetric(eliminations)} ${eliminations === 1 ? 'punto' : 'puntos'} por kill`}</p><p className="text-sm text-muted-foreground">Cada eliminación de cualquier integrante suma al marcador del equipo.{eliminations !== null && (!eliminationRule?.cap || eliminationRule.cap >= 4) ? ` Por ejemplo: 4 kills del equipo = ${formatMetric(4 * eliminations)} puntos por eliminaciones.` : ''}</p>{eliminationRule?.cap != null && <p className="text-xs text-muted-foreground">Esta regla puntúa hasta {eliminationRule.cap} kills por partida.</p>}</div>
        {placement.length ? <div className="max-h-80 overflow-y-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Posición en la partida</TableHead><TableHead>Puntos totales por posición</TableHead></TableRow></TableHeader><TableBody>{placement.map(row => <TableRow key={row.position}><TableCell>#{row.position}</TableCell><TableCell className="font-semibold">{formatMetric(row.points)}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="text-sm text-muted-foreground">La fuente no publica una tabla estándar de puntos por posición para esta clasificación.</p>}
        {selected && selected.rules.length > 0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Ver reglas de puntuación publicadas</summary><div className="mt-3 space-y-3">{selected.rules.map((rule,index) => <div key={index}><p className="break-all font-medium">{rule.stat}</p>{rule.tiers.map((tier,index) => <p key={index}>{rule.condition === 'lte' ? 'Hasta' : rule.condition === 'gte' ? 'Desde' : rule.condition === 'eq' ? 'Igual a' : rule.condition} {tier.threshold}: {tier.points} puntos{tier.multiplicative ? ' por múltiplo del umbral' : ''}</p>)}</div>)}</div></details>}
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Qué se gana</CardTitle><CardDescription>Premios y accesos publicados por la fuente para esta ronda y sus clasificaciones asociadas.</CardDescription></CardHeader><CardContent className="space-y-5">
      {!allPayouts.length && <p className="text-sm text-muted-foreground">No hay una tabla de recompensas publicada. Esto no confirma que el torneo no tenga premios o clasificación: revisa la descripción y el reglamento.</p>}
      {allPayouts.map(({ board, index, table }, tableIndex) => <div key={tableIndex}><h3 className="mb-2 text-sm font-medium">{board.primary ? 'Clasificación de esta ronda' : `Clasificación adicional / acumulada ${index}`}</h3><Table><TableHeader><TableRow><TableHead>{table.scoringType === 'rank' ? 'Puesto final' : `Umbral · ${table.scoringType}`}</TableHead><TableHead>Premio o acceso</TableHead></TableRow></TableHeader><TableBody>{table.ranks.map((rank,index) => {
        const first = index ? table.ranks[index-1].threshold + 1 : 1
        return <TableRow key={index}><TableCell>{table.scoringType === 'rank' ? (first === rank.threshold ? `#${rank.threshold}` : `#${first}–${rank.threshold}`) : rank.threshold}</TableCell><TableCell><ul className="space-y-1">{rank.rewards.map((reward,index) => <li key={index} className="break-words">{rewardLabel(reward,sessions,session.regions)}</li>)}</ul></TableCell></TableRow>
      })}</TableBody></Table></div>)}
      <p className="text-xs leading-relaxed text-muted-foreground">Los importes son los publicados por puesto; consulta el reglamento para saber cómo se reparten entre jugadores. PR es un rating de rendimiento competitivo, no una cantidad fija de puntos por puesto. <a href="https://www.fortnite.com/competitive/power-rankings-information" target="_blank" rel="noreferrer" className="underline">Cómo funciona PR</a>.</p>
    </CardContent></Card>
    <Leaderboard key={`${session.eventId}:${session.windowId}:${board}`} session={session} board={board} status={status} />
  </div>
}

