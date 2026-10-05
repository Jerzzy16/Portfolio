/**
 * Accent and surface rotation.
 *
 * One hue per page load drives everything, including the whole neutral ramp, so
 * the canvas reads as a dark tint of the active hue rather than grey with a
 * coloured button on it.
 *
 * Two things made this more than a colour swap:
 *
 * 1. Four of the five supplied base hexes cannot be text on a near black canvas
 *    (1.08:1 to 1.92:1 against #0e0f0c -- invisible). Each theme derives an
 *    `accentInk`: same hue, lightness raised until it clears 7:1.
 *
 * 2. Tinting the canvas means re-solving every text colour against it. Text
 *    tokens sit at a faint saturation of the hue, because a saturated ramp caps
 *    achievable luminance below what the display type needs. `verifyTheme`
 *    re-checks this at runtime.
 */

export type Theme = {
  id: string;
  /** Page background. */
  canvas: string;
  /** Card and panel background. */
  surface: string;
  /** Header bar and badge background inside a card. */
  surfaceAlt: string;
  /** Hairline borders and dividers. */
  line: string;
  /** Border for the highlighted root card. */
  lineStrong: string;
  textPrimary: string;
  textBody: string;
  /** Captions and table types. Verified against surfaceAlt, the worst case. */
  textMute: string;
  /** The accent, legible on canvas. Text and solid fills. */
  accentInk: string;
  /** The supplied hex. Canvas strokes, glows, tints. */
  accentBase: string;
};

// ─── Color math ───────────────────────────────────────────────────────────────

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

