"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GitCommitHorizontal, Sparkles, TerminalSquare } from "lucide-react";
import CardSwap from "@/components/animations/CardSwap";
import { useUpdates } from "@/hooks/useUpdates";

const SUMMARY_STYLES = {
  feature: "text-emerald-300",
  improvement: "text-amber-300",
  fix: "text-red-300",
  total: "text-zinc-100",
} as const;

export function Updates() {
  const shouldReduceMotion = useReducedMotion();
  const { updates, loading } = useUpdates(6);

  const latest = updates[0];
  const cards = updates.map((update, index) => ({
    id: update.fingerprint,
    eyebrow: update.repos.map((repo) => repo.label).join(" + "),
    title: update.title,
    description: update.lead,
    accent: index % 2 === 0 ? "#2ecc71" : "#c41230",
  }));

  return (
    <section id="updates" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[#08080A]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(46,204,113,0.08),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(196,18,48,0.09),transparent_18%)]" />

      <div className="section-container relative z-10 space-y-10">
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 24 }}
          whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
              Atualizacoes Inteligentes
            </span>
          </div>
          <h2 className="font-bebas text-[3rem] leading-none text-bone sm:text-[4rem]">
            Todo deploy vira
            <span className="block text-emerald-300">nota de versao automatica</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone/55 sm:text-lg">
            O bot rastreia commits novos do backend e do dashboard, manda isso para a IA e publica um changelog pronto para Discord e para a landing page.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_360px]">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 24 }}
            whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="rounded-[28px] border border-white/10 bg-[#0d0d12]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6"
          >
            {loading ? (
              <div className="flex min-h-[520px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-400" />
              </div>
            ) : latest ? (
              <article className="space-y-6">
                <header className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-crimson to-emerald-400 text-white shadow-lg">
                      <TerminalSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-bone">Itadori Yuji © System v2.1</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-bone/35">
                        {new Date(latest.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5">
                    <h3 className="font-bebas text-[2.2rem] leading-none text-bone sm:text-[2.6rem]">
                      {latest.title}
                    </h3>
                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-bone/72 sm:text-base">
                      {latest.lead}
                    </p>
                  </div>
                </header>

                <div className="space-y-5">
                  {latest.sections.map((section) => (
                    <div key={`${latest.fingerprint}-${section.title}`} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-lg font-semibold text-bone">
                        {section.icon} {section.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-bone/88">{section.subtitle}</p>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-bone/62">{section.body}</p>
                      {section.calloutText ? (
                        <div className="mt-4 border-l-2 border-emerald-400/60 pl-4 text-sm leading-7 text-bone/58">
                          <span className="font-semibold text-bone/82">{section.calloutLabel}: </span>
                          {section.calloutText}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/8 bg-[#050608] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-bone">
                    <GitCommitHorizontal className="h-4 w-4 text-emerald-300" />
                    Resumo da Build
                  </div>
                  <div className="rounded-xl bg-black px-4 py-3 font-mono text-sm leading-7">
                    {latest.summaryLines.map((line) => (
                      <div key={`${latest.fingerprint}-${line.label}`} className={SUMMARY_STYLES[line.kind]}>
                        {line.label}: {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <TerminalSquare className="h-9 w-9 text-bone/25" />
                <p className="mt-4 text-lg font-semibold text-bone">Nenhuma atualizacao ainda</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-bone/45">
                  Assim que o rastreador detectar commits novos e a IA gerar a nota, ela vai aparecer aqui.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 24 }}
            whileInView={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className="space-y-4"
          >
            <div className="rounded-[28px] border border-white/10 bg-[#0d0d12]/90 p-5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.3em] text-bone/35">Fila de updates</p>
              <h3 className="mt-2 font-bebas text-3xl text-bone">Card Swap</h3>
              <p className="mt-2 text-sm leading-6 text-bone/48">
                Cada card representa uma rodada de deploy resumida pelo pipeline de novidades.
              </p>
            </div>

            <CardSwap
              items={cards.length > 0 ? cards : [{
                id: "placeholder",
                eyebrow: "Aguardando",
                title: "Pipeline de novidades",
                description: "Configure o canal com /setnovidades e publique novos commits para abastecer a timeline.",
                accent: "#2ecc71",
              }]}
              className="h-72"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
