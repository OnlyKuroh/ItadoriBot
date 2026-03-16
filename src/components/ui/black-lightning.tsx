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
  startTrim: number;
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
  rotation: number;
  whiteHot: boolean;
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
const INNER_WHITE = "rgba(255,255,255,0.46)";
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

function tracePath(ctx: CanvasRenderingContext2D, points: Point[], close = false) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    ctx.lineTo(point.x, point.y);
  }

  if (close) ctx.closePath();
}

function createOrganicSpine(start: Point, target: Point, chaos = 1) {
  const totalDist = distance(start, target);
  const segments = Math.max(10, Math.min(26, Math.floor(totalDist / 42)));
  const points: Point[] = [start];
  const sideBias = rand(-0.07, 0.07);

  let current = { ...start };
  let heading = angleBetween(start, target);
  let angularVelocity = rand(-0.16, 0.16) * chaos;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const targetAngle = angleBetween(current, target);
    const kink = i % 2 === 0 ? rand(-0.1, 0.1) * chaos : 0;
    angularVelocity = angularVelocity * 0.42 + rand(-0.3, 0.3) * (1 - t * 0.38) * chaos;
    heading = lerpAngle(heading, targetAngle, 0.3 + t * 0.18);
    heading += angularVelocity + kink + sideBias * (1 - t) * 0.24;

    const step = (totalDist / segments) * rand(0.78, 1.14);
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

  let left = rand(0.82, 1.02);
  let right = rand(0.78, 0.98);
  let innerOffset = rand(-0.08, 0.08);
  let innerWidth = rand(0.035, 0.075);

  for (let i = 0; i < length; i++) {
    const t = i / Math.max(1, length - 1);

    left = clamp(left + rand(-0.06, 0.06), 0.72, 1.08);
    right = clamp(right + rand(-0.06, 0.06), 0.68, 1.04);
    innerOffset = clamp(innerOffset + rand(-0.02, 0.02), -0.14, 0.14);
    innerWidth = clamp(innerWidth + rand(-0.01, 0.01), 0.025, 0.09);

    const chunk = 1 + Math.sin(t * Math.PI * rand(1.6, 2.6)) * rand(0.015, 0.05);

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

  const startStep = (branch.points.length - 1) * branch.startTrim;
  const endStep = (branch.points.length - 1) * clamped;
  if (endStep <= startStep) return null;

  const startIndex = Math.floor(startStep);
  const startFrac = startStep - startIndex;
  const endIndex = Math.floor(endStep);
  const endFrac = endStep - endIndex;
  const visiblePoints: Point[] = [];
  const visibleProfile: BranchProfileNode[] = [];

  const startFrom = branch.points[startIndex];
  const startTo = branch.points[Math.min(startIndex + 1, branch.points.length - 1)];
  const startProfileFrom = branch.profile[startIndex];
  const startProfileTo = branch.profile[Math.min(startIndex + 1, branch.profile.length - 1)];

  visiblePoints.push({
    x: lerp(startFrom.x, startTo.x, startFrac),
    y: lerp(startFrom.y, startTo.y, startFrac),
  });

  visibleProfile.push({
    leftScale: lerp(startProfileFrom.leftScale, startProfileTo.leftScale, startFrac),
    rightScale: lerp(startProfileFrom.rightScale, startProfileTo.rightScale, startFrac),
    innerOffset: lerp(startProfileFrom.innerOffset, startProfileTo.innerOffset, startFrac),
    innerWidth: lerp(startProfileFrom.innerWidth, startProfileTo.innerWidth, startFrac),
  });

  for (let i = startIndex + 1; i <= Math.min(endIndex, branch.points.length - 1); i++) {
    visiblePoints.push(branch.points[i]);
    visibleProfile.push(branch.profile[i]);
  }

  if (endFrac > 0 && endIndex + 1 < branch.points.length) {
    const endFrom = branch.points[endIndex];
    const endTo = branch.points[endIndex + 1];
    const endProfileFrom = branch.profile[endIndex];
    const endProfileTo = branch.profile[endIndex + 1];

    visiblePoints.push({
      x: lerp(endFrom.x, endTo.x, endFrac),
      y: lerp(endFrom.y, endTo.y, endFrac),
    });

    visibleProfile.push({
      leftScale: lerp(endProfileFrom.leftScale, endProfileTo.leftScale, endFrac),
      rightScale: lerp(endProfileFrom.rightScale, endProfileTo.rightScale, endFrac),
      innerOffset: lerp(endProfileFrom.innerOffset, endProfileTo.innerOffset, endFrac),
      innerWidth: lerp(endProfileFrom.innerWidth, endProfileTo.innerWidth, endFrac),
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
    const radius = rand(14, 88);
    return {
      x: impact.x + Math.cos(angle) * radius,
      y: impact.y + Math.sin(angle) * radius * rand(0.4, 0.92),
      rx: rand(3, 10),
      ry: rand(1.4, 5.2),
      rotation: rand(0, Math.PI * 2),
      alpha: rand(0.14, 0.34),
    };
  });
}

function createBranch(
  start: Point,
  target: Point,
  widthStart: number,
  widthEnd: number,
  depth: number,
  branchDelay: number,
  startTrim: number
): BoltBranch {
  const points = createOrganicSpine(start, target, depth === 0 ? 1.2 : 0.95);
  return {
    points,
    profile: createProfile(points.length),
    widthStart,
    widthEnd,
    depth,
    branchDelay,
    startTrim,
    highlight: depth <= 1 && Math.random() > 0.76,
    children: [],
  };
}

function addChildren(branch: BoltBranch, maxDepth: number, viewport: { w: number; h: number }) {
  if (branch.depth >= maxDepth) return;

  const points = branch.points;
  const childCount = branch.depth === 0 ? Math.floor(rand(1, 3)) : Math.floor(rand(0, 2));
  const sideBias = Math.random() > 0.5 ? 1 : -1;

  for (let i = 0; i < childCount; i++) {
    const t = rand(0.26, 0.82);
    const index = Math.max(1, Math.min(points.length - 2, Math.floor((points.length - 1) * t)));
    const origin = points[index];
    const next = points[index + 1];
    const tangent = angleBetween(origin, next);
    const side = Math.random() > 0.22 ? sideBias : -sideBias;
    const childAngle = tangent + side * rand(0.24, 0.52) + rand(-0.08, 0.08);
    const parentReach = distance(points[0], points[points.length - 1]);
    const length = parentReach * rand(0.14, 0.28) * (branch.depth === 0 ? 1 : 0.68);
    const target = {
      x: clamp(origin.x + Math.cos(childAngle) * length, -viewport.w * 0.08, viewport.w * 1.08),
      y: clamp(origin.y + Math.sin(childAngle) * length, -viewport.h * 0.08, viewport.h * 1.08),
    };

    const widthAtOrigin = lerp(branch.widthStart, branch.widthEnd, t);
    const child = createBranch(
      origin,
      target,
      widthAtOrigin * rand(0.22, 0.34),
      Math.max(0.32, widthAtOrigin * rand(0.025, 0.06)),
      branch.depth + 1,
      branch.branchDelay + rand(0.08, 0.18),
      rand(0.02, 0.06)
    );

    branch.children.push(child);
    addChildren(child, maxDepth, viewport);
  }
}

function createBurst(viewport: { w: number; h: number }): AnimBurst {
  const impact = {
    x: viewport.w * rand(0.46, 0.54),
    y: viewport.h * rand(0.58, 0.76),
  };

  const roots: BoltBranch[] = [];
  const rootCount = Math.floor(rand(5, 8));
  const rootSources = Array.from({ length: rootCount }, (_, index) => {
    const lane = index % 5;
    if (lane === 0 || lane === 1) {
      return {
        x: rand(-viewport.w * 0.06, viewport.w * 1.06),
        y: rand(-viewport.h * 0.34, -viewport.h * 0.12),
      };
    }
    if (lane === 2) {
      return {
        x: rand(-viewport.w * 0.28, -viewport.w * 0.1),
        y: rand(viewport.h * 0.04, viewport.h * 0.78),
      };
    }
    if (lane === 3) {
      return {
        x: rand(viewport.w * 1.1, viewport.w * 1.28),
        y: rand(viewport.h * 0.04, viewport.h * 0.78),
      };
    }
    return {
      x: rand(-viewport.w * 0.04, viewport.w * 1.04),
      y: rand(viewport.h * 1.1, viewport.h * 1.24),
    };
  });

  for (const source of rootSources) {
    const root = createBranch(
      source,
      impact,
      rand(4.6, 8.2),
      rand(0.42, 0.9),
      0,
      rand(0, 0.05),
      rand(0.12, 0.2)
    );

    addChildren(root, 2, viewport);
    roots.push(root);
  }

  return {
    impact,
    roots,
    inkBlots: createInkBlots(impact, Math.floor(rand(3, 7))),
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
  const radius = 5 + burst.flash * 18;

  ctx.save();
  ctx.globalAlpha = 0.14 * fade * burst.intensity;
  ctx.fillStyle = OUTER_GLOW;
  ctx.shadowColor = OUTER_GLOW;
  ctx.shadowBlur = 22 + burst.flash * 20;
  ctx.beginPath();
  ctx.arc(burst.impact.x, burst.impact.y, radius * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.88 * fade;
  ctx.fillStyle = SOLID_BLACK;
  ctx.beginPath();
  ctx.arc(burst.impact.x, burst.impact.y, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.16 * fade;
  ctx.strokeStyle = INNER_WHITE;
  ctx.lineWidth = 1;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.arc(burst.impact.x, burst.impact.y, radius * 0.22, 0.12, Math.PI * 1.42);
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
  ctx.globalAlpha = 0.6 * alpha;
  ctx.strokeStyle = OUTER_GLOW;
  ctx.lineWidth = 2.2 + glowBoost * 0.9;
  ctx.lineJoin = "miter";
  ctx.miterLimit = 3;
  ctx.shadowColor = OUTER_GLOW;
  ctx.shadowBlur = 18 + glowBoost * 14;
  tracePath(ctx, outline, true);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.97 * alpha;
  ctx.fillStyle = SOLID_BLACK;
  tracePath(ctx, outline, true);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.42 * alpha;
  ctx.strokeStyle = "#ff3030";
  ctx.lineWidth = 1.15;
  ctx.lineJoin = "miter";
  ctx.miterLimit = 3;
  ctx.shadowColor = OUTER_GLOW;
  ctx.shadowBlur = 8;
  tracePath(ctx, outline, true);
  ctx.stroke();
  ctx.restore();

  if (!branch.highlight || inner.length < 3) return;

  ctx.save();
  tracePath(ctx, outline, true);
  ctx.clip();
  ctx.globalAlpha = 0.18 * alpha;
  ctx.strokeStyle = INNER_WHITE;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 6;
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
        size: rand(1.2, 3.1),
        rotation: rand(0, Math.PI),
        whiteHot: Math.random() > 0.88,
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
        ctx.ellipse(ember.x, ember.y, ember.size, ember.size * 0.6, ember.rotation, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (ember.whiteHot) {
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
