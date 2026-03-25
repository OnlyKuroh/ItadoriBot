"use client";

import { useEffect, useRef } from "react";

interface InteractiveGridProps {
  className?: string;
}

export default function InteractiveGrid({ className }: InteractiveGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const CELL = 40;
    const GAP = 3;
    const RADIUS = 180;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.scale(dpr, dpr);
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function onMouseLeave() {
      mouseRef.current = { x: -1000, y: -1000 };
    }

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const cols = Math.ceil(w / CELL);
      const rows = Math.ceil(h / CELL);
      const size = CELL - GAP;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * CELL + GAP / 2;
          const y = row * CELL + GAP / 2;
          const cx = x + size / 2;
          const cy = y + size / 2;

          const dist = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);
          const intensity = Math.max(0, 1 - dist / RADIUS);

          const baseAlpha = 0.04;
          const hoverAlpha = intensity * 0.35;
          const alpha = baseAlpha + hoverAlpha;

          // Crimson glow
          const r = 196;
          const g = 18 + intensity * 20;
          const b = 48 + intensity * 10;

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.beginPath();
          ctx.roundRect(x, y, size, size, 3);
          ctx.fill();

          if (intensity > 0.4) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(196, 18, 48, ${intensity * 0.3})`;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity * 0.05})`;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className || ""}`}
      style={{ opacity: 0.7 }}
    />
  );
}
