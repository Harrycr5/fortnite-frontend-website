import { useEffect, useState, type FormEvent } from "react"
import { Search, Trophy, Crosshair, Target, Swords, UserRound, ArrowLeft } from "lucide-react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { playerSearchParams, readPlayerSearch } from "@/lib/player-navigation"
import { useStats } from "@/hooks/useStats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { CompetitiveTop } from "@/components/competitive-top"
const format = (value: number) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value)

export default function StatsPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  return <StatsView key={location.key} initial={readPlayerSearch(params)}
    onSearch={(name, platform, period) => {
      const next = playerSearchParams(name, platform, period)

      setParams(next, { state: { fromProfiles: !params.get("name") } })
    }}
    onBack={() => location.state?.fromProfiles ? navigate(-1) : navigate("/", { replace: true })} />
}

function StatsView({ initial, onSearch, onBack }: {
  initial: ReturnType<typeof readPlayerSearch>
  onSearch: (name: string, accountType: string, timeWindow: string) => void
  onBack: () => void
}) {
  const [username, setUsername] = useState(initial.name)
  const [accountType, setAccountType] = useState(initial.accountType)
  const [timeWindow, setTimeWindow] = useState(initial.timeWindow)
  const { stats, loading, error, searchPlayer } = useStats()
  useEffect(() => {
    if (initial.name) void searchPlayer(initial.name, initial.accountType, initial.timeWindow)
  }, [initial.name, initial.accountType, initial.timeWindow, searchPlayer])
  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    if (username.trim()) onSearch(username, accountType, timeWindow)
  }
  const overall = stats?.stats.all.overall
  const metrics = [
    { label: "Victorias", value: overall?.wins, icon: Trophy },
    { label: "Eliminaciones", value: overall?.kills, icon: Crosshair },
    { label: "Ratio K/D", value: overall?.kd, icon: Swords },
    { label: "Tasa de victoria", value: overall?.winRate, suffix: "%", icon: Target },
  ]
  return <main className="mx-auto max-w-6xl space-y-6">
    {initial.name && <Button variant="ghost" onClick={onBack}><ArrowLeft className="size-4" />Volver al ranking</Button>}
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fortnite / Estadísticas</p><h1 className="text-3xl font-semibold tracking-tight">Cada perfil cuenta una historia.</h1><p className="mt-2 text-sm text-muted-foreground">Busca un jugador y explora su rendimiento, victorias y modalidades favoritas.</p></div>
    <Card><CardHeader><CardTitle>Buscar un perfil</CardTitle><CardDescription>Introduce el nombre exacto del jugador y selecciona su plataforma.</CardDescription></CardHeader><CardContent>
      <form onSubmit={handleSearch} className="grid items-end gap-4 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="space-y-2"><label htmlFor="player" className="text-sm font-medium">Nombre del jugador</label><Input id="player" placeholder="Nombre de Epic Games…" required maxLength={100} value={username} onChange={e => setUsername(e.target.value)} /></div>
        <div className="space-y-2"><label htmlFor="platform" className="text-sm font-medium">Plataforma</label><select id="platform" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={accountType} onChange={e => setAccountType(e.target.value)}><option value="epic">Epic Games</option><option value="psn">PlayStation</option><option value="xbl">Xbox</option></select></div>
        <div className="space-y-2"><label htmlFor="period" className="text-sm font-medium">Periodo de estadísticas generales</label><select id="period" className="h-9 w-full rounded-lg border bg-background px-3 text-sm disabled:opacity-50" value={timeWindow} onChange={e => setTimeWindow(e.target.value)}><option value="lifetime">Todo el historial</option><option value="season">Temporada actual</option></select></div>
        <Button type="submit" disabled={!username.trim()}><Search className="size-4" />Ver perfil</Button>
      </form>
    </CardContent></Card>
    <section className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {!initial.name && <CompetitiveTop onSelect={name => onSearch(name, "epic", "season")} />}
      <div aria-live="polite" aria-busy={loading}>
      {loading ? <div role="status" className="rounded-xl border p-12 text-center text-sm text-muted-foreground">Consultando las estadísticas del jugador…</div> : stats ? <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-muted p-3"><UserRound className="size-6" /></span><div><h2 className="text-xl font-semibold">{stats.account.name}</h2><p className="text-sm text-muted-foreground">{overall ? `${format(overall.matches)} partidas registradas` : "Sin estadísticas generales disponibles"}</p></div></div><div className="text-sm"><span className="text-muted-foreground">Pase de batalla · </span>Nivel {stats.battlePass.level}<p className="text-xs text-muted-foreground">Progreso del nivel: {stats.battlePass.progress}%</p></div></div>
        <p className="text-xs text-muted-foreground">Estadísticas generales de cuenta para el periodo elegido; la fuente no garantiza que excluyan partidas de torneos. Los resultados competitivos se consultan por separado.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, suffix, icon: Icon }) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between"><CardDescription>{label}</CardDescription><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold tabular-nums">{value == null ? "—" : `${format(value)}${suffix ?? ""}`}</p></CardContent></Card>)}</div>
        <Card><CardHeader><CardTitle>Rendimiento por modalidad</CardTitle><CardDescription>Compara los resultados del periodo seleccionado.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Modalidad</TableHead><TableHead>Partidas</TableHead><TableHead>Victorias</TableHead><TableHead>Eliminaciones</TableHead><TableHead>K/D</TableHead><TableHead>Victorias %</TableHead></TableRow></TableHeader><TableBody>{([['solo', 'Solitario'], ['duo', 'Dúos'], ['trio', 'Tríos'], ['squad', 'Escuadrones']] as const).map(([key, label]) => { const mode = stats.stats.all[key]; return <TableRow key={key}><TableCell className="font-medium">{label}</TableCell>{mode ? [mode.matches, mode.wins, mode.kills, mode.kd, mode.winRate].map((value, i) => <TableCell key={i}>{format(value)}{i === 4 ? '%' : ''}</TableCell>) : <TableCell colSpan={5} className="text-muted-foreground">Sin datos disponibles</TableCell>}</TableRow> })}</TableBody></Table></CardContent></Card>
      </div> : !error && <div className="rounded-xl border border-dashed px-6 py-12 text-center"><h2 className="font-semibold">Tu próximo análisis empieza aquí</h2><p className="mt-2 text-sm text-muted-foreground">Busca un perfil para ver sus estadísticas por modalidad.</p></div>}
      </div>
    </section>
  </main>
}

