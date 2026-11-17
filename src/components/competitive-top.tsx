import { useEffect, useState } from "react"
import { ExternalLink, Trophy } from "lucide-react"
import { getCompetitiveRanking } from "@/services/analytics.service"
import type { CompetitiveRanking } from "@/types/analytics.types"
import { formatMetric, formatTimestamp } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function CompetitiveTop({ onSelect }: { onSelect: (name: string) => void }) {
  const [data, setData] = useState<CompetitiveRanking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    getCompetitiveRanking(controller.signal).then(value => { if (!controller.signal.aborted) setData(value) })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudo cargar el ranking.") })
    return () => controller.abort()
  }, [revision])
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-amber-400" />Top 10 competitivo · Global</CardTitle><CardDescription>Power Rankings: rendimiento competitivo ponderado. El K/D por sí solo no determina quién es profesional.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {error ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>Reintentar</Button></div> : !data ? <p role="status" className="text-sm text-muted-foreground">Cargando ranking…</p> : <>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-muted-foreground"><p className="mb-1 font-medium text-foreground">Epic Games · Consultado: {formatTimestamp(data.fetchedAt)} · Lima</p>{data.notice}</div>
        <Table><TableHeader><TableRow><TableHead>Puesto</TableHead><TableHead>Jugador</TableHead><TableHead className="text-right">Rating PR</TableHead><TableHead><span className="sr-only">Consultar perfil</span></TableHead></TableRow></TableHeader><TableBody>{data.players.map(player => <TableRow key={player.rank}><TableCell className={player.rank <= 3 ? "font-bold text-amber-400" : "text-muted-foreground"}>#{player.rank}</TableCell><TableCell className="font-medium">{player.name}</TableCell><TableCell className="text-right tabular-nums">{formatMetric(player.rating)}</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => onSelect(player.name)} aria-label={`Ver perfil de ${player.name}`}>Ver perfil</Button></TableCell></TableRow>)}</TableBody></Table>
        
      </>}
      <a className="inline-flex items-center gap-1 text-xs text-muted-foreground underline" href="https://www.fortnite.com/competitive/power-rankings" target="_blank" rel="noreferrer">Ver ranking en Epic Games<ExternalLink className="size-3" /></a>
    </CardContent>
  </Card>
}

