"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardSwapItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}

interface CardSwapProps {
  items: CardSwapItem[];
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export default function CardSwap({
  items,
  className,
  autoPlay = true,
  interval = 2600,
}: CardSwapProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [autoPlay, interval, items.length]);

  if (items.length === 0) return null;

  const visibleItems = [0, 1, 2].map((offset) => items[(activeIndex + offset) % items.length]);

  return (
    <div className={cn("relative h-56", className)}>
      <div className="absolute right-0 top-0 z-20 flex gap-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "h-2.5 rounded-full transition-all",
              index === activeIndex ? "w-8 bg-crimson" : "w-2.5 bg-white/15 hover:bg-white/30",
            )}
            aria-label={`Exibir card ${index + 1}`}
          />
        ))}
      </div>

      {visibleItems
        .slice()
        .reverse()
        .map((item, layer) => {
          const depth = 2 - layer;

          return (
            <motion.article
              key={`${item.id}-${depth}`}
              className="absolute inset-x-0 mx-auto w-[88%] rounded-2xl border border-white/10 bg-[#101015]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur"
              style={{
                top: depth * 16,
                zIndex: 10 - depth,
                transformOrigin: "top center",
              }}
              animate={{
                scale: 1 - depth * 0.06,
                rotate: depth === 0 ? 0 : depth % 2 === 0 ? -3 : 3,
                opacity: 1 - depth * 0.18,
              }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
            >
              <div
                className="mb-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em]"
                style={{
                  color: item.accent,
                  backgroundColor: `${item.accent}20`,
                  border: `1px solid ${item.accent}35`,
                }}
              >
                {item.eyebrow}
              </div>
              <h4 className="font-bebas text-3xl leading-none text-bone">{item.title}</h4>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-bone/55">{item.description}</p>
            </motion.article>
          );
        })}
    </div>
  );
}
