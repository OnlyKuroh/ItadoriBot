"use client";

import { useEffect, useRef, useState } from "react";

// ─── Black Lightning Effect ─────────────────────────────────────────────────
// Raios negros enormes vindos de baixo, da borda e do fim da página
// Cor preta com glow vermelho escuro (15px) + glow branco menor (5px, 70% menor)

interface Lightning {
  x: number;           // posição X na borda inferior
  progress: number;    // progresso de 0 a 1
  fadeOut: number;     // fade out de 0 a 1
  speed: number;       // velocidade do raio
  delay: number;       // delay antes de aparecer
  alive: boolean;
  width: number;       // largura do raio
  length: number;      // comprimento do raio
  angle: number;       // ângulo (subindo da base)
  glowRed: number;     // tamanho do glow vermelho
  glowWhite: number;   // tamanho do glow branco
}

function createLightning(w: number, h: number): Lightning {
  // Raio enorme saindo da borda inferior
  const x = Math.random() * w;

  // Ângulo subindo (entre -75° e -105°, ou seja, quase vertical mas com variação)
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6; // -90° ±17°

  // Comprimento enorme (da base até quase o topo da tela)
  const length = h * (0.7 + Math.random() * 0.5); // 70% a 120% da altura

  return {
    x,
    progress: 0,
    fadeOut: 0,
    speed: 2.5 + Math.random() * 2,
    delay: Math.random() * 0.5,
    alive: true,
    width: 3 + Math.random() * 4, // raios grossos
    length,
    angle,
    glowRed: 15,    // glow vermelho 15px
    glowWhite: 5,   // glow branco 5px (70% menor que o vermelho)
  };
}

// Partículas de energia dos raios
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export function BlackLightning() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightningsRef = useRef<Lightning[]>([]);
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
      const count = 3 + Math.floor(Math.random() * 5); // 3-7 raios
      for (let i = 0; i < count; i++) {
        if (lightningsRef.current.length < 30) {
          lightningsRef.current.push(createLightning(w, h));
        }
      }
    };

    const spawnParticles = (x: number, y: number) => {
      const count = 4 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        if (particlesRef.current.length < 150) {
          particlesRef.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            life: 1,
            maxLife: 0.6 + Math.random() * 0.8,
            size: 1.5 + Math.random() * 3,
          });
        }
      }
    };

    const drawLightning = (l: Lightning) => {
      const p = Math.min(l.progress, 1);
      const fade = 1 - l.fadeOut;
      if (fade <= 0) return;

      // Ponto de origem (base, na borda inferior)
      const startX = l.x;
      const startY = window.innerHeight;

      // Ponto final (topo do raio)
      const endX = startX + Math.cos(l.angle) * l.length * p;
      const endY = startY + Math.sin(l.angle) * l.length * p;

      // ── Glow externo vermelho escuro (15px) ─────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.4 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = "#8B0000"; // vermelho escuro
      ctx.lineWidth = l.width + l.glowRed * 2;
      ctx.lineCap = "round";
      ctx.shadowColor = "#8B0000";
      ctx.shadowBlur = l.glowRed * 2.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // ── Glow interno branco (5px, 70% menor) ────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.3 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = l.width + l.glowWhite * 2;
      ctx.lineCap = "round";
      ctx.shadowColor = "#FFFFFF";
      ctx.shadowBlur = l.glowWhite * 1.8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // ── Núcleo preto do raio ────────────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.9 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = l.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // ── Brilho no núcleo (vermelho muito escuro) ────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.5 * fade * Math.min(p * 5, 1);
      ctx.strokeStyle = "#330000";
      ctx.lineWidth = l.width * 0.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
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
      if (timerRef.current >= 2.5) {
        timerRef.current = 0;
        spawnWave();
      }

      // Update & draw lightnings
      lightningsRef.current = lightningsRef.current.filter((l) => l.alive);
      for (const l of lightningsRef.current) {
        if (l.delay > 0) {
          l.delay -= dt;
          continue;
        }

        l.progress += dt * l.speed;

        // Spawn partículas na ponta do raio
        if (l.progress < 1 && Math.random() < 0.25) {
          const p = Math.min(l.progress, 1);
          const startX = l.x;
          const startY = window.innerHeight;
          const tipX = startX + Math.cos(l.angle) * l.length * p;
          const tipY = startY + Math.sin(l.angle) * l.length * p;
          spawnParticles(tipX, tipY);
        }

        if (l.progress >= 1) {
          l.fadeOut += dt * 1.5;
          if (l.fadeOut >= 1) {
            l.alive = false;
            continue;
          }
        }

        drawLightning(l);
      }

      // Update & draw particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) {
        p.life -= dt / p.maxLife;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life) * 0.7;
        ctx.fillStyle = "#8B0000";
        ctx.shadowColor = "#8B0000";
        ctx.shadowBlur = 8;
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
