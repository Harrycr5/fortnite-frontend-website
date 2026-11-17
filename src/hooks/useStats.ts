
import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerStats } from "../services/stats.service";
import type { StatsData } from "../types/stats.types";

export function useStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const searchPlayer = useCallback(async (
    name: string,
    accountType: string,
    timeWindow: string
  ) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const response = await getPlayerStats({
        name,
        accountType,
        timeWindow,
      }, controller.signal);

      if (!controller.signal.aborted) setStats(response.data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error ? err.message : "Ocurrió un error"
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  return { stats, loading, error, searchPlayer };
}
