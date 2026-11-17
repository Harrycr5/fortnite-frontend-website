import test from "node:test"
import assert from "node:assert/strict"
import { request } from "node:http"
import express from "express"
import { normalizeCosmetics, filterCosmetics } from "../server/cosmetics-data.ts"
import { cosmetics } from "../server/cosmetics.ts"

const raw = {
  br: [{ id: "CID_Test", name: "Corazón metálico", description: "Un traje", type: { value: "outfit", displayValue: "Traje" }, rarity: { value: "epic", displayValue: "Épico" }, images: { icon: "https://example.com/icon.png" }, added: "2026-11-16T00:00:00Z", variants: [{ type: "Color", options: [{ name: "Azul", image: "https://example.com/blue.png" }] }] }],
  lego: [{ id: "JIDO_Test", cosmeticId: "CID_Test", images: { large: "https://example.com/lego.png" } }],
  beans: [{ id: "Bean_Test", cosmeticId: "CID_Test", images: { large: "https://example.com/bean.png" } }],
  tracks: [{ id: "Track_Test", title: "Song", artist: "Artist", albumArt: "https://example.com/album.jpg" }],
  cars: [{ id: "Car_Test", name: "Car", images: { small: "javascript:alert(1)" } }],
}

test("catalog normalization joins LEGO and Fall Guys metadata and keeps categories distinct", () => {
  const items = normalizeCosmetics(raw)
  assert.equal(items.length, 5)
  assert.equal(items.find(item => item.category === "lego")?.name, "Corazón metálico")
  assert.equal(items.find(item => item.category === "lego")?.type, "lego-style")
  assert.equal(items.find(item => item.category === "beans")?.type, "bean")
  assert.equal(items.find(item => item.category === "tracks")?.name, "Song")
  assert.equal(items.find(item => item.category === "tracks")?.image, "https://example.com/album.jpg")
  assert.equal(items.find(item => item.category === "cars")?.image, null)
  assert.equal(items[0].variants[0].options[0].name, "Azul")
})

test("global search ignores accents and combines category, type and rarity", () => {
  const items = normalizeCosmetics(raw)
  const base = { category: "all", type: "", rarity: "", q: "corazon", sort: "newest" }
  assert.equal(filterCosmetics(items, base).length, 3)
  assert.equal(filterCosmetics(items, { ...base, category: "br", type: "outfit", rarity: "epic" }).length, 1)
  assert.equal(filterCosmetics(items, { ...base, q: "artist" })[0].id, "Track_Test")
  assert.equal(filterCosmetics(items, { ...base, q: "not found" }).length, 0)
  assert.equal(filterCosmetics(items, { ...base, q: "CID_Test" })[0].id, "CID_Test")
})

test("cosmetics API validates filters, paginates the full catalog and shares one upstream load", async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return Response.json({ data: { ...raw, br: [...raw.br, ...Array.from({ length: 125 }, (_, i) => ({ id: `CID_${i}`, name: `Item ${i}`, added: "2020-01-01T00:00:00Z" }))] } })
  }
  const app = express()
  app.use("/api", cosmetics)
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  const get = (path: string) => new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port: address.port, path }, response => {
      let text = ""
      response.on("data", chunk => { text += chunk })
      response.on("end", () => { try { resolve({ status: response.statusCode!, body: JSON.parse(text) }) } catch (error) { reject(error) } })
    })
    req.on("error", reject)
    req.end()
  })
  try {
    for (const path of ["?category=invalid", "?page=-1", "?q=a&q=b", "?sort=invalid"]) assert.equal((await get(`/api/cosmetics${path}`)).status, 400)
    assert.equal(calls, 0)
    const [first, second] = await Promise.all([get("/api/cosmetics?page=1"), get("/api/cosmetics?page=2")])
    assert.equal(calls, 1)
    assert.equal(first.body.total, 130)
    assert.equal(first.body.items.length, 60)
    assert.equal(second.body.items.length, 60)
    assert.equal(first.body.totalPages, 3)
    assert.ok(!first.body.items.some((item: { id: string }) => second.body.items.some((other: { id: string }) => other.id === item.id)))
    const search = await get("/api/cosmetics?q=corazon&category=br")
    assert.equal(search.body.total, 1)
    assert.equal(search.body.items[0].id, "CID_Test")
    assert.equal((await get("/api/cosmetics?page=999999")).body.page, 3)
    assert.equal((await get("/api/cosmetics?q=nothing")).body.total, 0)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = original
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
