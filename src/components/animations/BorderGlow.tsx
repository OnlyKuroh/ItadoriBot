"use client";

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  wrapperClassName?: string;
}

export default function BorderGlow({
  children,
  className = '',
  glowColor = 'rgba(196, 18, 48, 0.6)',
  wrapperClassName = '',
}: BorderGlowProps) {
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [opacity, setOpacity] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden group ${wrapperClassName}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{ opacity }}
        animate={{
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />
      <div className={`relative z-10 ${className}`}>{children}</div>
    </div>
  );
}
