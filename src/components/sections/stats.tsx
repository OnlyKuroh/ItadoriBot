"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/ui/count-up";
import { useBotStats } from "@/hooks/useBotStats";

export function Stats() {
  const shouldReduceMotion = useReducedMotion();
  const { stats, loading } = useBotStats();

  const uptimeHours = stats?.uptimeSeconds != null ? Math.floor(stats.uptimeSeconds / 3600) : 0;

  const liveStats = [
    { value: stats?.commandsUsed ?? 0, suffix: "", label: "Desmantelares Utilizados", sublabel: "quantidade de comandos usados" },
    { value: stats?.members ?? 0, suffix: "", label: "Feiticeiros Ajudados", sublabel: "membros no geral" },
    { value: uptimeHours, suffix: "h", label: "Ativo nas Sombras", sublabel: "horas ativo no mundo JJK" },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background - same as page bg for seamless blend */}
      <div className="absolute inset-0 bg-[#08080A]" />
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-crimson/3 to-transparent pointer-events-none" />

      <div className="section-container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x md:divide-crimson/10">
          {liveStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex flex-col items-center text-center px-8 py-12 relative"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 40 }}
              whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.22, 0.68, 0.35, 1] }}
            >
              {/* Number */}
              <p className="font-bebas text-[4.5rem] sm:text-[5.5rem] lg:text-[6.5rem] text-crimson leading-none drop-shadow-[0_0_30px_rgba(196,18,48,0.3)]">
                {loading ? (
                  <span className="opacity-50">...</span>
                ) : (
                  <CountUp end={stat.value} suffix={stat.suffix} duration={2500} />
                )}
              </p>

              {/* Label */}
              <p className="font-bebas text-xl sm:text-2xl text-bone tracking-wider mt-2">
                {stat.label}
              </p>
              <p className="text-xs text-bone/35 font-poppins mt-1 max-w-[180px]">
                {stat.sublabel}
              </p>

              {/* Subtle dividers on mobile */}
              {i < liveStats.length - 1 && (
                <div className="md:hidden absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-crimson/20 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
