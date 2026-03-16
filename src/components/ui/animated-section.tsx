"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale" | "blur";
}

const directionOffsets = {
  up: { y: 40, x: 0, scale: 1, filter: "blur(0px)" },
  down: { y: -40, x: 0, scale: 1, filter: "blur(0px)" },
  left: { x: 40, y: 0, scale: 1, filter: "blur(0px)" },
  right: { x: -40, y: 0, scale: 1, filter: "blur(0px)" },
  scale: { y: 0, x: 0, scale: 0.92, filter: "blur(0px)" },
  blur: { y: 20, x: 0, scale: 1, filter: "blur(8px)" },
};

const endState = { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" };

export function AnimatedSection({ children, className, delay = 0, direction = "up" }: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const offset = directionOffsets[direction];

  if (shouldReduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={endState}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.68, 0.35, 1.0] }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.6, ease: [0.22, 0.68, 0.35, 1.0] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
