'use client';

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/*
 * Adapted from the supplied kinetic-grid.tsx. Three deliberate departures from
 * the original, all documented where they occur:
 *   1. Colour is a prop, not a hardcoded blue/black pair, so the canvas obeys
 *      the page's single-accent lock (see ACCENTS below).
 *   2. The canvas sizes to its container, not window.innerWidth, so it can be
 *      scoped to the hero instead of swallowing the whole document.
 *   3. The render loop is gated on visibility, device pixel ratio, and
 *      prefers-reduced-motion. See the loop effect at the bottom.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

type RGB = { r: number; g: number; b: number };
type RGBA = RGB & { a: number };

interface Accent {
  line: RGBA;
  node: RGBA;
  glow: string;
  ripple: string;
}

export interface KineticGridProps {
  children?: ReactNode;
  className?: string;
  /** Applied to the host element. Use this for z-index and positioning. */
  style?: CSSProperties;
  /**
   * 'lime'   the page accent (default)
   * 'mono'   pure white, no hue
   */
  accent?: 'lime' | 'mono';
  /** Fill painted under the grid. 'transparent' lets the page canvas show. */
  background?: string;
  /** Paint the static dot texture. Turn off for very large canvases. */
  showDots?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 55;
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const DOT_SPACING = 28;
const LERP_SPEED = 0.08;

const LINE_BASE: RGBA = { r: 232, g: 235, b: 230, a: 0.13 };
const NODE_BASE: RGBA = { r: 232, g: 235, b: 230, a: 0.2 };
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;

/** Departure 1: the accent is data, not a literal. 159,232,112 is #9fe870. */
const ACCENTS: Record<'lime' | 'mono', Accent> = {
  lime: {
    line: { r: 159, g: 232, b: 112, a: 0.55 },
    node: { r: 159, g: 232, b: 112, a: 1 },
    glow: '159,232,112',
    ripple: '159,232,112',
  },
  mono: {
    line: { r: 255, g: 255, b: 255, a: 0.9 },
    node: { r: 255, g: 255, b: 255, a: 1 },
    glow: '255,255,255',
    ripple: '255,255,255',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function lerpColor(base: RGBA, active: RGBA, t: number): string {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KineticGrid({
  children,
  className,
  style,
  accent = 'lime',
  background = 'transparent',
  showDots = true,
}: KineticGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const lastMoveRef = useRef(0);

  // ── Warp ────────────────────────────────────────────────────────────────────

  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
    ): { pt: Point; proximity: number } => {
      // Edge pin. Smoothly locks boundary rows and columns in place.
      const edgeMargin = 1.5;
      const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
      const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

      let rx = 0;
      let ry = 0;
      for (const r of ripples) {
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
        }
      }

      // Cursor warp with bell falloff.
      if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor;
        const angle = Math.atan2(dy, dx);
        return {
          pt: {
            x: gx - Math.cos(angle) * warpAmt + rx,
            y: gy - Math.sin(angle) * warpAmt + ry,
          },
          proximity,
        };
      }

      return { pt: { x: gx + rx, y: gy + ry }, proximity };
    },
    [],
  );

  // ── Draw ────────────────────────────────────────────────────────────────────

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { w: W, h: H } = sizeRef.current;
      if (W === 0 || H === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;
      const theme = ACCENTS[accent];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (background !== 'transparent') {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, W, H);
      }

      if (showDots) {
        ctx.fillStyle = 'rgba(232,235,230,0.05)';
        for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
          for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);

      const pts: Point[][] = [];
      const prox: number[][] = [];

      for (let row = 0; row < rows; row++) {
        pts[row] = [];
        prox[row] = [];
        for (let col = 0; col < cols; col++) {
          const { pt, proximity } = getWarpedPoint(
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
          );
          pts[row][col] = pt;
          prox[row][col] = proximity;
        }
      }

      const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
        const avg = (pr1 + pr2) / 2;
        const t = smoothstep(avg);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = lerpColor(LINE_BASE, theme.line, t);
        ctx.lineWidth = lerpN(0.8, 1.5, t);
        ctx.stroke();
      };

      ctx.lineCap = 'butt';

      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols - 1; col++)
          drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);

      for (let col = 0; col < cols; col++)
        for (let row = 0; row < rows - 1; row++)
          drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const p = pts[row][col];
          const t = smoothstep(prox[row][col]);
          const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

          if (t > 0.3) {
            const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
            grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3).toFixed(3)})`);
            grd.addColorStop(1, `rgba(${theme.glow},0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = lerpColor(NODE_BASE, theme.node, t);
          ctx.fill();
        }
      }

      for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    [accent, background, getWarpedPoint, showDots],
  );

  // ── Loop ────────────────────────────────────────────────────────────────────
  //
  // Department 3: the supplied version ran an unconditional rAF forever at
  // window size. This one sizes to the host, scales the backing store for
  // device pixel ratio, and parks itself whenever motion would be wasted:
  // off screen, backgrounded tab, reduced motion, or pointer gone idle.
  //
  // Pointer-idle parking is the important one. The grid only moves because the
  // cursor moves it, so when the cursor stops the field is correct at rest.
  // A touch device never produces mousemove, so it renders as a flat
  // blueprint grid and never burns a frame.

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const IDLE_MS = 1200;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      // Cap at 2x. A 3x phone backing store triples fill cost for no gain.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h };
    };

    const localPoint = (event: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    let running = false;
    let idleTimer = 0;
    let onScreen = true;

    const tick = (now: number) => {
      const m = mouseRef.current;
      const t = targetMouseRef.current;
      m.x = lerpN(m.x, t.x, LERP_SPEED);
      m.y = lerpN(m.y, t.y, LERP_SPEED);
      draw(now);

      // Let a live ripple finish its travel even after the pointer settles.
      if (ripplesRef.current.length === 0 && now - lastMoveRef.current > IDLE_MS) {
        running = false;
        draw(now);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduceMotion.matches || !onScreen || document.hidden) return;
      running = true;
      rafRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafRef.current);
    };

    const scheduleIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (ripplesRef.current.length === 0) stop();
      }, IDLE_MS + 200);
    };

    measure();
    draw(performance.now());

    // Off-screen parking. No scroll listener: IntersectionObserver only.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0 },
    );
    visibility.observe(host);

    const resize = new ResizeObserver(() => {
      measure();
      draw(performance.now());
    });
    resize.observe(host);

    const onMouseMove = (event: MouseEvent) => {
      if (reduceMotion.matches) return;
      targetMouseRef.current = localPoint(event);
      lastMoveRef.current = performance.now();
      start();
      scheduleIdle();
    };

    const onClick = (event: MouseEvent) => {
      if (reduceMotion.matches) return;
      const { x, y } = localPoint(event);
      ripplesRef.current.push({ x, y, radius: 0, opacity: 1, born: performance.now() });
      lastMoveRef.current = performance.now();
      start();
      scheduleIdle();
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    // Both listeners live on window because the field is pointer-events-none:
    // a full-viewport layer must never intercept a click meant for the page.
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      visibility.disconnect();
      resize.disconnect();
      window.clearTimeout(idleTimer);
      stop();
    };
  }, [draw]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={hostRef}
      style={style}
      className={cn('relative isolate overflow-hidden', className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}