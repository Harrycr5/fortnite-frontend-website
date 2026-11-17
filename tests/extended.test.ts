import test from "node:test"
import assert from "node:assert/strict"
import { normalizeCashOffers } from "../server/shop-cash.ts"

const now = Date.parse("2026-11-16T12:00:00Z")
const offer = {
  storeOfferId: "pack", title: "Pack", effectiveDate: "2026-11-01T00:00:00Z", expiryDate: "2026-12-01T00:00:00Z",
  prices: [{ currency: "PEN", currencyDecimal: 2, discountPrice: 1316, originalPrice: 2632, countries: ["PE"] }],
  images: [{ type: "Thumbnail", url: "https://example.com/pack.jpg" }], storeOfferUrl: "https://store.epicgames.com/p/pack",
}

test("cash offers use the exact country's minor units and never convert V-Bucks", () => {
  const [pe] = normalizeCashOffers([offer], "PE", now)
  assert.equal(pe.price, 13.16)
  assert.equal(pe.originalPrice, 26.32)
  assert.equal(pe.currency, "PEN")
  const [us] = normalizeCashOffers([offer], "US", now)
  assert.equal(us.price, null)
  assert.equal(us.currency, null)
  assert.equal(normalizeCashOffers([{ ...offer, prices: [{ ...offer.prices[0], discountPrice: 0 }] }], "PE", now)[0].price, 0)
})

test("cash offers exclude expired/future offers, deduplicate and validate store links", () => {
  assert.equal(normalizeCashOffers([offer, offer], "PE", now).length, 1)
  assert.equal(normalizeCashOffers([{ ...offer, expiryDate: "2026-01-01T00:00:00Z" }], "PE", now).length, 0)
  assert.equal(normalizeCashOffers([{ ...offer, effectiveDate: "2027-01-01T00:00:00Z" }], "PE", now).length, 0)
  assert.equal(normalizeCashOffers([{ ...offer, storeOfferUrl: "https://example.com/fake" }], "PE", now)[0].url, null)
})


