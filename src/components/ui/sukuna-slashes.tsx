"use client";

import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── Sukuna Dismantle Slash Effect ───────────────────────────────────────────
// Inspired by Sukuna's "Dismantle" cuts from Jujutsu Kaisen — Mahoraga fight.
// Creates random slash lines across the entire viewport with crimson energy
// at low opacity so it's visible but doesn't interfere with content.

const SLASH_COUNT = 18;
const RESPAWN_INTERVAL = 2.5; // seconds between new slash waves

interface SlashData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  opacity: number;
  speed: number;
  progress: number;
  alive: boolean;
  delay: number;
  fadeOut: number;
  type: "dismantle" | "cleave" | "thin";
}

function createSlash(viewport: { width: number; height: number }): SlashData {
  const hw = viewport.width / 2;
  const hh = viewport.height / 2;
  const type = Math.random() > 0.7 ? "cleave" : Math.random() > 0.4 ? "dismantle" : "thin";

  // Random angle for the slash direction
  const angle = (Math.random() - 0.5) * Math.PI * 0.8 + (Math.random() > 0.5 ? 0 : Math.PI / 2);
  const length = 1.5 + Math.random() * 4;

  const cx = (Math.random() - 0.5) * viewport.width * 1.2;
  const cy = (Math.random() - 0.5) * viewport.height * 1.2;

  return {
    startX: cx - Math.cos(angle) * length,
    startY: cy - Math.sin(angle) * length,
    endX: cx + Math.cos(angle) * length,
    endY: cy + Math.sin(angle) * length,
    width: type === "cleave" ? 0.04 : type === "dismantle" ? 0.02 : 0.008,
    opacity: type === "cleave" ? 0.12 : type === "dismantle" ? 0.08 : 0.05,
    speed: 0.8 + Math.random() * 1.5,
    progress: 0,
    alive: true,
    delay: Math.random() * 1.5,
    fadeOut: 0,
    type,
  };
}

// Generates the trail-like geometry for each slash
function buildSlashGeometry(slash: SlashData): Float32Array {
  const p = Math.min(slash.progress, 1);
  const fade = 1 - slash.fadeOut;

  const sx = slash.startX;
  const sy = slash.startY;
  const ex = slash.startX + (slash.endX - slash.startX) * p;
  const ey = slash.startY + (slash.endY - slash.startY) * p;

  // Perpendicular offset for width
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const nx = (-dy / len) * slash.width * fade;
  const ny = (dx / len) * slash.width * fade;

  // Two triangles forming a quad
  return new Float32Array([
    sx + nx, sy + ny, 0,
    sx - nx, sy - ny, 0,
    ex + nx, ey + ny, 0,
    ex + nx, ey + ny, 0,
    sx - nx, sy - ny, 0,
    ex - nx, ey - ny, 0,
  ]);
}

function Slashes() {
  const { viewport } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const slashesRef = useRef<SlashData[]>([]);
  const timerRef = useRef(0);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  // Initial positions buffer (will be updated every frame)
  const maxVerts = SLASH_COUNT * 6; // 6 verts per slash (2 triangles)
  const positions = useMemo(() => new Float32Array(maxVerts * 3), []);
  const colors = useMemo(() => new Float32Array(maxVerts * 4), []);

  const spawnWave = useCallback(() => {
    const count = 3 + Math.floor(Math.random() * 4); // 3-6 slashes per wave
    for (let i = 0; i < count; i++) {
      // Find a dead slot or push new
      const deadIdx = slashesRef.current.findIndex(s => !s.alive);
      const slash = createSlash(viewport);
      if (deadIdx >= 0 && deadIdx < SLASH_COUNT) {
        slashesRef.current[deadIdx] = slash;
      } else if (slashesRef.current.length < SLASH_COUNT) {
        slashesRef.current.push(slash);
      }
    }
  }, [viewport]);

  useFrame((_, delta) => {
    if (!geoRef.current) return;

    timerRef.current += delta;
    if (timerRef.current >= RESPAWN_INTERVAL) {
      timerRef.current = 0;
      spawnWave();
    }

    // Update slash states
    let vertIdx = 0;
    for (let i = 0; i < slashesRef.current.length; i++) {
      const s = slashesRef.current[i];
      if (!s.alive) continue;

      if (s.delay > 0) {
        s.delay -= delta;
        continue;
      }

      s.progress += delta * s.speed;

      if (s.progress >= 1) {
        s.fadeOut += delta * 2.5;
        if (s.fadeOut >= 1) {
          s.alive = false;
          continue;
        }
      }

      if (vertIdx + 6 > maxVerts) break;

      const verts = buildSlashGeometry(s);
      const fade = 1 - s.fadeOut;
      const reveal = Math.min(s.progress * 3, 1); // quick reveal
      const alpha = s.opacity * fade * reveal;

      // Crimson base color with slight variation
      const r = s.type === "cleave" ? 0.85 : 0.77;
      const g = s.type === "cleave" ? 0.07 : 0.05;
      const b = s.type === "cleave" ? 0.15 : 0.12;

      for (let v = 0; v < 6; v++) {
        positions[(vertIdx + v) * 3] = verts[v * 3];
        positions[(vertIdx + v) * 3 + 1] = verts[v * 3 + 1];
        positions[(vertIdx + v) * 3 + 2] = verts[v * 3 + 2];
        colors[(vertIdx + v) * 4] = r;
        colors[(vertIdx + v) * 4 + 1] = g;
        colors[(vertIdx + v) * 4 + 2] = b;
        colors[(vertIdx + v) * 4 + 3] = alpha;
      }
      vertIdx += 6;
    }

    // Zero out remaining verts
    for (let i = vertIdx * 3; i < positions.length; i++) positions[i] = 0;
    for (let i = vertIdx * 4; i < colors.length; i++) colors[i] = 0;

    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const colAttr = geoRef.current.attributes.color as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geoRef.current.setDrawRange(0, vertIdx);
  });

  return (
    <mesh ref={meshRef}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 4]} />
      </bufferGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Slash afterglow particles (debris from cuts) ────────────────────────────

function SlashParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 80;

  const { positions, velocities, lifetimes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = (Math.random() - 0.5) * 0.03;
      vel[i * 3 + 1] = -0.005 - Math.random() * 0.02; // drift down
      vel[i * 3 + 2] = 0;
      life[i] = Math.random();
    }
    return { positions: pos, velocities: vel, lifetimes: life };
  }, []);

  const circleTexture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const arr = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      lifetimes[i] -= 0.003;
      if (lifetimes[i] <= 0) {
        // Respawn
        arr[i * 3] = (Math.random() - 0.5) * 12;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
        lifetimes[i] = 0.5 + Math.random() * 0.5;
        continue;
      }
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#C41230"
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={circleTexture}
        alphaMap={circleTexture}
      />
    </points>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function SukunaSlashes() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Slashes />
        <SlashParticles />
      </Canvas>
    </div>
  );
}
