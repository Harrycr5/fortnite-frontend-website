import { useEffect, useState } from "react"
import { Banknote, ExternalLink, Package } from "lucide-react"
import { fetchLocal } from "@/services/analytics.service"
import type { CashOffer, CashShop } from "@/types/extended.types"
import { formatTimestamp } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

export function cashPrice(offer: CashOffer, original = false) {
  const amount = original ? offer.originalPrice : offer.price
  if (amount === null || !offer.currency) return "Precio no publicado"
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: offer.currency }).format(amount)
}

export function ShopCash({ query, discountOnly, revision }: { query: string; discountOnly: boolean; revision: number }) {
  const [country, setCountry] = useState("PE")
  const [data, setData] = useState<CashShop | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<CashOffer | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null); setData(null); setSelected(null)
    fetchLocal<CashShop>(`/shop/cash?country=${country}`, controller.signal).then(result => { if (!controller.signal.aborted) setData(result) })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudieron cargar los paquetes.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [country, revision, retry])
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const offers = data?.offers.filter(offer => normalized(`${offer.title} ${offer.description}`).includes(normalized(query.trim())) && (!discountOnly || (offer.price !== null && offer.originalPrice !== null && offer.price < offer.originalPrice))) ?? []
  return <section id="cash-shop" className="scroll-mt-6 space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold"><Banknote className="size-5 text-emerald-400" />Paquetes en dinero</h2><p className="mt-1 text-xs text-muted-foreground">Precios regionales de Epic Games Store. Los filtros por tipo y sección de arriba corresponden a los artículos en paVos.</p></div><div><label htmlFor="cash-country" className="mr-2 text-sm">País del precio</label><select id="cash-country" value={country} onChange={event => setCountry(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">{[['PE','Perú'],['US','Estados Unidos'],['ES','España'],['MX','México'],['AR','Argentina'],['CL','Chile'],['CO','Colombia'],['BR','Brasil']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">Cargando paquetes y precios regionales…</p>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border p-4 text-sm"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Reintentar</Button></div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{offers.map(offer => <button type="button" key={offer.id} className="overflow-hidden rounded-xl border bg-card text-left focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setSelected(offer)}><div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">{offer.image ? <img src={offer.image} alt={offer.title} loading="lazy" className="h-full w-full object-contain" onError={event => { event.currentTarget.style.visibility = "hidden" }} /> : <Package className="size-10 text-muted-foreground" />}</div><div className="space-y-2 p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-semibold">{offer.title}</h3><p className="text-base font-semibold text-emerald-400">{cashPrice(offer)} {offer.subscription && <span className="text-xs font-normal text-muted-foreground">/ mes</span>}</p>{offer.price !== null && offer.originalPrice !== null && offer.originalPrice > offer.price && <del className="text-xs text-muted-foreground">{cashPrice(offer, true)}</del>}{offer.subscription && <p className="text-xs text-muted-foreground">Suscripción con renovación</p>}</div></button>)}</div>
    {!loading && !error && !offers.length && <p className="text-sm text-muted-foreground">No hay paquetes vigentes que coincidan con la búsqueda y el filtro de descuentos.</p>}
    <p className="text-xs text-muted-foreground">Datos: <a href="https://fnapi.osirion.gg/" target="_blank" rel="noreferrer" className="underline">Osirion</a>. Confirma el precio y las condiciones en Epic Games Store antes de comprar. No se convierten paVos en dinero.</p>
    <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}><SheetContent className="w-full! overflow-y-auto sm:max-w-lg!">{selected && <><SheetHeader className="pr-12"><SheetTitle>{selected.title}</SheetTitle><SheetDescription>{selected.subscription ? "Suscripción mensual" : "Paquete de compra con dinero"} · {country}</SheetDescription></SheetHeader><div className="space-y-4 px-4 pb-8">{selected.image && <img src={selected.image} alt={selected.title} className="w-full rounded-lg bg-muted object-contain" />}<p className="text-2xl font-semibold">{cashPrice(selected)}{selected.subscription ? " / mes" : ""}</p><p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{selected.description}</p>{selected.items.length > 0 && <div><h3 className="mb-2 font-semibold">Contenido</h3><ul className="space-y-1 text-sm text-muted-foreground">{selected.items.map((item,index) => <li key={index}>{item.quantity != null ? `${item.quantity} × ` : ""}{item.name}</li>)}</ul></div>}{selected.expires && <p className="text-xs text-muted-foreground">Salida prevista: {formatTimestamp(selected.expires)} · Lima</p>}{selected.url ? <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Ver en Epic Games Store<ExternalLink className="size-4" /></a> : <p className="text-xs text-muted-foreground">Consulta este paquete dentro de Fortnite; la fuente no publica un enlace directo.</p>}</div></>}</SheetContent></Sheet>
  </section>
}