export function hexToRgb(hex: string): Rgb {
  const v = hex.replace('#', '');
  const full =
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

export function rgbToString({ r, g, b }: Rgb): string {
  return `${r}, ${g}, ${b}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
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

function hslToRgb({ h, s, l }: Hsl): Rgb {
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

const hsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb({ h, s, l }));

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

/**
 * Raises the accent's HSL lightness until it clears `target` against `against`,
 * holding hue and saturation. Returns the input unchanged if it already passes.
 */
function liftToContrast(base: string, against: string, target: number): string {
  if (contrast(base, against) >= target) return base;
  const { h, s } = rgbToHsl(hexToRgb(base));
  for (let l = 0.05; l <= 1; l += 0.002) {
    const candidate = hsl(h, s, l);
    if (contrast(candidate, against) >= target) return candidate;
  }
  return '#ffffff';
}

// ─── Theme construction ───────────────────────────────────────────────────────

/** Canvas lightness. Tuned so the hue is perceptible without lifting the page. */
const CANVAS_L = 0.052;
/** Surfaces step up from the canvas; 24px gaps of pure black read as holes. */
const SURFACE_DL = 0.035;
const SURFACE_ALT_DL = 0.075;
const LINE_DL = 0.115;
/** Text ramp saturation. Faint, so the ramp can reach the display type's
 *  luminance -- full saturation caps it lower. */

export function buildTheme(id: string, base: string, saturation = 0.42): Theme {
  const { h } = rgbToHsl(hexToRgb(base));

  const canvas = hsl(h, saturation, CANVAS_L);
  const surface = hsl(h, saturation, CANVAS_L + SURFACE_DL);
  const surfaceAlt = hsl(h, saturation, CANVAS_L + SURFACE_ALT_DL);
  const line = hsl(h, saturation * 0.7, CANVAS_L + LINE_DL);

  const textPrimary = hsl(h, 0.06, 0.9);
  const textBody = hsl(h, 0.12, 0.72);
  // Verified against surfaceAlt, the lightest surface a caption can land on.
  const textMute = hsl(h, 0.16, 0.62);

  const accentInk = liftToContrast(base, canvas, 7);

  return {
    id,
    canvas,
    surface,
    surfaceAlt,
    line,
    lineStrong: accentInk,
    textPrimary,
    textBody,
    textMute,
    accentInk,
    accentBase: base,
  };
}

/**
 * The rotation. Random entry per page load, so every refresh differs. Nothing is
 * written to storage, on purpose.
 */
export const THEMES: readonly Theme[] = [
  buildTheme('ember', '#480607'),
  buildTheme('ultraviolet', '#201030'),
  buildTheme('rose', '#ED7A9B', 0.3),
  buildTheme('lagoon', '#004958'),
  buildTheme('amber', '#C46210'),
  buildTheme('lime', '#9fe870', 0.34),
] as const;

/** The default in src/index.css. Must match a THEMES entry exactly. */
export const DEFAULT_THEME = THEMES[THEMES.length - 1];

export function pickTheme(): Theme {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

/**
 * The accent hex currently painted on the document, for anything that needs a
 * concrete value rather than a CSS token -- the Simple Icons CDN URL in
 * Skills.tsx takes a hex in the path and cannot read a custom property.
 */
let activeAccent = DEFAULT_THEME.accentInk;

export function getActiveAccent(): string {
  return activeAccent;
}

/** Paints the active theme onto the document so every token follows. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

  set('--color-ink', theme.canvas);
  set('--color-ink-deep', theme.surface);
  set('--color-ink-lift', theme.surfaceAlt);
  set('--color-ink-line', theme.line);
  set('--color-line-strong', theme.lineStrong);

  set('--color-canvas-soft', theme.textPrimary);
  set('--color-body', theme.textBody);
  set('--color-mute', theme.textMute);

  set('--color-primary', theme.accentInk);
  set('--color-primary-base', theme.accentBase);
  // Comma separated on purpose. A slash-alpha custom property needs a space
  // separated triplet: `rgb(var(--token) / 0.2)` against a comma separated token
  // expands to `rgb(0, 172, 206 / 0.2)`, which is invalid, so the browser drops
  // the declaration and the effect silently disappears. With this token alpha
  // goes through the legacy form: `rgba(var(--token), 0.2)`.
  set('--color-primary-rgb', rgbToString(hexToRgb(theme.accentInk)));
  set('--color-primary-base-rgb', rgbToString(hexToRgb(theme.accentBase)));

  // Hover lifts the fill. Derived from the accent, not from white, so the
  // relationship survives a hue rotation.
  const { h, s } = rgbToHsl(hexToRgb(theme.accentInk));
  set('--color-primary-active', hsl(h, s, Math.min(1, rgbToHsl(hexToRgb(theme.accentInk)).l + 0.09)));

  root.dataset.theme = theme.id;

  activeAccent = theme.accentInk;

  // Keep the browser chrome in step with the canvas, which rotates with the hue.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.canvas);
}

/**
 * Re-checks the invariants the theme depends on, once per load, so a future edit
 * to the ramp cannot silently ship unreadable text.
 */
export function verifyTheme(themes: readonly Theme[] = THEMES): void {
  const failures: string[] = [];

  for (const theme of themes) {
    const checks: [string, string, string, number][] = [
      ['textPrimary', theme.textPrimary, theme.canvas, 7],
      ['textBody', theme.textBody, theme.canvas, 4.5],
      // Captions sit on cards, so surfaceAlt is the honest floor.
      ['textMute', theme.textMute, theme.surfaceAlt, 4.5],
      ['accentInk', theme.accentInk, theme.canvas, 7],
      // A solid accent fill labelled with the canvas.
      ['labelOnAccent', theme.canvas, theme.accentInk, 4.5],
    ];

    for (const [name, fg, bg, floor] of checks) {
      const ratio = contrast(fg, bg);
      if (ratio < floor) {
        failures.push(`${theme.id}/${name} ${ratio.toFixed(2)}:1 < ${floor}:1`);
      }
    }
  }

  if (failures.length > 0) {
    console.warn('[theme] contrast failures:\n' + failures.map((f) => `  ${f}`).join('\n'));
  }
}