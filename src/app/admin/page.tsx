"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Settings, Send, Zap, Users, Hash, Globe, AlertCircle,
  Plus, Trash2, ChevronDown, Upload, X, Info, Check,
  ToggleLeft, ToggleRight, Copy, Eye, EyeOff, ArrowLeft,
  Bell, Shield, UserPlus, Bot, Activity, Clock, Terminal,
  Radio, Newspaper, TrendingUp, Gamepad2, Calendar, Search,
  LogOut, Lock, User as UserIcon, Smile, BookOpen, Image as ImageIcon,
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

function getBotApiLabel() {
  try {
    return new URL(BOT_API).host;
  } catch {
    return BOT_API.replace(/^https?:\/\//, "");
  }
}

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

  // Processar \n especial entre H1s: "# Título\n Continuação" vira H1 + subtext sem gap
  // Suporta: "# Titulo\nContinuação" — continua na mesma linha visual sem criar 2 H1s separados
  // A barra invertida literal \n no conteúdo vira uma quebra compacta
  let processed = text.replace(/\\n/g, "\x00COMPACT_BREAK\x00");

  return processed
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/gs, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/gs, "<em>$1</em>")
    .replace(/__(.+?)__/gs, "<u>$1</u>")
    .replace(/~~(.+?)~~/gs, "<s>$1</s>")
    .replace(/\|\|(.+?)\|\|/gs,
      '<span style="background:#1E1F22;border-radius:2px;padding:0 2px;cursor:pointer" title="Spoiler">████</span>')
    .replace(/```[\w]*\n?([\s\S]+?)```/g,
      '<code style="display:block;background:#1E1F22;border-radius:4px;padding:8px;font-family:monospace;font-size:12px;white-space:pre">$1</code>')
    .replace(/`(.+?)`/g,
      '<code style="background:#1E1F22;border-radius:3px;padding:1px 5px;font-family:monospace;font-size:12px">$1</code>')
    // Citação múltipla >>> (antes de >)
    .replace(/^&gt;&gt;&gt; (.+)/gm,
      '<div style="border-left:3px solid #4F545C;padding-left:10px;color:#B9BBBE;margin:2px 0;font-style:italic">$1</div>')
    .replace(/^&gt; (.+)/gm,
      '<div style="border-left:3px solid #4F545C;padding-left:10px;color:#B9BBBE;margin:2px 0">$1</div>')
    // -# texto pequeno (subtext do Discord)
    .replace(/^-# (.+)$/gm,
      '<span style="display:block;font-size:11px;color:#87898C;margin:1px 0">$1</span>')
    .replace(/^### (.+)$/gm,
      '<span style="display:block;font-size:15px;font-weight:700;color:#F2F3F5;margin:4px 0">$1</span>')
    .replace(/^## (.+)$/gm,
      '<span style="display:block;font-size:19px;font-weight:700;color:#F2F3F5;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:3px;margin:6px 0 3px">$1</span>')
    .replace(/^# (.+)$/gm,
      '<span style="display:block;font-size:24px;font-weight:800;color:#F2F3F5;border-bottom:2px solid rgba(255,255,255,0.12);padding-bottom:4px;margin:8px 0 4px">$1</span>')
    // Divisória responsiva — renderiza como hr estilizada no preview
    .replace(/─{3,}/g,
      '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.12);margin:6px 0;opacity:0.5"/>')
    // \x00COMPACT_BREAK\x00 = quebra de linha sem margem (para "# H1\nContinuação")
    .replace(/\x00COMPACT_BREAK\x00/g,
      '<br style="display:block;margin:0;content:\'\'"/>')
    .replace(/\n/g, "<br>");
}

