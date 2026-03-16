"use client";

import { useEffect, useRef, useState } from "react";

// ─── Sukuna Dismantle Slash Effect ──────────────────────────────────────────
// Canvas 2D puro — linhas de corte vermelhas/crimson que aparecem e desaparecem
// como o Dismantle do Sukuna cortando o espaço. Visível mas não interfere.

interface Slash {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  fadeOut: number;
  speed: number;
  delay: number;
  alive: boolean;
  width: number;
  type: "cleave" | "dismantle" | "thin";
  glowSize: number;
  angle: number;
}

function createSlash(w: number, h: number): Slash {
  const type =
    Math.random() > 0.8 ? "cleave" : Math.random() > 0.35 ? "dismantle" : "thin";

  // Ângulo aleatório com preferência por diagonais
  const angle =
    Math.random() > 0.5
      ? (Math.random() - 0.5) * 1.2 + Math.PI * 0.25
      : (Math.random() - 0.5) * 1.2 - Math.PI * 0.25;

  // Comprimento do corte
  const length =
    type === "cleave"
      ? 250 + Math.random() * 500
      : type === "dismantle"
        ? 150 + Math.random() * 350
        : 80 + Math.random() * 200;

  // Ponto central em qualquer lugar da tela
  const cx = Math.random() * w;
  const cy = Math.random() * h;

  return {
    x1: cx - Math.cos(angle) * length * 0.5,
    y1: cy - Math.sin(angle) * length * 0.5,
    x2: cx + Math.cos(angle) * length * 0.5,
    y2: cy + Math.sin(angle) * length * 0.5,
    progress: 0,
    fadeOut: 0,
    speed: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 0.8,
    alive: true,
    width: type === "cleave" ? 2.5 : type === "dismantle" ? 1.5 : 0.8,
    type,
    glowSize: type === "cleave" ? 18 : type === "dismantle" ? 10 : 5,
    angle,
  };
}

// Partículas de debris dos cortes
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export function SukunaSlashes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slashesRef = useRef<Slash[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const timerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnWave = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = 2 + Math.floor(Math.random() * 4); // 2-5 slashes
      for (let i = 0; i < count; i++) {
        if (slashesRef.current.length < 25) {
          slashesRef.current.push(createSlash(w, h));
        }
      }
    };

    const spawnParticles = (x: number, y: number, angle: number) => {
      const count = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        if (particlesRef.current.length < 100) {
          const spread = (Math.random() - 0.5) * 2;
          particlesRef.current.push({
            x,
            y,
            vx: Math.cos(angle + Math.PI / 2) * spread * 30 + (Math.random() - 0.5) * 20,
            vy: Math.sin(angle + Math.PI / 2) * spread * 30 + (Math.random() - 0.5) * 20,
            life: 1,
            maxLife: 0.5 + Math.random() * 0.8,
            size: 1 + Math.random() * 2.5,
          });
        }
      }
    };

    const drawSlash = (s: Slash) => {
      const p = Math.min(s.progress, 1);
      const fade = 1 - s.fadeOut;
      if (fade <= 0) return;

      const sx = s.x1;
      const sy = s.y1;
      const ex = s.x1 + (s.x2 - s.x1) * p;
      const ey = s.y1 + (s.y2 - s.y1) * p;

      // Glow externo (brilho vermelho)
      ctx.save();
      ctx.globalAlpha = 0.25 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = "#ff1a1a";
      ctx.lineWidth = s.glowSize;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = s.glowSize * 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();

      // Linha principal (crimson claro)
      ctx.save();
      ctx.globalAlpha = 0.45 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = s.type === "cleave" ? "#ff3333" : "#cc1122";
      ctx.lineWidth = s.width * 2;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();

      // Núcleo (branco quente)
      ctx.save();
      ctx.globalAlpha = 0.6 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = "#ffaaaa";
      ctx.lineWidth = s.width * 0.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    };

    const animate = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Timer de spawn
      timerRef.current += dt;
      if (timerRef.current >= 2.0) {
        timerRef.current = 0;
        spawnWave();
      }

      // Update & draw slashes
      slashesRef.current = slashesRef.current.filter((s) => s.alive);
      for (const s of slashesRef.current) {
        if (s.delay > 0) {
          s.delay -= dt;
          continue;
        }

        s.progress += dt * s.speed;

        // Spawn partículas na ponta do corte
        if (s.progress < 1 && Math.random() < 0.3) {
          const p = Math.min(s.progress, 1);
          const tipX = s.x1 + (s.x2 - s.x1) * p;
          const tipY = s.y1 + (s.y2 - s.y1) * p;
          spawnParticles(tipX, tipY, s.angle);
        }

        if (s.progress >= 1) {
          s.fadeOut += dt * 1.8;
          if (s.fadeOut >= 1) {
            s.alive = false;
            continue;
          }
        }

        drawSlash(s);
      }

      // Update & draw particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) {
        p.life -= dt / p.maxLife;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life) * 0.6;
        ctx.fillStyle = "#ff4444";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.max(0, p.life), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    };

    // Iniciar com um pequeno delay
    spawnWave();
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
