"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedSection } from "@/components/ui/animated-section";
import { useBotMembers, type BotMember } from "@/hooks/useBotMembers";
import { useBotStats } from "@/hooks/useBotStats";

// Fallback members shown while bot is offline
const DEMO_MEMBERS: BotMember[] = [
  { id: "1", name: "Yuji Itadori", username: "yuji", avatar: "", role: "Feiticeiro Grau 1", color: "#C41230", status: "online" },
  { id: "2", name: "Megumi Fushiguro", username: "megumi", avatar: "", role: "Feiticeiro Grau 2", color: "#4A6FA5", status: "online" },
  { id: "3", name: "Nobara Kugisaki", username: "nobara", avatar: "", role: "Feiticeiro Grau 3", color: "#E8833A", status: "online" },
  { id: "4", name: "Satoru Gojo", username: "gojo", avatar: "", role: "Grau Especial", color: "#7B68EE", status: "online" },
  { id: "5", name: "Nanami Kento", username: "nanami", avatar: "", role: "Grau Semi-Especial", color: "#8B6914", status: "online" },
  { id: "6", name: "Toge Inumaki", username: "inumaki", avatar: "", role: "Grau Semi-Especial", color: "#2E8B57", status: "online" },
  { id: "7", name: "Maki Zenin", username: "maki", avatar: "", role: "Grau 4", color: "#8B0000", status: "online" },
  { id: "8", name: "Aoi Todo", username: "todo", avatar: "", role: "Grau 1", color: "#B8860B", status: "online" },
  { id: "9", name: "Ryomen Sukuna", username: "sukuna", avatar: "", role: "Rei das Maldições", color: "#8B0000", status: "online" },
  { id: "10", name: "Kento Nanami", username: "knanami", avatar: "", role: "Ex-Feiticeiro", color: "#6B4423", status: "online" },
  { id: "11", name: "Yuta Okkotsu", username: "yuta", avatar: "", role: "Grau Especial", color: "#1E90FF", status: "online" },
  { id: "12", name: "Choso", username: "choso", avatar: "", role: "Espírito Amaldiçoado", color: "#8B0045", status: "online" },
];

const STATUS_COLOR: Record<string, string> = {
  online: "#22C55E",
  idle: "#F59E0B",
  dnd: "#EF4444",
  offline: "#6B7280",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function MemberCard({ member }: { member: BotMember }) {
  const shouldReduceMotion = useReducedMotion();
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      className="flex-shrink-0 flex flex-col items-center gap-3 px-6"
      whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Avatar */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden border-2"
        style={{ borderColor: `${member.color}40`, background: `${member.color}18` }}
      >
        {member.avatar && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar}
            alt={member.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="font-bebas text-lg" style={{ color: member.color }}>
            {getInitials(member.name)}
          </span>
        )}
        {/* Status indicator */}
        <div
          className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#08080A]"
          style={{ background: STATUS_COLOR[member.status] ?? "#6B7280" }}
        />
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-xs font-poppins font-medium text-bone/70 whitespace-nowrap">{member.name}</p>
        <p className="text-[10px] font-poppins text-bone/30 whitespace-nowrap">{member.role}</p>
      </div>
    </motion.div>
  );
}

export function Members() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { members: botMembers } = useBotMembers();
  const { stats } = useBotStats();

  // Use real members from bot, fallback to demo if offline
  const displayMembers = botMembers.length > 0 ? botMembers : DEMO_MEMBERS;

  // Infinite loop — enough copies to always fill the screen
  const copies = Math.max(3, Math.ceil(24 / Math.max(displayMembers.length, 1)) + 1);
  const tripled = Array.from({ length: copies }, () => displayMembers).flat();

  return (
    <section id="feiticeiros" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 gradient-section pointer-events-none" />

      <div className="section-container relative mb-10">
        <AnimatedSection className="text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-crimson font-poppins font-medium mb-4">
            Feiticeiros Recrutados
          </p>
          <h2 className="font-bebas text-[3rem] sm:text-[4rem] lg:text-[5rem] text-bone leading-none mb-4">
            Membros do{" "}
            <span className="text-crimson">Servidor</span>
          </h2>
          <p className="text-bone/45 font-poppins font-light leading-relaxed">
            {stats?.members ? `+${stats.members.toLocaleString("pt-BR")} feiticeiros` : "+9.192 feiticeiros"} já fazem parte do universo.
            Adicione o bot e recrute seus próprios guerreiros.
          </p>
        </AnimatedSection>
      </div>

      {/* Carousel strip */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#08080A] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#08080A] to-transparent z-10 pointer-events-none" />

        <div className="py-4">
          <motion.div
            ref={trackRef}
            className="flex items-end pb-4"
            animate={shouldReduceMotion || paused ? {} : {
              x: ["0%", `-${100 / 3}%`],
            }}
            transition={{
              duration: 30,
              ease: "linear",
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            {tripled.map((member, i) => (
              <MemberCard key={`${member.id}-${i}`} member={member} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="section-container mt-10">
        <AnimatedSection className="text-center" delay={0.2}>
          <a
            href="https://discord.gg/azSBYfjUHY"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[rgba(196,18,48,0.25)] text-bone/60 hover:text-bone hover:border-crimson/50 font-poppins text-sm font-medium rounded-full transition-colors"
          >
            <svg className="w-4 h-4 text-crimson" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.081.111 18.102.13 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Ver todos os membros no servidor
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
