"use client";

import { ArrowRight, ChevronDown, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SITE } from "@/lib/constants";

const headlineWords = ["O", "Bot.", "Que.", "Destrói."];

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background image — right half only on desktop */}
      <div className="absolute inset-0 lg:left-[42%]">
        <img
          src="/images/Yuji%20Itadori%20_%20Face%20Reveal%20_JJK%20Modulo.png"
          alt="Itadori Yuji — Jujutsu Kaisen"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center center" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Fade left edge into dark bg */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080A] via-[#08080A]/30 to-transparent" />
        {/* Bottom fade - strong to hide image edge */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-[#08080A]/60 to-[#08080A]/30" />
      </div>
      {/* Full-screen dark overlay on mobile so text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#08080A] via-[#08080A]/70 to-transparent lg:hidden" />

      {/* Fallback hero gradient when no image */}
      <div
        className="absolute inset-0 gradient-hero"
        style={{ zIndex: -1 }}
      />

      {/* Red glow orbs */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full bg-crimson/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-crimson/8 blur-2xl pointer-events-none" />

      {/* Decorative floating dots */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            className="absolute top-1/4 left-[12%] w-2 h-2 rounded-full bg-crimson/40"
            animate={{ y: [-10, 10, -10], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-2/3 left-[28%] w-1.5 h-1.5 rounded-full bg-crimson/25"
            animate={{ y: [8, -8, 8], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute top-1/2 left-[8%] w-1 h-1 rounded-full bg-bone/15"
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </>
      )}

      {/* Content */}
      <div className="relative section-container pt-32 pb-24 lg:pt-0 lg:pb-0 z-10">
        <div className="max-w-2xl space-y-8 lg:space-y-10">

          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-crimson/10 border border-crimson/20"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Zap className="w-3.5 h-3.5 text-crimson" />
            <span className="text-xs font-poppins font-medium uppercase tracking-[0.2em] text-crimson">
              Feiticeiro Grau Especial · Discord Bot
            </span>
          </motion.div>

          {/* Headline */}
          <div className="leading-[0.85]">
            {headlineWords.map((word, i) => (
              <motion.span
                key={word + i}
                className={`inline-block font-bebas text-[3.8rem] sm:text-[5.5rem] lg:text-[7rem] xl:text-[8.5rem] mr-3 lg:mr-4 ${
                  i >= 1 && i <= 3 ? "text-crimson" : "text-bone"
                }`}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 60, rotateX: -15 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.4 + i * 0.12,
                  ease: [0.22, 0.68, 0.35, 1.0],
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Italic tagline */}
          <motion.p
            className="text-xl sm:text-2xl lg:text-3xl text-bone/35 -mt-2 italic font-light"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -30 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            nascido da maldição, guardando o servidor
          </motion.p>

          {/* Description */}
          <motion.p
            className="text-base sm:text-lg text-bone/50 max-w-lg leading-relaxed font-poppins font-light"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            Moderação, logs, welcome e diversão —{" "}
            <span className="text-bone font-medium">tudo com a energia amaldiçoada de Yuji Itadori</span>.
            Gerencie seu servidor com poder de grau especial.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            <a
              href={SITE.discordServer}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-crimson text-white font-semibold rounded-full hover:bg-crimson-light transition-all glow-crimson"
            >
              Entrar no Servidor
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#comandos"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-bone/20 text-bone/70 font-medium rounded-full hover:border-crimson/40 hover:text-bone transition-colors"
            >
              Ver Comandos
            </a>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade — covers image edge completely */}
      <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#08080A] via-[#08080A]/95 to-transparent pointer-events-none z-20" />

      {/* Scroll indicator */}
      {!shouldReduceMotion && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
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
