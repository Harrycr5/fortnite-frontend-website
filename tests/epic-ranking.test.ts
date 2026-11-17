import test from "node:test"
import assert from "node:assert/strict"
import { parseEpicRanking, fetchEpicRanking, EPIC_RANKING_URL } from "../server/epic-ranking.ts"

const page = (count = 10) => `<table><tr><th>PR Position</th><th>Player</th><th>PR Rating</th></tr>${Array.from({ length: count }, (_,i) => `<tr><td>${i+1}<span> 2</span></td><td><img alt="Avatar" src="x" />Player &#${65+i}; &amp; ü</td><td>39,${String(900-i).padStart(3,"0")}</td></tr>`).join("")}</table>`

test("Epic reader extracts only a complete top 10 and decodes names without executing markup", () => {
  const players = parseEpicRanking(page(25))
  assert.equal(players.length, 10)
  assert.equal(players[0].rank, 1)
  assert.equal(players[0].name, "Player A & ü")
  assert.equal(players[0].rating, 39900)
  assert.equal(players[9].rank, 10)
  assert.throws(() => parseEpicRanking(page(9)), /top 10/)
  assert.throws(() => parseEpicRanking("<html>Security check</html>"), /top 10/)
})

test("Epic access denials remain visible and do not return saved players", async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(url, EPIC_RANKING_URL)
    assert.equal((options?.headers as Record<string,string>)["x-api-key"], undefined)
    return new Response("Blocked", { status: 403 })
  }
  try { await assert.rejects(fetchEpicRanking(), /HTTP 403/) }
  finally { globalThis.fetch = original }
})
