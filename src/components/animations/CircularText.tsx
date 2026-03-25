"use client";

import { motion } from "framer-motion";

interface CircularTextProps {
  text: string;
  size?: number;
  className?: string;
  duration?: number;
}

export default function CircularText({
  text,
  size = 120,
  className = "",
  duration = 10,
}: CircularTextProps) {
  const letters = text.split("");
  const rotationUnit = 360 / letters.length;

  return (
    <motion.div
      className={`relative rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ ease: "linear", duration, repeat: Infinity }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="absolute origin-bottom font-medium uppercase tracking-widest text-[#F5F0EB]/60"
            style={{
              height: `${size / 2}px`,
              transform: `rotate(${i * rotationUnit}deg)`,
              transformOrigin: `0 ${size / 2}px`,
              top: 0,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
