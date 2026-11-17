import { useEffect, useMemo, useState } from "react"
import { Gift, Package, RefreshCw, Search, ShoppingBag, Shirt, Music, Pickaxe, Backpack, Wind, PawPrint, Footprints, Paintbrush, PackageOpen, Car, Sticker, Circle, Flame, Zap, Guitar, Blocks, Lamp, type LucideIcon } from "lucide-react"
import { getShop } from "@/services/shop.service"
import type { ShopData, ShopEntry } from "@/types/shop.types"
import { compareShopOrder, groupShopEntries, matchesShopFilter, shopFilterGroups, type ShopFilter, getShopCategories, getShopImage, getShopItems, getShopName, getShopSection, shopColor } from "@/lib/shop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { lazy, Suspense } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

const ShopCash = lazy(() => import("@/components/shop-cash").then(module => ({ default: module.ShopCash })))
const number = new Intl.NumberFormat("es-PE")
const date = (value?: string) => {
  if (!value || !Number.isFinite(Date.parse(value))) return "No disponible"
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value))
}
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const filterIcons: Record<ShopFilter, LucideIcon> = {
  outfit: Shirt, emote: Music, pickaxe: Pickaxe, backpack: Backpack, glider: Wind,
  sidekick: PawPrint, shoe: Footprints, wrap: Paintbrush, bundle: PackageOpen,
  body: Car, skin: Sticker, wheel: Circle, trail: Flame, boost: Zap,
  track: Music, instrument: Guitar, build: Blocks, decor: Lamp,
}

function OfferImage({ entry, className = "" }: { entry: ShopEntry; className?: string }) {
  const [failed, setFailed] = useState(false)
  const image = getShopImage(entry)
  return <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: `linear-gradient(145deg, ${shopColor(entry.colors?.color1)}, ${shopColor(entry.colors?.color3)})` }}>
    {image && !failed ? <img src={image} alt={getShopName(entry)} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" onError={() => setFailed(true)} /> : <Package className="size-12 text-white/60" aria-label="Imagen no disponible" />}
  </div>
}

function Price({ entry }: { entry: ShopEntry }) {
  return <span className="flex flex-wrap items-baseline gap-2 tabular-nums"><span className="font-semibold">{number.format(entry.finalPrice)} <span className="text-xs font-normal">paVos</span></span>{entry.regularPrice > entry.finalPrice && <del className="text-xs text-muted-foreground">{number.format(entry.regularPrice)}</del>}</span>
}

