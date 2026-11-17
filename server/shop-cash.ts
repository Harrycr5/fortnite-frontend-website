import { Router } from "express"
import type { CashOffer } from "../src/types/extended.types.ts"
import { numeric, object, text } from "./analytics-data.ts"
import { publicData } from "./public-data.ts"

export const cashShop = Router()
const https = (value: unknown) => { try { const url = new URL(text(value)); return url.protocol === "https:" ? url.href : null } catch { return null } }

export function normalizeCashOffers(values: unknown, country: string, now = Date.now()): CashOffer[] {
  if (!Array.isArray(values)) throw new Error("La fuente no devolvió una lista de paquetes válida.")
  const offers = new Map<string, CashOffer>()
  for (const value of values) {
    const item = object(value)
    const id = text(item.storeOfferId) || text(item.mcpOfferId)
    if (!id || !text(item.title)) continue
    const start = text(item.effectiveDate)
    const end = text(item.expiryDate)
    if ((start && Date.parse(start) > now) || (end && Date.parse(end) <= now)) continue
    const prices = Array.isArray(item.prices) ? item.prices.map(object) : []
    const price = prices.find(price => Array.isArray(price.countries) && price.countries.includes(country))
    const decimals = numeric(price?.currencyDecimal)
    const validPrice = price && decimals !== null && Number.isInteger(decimals) && decimals >= 0 && decimals <= 4 && /^[A-Z]{3}$/.test(text(price.currency))
    const amount = validPrice ? numeric(price.discountPrice) : null
    const original = validPrice ? numeric(price.originalPrice) : null
    const images = Array.isArray(item.images) ? item.images.map(object) : []
    const image = images.find(image => /offerimage|thumbnail|dieselstorefrontwide/i.test(text(image.type))) || images.find(image => !/logo/i.test(text(image.type)))
    const url = https(item.storeOfferUrl)
    offers.set(id, {
      id, title: text(item.title), description: text(item.longDescription) || text(item.description),
      image: https(image?.url), url: url && new URL(url).hostname === "store.epicgames.com" ? url : null,
      country, currency: validPrice ? text(price.currency) : null,
      price: amount !== null ? amount / 10 ** decimals! : null,
      originalPrice: original !== null ? original / 10 ** decimals! : null,
      expires: end || null, subscription: /crew/i.test(text(item.devName)),
      items: Array.isArray(item.items) ? item.items.map(value => { const entry = object(value); return { name: text(object(entry.itemDetails).name) || text(entry.templateId), quantity: numeric(entry.quantity) } }) : [],
    })
  }
  return [...offers.values()]
}

cashShop.get("/shop/cash", async (req, res) => {
  const country = req.query.country ?? "PE"
  if (typeof country !== "string" || !["PE", "US", "ES", "MX", "AR", "CL", "CO", "BR"].includes(country)) return res.status(400).json({ error: "País no admitido para la consulta de precios." })
  try {
    const data = await publicData("/v1/shop/real-money-bundles?lang=es&activeOnly=true")
    return res.json({ offers: normalizeCashOffers(data.offers, country), country, fetchedAt: new Date().toISOString() })
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : "No se pudieron cargar los paquetes." }) }
})
