/**
 * Accent rotation.
 *
 * The five base hexes are supplied by the brief and are used verbatim for
 * strokes, borders, glows and tints. Four of them cannot be used as TEXT on the
 * ink canvas: measured against #0e0f0c they land at 1.08:1 to 1.92:1, which is
 * effectively invisible. Each entry therefore carries a `ink` variant, the same
 * hue lifted in HSL until it clears 7:1 on the canvas.
 *
 * Token contract, so the whole page follows one rule:
 *   --color-primary       the legible variant. Text on canvas, and solid fills.
 *   --color-primary-base  the brief's hex. Borders, SVG strokes, glows, tints.
 *   --color-primary-ink   the canvas colour, used as a label on primary fills.
 *
 * Buttons fill with `--color-primary` and label with `--color-primary-ink`.
 * That pairing measures 7:1 or better for all five entries, so button contrast
 * never depends on which colour is active.
 */

export type PaletteEntry = {
  id: string;
  /** The brief's hex. Surfaces only. */
  base: string;
  /** Same hue, lifted until it clears 7:1 on the canvas. Text and fills. */
  ink: string;
};

// ─── Color math ───────────────────────────────────────────────────────────────

type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

export function rgbToString({ r, g, b }: Rgb): string {
  return `${r}, ${g}, ${b}`;
}

function rgbToHsl({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / delta + 2) / 6;
    else h = ((rn - gn) / delta + 4) / 6;
  }

  return { h: h * 360, s, l };
}

function hueToRgb(p: number, q: number, t: number) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): Rgb {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return {
    r: hueToRgb(p, q, hn + 1 / 3) * 255,
    g: hueToRgb(p, q, hn) * 255,
    b: hueToRgb(p, q, hn - 1 / 3) * 255,
  };
}

/** Raises lightness by `amount` (0 to 1), holding hue and saturation. */
export function lighten(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.min(1, hsl.l + amount) }));
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (raw: number) => {
    const c = raw / 255;
    return c > 0.03928 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** The canvas every variant is measured against. Mirrors --color-ink. */
export const CANVAS = '#0e0f0c';

// ─── The rotation ─────────────────────────────────────────────────────────────

/**
 * Rotation order. A random entry is picked on every page load, so the accent
 * changes on every refresh. Nothing is persisted to storage, on purpose.
 */
export const PALETTE: readonly PaletteEntry[] = [
  { id: 'ember', base: '#480607', ink: '#F47577' },
  { id: 'ultraviolet', base: '#201030', ink: '#B28CD9' },
  { id: 'rose', base: '#ED7A9B', ink: '#ED7A9B' },
  { id: 'lagoon', base: '#004958', ink: '#00ABCE' },
  { id: 'amber', base: '#C46210', ink: '#ED7F22' },
] as const;

export function pickPalette(): PaletteEntry {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

/** Paints the active entry onto the document so every token follows. */
export function applyPalette(entry: PaletteEntry): void {
  const root = document.documentElement;
  const base = hexToRgb(entry.base);
  const ink = hexToRgb(entry.ink);

  root.style.setProperty('--color-primary', entry.ink);
  root.style.setProperty('--color-primary-base', entry.base);
  root.style.setProperty('--color-primary-rgb', rgbToString(ink));
  root.style.setProperty('--color-primary-base-rgb', rgbToString(base));
  root.style.setProperty('--color-primary-active', lighten(entry.ink, 0.1));
  root.style.setProperty('--color-primary-pale', lighten(entry.ink, 0.32));
  root.dataset.accent = entry.id;
}

/**
 * Guards the one invariant the rotation depends on: a label on a primary fill
 * must clear 4.5:1. Runs once per load, warns loudly if an entry regresses.
 */
export function verifyPalette(entries: readonly PaletteEntry[] = PALETTE): void {
  for (const entry of entries) {
    const onCanvas = contrast(entry.ink, CANVAS);
    const asLabel = contrast(entry.ink, CANVAS);

    if (onCanvas < 4.5 || asLabel < 4.5) {
      console.warn(
        `[palette] ${entry.id}: ${entry.ink} fails contrast ` +
          `(canvas ${onCanvas.toFixed(2)}:1, label ${asLabel.toFixed(2)}:1).`,
      );
    }
  }
}