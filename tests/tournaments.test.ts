import test from "node:test"
import assert from "node:assert/strict"
import express from "express"
import { request } from "node:http"
import { tournaments } from "../server/tournaments.ts"
import { normalizeTournamentSessions, normalizeLeaderboard } from "../server/tournaments-data.ts"
import { findRegionalSession, tournamentStatus, placementPoints, eliminationPoints, eliminationScoring, resolveEliminationScoring, summarizeTournamentMatches, formatAliveTime } from "../src/lib/tournaments.ts"

const now = Date.parse("2026-11-16T12:00:00Z")
const rules = [
  { trackedStat: "PLACEMENT_STAT_INDEX", matchRule: "lte", rewardTiers: [{ keyValue: 1, pointsEarned: 6 }, { keyValue: 2, pointsEarned: 4 }, { keyValue: 3, pointsEarned: 2 }] },
  { trackedStat: "TEAM_ELIMS_STAT_INDEX", matchRule: "gte", rewardTiers: [{ keyValue: 1, pointsEarned: 5, multiplicative: true }] },
]
const event = {
  eventId: "event", regions: ["EU"], platforms: ["Windows"], metadata: { minimumAccountLevel: 50 }, displayData: { longFormatTitle: "Cup", detailsDescription: "Rules" },
  eventWindows: [{
    eventWindowId: "round", beginTime: "2026-11-16T11:00:00Z", endTime: "2026-11-16T13:00:00Z", round: 0, matchCap: 10,
    additionalRequirements: ["mfa", ["currentRanking:rank:9", "trackRanking:rank:9"]], requireAllTokens: ["Finalist"],
    scoreLocations: [{ leaderboardEventId: "event", leaderboardEventWindowId: "round", isMain: true, scoringRules: rules,
      payoutTables: [{ scoringType: "rank", ranks: [{ threshold: 1, payouts: [{ rewardType: "ecomm", value: "USD", quantity: 1000 }] }, { threshold: 5, payouts: [{ rewardType: "token", value: "Next_Round", quantity: 1 }] }] }],
    }],
  }],
}

test("tournament states respect exact start/end boundaries", () => {
  const session = { startsAt: "2026-11-16T12:00:00Z", endsAt: "2026-11-16T14:00:00Z" }
  assert.equal(tournamentStatus(session, now - 1), "upcoming")
  assert.equal(tournamentStatus(session, now), "live")
  assert.equal(tournamentStatus(session, Date.parse(session.endsAt)), "ended")
})

test("catalog retains current and upcoming sessions with rules, eligibility and actual rewards", () => {
  const future = { ...event, eventId: "future", eventWindows: [{ ...event.eventWindows[0], beginTime: "2026-11-20T11:00:00Z", endTime: "2026-11-20T13:00:00Z" }] }
  const old = { ...event, eventId: "old", eventWindows: [{ ...event.eventWindows[0], beginTime: "2026-01-01T11:00:00Z", endTime: "2026-01-01T13:00:00Z" }] }
  const result = normalizeTournamentSessions([event, future, old], now)
  assert.equal(result.length, 2)
  const session = result[0]
  assert.equal(session.minimumLevel, 50)
  assert.deepEqual(session.requirements[1], ["currentRanking:rank:9", "trackRanking:rank:9"])
  assert.equal(session.boards[0].payouts[0].ranks[0].rewards[0].quantity, 1000)
  assert.equal(session.boards[0].payouts[0].ranks[1].rewards[0].value, "Next_Round")
})

test("placement points accumulate every matching tier; eliminations are kept separate", () => {
  const session = normalizeTournamentSessions([event], now)[0]
  assert.deepEqual(placementPoints(session.boards[0].rules), [{ position: 1, points: 12 }, { position: 2, points: 6 }, { position: 3, points: 2 }])
  assert.equal(eliminationPoints(session.boards[0].rules), 5)
  assert.equal(eliminationPoints([]), null)
  assert.deepEqual(placementPoints([{ stat: "PLACEMENT_STAT_INDEX", condition: "unknown", tiers: [] }]), [])
})

