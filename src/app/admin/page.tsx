"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Settings, Send, Zap, Users, Hash, Globe, AlertCircle,
  Plus, Trash2, ChevronDown, Upload, X, Info, Check,
  ToggleLeft, ToggleRight, Copy, Eye, EyeOff, ArrowLeft,
  Bell, Shield, UserPlus, Bot, Activity, Clock, Terminal,
  Radio, Newspaper, TrendingUp, Gamepad2, Calendar, Search,
  LogOut, Lock, User as UserIcon,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import InteractiveGrid from "@/components/InteractiveGrid";
import Aurora from "@/components/animations/Aurora";
import BlurText from "@/components/animations/BlurText";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ScrollVelocity from "@/components/animations/ScrollVelocity";
import BorderGlow from "@/components/animations/BorderGlow";
import CircularText from "@/components/animations/CircularText";
import Stepper from "@/components/animations/Stepper";

const BOT_API = process.env.NEXT_PUBLIC_BOT_API || "http://localhost:3001";

// ─── Auth helper (token armazenado no localStorage) ───────────────────────────
const TOKEN_KEY = "itadori_discord_token";
let _token: string | null = null;

function adminFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  if (!_token) return fetch(url, opts);
  const h = new Headers(opts.headers as HeadersInit | undefined);
  h.set("Authorization", `Bearer ${_token}`);
  return fetch(url, { ...opts, headers: h });
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Channel { id: string; name: string; }
interface Guild { id: string; name: string; icon: string | null; memberCount: number; }
interface DiscordUser { userId: string; username: string; avatar: string | null; }
interface Role { id: string; name: string; color: string; }
interface Command {
  name: string; description: string; category: string;
  aliases: string[]; usage: string; detailedDescription: string; permissions: string[];
}
interface EmbedField { id: string; name: string; value: string; inline: boolean; separate: boolean; }
interface EmbedState {
  color: string;
  authorName: string; authorUrl: string; authorIcon: string;
  title: string; titleUrl: string;
  description: string;
  thumbnail: string; image: string;
  fields: EmbedField[];
  footerText: string; footerIcon: string; timestamp: boolean;
}
interface WelcomeConfig { channelId: string | null; text: string; bannerUrl: string | null; }
interface LogsConfig { channelId: string | null; events: Record<string, boolean>; }
interface VerifyConfig { channelId: string | null; roleId: string | null; roleId2: string | null; message: string; keyword: string; }
interface LogEntry { id?: number; type: string; content: string; guild_id?: string; user_id?: string; user_name?: string; timestamp: string | Date; }

// ─── Discord Markdown Renderer ────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\|\|(.+?)\|\|/g,
      '<span style="background:#1E1F22;border-radius:2px;padding:0 2px;cursor:pointer" title="Spoiler">████</span>')
    .replace(/```[\w]*\n?([\s\S]+?)```/g,
      '<code style="display:block;background:#1E1F22;border-radius:4px;padding:8px;font-family:monospace;font-size:12px;white-space:pre">$1</code>')
    .replace(/`(.+?)`/g,
      '<code style="background:#1E1F22;border-radius:3px;padding:1px 5px;font-family:monospace;font-size:12px">$1</code>')
    .replace(/^&gt; (.+)/gm,
      '<div style="border-left:3px solid #4F545C;padding-left:10px;color:#B9BBBE;margin:2px 0">$1</div>')
    .replace(/^### (.+)$/gm,
      '<span style="display:block;font-size:15px;font-weight:700;color:#F2F3F5;margin:4px 0">$1</span>')
    .replace(/^## (.+)$/gm,
      '<span style="display:block;font-size:19px;font-weight:700;color:#F2F3F5;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:3px;margin:6px 0 3px">$1</span>')
    .replace(/^# (.+)$/gm,
      '<span style="display:block;font-size:24px;font-weight:800;color:#F2F3F5;border-bottom:2px solid rgba(255,255,255,0.12);padding-bottom:4px;margin:8px 0 4px">$1</span>')
    .replace(/\n/g, "<br>");
}

