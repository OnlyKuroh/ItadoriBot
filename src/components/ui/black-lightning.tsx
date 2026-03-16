"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// KOKUSEN — BLACK LIGHTNING (黒閃)
// Raios negros fractais com ramificações recursivas tipo árvore elétrica.
// Algoritmo: Midpoint Displacement (fractal subdivision) com branching.
// Visual: Núcleo preto + glow vermelho escuro (15px) + glow branco (5px)
// ═══════════════════════════════════════════════════════════════════════════

type Point = { x: number; y: number };

// ─── Midpoint Displacement ──────────────────────────────────────────────────
// Gera um caminho de raio realista entre dois pontos usando subdivisão fractal.
// A cada nível, pega o ponto médio de cada segmento, desloca perpendicular
// por um valor aleatório que diminui a cada iteração (roughness).
// Isso cria o zig-zag natural dos raios elétricos.
function fractalBolt(
  start: Point,
  end: Point,
  generations: number,
  offsetScale: number
): Point[] {
  let points: Point[] = [start, end];

  let offset = offsetScale;
  for (let gen = 0; gen < generations; gen++) {
    const newPoints: Point[] = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      // Ponto médio
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // Vetor perpendicular ao segmento
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      // Deslocamento aleatório perpendicular
      const displacement = (Math.random() - 0.5) * offset;
      newPoints.push({ x: mx + nx * displacement, y: my + ny * displacement });
      newPoints.push(b);
    }
    points = newPoints;
    offset *= 0.52; // Cada geração reduz o deslocamento (mais detalhado, menos caótico)
  }
  return points;
}

// ─── Bolt Tree ──────────────────────────────────────────────────────────────
// Um raio completo com tronco principal + ramificações recursivas.
// Cada branch pode gerar sub-branches, criando a estrutura de árvore.
interface BoltBranch {
  points: Point[];
  width: number;
  depth: number;     // 0 = tronco, 1 = branch, 2 = sub-branch, etc.
  children: BoltBranch[];
}

function generateBoltTree(
  start: Point,
  end: Point,
  baseWidth: number,
  maxDepth: number,
  branchChance: number
): BoltBranch {
  const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  const generations = Math.max(4, Math.min(7, Math.floor(Math.log2(dist / 15))));
  const offsetScale = dist * 0.25;

  const points = fractalBolt(start, end, generations, offsetScale);

  const branch: BoltBranch = {
    points,
    width: baseWidth,
    depth: 0,
    children: [],
  };

  // Gera ramificações recursivas
  addBranches(branch, maxDepth, branchChance, 0);

  return branch;
}

function addBranches(
  parent: BoltBranch,
  maxDepth: number,
  branchChance: number,
  currentDepth: number
) {
  if (currentDepth >= maxDepth) return;

  const pts = parent.points;
  // Não gera branches nos primeiros 20% nem nos últimos 10% do raio
  const startIdx = Math.floor(pts.length * 0.2);
  const endIdx = Math.floor(pts.length * 0.9);

  for (let i = startIdx; i < endIdx; i++) {
    if (Math.random() > branchChance) continue;

    const origin = pts[i];
    // Direção do segmento no ponto de origem
    const next = pts[Math.min(i + 1, pts.length - 1)];
    const dx = next.x - origin.x;
    const dy = next.y - origin.y;
    const segAngle = Math.atan2(dy, dx);

    // Ângulo da branch: desvia 25°-65° para um lado aleatório
    const branchAngle = segAngle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.7);

    // Comprimento da branch: 20%-50% do comprimento restante do pai
    const remaining = pts.length - i;
    const branchLen = (remaining / pts.length) *
      Math.sqrt((pts[pts.length - 1].x - origin.x) ** 2 + (pts[pts.length - 1].y - origin.y) ** 2) *
      (0.2 + Math.random() * 0.35);

    const branchEnd: Point = {
      x: origin.x + Math.cos(branchAngle) * branchLen,
      y: origin.y + Math.sin(branchAngle) * branchLen,
    };

    const gens = Math.max(3, Math.min(5, Math.floor(Math.log2(branchLen / 10))));
    const branchPoints = fractalBolt(origin, branchEnd, gens, branchLen * 0.2);

    const child: BoltBranch = {
      points: branchPoints,
      width: parent.width * (0.4 + Math.random() * 0.2),  // Mais fino que o pai
      depth: currentDepth + 1,
      children: [],
    };

    parent.children.push(child);

    // Recursão: sub-branches com chance reduzida
    addBranches(child, maxDepth, branchChance * 0.5, currentDepth + 1);
  }
}