test("region changes preserve the exact session and its regional prizes", () => {
  const eu = normalizeTournamentSessions([event], now)[0]
  eu.eventId = "epicgames_Cup_EU"; eu.windowId = "Cup_Event2_Final_EU"
  const br = { ...eu, eventId: "epicgames_Cup_BR", windowId: "Cup_Event2_Final_BR", regions: ["BR"], boards: [{ ...eu.boards[0], payouts: [{ scoringType: "rank", ranks: [{ threshold: 1, rewards: [{ type: "ecomm", value: "USD", quantity: 250 }] }] }] }] }
  const otherWeek = { ...br, windowId: "Cup_Event1_Final_BR" }
  const otherRound = { ...br, windowId: "Cup_Event2_Qualifier_BR" }
  const selected = findRegionalSession([otherWeek, otherRound, br], eu.eventId, eu.windowId)
  assert.equal(selected?.eventId, br.eventId)
  assert.equal(selected?.boards[0].payouts[0].ranks[0].rewards[0].quantity, 250)
  assert.equal(findRegionalSession([otherWeek, otherRound], eu.eventId, eu.windowId), undefined)
})

test("kill points recognize cumulative rank rules without multiplying by rank brackets or team size", () => {
  const tiers = Array.from({ length: 10 }, (_,index) => ({ threshold: index + 1, points: 2, multiplicative: false }))
  const ranked = ["BRONZE", "SILVER", "GOLD"].map(rank => ({ stat: `${rank}_TEAM_ELIMS_STAT_INDEX`, condition: "gte", tiers }))
  assert.deepEqual(eliminationScoring(ranked), { points: 2, cap: 10 })
  assert.equal(eliminationPoints(ranked), 2)
  const board = { eventId: "cup", windowId: "round", primary: true, rules: [], payouts: [] }
  assert.deepEqual(resolveEliminationScoring([board, ...ranked.map(rule => ({ ...board, primary: false, rules: [rule] }))], 0), { points: 2, cap: 10 })
  assert.deepEqual(eliminationScoring([{ stat: "TEAM_ELIMS_STAT_INDEX", condition: "gte", tiers: [{ threshold: 1, points: 1, multiplicative: true }] }]), { points: 1, cap: null })
  assert.equal(eliminationScoring([...ranked, { ...ranked[0], stat: "UNREAL_TEAM_ELIMS_STAT_INDEX", tiers: tiers.map(tier => ({ ...tier, points: 3 })) }]), null)
})

test("leaderboards show team metrics and preserve absent values", () => {
  const result = normalizeLeaderboard({ totalPages: 20, entries: [
    { rank: 1, pointsEarned: 0, players: [{ username: "Winner", accountId: "a" }], sessionHistory: [{ trackedStats: { PLACEMENT_STAT_INDEX: 1, TEAM_ELIMS_STAT_INDEX: 3 } }, { trackedStats: { PLACEMENT_STAT_INDEX: 2, TEAM_ELIMS_STAT_INDEX: 4 } }] },
    { rank: 2, players: [{ accountId: "private" }] },
  ] }, 5)
  assert.equal(result.page, 5)
  assert.equal(result.entries[0].points, 0)
  assert.equal(result.entries[0].eliminations, 7)
  assert.equal(result.entries[0].wins, 1)
  assert.equal(result.entries[1].matches, null)
  assert.equal(result.entries[1].points, null)
})

test("match details deduplicate, sort and average available metrics without treating missing values as zero", () => {
  const match = { sessionId: "first", endTime: "2026-11-16T12:00:00Z", trackedStats: { TEAM_ELIMS_STAT_INDEX: 0, PLACEMENT_STAT_INDEX: 10, TIME_ALIVE_STAT: 600 } }
  const entry = normalizeLeaderboard({ entries: [{ teamId: "team", players: [{ accountId: "one", username: "One" }], sessionHistory: [
    { sessionId: "second", endTime: "2026-11-16T13:00:00Z", trackedStats: { TEAM_ELIMS_STAT_INDEX: 4, PLACEMENT_STAT_INDEX: 2, TIME_ALIVE_STAT: 1200 } },
    match, match,
    { sessionId: "unknown", endTime: "invalid", trackedStats: { PLACEMENT_STAT_INDEX: 0, TIME_ALIVE_STAT: -1 } },
  ] }] }, 0).entries[0]
  assert.equal(entry.id, "team")
  assert.equal(entry.matchHistory.length, 3)
  assert.equal(entry.matchHistory[0].id, "first")
  assert.equal(entry.matchHistory[2].placement, null)
  assert.equal(entry.matchHistory[2].aliveSeconds, null)
  assert.equal(entry.eliminations, 4)
  const averages = summarizeTournamentMatches(entry.matchHistory)
  assert.deepEqual(averages.eliminations, { value: 2, samples: 2 })
  assert.deepEqual(averages.placement, { value: 6, samples: 2 })
  assert.deepEqual(averages.aliveSeconds, { value: 900, samples: 2 })
  assert.equal(formatAliveTime(averages.aliveSeconds.value), "15:00")
  assert.equal(formatAliveTime(931), "15:31")
  assert.equal(formatAliveTime(0), "0:00")
  assert.equal(formatAliveTime(null), "—")
  assert.equal(summarizeTournamentMatches([]).placement.value, null)
})

