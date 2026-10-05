'use client';

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/*
 * Adapted from the supplied kinetic-grid.tsx. Four deliberate departures:
 *   1. Colour is a prop, so the canvas obeys the page's single-accent lock.
 *   2. The canvas sizes to its container, not window.innerWidth, so it can be
 *      scoped to the hero instead of swallowing the document.
 *   3. The render loop is gated on visibility, DPR and reduced motion.
 *   4. Input is pointer-based. A phone never emits mousemove, which is why the
 *      original was a static blueprint on the only device that is a phone.
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
  /** Node glow, rasterised once. Built on first use; see glowSprite. */
  sprite: HTMLCanvasElement | null;
}

export interface KineticGridProps {
  children?: ReactNode;
  className?: string;
  /** Applied to the host element. Use this for z-index and positioning. */
  style?: CSSProperties;
  /** CSS custom property holding the accent as "r, g, b". Read at paint time so
   *  it follows the per-load palette rotation without a re-render. */
  accentVar?: string;
  /** Grid pitch in px. Lower it for short bands like a header strip. */
  cellSize?: number;
  /** Pointer influence radius in px. Scale with cellSize. */
  influenceRadius?: number;
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
const DOT_RADIUS = 0.7;
const DOT_FILL = 'rgba(232,235,230,0.05)';
const LERP_SPEED = 0.08;
const TAU = Math.PI * 2;

const LINE_BASE: RGBA = { r: 232, g: 235, b: 230, a: 0.13 };
const NODE_BASE: RGBA = { r: 232, g: 235, b: 230, a: 0.2 };
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;
/** The t=0 output of lerpColor(NODE_BASE, ...), hoisted so the unlit batch is one
 *  shared string rather than one interpolation per node per frame. */
const NODE_BASE_FILL = 'rgba(232,235,230,0.130)';

const IDLE_MS = 1200;
const MAX_DPR = 2;

/*
  Proximity is quantised into this many steps, each stroked as one path. A phone
  hero is ~300 segments, and stroking each on its own cost ~300 path setups plus
  ~300 rgba() strings per frame -- the largest item in the phone frame budget.
  Six steps is below what the eye resolves across a 0.13-to-0.55 alpha ramp, and
  at rest only one is populated, so the common case is a single stroke call.
*/
const BUCKETS = 6;

/** Below this a segment or node is painted at its unlit colour. */
const LIT = 0.06;

/*
  Ceiling on grid points. The authored pitch holds until cols*rows would exceed
  this, then it is coarsened. Only very wide canvases reach it -- a 2560px hero
  is 48x34 = 1632 points at the default pitch.
*/
const MAX_POINTS = 1600;

/** Device-px square the node glow is rasterised into once, then blitted. */
const GLOW_PX = 64;

/*
  Pointer reach as a fraction of the canvas short edge. A desktop hero's short
  edge is ~760px, so desktop keeps the authored radius untouched.
*/
const REACH_REFERENCE = 760;
const REACH_MIN = 0.6;

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

/**
 * Rasterises the node glow once. A createRadialGradient per lit node per frame
 * cost ~30 gradient objects a frame on a phone mid-drag, and gradient
 * construction is one of the more expensive things a 2D context does. A sprite
 * costs one drawImage per node, antialiased free by the downscale filter.
 */
function buildGlowSprite(rgb: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = GLOW_PX;
  sprite.height = GLOW_PX;

  const ctx = sprite.getContext('2d');
  if (!ctx) return sprite;

  const half = GLOW_PX / 2;
  // Inner stop at 0.3 of the radius, mid-range of the 0.25-0.4 the original
  // produced as the node radius grew.
  const grd = ctx.createRadialGradient(half, half, half * 0.3, half, half, half);
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, GLOW_PX, GLOW_PX);

  return sprite;
}

function glowSprite(theme: Accent): HTMLCanvasElement | null {
  theme.sprite ??= buildGlowSprite(theme.glow);
  return theme.sprite;
}

/**
 * Reads the accent as "r, g, b" off the document at paint time rather than
 * closing over a value, so the per-load palette rotation recolours the canvas
 * without re-rendering.
 *
 * Memoised on the property name: a getComputedStyle call per frame forces a
 * style recalc 60 times a second for a value written once per page load.
 */
let accentCache: { name: string; accent: Accent } | null = null;