function previewTags(text: string, guildName = "Seu Servidor", extraImages: string[] = [], cargoMention = "@Cargo"): string {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  let result = text
    // Novo sistema ${} — variáveis principais
    .replace(/\$\{USER\}/gi, "<@NomeDoUsuário>")
    .replace(/\$\{USERNAME\}/gi, "NomeDoUsuário")
    .replace(/\$\{SERVER\}/gi, guildName)
    .replace(/\$\{HORARIO\}/gi, time)
    .replace(/\$\{USER\.PERFIL\}/gi, "https://cdn.discordapp.com/embed/avatars/0.png")
    .replace(/\$\{USER\.BANNER\}/gi, "")
    .replace(/\$\{CARGO\}/gi, cargoMention)
    // Variável de divisória — linha responsiva baseada no contexto
    .replace(/\$\{DIVISORIA\}/gi, "─────────────────")
    // Legado para compatibilidade (serão convertidos no envio)
    .replace(/@USER/gi, "<@NomeDoUsuário>")
    .replace(/\{user\}/gi, "NomeDoUsuário")
    .replace(/#Server/gi, guildName).replace(/\{server\}/gi, guildName)
    .replace(/#Horario/gi, time).replace(/\{hora\}/gi, time);
  // IMG1..IMG5 — usa URL real se disponível, senão placeholder
  result = result.replace(/\$\{IMG([1-5])\}/gi, (_, n) => {
    const url = extraImages[Number(n) - 1];
    return url || `[IMG${n}]`;
  });
  return result;
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

function DiscordPreview({ embed, webhookName, webhookAvatar, guildName, extraImages = [], cargoMention = "@Cargo" }: {
  embed: EmbedState; webhookName: string; webhookAvatar: string; guildName?: string; extraImages?: string[]; cargoMention?: string;
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
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(previewTags(embed.title, guildName, extraImages, cargoMention)) }} />
                  )}
                  {embed.description && (
                    <p className="text-[#DBDEE1] text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(previewTags(embed.description, guildName, extraImages, cargoMention)) }} />
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
interface MdButton {
  label: string;
  title: string;
  wrap?: [string, string];
  prefix?: string;
  insert?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const MD_BUTTONS: MdButton[] = [
  { label: "B",   title: "Negrito",                                           wrap: ["**", "**"], bold: true },
  { label: "I",   title: "Itálico",                                           wrap: ["*", "*"],   italic: true },
  { label: "U",   title: "Sublinhado",                                        wrap: ["__", "__"], underline: true },
  { label: "S̶",   title: "Tachado",                                           wrap: ["~~", "~~"] },
  { label: "`",   title: "Código inline",                                     wrap: ["`", "`"] },
  { label: "```", title: "Bloco de código",                                   wrap: ["```\n", "\n```"] },
  { label: "||",  title: "Spoiler",                                           wrap: ["||", "||"] },
  { label: ">",   title: "Citação simples",                                   prefix: "> " },
  { label: ">>>", title: "Citação múltipla",                                  prefix: ">>> " },
  { label: "H1",  title: "Título H1 (# texto)",                              prefix: "# " },
  { label: "H2",  title: "Título H2 (## texto)",                             prefix: "## " },
  { label: "H3",  title: "Título H3 (### texto)",                            prefix: "### " },
  { label: "-#",  title: "Texto pequeno / subtext (-# texto)",               prefix: "-# " },
  { label: "\\n", title: "Quebra de linha compacta após H1 (sem gap duplo)", insert: "\\n" },
];

function MdToolbar({ target, onChange, textareaRef }: {
  target: string;
  onChange: (val: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const apply = useCallback((btn: MdButton) => {
    const el = textareaRef?.current;
    if (!el) {
      // Fallback: append/insert at end
      if ("wrap" in btn && btn.wrap) {
        onChange(target + btn.wrap[0] + btn.wrap[1]);
      } else if ("prefix" in btn && btn.prefix) {
        onChange(target + btn.prefix);
      } else if ("insert" in btn && btn.insert) {
        onChange(target + btn.insert);
      }
      return;
    }

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = target.slice(start, end);
    let newVal = target;
    let newCursorPos = end;

    if ("insert" in btn && btn.insert) {
      // Inserção literal no ponto de cursor
      newVal = target.slice(0, start) + btn.insert + target.slice(end);
      newCursorPos = start + btn.insert.length;
    } else if ("wrap" in btn && btn.wrap) {
      newVal = target.slice(0, start) + btn.wrap[0] + selected + btn.wrap[1] + target.slice(end);
      newCursorPos = start + btn.wrap[0].length + selected.length + btn.wrap[1].length;
    } else if ("prefix" in btn && btn.prefix) {
      newVal = target.slice(0, start) + btn.prefix + selected + target.slice(end);
      newCursorPos = start + btn.prefix.length + selected.length;
    }

    onChange(newVal);

    // Restaurar cursor/seleção após a atualização de estado
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [target, onChange, textareaRef]);

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

// ─── Variáveis disponíveis (usadas em autocomplete e TagsPopup) ──────────────
const ALL_VARS = [
  { tag: "${USER}",        desc: "Menciona o usuário (@NomeDoUsuário)", group: "text" },
  { tag: "${USERNAME}",    desc: "Nome do usuário sem menção", group: "text" },
  { tag: "${SERVER}",      desc: "Nome do servidor", group: "text" },
  { tag: "${HORARIO}",     desc: "Hora atual (Brasília)", group: "text" },
  { tag: "${CARGO}",       desc: "Menciona um cargo configurado", group: "text" },
  { tag: "${DIVISORIA}",   desc: "Linha divisória responsiva ao texto", group: "text" },
  { tag: "${USER.PERFIL}", desc: "URL da foto de perfil do usuário", group: "image" },
  { tag: "${USER.BANNER}", desc: "URL do banner do usuário", group: "image" },
  { tag: "${IMG1}",        desc: "Primeira imagem do container extra", group: "image" },
  { tag: "${IMG2}",        desc: "Segunda imagem do container extra", group: "image" },
  { tag: "${IMG3}",        desc: "Terceira imagem do container extra", group: "image" },
  { tag: "${IMG4}",        desc: "Quarta imagem do container extra", group: "image" },
  { tag: "${IMG5}",        desc: "Quinta imagem do container extra", group: "image" },
];

type VarEntry = typeof ALL_VARS[number];

// ─── Autocomplete de variáveis ${} ───────────────────────────────────────────
// Componente que envolve um textarea/input e detecta quando o usuário digita ${
// para mostrar um dropdown de sugestões de variáveis
function useVarAutocomplete({
  value,
  onChange,
  inputRef,
  imageOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  imageOnly?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<VarEntry[]>([]);
  const [triggerStart, setTriggerStart] = useState<number>(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const vars = imageOnly ? ALL_VARS.filter(v => v.group === "image") : ALL_VARS;

  const checkTrigger = useCallback((val: string, cursor: number) => {
    // Procura ${... antes do cursor
    const before = val.slice(0, cursor);
    const match = before.match(/\$\{([A-Z0-9._]*)$/i);
    if (match) {
      const query = match[1].toUpperCase();
      const filtered = vars.filter(v => v.tag.slice(2, -1).startsWith(query)); // remove ${ e }
      setSuggestions(filtered);
      setTriggerStart(cursor - match[0].length);
      setSelectedIdx(0);
    } else {
      setSuggestions([]);
      setTriggerStart(-1);
    }
  }, [vars]);

  const insertSuggestion = useCallback((v: VarEntry) => {
    if (!inputRef.current || triggerStart < 0) return;
    const cursor = inputRef.current.selectionStart ?? value.length;
    const newVal = value.slice(0, triggerStart) + v.tag + value.slice(cursor);
    onChange(newVal);
    setSuggestions([]);
    setTriggerStart(-1);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const pos = triggerStart + v.tag.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(pos, pos);
    });
  }, [value, onChange, inputRef, triggerStart]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertSuggestion(suggestions[selectedIdx]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }, [suggestions, selectedIdx, insertSuggestion]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    checkTrigger(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }, [onChange, checkTrigger]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
    checkTrigger(el.value, el.selectionStart ?? el.value.length);
  }, [checkTrigger]);

  return { suggestions, selectedIdx, setSelectedIdx, handleKeyDown, handleChange, handleClick, insertSuggestion };
}

// Wrapper de textarea com autocomplete de variáveis
function VarTextarea({
  value, onChange, placeholder, className, rows, imageOnly, textareaRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  imageOnly?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  // Sync internalRef with external textareaRef if provided
  useEffect(() => {
    if (textareaRef && internalRef.current) {
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = internalRef.current;
    }
  });

  const ac = useVarAutocomplete({
    value, onChange,
    inputRef: internalRef as React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
    imageOnly,
  });

  return (
    <div className="relative">
      <textarea
        ref={internalRef}
        value={value}
        onChange={ac.handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
        onClick={ac.handleClick as React.MouseEventHandler<HTMLTextAreaElement>}
        onKeyDown={ac.handleKeyDown}
        onContextMenu={e => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, e.currentTarget); }}
        onPaste={e => {
          if (Array.from(e.clipboardData.items).some(i => i.type.startsWith("image/"))) {
            e.preventDefault();
            toast("warning", "Colagem de imagem não suportada. Use o botão de upload 📎 para enviar imagens.", 10000);
          }
        }}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
      {ac.suggestions.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 w-72 bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl overflow-hidden"
          style={{ top: "100%" }}>
          {ac.suggestions.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onMouseDown={e => { e.preventDefault(); ac.insertSuggestion(s); }}
              onMouseEnter={() => ac.setSelectedIdx(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors",
                i === ac.selectedIdx ? "bg-crimson/20 text-bone" : "text-bone/60 hover:bg-white/5",
              )}
            >
              <code className="text-crimson font-mono">{s.tag}</code>
              <span className="text-bone/40 text-[10px] truncate">{s.desc}</span>
            </button>
          ))}
          <div className="px-3 py-1 border-t border-white/5 text-[10px] text-bone/25">
            ↑↓ navegar • Enter inserir • Esc fechar
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper de input com autocomplete de variáveis (para campos de URL com imageOnly)
function VarInput({
  value, onChange, placeholder, className, imageOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  imageOnly?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const ac = useVarAutocomplete({ value, onChange, inputRef: ref as React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>, imageOnly });

  return (
    <div className="relative flex-1">
      <input
        ref={ref}
        value={value}
        onChange={ac.handleChange as React.ChangeEventHandler<HTMLInputElement>}
        onClick={ac.handleClick as React.MouseEventHandler<HTMLInputElement>}
        onKeyDown={ac.handleKeyDown}
        onContextMenu={e => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, e.currentTarget); }}
        onPaste={e => {
          if (Array.from(e.clipboardData.items).some(i => i.type.startsWith("image/"))) {
            e.preventDefault();
            toast("warning", "Colagem de imagem não suportada. Use o botão de upload 📎 para enviar imagens.", 10000);
          }
        }}
        placeholder={placeholder}
        className={cn(className, "w-full")}
      />
      {ac.suggestions.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 w-72 bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl overflow-hidden"
          style={{ top: "100%" }}>
          {ac.suggestions.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onMouseDown={e => { e.preventDefault(); ac.insertSuggestion(s); }}
              onMouseEnter={() => ac.setSelectedIdx(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors",
                i === ac.selectedIdx ? "bg-crimson/20 text-bone" : "text-bone/60 hover:bg-white/5",
              )}
            >
              <code className="text-crimson font-mono">{s.tag}</code>
              <span className="text-bone/40 text-[10px] truncate">{s.desc}</span>
            </button>
          ))}
          <div className="px-3 py-1 border-t border-white/5 text-[10px] text-bone/25">
            ↑↓ navegar • Enter inserir • Esc fechar
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tags Helper Popup (hover-based) ─────────────────────────────────────────
function TagsPopup({ onInsert, imageOnly = false }: { onInsert: (tag: string) => void; imageOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tags = imageOnly ? ALL_VARS.filter(v => v.group === "image") : ALL_VARS;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors"
      >
        <Info className="w-3 h-3" /> {imageOnly ? "Variáveis de imagem" : "Variáveis ${}"}
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 w-80 bg-[#1E1F22] border border-white/10 rounded-lg shadow-2xl p-3 space-y-2">
          <p className="text-[10px] text-bone/40 uppercase tracking-wider mb-1">
            {imageOnly ? "Variáveis de imagem disponíveis" : "Variáveis disponíveis — clique para inserir"}
          </p>
          {tags.map(t => (
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

// ─── Discord Formatting Reference Popup (hover-based) ────────────────────────
function FormattingRef() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = [
    { syntax: "# texto",       result: "título H1 (grande)" },
    { syntax: "## texto",      result: "título H2 (médio)" },
    { syntax: "### texto",     result: "título H3 (pequeno)" },
    { syntax: "-# texto",      result: "texto pequeno / subtext" },
    { syntax: "**texto**",     result: "negrito" },
    { syntax: "*texto*",       result: "itálico" },
    { syntax: "***texto***",   result: "negrito itálico" },
    { syntax: "__texto__",     result: "sublinhado" },
    { syntax: "~~texto~~",     result: "tachado" },
    { syntax: "`texto`",       result: "código inline" },
    { syntax: "```\ntexto\n```", result: "bloco de código" },
    { syntax: "||texto||",     result: "spoiler (oculto)" },
    { syntax: "> texto",       result: "citação simples" },
    { syntax: ">>> texto",     result: "citação múltipla" },
    { syntax: "\\n",           result: "quebra compacta após H1 (sem gap duplo)" },
    { syntax: "${DIVISORIA}",  result: "linha divisória responsiva" },
  ];

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
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
                <code className="font-mono text-bone/40 text-[11px] whitespace-pre">{it.syntax}</code>
                <span className="text-bone/70 text-right ml-2">→ {it.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Label + optional tip (hover-based) ───────────────────────────────────────
function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setShow(false), 120);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-bone/60 uppercase tracking-wider">{label}</label>
        {tip && (
          <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <button type="button" className="text-bone/30 hover:text-crimson transition-colors">
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

// ─── Drag-and-drop hook for list reordering ──────────────────────────────────
function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (items: T[]) => void,
) {
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    overIdx.current = idx;
  };

  const onDrop = () => {
    if (dragIdx.current === null || overIdx.current === null || dragIdx.current === overIdx.current) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(overIdx.current, 0, moved);
    onReorder(next);
    dragIdx.current = null;
    overIdx.current = null;
  };

  const onDragEnd = () => {
    dragIdx.current = null;
    overIdx.current = null;
  };

  return { onDragStart, onDragOver, onDrop, onDragEnd };
}

// ─── Toast System ─────────────────────────────────────────────────────────────
interface Toast { id: string; type: "success" | "error" | "warning" | "info"; msg: string; }
let _toastSetter: ((fn: (prev: Toast[]) => Toast[]) => void) | null = null;

function toast(type: Toast["type"], msg: string, duration = 4000) {
  if (!_toastSetter) return;
  const id = Math.random().toString(36).slice(2);
  _toastSetter(prev => [...prev, { id, type, msg }]);
  setTimeout(() => {
    _toastSetter?.(prev => prev.filter(t => t.id !== id));
  }, duration);
}

const TOAST_STYLES: Record<Toast["type"], string> = {
  success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  error:   "bg-red-500/15 border-red-500/30 text-red-300",
  warning: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  info:    "bg-blue-500/15 border-blue-500/30 text-blue-300",
};
const TOAST_ICONS: Record<Toast["type"], string> = {
  success: "✓", error: "✕", warning: "⚠", info: "ℹ",
};

function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => { _toastSetter = setToasts; return () => { _toastSetter = null; }; }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-2xl pointer-events-auto",
            "animate-in fade-in slide-in-from-bottom-3 duration-200",
            TOAST_STYLES[t.type],
          )}
        >
          <span className="text-base">{TOAST_ICONS[t.type]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-bone placeholder-bone/30 focus:outline-none focus:border-crimson/50 transition-colors";
const textareaCls = `${inputCls} resize-none min-h-[90px]`;

// ─── Server Emoji Cache ───────────────────────────────────────────────────────
interface ServerEmoji { id: string; name: string; animated: boolean; url: string; raw: string; }
let _serverEmojis: ServerEmoji[] = [];
let _emojiFetched = false;
async function fetchServerEmojis(): Promise<ServerEmoji[]> {
  if (_emojiFetched) return _serverEmojis;
  try {
    const r = await adminFetch(`${BOT_API}/api/emojis`);
    _serverEmojis = await r.json();
    _emojiFetched = true;
  } catch { /* ignore */ }
  return _serverEmojis;
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
interface ContextMenuState {
  x: number; y: number;
  inputEl: HTMLTextAreaElement | HTMLInputElement;
}

let _ctxSetter: ((s: ContextMenuState | null) => void) | null = null;
function openContextMenu(x: number, y: number, el: HTMLTextAreaElement | HTMLInputElement) {
  _ctxSetter?.({ x, y, inputEl: el });
}

function ContextMenuPortal() {
  const [ctx, setCtx] = useState<ContextMenuState | null>(null);
  const [tab, setTab] = useState<"format" | "vars" | "emojis">("format");
  const [emojis, setEmojis] = useState<ServerEmoji[]>([]);
  const [emojiSearch, setEmojiSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { _ctxSetter = setCtx; return () => { _ctxSetter = null; }; }, []);

  useEffect(() => {
    if (!ctx) return;
    let alive = true;
    fetchServerEmojis().then(data => { if (alive) setEmojis(data); });
    setTab("format");
    setEmojiSearch("");
    return () => { alive = false; };
  }, [ctx]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!ctx) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCtx(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCtx(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [ctx]);

  const insertText = useCallback((before: string, after = "", insertOnly?: string) => {
    if (!ctx) return;
    const el = ctx.inputEl;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const val = el.value;
    const selected = val.slice(start, end);
    let newVal: string;
    let newCursor: number;
    if (insertOnly !== undefined) {
      newVal = val.slice(0, start) + insertOnly + val.slice(end);
      newCursor = start + insertOnly.length;
    } else {
      newVal = val.slice(0, start) + before + selected + after + val.slice(end);
      newCursor = start + before.length + selected.length + after.length;
    }
    // Trigger React synthetic change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
      "value"
    )?.set;
    nativeInputValueSetter?.call(el, newVal);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
    setCtx(null);
  }, [ctx]);

  if (!ctx) return null;

  // Position clamping so menu doesn't go off screen
  const menuW = 280, menuH = 340;
  const left = Math.min(ctx.x, window.innerWidth - menuW - 8);
  const top = Math.min(ctx.y, window.innerHeight - menuH - 8);

  const filteredEmojis = emojiSearch
    ? emojis.filter(e => e.name.toLowerCase().includes(emojiSearch.toLowerCase()))
    : emojis;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#1a1b1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      style={{ left, top, width: menuW }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Tabs */}
      <div className="flex border-b border-white/8">
        {(["format", "vars", "emojis"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 text-[11px] font-medium transition-colors",
              tab === t ? "text-crimson border-b-2 border-crimson" : "text-bone/40 hover:text-bone/70"
            )}>
            {t === "format" ? "Formatação" : t === "vars" ? "Variáveis" : "Emojis"}
          </button>
        ))}
        <button type="button" onClick={() => setCtx(null)}
          className="px-2 text-bone/30 hover:text-bone/70">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {tab === "format" && (
          <div className="flex flex-wrap gap-1">
            {MD_BUTTONS.map(btn => (
              <button key={btn.title} type="button" title={btn.title}
                onClick={() => {
                  if (btn.insert) insertText("", "", btn.insert);
                  else if (btn.wrap) insertText(btn.wrap[0], btn.wrap[1]);
                  else if (btn.prefix) insertText(btn.prefix);
                }}
                className={cn(
                  "px-2 py-1 text-xs rounded bg-white/5 hover:bg-crimson/20 border border-white/10 text-bone/70 hover:text-bone transition-colors",
                  btn.bold && "font-bold", btn.italic && "italic", btn.underline && "underline"
                )}>
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {tab === "vars" && (
          <div className="space-y-1">
            {ALL_VARS.map(v => (
              <button key={v.tag} type="button" onClick={() => insertText("", "", v.tag)}
                className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors group">
                <code className="text-crimson text-xs font-mono">{v.tag}</code>
                <span className="text-bone/35 text-[10px] truncate group-hover:text-bone/60">{v.desc}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "emojis" && (
          <div>
            <input
              value={emojiSearch}
              onChange={e => setEmojiSearch(e.target.value)}
              placeholder="Buscar emoji..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-bone placeholder-bone/30 focus:outline-none focus:border-crimson/50 mb-2"
              autoFocus
            />
            {filteredEmojis.length === 0 && (
              <p className="text-center text-bone/30 text-xs py-4">
                {emojis.length === 0 ? "Bot offline ou sem emojis no servidor" : "Nenhum emoji encontrado"}
              </p>
            )}
            <div className="grid grid-cols-6 gap-1">
              {filteredEmojis.slice(0, 60).map(e => (
                <button key={e.id} type="button" title={e.name}
                  onClick={() => insertText("", "", e.raw)}
                  className="w-9 h-9 rounded hover:bg-white/10 flex items-center justify-center transition-colors">
                  <img src={e.url} alt={e.name} className="w-6 h-6 object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Components V2 Preview ────────────────────────────────────────────────────
function ComponentsV2Preview({ embed, webhookName, webhookAvatar, gridImages }: {
  embed: EmbedState; webhookName: string; webhookAvatar: string; gridImages: string[];
}) {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const accentColor = embed.color || "#8b0000";
  const imgs = gridImages.filter(Boolean);

  return (
    <div className="bg-[#313338] rounded-lg p-4 font-sans min-h-[200px]">
      {/* Message row */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-crimson flex items-center justify-center">
          {webhookAvatar ? (
            <img src={webhookAvatar} alt="" className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="text-white text-sm font-bold">{(webhookName || "B")[0].toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-white font-semibold text-sm">{webhookName || "Itadori Bot"}</span>
            <span className="bg-[#5865F2] text-white text-[10px] font-medium px-1.5 py-px rounded">BOT</span>
            <span className="text-[#87898C] text-xs">Hoje às {time}</span>
          </div>

          {/* Container V2 */}
          <div className="rounded-lg overflow-hidden border border-white/5"
            style={{ borderLeft: `4px solid ${accentColor}`, background: "#2B2D31" }}>
            <div className="p-3 space-y-2">
              {/* Title */}
              {embed.title && (
                <p className="text-[#F2F3F5] font-bold text-base"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(embed.title) }} />
              )}
              {/* Description */}
              {embed.description && (
                <p className="text-[#DBDEE1] text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(embed.description) }} />
              )}

              {/* MediaGallery grid */}
              {imgs.length > 0 && (
                <div className={cn(
                  "grid gap-1 mt-2 rounded overflow-hidden",
                  imgs.length === 1 && "grid-cols-1",
                  imgs.length === 2 && "grid-cols-2",
                  imgs.length >= 3 && "grid-cols-2",
                )}>
                  {imgs.slice(0, 4).map((url, idx) => (
                    <div key={idx} className={cn(
                      "relative overflow-hidden bg-black/30",
                      imgs.length === 3 && idx === 0 && "col-span-2",
                    )} style={{ aspectRatio: imgs.length === 1 ? "16/9" : "1/1" }}>
                      <img src={url} alt={`img${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
                    </div>
                  ))}
                  {imgs.length > 4 && (
                    <div className="flex items-center justify-center bg-black/50 text-white/60 text-sm font-bold"
                      style={{ aspectRatio: "1/1" }}>
                      +{imgs.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {embed.footerText && (
                <p className="text-[#87898C] text-[11px] pt-1 border-t border-white/5">{embed.footerText}</p>
              )}
            </div>
          </div>

          {/* V2 badge */}
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[10px] text-purple-400/50">⚡ Components V2</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            <span className="font-mono">{getBotApiLabel()}</span>
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

function TabEmbedBuilder({ channels, guilds, roles }: { channels: Channel[]; guilds: Guild[]; roles: Role[]; }) {
  const [subTab, setSubTab] = useState<"embed" | "reactions" | "pagination">("embed");
  const [embed, setEmbed] = useState<EmbedState>(DEFAULT_EMBED);
  const [channelId, setChannelId] = useState("");
  const [webhookName, setWebhookName] = useState("Itadori Bot");
  const [webhookAvatar, setWebhookAvatar] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extraImages, setExtraImages] = useState<string[]>(["", "", "", "", ""]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [useV2, setUseV2] = useState(false);
  const [gridImages, setGridImages] = useState<string[]>(["", "", "", ""]);
  const [uploadingGridIdx, setUploadingGridIdx] = useState<number | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
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

  const reorderFields = (newFields: EmbedField[]) =>
    setEmbed(prev => ({ ...prev, fields: newFields }));

  const fieldsDrag = useDragReorder(embed.fields, reorderFields);

  const [cargoRoleId, setCargoRoleId] = useState("");

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

  const uploadExtraImage = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) {
        setExtraImages(prev => { const next = [...prev]; next[idx] = d.url; return next; });
      }
    } catch { /* ignore */ }
    setUploadingIdx(null);
  };

  const setExtraImg = (idx: number, val: string) =>
    setExtraImages(prev => { const next = [...prev]; next[idx] = val; return next; });

  const setGridImg = (idx: number, val: string) =>
    setGridImages(prev => { const next = [...prev]; next[idx] = val; return next; });

  const uploadGridImage = async (idx: number, file: File) => {
    setUploadingGridIdx(idx);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) setGridImages(prev => { const next = [...prev]; next[idx] = d.url; return next; });
    } catch { /* ignore */ }
    setUploadingGridIdx(null);
  };

  const send = async () => {
    if (!channelId) { toast("error", "Selecione um canal primeiro."); return; }
    setSending(true);
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
          extraImages: extraImages.filter(Boolean),
          cargoRoleId: cargoRoleId || null,
          useComponentsV2: useV2,
          gridImages: gridImages.filter(Boolean),
          fields: embed.fields
            .filter(f => f.name || f.value)
            .map(f => ({ name: f.name, value: f.value, inline: f.inline, separate: f.separate })),
        }),
      });
      const d = await r.json();
      if (d.success) toast("success", "Embed enviado com sucesso!");
      else toast("error", d.error || "Erro ao enviar.");
    } catch {
      toast("error", "Bot offline ou erro de conexão.");
    }
    setSending(false);
  };

  return (
    <div className="space-y-0">
      {/* ── Sub-tab bar ── */}
      <div className="flex gap-1 border-b border-white/8 mb-6">
        {([
          { id: "embed",      label: "Embed",     icon: <Send className="w-3.5 h-3.5" /> },
          { id: "reactions",  label: "Reações",   icon: <Smile className="w-3.5 h-3.5" /> },
          { id: "pagination", label: "Paginação", icon: <BookOpen className="w-3.5 h-3.5" /> },
        ] as const).map(t => (
          <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              subTab === t.id
                ? "border-crimson text-bone"
                : "border-transparent text-bone/40 hover:text-bone/70",
            )}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Sub-tab: Reações ── */}
      {subTab === "reactions" && (
        <TabReactions channels={channels} guilds={guilds} roles={roles} />
      )}

      {/* ── Sub-tab: Paginação ── */}
      {subTab === "pagination" && (
        <TabPagination channels={channels} guilds={guilds} roles={roles} />
      )}

      {/* ── Sub-tab: Embed ── */}
      {subTab === "embed" && <div className="grid lg:grid-cols-2 gap-6">
      {/* ── Left: Form ── */}
      <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">

        {/* ── Mode toggle ── */}
        <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/8 rounded-xl">
          <div className="flex-1">
            <p className="text-xs font-semibold text-bone/80">Modo de envio</p>
            <p className="text-[11px] text-bone/40 mt-0.5">
              {useV2
                ? "Components V2 — layout visual com grid de imagens (Discord nativo)"
                : "Embed clássico — compatível com todos os clientes"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseV2(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
              useV2
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                : "bg-white/5 border-white/10 text-bone/50 hover:bg-white/10 hover:text-bone"
            )}
          >
            {useV2 ? "⚡ V2 ativo" : "Embed clássico"}
          </button>
        </div>

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

        {/* ${CARGO} Role Selector */}
        {roles.length > 0 && (
          <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Variável <code className="text-crimson normal-case font-mono">{"${CARGO}"}</code></p>
            <Field label="Cargo a ser mencionado" tip="O cargo selecionado aqui substitui ${CARGO} no embed. Use ${CARGO} em qualquer campo de texto.">
              <select value={cargoRoleId} onChange={e => setCargoRoleId(e.target.value)} className={inputCls}>
                <option value="">— Nenhum (${"{CARGO}"} vazio) —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id} style={{ color: r.color || undefined }}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </Field>
            {cargoRoleId && (
              <p className="text-[11px] text-bone/40">
                <code className="text-crimson font-mono">{"${CARGO}"}</code> → <span className="font-semibold" style={{ color: roles.find(r => r.id === cargoRoleId)?.color || undefined }}>@{roles.find(r => r.id === cargoRoleId)?.name}</span>
              </p>
            )}
          </section>
        )}

        {/* Author */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Autor</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Autor">
              <VarInput value={embed.authorName} onChange={v => set("authorName", v)} placeholder="Itadori Bot" className={inputCls} />
            </Field>
            <Field label="Ícone do Autor (URL)" tip="URL da imagem. Use ${USER.PERFIL} para avatar do usuário.">
              <div className="flex gap-2 items-center">
                <VarInput value={embed.authorIcon} onChange={v => set("authorIcon", v)} placeholder="https://... ou ${USER.PERFIL}" className={inputCls} imageOnly />
                <label
                  title="Upload de ícone do autor"
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-bone/40 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setUploading(true);
                      const fd = new FormData(); fd.append("file", f);
                      try {
                        const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
                        const d = await r.json();
                        if (d.url) set("authorIcon", d.url);
                      } catch { /* ignore */ }
                      setUploading(false);
                    }} />
                </label>
              </div>
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
            <Field label="Título" tip="Use ${USER}, ${SERVER} etc. Digite ${ para autocomplete.">
              <VarInput value={embed.title} onChange={v => set("title", v)} placeholder="Título do embed" className={inputCls} />
            </Field>
            <Field label="URL do Título">
              <input value={embed.titleUrl} onChange={e => set("titleUrl", e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição" tip="Suporta formatação Markdown do Discord. Digite ${ para autocomplete de variáveis dinâmicas.">
            <MdToolbar target={embed.description} onChange={v => set("description", v)} textareaRef={descRef} />
            <div className="flex gap-2 mb-1.5">
              <TagsPopup onInsert={insertTag} />
              <FormattingRef />
            </div>
            <VarTextarea
              textareaRef={descRef}
              value={embed.description}
              onChange={v => set("description", v)}
              placeholder="Descrição com **negrito**, *itálico*, ${USER}, ${SERVER}, ${HORARIO}..."
              className={textareaCls}
              rows={4}
            />
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
          {embed.fields.map((f, idx) => (
            <div key={f.id}
              draggable
              onDragStart={fieldsDrag.onDragStart(idx)}
              onDragOver={fieldsDrag.onDragOver(idx)}
              onDrop={fieldsDrag.onDrop}
              onDragEnd={fieldsDrag.onDragEnd}
              className="bg-black/20 rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing active:opacity-60 transition-opacity">
              <div className="flex gap-2">
                <span className="text-bone/20 flex-shrink-0 mt-2 cursor-grab" title="Arraste para reordenar">
                  <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                    <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
                    <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                    <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                  </svg>
                </span>
                <VarInput value={f.name} onChange={v => updateField(f.id, "name", v)}
                  placeholder="Nome do field" className={cn(inputCls, "flex-1")} />
                <button type="button" onClick={() => removeField(f.id)}
                  className="text-bone/30 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-amber-400/50 text-right">
                {f.value.length}/1024
                {f.value.length > 1024 && <span className="text-red-400 ml-1">⚠ limite excedido</span>}
              </div>
              <VarTextarea value={f.value} onChange={v => {
                  updateField(f.id, "value", v);
                  if (v.length > 1024) toast("warning", `Field "${f.name || "sem nome"}" excede 1024 caracteres.`);
                }}
                placeholder="Valor do field (suporta markdown, ${} variáveis)" className={cn(textareaCls, "min-h-[50px]", f.value.length > 1024 && "border-red-500/50")} rows={2} />
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
          <Field label="Imagem Principal" tip="Aparece grande no final do embed. Use ${IMG1}..${IMG5} ou ${USER.PERFIL}.">
            <div className="flex gap-2 items-center">
              <VarInput
                value={embed.image}
                onChange={v => set("image", v)}
                placeholder="https://... ou ${USER.PERFIL} ou ${IMG1}"
                className={inputCls}
                imageOnly
              />
              <label
                title="Upload de imagem"
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
              </label>
              {uploading && <span className="text-xs text-bone/40">enviando...</span>}
            </div>
          </Field>
          <Field label="Thumbnail" tip="Imagem pequena no canto superior direito. Use ${USER.PERFIL} para avatar.">
            <div className="flex gap-2 items-center">
              <VarInput
                value={embed.thumbnail}
                onChange={v => set("thumbnail", v)}
                placeholder="https://... ou ${USER.PERFIL}"
                className={inputCls}
                imageOnly
              />
              <label
                title="Upload de thumbnail"
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-bone/40 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setUploading(true);
                    const fd = new FormData(); fd.append("file", f);
                    try {
                      const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
                      const d = await r.json();
                      if (d.url) set("thumbnail", d.url);
                    } catch { /* ignore */ }
                    setUploading(false);
                  }} />
              </label>
            </div>
          </Field>
        </section>

        {/* Extra Image Container */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Container de Imagens</p>
            <span className="text-[10px] text-bone/30 bg-white/5 px-2 py-0.5 rounded-full">
              {extraImages.filter(Boolean).length}/5 preenchidas
            </span>
          </div>
          <p className="text-[11px] text-bone/40 leading-relaxed">
            Imagens acessíveis via <code className="text-crimson font-mono">{"${IMG1}"}</code>…<code className="text-crimson font-mono">{"${IMG5}"}</code> nos campos de texto e URL acima.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {extraImages.map((url, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-[10px] font-mono text-crimson/60 w-10 flex-shrink-0">{`\${IMG${idx + 1}}`}</span>
                <VarInput
                  value={url}
                  onChange={v => setExtraImg(idx, v)}
                  placeholder={`URL da imagem ${idx + 1}...`}
                  className={inputCls}
                  imageOnly={false}
                />
                <label
                  title={`Upload IMG${idx + 1}`}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors cursor-pointer"
                >
                  {uploadingIdx === idx ? (
                    <span className="text-[9px]">...</span>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadExtraImage(idx, f); }} />
                </label>
                {url && (
                  <button type="button" onClick={() => setExtraImg(idx, "")}
                    className="flex-shrink-0 text-bone/30 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {extraImages.some(Boolean) && (
            <div className="flex gap-2 flex-wrap">
              {extraImages.map((url, idx) => url ? (
                <img key={idx} src={url} alt={`IMG${idx + 1}`}
                  className="w-16 h-16 rounded object-cover border border-white/10"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
              ) : null)}
            </div>
          )}
        </section>

        {/* Footer */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Footer</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto do Footer" tip="Use ${HORARIO} para hora atual. Suporta variáveis ${}.">
              <VarInput value={embed.footerText} onChange={v => set("footerText", v)}
                placeholder="Footer • ${HORARIO}" className={inputCls} />
            </Field>
            <Field label="Ícone do Footer (URL)" tip="Use ${USER.PERFIL} para avatar do usuário.">
              <div className="flex gap-2 items-center">
                <VarInput value={embed.footerIcon} onChange={v => set("footerIcon", v)}
                  placeholder="https://... ou ${USER.PERFIL}" className={inputCls} imageOnly />
                <label
                  title="Upload de ícone"
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-bone/40 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setUploading(true);
                      const fd = new FormData(); fd.append("file", f);
                      try {
                        const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
                        const d = await r.json();
                        if (d.url) set("footerIcon", d.url);
                      } catch { /* ignore */ }
                      setUploading(false);
                    }} />
                </label>
              </div>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-bone/60 cursor-pointer">
            <input type="checkbox" checked={embed.timestamp} onChange={e => set("timestamp", e.target.checked)}
              className="accent-crimson" />
            Mostrar timestamp (hora atual)
          </label>
        </section>

        {/* Grid Images (Components V2 only) */}
        {useV2 && (
          <section className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-300/80 uppercase tracking-wider">Grid de Imagens — MediaGallery</p>
              <span className="text-[10px] text-purple-300/40 bg-purple-500/10 px-2 py-0.5 rounded-full">
                {gridImages.filter(Boolean).length}/4 imagens
              </span>
            </div>
            <p className="text-[11px] text-bone/40">
              Imagens dispostas em grid nativo do Discord. Deixe em branco para usar as imagens dos campos acima.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {gridImages.map((url, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-[10px] font-mono text-purple-400/60 w-5 flex-shrink-0">{idx + 1}</span>
                  <input
                    value={url}
                    onChange={e => setGridImg(idx, e.target.value)}
                    placeholder={`URL da imagem ${idx + 1}...`}
                    className={cn(inputCls, "flex-1")}
                  />
                  <label
                    title={`Upload imagem ${idx + 1}`}
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer"
                  >
                    {uploadingGridIdx === idx ? <span className="text-[9px]">...</span> : <Upload className="w-4 h-4" />}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadGridImage(idx, f); }} />
                  </label>
                  {url && (
                    <button type="button" onClick={() => setGridImg(idx, "")}
                      className="flex-shrink-0 text-bone/30 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {gridImages.some(Boolean) && (
              <div className="flex gap-2 flex-wrap">
                {gridImages.map((url, idx) => url ? (
                  <img key={idx} src={url} alt={`Grid ${idx + 1}`}
                    className="w-16 h-16 rounded object-cover border border-purple-500/20"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
                ) : null)}
              </div>
            )}
          </section>
        )}

        {/* Send */}
        <div className="space-y-2 pb-6">
          <button type="button" onClick={send} disabled={sending}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-50",
              useV2 ? "bg-purple-600 hover:bg-purple-500" : "bg-crimson hover:bg-crimson-light"
            )}>
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : useV2 ? "Enviar Components V2" : "Enviar Embed"}
          </button>
        </div>
      </div>

      {/* ── Right: Discord Preview ── */}
      <div className="hidden lg:block">
        <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider mb-3">
          Preview — {useV2 ? <span className="text-purple-400">Components V2</span> : "Discord"}
        </p>
        <div className="sticky top-4">
          {useV2 ? (
            <ComponentsV2Preview
              embed={embed}
              webhookName={webhookName}
              webhookAvatar={webhookAvatar}
              gridImages={gridImages}
            />
          ) : (
            <DiscordPreview
              embed={embed}
              webhookName={webhookName}
              webhookAvatar={webhookAvatar}
              guildName={selectedGuild?.name}
              extraImages={extraImages}
              cargoMention={cargoRoleId ? `@${roles.find(r => r.id === cargoRoleId)?.name || "Cargo"}` : "@Cargo"}
            />
          )}
        </div>
      </div>
      </div>}
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

// ─── Interactive Buttons Tab ──────────────────────────────────────────────────
interface BtnDef {
  id: string;
  label: string;
  style: "primary" | "success" | "danger" | "secondary";
  type: "add_role" | "remove_role" | "text_dm" | "text_visible" | "link";
  roleId?: string;
  text?: string;
  url?: string;
}

const BTN_STYLE_LABELS: Record<BtnDef["style"], string> = {
  primary: "Azul",
  success: "Verde",
  danger: "Vermelho",
  secondary: "Cinza",
};
const BTN_STYLE_COLORS: Record<BtnDef["style"], string> = {
  primary: "#5865F2",
  success: "#57F287",
  danger: "#ED4245",
  secondary: "#4F545C",
};
const BTN_TYPE_LABELS: Record<BtnDef["type"], string> = {
  add_role: "Adicionar Cargo",
  remove_role: "Remover Cargo",
  text_dm: "Texto no DM",
  text_visible: "Texto Visível",
  link: "Link Externo",
};

function TabButtons({ channels, guilds, roles }: { channels: Channel[]; guilds: Guild[]; roles: Role[] }) {
  const [channelId, setChannelId] = useState("");
  const [content, setContent] = useState("");
  const [buttons, setButtons] = useState<BtnDef[]>([]);
  const [sending, setSending] = useState(false);

  const addBtn = () => {
    if (buttons.length >= 5) { toast("warning", "Máximo de 5 botões por mensagem."); return; }
    setButtons(prev => [...prev, {
      id: Date.now().toString(),
      label: "Clique aqui",
      style: "primary",
      type: "text_visible",
      text: "",
    }]);
  };

  const updateBtn = (id: string, patch: Partial<BtnDef>) =>
    setButtons(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const removeBtn = (id: string) =>
    setButtons(prev => prev.filter(b => b.id !== id));

  const btnsDrag = useDragReorder(buttons, setButtons);

  const send = async () => {
    if (!channelId) { toast("error", "Selecione um canal."); return; }
    if (buttons.length === 0) { toast("error", "Adicione pelo menos um botão."); return; }
    setSending(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/send-buttons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content: content || null, buttons, guildId: guilds[0]?.id }),
      });
      const d = await r.json();
      if (d.success) toast("success", "Painel de botões enviado!");
      else toast("error", d.error || "Erro ao enviar.");
    } catch {
      toast("error", "Bot offline ou erro de conexão.");
    }
    setSending(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-sm text-purple-300 space-y-1">
        <p className="font-semibold">Painel de Botões Interativos</p>
        <p className="text-xs text-purple-400/70">
          Envie uma mensagem com até 5 botões. Cada botão pode adicionar/remover um cargo, enviar texto no DM ou visível, ou abrir um link.
        </p>
      </div>

      <Field label="Canal de destino" tip="Canal onde a mensagem com botões será enviada.">
        <select value={channelId} onChange={e => setChannelId(e.target.value)} className={inputCls}>
          <option value="">— Selecione um canal —</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Mensagem acima dos botões (opcional)" tip="Texto que aparece antes dos botões. Suporta markdown do Discord.">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Reaja clicando em um botão abaixo 👇"
          className={textareaCls}
          rows={2}
          maxLength={2000}
        />
        <p className="text-xs text-bone/30 text-right">{content.length}/2000</p>
      </Field>

      {/* Buttons builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Botões ({buttons.length}/5)</p>
          <button type="button" onClick={addBtn}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors">
            <Plus className="w-3 h-3" /> Adicionar Botão
          </button>
        </div>

        {buttons.length === 0 && (
          <p className="text-center text-bone/25 text-xs py-4 bg-white/3 border border-white/8 rounded-xl">
            Nenhum botão adicionado. Clique em "Adicionar Botão".
          </p>
        )}

        {buttons.map((btn, idx) => (
          <div key={btn.id}
            draggable
            onDragStart={btnsDrag.onDragStart(idx)}
            onDragOver={btnsDrag.onDragOver(idx)}
            onDrop={btnsDrag.onDrop}
            onDragEnd={btnsDrag.onDragEnd}
            className="bg-black/20 border border-white/8 rounded-xl p-4 space-y-3 cursor-grab active:cursor-grabbing active:opacity-60 transition-opacity">
            <div className="flex items-center gap-2">
              <span className="text-bone/20 cursor-grab">
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                  <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
                  <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                  <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                </svg>
              </span>
              <input
                value={btn.label}
                onChange={e => updateBtn(btn.id, { label: e.target.value })}
                placeholder="Rótulo do botão"
                className={cn(inputCls, "flex-1")}
                maxLength={80}
              />
              <button type="button" onClick={() => removeBtn(btn.id)}
                className="text-bone/30 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">Cor</label>
                <div className="flex gap-1.5">
                  {(Object.keys(BTN_STYLE_LABELS) as BtnDef["style"][]).map(s => (
                    <button key={s} type="button"
                      onClick={() => updateBtn(btn.id, { style: s })}
                      title={BTN_STYLE_LABELS[s]}
                      className={cn(
                        "w-6 h-6 rounded border-2 transition-all",
                        btn.style === s ? "border-white scale-110" : "border-white/10 hover:scale-105",
                      )}
                      style={{ background: BTN_STYLE_COLORS[s] }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">Ação</label>
                <select value={btn.type} onChange={e => updateBtn(btn.id, { type: e.target.value as BtnDef["type"] })}
                  className={cn(inputCls, "text-xs py-1.5")}>
                  {(Object.entries(BTN_TYPE_LABELS) as [BtnDef["type"], string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {(btn.type === "add_role" || btn.type === "remove_role") && (
              <div>
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">Cargo</label>
                <select value={btn.roleId || ""} onChange={e => updateBtn(btn.id, { roleId: e.target.value })}
                  className={cn(inputCls, "text-xs py-1.5")}>
                  <option value="">— Selecione um cargo —</option>
                  {roles.map(r => <option key={r.id} value={r.id} style={{ color: r.color || undefined }}>@{r.name}</option>)}
                </select>
              </div>
            )}

            {(btn.type === "text_dm" || btn.type === "text_visible") && (
              <div>
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">
                  {btn.type === "text_dm" ? "Texto enviado no DM" : "Texto visível no canal"}
                </label>
                <textarea
                  value={btn.text || ""}
                  onChange={e => updateBtn(btn.id, { text: e.target.value })}
                  placeholder="Mensagem que será enviada..."
                  className={cn(textareaCls, "min-h-[60px]")}
                  rows={2}
                  maxLength={2000}
                />
              </div>
            )}

            {btn.type === "link" && (
              <div>
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">URL</label>
                <input
                  value={btn.url || ""}
                  onChange={e => updateBtn(btn.id, { url: e.target.value })}
                  placeholder="https://..."
                  className={inputCls}
                />
              </div>
            )}
          </div>
        ))}

        {/* Preview of buttons */}
        {buttons.length > 0 && (
          <div className="bg-[#2B2D31] rounded-xl p-4 space-y-3">
            <p className="text-[10px] text-bone/30 uppercase tracking-wider mb-2">Preview</p>
            {content && <p className="text-bone/80 text-sm mb-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />}
            <div className="flex flex-wrap gap-2">
              {buttons.map(btn => (
                <button key={btn.id} type="button"
                  className="px-4 py-2 rounded text-white text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: btn.type === "link" ? "#4F545C" : BTN_STYLE_COLORS[btn.style] }}>
                  {btn.label || "Botão"}
                  {btn.type === "link" && " ↗"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button type="button" onClick={send} disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
        <Send className="w-4 h-4" />
        {sending ? "Enviando..." : "Enviar Painel de Botões"}
      </button>
    </div>
  );
}

// ─── Reaction Roles Tab ───────────────────────────────────────────────────────
interface ReactionRoleDef {
  id: string;
  emoji: string;
  roleId: string;
  action: "add_role" | "remove_role" | "text_dm" | "text_visible";
  text?: string;
  textMode?: "dm" | "visible";
}

const REACTION_ACTION_LABELS: Record<ReactionRoleDef["action"], string> = {
  add_role:     "Adicionar Cargo",
  remove_role:  "Remover Cargo",
  text_dm:      "Texto no DM",
  text_visible: "Texto Visível",
};

function TabReactions({ channels, guilds, roles }: { channels: Channel[]; guilds: Guild[]; roles: Role[] }) {
  const [channelId, setChannelId] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [reactions, setReactions] = useState<ReactionRoleDef[]>([]);
  const [sending, setSending] = useState(false);

  const addReaction = () => {
    if (reactions.length >= 20) { toast("warning", "Máximo de 20 reações por mensagem."); return; }
    setReactions(prev => [...prev, {
      id: Date.now().toString(),
      emoji: "👍",
      roleId: "",
      action: "add_role",
      text: "",
      textMode: "dm",
    }]);
  };

  const updateReaction = (id: string, patch: Partial<ReactionRoleDef>) =>
    setReactions(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const removeReaction = (id: string) =>
    setReactions(prev => prev.filter(r => r.id !== id));

  const send = async () => {
    if (!channelId) { toast("error", "Selecione um canal."); return; }
    if (reactions.length === 0) { toast("error", "Adicione pelo menos uma reação."); return; }
    const invalid = reactions.find(r => !r.emoji.trim() || ((r.action === "add_role" || r.action === "remove_role") && !r.roleId));
    if (invalid) { toast("error", "Preencha emoji e cargo em todas as reações."); return; }
    setSending(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/send-reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content: messageContent || null, reactions, guildId: guilds[0]?.id }),
      });
      const d = await r.json();
      if (d.success) toast("success", "Painel de reações enviado!");
      else toast("error", d.error || "Erro ao enviar.");
    } catch {
      toast("error", "Bot offline ou erro de conexão.");
    }
    setSending(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300 space-y-1">
        <p className="font-semibold">Painel de Reações</p>
        <p className="text-xs text-amber-400/70">
          Envie uma mensagem e o bot adicionará reações automáticas. Ao clicar numa reação, o usuário ganha/perde um cargo ou recebe uma mensagem.
        </p>
      </div>

      <Field label="Canal de destino" tip="Canal onde a mensagem com reações será enviada.">
        <select value={channelId} onChange={e => setChannelId(e.target.value)} className={inputCls}>
          <option value="">— Selecione um canal —</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Mensagem (opcional)" tip="Texto enviado com as reações. Suporta markdown do Discord.">
        <textarea
          value={messageContent}
          onChange={e => setMessageContent(e.target.value)}
          placeholder="Reaja para escolher um cargo 👇"
          className={textareaCls}
          rows={3}
          maxLength={2000}
        />
        <p className="text-xs text-bone/30 text-right">{messageContent.length}/2000</p>
      </Field>

      {/* Reactions builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Reações ({reactions.length}/20)</p>
          <button type="button" onClick={addReaction}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
            <Plus className="w-3 h-3" /> Adicionar Reação
          </button>
        </div>

        {reactions.length === 0 && (
          <p className="text-center text-bone/25 text-xs py-4 bg-white/3 border border-white/8 rounded-xl">
            Nenhuma reação adicionada. Clique em "Adicionar Reação".
          </p>
        )}

        {reactions.map((reaction) => (
          <div key={reaction.id} className="bg-black/20 border border-white/8 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              {/* Emoji input */}
              <div className="flex-shrink-0">
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">Emoji</label>
                <input
                  value={reaction.emoji}
                  onChange={e => updateReaction(reaction.id, { emoji: e.target.value })}
                  placeholder="👍"
                  className={cn(inputCls, "w-20 text-center text-xl")}
                  maxLength={8}
                />
              </div>

              {/* Action selector */}
              <div className="flex-1">
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">Ação ao reagir</label>
                <select
                  value={reaction.action}
                  onChange={e => updateReaction(reaction.id, { action: e.target.value as ReactionRoleDef["action"] })}
                  className={inputCls}
                >
                  {(Object.entries(REACTION_ACTION_LABELS) as [ReactionRoleDef["action"], string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Remove button */}
              <button type="button" onClick={() => removeReaction(reaction.id)}
                className="mt-6 text-bone/30 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Conditional: role selector */}
            {(reaction.action === "add_role" || reaction.action === "remove_role") && (
              <div>
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block mb-1">Cargo</label>
                <select
                  value={reaction.roleId}
                  onChange={e => updateReaction(reaction.id, { roleId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— Selecione um cargo —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id} style={{ color: r.color || undefined }}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Conditional: text input for dm/visible */}
            {(reaction.action === "text_dm" || reaction.action === "text_visible") && (
              <div className="space-y-2">
                <label className="text-[10px] text-bone/40 uppercase tracking-wider block">Mensagem a enviar</label>
                <textarea
                  value={reaction.text || ""}
                  onChange={e => updateReaction(reaction.id, { text: e.target.value })}
                  placeholder={reaction.action === "text_dm" ? "Mensagem enviada no DM do usuário..." : "Mensagem visível no canal..."}
                  className={cn(textareaCls, "min-h-[60px]")}
                  rows={2}
                  maxLength={2000}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview */}
      {reactions.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider">Preview</p>
          <div className="bg-[#313338] rounded-lg p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">I</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-white font-semibold text-sm">Itadori Bot</span>
                  <span className="bg-[#5865F2] text-white text-[10px] font-medium px-1.5 py-px rounded">BOT</span>
                </div>
                {messageContent && (
                  <p className="text-[#DBDEE1] text-sm mb-2">{messageContent}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {reactions.map(r => (
                    <div key={r.id}
                      className="flex items-center gap-1 bg-[#2B2D31] border border-[#5865F2]/40 rounded-full px-3 py-1 text-sm cursor-pointer hover:bg-[#5865F2]/20 transition-colors">
                      <span>{r.emoji}</span>
                      <span className="text-[#DBDEE1] text-xs">1</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send button */}
      <button type="button" onClick={send} disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 rounded-xl text-black font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50">
        <Send className="w-4 h-4" />
        {sending ? "Enviando..." : "Enviar Painel de Reações"}
      </button>
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

// ─── Prompt Library Tab ───────────────────────────────────────────────────────
interface PromptEntry {
  id: string;
  title: string;
  prompt: string;
  description: string;
  imageUrl: string;
  referenceImages: string[];
  referenceCount: number;
  tags: string[];
  createdAt: string;
  createdBy: string;
}

function TabPrompts() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PromptEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formRefImages, setFormRefImages] = useState<string[]>([]);
  const [formTags, setFormTags] = useState("");
  const [formRefCount, setFormRefCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingRef, setUploadingRef] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${BOT_API}/api/prompts`)
      .then(r => r.json())
      .then((data: PromptEntry[]) => { setPrompts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const uploadImage = async (file: File, onUrl: (url: string) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await adminFetch(`${BOT_API}/api/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) onUrl(d.url);
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formPrompt.trim() || !formImageUrl) {
      toast("error", "Título, prompt e imagem são obrigatórios."); return;
    }
    setSaving(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          prompt: formPrompt.trim(),
          description: formDesc.trim(),
          imageUrl: formImageUrl,
          referenceImages: formRefImages.filter(Boolean),
          referenceCount: formRefCount,
          tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      const d = await r.json();
      if (d.success && d.prompt) {
        setPrompts(prev => [d.prompt, ...prev]);
        toast("success", "Prompt salvo na biblioteca!");
        setShowForm(false);
        setFormTitle(""); setFormPrompt(""); setFormDesc(""); setFormImageUrl("");
        setFormRefImages([]); setFormTags(""); setFormRefCount(1);
      } else {
        toast("error", d.error || "Erro ao salvar.");
      }
    } catch {
      toast("error", "Bot offline.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este prompt da biblioteca?")) return;
    try {
      await adminFetch(`${BOT_API}/api/prompts/${id}`, { method: "DELETE" });
      setPrompts(prev => prev.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch { toast("error", "Erro ao deletar."); }
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast("success", "Prompt copiado!")).catch(() => toast("error", "Erro ao copiar."));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-bone">Biblioteca de Prompts</h2>
          <p className="text-xs text-bone/40 mt-0.5">{prompts.length} prompt{prompts.length !== 1 ? "s" : ""} salvos</p>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            showForm
              ? "bg-white/5 border border-white/10 text-bone/60 hover:text-bone"
              : "bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20",
          )}>
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Adicionar Prompt</>}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Novo Prompt</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Título">
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder="Ex: Sukuna no Templo — Cinematic" className={inputCls} maxLength={100} />
            </Field>
            <Field label="Tags (separadas por vírgula)">
              <input value={formTags} onChange={e => setFormTags(e.target.value)}
                placeholder="anime, portrait, cinematic" className={inputCls} />
            </Field>
          </div>

          <Field label="Prompt completo">
            <textarea value={formPrompt} onChange={e => setFormPrompt(e.target.value)}
              placeholder="Raw digital cinema scan, exactly mimicking..." className={textareaCls} rows={6} />
          </Field>

          <Field label="Descrição / Notas (opcional)">
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
              placeholder="Observações sobre o resultado, modelo usado, variações testadas..."
              className={textareaCls} rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Imagem principal" tip="A imagem gerada pelo AI.">
              <div className="flex gap-2">
                <input value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)}
                  placeholder="https://..." className={inputCls} />
                <label className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 cursor-pointer transition-colors">
                  {uploadingMain ? <span className="text-[9px]">...</span> : <Upload className="w-4 h-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setUploadingMain(true);
                    await uploadImage(f, url => setFormImageUrl(url));
                    setUploadingMain(false);
                  }} />
                </label>
              </div>
              {formImageUrl && (
                <img src={formImageUrl} alt="" className="mt-2 w-full max-h-40 object-cover rounded-lg"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              )}
            </Field>

            <Field label="Fotos de referência usadas" tip="Quantas fotos do rosto foram usadas como referência.">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-bone/50">Quantidade:</span>
                  <input type="number" min={0} max={10} value={formRefCount}
                    onChange={e => setFormRefCount(Number(e.target.value))}
                    className={cn(inputCls, "w-20")} />
                </div>
                <p className="text-[10px] text-bone/30">Adicione URLs ou faça upload das fotos de referência:</p>
                {[0, 1].map(i => (
                  <div key={i} className="flex gap-2">
                    <input value={formRefImages[i] || ""} onChange={e => {
                        const next = [...formRefImages]; next[i] = e.target.value; setFormRefImages(next);
                      }}
                      placeholder={`Referência ${i + 1}...`} className={cn(inputCls, "text-xs")} />
                    <label className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-bone/40 hover:bg-white/10 cursor-pointer transition-colors">
                      {uploadingRef === i ? <span className="text-[9px]">...</span> : <Upload className="w-3.5 h-3.5" />}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setUploadingRef(i);
                        await uploadImage(f, url => {
                          const next = [...formRefImages]; next[i] = url; setFormRefImages(next);
                        });
                        setUploadingRef(null);
                      }} />
                    </label>
                  </div>
                ))}
              </div>
            </Field>
          </div>

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-crimson hover:bg-crimson/80 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar na Biblioteca"}
          </button>
        </div>
      )}

      {/* Grid of prompts */}
      {loading ? (
        <div className="text-center py-12 text-bone/30 text-sm">Carregando...</div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-16 text-bone/30 bg-white/3 border border-white/8 rounded-xl">
          <p className="text-4xl mb-3">🎨</p>
          <p className="font-medium text-bone/50">Nenhum prompt na biblioteca ainda.</p>
          <p className="text-xs mt-1">Clique em "Adicionar Prompt" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {prompts.map(p => (
            <div key={p.id}
              className="group relative bg-white/3 border border-white/8 rounded-xl overflow-hidden hover:border-white/20 cursor-pointer transition-all hover:scale-[1.02]"
              onClick={() => setSelected(p)}>
              {/* Image */}
              <div className="aspect-[3/4] overflow-hidden bg-white/5">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bone/20">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              {/* Info overlay */}
              <div className="p-3">
                <p className="text-bone text-sm font-medium truncate">{p.title}</p>
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-crimson/10 text-crimson/70">{tag}</span>
                    ))}
                  </div>
                )}
                {p.referenceCount > 0 && (
                  <p className="text-[10px] text-bone/30 mt-1.5">📷 {p.referenceCount} foto{p.referenceCount !== 1 ? "s" : ""} de referência</p>
                )}
              </div>
              {/* Delete button (visible on hover) */}
              <button type="button"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-red-400 hover:bg-red-500/20"
                onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          {/* Modal content */}
          <div
            className="relative z-10 bg-[#111113] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col sm:flex-row"
            onClick={e => e.stopPropagation()}
          >
            {/* Image panel */}
            <div className="sm:w-[55%] bg-black flex items-center justify-center">
              <img src={selected.imageUrl} alt={selected.title}
                className="w-full h-full object-contain max-h-[90vh]"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>

            {/* Details panel */}
            <div className="sm:w-[45%] flex flex-col overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-white/8">
                <div>
                  <h2 className="text-bone font-semibold text-base leading-snug">{selected.title}</h2>
                  {selected.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selected.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/10 text-crimson/80 border border-crimson/20">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setSelected(null)}
                  className="text-bone/40 hover:text-bone transition-colors ml-3 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                {/* Reference images */}
                {(selected.referenceImages?.length > 0 || selected.referenceCount > 0) && (
                  <div>
                    <p className="text-[10px] text-bone/40 uppercase tracking-wider mb-2">
                      Fotos de referência usadas ({selected.referenceCount})
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {selected.referenceImages?.map((url, i) => (
                        <img key={i} src={url} alt={`ref ${i + 1}`}
                          className="w-14 h-14 rounded-lg object-cover border border-white/10"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ))}
                      {(selected.referenceCount || 0) > (selected.referenceImages?.length || 0) && (
                        <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-bone/30">
                          +{selected.referenceCount - (selected.referenceImages?.length || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selected.description && (
                  <div>
                    <p className="text-[10px] text-bone/40 uppercase tracking-wider mb-1">Descrição</p>
                    <p className="text-bone/70 text-sm leading-relaxed">{selected.description}</p>
                  </div>
                )}

                {/* Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-bone/40 uppercase tracking-wider">Prompt</p>
                    <button type="button" onClick={() => copyPrompt(selected.prompt)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors">
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <div className="bg-black/40 border border-white/8 rounded-xl p-4">
                    <p className="text-bone/70 text-sm leading-relaxed font-mono text-xs whitespace-pre-wrap">{selected.prompt}</p>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-white/8 flex gap-2">
                <a
                  href={selected.imageUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-bone/60 hover:text-bone hover:bg-white/10 transition-colors text-sm"
                >
                  <Upload className="w-4 h-4 rotate-180" /> Baixar
                </a>
                <button type="button" onClick={() => copyPrompt(selected.prompt)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20 transition-colors text-sm">
                  <Copy className="w-4 h-4" /> Copiar Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Embed Pagination Tab ─────────────────────────────────────────────────────
interface PaginationPage {
  id: string;
  title: string;
  description: string;
  color: string;
  image: string;
  thumbnail: string;
  authorName: string;
  authorIcon: string;
  footerText: string;
}

const DEFAULT_PAGE = (): PaginationPage => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  title: "",
  description: "",
  color: "#C41230",
  image: "",
  thumbnail: "",
  authorName: "",
  authorIcon: "",
  footerText: "",
});

function TabPagination({ channels, guilds, roles }: { channels: Channel[]; guilds: Guild[]; roles: Role[] }) {
  const [channelId, setChannelId] = useState("");
  const [pages, setPages] = useState<PaginationPage[]>([DEFAULT_PAGE()]);
  const [activePage, setActivePage] = useState(0);
  const [prevEmoji, setPrevEmoji] = useState("⬅️");
  const [nextEmoji, setNextEmoji] = useState("➡️");
  const [headerMsg, setHeaderMsg] = useState("");
  const [sending, setSending] = useState(false);

  const addPage = () => {
    if (pages.length >= 10) { toast("warning", "Máximo de 10 páginas."); return; }
    const newPage = DEFAULT_PAGE();
    setPages(prev => [...prev, newPage]);
    setActivePage(pages.length);
  };

  const removePage = (idx: number) => {
    if (pages.length <= 1) { toast("warning", "Mínimo de 1 página."); return; }
    setPages(prev => prev.filter((_, i) => i !== idx));
    setActivePage(prev => Math.min(prev, pages.length - 2));
  };

  const updatePage = (idx: number, patch: Partial<PaginationPage>) =>
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));

  const send = async () => {
    if (!channelId) { toast("error", "Selecione um canal."); return; }
    if (pages.length === 0) { toast("error", "Adicione pelo menos uma página."); return; }
    setSending(true);
    try {
      const r = await adminFetch(`${BOT_API}/api/send-pagination`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          guildId: guilds[0]?.id,
          pages: pages.map(p => ({
            title: p.title || null,
            description: p.description || null,
            color: p.color,
            image: p.image || null,
            thumbnail: p.thumbnail || null,
            authorName: p.authorName || null,
            authorIcon: p.authorIcon || null,
            footerText: p.footerText || null,
          })),
          prevEmoji,
          nextEmoji,
          headerMsg: headerMsg || null,
        }),
      });
      const d = await r.json();
      if (d.success) toast("success", `Paginação enviada! ${pages.length} páginas.`);
      else toast("error", d.error || "Erro ao enviar.");
    } catch {
      toast("error", "Bot offline ou erro de conexão.");
    }
    setSending(false);
  };

  const currentPage = pages[activePage];

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 space-y-1">
        <p className="font-semibold">Embeds com Paginação</p>
        <p className="text-xs text-blue-400/70">
          Crie múltiplos embeds que o usuário navega com reações ⬅️ ➡️. Ideal para regras, tutoriais e guias com várias seções.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: config */}
        <div className="space-y-5">
          <Field label="Canal de destino">
            <select value={channelId} onChange={e => setChannelId(e.target.value)} className={inputCls}>
              <option value="">— Selecione um canal —</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Mensagem acima (opcional)" tip="Texto fixo enviado com o painel. Suporta markdown.">
            <textarea value={headerMsg} onChange={e => setHeaderMsg(e.target.value)}
              placeholder="Navegue pelas páginas com as reações abaixo 📖"
              className={textareaCls} rows={2} maxLength={2000} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji — Página anterior">
              <input value={prevEmoji} onChange={e => setPrevEmoji(e.target.value)}
                placeholder="⬅️" className={cn(inputCls, "text-xl text-center")} maxLength={8} />
            </Field>
            <Field label="Emoji — Próxima página">
              <input value={nextEmoji} onChange={e => setNextEmoji(e.target.value)}
                placeholder="➡️" className={cn(inputCls, "text-xl text-center")} maxLength={8} />
            </Field>
          </div>

          {/* Page tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-bone/50 uppercase tracking-wider">Páginas ({pages.length}/10)</p>
              <button type="button" onClick={addPage}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
                <Plus className="w-3 h-3" /> Nova Página
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {pages.map((_, idx) => (
                <button key={idx} type="button"
                  onClick={() => setActivePage(idx)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    activePage === idx
                      ? "bg-crimson/20 border-crimson/40 text-crimson"
                      : "bg-white/5 border-white/10 text-bone/50 hover:text-bone hover:bg-white/10",
                  )}
                >
                  Pág {idx + 1}
                  {pages.length > 1 && (
                    <span className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400"
                      onClick={e => { e.stopPropagation(); removePage(idx); }}>×</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active page editor */}
          {currentPage && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-4">
              <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider">
                Editando — Página {activePage + 1}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Título">
                  <VarInput value={currentPage.title}
                    onChange={v => updatePage(activePage, { title: v })}
                    placeholder="Título da página" className={inputCls} />
                </Field>
                <Field label="Cor da borda">
                  <div className="flex gap-2 items-center">
                    <input type="color" value={currentPage.color}
                      onChange={e => updatePage(activePage, { color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent flex-shrink-0" />
                    <input value={currentPage.color}
                      onChange={e => updatePage(activePage, { color: e.target.value })}
                      className={cn(inputCls, "font-mono")} placeholder="#C41230" />
                  </div>
                </Field>
              </div>

              <Field label="Descrição" tip="Suporta formatação Markdown do Discord.">
                <VarTextarea value={currentPage.description}
                  onChange={v => updatePage(activePage, { description: v })}
                  placeholder="Conteúdo desta página..."
                  className={textareaCls} rows={5} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Imagem (URL)">
                  <VarInput value={currentPage.image}
                    onChange={v => updatePage(activePage, { image: v })}
                    placeholder="https://..." className={inputCls} imageOnly />
                </Field>
                <Field label="Thumbnail (URL)">
                  <VarInput value={currentPage.thumbnail}
                    onChange={v => updatePage(activePage, { thumbnail: v })}
                    placeholder="https://..." className={inputCls} imageOnly />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Autor">
                  <input value={currentPage.authorName}
                    onChange={e => updatePage(activePage, { authorName: e.target.value })}
                    placeholder="Nome do autor" className={inputCls} />
                </Field>
                <Field label="Footer">
                  <VarInput value={currentPage.footerText}
                    onChange={v => updatePage(activePage, { footerText: v })}
                    placeholder="Página ${activePage+1}/${pages.length}" className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          <button type="button" onClick={send} disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-crimson rounded-xl text-white font-semibold hover:bg-crimson-light transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : `Enviar Paginação (${pages.length} páginas)`}
          </button>
        </div>

        {/* Right: preview */}
        <div className="hidden lg:block">
          <p className="text-xs font-semibold text-bone/40 uppercase tracking-wider mb-3">
            Preview — Página {activePage + 1} de {pages.length}
          </p>
          <div className="sticky top-4 space-y-3">
            {currentPage && (
              <div className="bg-[#313338] rounded-lg p-4 font-sans">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">I</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-white font-semibold text-sm">Itadori Bot</span>
                      <span className="bg-[#5865F2] text-white text-[10px] font-medium px-1.5 py-px rounded">BOT</span>
                    </div>
                    {headerMsg && <p className="text-[#DBDEE1] text-sm mb-2">{headerMsg}</p>}
                    <div className="rounded mt-1 overflow-hidden" style={{ backgroundColor: "#2B2D31", borderLeft: `4px solid ${currentPage.color || "#5865F2"}` }}>
                      <div className="p-4 space-y-2">
                        {currentPage.authorName && (
                          <p className="text-[#F2F3F5] text-xs font-medium">{currentPage.authorName}</p>
                        )}
                        {currentPage.title && (
                          <p className="text-[#F2F3F5] font-semibold text-sm">{currentPage.title}</p>
                        )}
                        {currentPage.description && (
                          <p className="text-[#DBDEE1] text-sm leading-relaxed whitespace-pre-wrap">{currentPage.description}</p>
                        )}
                        {currentPage.image && (
                          <img src={currentPage.image} alt="" className="mt-2 rounded max-w-full max-h-48 object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        )}
                        {currentPage.footerText && (
                          <p className="text-[#87898C] text-[11px] pt-1">{currentPage.footerText}</p>
                        )}
                      </div>
                    </div>
                    {/* Reaction navigation preview */}
                    <div className="flex gap-2 mt-2">
                      <div className="flex items-center gap-1 bg-[#2B2D31] border border-[#5865F2]/40 rounded-full px-3 py-1 text-sm">
                        <span>{prevEmoji}</span>
                        <span className="text-[#DBDEE1] text-xs">1</span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#2B2D31] border border-white/10 rounded-full px-2 py-1">
                        <span className="text-[#87898C] text-xs">{activePage + 1}/{pages.length}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#2B2D31] border border-[#5865F2]/40 rounded-full px-3 py-1 text-sm">
                        <span>{nextEmoji}</span>
                        <span className="text-[#DBDEE1] text-xs">1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Page overview */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-3">
              <p className="text-[10px] text-bone/30 uppercase tracking-wider mb-2">Todas as páginas</p>
              <div className="space-y-1">
                {pages.map((p, i) => (
                  <button key={i} type="button" onClick={() => setActivePage(i)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2",
                      activePage === i ? "bg-crimson/15 text-crimson" : "text-bone/40 hover:text-bone hover:bg-white/5",
                    )}>
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
                    <span className="font-medium">Pág {i + 1}</span>
                    <span className="truncate opacity-60">{p.title || p.description?.slice(0, 30) || "—"}</span>
                  </button>
                ))}
              </div>
            </div>
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
      { id: "buttons",    label: "Botões",           icon: <Zap className="w-4 h-4" /> },
      { id: "prompts",    label: "Prompts IA",       icon: <ImageIcon className="w-4 h-4" /> },
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
          {tab === "embed"      && <TabEmbedBuilder channels={channels} guilds={guildArr} roles={roles} />}
          {tab === "buttons"    && <TabButtons channels={channels} guilds={guildArr} roles={roles} />}
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
          {tab === "prompts"    && <TabPrompts />}
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatBotWidget />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Context Menu */}
      <ContextMenuPortal />
    </div>
  );
}

