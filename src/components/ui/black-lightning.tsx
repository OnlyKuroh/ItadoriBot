"use client";

import { useCallback, useEffect, useRef } from "react";

type Point = { x: number; y: number };

interface BranchProfileNode {
  leftScale: number;
  rightScale: number;
  innerOffset: number;
  innerWidth: number;
}

interface BoltBranch {
  points: Point[];
  profile: BranchProfileNode[];
  widthStart: number;
  widthEnd: number;
  depth: number;
  branchDelay: number;
  highlight: boolean;
  children: BoltBranch[];
}

interface InkBlot {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  alpha: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface AnimBurst {
  impact: Point;
  roots: BoltBranch[];
  inkBlots: InkBlot[];
  progress: number;
  fadeOut: number;
  delay: number;
  speed: number;
  intensity: number;
  flash: number;
  alive: boolean;
}

type VisibleBranch = Pick<BoltBranch, "points" | "profile" | "widthStart" | "widthEnd" | "highlight">;

const OUTER_GLOW = "#ff1414";
const SOLID_BLACK = "#020202";
const INNER_WHITE = "rgba(255,255,255,0.78)";
const ROOT_SPAWN_INTERVAL = 2.6;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleBetween(a: Point, b: Point) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function lerpAngle(a: number, b: number, t: number) {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function smoothPath(ctx: CanvasRenderingContext2D, points: Point[], close = false) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  if (close) ctx.closePath();
}

function createOrganicSpine(start: Point, target: Point, chaos = 1) {
  const totalDist = distance(start, target);
  const segments = Math.max(9, Math.min(24, Math.floor(totalDist / 48)));
  const points: Point[] = [start];
  const sideBias = rand(-0.18, 0.18);

  let current = { ...start };
  let heading = angleBetween(start, target);
  let angularVelocity = rand(-0.22, 0.22) * chaos;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const targetAngle = angleBetween(current, target);
    angularVelocity = angularVelocity * 0.64 + rand(-0.24, 0.24) * (1 - t * 0.45) * chaos;
    heading = lerpAngle(heading, targetAngle, 0.16 + t * 0.16);
    heading += angularVelocity + sideBias * (1 - t) * 0.45;

    const step = (totalDist / segments) * rand(0.8, 1.18) * (1 + (1 - t) * 0.12);
    current = {
      x: current.x + Math.cos(heading) * step,
      y: current.y + Math.sin(heading) * step,
    };

    points.push(current);
  }

  points.push(target);
  return points;
}

function createProfile(length: number) {
  const profile: BranchProfileNode[] = [];

  let left = rand(0.9, 1.3);
  let right = rand(0.72, 1.05);
  let innerOffset = rand(-0.16, 0.18);
  let innerWidth = rand(0.06, 0.12);

  for (let i = 0; i < length; i++) {
    const t = i / Math.max(1, length - 1);

    left = clamp(left + rand(-0.11, 0.11), 0.72, 1.45);
    right = clamp(right + rand(-0.1, 0.1), 0.58, 1.16);
    innerOffset = clamp(innerOffset + rand(-0.045, 0.045), -0.24, 0.24);
    innerWidth = clamp(innerWidth + rand(-0.018, 0.018), 0.04, 0.14);

    const chunk = 1 + Math.sin(t * Math.PI * rand(1.4, 2.2)) * rand(0.05, 0.12);

    profile.push({
      leftScale: left * chunk,
      rightScale: right * (2 - chunk),
      innerOffset,
      innerWidth,
    });
  }

  return profile;
}

function buildRibbon(
  points: Point[],
  profile: BranchProfileNode[],
  widthStart: number,
  widthEnd: number
) {
  const left: Point[] = [];
  const right: Point[] = [];
  const inner: Array<Point & { width: number }> = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = i / Math.max(1, points.length - 1);
    const taper = easeOutCubic(t);
    const baseWidth = lerp(widthStart, widthEnd, taper);
    const node = profile[Math.min(i, profile.length - 1)];
    const leftW = Math.max(0.8, baseWidth * node.leftScale);
    const rightW = Math.max(0.8, baseWidth * node.rightScale);
    const innerOffset = baseWidth * node.innerOffset;

    left.push({ x: point.x + nx * leftW, y: point.y + ny * leftW });
    right.push({ x: point.x - nx * rightW, y: point.y - ny * rightW });
    inner.push({
      x: point.x + nx * innerOffset,
      y: point.y + ny * innerOffset,
      width: Math.max(0.75, baseWidth * node.innerWidth),
    });
  }

  return {
    outline: [...left, ...right.reverse()],
    inner,
  };
}

