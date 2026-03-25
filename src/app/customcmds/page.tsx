"use client";

import { useEffect, useState, useCallback } from "react";
import { getToken, isTokenExpired, clearToken, authHeaders } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Terminal, Plus, Trash2, ToggleLeft, ToggleRight, Search,
  ArrowLeft, AlertCircle, Shield, ChevronDown,
} from "lucide-react";

const BOT_API = process.env.NEXT_PUBLIC_BOT_API || "http://localhost:3001";

interface Guild { id: string; name: string; icon: string | null; memberCount: number; }
interface Role { id: string; name: string; color: string; }
interface CustomCmd {
  id: number;
  trigger: string;
  response: string;
  trigger_type: string;
  required_role_id?: string | null;
  cooldown_seconds?: number;
  enabled: boolean;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  prefix: "Prefixo",
  contains: "Contém",
  exact: "Exato",
};

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) return fetch(url, opts);
  const h = new Headers(opts.headers as HeadersInit | undefined);
  h.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...opts, headers: h });
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F5F0EB] placeholder-[#F5F0EB]/30 focus:outline-none focus:border-[#C41230]/50 transition-colors";

export default function CustomCmdsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [cmds, setCmds] = useState<CustomCmd[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Create form
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [newTriggerType, setNewTriggerType] = useState("prefix");
  const [newRoleId, setNewRoleId] = useState("");
  const [newCooldown, setNewCooldown] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Auth check
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearToken();
      window.location.href = "/admin";
      return;
    }

    authFetch(`${BOT_API}/api/my-guilds`)
      .then(r => r.json())
      .then((data: Guild[]) => {
        setGuilds(data);
        if (data.length > 0) setSelectedGuild(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch commands + roles when guild changes
  const fetchCommands = useCallback(() => {
    if (!selectedGuild) return;
    setLoading(true);
    authFetch(`${BOT_API}/api/custom-commands/${selectedGuild}`)
      .then(r => r.json())
      .then(data => setCmds(Array.isArray(data) ? data : []))
      .catch(() => setCmds([]))
      .finally(() => setLoading(false));

    authFetch(`${BOT_API}/api/guild/${selectedGuild}/roles`)
      .then(r => r.json())
      .then(data => setRoles(Array.isArray(data) ? data : []))
      .catch(() => setRoles([]));
  }, [selectedGuild]);

  useEffect(() => { fetchCommands(); }, [fetchCommands]);

  const handleCreate = async () => {
    if (!selectedGuild || !newTrigger.trim() || !newResponse.trim()) {
      setResult({ ok: false, msg: "Preencha gatilho e resposta." });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const r = await authFetch(`${BOT_API}/api/custom-commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: selectedGuild,
          trigger: newTrigger.trim(),
          triggerType: newTriggerType,
          response: newResponse,
          requiredRoleId: newRoleId || null,
          cooldownSeconds: newCooldown,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setResult({ ok: true, msg: "Comando criado!" });
        setNewTrigger("");
        setNewResponse("");
        setNewRoleId("");
        setNewCooldown(0);
        fetchCommands();
      } else {
        setResult({ ok: false, msg: d.error || "Erro." });
      }
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
  };

  const handleDelete = async (cmd: CustomCmd) => {
    if (!confirm(`Deletar comando "${cmd.trigger}"?`)) return;
    await authFetch(
      `${BOT_API}/api/custom-commands/${selectedGuild}/${encodeURIComponent(cmd.trigger)}/${encodeURIComponent(cmd.trigger_type)}`,
      { method: "DELETE" },
    );
    fetchCommands();
  };

  const handleToggle = async (cmd: CustomCmd) => {
    await authFetch(
      `${BOT_API}/api/custom-commands/${selectedGuild}/${encodeURIComponent(cmd.trigger)}/${encodeURIComponent(cmd.trigger_type)}/toggle`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !cmd.enabled }),
      },
    );
    fetchCommands();
  };

  const filtered = cmds.filter(c =>
    c.trigger.toLowerCase().includes(search.toLowerCase()) ||
    c.response.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#08080A] text-[#F5F0EB]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#08080A]/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="flex items-center gap-1.5 text-[#F5F0EB]/50 hover:text-[#F5F0EB] transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Admin
            </a>
            <span className="text-[#F5F0EB]/20">/</span>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#C41230]" />
              <span className="font-semibold">Comandos Personalizados</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Guild Selector */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F0EB]/60 uppercase tracking-wider">Servidor</label>
            <select
              value={selectedGuild}
              onChange={e => setSelectedGuild(e.target.value)}
              className={inputCls}
            >
              {guilds.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#F5F0EB]/60 uppercase tracking-wider">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F0EB]/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar comando..."
                className={cn(inputCls, "pl-9")}
              />
            </div>
          </div>
        </div>

        {/* Create form */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-4 h-4 text-[#C41230]" />
            <p className="text-sm font-semibold text-[#F5F0EB]/80">Criar Novo Comando</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#F5F0EB]/50">Gatilho</label>
              <input
                value={newTrigger}
                onChange={e => setNewTrigger(e.target.value)}
                placeholder="ex: oi"
                className={inputCls}
                maxLength={64}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#F5F0EB]/50">Tipo de Gatilho</label>
              <select value={newTriggerType} onChange={e => setNewTriggerType(e.target.value)} className={inputCls}>
                <option value="prefix">Prefixo (começa com)</option>
                <option value="contains">Contém</option>
                <option value="exact">Exato</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#F5F0EB]/50">Cooldown (s)</label>
              <input
                type="number"
                value={newCooldown}
                onChange={e => setNewCooldown(Number(e.target.value))}
                min={0}
                max={3600}
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#F5F0EB]/50">Resposta</label>
            <textarea
              value={newResponse}
              onChange={e => setNewResponse(e.target.value)}
              placeholder="A resposta que o bot enviará..."
              className={cn(inputCls, "resize-none min-h-[80px]")}
              maxLength={1800}
              rows={3}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#F5F0EB]/50">Cargo Necessário (opcional)</label>
              <select value={newRoleId} onChange={e => setNewRoleId(e.target.value)} className={inputCls}>
                <option value="">— Sem restrição —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {result && (
            <p className={cn("text-sm px-4 py-2 rounded-lg", result.ok
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20")}>
              {result.msg}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={saving || !newTrigger.trim() || !newResponse.trim()}
            className="w-full py-2.5 rounded-xl bg-[#C41230] hover:bg-[#C41230]/80 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar Comando"}
          </button>
        </div>

        {/* Commands list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#F5F0EB]/70">
              Comandos ativos ({filtered.length}/{cmds.length})
            </p>
            {loading && <span className="text-xs text-[#F5F0EB]/30">Carregando...</span>}
          </div>

          {filtered.length === 0 && !loading && (
            <div className="text-center py-16 text-[#F5F0EB]/30 text-sm bg-white/3 border border-white/8 rounded-2xl">
              <Terminal className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>Nenhum comando encontrado.</p>
              <p className="text-xs mt-1 opacity-50">Crie seu primeiro comando acima.</p>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map(cmd => (
              <div
                key={cmd.id || cmd.trigger}
                className={cn(
                  "bg-white/3 border rounded-xl p-4 transition-all",
                  cmd.enabled ? "border-white/10" : "border-white/5 opacity-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[#C41230] text-sm font-mono bg-[#C41230]/10 px-2 py-0.5 rounded">
                        {cmd.trigger}
                      </code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#F5F0EB]/50">
                        {TRIGGER_TYPE_LABELS[cmd.trigger_type] || cmd.trigger_type}
                      </span>
                      {(cmd.cooldown_seconds || 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                          ⏱ {cmd.cooldown_seconds}s
                        </span>
                      )}
                      {cmd.required_role_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          🎭 cargo
                        </span>
                      )}
                    </div>
                    <p className="text-[#F5F0EB]/50 text-xs mt-2 line-clamp-2">{cmd.response}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(cmd)}
                      title={cmd.enabled ? "Desativar" : "Ativar"}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[#F5F0EB]/50 hover:text-[#F5F0EB]"
                    >
                      {cmd.enabled
                        ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                        : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(cmd)}
                      title="Deletar"
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[#F5F0EB]/30 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
