"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from "framer-motion";

interface ScrollVelocityProps {
  text: string;
  velocity?: number;
  className?: string;
  parallaxOffset?: number;
}

function wrap(min: number, max: number, value: number) {
  const range = max - min;
  if (range === 0) return min;
  return ((((value - min) % range) + range) % range) + min;
}

export default function ScrollVelocity({
  text,
  velocity = 5,
  className = "",
  parallaxOffset = 1000,
}: ScrollVelocityProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef<number>(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * velocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden whitespace-nowrap m-0 flex flex-nowrap w-full">
      <motion.div className={`flex whitespace-nowrap flex-nowrap ${className}`} style={{ x }}>
        <span className="block mr-8">{text} </span>
        <span className="block mr-8">{text} </span>
        <span className="block mr-8">{text} </span>
        <span className="block mr-8">{text} </span>
      </motion.div>
    </div>
  );
}
