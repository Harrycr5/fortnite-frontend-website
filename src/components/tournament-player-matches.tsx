import { Link } from "react-router-dom"
import type { TournamentEntry } from "@/types/tournaments.types"
import { summarizeTournamentMatches, formatAliveTime } from "@/lib/tournaments"
import { formatMetric, formatTimestamp } from "@/lib/analytics"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table"

export interface MatchSelection { entry: TournamentEntry; playerName: string; updatedAt: string | null }

export function TournamentPlayerMatches({ selection, tournament, onClose }: { selection: MatchSelection | null; tournament: string; onClose: () => void }) {
  const entry = selection?.entry
  const history = entry?.matchHistory ?? []
  const averages = summarizeTournamentMatches(history)
  const team = (entry?.players.length ?? 0) > 1
  const title = selection?.playerName || entry?.players.map(player => player.name || "Jugador privado").join(" / ") || "Equipo"
  return <Sheet open={!!selection} onOpenChange={open => { if (!open) onClose() }}><SheetContent className="w-full! overflow-y-auto sm:max-w-3xl!">{selection && entry && <>
    <SheetHeader className="pr-12"><SheetTitle>Partidas de {title}</SheetTitle><SheetDescription>{tournament} · Puesto #{formatMetric(entry.rank)} · {formatMetric(entry.points)} puntos</SheetDescription></SheetHeader>
    <div className="space-y-6 px-4 pb-8">
      {team && <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3 text-sm text-muted-foreground">Los datos publicados corresponden al equipo: {entry.players.map(player => player.name || "Jugador privado").join(" · ")}. Las eliminaciones y el tiempo con vida no se atribuyen a un miembro concreto.</div>}
      <div className="grid gap-3 sm:grid-cols-3">{[
        { label: team ? "Promedio de kills del equipo" : "Promedio de kills", value: formatMetric(averages.eliminations.value), count: averages.eliminations.samples },
        { label: "Posición media", value: averages.placement.value === null ? "—" : `#${formatMetric(averages.placement.value)}`, count: averages.placement.samples },
        { label: "Tiempo con vida medio", value: formatAliveTime(averages.aliveSeconds.value), count: averages.aliveSeconds.samples },
      ].map(metric => <div key={metric.label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.count} partidas con ese dato{metric.label.includes("Tiempo") ? " · min:s" : ""}</p></div>)}</div>
      <div><h3 className="mb-3 font-semibold">Desglose de partidas ({history.length})</h3>{history.length ? <Table><TableHeader><TableRow><TableHead>Partida</TableHead><TableHead>Finalizada (Lima)</TableHead><TableHead>{team ? "Kills del equipo" : "Kills"}</TableHead><TableHead>Posición</TableHead><TableHead>Tiempo con vida (min:s)</TableHead></TableRow></TableHeader><TableBody>{history.map((match,index) => <TableRow key={match.id}><TableCell>{index + 1}</TableCell><TableCell>{formatTimestamp(match.endedAt)}</TableCell><TableCell className="tabular-nums">{formatMetric(match.eliminations)}</TableCell><TableCell className={match.placement === 1 ? "font-semibold text-amber-400" : ""}>{match.placement === null ? "—" : `#${match.placement}`}</TableCell><TableCell className="tabular-nums">{formatAliveTime(match.aliveSeconds)}</TableCell></TableRow>)}</TableBody></Table> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">La fuente todavía no publica el historial de partidas de este participante.</p>}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">El tiempo mostrado es el tiempo con vida publicado, no la duración total de la sala. Los promedios se calculan solo con los valores disponibles; «—» indica que no se publicó el dato. No se incluyen partidas que todavía no aparecen en la clasificación.</p>
      <p className="text-xs text-muted-foreground">Clasificación publicada: {formatTimestamp(selection.updatedAt)} · Lima.</p>
      {selection.playerName && <Link className="inline-block text-sm underline" to={`/?${new URLSearchParams({ name: selection.playerName, accountType: "epic", timeWindow: "season" })}`}>Ver perfil general de {selection.playerName}</Link>}
    </div>
  </>}</SheetContent></Sheet>
}
