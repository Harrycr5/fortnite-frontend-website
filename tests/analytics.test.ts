import test from "node:test"
import assert from "node:assert/strict"
import { request } from "node:http"
import express from "express"
import { analytics } from "../server/analytics.ts"
import { metricPoints, normalizeIsland } from "../server/analytics-data.ts"
import { rankCreators, formatMetric } from "../src/lib/analytics.ts"

const fixture = {
  code: "1234-5678-9012", title: "Test island", creator: "Creator", isEpic: false,
  image: "https://example.com/image.webp", players: { now: 100, at: "2026-11-16T20:00:00Z" },
  last24h: { plays: 500, uniquePlayers: 200, minutesPlayed: 1500 },
  retention: { day1: 0.25 }, estimatedEarnings: { currency: "USD", perDay: 10, low: 6, high: 14 },
}

test("normalizes missing metrics without changing them to zero", () => {
  const island = normalizeIsland(fixture)!
  assert.equal(island.players, 100)
  assert.equal(island.retentionD1, 0.25)
  assert.equal(island.favorites, null)
  assert.equal(island.retentionD7, null)
  assert.equal(formatMetric(null), "—")
  assert.equal(normalizeIsland({ ...fixture, players: { now: 0 } })?.players, 0)
  assert.equal(normalizeIsland({ ...fixture, players: { now: null, lastSeen: 200 } })?.players, null)
  assert.equal(normalizeIsland({ ...fixture, image: "javascript:alert(1)" })?.image, null)
  assert.equal(normalizeIsland({ ...fixture, isEpic: true })?.isEpic, true)
  assert.equal(normalizeIsland({ ...fixture, code: "experience_br", isEpic: true })?.code, "experience_br")
  assert.equal(normalizeIsland({ ...fixture, code: "experience_br", isEpic: false }), null)
  assert.equal(normalizeIsland({ code: "bad" }), null)
})

test("creator grouping preserves nulls and never sums unique players", () => {
  const first = normalizeIsland(fixture)!
  const second = normalizeIsland({ ...fixture, code: "9999-9999-9999", creator: "creator", players: { now: null }, estimatedEarnings: null })!
  const grouped = rankCreators([first, second], "players")
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].islandCount, 2)
  assert.equal(grouped[0].players, 100)
  assert.equal(grouped[0].plays, 1000)
  assert.equal(grouped[0].earnings, 10)
  assert.equal("uniquePlayers" in grouped[0], false)
  assert.equal(rankCreators([{ ...first, players: null }], "players")[0].players, null)
})

test("history keeps unknown values and sorts valid timestamps", () => {
  assert.deepEqual(metricPoints([{ timestamp: "invalid", value: 5 }, { timestamp: "2026-11-16T00:00:00Z", value: null }, { timestamp: "2026-11-15T00:00:00Z", value: 0 }]), [
    { timestamp: "2026-11-15T00:00:00Z", value: 0 }, { timestamp: "2026-11-16T00:00:00Z", value: null },
  ])
})

