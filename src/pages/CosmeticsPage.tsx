import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Package, RefreshCw, Search, Sparkles } from "lucide-react"
import { getCosmetics } from "@/services/cosmetics.service"
import type { Cosmetic, CosmeticsResponse } from "@/types/cosmetics.types"
import { formatMetric, formatTimestamp } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

const categories: Record<string, string> = { all: "Todos", br: "Battle Royale", cars: "Rocket Racing", tracks: "Canciones", instruments: "Instrumentos", lego: "Estilos LEGO", legoKits: "Construcciones LEGO", beans: "Fall Guys" }
const colors: Record<string, string> = { common: '#536274', uncommon: '#278a59', rare: '#2675c4', epic: '#8851be', legendary: '#c67f29', mythic: '#b69630', exotic: '#36a4a3', icon: '#249eaa', marvel: '#c64851', dc: '#3679bf', gaminglegends: '#6345bc', starwars: '#d94b52', frozen: '#77bdd8', lava: '#ca5437', dark: '#a146b1', slurp: '#39b8af', shadow: '#667080' }

function CosmeticImage({ item, large = false }: { item: Cosmetic; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  const source = large ? item.image : item.thumbnail
  return <div className="flex aspect-square items-center justify-center overflow-hidden" style={{ background: `radial-gradient(ellipse at top, ${colors[item.rarity] || '#34466c'}80, #171c28)` }}>
    {source && !failed ? <img src={source} alt={item.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" onError={() => setFailed(true)} /> : <Package className="size-10 text-white/40" aria-label="Imagen no disponible" />}
  </div>
}

function CosmeticDetails({ item }: { item: Cosmetic }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const source = preview || item.image
  return <>
    <SheetHeader className="pr-12"><SheetTitle>{item.name}</SheetTitle><SheetDescription>{categories[item.category]} · {item.typeLabel}</SheetDescription></SheetHeader>
    <div className="space-y-5 px-4 pb-8">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl" style={{ background: `radial-gradient(ellipse at top, ${colors[item.rarity] || '#34466c'}80, #171c28)` }}>{source && !failed ? <img src={source} alt={item.name} className="h-full w-full object-contain" onError={() => setFailed(true)} /> : <Package className="size-12 text-muted-foreground" />}</div>
      <div className="flex flex-wrap gap-2">{item.rarityLabel && <Badge variant="secondary">{item.rarityLabel}</Badge>}{item.series && <Badge variant="outline">{item.series}</Badge>}</div>
      {item.description && <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
      <dl className="space-y-3 text-sm">{[["Conjunto", item.set], ["Introducción", item.introduction], ["Artista", item.artist], ["Añadido al catálogo (Lima)", item.added ? formatTimestamp(item.added) : "Fecha no publicada"], ["Identificador", item.id]].filter(([,value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
      {item.variants.length > 0 && <div className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Estilos y variantes</h3>{preview && <Button size="sm" variant="ghost" onClick={() => { setPreview(null); setFailed(false) }}>Imagen original</Button>}</div>{item.variants.map((variant, index) => <div key={index}><h4 className="mb-2 text-sm text-muted-foreground">{variant.type}</h4><div className="flex flex-wrap gap-2">{variant.options.map((option, i) => <button type="button" key={i} title={option.name} disabled={!option.image} aria-pressed={preview !== null && preview === option.image} onClick={() => { setPreview(option.image); setFailed(false) }} className={`flex w-20 flex-col items-center overflow-hidden rounded-lg border bg-muted/30 p-1 text-xs focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default ${preview && preview === option.image ? 'border-primary' : 'border-border'}`}>
        {option.image && <img src={option.image} alt="" loading="lazy" className="aspect-square w-full object-contain" onError={event => { event.currentTarget.style.visibility = "hidden" }} />}<span className="w-full truncate p-1">{option.name}</span>
      </button>)}</div></div>)}</div>}
      <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">Aparecer en este catálogo no implica que el artículo esté disponible para comprar hoy. Las imágenes y los estilos publicados dependen de Fortnite-API.</p>
    </div>
  </>
}

export default function CosmeticsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<CosmeticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<Cosmetic | null>(null)
  const category = params.get('category') || 'all'
  const query = params.get('q') || ''
  const type = params.get('type') || ''
  const rarity = params.get('rarity') || ''
  const sort = params.get('sort') || 'newest'
  const page = params.get('page') || '1'
  const requestKey = new URLSearchParams({ category, q: query, type, rarity, sort, page }).toString()
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      getCosmetics(new URLSearchParams(requestKey), controller.signal).then(result => { if (!controller.signal.aborted) setData(result) })
        .catch((err: unknown) => { if (!controller.signal.aborted) { setData(null); setError(err instanceof Error ? err.message : "No se pudieron cargar los cosméticos.") } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [requestKey, revision])
  const update = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    if (key === 'category') { next.delete('type'); next.delete('rarity') }
    setParams(next, { replace })
  }
  const selectClass = "h-9 w-full rounded-lg border bg-background px-3 text-sm"
  return <main className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fortnite / Cosméticos</p><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Sparkles className="size-7 text-sky-400" />Tu próximo estilo empieza aquí.</h1><p className="mt-2 text-sm text-muted-foreground">Explora trajes, gestos, vehículos, música y estilos de todo el universo Fortnite.</p></div><Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías de cosméticos">{Object.entries(categories).map(([value,label]) => <Button key={value} size="sm" variant={category === value ? 'default' : 'outline'} aria-pressed={category === value} onClick={() => update('category', value)}>{label}<span className="ml-1 opacity-60">{data ? formatMetric(value === 'all' ? data.catalogTotal : data.categories.find(item => item.value === value)?.count) : ''}</span></Button>)}</div>
    <div className="space-y-4 rounded-xl border bg-card p-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div><label htmlFor="cosmetic-query" className="mb-2 block text-sm font-medium">Buscar en todo el catálogo</label><div className="relative"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input id="cosmetic-query" className="pl-9" placeholder="Nombre, conjunto, artista o ID…" maxLength={100} value={query} onChange={event => update('q', event.target.value, true)} /></div></div>
      <div><label htmlFor="cosmetic-type" className="mb-2 block text-sm font-medium">Tipo de artículo</label><select id="cosmetic-type" className={selectClass} value={type} onChange={event => update('type', event.target.value)}><option value="">Todos los tipos</option>{data?.types.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      <div><label htmlFor="cosmetic-rarity" className="mb-2 block text-sm font-medium">Rareza / serie</label><select id="cosmetic-rarity" className={selectClass} value={rarity} onChange={event => update('rarity', event.target.value)}><option value="">Todas las rarezas</option>{data?.rarities.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      <div><label htmlFor="cosmetic-sort" className="mb-2 block text-sm font-medium">Ordenar</label><select id="cosmetic-sort" className={selectClass} value={sort} onChange={event => update('sort', event.target.value)}><option value="newest">Añadidos recientemente</option><option value="oldest">Más antiguos</option><option value="name">Nombre A–Z</option></select></div>
    </div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Catálogo completo: incluye artículos que no están actualmente en la tienda.</p><Button size="sm" variant="ghost" onClick={() => setParams({})}>Limpiar filtros</Button></div></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Consultando cosméticos…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Reintentar</Button></div>}
    <div id="cosmetics-results" aria-busy={loading} className={loading && data ? 'space-y-4 opacity-50' : 'space-y-4'}>
      {data && <p aria-live="polite" className="text-sm text-muted-foreground">{formatMetric(data.total)} resultados · Página {data.page} de {Math.max(1, data.totalPages)}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{data?.items.map(item => <button type="button" key={`${item.category}:${item.id}`} className="group overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" onClick={() => setSelected(item)} aria-label={`Ver detalles de ${item.name}`}>
        <CosmeticImage item={item} /><div className="space-y-1 p-3"><p className="truncate text-[11px] text-muted-foreground">{categories[item.category]} · {item.typeLabel}</p><h2 className="line-clamp-2 min-h-10 text-sm font-semibold">{item.name}</h2><p className="truncate text-xs text-muted-foreground">{item.rarityLabel || item.artist || item.series || item.typeLabel}</p></div>
      </button>)}</div>
      {!loading && data && !data.items.length && <div className="rounded-xl border border-dashed p-12 text-center"><Package className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">No encontramos cosméticos con esos filtros.</h2><Button className="mt-4" variant="outline" onClick={() => setParams({})}>Ver todos los cosméticos</Button></div>}
      {data && data.totalPages > 1 && <nav aria-label="Páginas de cosméticos" className="flex items-center justify-center gap-4"><Button variant="outline" disabled={loading || data.page <= 1} onClick={() => update('page', String(data.page - 1))}><ArrowLeft className="size-4" />Anterior</Button><span className="text-sm tabular-nums">{data.page} / {data.totalPages}</span><Button variant="outline" disabled={loading || data.page >= data.totalPages} onClick={() => update('page', String(data.page + 1))}>Siguiente<ArrowRight className="size-4" /></Button></nav>}
    </div>
    {data && <p className="text-xs text-muted-foreground">Catálogo consultado: {formatTimestamp(data.fetchedAt)} · Lima. <a href="https://dash.fortnite-api.com/endpoints/cosmetics" target="_blank" rel="noreferrer" className="underline">Datos e imágenes: Fortnite-API</a>.</p>}
    <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}><SheetContent className="w-full! overflow-y-auto sm:max-w-lg!">{selected && <CosmeticDetails key={`${selected.category}:${selected.id}`} item={selected} />}</SheetContent></Sheet>
  </main>
}
