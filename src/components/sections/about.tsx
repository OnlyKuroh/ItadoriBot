"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/ui/animated-section";

const TAGS = [
  "Moderação", "Logs em Tempo Real", "Welcome Custom", "Grau Especial",
  "Diversão", "Energia Amaldiçoada", "Dashboard Web", "Banimento", "Verificação",
  "Comandos Slash", "Socket.io", "SQLite", "Open Source",
];

const REASONS = [
  {
    icon: "🔥",
    title: "Personagem Icônico",
    body: "Inspirado em Yuji Itadori, o protagonista de Jujutsu Kaisen — força, determinação e proteção ao servidor.",
  },
  {
    icon: "⚡",
    title: "Sempre Online",
    body: "Com 910h+ ativo e 21.931 comandos executados, o bot nunca para. Como o próprio Itadori nunca desiste.",
  },
  {
    icon: "🛡️",
    title: "Administração Completa",
    body: "Ban, kick, logs, welcome, verificação — tudo em um único bot com painel web integrado.",
  },
  {
    icon: "🌐",
    title: "Dashboard Visual",
    body: "Gerencie tudo pelo navegador com preview em tempo real, upload de imagens e histórico de logs.",
  },
];

export function About() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="sobre" className="section-padding gradient-section relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent to-crimson/30" />
      <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-crimson/3 blur-3xl pointer-events-none" />

      <div className="section-container">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-crimson font-poppins font-medium mb-4">
            Sobre o Bot
          </p>
          <h2 className="font-bebas text-[3rem] sm:text-[4rem] lg:text-[5rem] text-bone leading-none mb-6">
            Nascido da{" "}
            <span className="text-crimson">Maldição</span>
          </h2>
          <p className="text-bone/50 font-poppins font-light leading-relaxed text-lg">
            Criado sobre a personificação de <strong className="text-bone font-medium">Itadori Yuji</strong> de{" "}
            <em>Jujutsu Kaisen</em> — o garoto de cabelos brancos e olhos vermelhos que carrega a maldição mais
            poderosa. Agora ele protege o seu servidor com a mesma dedicação com que protege seus amigos.
          </p>
        </AnimatedSection>

        {/* Tags floating */}
        <AnimatedSection className="flex flex-wrap justify-center gap-2 mb-20" delay={0.1}>
          {TAGS.map((tag, i) => (
            <motion.span
              key={tag}
              className="px-4 py-1.5 text-xs font-poppins font-medium rounded-full border border-[rgba(196,18,48,0.15)] text-bone/50 hover:border-crimson/40 hover:text-bone/80 transition-colors cursor-default"
              whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.04 }}
              transition={{ delay: i * 0.03 }}
            >
              {tag}
            </motion.span>
          ))}
        </AnimatedSection>

        {/* Why section */}
        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          staggerDelay={0.12}
        >
          {REASONS.map((reason) => (
            <StaggerItem key={reason.title}>
              <div className="glass-card-hover rounded-2xl p-6 h-full">
                <span className="text-3xl mb-4 block">{reason.icon}</span>
                <h3 className="font-bebas text-xl text-bone tracking-wide mb-2">{reason.title}</h3>
                <p className="text-sm text-bone/40 font-poppins leading-relaxed">{reason.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Big decorative text */}
        <AnimatedSection className="mt-20 text-center" direction="scale">
          <p
            className="font-bebas text-[5rem] sm:text-[7rem] lg:text-[10rem] xl:text-[13rem] leading-none select-none"
            style={{
              WebkitTextStroke: "1px rgba(196,18,48,0.12)",
              color: "transparent",
              letterSpacing: "0.05em",
            }}
          >
            JUJUTSU
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