test("analytics HTTP routes, failures, cache and direct Epic ranking", async t => {
  const originalFetch = globalThis.fetch
  let islandCalls = 0
  let failIslands = false
  let failCompetitive = true
  const app = express()
  app.use("/api", analytics)
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  const get = (path: string) => new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port: address.port, path }, response => {
      let body = ""
      response.setEncoding("utf8")
      response.on("data", chunk => { body += chunk })
      response.on("end", () => { try { resolve({ status: response.statusCode!, body: JSON.parse(body) }) } catch (error) { reject(error) } })
    })
    req.on("error", reject)
    req.end()
  })
  globalThis.fetch = async input => {
    const url = String(input)
    if (url.includes("fnterminal.live")) {
      islandCalls++
      if (failIslands) return new Response("", { status: 503 })
      return Response.json({ islands: [fixture] })
    }
    if (url.includes("/creatorcode")) return Response.json({ data: { code: "test", status: "ACTIVE", verified: false, account: { id: "abc", name: "Test" } } })
    if (url.includes("/metrics/day")) {
      const parsed = new URL(url)
      const span = Date.parse(parsed.searchParams.get("to")!) - Date.parse(parsed.searchParams.get("from")!)
      assert.equal(span, 7 * 86400000)
      return Response.json({ plays: [{ timestamp: "2026-11-15T00:00:00Z", value: 500 }], peakCCU: [{ timestamp: "2026-11-15T00:00:00Z", value: null }] })
    }
    if (url.startsWith("https://www.fortnite.com/competitive/power-rankings")) {
      if (failCompetitive) return new Response("", { status: 403 })
      return new Response(`<table><thead><tr><th>PR Position</th><th>Player</th><th>PR Rating</th></tr></thead><tbody>${Array.from({ length: 10 }, (_, i) => `<tr><td>${i+1}</td><td>Player ${i}</td><td>${10000-i}</td></tr>`).join("")}</tbody></table>`)
    }
    throw new Error(`Unexpected upstream: ${url}`)
  }
  try {
    await t.test("rejects invalid inputs before calling providers", async () => {
      assert.equal((await get("/api/islands?sort=invalid")).status, 400)
      assert.equal((await get("/api/islands/not-a-code/metrics")).status, 400)
      assert.equal((await get("/api/creatorcode?name=%3Cscript%3E")).status, 400)
      assert.equal((await get("/api/islands?scope=invalid")).status, 400)
      assert.equal(islandCalls, 0)
    })
    await t.test("concurrent island requests share the cache", async () => {
      const results = await Promise.all([get("/api/islands?sort=players"), get("/api/islands?sort=players")])
      assert.ok(results.every(result => result.status === 200 && result.body.islands[0].players === 100))
      assert.equal(islandCalls, 1)
      assert.equal((await get("/api/islands?sort=players")).body.sampleLimit, 200)
      assert.equal(islandCalls, 1)
    })
    await t.test("upstream failures are readable JSON and not cached", async () => {
      failIslands = true
      const result = await get("/api/islands?sort=plays")
      assert.equal(result.status, 502)
      assert.ok(result.body.error)
      failIslands = false
      assert.equal((await get("/api/islands?sort=plays")).status, 200)
    })
    await t.test("Epic and creator scopes have separate cached lists", async () => {
      const before = islandCalls
      assert.equal((await get("/api/islands?scope=epic")).status, 200)
      assert.equal((await get("/api/islands?scope=creators")).status, 200)
      assert.equal(islandCalls, before + 2)
    })
    await t.test("creator lookup returns public fields only", async () => {
      const result = await get("/api/creatorcode?name=test")
      assert.equal(result.body.status, "ACTIVE")
      assert.equal("earnings" in result.body, false)
      assert.equal("supporters" in result.body, false)
    })
    await t.test("island history explicitly requests seven days", async () => {
      const result = await get("/api/islands/1234-5678-9012/metrics")
      assert.equal(result.status, 200)
      assert.equal(result.body.plays[0].value, 500)
      assert.equal(result.body.peakCCU[0].value, null)
    })
    await t.test("Epic blocking returns an error without static fallback", async () => {
      const result = await get("/api/competitive")
      assert.equal(result.status, 502)
      assert.match(result.body.error, /403/)
      assert.equal("players" in result.body, false)
    })
    await t.test("direct Epic ranking works without a provider key", async () => {
      failCompetitive = false
      const result = await get("/api/competitive")
      assert.equal(result.status, 200)
      assert.equal(result.body.players.length, 10)
      assert.equal(result.body.players[0].rating, 10000)
      assert.ok(result.body.fetchedAt)
      assert.match(result.body.source, /^https:\/\/www\.fortnite\.com\//)
      assert.equal("mode" in result.body, false)
    })
  } finally {
    globalThis.fetch = originalFetch
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