test("public tournament HTTP API supports paging and never fetches future leaderboards", async () => {
  const original = globalThis.fetch
  let boardCalls = 0
  const start = new Date(Date.now() - 3600000).toISOString()
  const end = new Date(Date.now() + 3600000).toISOString()
  const liveEvent = { ...event, eventWindows: [{ ...event.eventWindows[0], beginTime: start, endTime: end }] }
  const future = { ...event, eventId: "future", eventWindows: [{ ...event.eventWindows[0], beginTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 90000000).toISOString() }] }
  globalThis.fetch = async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith("/leaderboard")) {
      boardCalls++
      assert.equal(url.searchParams.get("page"), "5")
      const regional = url.searchParams.get("leaderboardEventId") === "event_BR"
      return Response.json({ success: true, leaderboard: { totalPages: 10, entries: [{ rank: 501, pointsEarned: regional ? 55 : 20 }] } })
    }
    if (url.searchParams.get("region") === "BR") return Response.json({ success: true, tournaments: [{ ...liveEvent, eventId: "event_BR", regions: ["BR"], eventWindows: [{ ...liveEvent.eventWindows[0], eventWindowId: "round_BR", scoreLocations: [{ ...event.eventWindows[0].scoreLocations[0], leaderboardEventId: "event_BR", leaderboardEventWindowId: "round_BR" }] }] }] })
    if (url.searchParams.get("region") === "EU") return Response.json({ success: true, tournaments: [liveEvent, future] })
    if (url.searchParams.get("region") === "NAC") return Response.json({ success: true, tournaments: Array.from({ length: 3 }, (_,index) => ({ ...liveEvent, eventId: `live_${index}_NAC`, regions: ["NAC"] })) })
    if (url.searchParams.get("region") === "ASIA") return new Response("", { status: 503 })
    return Response.json({ success: true, tournaments: [] })
  }
  const app = express(); app.use("/api", tournaments)
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  const address = server.address(); assert.ok(address && typeof address !== "string")
  const get = (path: string) => new Promise<{ status: number; data: any }>((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port: address.port, path }, response => {
      let body = ""; response.on("data", chunk => { body += chunk })
      response.on("end", () => { let data; try { data = JSON.parse(body) } catch { data = body }; resolve({ status: response.statusCode!, data }) })
    }); req.on("error", reject); req.end()
  })
  try {
    const catalog = await get("/api/tournaments")
    assert.equal(catalog.data.sessions.length, 2)
    assert.equal((await get("/api/tournaments?region=invalid")).status, 400)
    assert.equal((await get("/api/tournaments/leaderboard?eventId=event&windowId=round&page=-1")).status, 400)
    assert.equal((await get("/api/tournaments/leaderboard?eventId=future&windowId=round")).status, 409)
    assert.equal(boardCalls, 0)
    const board = await get("/api/tournaments/leaderboard?eventId=event&windowId=round&page=5")
    assert.equal(board.status, 200)
    assert.equal(board.data.entries[0].rank, 501)
    await get("/api/tournaments/leaderboard?eventId=event&windowId=round&page=5")
    assert.equal(boardCalls, 1)
    const regional = await get("/api/tournaments?region=BR")
    assert.equal(regional.data.region, "BR")
    assert.equal(regional.data.sessions[0].regions[0], "BR")
    const brBoard = await get("/api/tournaments/leaderboard?eventId=event_BR&windowId=round_BR&page=5&region=BR")
    assert.equal(brBoard.data.entries[0].points, 55)
    assert.equal((await get("/api/tournaments/leaderboard?eventId=event&windowId=round&region=BR")).status, 404)
    const global = await get("/api/tournaments?region=ALL")
    assert.equal(global.status, 200)
    assert.equal(global.data.region, "ALL")
    assert.equal(global.data.sessions.filter((session: { regions: string[] }) => session.regions.includes("NAC")).length, 3)
    assert.deepEqual(global.data.unavailableRegions, ["ASIA"])
    assert.equal((await get("/api/players/abc/tournaments")).status, 404)
  } finally {
    globalThis.fetch = original
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
