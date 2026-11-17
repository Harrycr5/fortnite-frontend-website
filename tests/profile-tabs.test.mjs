import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "vite"
import React from "react"
import { renderToString } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"

test("personal tournament tabs are removed and the standalone tournaments page renders", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" })
  try {
    const { default: StatsPage } = await vite.ssrLoadModule("/src/pages/StatsPage.tsx")
    for (const route of ["/", "/?name=Player", "/?name=Player&view=tournaments"]) {
      const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(StatsPage)))
      assert.doesNotMatch(html, /id="tab-tournaments"/)
      assert.doesNotMatch(html, /id="panel-tournaments"/)
      assert.doesNotMatch(html, /Torneos de /)
    }
    const { default: TournamentsPage } = await vite.ssrLoadModule("/src/pages/TournamentsPage.tsx")
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ["/tournaments"] }, React.createElement(TournamentsPage)))
    assert.match(html, /Actuales y próximos/)
    assert.match(html, /En curso/)
    assert.match(html, /Finalizados/)
    assert.match(html, /value="ALL" selected=""/)
    const detail = renderToString(React.createElement(MemoryRouter, { initialEntries: ["/tournaments?event=event_EU&round=round_EU&region=BR"] }, React.createElement(TournamentsPage)))
    assert.match(detail, /id="detail-tournament-region"/)
    assert.match(detail, /value="BR" selected=""/)
  } finally { await vite.close() }
})
