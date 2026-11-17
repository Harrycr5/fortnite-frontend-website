import type { Cosmetic, CosmeticCategory } from "../src/types/cosmetics.types.ts"
import { object, text } from "./analytics-data.ts"

export const cosmeticCategories = ["br", "tracks", "instruments", "cars", "lego", "legoKits", "beans"] as const
const url = (value: unknown) => {
  try { const parsed = new URL(text(value)); return parsed.protocol === "https:" ? parsed.href : null } catch { return null }
}
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

export function normalizeCosmetics(data: unknown): Cosmetic[] {
  const catalog = object(data)
  const br = new Map((Array.isArray(catalog.br) ? catalog.br : []).map(value => { const item = object(value); return [text(item.id).toLowerCase(), item] }))
  const result = new Map<string, Cosmetic>()
  for (const category of cosmeticCategories) {
    if (!Array.isArray(catalog[category])) continue
    for (const value of catalog[category]) {
      const original = object(value)
      const id = text(original.id)
      if (!id) continue
      const parent = br.get(text(original.cosmeticId).toLowerCase()) ?? {}
      const item = { ...parent, ...original }
      const images = object(original.images)
      const type = object(item.type)
      const rarity = object(item.rarity)
      const fallbackTypes: Partial<Record<CosmeticCategory, [string, string]>> = { tracks: ["track", "Canción"], lego: ["lego-style", "Estilo LEGO"], beans: ["bean", "Estilo Fall Guys"] }
      const specialType = fallbackTypes[category]
      const image = url(images.featured) || url(images.large) || url(images.icon) || url(images.wide) || url(images.small) || url(images.smallIcon) || url(item.albumArt)
      const added = text(original.added)
      const variants = Array.isArray(original.variants) ? original.variants : []
      result.set(`${category}:${id}`, {
        id, category,
        name: text(item.name) || text(item.title) || id,
        description: text(item.description),
        type: specialType?.[0] || text(type.value) || "other",
        typeLabel: specialType?.[1] || text(type.displayValue) || "Otro",
        rarity: text(rarity.value), rarityLabel: text(rarity.displayValue),
        series: text(object(item.series).value), set: text(object(item.set).value), introduction: text(object(item.introduction).text),
        added: Number.isFinite(Date.parse(added)) ? added : null,
        image, thumbnail: url(images.smallIcon) || url(images.small) || url(images.icon) || url(item.albumArt) || image,
        artist: text(item.artist),
        variants: variants.flatMap(raw => {
          const variant = object(raw)
          if (!Array.isArray(variant.options)) return []
          return [{ type: text(variant.type) || "Estilo", options: variant.options.map(rawOption => {
            const option = object(rawOption)
            return { name: text(option.name) || text(option.tag) || "Variante", image: url(option.image) }
          }) }]
        }),
      })
    }
  }
  return [...result.values()]
}

export function filterCosmetics(items: Cosmetic[], filters: { category: string; type: string; rarity: string; q: string; sort: string }) {
  const query = normalizeSearch(filters.q.trim())
  const filtered = items.filter(item => (filters.category === "all" || item.category === filters.category)
    && (!filters.type || item.type === filters.type)
    && (!filters.rarity || item.rarity === filters.rarity)
    && (!query || normalizeSearch(`${item.name} ${item.id} ${item.description} ${item.artist} ${item.set} ${item.series}`).includes(query)))
  return filtered.sort((a, b) => filters.sort === "name" ? a.name.localeCompare(b.name, "es")
    : filters.sort === "oldest" ? (Date.parse(a.added ?? "") || 0) - (Date.parse(b.added ?? "") || 0)
    : (Date.parse(b.added ?? "") || 0) - (Date.parse(a.added ?? "") || 0))
}
