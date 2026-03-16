"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  angle: number;
  distance: number;
}

interface CrackPath {
  id: number;
  d: string;
  strokeWidth: number;
  delay: number;
  length: number;
}

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────
function generateCrackPaths(count: number): CrackPath[] {
  const paths: CrackPath[] = [];
  const cx = 50; // % — center
  const cy = 55;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360 + Math.random() * 15;
    const rad = (angle * Math.PI) / 180;
    const segments = 3 + Math.floor(Math.random() * 3);

    let x = cx;
    let y = cy;
    let d = `M ${x} ${y}`;
    let totalLen = 0;

    for (let s = 0; s < segments; s++) {
      const spread = ((Math.random() - 0.5) * 20) / (s + 1);
      const dist = 15 + Math.random() * 25;
      x += Math.cos(rad + (spread * Math.PI) / 180) * dist;
      y += Math.sin(rad + (spread * Math.PI) / 180) * dist;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      d += ` L ${x} ${y}`;
      totalLen += dist;

      // random branch
      if (s === 1 && Math.random() > 0.4) {
        const bRad = rad + ((Math.random() - 0.5) * 60 * Math.PI) / 180;
        const bDist = dist * 0.5;
        const bx = Math.max(0, Math.min(100, x + Math.cos(bRad) * bDist));
        const by = Math.max(0, Math.min(100, y + Math.sin(bRad) * bDist));
        d += ` M ${x} ${y} L ${bx} ${by} M ${x} ${y}`;
      }
    }

    paths.push({
      id: i,
      d,
      strokeWidth: 0.3 + Math.random() * 0.5,
      delay: i * 0.06,
      length: totalLen * 4,
    });
  }
  return paths;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    size: 2 + Math.random() * 6,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    angle: Math.random() * 360,
    distance: 5 + Math.random() * 15,
  }));
}

// ──────────────────────────────────────────────────────────────
//  Sub-components
// ──────────────────────────────────────────────────────────────

/** Animated SVG crack network */
function CrackNetwork({ paths }: { paths: CrackPath[] }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="crack-glow">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="crack-glow-bright">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Dark thick cracks */}
      {paths.map((p) => (
        <motion.path
          key={`dark-${p.id}`}
          d={p.d}
          fill="none"
          stroke="#1a0000"
          strokeWidth={p.strokeWidth * 2.5}
          strokeLinecap="round"
          strokeDasharray={p.length}
          strokeDashoffset={p.length}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
        />
      ))}

      {/* Red glowing cracks */}
      {paths.map((p) => (
        <motion.path
          key={`red-${p.id}`}
          d={p.d}
          fill="none"
          stroke="#dc2626"
          strokeWidth={p.strokeWidth}
          strokeLinecap="round"
          filter="url(#crack-glow)"
          strokeDasharray={p.length}
          strokeDashoffset={p.length}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, delay: p.delay + 0.05, ease: "easeOut" }}
        />
      ))}

      {/* Bright core of some cracks */}
      {paths
        .filter((_, i) => i % 3 === 0)
        .map((p) => (
          <motion.path
            key={`bright-${p.id}`}
            d={p.d}
            fill="none"
            stroke="#fca5a5"
            strokeWidth={p.strokeWidth * 0.4}
            strokeLinecap="round"
            filter="url(#crack-glow-bright)"
            strokeDasharray={p.length}
            strokeDashoffset={p.length}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.6, delay: p.delay + 0.1, ease: "easeOut" }}
          />
        ))}
    </svg>
  );
}