function buildVisibleBranch(branch: BoltBranch, progress: number): VisibleBranch | null {
  const clamped = clamp(progress, 0, 1);
  if (clamped <= 0) return null;

  const steps = (branch.points.length - 1) * clamped;
  const full = Math.floor(steps);
  const frac = steps - full;

  const visiblePoints = branch.points.slice(0, Math.max(1, full + 1));
  const visibleProfile = branch.profile.slice(0, Math.max(1, full + 1));

  if (frac > 0 && full + 1 < branch.points.length) {
    const from = branch.points[full];
    const to = branch.points[full + 1];
    const profileFrom = branch.profile[full];
    const profileTo = branch.profile[full + 1];

    visiblePoints.push({
      x: lerp(from.x, to.x, frac),
      y: lerp(from.y, to.y, frac),
    });

    visibleProfile.push({
      leftScale: lerp(profileFrom.leftScale, profileTo.leftScale, frac),
      rightScale: lerp(profileFrom.rightScale, profileTo.rightScale, frac),
      innerOffset: lerp(profileFrom.innerOffset, profileTo.innerOffset, frac),
      innerWidth: lerp(profileFrom.innerWidth, profileTo.innerWidth, frac),
    });
  }

  if (visiblePoints.length < 2) return null;

  return {
    points: visiblePoints,
    profile: visibleProfile,
    widthStart: branch.widthStart,
    widthEnd: branch.widthEnd,
    highlight: branch.highlight,
  };
}

function createInkBlots(impact: Point, count: number) {
  return Array.from({ length: count }, () => {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(22, 180);
    return {
      x: impact.x + Math.cos(angle) * radius,
      y: impact.y + Math.sin(angle) * radius * rand(0.45, 1.2),
      rx: rand(6, 18),
      ry: rand(2.5, 9),
      rotation: rand(0, Math.PI * 2),
      alpha: rand(0.18, 0.55),
    };
  });
}

function createBranch(
  start: Point,
  target: Point,
  widthStart: number,
  widthEnd: number,
  depth: number,
  branchDelay: number
): BoltBranch {
  const points = createOrganicSpine(start, target, depth === 0 ? 1.2 : 0.95);
  return {
    points,
    profile: createProfile(points.length),
    widthStart,
    widthEnd,
    depth,
    branchDelay,
    highlight: depth <= 1 && Math.random() > 0.42,
    children: [],
  };
}

function addChildren(branch: BoltBranch, maxDepth: number, viewport: { w: number; h: number }) {
  if (branch.depth >= maxDepth) return;

  const points = branch.points;
  const childCount = branch.depth === 0 ? Math.floor(rand(2, 5)) : Math.floor(rand(1, 3));
  const sideBias = Math.random() > 0.5 ? 1 : -1;

  for (let i = 0; i < childCount; i++) {
    const t = rand(0.18, 0.68);
    const index = Math.max(1, Math.min(points.length - 2, Math.floor((points.length - 1) * t)));
    const origin = points[index];
    const next = points[index + 1];
    const tangent = angleBetween(origin, next);
    const side = Math.random() > 0.22 ? sideBias : -sideBias;
    const childAngle = tangent + side * rand(0.48, 1.08) + rand(-0.16, 0.16);
    const parentReach = distance(points[0], points[points.length - 1]);
    const length = parentReach * rand(0.26, 0.52) * (branch.depth === 0 ? 1 : 0.72);
    const target = {
      x: clamp(origin.x + Math.cos(childAngle) * length, -viewport.w * 0.08, viewport.w * 1.08),
      y: clamp(origin.y + Math.sin(childAngle) * length, -viewport.h * 0.08, viewport.h * 1.08),
    };

    const widthAtOrigin = lerp(branch.widthStart, branch.widthEnd, t);
    const child = createBranch(
      origin,
      target,
      widthAtOrigin * rand(0.42, 0.62),
      Math.max(0.7, widthAtOrigin * rand(0.05, 0.14)),
      branch.depth + 1,
      branch.branchDelay + rand(0.08, 0.18)
    );

    branch.children.push(child);
    addChildren(child, maxDepth, viewport);
  }
}