export default function ShopPage() {
  const [shop, setShop] = useState<ShopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<ShopFilter | null>(null)
  const [section, setSection] = useState("")
  const [sort, setSort] = useState("section")
  const [discountOnly, setDiscountOnly] = useState(false)
  const [selected, setSelected] = useState<ShopEntry | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getShop(controller.signal).then(result => {
      if (!controller.signal.aborted) setShop(result.data)
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudo cargar la tienda.")
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [reload])

  const entries = useMemo(() => [...new Map((shop?.entries ?? []).map(entry => [entry.offerId, entry])).values()], [shop])
  const filterCounts = useMemo(() => new Map(shopFilterGroups.flatMap(group => group.filters.map(filter => [filter.id, entries.filter(entry => matchesShopFilter(entry, filter.id)).length] as const))), [entries])
  const sections = useMemo(() => [...new Set(entries.map(getShopSection))].sort((a, b) => a.localeCompare(b, 'es')), [entries])
  const filtered = useMemo(() => {
    const search = normalize(query.trim())
    return entries.filter(entry => (!activeFilter || matchesShopFilter(entry, activeFilter))
      && (!section || getShopSection(entry) === section)
      && (!discountOnly || entry.finalPrice < entry.regularPrice)
      && (!search || normalize([getShopName(entry), getShopSection(entry), ...getShopItems(entry).flatMap(item => [item.name, item.title, item.artist, item.type?.displayValue])].filter(Boolean).join(" ")).includes(search)))
      .sort((a, b) => sort === "price-asc" ? a.finalPrice - b.finalPrice : sort === "price-desc" ? b.finalPrice - a.finalPrice : sort === "name" ? getShopName(a).localeCompare(getShopName(b), 'es') : compareShopOrder(a, b))
  }, [entries, activeFilter, section, discountOnly, query, sort])
  const groups = useMemo(() => sort === "section" ? groupShopEntries(filtered) : [{ id: "results", name: "Resultados", entries: filtered }], [filtered, sort])
  const reset = () => { setQuery(""); setActiveFilter(null); setSection(""); setDiscountOnly(false); setSort("section") }
  const selectClass = "h-9 w-full rounded-lg border bg-background px-3 text-sm"

  return <main className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fortnite / Tienda</p><h1 className="text-3xl font-semibold tracking-tight">Explora la tienda.</h1><p className="mt-2 text-sm text-muted-foreground">Descubre cosméticos, lotes y música. Encuentra lo que va contigo.</p></div><Button variant="outline" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div>
    {shop && <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm"><span><strong>{entries.length}</strong> ofertas</span><span><strong>{entries.filter(entry => entry.finalPrice < entry.regularPrice).length}</strong> con descuento</span><span className="text-muted-foreground">Actualización de la API: {date(shop.date)} · hora de Lima</span></div>}
    <div className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-2"><label htmlFor="shop-search" className="text-sm font-medium">Buscar</label><div className="relative"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input id="shop-search" className="pl-9" placeholder="Nombre, artista o tipo…" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
        <div className="space-y-2"><label htmlFor="shop-section" className="text-sm font-medium">Sección</label><select id="shop-section" className={selectClass} value={section} onChange={event => setSection(event.target.value)}><option value="">Todas las secciones</option>{sections.map(value => <option key={value}>{value}</option>)}</select></div>
        <div className="space-y-2"><label htmlFor="shop-sort" className="text-sm font-medium">Ordenar</label><select id="shop-sort" className={selectClass} value={sort} onChange={event => setSort(event.target.value)}><option value="section">Orden de la tienda</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option><option value="name">Nombre A–Z</option></select></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={discountOnly} onChange={event => setDiscountOnly(event.target.checked)} />Solo ofertas con descuento</label><Button variant="ghost" size="sm" onClick={reset}>Limpiar filtros</Button></div>
      <div className="border-t pt-4">
        <Button variant={activeFilter === null ? "default" : "outline"} size="sm" aria-pressed={activeFilter === null} onClick={() => setActiveFilter(null)}>Todos los artículos <span className="opacity-65">{entries.length}</span></Button>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{shopFilterGroups.map(group => <fieldset key={group.label} className="min-w-0"><legend className="mb-2 text-xs font-bold uppercase italic tracking-wide text-muted-foreground">{group.label}</legend><div className="grid grid-cols-2 gap-2">{group.filters.map(filter => {
          const Icon = filterIcons[filter.id]
          const count = filterCounts.get(filter.id) ?? 0
          return <button key={filter.id} type="button" aria-pressed={activeFilter === filter.id} onClick={() => setActiveFilter(value => value === filter.id ? null : filter.id)} className={`flex min-h-10 items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${activeFilter === filter.id ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-muted hover:border-border hover:bg-accent"}`}><Icon className="size-4 shrink-0" /><span className="min-w-0 break-words">{filter.label}</span><span className="ml-auto text-[10px] opacity-60">{count}</span></button>
        })}</div></fieldset>)}</div>
      </div>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)} disabled={loading}>Reintentar</Button></div>}
    {loading && <p role="status" className="py-4 text-sm text-muted-foreground">Cargando tienda…</p>}
    {!loading && shop && <p role="status" className="text-sm text-muted-foreground">Mostrando todas las ofertas encontradas: {filtered.length}</p>}
    {groups.filter(group => group.entries.length > 0).map(group => <section key={group.id} aria-label={group.name} className="space-y-4">
    <div className="flex items-center gap-3"><h2 className="text-xl font-bold tracking-tight">{group.name}</h2><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{group.entries.length}</span><div className="h-px flex-1 bg-border" /></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{group.entries.map(entry => <button type="button" key={entry.offerId} className="group overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" onClick={() => setSelected(entry)} aria-label={`Ver detalles de ${getShopName(entry)}`}>
      <div className="relative"><OfferImage entry={entry} className="aspect-square" />{entry.banner?.value && <span className="absolute top-2 left-2 max-w-[90%] rounded-md bg-black/75 px-2 py-1 text-[11px] font-medium text-white">{entry.banner.value}</span>}</div>
      <div className="space-y-2 p-3"><p className="truncate text-xs text-muted-foreground">{getShopSection(entry)}</p><h3 className="line-clamp-2 min-h-10 text-sm font-semibold">{getShopName(entry)}</h3><Price entry={entry} /><p className="truncate text-xs text-muted-foreground">{entry.bundle ? "Lote · " : ""}{getShopCategories(entry).join(" / ")}</p></div>
    </button>)}</div></section>)}
    {!loading && !error && filtered.length === 0 && <div className="rounded-xl border border-dashed p-12 text-center"><ShoppingBag className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">No hay ofertas para mostrar</h2><p className="mt-2 text-sm text-muted-foreground">Prueba con otro nombre o elimina los filtros.</p><Button className="mt-4" variant="outline" onClick={reset}>Limpiar filtros</Button></div>}
    <p className="text-xs text-muted-foreground">Los artículos anteriores se muestran en paVos. Consulta disponibilidad y compra dentro de Fortnite.</p>
    <Suspense fallback={<p role="status">Cargando paquetes en dinero…</p>}><ShopCash query={query} discountOnly={discountOnly} revision={reload} /></Suspense>
    <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}><SheetContent className="w-full! overflow-y-auto sm:max-w-lg!">{selected && <>
      <SheetHeader className="pr-14"><SheetTitle>{getShopName(selected)}</SheetTitle><SheetDescription>{getShopSection(selected)} · {getShopCategories(selected).join(" / ")}</SheetDescription></SheetHeader>
      <div className="space-y-5 px-4 pb-8"><OfferImage key={selected.offerId} entry={selected} className="aspect-square rounded-xl" /><Price entry={selected} />
        {selected.offerTag?.text && <p className="text-sm text-muted-foreground">{selected.offerTag.text}</p>}
        <div className="flex flex-wrap gap-2">{selected.bundle && <Badge variant="secondary">Lote</Badge>}{selected.giftable && <Badge variant="secondary"><Gift className="mr-1 size-3" />Se puede regalar</Badge>}{typeof selected.refundable === "boolean" && <Badge variant="outline">{selected.refundable ? "Reembolsable según condiciones" : "No reembolsable según la API"}</Badge>}</div>
        <dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Disponible desde (Lima)</dt><dd>{date(selected.inDate)}</dd></div><div><dt className="text-muted-foreground">Salida prevista (Lima)</dt><dd>{date(selected.outDate)}</dd></div></dl>
        <div><h3 className="mb-3 font-semibold">Contenido de la oferta ({getShopItems(selected).length})</h3><ul className="space-y-3">{getShopItems(selected).map((item, index) => <li key={`${item.id}-${index}`} className="rounded-lg border p-3"><p className="text-sm font-medium">{item.name || item.title || "Artículo"}</p><p className="mt-1 text-xs text-muted-foreground">{[item.type?.displayValue, item.rarity?.displayValue, item.artist].filter(Boolean).join(" · ")}</p>{item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}</li>)}</ul></div>
      </div>
    </>}</SheetContent></Sheet>
  </main>
}