function readAccent(name: string, fallback: Accent): Accent {
  if (accentCache?.name === name) return accentCache.accent;

  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(',').map((n) => Number.parseFloat(n));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    accentCache = { name, accent: fallback };
    return fallback;
  }

  const [r, g, b] = parts;
  const rgb = `${r}, ${g}, ${b}`;
  const accent: Accent = {
    line: { r, g, b, a: 0.55 },
    node: { r, g, b, a: 1 },
    glow: rgb,
    ripple: rgb,
    sprite: null,
  };

  accentCache = { name, accent };
  return accent;
}

/** Static neutral fallback, only used if the custom property is missing. */
const FALLBACK_ACCENT: Accent = {
  line: { r: 159, g: 232, b: 112, a: 0.55 },
  node: { r: 159, g: 232, b: 112, a: 1 },
  glow: '159, 232, 112',
  ripple: '159, 232, 112',
  sprite: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function KineticGrid({
  children,
  className,
  style,
  accentVar = '--color-primary-rgb',
  cellSize = CELL_SIZE,
  influenceRadius = INFLUENCE_RADIUS,
  background = 'transparent',
  showDots = true,
}: KineticGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });

  /*
    Influence strength, 0-1, held apart from position. A mouse keeps hovering
    after pointerup so the field stays lit where it was left; a finger does not,
    and a tap that left the grid permanently deformed is the most obvious tell
    on the platform. Releasing strength relaxes the field flat in place -- a
    lerp toward an off-screen sentinel would drag it across the canvas.
   */
  const strengthRef = useRef(1);
  const targetStrengthRef = useRef(1);

  /*
    The influence point parks at a sentinel until something contacts it. Lerping
    in from there takes ~1.5s at the authored rate -- long enough that the first
    press on a phone, the one that has to sell the effect, does nothing visible.
    The first contact primes it outright instead.
   */
  const primedRef = useRef(false);

  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const lastMoveRef = useRef(0);

  /*
    Whether the frame loop is live, and which run of the effect owns it. Both on
    the component rather than in the effect body, because StrictMode mounts the
    effect twice: two closures each with their own `running` flag disagree about
    one loop, and the loser cancels the winner's pending frame. A generation
    token lets the superseded run retire instead of fighting.
   */
  const runningRef = useRef(false);
  const genRef = useRef(0);

  /*
    Per-frame scratch. The canvas rect is refreshed once per frame rather than
    per pointer event, and the grid point buffers survive across frames.
   */
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });
  const gridRef = useRef<{
    cols: number;
    rows: number;
    xs: Float64Array;
    ys: Float64Array;
    prox: Float64Array;
    segB: Int8Array;
  } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  /*
    Pointer reach, resolved against the measured canvas rather than taken from
    the prop. A fingertip needs local precision: the authored 250px radius is 61%
    of a 412px viewport, so one touch would light the entire field and leave the
    ripple nothing to read against. Held in a ref so the hot loop reads it
    without a closure dependency.
   */
  const tuneRef = useRef<{ radius: number; maxWarp: number }>({
    radius: INFLUENCE_RADIUS,
    maxWarp: MAX_WARP,
  });

  /*
    The dot texture and background fill never move, so both are baked into one
    offscreen canvas and blitted with a single drawImage. Repainting them per
    frame was ~450 beginPath/arc/fill calls at a phone's hero size, more
    expensive than the entire grid it sat behind.
   */
  const backdropRef = useRef<HTMLCanvasElement | null>(null);

  // ── Warp ────────────────────────────────────────────────────────────────────

  /*
    Writes one grid point's warped position straight into the frame buffers and
    returns its proximity. Returns a number rather than an object: at a 54px
    pitch over a full hero, several hundred objects a frame were allocated for
    values that are immediately consumed.
   */
  const warpInto = useCallback(
    (
      xs: Float64Array,
      ys: Float64Array,
      i: number,
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
      radius: number,
      maxWarp: number,
      strength: number,
    ): number => {
      // Edge pin. Smoothly locks boundary rows and columns in place.
      const edgeMargin = 1.5;
      const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
      const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity = Math.max(0, 1 - dist / radius) * pinFactor * strength;

      let rx = 0;
      let ry = 0;
      for (const r of ripples) {
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const push = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * push * sign * -1;
          ry += Math.sin(angle) * push * sign * -1;
        }
      }

      // Cursor warp with bell falloff.
      if (dist < radius && dist > 0 && pinFactor > 0 && strength > 0) {
        const t = dist / radius;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        // Scaled by strength as well as proximity, so a released influence
        // settles nodes back onto their own intersections instead of fading the
        // highlight while leaving the geometry bent.
        const warpAmt = eased * maxWarp * pinFactor * strength;
        const angle = Math.atan2(dy, dx);
        xs[i] = gx - Math.cos(angle) * warpAmt + rx;
        ys[i] = gy - Math.sin(angle) * warpAmt + ry;
        return proximity;
      }

      xs[i] = gx + rx;
      ys[i] = gy + ry;
      return proximity;
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

      const { w: W, h: H, dpr } = sizeRef.current;
      if (W === 0 || H === 0) return;

      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;
      const theme = readAccent(accentVar, FALLBACK_ACCENT);
      const { radius, maxWarp } = tuneRef.current;
      const strength = strengthRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const backdrop = backdropRef.current;
      if (backdrop) ctx.drawImage(backdrop, 0, 0, W, H);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      let pitch = cellSize;
      let cols = Math.max(2, Math.ceil(W / pitch)) + 1;
      let rows = Math.max(2, Math.ceil(H / pitch)) + 1;

      if (cols * rows > MAX_POINTS) {
        pitch = cellSize * Math.sqrt((cols * rows) / MAX_POINTS);
        cols = Math.max(2, Math.ceil(W / pitch)) + 1;
        rows = Math.max(2, Math.ceil(H / pitch)) + 1;
      }

      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);
      const total = cols * rows;
      const hSegs = rows * (cols - 1);
      const vSegs = cols * (rows - 1);

      // Buffers survive across frames and are only reallocated when the grid
      // dimensions change, so a steady-state frame allocates nothing.
      let buf = gridRef.current;
      if (!buf || buf.cols !== cols || buf.rows !== rows) {
        buf = {
          cols,
          rows,
          xs: new Float64Array(total),
          ys: new Float64Array(total),
          prox: new Float64Array(total),
          segB: new Int8Array(hSegs + vSegs),
        };
        gridRef.current = buf;
      }
      const { xs, ys, prox, segB } = buf;

      for (let row = 0; row < rows; row++) {
        const gy = row * cellH;
        const base = row * cols;
        for (let col = 0; col < cols; col++) {
          prox[base + col] = warpInto(
            xs,
            ys,
            base + col,
            col * cellW,
            gy,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
            radius,
            maxWarp,
            strength,
          );
        }
      }

      // Ease once, in place. Segments and nodes both read the eased value from
      // here on -- one pass instead of two smoothsteps per consumer.
      for (let i = 0; i < total; i++) prox[i] = smoothstep(prox[i]);

      // ── Segments ───────────────────────────────────────────────────────────
      //
      // One bucket index per segment, horizontal rows first then vertical
      // columns, so the draw pass walks the same order twice without
      // recomputing the average.
      let n = 0;
      let mask = 0;
      for (let row = 0; row < rows; row++) {
        const base = row * cols;
        for (let col = 0; col < cols - 1; col++) {
          const avg = (prox[base + col] + prox[base + col + 1]) * 0.5;
          const b = avg >= 1 ? BUCKETS - 1 : (avg * BUCKETS) | 0;
          segB[n++] = b;
          mask |= 1 << b;
        }
      }
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows - 1; row++) {
          const i = row * cols + col;
          const avg = (prox[i] + prox[i + cols]) * 0.5;
          const b = avg >= 1 ? BUCKETS - 1 : (avg * BUCKETS) | 0;
          segB[n++] = b;
          mask |= 1 << b;
        }
      }

      ctx.lineCap = 'butt';
      n = 0;
      for (let b = 0; b < BUCKETS; b++) {
        if ((mask & (1 << b)) === 0) continue;

        // Bucket b owns the band [b/BUCKETS, (b+1)/BUCKETS) and is painted at
        // its floor, so bucket 0 is exactly LINE_BASE and an at-rest field is
        // pixel-identical to the unbatched version.
        const t = b / (BUCKETS - 1);
        ctx.beginPath();

        for (let row = 0; row < rows; row++) {
          const base = row * cols;
          for (let col = 0; col < cols - 1; col++) {
            if (segB[n++] !== b) continue;
            const i = base + col;
            ctx.moveTo(xs[i], ys[i]);
            ctx.lineTo(xs[i + 1], ys[i + 1]);
          }
        }
        for (let col = 0; col < cols; col++) {
          for (let row = 0; row < rows - 1; row++) {
            if (segB[n++] !== b) continue;
            const i = row * cols + col;
            ctx.moveTo(xs[i], ys[i]);
            ctx.lineTo(xs[i + cols], ys[i + cols]);
          }
        }

        ctx.strokeStyle = lerpColor(LINE_BASE, theme.line, t);
        ctx.lineWidth = lerpN(0.8, 1.5, t);
        ctx.stroke();
      }

      // ── Nodes ──────────────────────────────────────────────────────────────
      //
      // Unlit nodes share a radius and a colour, so they go down as one path.
      // At rest that is every node in the field.
      const sprite = glowSprite(theme);
      let unlit = 0;
      ctx.beginPath();
      for (let i = 0; i < total; i++) {
        if (prox[i] > LIT) continue;
        const px = xs[i];
        const py = ys[i];
        ctx.moveTo(px + NODE_BASE_RADIUS, py);
        ctx.arc(px, py, NODE_BASE_RADIUS, 0, TAU);
        unlit++;
      }
      if (unlit > 0) {
        ctx.fillStyle = NODE_BASE_FILL;
        ctx.fill();
      }

      for (let i = 0; i < total; i++) {
        const t = prox[i];
        if (t <= LIT) continue;

        const px = xs[i];
        const py = ys[i];
        const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

        if (t > 0.3 && sprite) {
          const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
          ctx.globalAlpha = t * 0.3;
          ctx.drawImage(sprite, px - glowR, py - glowR, glowR * 2, glowR * 2);
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fillStyle = lerpColor(NODE_BASE, theme.node, t);
        ctx.fill();
      }

      for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, TAU);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    [accentVar, cellSize, warpInto],
  );

  // ── Loop ────────────────────────────────────────────────────────────────────
  //
  // Sizes to the host, scales the backing store for DPR, and parks itself
  // whenever motion would be wasted: off screen, backgrounded tab, reduced
  // motion, or pointer gone idle.
  //
  // Pointer-idle parking is the important one. The grid only moves because the
  // pointer moves it, so when the pointer stops the field is correct at rest --
  // a touch device burns no frame at all until a finger lands.

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const gen = ++genRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* Bakes the fill and dot texture into an offscreen canvas. Neither moves. */
    const buildBackdrop = (w: number, h: number, dpr: number) => {
      const plate = document.createElement('canvas');
      plate.width = Math.round(w * dpr);
      plate.height = Math.round(h * dpr);

      const bctx = plate.getContext('2d');
      if (!bctx) return null;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (background !== 'transparent') {
        bctx.fillStyle = background;
        bctx.fillRect(0, 0, w, h);
      }

      if (showDots) {
        bctx.fillStyle = DOT_FILL;
        for (let x = DOT_SPACING / 2; x < w; x += DOT_SPACING) {
          for (let y = DOT_SPACING / 2; y < h; y += DOT_SPACING) {
            bctx.beginPath();
            bctx.arc(x, y, DOT_RADIUS, 0, TAU);
            bctx.fill();
          }
        }
      }

      return plate;
    };

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      // Cap at 2x. A 3x phone backing store triples fill cost for no visible gain.
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      const current = sizeRef.current;
      const resized = current.w !== w || current.h !== h || current.dpr !== dpr;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h, dpr };

      // Reach as a fraction of the short edge, so a phone gets a fingertip's
      // precision and a desktop keeps the authored radius.
      const reach = Math.min(1, Math.max(REACH_MIN, Math.min(w, h) / REACH_REFERENCE));
      tuneRef.current = {
        radius: influenceRadius * reach,
        maxWarp: cellSize * (MAX_WARP / CELL_SIZE),
      };

      // Rebake only when the pixels actually changed. Resize fires on rotation
      // and on any reflow, and a phone's URL bar is more than capable of
      // producing a burst of them.
      if (resized) backdropRef.current = buildBackdrop(w, h, dpr);

      rectRef.current = canvas.getBoundingClientRect();
    };

    /*
      The canvas is absolutely positioned in a relative host and its style size
      is pinned in measure(), so only scrolling and a host resize move its
      viewport rect -- both already have listeners here. Refreshing on those
      rather than inside tick() is the whole fix: a getBoundingClientRect()
      immediately before draw() forced a synchronous layout every frame, 325ms of
      reflow across one load. Coalesced to one read per frame.
     */
    const refreshRect = () => {
      rectRef.current = canvas.getBoundingClientRect();
    };

    let rectFrame = 0;
    const scheduleRectRefresh = () => {
      if (rectFrame) return;
      rectFrame = requestAnimationFrame(() => {
        rectFrame = 0;
        refreshRect();
      });
    };

    let idleTimer = 0;
    let onScreen = true;
    let lastFrame = 0;

    const tick = (now: number) => {
      // Superseded by a newer run of this effect. Its tick closure would
      // otherwise resurrect a loop the current run has already taken over.
      if (gen !== genRef.current) return;

      /*
        Frame-rate independent lerp. A fixed 0.08 per frame runs twice as fast on
        a 120Hz ProMotion phone as at 60Hz, so the field tracked the finger at one
        speed on desktop and another on the phone. Expressed as a 60Hz-equivalent
        step count, capped so a stalled tab cannot snap the field across the
        canvas in one frame.
      */
      const frames = lastFrame === 0 ? 1 : Math.min(4, (now - lastFrame) / (1000 / 60));
      lastFrame = now;
      const k = 1 - (1 - LERP_SPEED) ** frames;

      const m = mouseRef.current;
      const t = targetMouseRef.current;
      m.x = lerpN(m.x, t.x, k);
      m.y = lerpN(m.y, t.y, k);
      strengthRef.current = lerpN(strengthRef.current, targetStrengthRef.current, k);
      draw(now);

      // Let a live ripple finish its travel even after the pointer settles.
      if (ripplesRef.current.length === 0 && now - lastMoveRef.current > IDLE_MS) {
        runningRef.current = false;
        lastFrame = 0;
        rafRef.current = 0;
        draw(now);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (runningRef.current || reduceMotion.matches || !onScreen || document.hidden) return;
      // The loop may have been parked through a scroll, so the cached rect is
      // stale here by definition. One read per start, not one per frame.
      refreshRect();
      lastFrame = 0;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    };

    /*
      Unconditional cancel. An earlier run tearing down would otherwise cancel
      the frame id belonging to the run that replaced it, while that run's own
      flag stayed set -- a loop marked running with no pending frame, which can
      never be restarted. StrictMode makes this interleaving the default.
     */
    const stop = () => {
      runningRef.current = false;
      lastFrame = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
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

    /*
      Pointer, not mouse. `pointermove` covers all three input types at once: a
      mouse hovers, a finger only reports while it is down, a pen does both.
      Listeners sit on window and the field is `pointer-events-none`, so a
      full-bleed layer can never intercept a tap meant for the page. Passive and
      no preventDefault, so the hero stays scrollable under the finger warping
      it -- the browser takes the gesture and fires pointercancel, and the warp
      releases on its own.

      `aim` seeds the smoothed position outright on first contact, so the field
      lights where the finger landed instead of sliding in from the sentinel.
     */
    const aim = (x: number, y: number) => {
      if (primedRef.current) {
        targetMouseRef.current = { x, y };
      } else {
        primedRef.current = true;
        mouseRef.current = { x, y };
        targetMouseRef.current = { x, y };
      }
      targetStrengthRef.current = 1;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduceMotion.matches) return;

      const rect = rectRef.current ?? canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      aim(x, y);
      lastMoveRef.current = performance.now();

      /*
        Only wake the loop when the pointer is over the field. A touch pointer
        reports movement for every finger on the glass, including a scroll
        started anywhere in the document, so without this bounds test one flick
        to the bottom of the page redraws the whole canvas at frame rate on the
        way. The target still updates, so a running loop decays and parks on its
        idle timer instead of freezing warped.
      */
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) start();
      scheduleIdle();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (reduceMotion.matches) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const rect = rectRef.current ?? canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // The field can be a band rather than the whole page, so ignore presses
      // outside it -- otherwise a ripple is born invisible.
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      aim(x, y);
      ripplesRef.current.push({ x, y, radius: 0, opacity: 1, born: performance.now() });
      lastMoveRef.current = performance.now();
      start();
      scheduleIdle();
    };

    /*
      Release. A mouse is still hovering after pointerup so the field stays lit
      where it was left; a finger and a pen are not, and a tap that left the
      grid bent reads as a bug. pointercancel covers a gesture the browser took
      for a scroll -- the common outcome of a drag that started on the field.
     */
    const onPointerRelease = (event: PointerEvent) => {
      if (reduceMotion.matches) return;
      if (event.pointerType === 'mouse') return;
      if (targetStrengthRef.current === 0) return;
      targetStrengthRef.current = 0;
      lastMoveRef.current = performance.now();
      scheduleIdle();
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerRelease, { passive: true });
    window.addEventListener('pointercancel', onPointerRelease, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('scroll', scheduleRectRefresh, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', scheduleRectRefresh);
      visibility.disconnect();
      resize.disconnect();
      window.clearTimeout(idleTimer);
      cancelAnimationFrame(rectFrame);
      backdropRef.current = null;
      stop();
    };
  }, [background, cellSize, draw, influenceRadius, showDots]);

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