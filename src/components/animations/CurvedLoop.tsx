"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CurvedLoopProps {
  text: string;
  className?: string;
}

export default function CurvedLoop({ text, className }: CurvedLoopProps) {
  const pathId = useId().replace(/:/g, "");
  const repeatedText = `${text} ${text} ${text}`;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.svg
        viewBox="0 0 320 200"
        className="h-full w-full"
        animate={{ rotate: [0, 4, -4, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <path id={pathId} d="M 28 150 Q 160 26 292 150" />
        </defs>

        <path d="M 28 150 Q 160 26 292 150" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
        <text fill="rgba(240,238,232,0.75)" fontSize="15" letterSpacing="5" className="font-bebas uppercase">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {repeatedText}
          </textPath>
        </text>
      </motion.svg>
    </div>
  );
}