function createBurst(viewport: { w: number; h: number }): AnimBurst {
  const impact = {
    x: viewport.w * rand(0.32, 0.68),
    y: viewport.h * rand(0.5, 0.8),
  };

  const roots: BoltBranch[] = [];
  const rootCount = Math.floor(rand(4, 7));
  const rootTargets = Array.from({ length: rootCount }, (_, index) => {
    const side = index % 3;
    if (side === 0) {
      return { x: rand(-viewport.w * 0.02, viewport.w * 1.02), y: rand(-viewport.h * 0.12, viewport.h * 0.22) };
    }
    if (side === 1) {
      return { x: rand(-viewport.w * 0.14, viewport.w * 0.12), y: rand(viewport.h * 0.06, viewport.h * 0.92) };
    }
    return { x: rand(viewport.w * 0.88, viewport.w * 1.14), y: rand(viewport.h * 0.02, viewport.h * 0.94) };
  });

  for (const target of rootTargets) {
    const root = createBranch(
      impact,
      target,
      rand(13, 26),
      rand(0.8, 1.6),
      0,
      rand(0, 0.05)
    );

    addChildren(root, 2, viewport);
    roots.push(root);
  }

  return {
    impact,
    roots,
    inkBlots: createInkBlots(impact, Math.floor(rand(16, 28))),
    progress: 0,
    fadeOut: 0,
    delay: rand(0, 0.2),
    speed: rand(2.4, 3.4),
    intensity: rand(0.85, 1.2),
    flash: 0,
    alive: true,
  };
}

