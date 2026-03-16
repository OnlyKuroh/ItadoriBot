"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedSection } from "@/components/ui/animated-section";
import { SITE } from "@/lib/constants";

export function Contact() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="suporte" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 gradient-section pointer-events-none" />

      {/* Big BG crimson glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-crimson/6 blur-3xl rounded-full pointer-events-none" />

      <div className="section-container relative">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <p className="text-xs uppercase tracking-[0.3em] text-crimson font-poppins font-medium mb-6">
              Suporte & Contato
            </p>
            <h2 className="font-bebas text-[3rem] sm:text-[4.5rem] lg:text-[6rem] text-bone leading-none mb-6">
              Precisa de{" "}
              <span className="text-crimson">Ajuda</span>?
            </h2>
            <p className="text-bone/50 font-poppins font-light leading-relaxed text-lg mb-10 max-w-xl mx-auto">
              Entre no nosso servidor de suporte no Discord. Nossa equipe de feiticeiros
              está sempre pronta para resolver qualquer problema.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <motion.a
              href={SITE.discordServer}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-crimson text-white font-semibold text-lg rounded-full glow-crimson-strong hover:bg-crimson-light transition-all"
              whileHover={shouldReduceMotion ? {} : { scale: 1.04 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.081.111 18.102.13 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Entrar no Servidor de Suporte
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </motion.a>
          </AnimatedSection>

          <AnimatedSection delay={0.25} className="mt-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
              {[
                { label: "Resposta Rápida", desc: "Geralmente em minutos" },
                { label: "Comunidade Ativa", desc: "Feiticeiros dedicados" },
                { label: "Atualizações", desc: "Novas funções frequentes" },
              ].map((item) => (
                <div key={item.label} className="glass-card rounded-xl p-4 text-center">
                  <p className="text-sm font-poppins font-medium text-bone/70 mb-1">{item.label}</p>
                  <p className="text-xs text-bone/35 font-poppins">{item.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
