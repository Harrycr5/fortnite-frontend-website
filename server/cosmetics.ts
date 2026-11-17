import { Router } from "express"
import type { Cosmetic, CosmeticCategory } from "../src/types/cosmetics.types.ts"
import { cosmeticCategories, filterCosmetics, normalizeCosmetics } from "./cosmetics-data.ts"
import { object } from "./analytics-data.ts"

export const cosmetics = Router()
interface CachedCatalog { items: Cosmetic[]; fetchedAt: string; expires: number }
let catalog: CachedCatalog | null = null
let pending: Promise<CachedCatalog> | null = null

async function loadCatalog() {
  if (catalog && catalog.expires > Date.now()) return catalog
  if (pending) return pending
  pending = (async () => {
    const response = await fetch("https://fortnite-api.com/v2/cosmetics?language=es", { signal: AbortSignal.timeout(60000) })
    if (!response.ok) throw new Error(response.status === 429 ? "Se alcanzó el límite de consultas. Inténtalo de nuevo en unos momentos." : "Fortnite API no pudo cargar el catálogo de cosméticos.")
    let raw
    try { raw = object(await response.json()) } catch { throw new Error("Fortnite API devolvió una respuesta inválida.") }
    const data = object(raw.data)
    if (!Array.isArray(data.br)) throw new Error("El catálogo recibido no tiene el formato esperado.")
    const items = normalizeCosmetics(data)
    if (!items.length) throw new Error("No se recibieron cosméticos válidos.")
    catalog = { items, fetchedAt: new Date().toISOString(), expires: Date.now() + 3600000 }
    return catalog
  })().finally(() => { pending = null })
  return pending
}

cosmetics.get("/cosmetics", async (req, res) => {
  const { category = "all", type = "", rarity = "", q = "", sort = "newest", page = "1" } = req.query
  if (![category, type, rarity, q, sort, page].every(value => typeof value === "string")
    || !["all", ...cosmeticCategories].includes(category as CosmeticCategory)
    || !["newest", "oldest", "name"].includes(String(sort))
    || String(q).length > 100 || String(type).length > 60 || String(rarity).length > 60
    || !/^\d{1,6}$/.test(String(page)) || Number(page) < 1) return res.status(400).json({ error: "Los filtros del catálogo no son válidos." })
  try {
    const loaded = await loadCatalog()
    const scoped = category === "all" ? loaded.items : loaded.items.filter(item => item.category === category)
    const items = filterCosmetics(loaded.items, { category: String(category), type: String(type), rarity: String(rarity), q: String(q), sort: String(sort) })
    const pageSize = 60
    const totalPages = Math.ceil(items.length / pageSize)
    const currentPage = Math.min(Number(page), Math.max(1, totalPages))
    const options = (key: "type" | "rarity", label: "typeLabel" | "rarityLabel") => [...new Map(scoped.filter(item => item[key]).map(item => [item[key], { value: item[key], label: item[label] || item[key] }])).values()].sort((a, b) => a.label.localeCompare(b.label, "es"))
    return res.json({
      items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      total: items.length, page: currentPage, pageSize, totalPages, catalogTotal: loaded.items.length,
      categories: cosmeticCategories.map(value => ({ value, count: loaded.items.filter(item => item.category === value).length })),
      types: options("type", "typeLabel"), rarities: options("rarity", "rarityLabel"), fetchedAt: loaded.fetchedAt,
    })
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudieron cargar los cosméticos." }) }
})
