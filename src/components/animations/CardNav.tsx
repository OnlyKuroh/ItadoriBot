"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface CardNavItem {
  id: string;
  label: string;
  title: string;
  description: string;
}

interface CardNavProps {
  items: CardNavItem[];
  className?: string;
}

export default function CardNav({ items, className }: CardNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  if (!activeItem) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const active = item.id === activeItem.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition-all",
                active
                  ? "border-crimson/40 bg-crimson/10 text-bone shadow-[0_0_30px_rgba(196,18,48,0.12)]"
                  : "border-white/8 bg-white/[0.03] text-bone/55 hover:border-white/15 hover:text-bone/80",
              )}
            >
              <div className="text-[10px] uppercase tracking-[0.24em] text-bone/35">{item.label}</div>
              <div className="mt-2 font-bebas text-2xl">{item.title}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d0d12]/75 p-5">
        <p className="text-[11px] uppercase tracking-[0.24em] text-crimson/70">{activeItem.label}</p>
        <h4 className="mt-2 font-bebas text-3xl text-bone">{activeItem.title}</h4>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-bone/55">{activeItem.description}</p>
      </div>
    </div>
  );
}
