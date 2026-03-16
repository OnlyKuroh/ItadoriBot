"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

// JJK floating SVG elements — cursed energy slashes, flames, circles
const ELEMENTS = [
  // Slash marks
  { id: "slash1", x: "8%", delay: "0s", duration: "12s", size: 60, type: "slash", rot: -15 },
  { id: "slash2", x: "88%", delay: "3s", duration: "15s", size: 40, type: "slash", rot: 10 },
  { id: "slash3", x: "55%", delay: "7s", duration: "18s", size: 50, type: "slash", rot: -25 },
  // Cursed orbs
  { id: "orb1", x: "15%", delay: "2s", duration: "14s", size: 30, type: "orb", rot: 0 },
  { id: "orb2", x: "75%", delay: "5s", duration: "11s", size: 20, type: "orb", rot: 0 },
  { id: "orb3", x: "40%", delay: "9s", duration: "16s", size: 25, type: "orb", rot: 0 },
  // Kanji-like marks
  { id: "mark1", x: "65%", delay: "1s", duration: "20s", size: 45, type: "mark", rot: 5 },
  { id: "mark2", x: "30%", delay: "6s", duration: "13s", size: 35, type: "mark", rot: -8 },
];

function SlashSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <line x1="5" y1="55" x2="55" y2="5" stroke="rgba(196,18,48,0.5)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="55" x2="60" y2="5" stroke="rgba(196,18,48,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0" y1="50" x2="50" y2="0" stroke="rgba(196,18,48,0.15)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function OrbSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="12" stroke="rgba(196,18,48,0.4)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="7" fill="rgba(196,18,48,0.15)" />
      <circle cx="20" cy="20" r="3" fill="rgba(196,18,48,0.4)" />
    </svg>
  );
}

function MarkSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
      <rect x="10" y="23" width="30" height="2" rx="1" fill="rgba(196,18,48,0.35)" />
      <rect x="24" y="10" width="2" height="30" rx="1" fill="rgba(196,18,48,0.35)" />
      <rect x="16" y="16" width="18" height="18" rx="2" stroke="rgba(196,18,48,0.2)" strokeWidth="1" />
    </svg>
  );
}

export function FloatingElements() {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || shouldReduceMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {ELEMENTS.map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{
            left: el.x,
            top: "-60px",
            animationName: "fall-down",
            animationDuration: el.duration,
            animationDelay: el.delay,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationFillMode: "both",
            filter: "blur(0.5px)",
          } as React.CSSProperties}
        >
          {el.type === "slash" && <SlashSVG size={el.size} />}
          {el.type === "orb" && <OrbSVG size={el.size} />}
          {el.type === "mark" && <MarkSVG size={el.size} />}
        </div>
      ))}
    </div>
  );
}
