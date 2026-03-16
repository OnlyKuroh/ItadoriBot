"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Copy, Check } from "lucide-react";
import { COMMANDS } from "@/lib/constants";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/ui/animated-section";
import { cn } from "@/lib/utils";

function CommandCard({ cmd, categoryColor }: { cmd: { name: string; description: string; usage: string }; categoryColor: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = () => {
    navigator.clipboard.writeText(cmd.usage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-crimson">/{cmd.name}</span>
          <span className="hidden sm:block text-xs text-bone/35 font-poppins">{cmd.description}</span>
        </div>
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-bone/30" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-[rgba(196,18,48,0.08)] space-y-3">
              <p className="sm:hidden text-sm text-bone/50 font-poppins">{cmd.description}</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-4 py-2 font-mono text-sm text-bone/60 flex-1 overflow-x-auto">
                  <span className="text-crimson/60 shrink-0">$</span>
                  <span className="whitespace-nowrap">{cmd.usage}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-white/5 text-bone/40 hover:text-bone transition-colors shrink-0"
                  title="Copiar uso"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Commands() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section id="comandos" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 gradient-section pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-80 h-80 rounded-full bg-crimson/3 blur-3xl pointer-events-none" />

      <div className="section-container relative">
        {/* Header */}
        <AnimatedSection className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-crimson font-poppins font-medium mb-4">
            Arsenal do Feiticeiro
          </p>
          <h2 className="font-bebas text-[3rem] sm:text-[4rem] lg:text-[5rem] text-bone leading-none mb-4">
            Todos os{" "}
            <span className="text-crimson">Comandos</span>
          </h2>
          <p className="text-bone/45 font-poppins font-light leading-relaxed">
            {COMMANDS.reduce((acc, cat) => acc + cat.commands.length, 0)} comandos disponíveis.
            Clique em qualquer um para ver como usar.
          </p>
        </AnimatedSection>

        {/* Category tabs */}
        <AnimatedSection className="flex justify-center gap-2 mb-10" delay={0.1}>
          {COMMANDS.map((cat, i) => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(i)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-poppins font-medium transition-all",
                activeCategory === i
                  ? "bg-crimson text-white glow-crimson"
                  : "border border-[rgba(196,18,48,0.15)] text-bone/50 hover:text-bone hover:border-crimson/30"
              )}
            >
              {cat.icon} {cat.category}
            </button>
          ))}
        </AnimatedSection>

        {/* Commands list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="space-y-2" staggerDelay={0.06}>
              {COMMANDS[activeCategory].commands.map((cmd) => (
                <StaggerItem key={cmd.name}>
                  <CommandCard cmd={cmd} categoryColor={COMMANDS[activeCategory].color} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </motion.div>
        </AnimatePresence>

        {/* Quick reference note */}
        <AnimatedSection className="mt-10 glass-card rounded-2xl p-6 text-center" delay={0.2}>
          <p className="text-sm text-bone/40 font-poppins">
            💡 Todos os comandos usam <code className="text-crimson bg-crimson/10 px-1.5 py-0.5 rounded text-xs">/</code> slash commands.
            Certifique-se que o bot tem as permissões necessárias no servidor.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
