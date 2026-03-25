"use client";

import { useState, useEffect, useCallback } from "react";

export interface BotStats {
  members: number;
  guilds: number;
  ping: number;
  botAvatar: string;
  botName: string;
  commandsUsed: number;
  uptimeSeconds: number;
}

const BOT_API = "http://localhost:3001";
const API_BASE = process.env.NEXT_PUBLIC_BOT_API || BOT_API;

export function useBotStats() {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (!res.ok) throw new Error("API error");
      const data: BotStats = await res.json();
      if (data && data.botName) {
        setStats(data);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000); // Refresh every 30s
    return () => clearInterval(id);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
