"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CarouselSlide {
  id: string;
  title: string;
  description: string;
  accent: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export default function Carousel({
  slides,
  className,
  autoPlay = true,
  interval = 3200,
}: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [autoPlay, interval, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12]">
        <motion.div
          className="flex"
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-full p-5 md:p-6">
              <div
                className="mb-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={{
                  color: slide.accent,
                  backgroundColor: `${slide.accent}20`,
                  border: `1px solid ${slide.accent}35`,
                }}
              >
                Showcase
              </div>
              <h4 className="font-bebas text-3xl text-bone">{slide.title}</h4>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-bone/55">{slide.description}</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((box) => (
                  <div
                    key={box}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-4 text-center text-xs text-bone/45"
                  >
                    Painel {box + 1}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                index === activeIndex ? "w-8 bg-crimson" : "w-2.5 bg-white/15 hover:bg-white/30",
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
        <span className="text-xs uppercase tracking-[0.25em] text-bone/35">
          {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
