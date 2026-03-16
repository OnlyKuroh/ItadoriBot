"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import { Activity, User, MessageSquare, Shield, Bell, Zap, Clock, Hash } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

interface LogEntry {
  id?: number;
  type: string;
  content: string;
  guild_id?: string;
  user_id?: string;
  user_name?: string;
  timestamp: string | Date;
}

const LOG_ICONS: Record<string, React.ReactNode> = {
  COMMAND: <Zap className="w-4 h-4" />,
  EMBED_WEBHOOK: <MessageSquare className="w-4 h-4" />,
  MEMBER_JOIN: <User className="w-4 h-4" />,
  MEMBER_LEAVE: <User className="w-4 h-4" />,
  BAN: <Shield className="w-4 h-4" />,
  KICK: <Shield className="w-4 h-4" />,
  MESSAGE_DELETE: <MessageSquare className="w-4 h-4" />,
  MESSAGE_EDIT: <MessageSquare className="w-4 h-4" />,
  DEFAULT: <Activity className="w-4 h-4" />,
};

const LOG_COLORS: Record<string, string> = {
  COMMAND: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  EMBED_WEBHOOK: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  MEMBER_JOIN: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEMBER_LEAVE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  BAN: "text-red-400 bg-red-500/10 border-red-500/20",
  KICK: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  MESSAGE_DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  MESSAGE_EDIT: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  DEFAULT: "text-bone/60 bg-white/5 border-white/10",
};

function formatTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function cleanContent(content: string): string {
  // Remove Discord channel mentions like <#123456>
  return content.replace(/<#(\d+)>/g, "#canal").replace(/<@(\d+)>/g, "@user");
}

export function LiveLogs() {
  const shouldReduceMotion = useReducedMotion();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial logs
    fetch("http://localhost:3001/api/logs")
      .then((r) => r.json())
      .then((data: LogEntry[]) => {
        setLogs(data.slice(0, 15));
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Connect to WebSocket
    const socket = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("newLog", (log: LogEntry) => {
      setLogs((prev) => [log, ...prev].slice(0, 15));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <section id="logs" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#08080A]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-crimson/2 to-transparent pointer-events-none" />

      <div className="section-container relative z-10">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-crimson" />
            <p className="text-xs uppercase tracking-[0.3em] text-crimson font-poppins font-medium">
              Atividade em Tempo Real
            </p>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
          </div>
          <h2 className="font-bebas text-[2.5rem] sm:text-[3.5rem] lg:text-[4rem] text-bone leading-none mb-4">
            Logs do <span className="text-crimson">Dominio</span>
          </h2>
          <p className="text-bone/50 font-poppins font-light text-base">
            Acompanhe em tempo real todas as atividades do bot nos seus servidores
          </p>
        </AnimatedSection>

        {/* Logs Container */}
        <div
          ref={containerRef}
          className="max-w-4xl mx-auto bg-[#0D0D10] border border-white/5 rounded-2xl overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs text-bone/40 font-mono">activity_logs.tsx</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-bone/30" />
              <span className="text-xs text-bone/40">{logs.length} eventos</span>
            </div>
          </div>

          {/* Logs List */}
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-crimson/30 border-t-crimson rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-bone/40">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="w-8 h-8 text-bone/20 mx-auto mb-3" />
                <p className="text-sm text-bone/40">Nenhum log disponivel</p>
                <p className="text-xs text-bone/25 mt-1">Os logs aparecerao aqui em tempo real</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map((log, i) => {
                  const colorClass = LOG_COLORS[log.type] || LOG_COLORS.DEFAULT;
                  const icon = LOG_ICONS[log.type] || LOG_ICONS.DEFAULT;

                  return (
                    <motion.div
                      key={log.id || `${log.timestamp}-${i}`}
                      initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
                      animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                      exit={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="group px-5 py-4 hover:bg-white/2 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${colorClass}`}>
                          {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
                              {log.type.replace(/_/g, " ")}
                            </span>
                            {log.user_name && (
                              <span className="text-xs text-bone/50 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.user_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-bone/70 leading-relaxed">
                            {cleanContent(log.content)}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-bone/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.timestamp)}
                          </p>
                          <p className="text-[10px] text-bone/25 mt-0.5">
                            {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/5 bg-white/2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-500"}`} />
              <span className="text-xs text-bone/40">
                {connected ? "Conectado ao WebSocket" : "Desconectado"}
              </span>
            </div>
            <span className="text-xs text-bone/30 font-mono">localhost:3001</span>
          </div>
        </div>
      </div>
    </section>
  );
}
