import test from "node:test"
import assert from "node:assert/strict"
import { createMemoryRouter } from "react-router-dom"
import { playerSearchParams, readPlayerSearch } from "../src/lib/player-navigation.ts"
import { getPlayerStats } from "../src/services/stats.service.ts"

test("Back from a top-10 profile returns to the ranking before prior sections", async () => {
  const router = createMemoryRouter([
    { path: "/", element: null },
    { path: "/shop", element: null },
    { path: "/islands", element: null },
  ], { initialEntries: ["/islands", "/shop", "/"], initialIndex: 2 })
  try {
    const name = "havok рixie bääǃ"
    const search = playerSearchParams(name, "epic", "season")
    await router.navigate(`/?${search}`, { state: { fromProfiles: true } })
    assert.equal(readPlayerSearch(new URLSearchParams(router.state.location.search)).name, name)
    await router.navigate(-1)
    assert.equal(router.state.location.pathname, "/")
    assert.equal(router.state.location.search, "")
    await router.navigate(1)
    assert.deepEqual(readPlayerSearch(new URLSearchParams(router.state.location.search)), { name, accountType: "epic", timeWindow: "season" })
    await router.navigate(-1)
    await router.navigate(-1)
    assert.equal(router.state.location.pathname, "/shop")
  } finally { router.dispose() }
})

test("profile links preserve platform, period, special characters and support direct entry", () => {
  const query = playerSearchParams("  A+B & Player  ", "psn", "season")
  assert.deepEqual(readPlayerSearch(new URLSearchParams(query.toString())), { name: "A+B & Player", accountType: "psn", timeWindow: "season" })
  assert.deepEqual(readPlayerSearch(new URLSearchParams("name=Player&accountType=invalid&timeWindow=invalid")), { name: "Player", accountType: "epic", timeWindow: "lifetime" })
  assert.equal(readPlayerSearch(new URLSearchParams()).name, "")
})

test("profile requests forward cancellation to fetch when leaving the page", async () => {
  const originalFetch = globalThis.fetch
  const controller = new AbortController()
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.signal, controller.signal)
    return new Promise((_resolve, reject) => {
      options!.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
    })
  }
  try {
    const result = getPlayerStats({ name: "Player", accountType: "epic", timeWindow: "season" }, controller.signal)
    controller.abort()
    await assert.rejects(result, { name: "AbortError" })
  } finally { globalThis.fetch = originalFetch }
})
