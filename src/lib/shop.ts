import type { ShopEntry } from "../types/shop.types"

export function getShopItems(entry: ShopEntry) {
  return [...(entry.brItems ?? []), ...(entry.cars ?? []), ...(entry.instruments ?? []), ...(entry.tracks ?? []), ...(entry.legoKits ?? [])]
}

export function getShopName(entry: ShopEntry) {
  const first = getShopItems(entry)[0]
  return entry.bundle?.name || first?.name || first?.title || "Oferta de Fortnite"
}

export function getShopImage(entry: ShopEntry) {
  const first = getShopItems(entry)[0]
  return entry.bundle?.image || entry.newDisplayAsset?.renderImages?.[0]?.image
    || entry.newDisplayAsset?.materialInstances?.[0]?.images?.OfferImage
    || first?.images?.featured || first?.images?.large || first?.images?.icon
    || first?.images?.small || first?.images?.smallIcon || first?.albumArt
}

export function getShopCategories(entry: ShopEntry) {
  const categories: string[] = []
  if (entry.brItems?.length) categories.push("Battle Royale")
  if (entry.cars?.length) categories.push("Vehículos")
  if (entry.instruments?.length) categories.push("Instrumentos")
  if (entry.tracks?.length) categories.push("Canciones")
  if (entry.legoKits?.length) categories.push("LEGO")
  return categories.length ? categories : ["Otros"]
}

export function getShopSection(entry: ShopEntry) {
  return entry.layout?.name?.trim() || entry.layout?.category?.trim() || "Otras ofertas"
}

export const shopFilterGroups = [
  { label: "Battle Royale", filters: [
    { id: "outfit", label: "Trajes" }, { id: "emote", label: "Gestos" },
    { id: "pickaxe", label: "Picos" }, { id: "backpack", label: "Mochilas" },
    { id: "glider", label: "Planeadores" }, { id: "sidekick", label: "Compañeros" },
    { id: "shoe", label: "Calzado" }, { id: "wrap", label: "Envoltorios" },
    { id: "bundle", label: "Lotes" },
  ] },
  { label: "Rocket Racing", filters: [
    { id: "body", label: "Coches" }, { id: "skin", label: "Calcomanías" },
    { id: "wheel", label: "Ruedas" }, { id: "trail", label: "Estelas" },
    { id: "boost", label: "Turbos" },
  ] },
  { label: "Festival", filters: [
    { id: "track", label: "Canciones" }, { id: "instrument", label: "Instrumentos" },
  ] },
  { label: "LEGO", filters: [
    { id: "build", label: "Construcciones" }, { id: "decor", label: "Decoraciones" },
  ] },
] as const

export type ShopFilter = typeof shopFilterGroups[number]["filters"][number]["id"]

export function matchesShopFilter(entry: ShopEntry, filter: ShopFilter) {
  if (filter === "bundle") return !!entry.bundle && !!entry.brItems?.length
  if (filter === "track") return !!entry.tracks?.length
  if (filter === "instrument") return !!entry.instruments?.length
  if (["body", "skin", "wheel", "trail", "boost"].includes(filter)) {
    const type = filter === "trail" ? "drifttrail" : filter === "boost" ? "booster" : filter
    return !!entry.cars?.some(item => item.type?.value === type)
  }
  if (filter === "build" || filter === "decor") {
    return !!entry.legoKits?.some(item => item.type?.value === (filter === "build" ? "legoset" : "legoprop"))
  }
  return !!entry.brItems?.some(item => item.type?.value === filter)
}

export function compareShopOrder(a: ShopEntry, b: ShopEntry) {
  // Higher section ranks are displayed first in the shop. Index is a fallback
  // for older responses without ranks, not the primary section order.
  return (b.layout?.rank ?? -1) - (a.layout?.rank ?? -1)
    || (a.layout?.index ?? Number.MAX_SAFE_INTEGER) - (b.layout?.index ?? Number.MAX_SAFE_INTEGER)
    || (b.sortPriority ?? 0) - (a.sortPriority ?? 0)
}

export function groupShopEntries(entries: ShopEntry[]) {
  const groups = new Map<string, { id: string; name: string; entries: ShopEntry[] }>()
  for (const entry of entries) {
    const id = entry.layout?.id || "other"
    const group = groups.get(id)
    if (group) group.entries.push(entry)
    else groups.set(id, { id, name: getShopSection(entry), entries: [entry] })
  }
  return [...groups.values()]
}

export function shopColor(value?: string) {
  return value && /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? `#${value.slice(0, 6)}` : "#37436d"
}
