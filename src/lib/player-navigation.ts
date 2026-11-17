export function playerSearchParams(name: string, accountType: string, timeWindow: string) {
  return new URLSearchParams({ name: name.trim(), accountType, timeWindow })
}

export function readPlayerSearch(params: URLSearchParams) {
  const accountType = params.get("accountType") ?? "epic"
  const timeWindow = params.get("timeWindow") ?? "lifetime"
  return {
    name: (params.get("name") ?? "").trim(),
    accountType: ["epic", "psn", "xbl"].includes(accountType) ? accountType : "epic",
    timeWindow: ["lifetime", "season"].includes(timeWindow) ? timeWindow : "lifetime",
  }
}
