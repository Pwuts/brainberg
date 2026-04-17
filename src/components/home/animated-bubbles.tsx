"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface BubbleItem {
  category: string;
  label: string;
  count: number;
  color: string;
}

interface Bubble extends BubbleItem {
  r: number;
  x: number;
  y: number;
  // Animation: each bubble drifts on its own orbit
  baseX: number;
  baseY: number;
  orbitR: number;
  orbitSpeed: number;
  orbitPhase: number;
}

/**
 * Pack bubbles in a ring around the center, leaving a clear zone
 * in the middle for the page title/search content.
 */
function packBubbles(items: BubbleItem[], w: number, h: number): Bubble[] {
  if (items.length === 0) return [];

  const maxCount = Math.max(...items.map((i) => i.count));
  const minR = w * 0.04;
  const maxR = w * 0.1;

  const sorted = [...items].sort((a, b) => b.count - a.count);

  const bubbles: Bubble[] = sorted.map((item) => {
    const ratio = maxCount > 0 ? item.count / maxCount : 0.5;
    const r = minR + (maxR - minR) * Math.sqrt(ratio);
    return {
      ...item,
      r,
      x: 0,
      y: 0,
      baseX: 0,
      baseY: 0,
      orbitR: 6 + Math.random() * 10,
      orbitSpeed: 0.0003 + Math.random() * 0.0005,
      orbitPhase: Math.random() * Math.PI * 2,
    };
  });

  const cx = w / 2;
  const cy = h / 2;
  // Clear zone in center for text content
  const clearZoneW = w * 0.32;
  const clearZoneH = h * 0.55;

  function overlapsCenter(x: number, y: number, r: number): boolean {
    // Check if circle overlaps the center rectangle
    const closestX = Math.max(cx - clearZoneW / 2, Math.min(x, cx + clearZoneW / 2));
    const closestY = Math.max(cy - clearZoneH / 2, Math.min(y, cy + clearZoneH / 2));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < (r + 8) * (r + 8);
  }

  function overlapsOthers(x: number, y: number, r: number, upTo: number): boolean {
    for (let j = 0; j < upTo; j++) {
      const dx = x - bubbles[j].x;
      const dy = y - bubbles[j].y;
      const minDist = r + bubbles[j].r + 6;
      if (dx * dx + dy * dy < minDist * minDist) return true;
    }
    return false;
  }

  // Place bubbles in a spiral, skipping the center zone
  for (let i = 0; i < bubbles.length; i++) {
    let placed = false;
    for (let angle = i * 0.7; angle < Math.PI * 40; angle += 0.1) {
      const dist = w * 0.15 + angle * w * 0.012;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist * (h / w); // squash for aspect ratio

      if (
        x - bubbles[i].r < 0 ||
        x + bubbles[i].r > w ||
        y - bubbles[i].r < 0 ||
        y + bubbles[i].r > h
      )
        continue;

      if (overlapsCenter(x, y, bubbles[i].r)) continue;
      if (overlapsOthers(x, y, bubbles[i].r, i)) continue;

      bubbles[i].x = x;
      bubbles[i].y = y;
      bubbles[i].baseX = x;
      bubbles[i].baseY = y;
      placed = true;
      break;
    }

    if (!placed) {
      // Fallback: corners
      const corners = [
        [w * 0.15, h * 0.2],
        [w * 0.85, h * 0.2],
        [w * 0.15, h * 0.8],
        [w * 0.85, h * 0.8],
      ];
      const [fx, fy] = corners[i % corners.length];
      bubbles[i].x = fx;
      bubbles[i].y = fy;
      bubbles[i].baseX = fx;
      bubbles[i].baseY = fy;
    }
  }

  return bubbles;
}

export function AnimatedBubbles({ items }: { items: BubbleItem[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);
  const animRef = useRef<number>(0);
  const bubblesRef = useRef<Bubble[]>([]);
  // Mutable positions for physics sim (avoid allocating new arrays each frame)
  const simPos = useRef<{ x: number; y: number }[]>([]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Repack when size or items change
  useEffect(() => {
    const packed = packBubbles(items, size.w, size.h);
    setBubbles(packed);
    bubblesRef.current = packed;
    simPos.current = packed.map((b) => ({ x: b.x, y: b.y }));
    setPositions(simPos.current.map((p) => ({ ...p })));
  }, [items, size]);

  // Animate with orbit + repulsion physics
  useEffect(() => {
    function tick(time: number) {
      const bs = bubblesRef.current;
      const pos = simPos.current;
      if (bs.length === 0 || pos.length !== bs.length) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      const n = bs.length;

      // 1. Compute orbital target for each bubble
      const targets = bs.map((b) => ({
        x: b.baseX + Math.cos(time * b.orbitSpeed + b.orbitPhase) * b.orbitR,
        y: b.baseY + Math.sin(time * b.orbitSpeed * 1.3 + b.orbitPhase) * b.orbitR * 0.7,
      }));

      // 2. Compute repulsion forces between overlapping/close pairs
      const fx = new Float64Array(n);
      const fy = new Float64Array(n);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = bs[i].r + bs[j].r;

          if (dist < minDist * 1.3) {
            // Repulsion strength: stronger as bubbles get closer
            const strength = (minDist / dist - 0.7) * 2;
            const ux = dx / dist;
            const uy = dy / dist;
            fx[i] += ux * strength;
            fy[i] += uy * strength;
            fx[j] -= ux * strength;
            fy[j] -= uy * strength;
          }
        }
      }

      // 3. Move towards orbital target + apply repulsion
      for (let i = 0; i < n; i++) {
        // Gently pull towards orbital target
        pos[i].x += (targets[i].x - pos[i].x) * 0.02 + fx[i];
        pos[i].y += (targets[i].y - pos[i].y) * 0.02 + fy[i];
      }

      setPositions(pos.map((p) => ({ x: p.x, y: p.y })));
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleClick = useCallback(
    (category: string) => {
      router.push(`/events?category=${category}`);
    },
    [router]
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg viewBox={`0 0 ${size.w} ${size.h}`} className="h-full w-full">
        {bubbles.map((b, i) => {
          const pos = positions[i] ?? { x: b.x, y: b.y };
          const fontSize = b.r > size.w * 0.08 ? 16 : b.r > size.w * 0.05 ? 13 : 10;
          const showCount = b.r > size.w * 0.045;
          return (
            <g
              key={b.category}
              onClick={() => handleClick(b.category)}
              className="cursor-pointer"
              role="link"
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={b.r}
                fill={b.color}
                opacity={0.12}
                stroke={b.color}
                strokeWidth={1.5}
                strokeOpacity={0.25}
                className="transition-opacity duration-200 hover:opacity-25"
              />
              <text
                x={pos.x}
                y={pos.y - (showCount ? fontSize * 1.1 : 0)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={b.color}
                fontSize={fontSize}
                fontWeight={600}
                className="pointer-events-none select-none"
              >
                {b.r > size.w * 0.05 ? b.label : b.label.split(/[\/&]/)[0].trim()}
              </text>
              {showCount && (
                <text
                  x={pos.x}
                  y={pos.y + fontSize * 1.4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={b.color}
                  fontSize={fontSize * 1.6}
                  fontWeight={700}
                  opacity={0.7}
                  className="pointer-events-none select-none"
                >
                  {b.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