function previewTags(text: string, guildName = "Seu Servidor"): string {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return text
    .replace(/@USER/gi, "@NomeDoUsuário")
    .replace(/\{user\}/gi, "NomeDoUsuário")
    .replace(/#Server/gi, guildName).replace(/\{server\}/gi, guildName)
    .replace(/#Horario/gi, time).replace(/\{hora\}/gi, time);
}

// ─── Discord Embed Preview ────────────────────────────────────────────────────
function EmbedBlock({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="rounded mt-1 max-w-[520px] overflow-hidden"
      style={{ backgroundColor: "#2B2D31", borderLeft: `4px solid ${color || "#5865F2"}` }}>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DiscordPreview({ embed, webhookName, webhookAvatar, guildName }: {
  embed: EmbedState; webhookName: string; webhookAvatar: string; guildName?: string;
}) {
  const now  = new Date();
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // Separar fields bundled vs separate
  const bundledFields  = embed.fields.filter(f => !f.separate && (f.name || f.value));
  const separateFields = embed.fields.filter(f =>  f.separate && (f.name || f.value));

  const hasMainContent = embed.title || embed.description || embed.authorName ||
    bundledFields.length > 0 || embed.image || embed.footerText;

  const renderField = (f: EmbedField) => (
    <div key={f.id} style={{ gridColumn: f.inline ? "span 1" : "span 2 / span 2" }}>
      {f.name  && <p className="text-[#F2F3F5] text-xs font-semibold mb-0.5">{f.name}</p>}
      {f.value && <p className="text-[#DBDEE1] text-xs" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.value) }} />}
    </div>
  );

  return (
    <div className="bg-[#313338] rounded-lg p-4 font-sans min-h-[200px] space-y-0">
      {/* Message row */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-crimson flex items-center justify-center">
          {webhookAvatar ? (
            <img src={webhookAvatar} alt="" className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="text-white text-sm font-bold">{(webhookName || "B")[0].toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + BOT badge + time */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-white font-semibold text-sm">{webhookName || "Itadori Bot"}</span>
            <span className="bg-[#5865F2] text-white text-[10px] font-medium px-1.5 py-px rounded">BOT</span>
            <span className="text-[#87898C] text-xs">Hoje às {time}</span>
          </div>

          {/* ── Embed Principal (fields bundled) ── */}
          {hasMainContent && (
            <EmbedBlock color={embed.color}>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {embed.authorName && (
                    <div className="flex items-center gap-1.5">
                      {embed.authorIcon && (
                        <img src={embed.authorIcon} alt="" className="w-5 h-5 rounded-full"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <span className="text-[#F2F3F5] text-xs font-medium">{embed.authorName}</span>
                    </div>
                  )}
                  {embed.title && (
                    <p className="text-[#F2F3F5] font-semibold text-sm leading-snug"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(previewTags(embed.title, guildName)) }} />
                  )}
                  {embed.description && (
                    <p className="text-[#DBDEE1] text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(previewTags(embed.description, guildName)) }} />
                  )}
                  {bundledFields.length > 0 && (
                    <div className="grid gap-2" style={{
                      gridTemplateColumns: bundledFields.some(f => f.inline) ? "repeat(2, 1fr)" : "1fr"
                    }}>
                      {bundledFields.map(renderField)}
                    </div>
                  )}
                  {embed.image && (
                    <img src={embed.image} alt="embed image" className="mt-2 rounded max-w-full max-h-72 object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  )}
                  {(embed.footerText || embed.timestamp) && (
                    <div className="flex items-center gap-2 pt-1">
                      {embed.footerIcon && (
                        <img src={embed.footerIcon} alt="" className="w-4 h-4 rounded-full"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <span className="text-[#87898C] text-[11px]">
                        {embed.footerText}
                        {embed.footerText && embed.timestamp && " • "}
                        {embed.timestamp && `Hoje às ${time}`}
                      </span>
                    </div>
                  )}
                </div>
                {embed.thumbnail && (
                  <div className="flex-shrink-0">
                    <img src={embed.thumbnail} alt="thumbnail" className="w-16 h-16 rounded object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
            </EmbedBlock>
          )}

          {/* ── Embeds Separados (um por field marcado como Separado) ── */}
          {separateFields.map((f) => (
            <div key={f.id} className="mt-2">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-amber-400/60 font-mono">📦 embed separado</span>
              </div>
              <EmbedBlock color={embed.color}>
                <div className="grid gap-2" style={{ gridTemplateColumns: f.inline ? "repeat(2, 1fr)" : "1fr" }}>
                  {renderField(f)}
                </div>
              </EmbedBlock>
            </div>
          ))}

          {!hasMainContent && separateFields.length === 0 && (
            <p className="text-[#87898C] text-xs italic">Preencha os campos para ver o preview...</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Markdown Toolbar ─────────────────────────────────────────────────────────
const MD_BUTTONS = [
  { label: "B", title: "Negrito", wrap: ["**", "**"], bold: true },
  { label: "I", title: "Itálico", wrap: ["*", "*"], italic: true },
  { label: "U", title: "Sublinhado", wrap: ["__", "__"], underline: true },
  { label: "S̶", title: "Tachado", wrap: ["~~", "~~"] },
  { label: "`", title: "Código inline", wrap: ["`", "`"] },
  { label: "```", title: "Bloco de código", wrap: ["```\n", "\n```"] },
  { label: "||", title: "Spoiler", wrap: ["||", "||"] },
  { label: ">", title: "Citação", prefix: "> " },
  { label: "H1", title: "Título H1 (# texto)", prefix: "# " },
  { label: "H2", title: "Título H2 (## texto)", prefix: "## " },
  { label: "H3", title: "Título H3 (### texto)", prefix: "### " },
];

function MdToolbar({ target, onChange }: {
  target: string;
  onChange: (val: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const apply = useCallback((btn: typeof MD_BUTTONS[0]) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = target.slice(start, end);
    let newVal = target;
    if (btn.wrap) {
      newVal = target.slice(0, start) + btn.wrap[0] + selected + btn.wrap[1] + target.slice(end);
    } else if (btn.prefix) {
      newVal = target.slice(0, start) + btn.prefix + selected + target.slice(end);
    }
    onChange(newVal);
  }, [target, onChange]);

  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      {MD_BUTTONS.map((btn) => (
        <button
          key={btn.title}
          type="button"
          title={btn.title}
          onClick={() => apply(btn)}
          className={cn(
            "px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-crimson/20 border border-white/10 text-bone/70 hover:text-bone transition-colors",
            btn.bold && "font-bold",
            btn.italic && "italic",
            btn.underline && "underline",
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tags Helper Popup ────────────────────────────────────────────────────────
function TagsPopup({ onInsert }: { onInsert: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  const TAGS = [
    { tag: "@USER", desc: "Menciona o usuário que entrou/usou o comando" },
    { tag: "#Server", desc: "Nome do servidor (não o ID)" },
    { tag: "#Horario", desc: "Hora que o usuário entrou ou usou o comando" },
  ];
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors"
      >
        <Info className="w-3 h-3" /> Tags disponíveis
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 w-72 bg-[#1E1F22] border border-white/10 rounded-lg shadow-2xl p-3 space-y-2">
          {TAGS.map(t => (
            <div key={t.tag} className="flex items-start justify-between gap-2">
              <div>
                <code className="text-crimson text-xs font-mono">{t.tag}</code>
                <p className="text-bone/50 text-[11px] mt-0.5">{t.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => { onInsert(t.tag); setOpen(false); }}
                className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded bg-crimson/20 text-crimson hover:bg-crimson/30 transition-colors"
              >
                Inserir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Discord Formatting Reference Popup ──────────────────────────────────────
function FormattingRef() {
  const [open, setOpen] = useState(false);
  const items = [
    { syntax: "# texto", result: "título H1 (grande)" },
    { syntax: "## texto", result: "título H2 (médio)" },
    { syntax: "### texto", result: "título H3 (pequeno)" },
    { syntax: "**texto**", result: "negrito" },
    { syntax: "*texto*", result: "itálico" },
    { syntax: "***texto***", result: "negrito itálico" },
    { syntax: "__texto__", result: "sublinhado" },
    { syntax: "~~texto~~", result: "tachado" },
    { syntax: "`texto`", result: "código inline" },
    { syntax: "```\ntexto\n```", result: "bloco de código" },
    { syntax: "||texto||", result: "spoiler" },
    { syntax: "> texto", result: "citação" },
    { syntax: ">>> texto", result: "citação múltipla" },
  ];
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-white/5 border border-white/10 text-bone/50 hover:text-bone transition-colors"
      >
        <Info className="w-3 h-3" /> Formatação Discord
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 w-80 bg-[#1E1F22] border border-white/10 rounded-lg shadow-2xl p-3">
          <p className="text-bone/60 text-[11px] mb-2 font-medium uppercase tracking-wider">Markdown Discord</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {items.map(it => (
              <div key={it.syntax} className="flex items-center justify-between text-xs">
                <code className="font-mono text-bone/40 text-[11px]">{it.syntax}</code>
                <span className="text-bone/70">→ {it.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Label + optional tip ─────────────────────────────────────────────────────
function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-bone/60 uppercase tracking-wider">{label}</label>
        {tip && (
          <div className="relative">
            <button type="button" onClick={() => setShow(!show)}
              className="text-bone/30 hover:text-crimson transition-colors">
              <Info className="w-3 h-3" />
            </button>
            {show && (
              <div className="absolute left-5 top-0 z-50 w-60 bg-[#1E1F22] border border-white/10 rounded-lg p-2.5 shadow-xl text-xs text-bone/70 leading-relaxed">
                {tip}
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-bone placeholder-bone/30 focus:outline-none focus:border-crimson/50 transition-colors";
const textareaCls = `${inputCls} resize-none min-h-[90px]`;

// Log type colors and icons
const LOG_COLORS: Record<string, string> = {
  COMMAND: "text-blue-400",
  EMBED_WEBHOOK: "text-purple-400",
  MEMBER_JOIN: "text-emerald-400",
  MEMBER_LEAVE: "text-amber-400",
  BAN: "text-red-400",
  KICK: "text-orange-400",
  MESSAGE_DELETE: "text-rose-400",
  MESSAGE_EDIT: "text-cyan-400",
  VERIFY: "text-green-400",
  VERIFY_SETUP: "text-teal-400",
  DEFAULT: "text-bone/60",
};

function formatLogTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function TabOverview({ stats }: { stats: Record<string, unknown> | null }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial logs
    adminFetch(`${BOT_API}/api/logs`)
      .then(r => r.json())
      .then((data: LogEntry[]) => setLogs(data.slice(0, 20)))
      .catch(() => {});

    // Connect WebSocket
    const socket = io(BOT_API, { transports: ["websocket", "polling"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("newLog", (log: LogEntry) => {
      setLogs(prev => [log, ...prev].slice(0, 20));
    });
    socketRef.current = socket;

    return () => { socket.disconnect(); };
  }, []);

  const items = stats ? [
    { label: "Comandos Usados", value: stats.commandsUsed as number, icon: <Zap className="w-5 h-5" /> },
    { label: "Feiticeiros", value: stats.members as number, icon: <Users className="w-5 h-5" /> },
    { label: "Servidores", value: stats.guilds as number, icon: <Globe className="w-5 h-5" /> },
    { label: "Ping (ms)", value: stats.ping as number, icon: <Hash className="w-5 h-5" /> },
  ] : [];

  return (
    <div className="space-y-6">
      {!stats && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Bot offline. Inicie com <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded">node index.js</code> na pasta <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded">BOT DISCORD</code> para ver dados reais.</span>
        </div>
      )}
        {stats && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Bot online — <strong>{stats.botName as string}</strong></span>
          </div>
          <div className="mb-6 hidden sm:block">
            <ScrollVelocity text="ITADORI BOT — PAINEL ADMIN — ESTATÍSTICAS" velocity={3} className="text-crimson/10 font-bebas text-5xl tracking-widest" />
          </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map((it, idx) => (
                <ScrollReveal direction="up" delay={idx * 50} key={it.label} className="h-full">
                  <div className="bg-white/3 border border-white/8 rounded-xl p-5 text-center h-full hover:bg-white/5 transition-colors">
                  <div className="text-crimson mb-2 flex justify-center">{it.icon}</div>
                  <p className="text-3xl font-bebas text-bone">{(it.value ?? 0).toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-bone/40 mt-1">{it.label}</p>
                </div>
                </ScrollReveal>
              ))}
            </div>

          </>
        )}

      {/* Terminal-style Logs */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-crimson" />
            <h3 className="text-sm font-medium text-bone">Logs em Tempo Real</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-emerald-400 animate-pulse" : "bg-red-500")} />
            <span className="text-xs text-bone/40">{connected ? "Conectado" : "Desconectado"}</span>
          </div>
        </div>

        {/* Circular Deco Text */}
        <div className="absolute right-8 top-12 md:right-16 md:top-24 opacity-20 pointer-events-none hidden lg:block z-0 mix-blend-screen">
          <CircularText text="LIVE • SYSTEM • LOGS • OVERVIEW • " size={180} duration={20} />
        </div>

        {/* Glass Terminal wrapped in BorderGlow */}
        <BorderGlow glowColor="rgba(196, 18, 48, 0.4)" wrapperClassName="rounded-xl shadow-2xl z-10">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c]/90 to-[#12121a]/90 backdrop-blur-xl">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors" />
              </div>
              <span className="text-xs text-bone/40 font-mono ml-2">activity_logs — bash</span>
            </div>
            <div className="flex items-center gap-2 text-bone/30">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">{logs.length} eventos</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div
            ref={logsContainerRef}
            className="p-4 h-[320px] overflow-y-auto font-mono text-sm custom-scrollbar"
            style={{ scrollbarGutter: "stable" }}
          >
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-bone/30">
                <Terminal className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Aguardando logs...</p>
                <p className="text-[10px] mt-1 opacity-50">Os eventos aparecerao aqui em tempo real</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, i) => {
                  const color = LOG_COLORS[log.type] || LOG_COLORS.DEFAULT;
                  return (
                    <div
                      key={log.id || `${log.timestamp}-${i}`}
                      className="flex items-start gap-3 py-1.5 px-2 rounded hover:bg-white/5 transition-colors group"
                    >
                      {/* Timestamp */}
                      <span className="text-[10px] text-bone/30 flex-shrink-0 pt-0.5 tabular-nums">
                        [{formatLogTime(log.timestamp)}]
                      </span>

                      {/* Type badge */}
                      <span className={cn("text-[10px] font-semibold flex-shrink-0 pt-0.5 min-w-[90px]", color)}>
                        [{log.type}]
                      </span>

                      {/* Content */}
                      <span className="text-bone/70 text-xs leading-relaxed flex-1">
                        {log.content.replace(/<#\d+>/g, "#canal").replace(/<@\d+>/g, "@user")}
                      </span>

                      {/* User */}
                      {log.user_name && (
                        <span className="text-[10px] text-bone/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {log.user_name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Terminal Footer */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/3 border-t border-white/5 text-[10px] text-bone/30">
            <span className="font-mono">$ tail -f /var/log/itadori.log</span>
            <span className="font-mono">localhost:3001</span>
          </div>
        </div>
        </BorderGlow>
      </div>
    </div>
  );
}

// ─── Embed Builder Tab ────────────────────────────────────────────────────────
const DEFAULT_EMBED: EmbedState = {
  color: "#C41230",
  authorName: "", authorUrl: "", authorIcon: "",
  title: "", titleUrl: "",
  description: "",
  thumbnail: "", image: "",
  fields: [],
  footerText: "", footerIcon: "", timestamp: false,
};

function TabEmbedBuilder({ channels, guilds }: { channels: Channel[]; guilds: Guild[]; }) {
  const [embed, setEmbed] = useState<EmbedState>(DEFAULT_EMBED);
  const [channelId, setChannelId] = useState("");
  const [webhookName, setWebhookName] = useState("Itadori Bot");
  const [webhookAvatar, setWebhookAvatar] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedGuild = guilds[0];

  const set = (k: keyof EmbedState, v: unknown) =>
    setEmbed(prev => ({ ...prev, [k]: v }));

  const addField = () =>
    setEmbed(prev => ({
      ...prev,
      fields: [...prev.fields, { id: Date.now().toString(), name: "", value: "", inline: false, separate: false }],
    }));

  const updateField = (id: string, k: keyof EmbedField, v: unknown) =>
    setEmbed(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, [k]: v } : f),
    }));

  const removeField = (id: string) =>
    setEmbed(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));

  const insertTag = (tag: string) =>
    setEmbed(prev => ({ ...prev, description: prev.description + tag }));

  const uploadFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) set("image", d.url);
    } catch { /* ignore */ }
    setUploading(false);
  };

  const send = async () => {
    if (!channelId) { setResult({ ok: false, msg: "Selecione um canal." }); return; }
    setSending(true); setResult(null);
    try {
      const r = await adminFetch(`${BOT_API}/api/send-embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          title: embed.title || null,
          description: embed.description || null,
          color: embed.color,
          image: embed.image || null,
          thumbnail: embed.thumbnail || null,
          footer: embed.footerText || (embed.timestamp ? "" : null),
          username: webhookName,
          avatar: webhookAvatar || null,
          fields: embed.fields
            .filter(f => f.name || f.value)
            .map(f => ({ name: f.name, value: f.value, inline: f.inline, separate: f.separate })),
        }),
      });
      const d = await r.json();
      setResult(d.success ? { ok: true, msg: "Embed enviado com sucesso!" } : { ok: false, msg: d.error || "Erro ao enviar." });
    } catch {
      setResult({ ok: false, msg: "Bot offline ou erro de conexão." });
    }
    setSending(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* ── Left: Form ── */}
      <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">

        {/* Channel + Webhook identity */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Destino</p>
          <Field label="Canal" tip="Canal de texto onde o embed será enviado.">
            <select value={channelId} onChange={e => setChannelId(e.target.value)} className={inputCls}>
              <option value="">— Selecione um canal —</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Webhook" tip="Nome que aparece como remetente no Discord.">
              <input value={webhookName} onChange={e => setWebhookName(e.target.value)} placeholder="Itadori Bot" className={inputCls} />
            </Field>
            <Field label="Avatar URL" tip="URL do avatar do webhook (deixe em branco para usar o do bot).">
              <input value={webhookAvatar} onChange={e => setWebhookAvatar(e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </div>
        </section>

        {/* Color */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Cor da Borda</p>
          <div className="flex items-center gap-3">
            <input type="color" value={embed.color} onChange={e => set("color", e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
            <input value={embed.color} onChange={e => set("color", e.target.value)}
              placeholder="#C41230" className={cn(inputCls, "font-mono")} />
            <div className="flex gap-1.5">
              {["#C41230", "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245"].map(c => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  className="w-6 h-6 rounded-full border-2 border-white/10 hover:scale-110 transition-transform"
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </section>

        {/* Author */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Autor</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Autor">
              <input value={embed.authorName} onChange={e => set("authorName", e.target.value)} placeholder="Itadori Bot" className={inputCls} />
            </Field>
            <Field label="Ícone do Autor (URL)">
              <input value={embed.authorIcon} onChange={e => set("authorIcon", e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </div>
          <Field label="URL do Autor (clicável)">
            <input value={embed.authorUrl} onChange={e => set("authorUrl", e.target.value)} placeholder="https://..." className={inputCls} />
          </Field>
        </section>

        {/* Title + Description */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Conteúdo</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Título">
              <input value={embed.title} onChange={e => set("title", e.target.value)} placeholder="Título do embed" className={inputCls} />
            </Field>
            <Field label="URL do Título">
              <input value={embed.titleUrl} onChange={e => set("titleUrl", e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição" tip="Suporta formatação Markdown do Discord. Use as tags para mencionar usuários ou servidor.">
            <MdToolbar target={embed.description} onChange={v => set("description", v)} />
            <div className="flex gap-2 mb-1.5">
              <TagsPopup onInsert={insertTag} />
              <FormattingRef />
            </div>
            <textarea value={embed.description} onChange={e => set("description", e.target.value)}
              placeholder="Descrição com **negrito**, *itálico*, @USER, #Server, #Horario..."
              className={textareaCls} rows={4} />
          </Field>
        </section>

        {/* Fields */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Fields</p>
            <button type="button" onClick={addField}
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors">
              <Plus className="w-3 h-3" /> Adicionar Field
            </button>
          </div>
          {embed.fields.map((f) => (
            <div key={f.id} className="bg-black/20 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input value={f.name} onChange={e => updateField(f.id, "name", e.target.value)}
                  placeholder="Nome do field" className={cn(inputCls, "flex-1")} />
                <button type="button" onClick={() => removeField(f.id)}
                  className="text-bone/30 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea value={f.value} onChange={e => updateField(f.id, "value", e.target.value)}
                placeholder="Valor do field (suporta markdown)" className={cn(textareaCls, "min-h-[50px]")} rows={2} />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-bone/50 cursor-pointer">
                  <input type="checkbox" checked={!!f.inline} onChange={e => updateField(f.id, "inline", e.target.checked)}
                    className="accent-crimson" />
                  Inline (lado a lado)
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer"
                  title="Envia este field como um embed separado">
                  <input type="checkbox" checked={!!f.separate} onChange={e => updateField(f.id, "separate", e.target.checked)}
                    className="accent-amber-500" />
                  <span className={f.separate ? "text-amber-400" : "text-bone/50"}>Separado</span>
                </label>
              </div>
            </div>
          ))}
          {embed.fields.length === 0 && <p className="text-bone/25 text-xs text-center py-2">Nenhum field adicionado.</p>}
        </section>

        {/* Images */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Imagens</p>
          <Field label="Imagem Principal" tip="Aparece grande no final do embed.">
            <div className="flex gap-2">
              <input value={embed.image} onChange={e => set("image", e.target.value)}
                placeholder="https://... ou faça upload" className={cn(inputCls, "flex-1")} />
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 text-xs rounded-lg bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />{uploading ? "..." : "Upload"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            </div>
          </Field>
          <Field label="Thumbnail" tip="Imagem pequena no canto superior direito do embed.">
            <input value={embed.thumbnail} onChange={e => set("thumbnail", e.target.value)}
              placeholder="https://..." className={inputCls} />
          </Field>
        </section>

        {/* Footer */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Footer</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto do Footer" tip="Use #Horario para mostrar a hora atual.">
              <input value={embed.footerText} onChange={e => set("footerText", e.target.value)}
                placeholder="Footer • #Horario" className={inputCls} />
            </Field>
            <Field label="Ícone do Footer (URL)">
              <input value={embed.footerIcon} onChange={e => set("footerIcon", e.target.value)}
                placeholder="https://..." className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-bone/60 cursor-pointer">
            <input type="checkbox" checked={embed.timestamp} onChange={e => set("timestamp", e.target.checked)}
              className="accent-crimson" />
            Mostrar timestamp (hora atual)
          </label>
        </section>

        {/* Send */}
        <div className="space-y-2 pb-6">
          {result && (
            <p className={cn("text-sm px-4 py-2 rounded-lg", result.ok
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20")}>
              {result.msg}
            </p>
          )}
          <button type="button" onClick={send} disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : "Enviar Embed"}
          </button>
        </div>
      </div>

      {/* ── Right: Discord Preview ── */}
      <div className="hidden lg:block">
        <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider mb-3">Preview — Discord</p>
        <div className="sticky top-4">
          <DiscordPreview
            embed={embed}
            webhookName={webhookName}
            webhookAvatar={webhookAvatar}
            guildName={selectedGuild?.name}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Tab ──────────────────────────────────────────────────────────────
function TabWelcome({ channels, guilds }: { channels: Channel[]; guilds: Guild[]; }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [config, setConfig] = useState<WelcomeConfig>({ channelId: null, text: "", bannerUrl: null });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!guildId) return;
    adminFetch(`${BOT_API}/api/welcome-config/${guildId}`)
      .then(r => r.json()).then(setConfig).catch(() => {});
  }, [guildId]);

  const insertTag = (tag: string) =>
    setConfig(prev => ({ ...prev, text: prev.text + tag }));

  const uploadBanner = async (file: File) => {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) setConfig(prev => ({ ...prev, bannerUrl: d.url }));
    } catch { /* ignore */ }
    setUploading(false);
  };

  const save = async () => {
    if (!guildId || !config.channelId || !config.text) {
      setResult({ ok: false, msg: "Preencha servidor, canal e mensagem." }); return;
    }
    setSaving(true); setResult(null);
    try {
      const r = await adminFetch(`${BOT_API}/api/welcome-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, channelId: config.channelId, text: config.text, bannerUrl: config.bannerUrl }),
      });
      const d = await r.json();
      setResult(d.success ? { ok: true, msg: "Configuração salva!" } : { ok: false, msg: d.error || "Erro." });
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
  };

  // Parse "Título | Descrição" format
  const [previewTitle, previewDesc] = config.text.split("|").map(s => s.trim());

  const previewEmbed: EmbedState = {
    ...DEFAULT_EMBED,
    color: "#C41230",
    title: previewTags(previewTitle || "", guilds.find(g => g.id === guildId)?.name),
    description: previewTags(previewDesc || "", guilds.find(g => g.id === guildId)?.name),
    image: config.bannerUrl || "",
    footerText: "Boas-vindas • #Horario",
    timestamp: true,
    fields: [],
  };

  const steps: any[] = [
    {
      id: "channel",
      label: "Geral",
      description: "Escolha qual servidor e canal irá receber as notificações de boas-vindas.",
      content: (
        <div className="space-y-4">
          {guilds.length > 0 && (
            <Field label="Servidor">
              <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Canal de Boas-Vindas">
            <select value={config.channelId || ""} onChange={e => setConfig(p => ({ ...p, channelId: e.target.value }))} className={inputCls}>
              <option value="">— Selecione um canal —</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      ),
    },
    {
      id: "message",
      label: "Conteúdo",
      description: "Escreva a mensagem de boas-vindas do seu servidor de forma épica.",
      content: (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300 space-y-1">
            <code className="block font-mono text-xs bg-black/30 rounded p-2">Título | Descrição com @USER e #Server</code>
            <p className="text-xs text-amber-400/70">O separador <code>|</code> divide o título da descrição.</p>
          </div>

          <Field label="Sua Mensagem" tip="Suporta tags dinâmicas como @USER, #Server, #Horario.">
            <div className="flex gap-2 mb-1.5 flex-wrap">
              <TagsPopup onInsert={insertTag} />
            </div>
            <textarea
              value={config.text}
              onChange={e => setConfig(p => ({ ...p, text: e.target.value }))}
              placeholder="Bem-vindo ao servidor! | Que bom que você chegou, @USER!"
              className={textareaCls} rows={4}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "banner",
      label: "Aparência",
      description: "Adicione um Banner premium pra deixar sua mensagem ainda mais marcante.",
      content: (
        <div className="space-y-4">
          <Field label="Banner URL ou Upload" tip="Imagem que aparecerá destacada no Embed de entrada.">
            <div className="flex gap-2">
              <input value={config.bannerUrl || ""} onChange={e => setConfig(p => ({ ...p, bannerUrl: e.target.value }))}
                placeholder="https://..." className={cn(inputCls, "flex-1")} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 text-xs rounded-lg bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />{uploading ? "..." : "Upload local"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadBanner(f); }} />
            </div>
          </Field>
          
          <div className="mt-8">
            <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider mb-2">Live Preview</p>
            <div className="border border-white/5 bg-black/20 rounded-xl p-4">
              <DiscordPreview embed={previewEmbed} webhookName="Itadori Bot" webhookAvatar=""
                guildName={guilds.find(g => g.id === guildId)?.name} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "confirm",
      label: "Confirmar",
      description: "Revise tudo antes de aplicar a maldição.",
      content: (
        <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">Quase lá!</h2>
          <p className="text-sm text-bone/50 max-w-sm">
            Os dados foram estruturados. Canal configurado para <span className="font-semibold text-bone">#{channels.find(c => c.id === config.channelId)?.name || "?"}</span>.
          </p>
          
          {result && (
            <p className={cn("text-sm px-4 py-2 rounded-lg mt-4", result.ok
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20")}>
              {result.msg}
            </p>
          )}
        </div>
      ),
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
         <h1 className="text-2xl font-bebas tracking-wide mb-1 text-bone">Sistema de Boas-Vindas</h1>
         <p className="text-bone/50 text-sm">Construa o cenário de recepção perfeito pro seu servidor.</p>
      </div>

      <Stepper 
        steps={steps} 
        onComplete={save} 
        completeText={saving ? "Salvando..." : "Implantar Maldição"} 
      />
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
const LOG_EVENTS: { key: string; label: string; desc: string; group: string }[] = [
  { key: "memberJoin",       label: "Membro Entrou",           desc: "Notifica quando alguém entra no servidor.",             group: "Membros" },
  { key: "memberLeave",      label: "Membro Saiu",             desc: "Notifica quando alguém sai do servidor.",               group: "Membros" },
  { key: "memberBan",        label: "Membro Banido",           desc: "Notifica quando um membro é banido.",                   group: "Membros" },
  { key: "memberUnban",      label: "Membro Desbanido",        desc: "Notifica quando um ban é removido.",                    group: "Membros" },
  { key: "memberKick",       label: "Membro Expulso",          desc: "Notifica quando um membro é kickado.",                  group: "Membros" },
  { key: "memberRoleUpdate", label: "Cargo Alterado",          desc: "Notifica quando o cargo de um membro muda.",            group: "Membros" },
  { key: "nicknameChange",   label: "Apelido Alterado",        desc: "Notifica quando o apelido de um membro é alterado.",    group: "Membros" },
  { key: "messageDelete",    label: "Mensagem Deletada",       desc: "Notifica quando uma mensagem é apagada.",               group: "Mensagens" },
  { key: "messageEdit",      label: "Mensagem Editada",        desc: "Notifica quando uma mensagem é editada.",               group: "Mensagens" },
  { key: "messagePin",       label: "Mensagem Fixada",         desc: "Notifica quando uma mensagem é fixada no canal.",       group: "Mensagens" },
  { key: "channelCreate",    label: "Canal Criado",            desc: "Notifica quando um novo canal é criado.",               group: "Servidor" },
  { key: "channelDelete",    label: "Canal Deletado",          desc: "Notifica quando um canal é excluído.",                  group: "Servidor" },
  { key: "channelUpdate",    label: "Canal Atualizado",        desc: "Notifica quando as configurações de um canal mudam.",   group: "Servidor" },
  { key: "roleCreate",       label: "Cargo Criado",            desc: "Notifica quando um novo cargo é criado.",               group: "Servidor" },
  { key: "roleDelete",       label: "Cargo Deletado",          desc: "Notifica quando um cargo é excluído.",                  group: "Servidor" },
  { key: "roleUpdate",       label: "Cargo Atualizado",        desc: "Notifica quando as permissões de um cargo mudam.",      group: "Servidor" },
  { key: "voiceJoin",        label: "Entrou em Voz",           desc: "Notifica quando alguém entra em canal de voz.",         group: "Voz" },
  { key: "voiceLeave",       label: "Saiu de Voz",             desc: "Notifica quando alguém sai de canal de voz.",           group: "Voz" },
  { key: "voiceMove",        label: "Movido em Voz",           desc: "Notifica quando alguém é movido de canal de voz.",      group: "Voz" },
];

const DEFAULT_LOG_EVENTS: Record<string, boolean> = Object.fromEntries(
  LOG_EVENTS.map(e => [e.key, false])
);

function TabLogs({ channels, guilds }: { channels: Channel[]; guilds: Guild[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [config, setConfig] = useState<LogsConfig>({ channelId: null, events: { ...DEFAULT_LOG_EVENTS } });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!guildId) return;
    adminFetch(`${BOT_API}/api/logs-config/${guildId}`)
      .then(r => r.json())
      .then((d: LogsConfig) => setConfig({ channelId: d.channelId ?? null, events: { ...DEFAULT_LOG_EVENTS, ...d.events } }))
      .catch(() => {});
  }, [guildId]);

  const toggleEvent = (key: string) =>
    setConfig(p => ({ ...p, events: { ...p.events, [key]: !p.events[key] } }));

  const toggleGroup = (group: string, val: boolean) => {
    const keys = LOG_EVENTS.filter(e => e.group === group).map(e => e.key);
    setConfig(p => ({ ...p, events: { ...p.events, ...Object.fromEntries(keys.map(k => [k, val])) } }));
  };

  const save = async () => {
    if (!guildId || !config.channelId) {
      setResult({ ok: false, msg: "Selecione um servidor e canal." }); return;
    }
    setSaving(true); setResult(null);
    try {
      const r = await adminFetch(`${BOT_API}/api/logs-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, channelId: config.channelId, events: config.events }),
      });
      const d = await r.json();
      setResult(d.success ? { ok: true, msg: "Logs configurados com sucesso!" } : { ok: false, msg: d.error || "Erro." });
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
  };

  const groups = [...new Set(LOG_EVENTS.map(e => e.group))];
  const enabledCount = Object.values(config.events).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 space-y-1">
        <p className="font-semibold">Sistema de Logs</p>
        <p className="text-xs text-blue-400/70">
          Selecione o canal e quais eventos devem ser registrados. O bot enviará embeds automáticos para o canal configurado.
        </p>
      </div>

      {guilds.length > 0 && (
        <Field label="Servidor">
          <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Canal de Logs" tip="Canal onde os logs serão enviados.">
        <select value={config.channelId || ""} onChange={e => setConfig(p => ({ ...p, channelId: e.target.value }))} className={inputCls}>
          <option value="">— Selecione um canal —</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-bone/70">Eventos para notificar</p>
          <span className="text-xs text-bone/40">{enabledCount} de {LOG_EVENTS.length} ativos</span>
        </div>

        <div className="space-y-4">
          {groups.map(group => {
            const groupEvents = LOG_EVENTS.filter(e => e.group === group);
            const allOn = groupEvents.every(e => config.events[e.key]);
            const anyOn = groupEvents.some(e => config.events[e.key]);

            return (
              <div key={group} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-semibold text-bone/80">{group}</p>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group, !allOn)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      allOn
                        ? "bg-crimson/20 border-crimson/40 text-crimson"
                        : anyOn
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-white/5 border-white/10 text-bone/40 hover:text-bone hover:border-white/20"
                    )}
                  >
                    {allOn ? "Desativar todos" : "Ativar todos"}
                  </button>
                </div>

                {/* Event rows */}
                <div className="divide-y divide-white/5">
                  {groupEvents.map(ev => (
                    <label key={ev.key} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors">
                      <div>
                        <p className="text-sm text-bone/80">{ev.label}</p>
                        <p className="text-xs text-bone/40 mt-0.5">{ev.desc}</p>
                      </div>
                      <div
                        onClick={() => toggleEvent(ev.key)}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ml-4",
                          config.events[ev.key] ? "bg-crimson" : "bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow",
                          config.events[ev.key] ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {result && (
        <p className={cn("text-sm px-4 py-2 rounded-lg", result.ok
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20")}>
          {result.msg}
        </p>
      )}
      <button type="button" onClick={save} disabled={saving}
        className="w-full py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar Configuração de Logs"}
      </button>
    </div>
  );
}

// ─── Verify Tab ───────────────────────────────────────────────────────────────
function TabVerificar({ channels, guilds, roles }: { channels: Channel[]; guilds: Guild[]; roles: Role[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [config, setConfig] = useState<VerifyConfig>({
    channelId: null, roleId: null, roleId2: null, message: "", keyword: "verificar"
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!guildId) return;
    adminFetch(`${BOT_API}/api/verify-config/${guildId}`)
      .then(r => r.json())
      .then((d: VerifyConfig) => setConfig({
        channelId: d.channelId ?? null,
        roleId: d.roleId ?? null,
        roleId2: d.roleId2 ?? null,
        message: d.message ?? "",
        keyword: d.keyword ?? "verificar",
      }))
      .catch(() => {});
  }, [guildId]);

  const save = async () => {
    if (!guildId || !config.channelId || !config.roleId) {
      setResult({ ok: false, msg: "Selecione servidor, canal e cargo." }); return;
    }
    setSaving(true); setResult(null);
    try {
      const r = await adminFetch(`${BOT_API}/api/verify-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, ...config }),
      });
      const d = await r.json();
      setResult(d.success ? { ok: true, msg: "Configuração salva!" } : { ok: false, msg: d.error || "Erro." });
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
  };

  const previewEmbed: EmbedState = {
    ...DEFAULT_EMBED,
    color: "#C41230",
    title: "Verificação do Servidor",
    description: config.message || `Digite **${config.keyword || "verificar"}** neste canal para receber acesso ao servidor.`,
    footerText: "Verificação • Itadori Bot",
    fields: [],
    image: "", thumbnail: "",
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300 space-y-1">
          <p className="font-semibold">Sistema de Verificação</p>
          <p className="text-xs text-emerald-400/70">
            Configure o canal onde os membros devem se verificar, a palavra-chave que devem digitar, e o cargo que será atribuído automaticamente.
          </p>
        </div>

        {guilds.length > 0 && (
          <Field label="Servidor">
            <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
              {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Canal de Verificação" tip="Canal onde os usuários devem digitar a palavra-chave.">
          <select value={config.channelId || ""} onChange={e => setConfig(p => ({ ...p, channelId: e.target.value }))} className={inputCls}>
            <option value="">— Selecione um canal —</option>
            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Cargo Verificado (1)" tip="Cargo obrigatório atribuído após verificação.">
          <select value={config.roleId || ""} onChange={e => setConfig(p => ({ ...p, roleId: e.target.value }))} className={inputCls}>
            <option value="">— Selecione um cargo —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {roles.length === 0 && <p className="text-xs text-bone/30 mt-1">Bot offline ou nenhum cargo encontrado.</p>}
        </Field>

        <Field label="Cargo Verificado (2)" tip="Segundo cargo opcional atribuído junto com o primeiro.">
          <select value={config.roleId2 || ""} onChange={e => setConfig(p => ({ ...p, roleId2: e.target.value || null }))} className={inputCls}>
            <option value="">— Nenhum (opcional) —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>

        <Field label="Palavra-chave" tip="O usuário deve digitar esta palavra no canal para ser verificado.">
          <input
            value={config.keyword}
            onChange={e => setConfig(p => ({ ...p, keyword: e.target.value }))}
            placeholder="verificar"
            className={inputCls}
          />
        </Field>

        <Field label="Mensagem do Embed" tip="Texto exibido no embed enviado no canal de verificação.">
          <textarea
            value={config.message}
            onChange={e => setConfig(p => ({ ...p, message: e.target.value }))}
            placeholder={`Digite **${config.keyword || "verificar"}** neste canal para receber acesso ao servidor.`}
            className={textareaCls}
            rows={3}
          />
        </Field>

        {result && (
          <p className={cn("text-sm px-4 py-2 rounded-lg", result.ok
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20")}>
            {result.msg}
          </p>
        )}
        <button type="button" onClick={save} disabled={saving}
          className="w-full py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
          {saving ? "Salvando..." : "Salvar Verificação"}
        </button>
      </div>

      {/* Preview */}
      <div className="hidden lg:block">
        <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider mb-3">Preview — Canal de Verificação</p>
        <div className="sticky top-4">
          <DiscordPreview embed={previewEmbed} webhookName="Itadori Bot" webhookAvatar=""
            guildName={guilds.find(g => g.id === guildId)?.name} />
          <div className="mt-3 bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
            <p className="text-xs text-bone/40 uppercase tracking-wider font-semibold">Fluxo de verificação</p>
            <div className="space-y-1.5 text-xs text-bone/60">
              <p>1. Bot envia embed neste canal</p>
              <p>2. Membro digita <code className="bg-white/10 px-1 rounded">{config.keyword || "verificar"}</code></p>
              <p>3. Bot deleta a mensagem</p>
              <p>4. Bot adiciona o cargo selecionado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Commands Tab ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Administrador": "text-crimson",
  "Utilidade": "text-blue-400",
  "Diversão": "text-purple-400",
  "Geral": "text-bone/60",
};

function TabCommands({ commands }: { commands: Command[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const categories = [...new Set(commands.map(c => c.category).filter(Boolean))];
  const q = search.toLowerCase();
  const filtered = commands.filter(c =>
    (c.name ?? "").toLowerCase().includes(q) ||
    (c.description ?? "").toLowerCase().includes(q) ||
    (c.detailedDescription ?? "").toLowerCase().includes(q)
  );
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter(c => c.category === cat);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <div className="space-y-5">
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar comando..." className={inputCls} />

      {commands.length === 0 && (
        <p className="text-bone/30 text-sm text-center py-8">Bot offline ou nenhum comando encontrado.</p>
      )}

      {Object.entries(grouped).filter(([, cmds]) => cmds.length > 0).map(([cat, cmds]) => (
        <div key={cat}>
          <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", CATEGORY_COLORS[cat] || "text-bone/50")}>
            {cat} ({cmds.length})
          </p>
          <div className="space-y-1.5">
            {cmds.map((cmd, idx) => {
              const key = cmd.name || `cmd-${idx}`;
              const isOpen = expanded === key;
              return (
                <div key={key} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <code className="font-mono text-sm text-crimson flex-shrink-0">/{cmd.name}</code>
                      <span className="text-bone/50 text-sm truncate">{cmd.description}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-bone/30 transition-transform flex-shrink-0 ml-2", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                      {cmd.detailedDescription && (
                        <p className="text-sm text-bone/60 leading-relaxed">{cmd.detailedDescription}</p>
                      )}
                      {cmd.usage && (
                        <div>
                          <p className="text-[11px] text-bone/40 uppercase tracking-wider mb-1">Como usar</p>
                          <code className="block font-mono text-xs bg-black/30 rounded px-3 py-2 text-bone/70">{cmd.usage}</code>
                        </div>
                      )}
                      {cmd.aliases && cmd.aliases.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] text-bone/40 uppercase tracking-wider">Aliases (prefixo)</p>
                          {cmd.aliases.map(a => (
                            <span key={a} className="px-2 py-0.5 rounded bg-crimson/10 text-crimson text-xs font-mono">-{a}</span>
                          ))}
                        </div>
                      )}
                      {cmd.permissions && cmd.permissions.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] text-bone/40 uppercase tracking-wider">Permissões</p>
                          {cmd.permissions.map(p => (
                            <span key={p} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bot Config Tab ───────────────────────────────────────────────────────────
function TabBotConfig({ guilds, channels }: { guilds: Guild[]; channels: Channel[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [nickname, setNickname] = useState("");
  const [prefix, setPrefix] = useState("-");
  const [mentionResponse, setMentionResponse] = useState("");
  // channel filter
  const [filterMode, setFilterMode] = useState<"off" | "allow" | "deny">("off");
  const [filterChannels, setFilterChannels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!guildId) return;
    adminFetch(`${BOT_API}/api/guild-config/${guildId}`)
      .then(r => r.json())
      .then((d: { prefix: string; mentionResponse: string; nickname: string }) => {
        setNickname(d.nickname || "");
        setPrefix(d.prefix || "-");
        setMentionResponse(d.mentionResponse || "");
      })
      .catch(() => {});
    adminFetch(`${BOT_API}/api/channel-filter/${guildId}`)
      .then(r => r.json())
      .then((d: { mode: "off" | "allow" | "deny"; channels: string[] }) => {
        setFilterMode(d.mode || "off");
        setFilterChannels(d.channels || []);
      })
      .catch(() => {});
  }, [guildId]);

  const toggleFilterChannel = (id: string) =>
    setFilterChannels(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);

  const save = async () => {
    if (!guildId) return;
    setSaving(true); setResult(null);
    try {
      const [r1, r2] = await Promise.all([
        adminFetch(`${BOT_API}/api/guild-config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guildId, nickname, prefix, mentionResponse }),
        }),
        adminFetch(`${BOT_API}/api/channel-filter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guildId, mode: filterMode, channels: filterChannels }),
        }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      const ok = d1.success && d2.success;
      setResult(ok ? { ok: true, msg: "Configuração salva!" } : { ok: false, msg: d1.error || d2.error || "Erro." });
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
  };

  const FILTER_MODES = [
    { value: "off",   label: "Desativado",         desc: "Comandos funcionam em todos os canais." },
    { value: "allow", label: "Permitir apenas",     desc: "Só os canais marcados aceitam comandos." },
    { value: "deny",  label: "Bloquear",            desc: "Os canais marcados NÃO aceitam comandos." },
  ] as const;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-sm text-purple-300 space-y-1">
        <p className="font-semibold">Personalização do Bot</p>
        <p className="text-xs text-purple-400/70">
          Apelido, prefixo, resposta ao ser mencionado e filtro de canais para comandos.
        </p>
      </div>

      {guilds.length > 0 && (
        <Field label="Servidor">
          <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Apelido no Servidor" tip="Nome que o bot usará neste servidor. Deixe em branco para usar o nome original.">
        <input value={nickname} onChange={e => setNickname(e.target.value)}
          placeholder="Itadori Bot" className={inputCls} />
      </Field>

      <Field label="Prefixo de Comandos" tip={`Prefixo para comandos de texto (ex: ${prefix}ping). Padrão: -`}>
        <input value={prefix} onChange={e => setPrefix(e.target.value)}
          placeholder="-" className={cn(inputCls, "font-mono max-w-[120px]")} maxLength={5} />
      </Field>

      <Field label="Resposta ao ser Mencionado" tip="Mensagem enviada quando alguém menciona o bot. Deixe em branco para usar uma resposta aleatória no estilo Itadori.">
        <textarea value={mentionResponse} onChange={e => setMentionResponse(e.target.value)}
          placeholder="Deixe em branco para resposta automática Itadori..."
          className={textareaCls} rows={3} />
        <p className="text-xs text-bone/30 mt-1">
          Dica: quando em branco, o bot responde com frases no estilo Yuji Itadori aleatórias.
        </p>
      </Field>

      {/* ── Filtro de canais ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-crimson" />
          <span className="text-sm font-semibold text-bone">Filtro de Canais para Comandos</span>
        </div>
        <p className="text-xs text-bone/40">
          Defina quais canais aceitam ou bloqueiam o uso de comandos. Quando bloqueado, o bot avisa o usuário com os canais permitidos.
        </p>

        {/* Mode buttons */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setFilterMode(m.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filterMode === m.value
                  ? "bg-crimson border-crimson text-white"
                  : "bg-white/5 border-white/10 text-bone/60 hover:text-bone hover:bg-white/10"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-bone/30 italic">
          {FILTER_MODES.find(m => m.value === filterMode)?.desc}
        </p>

        {/* Channel list (shown only when mode is not off) */}
        {filterMode !== "off" && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-3 max-h-60 overflow-y-auto space-y-1">
            {channels.length === 0 && (
              <p className="text-xs text-bone/30 text-center py-4">Nenhum canal encontrado. Bot offline?</p>
            )}
            {channels.map(ch => (
              <label key={ch.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={filterChannels.includes(ch.id)}
                  onChange={() => toggleFilterChannel(ch.id)}
                  className="accent-crimson w-4 h-4 rounded"
                />
                <Hash className="w-3 h-3 text-bone/30 shrink-0" />
                <span className="text-sm text-bone/80 truncate">{ch.name}</span>
                {filterChannels.includes(ch.id) && (
                  <span className={cn(
                    "ml-auto text-xs px-2 py-0.5 rounded-full shrink-0",
                    filterMode === "allow"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  )}>
                    {filterMode === "allow" ? "Permitido" : "Bloqueado"}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {result && (
        <p className={cn("text-sm px-4 py-2 rounded-lg", result.ok
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20")}>
          {result.msg}
        </p>
      )}
      <button type="button" onClick={save} disabled={saving}
        className="w-full py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar Configurações"}
      </button>
    </div>
  );
}

// ─── Auto-Roles Tab ────────────────────────────────────────────────────────────
function TabAutoRoles({ guilds, roles }: { guilds: Guild[]; roles: Role[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!guildId) return;
    adminFetch(`${BOT_API}/api/auto-roles/${guildId}`)
      .then(r => r.json())
      .then((d: { roles: string[] }) => setSelectedRoles(d.roles || []))
      .catch(() => {});
  }, [guildId]);

  const toggle = (id: string) =>
    setSelectedRoles(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);

  const save = async () => {
    if (!guildId) return;
    setSaving(true); setResult(null);
    try {
      const r = await adminFetch(`${BOT_API}/api/auto-roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, roles: selectedRoles }),
      });
      const d = await r.json();
      setResult(d.success ? { ok: true, msg: "Auto-roles salvos!" } : { ok: false, msg: d.error || "Erro." });
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300 space-y-1">
        <p className="font-semibold">Cargos Automáticos ao Entrar</p>
        <p className="text-xs text-indigo-400/70">
          Selecione os cargos que serão atribuídos automaticamente para todo novo membro humano que entrar no servidor.
          Diferente da verificação — estes cargos são dados imediatamente.
        </p>
      </div>

      {guilds.length > 0 && (
        <Field label="Servidor">
          <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-bone/70">Cargos disponíveis</p>
          <span className="text-xs text-bone/40">{selectedRoles.length} selecionado(s)</span>
        </div>
        {roles.length === 0 ? (
          <p className="text-bone/30 text-sm text-center py-6">Bot offline ou nenhum cargo encontrado.</p>
        ) : (
          <div className="bg-white/3 border border-white/8 rounded-xl divide-y divide-white/5">
            {roles.map(r => (
              <label key={r.id} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="text-sm text-bone/80">{r.name}</span>
                </div>
                <input type="checkbox" checked={selectedRoles.includes(r.id)}
                  onChange={() => toggle(r.id)} className="accent-crimson w-4 h-4" />
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedRoles.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-3">
          <p className="text-xs text-bone/40 uppercase tracking-wider mb-2">Cargos que serão dados automaticamente</p>
          <div className="flex flex-wrap gap-2">
            {selectedRoles.map(id => {
              const r = roles.find(ro => ro.id === id);
              return r ? (
                <span key={id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                  style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }}>
                  {r.name}
                  <button type="button" onClick={() => toggle(id)} className="hover:opacity-70">×</button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {result && (
        <p className={cn("text-sm px-4 py-2 rounded-lg", result.ok
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20")}>
          {result.msg}
        </p>
      )}
      <button type="button" onClick={save} disabled={saving}
        className="w-full py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar Auto-Roles"}
      </button>
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
interface EventConfig {
  enabled: boolean;
  channelId: string;
  lastSent?: string;
  [key: string]: unknown;
}
interface EventsState {
  [key: string]: EventConfig;
}

const EVENT_DEFS = [
  {
    key: "anime",
    label: "🎌 Anime",
    desc: "Novos animes da temporada atual via MyAnimeList",
    color: "border-blue-500/30 bg-blue-500/5",
    badge: "Jikan API • Gratuito • Semanal",
    icon: <Radio className="w-5 h-5 text-blue-400" />,
    fields: [],
  },
  {
    key: "noticias",
    label: "📰 Notícias Gerais",
    desc: "Top manchetes por categoria (Tech, Esportes, Política...)",
    color: "border-red-500/30 bg-red-500/5",
    badge: "TheNewsAPI • NEWS_API_KEY no .env",
    icon: <Newspaper className="w-5 h-5 text-red-400" />,
    fields: [
      { key: "categoria", label: "Categoria", type: "select" as const, options: [
        { value: "general", label: "📰 Geral" }, { value: "tech", label: "💻 Tecnologia" },
        { value: "sports", label: "⚽ Esportes" }, { value: "politics", label: "🏛️ Política" },
        { value: "entertainment", label: "🎬 Entretenimento" }, { value: "science", label: "🔬 Ciência" },
        { value: "health", label: "🏥 Saúde" }, { value: "business", label: "💼 Negócios" },
      ]},
      { key: "frequencia", label: "Frequência (horas)", type: "select" as const, options: [
        { value: "1", label: "1 hora" }, { value: "3", label: "3 horas" },
        { value: "6", label: "6 horas" }, { value: "12", label: "12 horas" }, { value: "24", label: "24 horas" },
      ]},
    ],
  },
  {
    key: "politica_br",
    label: "🏛️ Política Brasileira",
    desc: "Câmara, Senado, proposições e notícias de toda política brasileira. Puxa votações, projetos de lei e Google News.",
    color: "border-green-600/30 bg-green-600/5",
    badge: "Câmara + Senado + SerpAPI • A cada 3h",
    icon: <Radio className="w-5 h-5 text-green-400" />,
    fields: [
      { key: "topicos", label: "Tópicos extras (vírgula separa)", type: "text" as const, placeholder: "ex: Lula, STF, Reforma Tributária" },
    ],
  },
  {
    key: "politica_mun",
    label: "🌍 Política Mundial",
    desc: "Notícias importantes de política global, geopolítica e relações internacionais via Google News.",
    color: "border-blue-700/30 bg-blue-700/5",
    badge: "SerpAPI • SERP_API_KEY no .env • A cada 4h",
    icon: <Radio className="w-5 h-5 text-blue-500" />,
    fields: [
      { key: "topicos", label: "Tópicos (vírgula = busca separada)", type: "text" as const, placeholder: "ex: EUA eleições, Guerra Ucrânia, China Taiwan" },
      { key: "frequencia", label: "Frequência (horas)", type: "select" as const, options: [
        { value: "2", label: "2 horas" }, { value: "4", label: "4 horas" },
        { value: "6", label: "6 horas" }, { value: "12", label: "12 horas" },
      ]},
    ],
  },
  {
    key: "ia_news",
    label: "🤖 IA & Inteligência Artificial",
    desc: "Novidades sobre IA, LLMs, ChatGPT, Claude, Gemini e mais. Traduzido automaticamente para PT-BR.",
    color: "border-purple-600/30 bg-purple-600/5",
    badge: "SerpAPI • SERP_API_KEY no .env • A cada 4h",
    icon: <Radio className="w-5 h-5 text-purple-400" />,
    fields: [
      { key: "topicos", label: "Tópicos (vírgula = busca separada)", type: "text" as const, placeholder: "ex: ChatGPT, Inteligência Artificial, Machine Learning" },
      { key: "frequencia", label: "Frequência (horas)", type: "select" as const, options: [
        { value: "2", label: "2 horas" }, { value: "4", label: "4 horas" },
        { value: "6", label: "6 horas" }, { value: "12", label: "12 horas" },
      ]},
    ],
  },
  {
    key: "financeiro",
    label: "💹 Notícias Financeiras",
    desc: "Alertas de mercado com análise de sentimento",
    color: "border-emerald-500/30 bg-emerald-500/5",
    badge: "Finlight • FINLIGHT_API_KEY no .env • 6h",
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    fields: [
      { key: "topico", label: "Tópico financeiro", type: "text" as const, placeholder: "ex: VALE3, Bitcoin, Petrobras" },
    ],
  },
  {
    key: "cotacao",
    label: "💱 Cotações do Dia",
    desc: "USD, EUR, BTC, ARS e mais no horário configurado",
    color: "border-green-500/30 bg-green-500/5",
    badge: "AwesomeAPI • Gratuito • Diário",
    icon: <TrendingUp className="w-5 h-5 text-green-400" />,
    fields: [
      { key: "hora", label: "Horário de envio", type: "time" as const, placeholder: "09:00" },
    ],
  },
  {
    key: "google_news",
    label: "🔍 Google News Personalizado",
    desc: "Notícias sobre qualquer tópico via Google News. Use vírgula para separar tópicos (cada um vira uma busca independente).",
    color: "border-sky-500/30 bg-sky-500/5",
    badge: "SerpAPI • SERP_API_KEY no .env",
    icon: <Search className="w-5 h-5 text-sky-400" />,
    fields: [
      { key: "topico", label: "Tópicos (vírgula = busca separada)", type: "text" as const, placeholder: "ex: Flamengo, Bitcoin, Inteligência Artificial, Comedia" },
      { key: "frequencia", label: "Frequência (horas)", type: "select" as const, options: [
        { value: "1", label: "1 hora" }, { value: "3", label: "3 horas" },
        { value: "6", label: "6 horas" }, { value: "12", label: "12 horas" },
      ]},
    ],
  },
  {
    key: "horoscopo",
    label: "♈ Horóscopo Diário",
    desc: "Previsões detalhadas dos 12 signos em PT-BR com número e cor da sorte, humor e compatibilidade.",
    color: "border-purple-500/30 bg-purple-500/5",
    badge: "RapidAPI Zodiac • Diário",
    icon: <Calendar className="w-5 h-5 text-purple-400" />,
    fields: [
      { key: "hora", label: "Horário de envio", type: "time" as const, placeholder: "08:00" },
    ],
  },
  {
    key: "steam",
    label: "🎮 Promoções Steam",
    desc: "Jogos em destaque com desconto na Steam Store BR",
    color: "border-[#1B2838]/60 bg-[#1B2838]/20",
    badge: "Steam Store • Gratuito • Diário",
    icon: <Gamepad2 className="w-5 h-5 text-slate-400" />,
    fields: [
      { key: "hora", label: "Horário de envio", type: "time" as const, placeholder: "12:00" },
    ],
  },
  {
    key: "eleicao",
    label: "🗳️ Eleições (CivicAPI)",
    desc: "Resultados e alertas de eleições ao redor do mundo",
    color: "border-amber-500/30 bg-amber-500/5",
    badge: "CivicAPI • Gratuito • A cada 4h",
    icon: <Radio className="w-5 h-5 text-amber-400" />,
    fields: [
      { key: "pais", label: "País (código ISO)", type: "text" as const, placeholder: "br" },
    ],
  },
];

function TabEventos({ guilds, channels, roles }: { guilds: Guild[]; channels: Channel[]; roles: Role[] }) {
  const [guildId,    setGuildId]    = useState(guilds[0]?.id || "");
  const [config,     setConfig]     = useState<EventsState>({});
  const [saving,     setSaving]     = useState<string | null>(null);
  const [testing,    setTesting]    = useState<string | null>(null);
  const [results,    setResults]    = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    if (!guildId) return;
    adminFetch(`${BOT_API}/api/events-config/${guildId}`)
      .then(r => r.json())
      .then((d: EventsState) => setConfig(d || {}))
      .catch(() => {});
  }, [guildId]);

  const getConf = (key: string): EventConfig =>
    config[key] || { enabled: false, channelId: "" };

  const updateConf = (key: string, patch: Partial<EventConfig>) => {
    setConfig(prev => ({ ...prev, [key]: { ...getConf(key), ...patch } }));
  };

  const saveConf = async (key: string) => {
    setSaving(key);
    try {
      const r = await adminFetch(`${BOT_API}/api/events-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, eventKey: key, data: getConf(key) }),
      });
      const d = await r.json();
      setResults(prev => ({ ...prev, [key]: d.success
        ? { ok: true, msg: "Salvo!" }
        : { ok: false, msg: d.error || "Erro ao salvar." }
      }));
    } catch {
      setResults(prev => ({ ...prev, [key]: { ok: false, msg: "Bot offline." } }));
    }
    setSaving(null);
    setTimeout(() => setResults(prev => { const n = { ...prev }; delete n[key]; return n; }), 3000);
  };

  const testEvent = async (key: string) => {
    setTesting(key);
    try {
      const r = await adminFetch(`${BOT_API}/api/events-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, eventKey: key }),
      });
      const d = await r.json();
      setResults(prev => ({ ...prev, [key]: d.success
        ? { ok: true, msg: "Evento disparado! Verifique o canal." }
        : { ok: false, msg: d.error || "Erro ao disparar." }
      }));
    } catch {
      setResults(prev => ({ ...prev, [key]: { ok: false, msg: "Bot offline." } }));
    }
    setTesting(null);
    setTimeout(() => setResults(prev => { const n = { ...prev }; delete n[key]; return n; }), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Seletor de servidor */}
      {guilds.length > 1 && (
        <div className="max-w-xs">
          <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
        <Radio className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Canal de Eventos Automáticos</p>
          <p className="text-blue-300/70 text-xs leading-relaxed">
            Ative os eventos que quiser, configure o canal e salve. O bot verificará automaticamente e enviará as notícias no intervalo configurado.
            Use <strong>Testar Agora</strong> para ver um exemplo imediatamente.
          </p>
        </div>
      </div>

      {/* Grade de eventos */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EVENT_DEFS.map(def => {
          const conf     = getConf(def.key);
          const isSaving = saving  === def.key;
          const isTesting= testing === def.key;
          const result   = results[def.key];

          return (
            <div key={def.key} className={cn(
              "border rounded-xl p-4 space-y-3 transition-all",
              def.color,
              conf.enabled ? "opacity-100" : "opacity-70"
            )}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {def.icon}
                  <span className="font-semibold text-bone text-sm">{def.label}</span>
                </div>
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => updateConf(def.key, { enabled: !conf.enabled })}
                  className="flex-shrink-0"
                >
                  {conf.enabled
                    ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                    : <ToggleLeft  className="w-6 h-6 text-bone/30" />
                  }
                </button>
              </div>

              <p className="text-bone/50 text-xs leading-relaxed">{def.desc}</p>
              <span className="inline-block text-[10px] text-bone/30 bg-white/5 px-2 py-0.5 rounded-full">{def.badge}</span>

              {/* Canal */}
              <div>
                <label className="text-[11px] text-bone/40 uppercase tracking-wider block mb-1">Canal</label>
                <select
                  value={conf.channelId || ""}
                  onChange={e => updateConf(def.key, { channelId: e.target.value })}
                  className={cn(inputCls, "text-xs py-1.5")}
                >
                  <option value="">— Selecione um canal —</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Cargo para mencionar (@CARGO acima do embed) */}
              <div>
                <label className="text-[11px] text-bone/40 uppercase tracking-wider block mb-1">Cargo para Mencionar</label>
                <select
                  value={(conf.roleId as string) || ""}
                  onChange={e => updateConf(def.key, { roleId: e.target.value })}
                  className={cn(inputCls, "text-xs py-1.5")}
                >
                  <option value="">— Nenhum (não menciona) —</option>
                  {roles.map(r => <option key={r.id} value={r.id} style={{ color: r.color }}>@{r.name}</option>)}
                </select>
                <p className="text-[10px] text-bone/30 mt-0.5">Ao enviar notícias, o bot vai marcar @cargo acima do embed. Também usado no painel /setnoticias.</p>
              </div>

              {/* Campos específicos */}
              {def.fields.map(field => (
                <div key={field.key}>
                  <label className="text-[11px] text-bone/40 uppercase tracking-wider block mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      value={(conf[field.key] as string) || ""}
                      onChange={e => updateConf(def.key, { [field.key]: e.target.value })}
                      className={cn(inputCls, "text-xs py-1.5")}
                    >
                      {(field.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === "time" ? (
                    <input
                      type="time"
                      value={(conf[field.key] as string) || ""}
                      onChange={e => updateConf(def.key, { [field.key]: e.target.value })}
                      className={cn(inputCls, "text-xs py-1.5")}
                    />
                  ) : (
                    <input
                      type="text"
                      value={(conf[field.key] as string) || ""}
                      onChange={e => updateConf(def.key, { [field.key]: e.target.value })}
                      placeholder={"placeholder" in field ? field.placeholder : ""}
                      className={cn(inputCls, "text-xs py-1.5")}
                    />
                  )}
                </div>
              ))}

              {/* Último envio */}
              {conf.lastSent && (
                <p className="text-[10px] text-bone/30">
                  ✅ Último envio: {new Date(conf.lastSent).toLocaleString("pt-BR")}
                </p>
              )}

              {/* Resultado */}
              {result && (
                <p className={cn("text-xs px-2 py-1 rounded", result.ok
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400")}>
                  {result.msg}
                </p>
              )}

              {/* Botões */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => saveConf(def.key)}
                  disabled={isSaving}
                  className="flex-1 py-1.5 bg-crimson rounded-lg text-white text-xs font-semibold hover:bg-crimson/80 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => testEvent(def.key)}
                  disabled={isTesting || !conf.channelId}
                  className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-bone/70 text-xs font-semibold hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  {isTesting ? "Enviando..." : "⚡ Testar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab Notícias: Gerenciar painel de reaction roles ────────────────────────
const NEWS_CATEGORIES = [
  { key: 'anime', emoji: '🎌', label: 'Anime', color: 'text-blue-400' },
  { key: 'noticias', emoji: '📰', label: 'Notícias', color: 'text-red-400' },
  { key: 'politica_br', emoji: '🏛️', label: 'Política BR', color: 'text-green-400' },
  { key: 'politica_mun', emoji: '🌍', label: 'Política Mundial', color: 'text-blue-500' },
  { key: 'ia_news', emoji: '🤖', label: 'IA News', color: 'text-purple-400' },
  { key: 'financeiro', emoji: '💹', label: 'Financeiro', color: 'text-emerald-400' },
  { key: 'cotacao', emoji: '💱', label: 'Cotações', color: 'text-green-400' },
  { key: 'google_news', emoji: '🔍', label: 'Google News', color: 'text-sky-400' },
  { key: 'horoscopo', emoji: '♈', label: 'Horóscopo', color: 'text-purple-400' },
  { key: 'steam', emoji: '🎮', label: 'Steam', color: 'text-slate-400' },
  { key: 'eleicao', emoji: '🗳️', label: 'Eleições', color: 'text-amber-400' },
];

function TabNoticias({ guilds, channels, roles }: { guilds: Guild[]; channels: Channel[]; roles: Role[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [panelChannel, setPanelChannel] = useState<string | null>(null);
  const [eventsConfig, setEventsConfig] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Configurações de personalização
  const [customTitle, setCustomTitle] = useState('📢 Inscreva-se nas Notícias');
  const [customDesc, setCustomDesc] = useState('Reaja com os emojis abaixo para **receber ou remover** notificações de cada categoria.');
  const [customColor, setCustomColor] = useState('#2b2d31');

  useEffect(() => {
    if (!guildId) return;

    // Busca canal do painel
    adminFetch(`${BOT_API}/api/news-panel/${guildId}`)
      .then(r => r.json())
      .then(data => {
        setPanelChannel(data.channelId || null);
        setEventsConfig(data.eventsConfig || {});
      })
      .catch(() => {});

    // Busca estatísticas
    adminFetch(`${BOT_API}/api/news-stats/${guildId}`)
      .then(r => r.json())
      .then(data => setStats(data.stats || {}))
      .catch(() => {});
  }, [guildId]);

  const createPanel = async () => {
    if (!panelChannel) {
      setResult({ ok: false, msg: "Selecione um canal primeiro!" });
      return;
    }

    setLoading(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/news-panel/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          channelId: panelChannel,
          customTitle,
          customDesc,
          customColor,
        }),
      });
      const data = await r.json();
      setResult(data.success
        ? { ok: true, msg: "✅ Painel criado com sucesso!" }
        : { ok: false, msg: data.error || "Erro ao criar painel." }
      );
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setLoading(false);
    setTimeout(() => setResult(null), 4000);
  };

  const removePanel = async () => {
    if (!confirm("Tem certeza que deseja remover o painel de notícias?")) return;

    setLoading(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/news-panel/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      });
      const data = await r.json();
      setResult(data.success
        ? { ok: true, msg: "✅ Painel removido!" }
        : { ok: false, msg: data.error || "Erro ao remover." }
      );
      if (data.success) setPanelChannel(null);
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setLoading(false);
    setTimeout(() => setResult(null), 4000);
  };

  const activeCategories = NEWS_CATEGORIES.filter(cat => {
    const conf = eventsConfig[cat.key];
    return conf?.enabled && conf?.roleId;
  });

  const totalSubscribers = Object.values(stats).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Seletor de servidor */}
      {guilds.length > 1 && (
        <div className="max-w-xs">
          <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
            {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
        <Newspaper className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Painel de Inscrição de Notícias</p>
          <p className="text-blue-300/70 text-xs leading-relaxed">
            Crie um painel com reações onde os membros podem se inscrever em categorias de notícias.
            Configure primeiro os cargos na aba <strong>Eventos</strong>.
          </p>
        </div>
      </div>

      {/* Status do Painel */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-xl bg-white/3 border border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 text-crimson" />
            <span className="font-semibold text-bone">Status do Painel</span>
          </div>
          {panelChannel ? (
            <div className="space-y-2">
              <p className="text-sm text-emerald-400">✅ Painel ativo em <span className="font-mono">#{channels.find(c => c.id === panelChannel)?.name || "canal-deletado"}</span></p>
              <p className="text-xs text-bone/50">Membros podem reagir aos emojis para se inscrever.</p>
            </div>
          ) : (
            <p className="text-sm text-bone/40">❌ Nenhum painel ativo no momento.</p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-white/3 border border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-crimson" />
            <span className="font-semibold text-bone">Estatísticas</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-bone">{totalSubscribers}</p>
            <p className="text-xs text-bone/50">Total de inscrições em todas as categorias</p>
          </div>
        </div>
      </div>

      {/* Estatísticas por Categoria */}
      {activeCategories.length > 0 && (
        <div className="p-4 rounded-xl bg-white/3 border border-white/8">
          <h3 className="font-semibold text-bone mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-crimson" />
            Inscritos por Categoria
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCategories.map(cat => {
              const count = stats[cat.key] || 0;
              const conf = eventsConfig[cat.key];
              const role = roles.find(r => r.id === conf?.roleId);

              return (
                <div key={cat.key} className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-sm font-medium text-bone">{cat.label}</span>
                    </div>
                    <span className="text-lg font-bold text-crimson">{count}</span>
                  </div>
                  {role && (
                    <p className="text-[10px] text-bone/40">Cargo: <span style={{ color: role.color }}>@{role.name}</span></p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Personalização */}
      <div className="p-4 rounded-xl bg-white/3 border border-white/8">
        <h3 className="font-semibold text-bone mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-crimson" />
          Personalizar Embed
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-bone/50 block mb-1">Título</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className={inputCls}
              placeholder="📢 Inscreva-se nas Notícias"
            />
          </div>
          <div>
            <label className="text-xs text-bone/50 block mb-1">Descrição</label>
            <textarea
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              className={cn(inputCls, "min-h-[80px]")}
              placeholder="Reaja com os emojis abaixo..."
            />
          </div>
          <div>
            <label className="text-xs text-bone/50 block mb-1">Cor (hex)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className={cn(inputCls, "flex-1")}
                placeholder="#2b2d31"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-white/3 border border-white/8">
        <h3 className="font-semibold text-bone mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-crimson" />
          Preview
        </h3>
        <div className="rounded-lg p-4" style={{ backgroundColor: '#2B2D31', borderLeft: `4px solid ${customColor}` }}>
          <div className="mb-3">
            <h4 className="text-white font-semibold text-lg mb-2">{customTitle || "Título"}</h4>
            <p className="text-sm text-gray-300">{customDesc || "Descrição"}</p>
          </div>
          {activeCategories.length > 0 && (
            <div className="mt-4 space-y-1">
              {activeCategories.map(cat => {
                const conf = eventsConfig[cat.key];
                return (
                  <p key={cat.key} className="text-sm text-bone/70">
                    {cat.emoji} <strong>{cat.label}</strong> → <span className="text-crimson">@{roles.find(r => r.id === conf?.roleId)?.name || "cargo"}</span>
                  </p>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-[10px] text-bone/40">Reaja novamente para remover • Engrenagem Itadori</p>
          </div>
        </div>
      </div>

      {/* Mensagem de resultado */}
      {result && (
        <div className={cn(
          "p-3 rounded-lg text-sm font-medium",
          result.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        )}>
          {result.msg}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-bone/50 block mb-2">Canal do Painel</label>
          <select
            value={panelChannel || ""}
            onChange={e => setPanelChannel(e.target.value)}
            className={inputCls}
          >
            <option value="">— Selecione um canal —</option>
            {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={createPanel}
          disabled={loading || !panelChannel || activeCategories.length === 0}
          className="flex-1 py-3 bg-crimson rounded-lg text-white font-semibold hover:bg-crimson/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Criando..." : panelChannel === null ? "🎨 Criar Painel" : "🔄 Recriar Painel"}
        </button>

        {panelChannel && (
          <button
            onClick={removePanel}
            disabled={loading}
            className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 font-semibold hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            🗑️ Remover
          </button>
        )}
      </div>

      {activeCategories.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <p className="font-semibold mb-1">⚠️ Nenhuma categoria ativa</p>
          <p className="text-amber-300/70 text-xs">
            Vá para a aba <strong>Eventos</strong> e configure pelo menos uma categoria com cargo antes de criar o painel.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Admin Page Shell ─────────────────────────────────────────────────────────
// ─── Aba Servidores ───────────────────────────────────────────────────────────
interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
}

function TabServidores() {
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${BOT_API}/api/guilds-list`)
      .then(r => r.json())
      .then(data => { setGuilds(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = guilds.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = guilds.reduce((a, g) => a + g.memberCount, 0);

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex gap-3 flex-wrap">
        <div className="rounded-lg bg-black/30 border border-purple-800/40 px-4 py-2 text-sm">
          <span className="text-gray-400">Servidores: </span>
          <span className="text-white font-bold">{guilds.length}</span>
        </div>
        <div className="rounded-lg bg-black/30 border border-purple-800/40 px-4 py-2 text-sm">
          <span className="text-gray-400">Membros totais: </span>
          <span className="text-white font-bold">{totalMembers.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar servidor..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-black/40 border border-purple-800/40 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />

      {/* Grid */}
      {loading ? (
        <p className="text-gray-400 text-sm">Carregando servidores...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(g => (
            <div key={g.id} className="rounded-xl border border-purple-800/30 bg-black/30 backdrop-blur p-4 flex flex-col items-center gap-2 hover:border-purple-500/50 transition-colors">
              {g.icon ? (
                <img src={g.icon} alt={g.name} className="w-14 h-14 rounded-full" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-purple-900/50 flex items-center justify-center text-xl font-bold text-purple-300">
                  {g.name.charAt(0)}
                </div>
              )}
              <p className="text-sm font-semibold text-white text-center leading-tight line-clamp-2">{g.name}</p>
              <p className="text-xs text-gray-400">👥 {g.memberCount.toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Aba IA ───────────────────────────────────────────────────────────────────
function TabIA({ guilds }: { guilds: Guild[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [config, setConfig] = useState<any>({ 
    enabled: true, dmMode: false, maxCallsPerHour: 25, 
    horaInicio: 0, horaFim: 24, cooldownMinutes: 30 
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [provider, setProvider] = useState<string>("groq");

  useEffect(() => {
    adminFetch(`${BOT_API}/api/ai-provider`)
      .then(r => r.json())
      .then(d => { if (d?.provider) setProvider(d.provider); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    adminFetch(`${BOT_API}/api/ia-config/${guildId}`)
      .then(r => r.json())
      .then(d => setConfig(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const save = async () => {
    setSaving(true); setResult(null);
    try {
      const r = await adminFetch(`${BOT_API}/api/ia-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, ...config }),
      });
      const d = await r.json();
      setResult(d.success ? { ok: true, msg: "Configuração salva!" } : { ok: false, msg: d.error || "Erro." });
    } catch {
      setResult({ ok: false, msg: "Bot offline." });
    }
    setSaving(false);
    setTimeout(() => setResult(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bebas tracking-wide mb-1 text-bone">Controle de Energia Amaldiçoada (IA)</h1>
           <p className="text-bone/50 text-sm">Configure como o Itadori interage e modera seu servidor usando IA.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
           <Activity className="w-4 h-4 text-crimson" />
           <span className="text-xs font-semibold text-bone/70 uppercase">Status: {provider === "ollama" ? "Ollama Local" : "Groq Cloud"}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Field label="Selecionar Servidor">
            <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
              {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>

          <div className="bg-crimson/5 border border-crimson/20 rounded-xl p-4 space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-bone">IA Habilitada</span>
                <button onClick={() => setConfig({...config, enabled: !config.enabled})} className="focus:outline-none">
                  {config.enabled ? <ToggleRight className="w-8 h-8 text-crimson" /> : <ToggleLeft className="w-8 h-8 text-white/20" />}
                </button>
             </div>
             <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-bone">Modo Privado (DM)</span>
                  <p className="text-[10px] text-bone/40">Responde no DM do usuário para evitar flood.</p>
                </div>
                <button onClick={() => setConfig({...config, dmMode: !config.dmMode})} className="focus:outline-none">
                  {config.dmMode ? <ToggleRight className="w-8 h-8 text-crimson" /> : <ToggleLeft className="w-8 h-8 text-white/20" />}
                </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Limite por Hora" tip="Máximo de interações por servidor a cada hora.">
                  <input type="number" value={config.maxCallsPerHour} onChange={e => setConfig({...config, maxCallsPerHour: e.target.value})} className={inputCls} />
                </Field>
                <Field label="Cooldown (Minutos)" tip="Tempo de espera sugerido após resolver uma dúvida.">
                  <input type="number" value={config.cooldownMinutes} onChange={e => setConfig({...config, cooldownMinutes: e.target.value})} className={inputCls} />
                </Field>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-semibold text-bone/40 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4 text-crimson" /> Janela de Funcionamento (Brasília)
                 </label>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <span className="text-[10px] text-bone/30 uppercase">Início (0-23h)</span>
                       <input type="number" min="0" max="23" value={config.horaInicio} onChange={e => setConfig({...config, horaInicio: e.target.value})} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                       <span className="text-[10px] text-bone/30 uppercase">Fim (0-23h)</span>
                       <input type="number" min="0" max="23" value={config.horaFim} onChange={e => setConfig({...config, horaFim: e.target.value})} className={inputCls} />
                    </div>
                 </div>
                 <p className="text-[10px] text-crimson/60 italic">* Use 0 e 24 para funcionamento 24h.</p>
              </div>

              {result && (
                <p className={cn("text-sm px-4 py-2 rounded-lg mt-4", result.ok
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                  {result.msg}
                </p>
              )}

              <button onClick={save} disabled={saving || loading}
                className="w-full py-3 bg-crimson rounded-xl text-white font-bold hover:bg-crimson-light transition-all shadow-lg shadow-crimson/10 disabled:opacity-50">
                {saving ? "Canalizando..." : "Vincular Configurações"}
              </button>
           </div>
           
           <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start text-amber-200/80 text-xs shadow-inner">
              <Shield className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <p>O Itadori utiliza filtros avançados de linguagem para evitar abusos. Se detectar ofensas repetidas, o usuário entrará em cooldown automático.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Commands Tab ──────────────────────────────────────────────────────
interface CustomCmd {
  id: number; guild_id: string; trigger: string; trigger_type: string;
  response: string; required_role_id: string | null; cooldown_seconds: number; enabled: number;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  prefix: "Prefixo",
  contains: "Contém",
  exact: "Exato",
};

function TabCustomCmds({ guilds, roles }: { guilds: Guild[]; roles: Role[] }) {
  const [guildId, setGuildId] = useState(guilds[0]?.id || "");
  const [cmds, setCmds] = useState<CustomCmd[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [trigger, setTrigger] = useState("");
  const [triggerType, setTriggerType] = useState("prefix");
  const [response, setResponse] = useState("");
  const [roleId, setRoleId] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const guildRoles = roles;

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    adminFetch(`${BOT_API}/api/custom-commands/${guildId}`)
      .then(r => r.json())
      .then((data: CustomCmd[]) => { setCmds(Array.isArray(data) ? data : []); })
      .catch(() => setCmds([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  const showResult = (ok: boolean, msg: string) => {
    setResult({ ok, msg });
    setTimeout(() => setResult(null), 3500);
  };

  const handleCreate = async () => {
    if (!guildId || !trigger.trim() || !response.trim()) {
      return showResult(false, "Preencha o gatilho e a resposta.");
    }
    setSaving(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/custom-commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, trigger: trigger.trim(), triggerType, response, requiredRoleId: roleId || null, cooldownSeconds: cooldown }),
      });
      const d = await r.json();
      if (d.success) {
        showResult(true, "Comando criado!");
        setTrigger(""); setResponse(""); setRoleId(""); setCooldown(0);
        // reload
        const fresh = await adminFetch(`${BOT_API}/api/custom-commands/${guildId}`).then(r2 => r2.json());
        setCmds(Array.isArray(fresh) ? fresh : []);
      } else {
        showResult(false, d.error || "Erro ao criar.");
      }
    } catch { showResult(false, "Bot offline."); }
    setSaving(false);
  };

  const handleDelete = async (cmd: CustomCmd) => {
    try {
      await adminFetch(`${BOT_API}/api/custom-commands/${guildId}/${encodeURIComponent(cmd.trigger)}/${encodeURIComponent(cmd.trigger_type)}`, { method: "DELETE" });
      setCmds(prev => prev.filter(c => c.id !== cmd.id));
    } catch { showResult(false, "Erro ao deletar."); }
  };

  const handleToggle = async (cmd: CustomCmd) => {
    try {
      await adminFetch(`${BOT_API}/api/custom-commands/${guildId}/${encodeURIComponent(cmd.trigger)}/${encodeURIComponent(cmd.trigger_type)}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !cmd.enabled }),
      });
      setCmds(prev => prev.map(c => c.id === cmd.id ? { ...c, enabled: c.enabled ? 0 : 1 } : c));
    } catch { showResult(false, "Erro ao alternar."); }
  };

  return (
    <div className="space-y-6">
      {result && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${result.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {result.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {result.msg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form criar */}
        <div className="space-y-5">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 space-y-1">
            <p className="font-semibold">Como funciona</p>
            <p className="text-xs text-blue-300/70">
              <strong>Prefixo</strong> — ativa se a mensagem <em>começa com</em> o gatilho.<br />
              <strong>Contém</strong> — ativa se a mensagem <em>contém</em> o gatilho em qualquer parte.<br />
              <strong>Exato</strong> — ativa somente se a mensagem <em>for exatamente</em> o gatilho.
            </p>
          </div>

          {guilds.length > 0 && (
            <Field label="Servidor">
              <select value={guildId} onChange={e => setGuildId(e.target.value)} className={inputCls}>
                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gatilho">
              <input value={trigger} onChange={e => setTrigger(e.target.value)}
                placeholder="!regras ou olá" className={inputCls} maxLength={64} />
            </Field>
            <Field label="Tipo de detecção">
              <select value={triggerType} onChange={e => setTriggerType(e.target.value)} className={inputCls}>
                <option value="prefix">Prefixo</option>
                <option value="contains">Contém</option>
                <option value="exact">Exato</option>
              </select>
            </Field>
          </div>

          <Field label="Resposta" tip="Texto que o bot vai enviar. Suporta markdown do Discord.">
            <textarea value={response} onChange={e => setResponse(e.target.value)}
              placeholder="Leia as regras em #regras! **Bom jogo!**"
              className={textareaCls} rows={4} maxLength={1800} />
            <p className="text-xs text-bone/30 text-right">{response.length}/1800</p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo necessário (opcional)">
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className={inputCls}>
                <option value="">— Qualquer membro —</option>
                {guildRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Cooldown por usuário (seg)">
              <input type="number" min={0} max={3600} value={cooldown}
                onChange={e => setCooldown(Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          <button onClick={handleCreate} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-crimson hover:bg-crimson/80 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? "Salvando..." : "Criar Comando"}
          </button>
        </div>

        {/* Lista existente */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-bone/70">
              Comandos ativos ({cmds.length}/50)
            </p>
            {loading && <span className="text-xs text-bone/30">Carregando...</span>}
          </div>

          {cmds.length === 0 && !loading && (
            <div className="text-center py-10 text-bone/30 text-sm bg-white/3 border border-white/8 rounded-xl">
              Nenhum comando personalizado criado ainda.
            </div>
          )}

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {cmds.map(cmd => (
              <div key={cmd.id}
                className={`bg-white/3 border rounded-xl p-3 space-y-1.5 transition-opacity ${cmd.enabled ? "border-white/10" : "border-white/5 opacity-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-crimson text-sm font-mono bg-crimson/10 px-1.5 py-0.5 rounded">
                        {cmd.trigger}
                      </code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-bone/50">
                        {TRIGGER_TYPE_LABELS[cmd.trigger_type] || cmd.trigger_type}
                      </span>
                      {cmd.cooldown_seconds > 0 && (
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
                    <p className="text-bone/50 text-xs mt-1 truncate">{cmd.response}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(cmd)} title={cmd.enabled ? "Desativar" : "Ativar"}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-bone/50 hover:text-bone">
                      {cmd.enabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(cmd)} title="Deletar"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-bone/30 hover:text-red-400">
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

// ─── Sidebar Groups ────────────────────────────────────────────────────────
interface SidebarItem { id: string; label: string; icon: React.ReactNode; }
interface SidebarGroup { label: string; items: SidebarItem[]; }

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "Painel",
    items: [
      { id: "overview",   label: "Visão Geral",   icon: <Zap className="w-4 h-4" /> },
      { id: "servidores", label: "Servidores",     icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    label: "Servidor",
    items: [
      { id: "botconfig",  label: "Configurações",  icon: <Bot className="w-4 h-4" /> },
      { id: "welcome",    label: "Boas-Vindas",    icon: <Users className="w-4 h-4" /> },
      { id: "logs",       label: "Logs",            icon: <Bell className="w-4 h-4" /> },
      { id: "verificar",  label: "Verificação",     icon: <Shield className="w-4 h-4" /> },
      { id: "autoroles",  label: "Cargos Autom.",   icon: <UserPlus className="w-4 h-4" /> },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { id: "embed",      label: "Embed Builder",   icon: <Send className="w-4 h-4" /> },
      { id: "customcmds", label: "Comandos Pers.",  icon: <Terminal className="w-4 h-4" /> },
      { id: "commands",   label: "Comandos",         icon: <Hash className="w-4 h-4" /> },
    ],
  },
  {
    label: "Automação",
    items: [
      { id: "eventos",    label: "Eventos",          icon: <Radio className="w-4 h-4" /> },
      { id: "noticias",   label: "Notícias",         icon: <Newspaper className="w-4 h-4" /> },
      { id: "ia",         label: "Assistente IA",    icon: <Activity className="w-4 h-4" /> },
    ],
  },
];

// Flat list for compatibility
const TABS = SIDEBAR_GROUPS.flatMap(g => g.items);

// ─── Sidebar Component ──────────────────────────────────────────────────────
function Sidebar({
  tab, setTab, guild, online, user, onLogout, onSwitchGuild, collapsed, onToggle,
}: {
  tab: string; setTab: (t: string) => void; guild: Guild;
  online: boolean; user: DiscordUser | null;
  onLogout: () => void; onSwitchGuild: () => void;
  collapsed: boolean; onToggle: () => void;
}) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.webp?size=32`
    : null;
  const currentTab = TABS.find((item) => item.id === tab);

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full z-50 flex flex-col bg-[linear-gradient(180deg,#0b0b0e_0%,#111117_100%)] border-r border-white/5 transition-all duration-300",
      collapsed ? "w-[64px]" : "w-[240px]",
      "lg:relative lg:flex",
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-crimson flex items-center justify-center flex-shrink-0 shadow-lg shadow-crimson/20">
          <span className="font-bebas text-white text-sm">I</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bebas text-lg tracking-wider text-bone whitespace-nowrap">
              Itadori <span className="text-crimson">Admin</span>
            </span>
            <p className="text-[10px] uppercase tracking-[0.24em] text-bone/28">Controle do servidor</p>
          </div>
        )}
      </div>

      {/* Guild Badge */}
      <button
        onClick={onSwitchGuild}
        className={cn(
          "mx-3 mt-3 flex items-center gap-2 rounded-xl bg-white/3 border border-white/8 hover:border-crimson/30 transition-colors",
          collapsed ? "p-2 justify-center" : "p-2.5",
        )}
        title={collapsed ? guild.name : "Trocar servidor"}
      >
        {guild.icon ? (
          <img src={guild.icon} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-crimson/20 flex items-center justify-center flex-shrink-0">
            <span className="font-bebas text-crimson text-xs">{guild.name[0]}</span>
          </div>
        )}
        {!collapsed && (
          <>
            <span className="text-xs text-bone/60 truncate flex-1 text-left">{guild.name}</span>
            <ChevronDown className="w-3 h-3 text-bone/30 flex-shrink-0" />
          </>
        )}
      </button>

      {!collapsed && currentTab && (
        <div className="mx-3 mt-3 rounded-2xl border border-crimson/15 bg-crimson/8 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-crimson/70">Agora editando</p>
          <div className="mt-2 flex items-center gap-2 text-bone">
            {currentTab.icon}
            <span className="text-sm font-medium">{currentTab.label}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {SIDEBAR_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-bone/30 uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-xl transition-all",
                    collapsed ? "p-2.5 justify-center" : "px-3 py-2",
                    tab === item.id
                      ? "bg-crimson/15 text-crimson border border-crimson/20 shadow-sm shadow-crimson/5"
                      : "text-bone/50 hover:text-bone hover:bg-white/5 border border-transparent",
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/5 p-3 space-y-2 flex-shrink-0">
        {/* Status */}
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", online ? "bg-emerald-400 animate-pulse" : "bg-red-500")} />
          {!collapsed && <span className="text-xs text-bone/40">{online ? "Bot Online" : "Offline"}</span>}
        </div>

        {/* User */}
        {user && (
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
            ) : (
              <UserIcon className="w-4 h-4 text-bone/40 flex-shrink-0" />
            )}
            {!collapsed && (
              <span className="text-xs text-bone/50 truncate flex-1">{user.username}</span>
            )}
            <button onClick={onLogout} title="Sair"
              className="text-bone/30 hover:text-bone transition-colors flex-shrink-0">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={onToggle} className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-white/5 text-bone/30 hover:text-bone transition-colors">
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", collapsed ? "-rotate-90" : "rotate-90")} />
          {!collapsed && <span className="text-xs">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── ChatBot Widget ─────────────────────────────────────────────────────────
function ChatBotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${BOT_API}/api/dashboard-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-6) }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Erro de conexão." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300",
          open ? "bg-[#1a1a1e] border border-white/10 rotate-0" : "bg-crimson hover:scale-110 shadow-crimson/30",
        )}
      >
        {open ? <X className="w-5 h-5 text-bone" /> : <Bot className="w-6 h-6 text-white" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[480px] bg-[#111113] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0c0c0e]">
            <div className="w-8 h-8 rounded-xl bg-crimson/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-crimson" />
            </div>
            <div>
              <p className="text-sm font-semibold text-bone">Assistente Itadori</p>
              <p className="text-[10px] text-bone/40">Ajuda com configuração do bot</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-8 text-bone/30 text-sm">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Olá! Como posso ajudar?</p>
                <p className="text-xs mt-1 opacity-50">Pergunte sobre configurações do bot</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-crimson text-white rounded-br-sm"
                    : "bg-white/5 text-bone/80 border border-white/5 rounded-bl-sm",
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-bone/30 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-bone/30 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-bone/30 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-white/5 bg-[#0a0a0c]">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder="Digite sua dúvida..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-bone placeholder-bone/30 focus:outline-none focus:border-crimson/40"
              maxLength={500}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors flex items-center justify-center disabled:opacity-30">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tela de Login com Discord ────────────────────────────────────────────────
function LoginScreen() {
  const [error, setError] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) {
      setError(
        p.get("error") === "auth_failed"
          ? "Falha na autenticação com o Discord. Tente novamente."
          : "Ocorreu um erro. Tente novamente."
      );
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#08080A] flex items-center justify-center px-4">
      <Aurora colorStops={["#3b0512", "#c41230", "#08080a"]} amplitude={0.8} />

      <div className="relative w-full max-w-sm bg-[#111113] border border-white/8 rounded-2xl p-8 shadow-2xl z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-crimson flex items-center justify-center mb-3 shadow-lg shadow-crimson/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <BlurText 
            text="Itadori Admin" 
            delay={20} 
            className="font-bebas text-3xl tracking-wider text-bone"
          />
          <p className="text-bone/40 text-sm mt-1 text-center">
            Entre com sua conta do Discord para gerenciar seus servidores
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <a
          href={`${BOT_API}/auth/discord`}
          className="flex items-center justify-center gap-3 w-full py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-[#5865F2]/20"
        >
          {/* Discord SVG logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Entrar com Discord
        </a>

        <p className="text-center text-bone/30 text-xs mt-4">
          Você verá apenas servidores onde é administrador e o bot está presente
        </p>
      </div>
    </div>
  );
}

// ─── Tela de Seleção de Servidor ──────────────────────────────────────────────
function GuildPickerScreen({
  guilds,
  user,
  onSelect,
  onLogout,
}: {
  guilds: Guild[];
  user: DiscordUser | null;
  onSelect: (g: Guild) => void;
  onLogout: () => void;
}) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.webp?size=64`
    : null;

  return (
    <div className="min-h-screen bg-[#08080A] flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <InteractiveGrid />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bebas text-3xl tracking-wider text-bone">
              Selecione um <span className="text-crimson">Servidor</span>
            </h1>
            <p className="text-bone/40 text-sm mt-1">
              Servidores onde você é administrador e o bot está presente
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-crimson/30 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-crimson" />
                </div>
              )}
              <button
                onClick={onLogout}
                className="text-bone/40 hover:text-bone transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {guilds.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Globe className="w-12 h-12 text-bone/20 mx-auto" />
            <p className="text-bone/50 font-medium">Nenhum servidor encontrado</p>
            <p className="text-bone/30 text-sm max-w-xs mx-auto">
              Você precisa ser administrador de um servidor que tenha o bot adicionado.
            </p>
            <a
              href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-crimson/10 border border-crimson/20 text-crimson rounded-lg text-sm hover:bg-crimson/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Bot ao Servidor
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {guilds.map(guild => (
              <button
                key={guild.id}
                onClick={() => onSelect(guild)}
                className="w-full flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-xl hover:border-crimson/30 hover:bg-white/5 transition-all group text-left"
              >
                {guild.icon ? (
                  <img
                    src={guild.icon}
                    alt=""
                    className="w-12 h-12 rounded-full flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-crimson/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-bebas text-crimson text-xl">{guild.name[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-bone truncate">{guild.name}</p>
                  <p className="text-xs text-bone/40">
                    {guild.memberCount?.toLocaleString("pt-BR")} membros
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-bone/30 -rotate-90 group-hover:text-crimson transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Botão de Criar Cargo Automático ──────────────────────────────────────────
function AutoCreateRoleButton({
  guildId,
  roleName,
  onCreated,
}: {
  guildId: string;
  roleName: string;
  onCreated: (roleId: string, roleName: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const res = await adminFetch(`${BOT_API}/api/guild/${guildId}/roles/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName }),
      });
      const data = await res.json();
      if (data.id) {
        onCreated(data.id, data.name);
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span className="text-xs text-emerald-400">✓ Cargo criado</span>;

  return (
    <button
      type="button"
      onClick={create}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-crimson/70 hover:text-crimson transition-colors disabled:opacity-50"
    >
      <Plus className="w-3 h-3" />
      {loading ? "Criando..." : `Criar "${roleName}"`}
    </button>
  );
}

// (mantido apenas para compatibilidade de importação — não usado mais)
function _unusedLoginCompat() {
  const [showPass] = useState(false);
  void showPass;
  return null;
}
void _unusedLoginCompat;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepImports = { Eye, EyeOff, Lock, UserIcon };
void _keepImports;

/* ─── (fim dos componentes de auth) ─────────────────────────────────────────── */

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [mounted, setMounted]               = useState(false);
  const [authToken, setAuthToken]           = useState<string | null>(null);
  const [discordUser, setDiscordUser]       = useState<DiscordUser | null>(null);
  const [myGuilds, setMyGuilds]             = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild]   = useState<Guild | null>(null);

  const [tab, setTab]         = useState("overview");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles]       = useState<Role[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [botStats, setBotStats] = useState<Record<string, unknown> | null>(null);
  const [online, setOnline]     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar]       = useState(false);

  // ── Step 1: On mount, check for token in URL or localStorage ──────────────
  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    let token: string | null = null;

    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);
      token = urlToken;
      // Clean the URL
      window.history.replaceState({}, "", "/admin");
    } else {
      token = localStorage.getItem(TOKEN_KEY);
    }

    if (token) {
      // Basic expiry check by decoding JWT payload
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (Date.now() / 1000 > payload.exp) {
          localStorage.removeItem(TOKEN_KEY);
          return;
        }
        setDiscordUser({
          userId: payload.userId,
          username: payload.username,
          avatar: payload.avatar,
        });
      } catch { /* invalid token */ }

      _token = token;
      setAuthToken(token);
    }
  }, []);

  // ── Step 2: When token is set, fetch guilds + bot commands ────────────────
  useEffect(() => {
    if (!authToken) return;

    adminFetch(`${BOT_API}/api/my-guilds`)
      .then(r => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((data: Guild[]) => setMyGuilds(data))
      .catch(() => {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        _token = null;
        setAuthToken(null);
        setDiscordUser(null);
      });

    adminFetch(`${BOT_API}/api/commands`)
      .then(r => r.json())
      .then(setCommands)
      .catch(() => {});
  }, [authToken]);

  // ── Step 3: When a guild is selected, load its channels, roles, and stats ──
  useEffect(() => {
    if (!selectedGuild || !authToken) return;

    adminFetch(`${BOT_API}/api/guild/${selectedGuild.id}/channels`)
      .then(r => r.json()).then(setChannels).catch(() => {});

    adminFetch(`${BOT_API}/api/guild/${selectedGuild.id}/roles`)
      .then(r => r.json()).then(setRoles).catch(() => {});

    const fetchStats = async () => {
      try {
        const res = await adminFetch(`${BOT_API}/api/guild/${selectedGuild.id}/stats`);
        if (res.ok) {
          const data = await res.json();
          setBotStats({ ...data, members: data.memberCount, guilds: myGuilds.length, ping: data.ping });
          setOnline(true);
        }
      } catch { setOnline(false); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [selectedGuild, authToken, myGuilds.length]);

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    _token = null;
    setAuthToken(null);
    setDiscordUser(null);
    setSelectedGuild(null);
    setMyGuilds([]);
  }

  if (!mounted) return null;
  if (!authToken) return <LoginScreen />;
  if (!selectedGuild) {
    return (
      <GuildPickerScreen
        guilds={myGuilds}
        user={discordUser}
        onSelect={(g) => { setSelectedGuild(g); setTab("overview"); }}
        onLogout={handleLogout}
      />
    );
  }

  // Pass selected guild as the only guild so tabs auto-select it
  const guildArr = [selectedGuild];

  // Find current tab label
  const currentTab = TABS.find(t => t.id === tab);

  return (
    <div className="min-h-screen bg-[#08080A] text-bone flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileSidebar(false)} />
      )}

      {/* Sidebar — always visible on lg, toggled on mobile */}
      <div className={cn("lg:block", mobileSidebar ? "block" : "hidden")}>
        <Sidebar
          tab={tab}
          setTab={(t) => { setTab(t); setMobileSidebar(false); }}
          guild={selectedGuild}
          online={online}
          user={discordUser}
          onLogout={handleLogout}
          onSwitchGuild={() => setSelectedGuild(null)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#08080A]/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebar(true)} className="text-bone/50 hover:text-bone">
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-crimson flex items-center justify-center">
                <span className="font-bebas text-white text-xs">I</span>
              </div>
              <span className="font-bebas text-base tracking-wider">
                Itadori <span className="text-crimson">Admin</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", online ? "bg-emerald-400" : "bg-red-500")} />
            <a href="/" className="text-bone/40 hover:text-bone text-xs">
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Content header */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-1.5 text-bone/40 hover:text-bone transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </a>
            <span className="text-bone/15">|</span>
            <div className="flex items-center gap-2">
              {currentTab?.icon}
              <h1 className="text-lg font-semibold text-bone">{currentTab?.label || "Admin"}</h1>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          {tab === "overview"   && <TabOverview stats={botStats} />}
          {tab === "embed"      && <TabEmbedBuilder channels={channels} guilds={guildArr} />}
          {tab === "eventos"    && <TabEventos channels={channels} guilds={guildArr} roles={roles} />}
          {tab === "noticias"   && <TabNoticias channels={channels} guilds={guildArr} roles={roles} />}
          {tab === "welcome"    && <TabWelcome channels={channels} guilds={guildArr} />}
          {tab === "logs"       && <TabLogs channels={channels} guilds={guildArr} />}
          {tab === "verificar"  && <TabVerificar channels={channels} guilds={guildArr} roles={roles} />}
          {tab === "autoroles"  && <TabAutoRoles guilds={guildArr} roles={roles} />}
          {tab === "commands"   && <TabCommands commands={commands} />}
          {tab === "botconfig"  && <TabBotConfig guilds={guildArr} channels={channels} />}
          {tab === "ia"         && <TabIA guilds={guildArr} />}
          {tab === "customcmds" && <TabCustomCmds guilds={guildArr} roles={roles} />}
          {tab === "servidores" && <TabServidores />}
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatBotWidget />
    </div>
  );
}

