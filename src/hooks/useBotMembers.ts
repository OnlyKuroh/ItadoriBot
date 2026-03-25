"use client";

import { useState, useEffect } from "react";

export interface BotMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
  color: string;
  status: string;
}

const BOT_API = "http://localhost:3001";
const API_BASE = process.env.NEXT_PUBLIC_BOT_API || BOT_API;

export function useBotMembers() {
  const [members, setMembers] = useState<BotMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = () => {
      fetch(`${API_BASE}/api/members`)
        .then((r) => r.json())
        .then((data: BotMember[]) => {
          setMembers(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    };
    fetchMembers();
    const id = setInterval(fetchMembers, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  return { members, loading };
}
