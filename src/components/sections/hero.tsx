"use client";

import { ArrowRight, ChevronDown, Sparkles, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SITE } from "@/lib/constants";
import Aurora from "@/components/animations/Aurora";
import BlurText from "@/components/animations/BlurText";
import BorderGlow from "@/components/animations/BorderGlow";
import CardNav from "@/components/animations/CardNav";
import LogoLoop from "@/components/animations/LogoLoop";

const navCards = [
  {
    id: "comandos",
    label: "Comandos",
    title: "Ataque Rápido",
    description: "Veja os comandos mais usados e entre direto na parte que interessa sem vasculhar a página.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Controle Total",
    description: "Logs, boas-vindas, verificação e eventos em um painel que parece produto de verdade.",
  },
  {
    id: "suporte",
    label: "Suporte",
    title: "Entrada Segura",
    description: "Convide, configure e acompanhe o bot com menos fricção e mais clareza visual.",
  },
];

const logoItems = ["Discord.js", "Dashboard Web", "Logs em Tempo Real", "Welcome", "Verificação", "Slash Commands", "Eventos", "Itadori UI"];

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="inicio" className="relative flex min-h-screen items-center overflow-hidden pt-24">
      <Aurora colorStops={["#110509", "#701021", "#08080a"]} amplitude={0.9} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(196,18,48,0.18),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.06),transparent_18%),linear-gradient(180deg,rgba(8,8,10,0.72),rgba(8,8,10,0.92))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.92)_0%,rgba(8,8,10,0.7)_48%,rgba(8,8,10,0.88)_100%)]" />

      <div className="relative z-10 section-container pb-20 pt-16 lg:pt-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-7">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-crimson/20 bg-crimson/10 px-4 py-1.5"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <Zap className="h-3.5 w-3.5 text-crimson" />
              <span className="text-xs font-poppins font-medium uppercase tracking-[0.24em] text-crimson">
                Dashboard vivo para Discord
              </span>
            </motion.div>

            <div className="max-w-3xl space-y-5">
              <p className="text-sm uppercase tracking-[0.28em] text-bone/35">Feiticeiro grau especial</p>
              <h1 className="font-bebas text-[4rem] leading-[0.88] text-bone sm:text-[5.6rem] lg:text-[7.2rem]">
                O bot que controla
                <span className="block text-crimson">seu servidor sem caos</span>
              </h1>
              <div className="max-w-xl">
                <BlurText
                  text="Logs, welcome, verificação, comandos e dashboard em um fluxo mais limpo."
                  delay={28}
                  className="text-lg leading-relaxed text-bone/60 sm:text-xl"
                />
              </div>
            </div>

            <motion.p
              className="max-w-xl text-base leading-relaxed text-bone/52 sm:text-lg"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
            >
              Menos poluição visual, mais leitura rápida. A landing agora fica mais atmosférica, com foco no produto e sem apertar o conteúdo do topo.
            </motion.p>

            <motion.div
              className="flex flex-col gap-3 pt-2 sm:flex-row"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <a
                href={SITE.discordServer}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-crimson px-7 py-3.5 font-semibold text-white transition-all hover:bg-crimson-light glow-crimson"
              >
                Entrar no Servidor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/14 px-7 py-3.5 font-medium text-bone/76 transition-colors hover:border-crimson/40 hover:text-bone"
              >
                Abrir Dashboard
              </a>
            </motion.div>

            <motion.div
              className="grid gap-3 pt-3 sm:grid-cols-3"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 18 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.72 }}
            >
              {[
                { label: "Setup guiado", value: "01" },
                { label: "Logs em tempo real", value: "02" },
                { label: "Ações centralizadas", value: "03" },
              ].map((item) => (
                <div key={item.value} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="font-bebas text-3xl text-crimson">{item.value}</p>
                  <p className="mt-1 text-sm text-bone/50">{item.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 24 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="space-y-4"
          >
            <BorderGlow glowColor="rgba(196, 18, 48, 0.42)" wrapperClassName="rounded-[28px]">
              <div className="rounded-[28px] border border-white/10 bg-[#0d0d12]/88 p-4 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-crimson/70">Navegação rápida</p>
                    <p className="mt-2 font-bebas text-3xl text-bone">Card Nav</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-crimson/80">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <CardNav items={navCards} />
              </div>
            </BorderGlow>
          </motion.div>
        </div>

        <motion.div
          className="mt-10"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 18 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
        >
          <LogoLoop items={logoItems} />
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-[220px] bg-gradient-to-t from-[#08080A] via-[#08080A]/95 to-transparent" />

      {!shouldReduceMotion && (
        <motion.div
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-bone/25 font-poppins">
            Scroll
          </span>
          <ChevronDown className="h-4 w-4 text-bone/25 animate-scroll-hint" />
        </motion.div>
      )}
    </section>
  );
}
