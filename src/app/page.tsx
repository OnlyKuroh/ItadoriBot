"use client";

import { lazy, Suspense } from "react";
import { useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
import { About } from "@/components/sections/about";
import { Features } from "@/components/sections/features";
import { Commands } from "@/components/sections/commands";
import { LiveLogs } from "@/components/sections/live-logs";
import { Members } from "@/components/sections/members";
import { Contact } from "@/components/sections/contact";
import { CursorGlow } from "@/components/ui/cursor-glow";

const ParticleField = lazy(() =>
  import("@/components/ui/particle-field").then((m) => ({ default: m.ParticleField }))
);

const FloatingElements = lazy(() =>
  import("@/components/ui/floating-elements").then((m) => ({ default: m.FloatingElements }))
);

const SukunaSlashes = lazy(() =>
  import("@/components/ui/sukuna-slashes").then((m) => ({ default: m.SukunaSlashes }))
);

export default function Home() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      {/* Red particle field */}
      {!shouldReduceMotion && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}

      {/* Floating JJK cursed elements */}
      {!shouldReduceMotion && (
        <Suspense fallback={null}>
          <FloatingElements />
        </Suspense>
      )}

      {/* Sukuna Dismantle slash effect — cuts across the whole page */}
      {!shouldReduceMotion && (
        <Suspense fallback={null}>
          <SukunaSlashes />
        </Suspense>
      )}

      <Navbar />

      <main className="relative z-[1]">
        {/* 1. HERO — apresentação */}
        <Hero />

        {/* 2. STATS — contadores em tempo real */}
        <Stats />

        {/* 3. ABOUT — sobre o bot / JJK lore */}
        <About />

        {/* 4. FEATURES — por que usar */}
        <Features />

        {/* 5. COMMANDS — lista de comandos */}
        <Commands />

        {/* 6. LIVE LOGS — logs em tempo real */}
        <LiveLogs />

        {/* 7. MEMBERS — carrossel giratório de membros */}
        <Members />

        {/* 7. CONTACT — suporte Discord */}
        <Contact />
      </main>

      <Footer />
      <CursorGlow />
    </>
  );
}
