"use client";

import { useEffect, useState, useCallback } from "react";

const BOT_API = process.env.NEXT_PUBLIC_BOT_API || "http://localhost:3001";

export interface UpdateSection {
  icon: string;
  title: string;
  subtitle: string;
  body: string;
  calloutLabel: string;
  calloutText: string;
}

export interface UpdateSummaryLine {
  kind: "feature" | "improvement" | "fix" | "total";
  label: string;
  text: string;
}

export interface UpdateRepoEntry {
  label: string;
  repo: string;
  latestSha: string;
}

export interface UpdateEntry {
  id: number;
  fingerprint: string;
  title: string;
  lead: string;
  closingText: string;
  createdAt: string;
  sections: UpdateSection[];
  summaryLines: UpdateSummaryLine[];
  repos: UpdateRepoEntry[];
}

export function useUpdates(limit = 6) {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_API}/api/updates?limit=${limit}`);
      if (!res.ok) throw new Error("Falha ao carregar updates");
      const data = (await res.json()) as UpdateEntry[];
      setUpdates(Array.isArray(data) ? data : []);
    } catch {
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  return { updates, loading, refetch: fetchUpdates };
}
