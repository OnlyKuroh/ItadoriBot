"use client";

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

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="relative z-[1]">
        <Hero />
        <Stats />
        <About />
        <Features />
        <Commands />
        <LiveLogs />
        <Members />
        <Contact />
      </main>

      <Footer />
      <CursorGlow />
    </>
  );
}