function drawInkBlots(ctx: CanvasRenderingContext2D, burst: AnimBurst, fade: number) {
  for (const blot of burst.inkBlots) {
    ctx.save();
    ctx.globalAlpha = blot.alpha * fade;
    ctx.shadowColor = OUTER_GLOW;
    ctx.shadowBlur = 16;
    ctx.fillStyle = SOLID_BLACK;
    ctx.translate(blot.x, blot.y);
    ctx.rotate(blot.rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, blot.rx, blot.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawImpactCore(ctx: CanvasRenderingContext2D, burst: AnimBurst, fade: number) {
  const radius = 18 + burst.flash * 34;

  ctx.save();
  ctx.globalAlpha = 0.22 * fade * burst.intensity;
  ctx.fillStyle = OUTER_GLOW;
  ctx.shadowColor = OUTER_GLOW;
  ctx.shadowBlur = 42 + burst.flash * 32;
  ctx.beginPath();
  ctx.arc(burst.impact.x, burst.impact.y, radius * 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.98 * fade;
  ctx.fillStyle = SOLID_BLACK;
  ctx.beginPath();
  ctx.arc(burst.impact.x, burst.impact.y, radius * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.24 * fade;
  ctx.strokeStyle = INNER_WHITE;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(burst.impact.x, burst.impact.y, radius * 0.34, 0.12, Math.PI * 1.42);
  ctx.stroke();
  ctx.restore();
}

function drawBranchSilhouette(
  ctx: CanvasRenderingContext2D,
  branch: VisibleBranch,
  alpha: number,
  glowBoost: number
) {
  const { outline, inner } = buildRibbon(branch.points, branch.profile, branch.widthStart, branch.widthEnd);
  if (outline.length < 4) return;

  ctx.save();
  ctx.globalAlpha = 0.78 * alpha;
  ctx.shadowColor = OUTER_GLOW;
  ctx.shadowBlur = 24 + glowBoost * 18;
  ctx.fillStyle = SOLID_BLACK;
  smoothPath(ctx, outline, true);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.97 * alpha;
  ctx.fillStyle = SOLID_BLACK;
  smoothPath(ctx, outline, true);
  ctx.fill();
  ctx.restore();

  if (!branch.highlight || inner.length < 3) return;

  ctx.save();
  smoothPath(ctx, outline, true);
  ctx.clip();
  ctx.globalAlpha = 0.48 * alpha;
  ctx.strokeStyle = INNER_WHITE;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(inner[0].x, inner[0].y);
  for (let i = 1; i < inner.length - 1; i++) {
    const current = inner[i];
    const next = inner[i + 1];
    ctx.lineWidth = inner[i].width;
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  const last = inner[inner.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

function drawBranchTree(
  ctx: CanvasRenderingContext2D,
  branch: BoltBranch,
  burstProgress: number,
  fade: number,
  flash: number,
  intensity: number
) {
  const local = clamp((burstProgress - branch.branchDelay) / (1 - branch.branchDelay), 0, 1);
  if (local <= 0) return;

  const visible = buildVisibleBranch(branch, local);
  if (!visible) return;

  const depthFade = Math.pow(0.84, branch.depth);
  const alpha = fade * intensity * depthFade * Math.min(1, local * 2.6);

  drawBranchSilhouette(ctx, visible, alpha, flash);

  for (const child of branch.children) {
    drawBranchTree(ctx, child, burstProgress, fade, flash, intensity);
  }
}

export function BlackLightning() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstsRef = useRef<AnimBurst[]>([]);
  const embersRef = useRef<Ember[]>([]);
  const lastTimeRef = useRef(0);
  const timerRef = useRef(0);

  const spawnEmbers = useCallback((x: number, y: number, amount: number) => {
    for (let i = 0; i < amount; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(18, 85);
      embersRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: rand(0.28, 0.62),
        size: rand(1.8, 5.4),
      });
    }
  }, []);

  const spawnBurst = useCallback((w: number, h: number) => {
    const burst = createBurst({ w, h });
    burstsRef.current.push(burst);
    spawnEmbers(burst.impact.x, burst.impact.y, Math.floor(rand(10, 18)));
  }, [spawnEmbers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 2; i++) {
      spawnBurst(window.innerWidth, window.innerHeight);
    }

    const animate = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000 || 0, 0.05);
      lastTimeRef.current = time;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      timerRef.current += dt;
      if (timerRef.current >= ROOT_SPAWN_INTERVAL) {
        timerRef.current = 0;
        spawnBurst(w, h);
      }

      burstsRef.current = burstsRef.current.filter((burst) => burst.alive);

      for (const burst of burstsRef.current) {
        if (burst.delay > 0) {
          burst.delay -= dt;
          continue;
        }

        const previous = burst.progress;
        burst.progress += dt * burst.speed;

        if (previous < 1 && burst.progress >= 1) {
          burst.flash = 1;
          spawnEmbers(burst.impact.x, burst.impact.y, Math.floor(rand(8, 16)));
        }

        if (burst.progress >= 1) {
          burst.fadeOut += dt * 0.72;
          if (burst.fadeOut >= 1) {
            burst.alive = false;
            continue;
          }
        }

        if (burst.flash > 0) {
          burst.flash = Math.max(0, burst.flash - dt * 2.6);
        }

        const fade = 1 - burst.fadeOut;
        drawInkBlots(ctx, burst, fade);
        drawImpactCore(ctx, burst, fade);

        for (const root of burst.roots) {
          drawBranchTree(
            ctx,
            root,
            Math.min(burst.progress, 1),
            fade,
            burst.flash,
            burst.intensity
          );
        }
      }

      embersRef.current = embersRef.current.filter((ember) => ember.life > 0);

      for (const ember of embersRef.current) {
        ember.life -= dt / ember.maxLife;
        ember.x += ember.vx * dt;
        ember.y += ember.vy * dt;
        ember.vx *= 0.92;
        ember.vy *= 0.92;
        ember.vy += 24 * dt;

        const alpha = Math.max(0, ember.life);

        ctx.save();
        ctx.globalAlpha = 0.34 * alpha;
        ctx.shadowColor = OUTER_GLOW;
        ctx.shadowBlur = 14;
        ctx.fillStyle = SOLID_BLACK;
        ctx.beginPath();
        ctx.ellipse(ember.x, ember.y, ember.size, ember.size * 0.6, rand(0, Math.PI), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (Math.random() > 0.68) {
          ctx.save();
          ctx.globalAlpha = 0.18 * alpha;
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ember.x, ember.y, ember.size * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [spawnBurst, spawnEmbers]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
