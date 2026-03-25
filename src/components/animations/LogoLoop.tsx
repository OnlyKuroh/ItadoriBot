"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoLoopProps {
  items: string[];
  className?: string;
  duration?: number;
}

export default function LogoLoop({
  items,
  className,
  duration = 16,
}: LogoLoopProps) {
  const loopItems = [...items, ...items];

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12]", className)}>
      <motion.div
        className="flex w-max gap-3 px-3 py-4"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {loopItems.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-bone/55"
          >
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
