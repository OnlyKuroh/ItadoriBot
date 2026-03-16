"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TICKER_ITEMS, NAV_LINKS, SITE } from "@/lib/constants";

export function Footer() {
  const shouldReduceMotion = useReducedMotion();
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <footer className="relative border-t border-[rgba(196,18,48,0.12)]">
      <div className="section-divider" />

      {/* TICKER BELT */}
      <div className="ticker-container">
        <div className="ticker-content">
          {doubled.map((item, i) => (
            <div key={i} className="ticker-item">
              <span>✦</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Footer body */}
      <div className="section-container py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {/* Col 1: Logo + tagline */}
          <div className="space-y-4">
            <a href="#inicio" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-crimson flex items-center justify-center">
                <span className="font-bebas text-white text-sm">I</span>
              </div>
              <p className="font-bebas text-xl tracking-wider text-bone uppercase">
                Itadori <span className="text-crimson">Bot</span>
              </p>
            </a>
            <p className="text-sm text-bone/35 font-poppins font-light leading-relaxed max-w-xs">
              Painel de administração do bot — gerencie embeds, logs e comandos
              com o poder de um feiticeiro grau especial.
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-bone/40 font-poppins">Bot online</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-bone/30 font-poppins font-medium">
              Navegação
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Início", href: "#inicio" },
                { label: "Sobre", href: "#sobre" },
                { label: "Poderes", href: "#poderes" },
                { label: "Comandos", href: "#comandos" },
                { label: "Feiticeiros", href: "#feiticeiros" },
                { label: "Suporte", href: "#suporte" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-bone/40 hover:text-crimson transition-colors font-poppins py-1"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Col 3: Support */}
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-bone/30 font-poppins font-medium">
              Suporte
            </p>
            <p className="text-sm text-bone/40 font-poppins leading-relaxed">
              Precisa de ajuda ou quer contribuir? Entre no nosso servidor Discord.
            </p>
            <motion.a
              href={SITE.discordServer}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-crimson/10 border border-crimson/25 text-crimson rounded-xl text-sm font-medium hover:bg-crimson/20 transition-colors"
              whileHover={shouldReduceMotion ? {} : { x: 3 }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.081.111 18.102.13 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Servidor de Suporte
            </motion.a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[rgba(196,18,48,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-bone/25 font-poppins">
            &copy; {new Date().getFullYear()} Itadori Bot. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-bone/15 font-poppins">
            Feito com <span className="text-crimson/50">♥</span> e energia amaldiçoada
          </p>
        </div>
      </div>
    </footer>
  );
}