/** Floating debris particles */
function Particles({ particles }: { particles: Particle[] }) {
  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * (0.5 + Math.random() * 0.8),
            background:
              p.id % 4 === 0
                ? "#dc2626"
                : p.id % 4 === 1
                  ? "#7f1d1d"
                  : p.id % 4 === 2
                    ? "#450a0a"
                    : "#1a0000",
            boxShadow: p.id % 3 === 0 ? "0 0 6px #dc2626" : "none",
            rotate: p.angle,
          }}
          animate={{
            x: [
              0,
              Math.cos((p.angle * Math.PI) / 180) * p.distance,
              Math.cos((p.angle * Math.PI) / 180) * p.distance * 1.5,
            ],
            y: [
              0,
              Math.sin((p.angle * Math.PI) / 180) * p.distance,
              Math.sin((p.angle * Math.PI) / 180) * p.distance * 1.5 + 10,
            ],
            opacity: [0, 0.9, 0],
            rotate: [p.angle, p.angle + 180, p.angle + 360],
            scale: [0, 1, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

/** Central cursed energy flash */
function CentralFlash() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Vortex ring */}
      <motion.div
        className="absolute rounded-full border-2 border-white/20"
        style={{ width: "55%", height: "55%", borderColor: "#e2e8f0" }}
        animate={{
          rotate: [0, 360],
          scale: [0.95, 1.05, 0.95],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full border border-red-500/40"
        style={{ width: "40%", height: "40%" }}
        animate={{
          rotate: [360, 0],
          scale: [1.05, 0.95, 1.05],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {/* Impact flash core */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 80,
          height: 80,
          background:
            "radial-gradient(circle, #ffffff 0%, #fca5a5 30%, #dc2626 60%, transparent 80%)",
          boxShadow:
            "0 0 40px 20px rgba(220,38,38,0.6), 0 0 80px 40px rgba(220,38,38,0.3)",
        }}
        animate={{
          scale: [1, 1.4, 0.9, 1.2, 1],
          opacity: [0.8, 1, 0.6, 1, 0.8],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Energy spikes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <motion.div
          key={deg}
          className="absolute origin-left"
          style={{
            width: 60 + Math.random() * 40,
            height: 2,
            background:
              "linear-gradient(to right, #ffffff, #dc2626, transparent)",
            rotate: deg,
            left: "50%",
            top: "50%",
            translateY: "-50%",
          }}
          animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 0.6,
            delay: deg * 0.005,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Main Component
// ──────────────────────────────────────────────────────────────
interface KokusenEffectProps {
  /** Show "BLACK FLASH!!" title overlay */
  showTitle?: boolean;
  /** Custom title text */
  title?: string;
  /** Height class, e.g. "h-screen" or "h-96" */
  heightClass?: string;
  /** Width class */
  widthClass?: string;
  className?: string;
  children?: React.ReactNode;
}

export function KokusenEffect({
  showTitle = false,
  title = "BLACK FLASH!!",
  heightClass = "h-screen",
  widthClass = "w-full",
  className = "",
  children,
}: KokusenEffectProps) {
  const [cracks] = useState(() => generateCrackPaths(24));
  const [particles] = useState(() => generateParticles(35));
  const [triggered, setTriggered] = useState(false);
  const controls = useAnimationControls();

  // Pulse the whole container every few seconds
  useEffect(() => {
    const pulse = async () => {
      await controls.start({ scale: 1.015, transition: { duration: 0.15 } });
      await controls.start({ scale: 1, transition: { duration: 0.3 } });
    };
    const id = setInterval(pulse, 3000);
    return () => clearInterval(id);
  }, [controls]);

  return (
    <motion.div
      animate={controls}
      className={`relative overflow-hidden ${heightClass} ${widthClass} ${className}`}
      style={{ background: "#050000" }}
    >
      {/* ── Layered radial gradients (aura) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 60% at 50% 55%, rgba(127,29,29,0.55) 0%, transparent 65%),
            radial-gradient(ellipse 80% 80% at 50% 55%, rgba(69,10,10,0.4) 0%, transparent 75%),
            radial-gradient(ellipse 100% 100% at 50% 55%, rgba(26,0,0,0.6) 0%, transparent 100%)
          `,
        }}
      />

      {/* ── Manga-style dark vignette ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* ── Speed lines / energy streaks ── */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * 360;
          return (
            <motion.div
              key={i}
              className="absolute origin-left"
              style={{
                width: "60%",
                height: 1,
                background: `linear-gradient(to right, transparent, rgba(220,38,38,0.8), transparent)`,
                left: "50%",
                top: "55%",
                rotate: angle,
              }}
              animate={{ scaleX: [0.3, 1, 0.3], opacity: [0.2, 0.7, 0.2] }}
              transition={{
                duration: 2 + Math.random(),
                delay: i * 0.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* ── SVG cracks ── */}
      <CrackNetwork paths={cracks} />

      {/* ── Particles / debris ── */}
      <Particles particles={particles} />

      {/* ── Central flash ── */}
      <CentralFlash />

      {/* ── Overlay red pulses ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.08, 0] }}
        style={{ background: "#dc2626" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Optional title (manga shout style) ── */}
      {showTitle && (
        <div className="absolute inset-0 flex flex-col items-center justify-start pt-12 pointer-events-none">
          <motion.h1
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="text-6xl font-black tracking-widest text-center"
            style={{
              color: "#ffffff",
              textShadow: `
                0 0 10px #ffffff,
                0 0 20px #dc2626,
                0 0 40px #dc2626,
                0 0 80px #7f1d1d,
                2px 2px 0 #450a0a,
                -2px -2px 0 #450a0a,
                2px -2px 0 #450a0a,
                -2px 2px 0 #450a0a
              `,
            }}
          >
            {title}
          </motion.h1>
        </div>
      )}

      {/* ── Content slot ── */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {children}
        </div>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Demo / Preview page usage
// ──────────────────────────────────────────────────────────────
export function KokusenDemo() {
  const [active, setActive] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 bg-black min-h-screen">
      <button
        onClick={() => setActive((v) => !v)}
        className="mx-auto px-6 py-2 rounded-lg bg-red-900 text-white font-bold hover:bg-red-700 transition-colors z-50"
      >
        {active ? "Deactivate" : "Activate"} Black Flash
      </button>

      {active && (
        <KokusenEffect showTitle heightClass="h-[600px]" widthClass="w-full" />
      )}

      {/* Smaller card variant */}
      <KokusenEffect
        heightClass="h-64"
        widthClass="w-full max-w-sm mx-auto"
        className="rounded-2xl"
      >
        <span className="text-white font-bold text-xl z-10 drop-shadow-lg">
          Cursed Energy
        </span>
      </KokusenEffect>
    </div>
  );
}
