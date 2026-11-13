
import type { StatsResponse } from "../types/stats.types";

interface StatsParams {
  name: string;
  accountType: string;
  timeWindow: string;
}

export async function getPlayerStats({
  name,
  accountType,
  timeWindow,
}: StatsParams): Promise<StatsResponse> {
  const params = new URLSearchParams({
    name,
    accountType,
    timeWindow,
  });

  const response = await fetch(`/api/stats?${params}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se encontraron estadísticas");
  }

  return data;
}
