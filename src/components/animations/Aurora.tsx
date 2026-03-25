"use client";

import { useEffect, useRef } from 'react';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
}

export default function Aurora({
  colorStops = ["#500b1a", "#950e24", "#0f0714"],
  amplitude = 1.2
}: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let time = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < 3; i++) {
        const xOffset = Math.sin(time * 0.5 + i) * width * 0.4;
        const yOffset = Math.cos(time * 0.3 + i) * height * 0.4;
        const size = Math.min(width, height) * amplitude;
        
        const gradient = ctx.createRadialGradient(
          width / 2 + xOffset, height / 2 + yOffset, 0,
          width / 2 + xOffset, height / 2 + yOffset, size
        );

        gradient.addColorStop(0, colorStops[i]);
        gradient.addColorStop(0.5, colorStops[(i + 1) % colorStops.length] + '80');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      
      time += 0.005;
      requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [colorStops, amplitude]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-40 blur-[80px]"
      />
    </div>
  );
}
