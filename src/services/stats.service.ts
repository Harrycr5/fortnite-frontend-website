
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
}: StatsParams, signal?: AbortSignal): Promise<StatsResponse> {
  const params = new URLSearchParams({
    name,
    accountType,
    timeWindow,
  });

  const response = await fetch(`/api/stats?${params}`, { signal });

  const body = await response.text();
  let data: StatsResponse & { error?: string };

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(
      response.status >= 500 || !body.trim()
        ? "No se pudo contactar con el backend. Inicia frontend y servidor con npm run dev:full (API en localhost:3001)."
        : "El servidor devolvió una respuesta inválida. Comprueba que /api apunta al backend en localhost:3001."
    );
  }

  if (!response.ok) {
    throw new Error(data.error || "No se encontraron estadísticas");
  }

  if (!data?.data?.account || !data.data.stats?.all || !data.data.battlePass) {
    throw new Error("El servidor no devolvió un perfil válido para este jugador.");
  }

  return data;
}