// ─── Animated Bolt ──────────────────────────────────────────────────────────
interface AnimBolt {
  tree: BoltBranch;
  progress: number;      // 0→1 raio se expandindo
  fadeOut: number;        // 0→1 raio desaparecendo
  speed: number;
  delay: number;
  alive: boolean;
  flash: number;         // flash brilhante no momento do impacto
  intensity: number;     // multiplicador de brilho (varia entre raios)
}

// ─── Spark Particle ─────────────────────────────────────────────────────────
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE GLOW
// ═══════════════════════════════════════════════════════════════════════════
const GLOW_RED_RADIUS = 15;   // Glow vermelho escuro: 15px
const GLOW_WHITE_RADIUS = 5;  // Glow branco (70% menor): 5px

export function BlackLightning() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boltsRef = useRef<AnimBolt[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const timerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const spawnBolt = useCallback((w: number, h: number) => {
    // Posição de origem: borda inferior, espalhada pela largura
    const startX = Math.random() * w;
    const startY = h + 5;

    // Posição final: subindo na tela, com variação lateral
    const endX = startX + (Math.random() - 0.5) * w * 0.5;
    // Altura variada: uns vão até o topo, outros param no meio
    const endY = -h * 0.05 + Math.random() * h * 0.45;

    // Variação de força: uns raios são enormes, outros menores
    const scale = 0.4 + Math.random() * 0.6; // 40% - 100% da força máxima
    const baseWidth = (2 + Math.random() * 4) * scale;
    const maxDepth = scale > 0.7 ? 3 : scale > 0.5 ? 2 : 1;
    const branchChance = 0.12 + scale * 0.15;

    const tree = generateBoltTree(
      { x: startX, y: startY },
      { x: endX, y: endY },
      baseWidth,
      maxDepth,
      branchChance
    );

    boltsRef.current.push({
      tree,
      progress: 0,
      fadeOut: 0,
      speed: 2.5 + Math.random() * 3,
      delay: Math.random() * 0.4,
      alive: true,
      flash: 0,
      intensity: 0.6 + Math.random() * 0.4,
    });
  }, []);

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

    // ─── Desenha uma branch recursivamente ───────────────────────────
    const drawBranch = (
      branch: BoltBranch,
      progress: number,
      fadeVal: number,
      flash: number,
      intensity: number,
      parentProgress: number
    ) => {
      const fade = 1 - fadeVal;
      if (fade <= 0) return;

      const pts = branch.points;
      if (pts.length < 2) return;

      // Branches filhas aparecem com delay proporcional à profundidade
      const depthDelay = branch.depth * 0.15;
      const localProgress = Math.max(0, Math.min(1, (parentProgress - depthDelay) / (1 - depthDelay)));
      if (localProgress <= 0) return;

      // Quantos pontos mostrar
      const visibleCount = Math.floor(localProgress * (pts.length - 1)) + 1;
      const partialFrac = (localProgress * (pts.length - 1)) - (visibleCount - 1);

      // Constrói o path
      const buildPath = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < visibleCount && i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        // Segmento parcial
        if (visibleCount < pts.length && partialFrac > 0) {
          const from = pts[visibleCount - 1];
          const to = pts[visibleCount];
          if (from && to) {
            ctx.lineTo(
              from.x + (to.x - from.x) * partialFrac,
              from.y + (to.y - from.y) * partialFrac
            );
          }
        }
      };

      const alpha = Math.min(localProgress * 5, 1);
      const w = branch.width;
      const flashBoost = flash > 0 ? flash * 0.3 : 0;
      const depthFade = Math.pow(0.75, branch.depth); // Branches mais profundas = mais transparentes

      // ── CAMADA 1: Glow externo vermelho escuro (15px) ─────────────
      ctx.save();
      ctx.globalAlpha = (0.3 + flashBoost) * fade * alpha * intensity * depthFade;
      ctx.strokeStyle = "#8B0000";
      ctx.lineWidth = w + GLOW_RED_RADIUS * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#8B0000";
      ctx.shadowBlur = GLOW_RED_RADIUS * 2;
      buildPath();
      ctx.stroke();
      ctx.restore();

      // ── CAMADA 2: Glow interno branco (5px, 70% menor) ────────────
      ctx.save();
      ctx.globalAlpha = (0.2 + flashBoost * 0.5) * fade * alpha * intensity * depthFade;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = w + GLOW_WHITE_RADIUS * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#FFFFFF";
      ctx.shadowBlur = GLOW_WHITE_RADIUS * 1.5;
      buildPath();
      ctx.stroke();
      ctx.restore();

      // ── CAMADA 3: Núcleo PRETO do raio ────────────────────────────
      ctx.save();
      ctx.globalAlpha = (0.85 + flashBoost * 0.15) * fade * alpha * depthFade;
      ctx.strokeStyle = "#050505";
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      buildPath();
      ctx.stroke();
      ctx.restore();

      // ── CAMADA 4: Linha de energia vermelho escuro no centro ──────
      ctx.save();
      ctx.globalAlpha = (0.4 + flashBoost * 0.3) * fade * alpha * intensity * depthFade;
      ctx.strokeStyle = "#4A0000";
      ctx.lineWidth = Math.max(1, w * 0.35);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      buildPath();
      ctx.stroke();
      ctx.restore();

      // Desenha branches filhas recursivamente
      for (const child of branch.children) {
        drawBranch(child, progress, fadeVal, flash, intensity, localProgress);
      }
    };

    // ─── Spawn sparks na ponta do raio ────────────────────────────
    const spawnSparks = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        if (sparksRef.current.length < 300) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 20 + Math.random() * 80;
          sparksRef.current.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 0.3 + Math.random() * 0.5,
            size: 0.8 + Math.random() * 2,
          });
        }
      }
    };

    // ─── Loop de animação ────────────────────────────────────────────
    const animate = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Timer de spawn: a cada ~2.5s spawna uma onda de raios
      timerRef.current += dt;
      if (timerRef.current >= 2.2) {
        timerRef.current = 0;
        // 2-5 raios por onda, de forças diferentes
        const count = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          spawnBolt(w, h);
        }
      }

      // ── Update & draw bolts ──────────────────────────────────────
      boltsRef.current = boltsRef.current.filter(b => b.alive);
      for (const bolt of boltsRef.current) {
        if (bolt.delay > 0) {
          bolt.delay -= dt;
          continue;
        }

        const prevProgress = bolt.progress;
        bolt.progress += dt * bolt.speed;

        // Flash no momento que o raio completa
        if (prevProgress < 1 && bolt.progress >= 1) {
          bolt.flash = 1;
          // Sparks na ponta do raio
          const tip = bolt.tree.points[bolt.tree.points.length - 1];
          if (tip) spawnSparks(tip.x, tip.y, 8 + Math.floor(Math.random() * 12));
        }

        // Decay do flash
        if (bolt.flash > 0) {
          bolt.flash -= dt * 4;
          if (bolt.flash < 0) bolt.flash = 0;
        }

        // Fade out depois de completar
        if (bolt.progress >= 1) {
          bolt.fadeOut += dt * 1.0;
          if (bolt.fadeOut >= 1) {
            bolt.alive = false;
            continue;
          }
        }

        // Sparks na ponta enquanto o raio cresce
        if (bolt.progress < 1 && bolt.progress > 0.1 && Math.random() < 0.15) {
          const idx = Math.min(
            Math.floor(bolt.progress * (bolt.tree.points.length - 1)),
            bolt.tree.points.length - 1
          );
          const tip = bolt.tree.points[idx];
          if (tip) spawnSparks(tip.x, tip.y, 2 + Math.floor(Math.random() * 3));
        }

        drawBranch(
          bolt.tree,
          Math.min(bolt.progress, 1),
          bolt.fadeOut,
          bolt.flash,
          bolt.intensity,
          Math.min(bolt.progress, 1)
        );
      }

      // ── Update & draw sparks ─────────────────────────────────────
      sparksRef.current = sparksRef.current.filter(s => s.life > 0);
      for (const s of sparksRef.current) {
        s.life -= dt / s.maxLife;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.vy += 30 * dt; // Gravidade leve

        const a = Math.max(0, s.life);

        // Glow da spark
        ctx.save();
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = "#8B0000";
        ctx.shadowColor = "#8B0000";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Core da spark
        ctx.save();
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = "#1a0000";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * a * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    };

    // Spawn inicial
    const initCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < initCount; i++) {
      spawnBolt(window.innerWidth, window.innerHeight);
    }
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mounted, spawnBolt]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
