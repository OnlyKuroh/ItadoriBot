"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VariableProximityProps {
  text: string;
  className?: string;
  radius?: number;
}

export default function VariableProximity({
  text,
  className,
  radius = 110,
}: VariableProximityProps) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const letters = Array.from(text);

  return (
    <div
      className={cn("rounded-2xl border border-white/8 bg-[#0d0d12]/70 p-5", className)}
      onMouseLeave={() => setPointer(null)}
      onMouseMove={(event) => setPointer({ x: event.clientX, y: event.clientY })}
    >
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {letters.map((letter, index) => {
          const node = letterRefs.current[index];
          let strength = 0;

          if (pointer && node) {
            const rect = node.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
            strength = Math.max(0, 1 - distance / radius);
          }

          return (
            <span
              key={`${letter}-${index}`}
              ref={(element) => {
                letterRefs.current[index] = element;
              }}
              className="inline-block whitespace-pre text-bone transition-all duration-150"
              style={{
                transform: `translateY(${-strength * 6}px) scale(${1 + strength * 0.28})`,
                color: strength > 0 ? `rgba(232, 32, 63, ${0.6 + strength * 0.4})` : "rgba(240, 238, 232, 0.56)",
                textShadow: strength > 0 ? `0 0 ${18 * strength}px rgba(196, 18, 48, 0.45)` : "none",
                letterSpacing: `${0.02 + strength * 0.04}em`,
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}
