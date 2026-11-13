
import { useState } from "react";
import { getPlayerStats } from "../services/stats.service";
import type { StatsData } from "../types/stats.types";

export function useStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlayer = async (
    name: string,
    accountType: string,
    timeWindow: string
  ) => {
    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const response = await getPlayerStats({
        name,
        accountType,
        timeWindow,
      });

      setStats(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error"
      );
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, searchPlayer };
}
