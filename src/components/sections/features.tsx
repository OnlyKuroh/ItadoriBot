"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FEATURES } from "@/lib/constants";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/ui/animated-section";

export function Features() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="poderes" className="section-padding relative overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0 gradient-section pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-crimson/4 blur-3xl pointer-events-none" />

      <div className="section-container relative">
        {/* Header */}
        <AnimatedSection className="max-w-2xl mb-16 lg:mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-crimson font-poppins font-medium mb-4">
            Poderes do Bot
          </p>
          <h2 className="font-bebas text-[3rem] sm:text-[4rem] lg:text-[5rem] text-bone leading-none mb-6">
            Por que usar o{" "}
            <span className="text-crimson">Itadori Bot</span>?
          </h2>
          <p className="text-bone/45 font-poppins font-light leading-relaxed text-lg">
            Cada função foi pensada para dar ao administrador controle total —
            como um feiticeiro comandando seu domínio expandido.
          </p>
        </AnimatedSection>

        {/* Feature grid */}
        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          staggerDelay={0.1}
        >
          {FEATURES.map((feature, i) => (
            <StaggerItem key={feature.title}>
              <motion.div
                className="glass-card-hover rounded-2xl p-7 h-full relative overflow-hidden group"
                whileHover={shouldReduceMotion ? {} : { y: -4 }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-crimson/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                <span className="text-4xl mb-5 block">{feature.icon}</span>
                <h3 className="font-bebas text-2xl text-bone tracking-wide mb-3 group-hover:text-crimson transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-bone/40 font-poppins leading-relaxed">
                  {feature.description}
                </p>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute top-3 right-3 w-8 h-0.5 bg-crimson/40 rotate-45 origin-right" />
                  <div className="absolute top-3 right-3 w-0.5 h-8 bg-crimson/40 rotate-45 origin-top" />
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom CTA */}
        <AnimatedSection className="mt-16 text-center" delay={0.2}>
          <a
            href="#comandos"
            className="inline-flex items-center gap-2 text-crimson/70 hover:text-crimson font-poppins text-sm font-medium transition-colors group"
          >
            Ver todos os comandos
            <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
