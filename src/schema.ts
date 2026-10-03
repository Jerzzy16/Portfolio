import { schemaBlocks, type SchemaBlock } from '@/data/profile';

/**
 * Diagram engine.
 *
 * The stage is a fixed 1120x680 coordinate space and every entity is absolutely
 * positioned inside it. Nothing is measured from the DOM to work out where a
 * card is: a Roll picks which entity sits in which of six authored slots, so
 * geometry is known up front. The whole stage is then scaled to fit its
 * container, which means the diagram never reflows and the connectors can never
 * drift out of register with the cards.
 *
 * The one thing that must be measured is card height, because it depends on the
 * webfont landing. routeDiagram takes those heights and anchors the connectors
 * to the real boxes.
 */

export const STAGE_W = 1120;
export const STAGE_H = 680;

/** Four authored arrangements. A reload rolls a different one. */
export type Roll = 0 | 1 | 2 | 3;

export type Row = {
  key: string;
  value: string;
  /** Rendered after the key in bold. */
  marker?: string;
  indent?: boolean;
  /** Key band. Consecutive key rows form one continuous band. */
  keyBg?: boolean;
  /** Renders the value in the accent. */
  accent?: boolean;
};

export type Slot = { l: number; t: number; w: number };

export type Ent = {
  id: string;
  title: string;
  badge: string;
  href: string;
  slot: Slot;
  rows: Row[];
  delay: number;
};

export type Diagram = {
  dialect: 'sql';
  roll: Roll;
  person: Ent;
  satellites: Ent[];
};

export type Connector = { d: string; delay: number };

export type Label = {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
  delay: number;
};

/**
 * Six slots on a loose three-by-two, each column vertically offset so the
 * arrangement reads as scattered rather than gridded. Columns never overlap
 * horizontally (110px of gutter) and the row offset leaves 320px of vertical
 * clearance, both far more than a card needs.
 */
const SLOTS = {
  a: { l: 0, t: 0, w: 300 },
  b: { l: 410, t: 46, w: 300 },
  c: { l: 820, t: 0, w: 300 },
  d: { l: 0, t: 366, w: 300 },
  e: { l: 410, t: 412, w: 300 },
  f: { l: 820, t: 380, w: 300 },
} satisfies Record<string, Slot>;

/** Which entity sits in which slot, per roll. Each row is a permutation of all six. */
const LAYOUTS: Record<Roll, Record<string, keyof typeof SLOTS>> = {
  0: { 'db.person': 'c', 'db.contact': 'a', 'db.experience': 'b', 'db.skills': 'f', 'db.projects': 'd', 'db.education': 'e' },
  1: { 'db.person': 'e', 'db.contact': 'c', 'db.experience': 'a', 'db.skills': 'b', 'db.projects': 'f', 'db.education': 'd' },
  2: { 'db.person': 'a', 'db.contact': 'f', 'db.experience': 'c', 'db.skills': 'd', 'db.projects': 'b', 'db.education': 'e' },
  3: { 'db.person': 'd', 'db.contact': 'b', 'db.experience': 'f', 'db.skills': 'c', 'db.projects': 'e', 'db.education': 'a' },
};

/** Fallback height before the first measurement lands. */
const ESTIMATED_H = 168;

const SATELLITE_DELAY = 0.08;

function toRows(block: SchemaBlock): Row[] {
  const keys: Row[] = block.keys.map(([kind, value]) => ({
    key: kind,
    value,
    keyBg: true,
    accent: true,
  }));

  const fields: Row[] = block.fields.map(([name, type]) => ({ key: name, value: type }));

  return [...keys, ...fields];
}

function makeEnt(block: SchemaBlock, slot: Slot, delay: number): Ent {
  const count = block.items === 1 ? 'item' : 'items';
  return {
    id: block.id,
    title: block.id,
    badge: `${block.items} ${count}`,
    href: block.href,
    slot,
    rows: toRows(block),
    delay,
  };
}

export function buildDiagram(roll: Roll): Diagram {
  const layout = LAYOUTS[roll];
  const byId = new Map(schemaBlocks.map((block) => [block.id, block]));

  const personBlock = byId.get('db.person');
  if (!personBlock) throw new Error('db.person missing from schemaBlocks');

  const person = makeEnt(personBlock, SLOTS[layout['db.person']], 0.1);

  const satellites = schemaBlocks
    .filter((block) => block.id !== 'db.person')
    .map((block, index) =>
      makeEnt(block, SLOTS[layout[block.id]], SATELLITE_DELAY * (index + 1)),
    );

  return { dialect: 'sql', roll, person, satellites };
}

// ─── Routing ──────────────────────────────────────────────────────────────────

type Box = { l: number; t: number; r: number; b: number; cx: number; cy: number };

function boxOf(ent: Ent, heights: Record<string, number>): Box {
  const h = heights[ent.id] ?? ESTIMATED_H;
  const { l, t, w } = ent.slot;
  return { l, t, r: l + w, b: t + h, cx: l + w / 2, cy: t + h / 2 };
}

/** The point on `self` that faces `other`. */
function anchor(self: Box, other: Box): { x: number; y: number } {
  const dx = other.cx - self.cx;
  const dy = other.cy - self.cy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx > 0 ? self.r : self.l, y: self.cy };
  }
  return { x: self.cx, y: dy > 0 ? self.b : self.t };
}

const STUB = 26;

/**
 * Classic ERD elbow: leave the anchor perpendicular by a short stub, run across,
 * then turn in. Routes on whichever axis dominates so it stays legible from any
 * slot pairing. Each end carries a label, which is what makes the cardinality
 * readable without a key.
 */
function route(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { d: string; fromLabel: { x: number; y: number }; toLabel: { x: number; y: number } } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = Math.sign(dx) || 1;
    const ax = a.x + s * STUB;
    const bx = b.x - s * STUB;
    return {
      d: `M${a.x} ${a.y} H${ax} V${b.y} H${b.x}`,
      fromLabel: { x: (a.x + ax) / 2, y: a.y },
      toLabel: { x: (b.x + bx) / 2, y: b.y },
    };
  }

  const s = Math.sign(dy) || 1;
  const ay = a.y + s * STUB;
  const by = b.y - s * STUB;
  return {
    d: `M${a.x} ${a.y} V${ay} H${b.x} V${b.y}`,
    fromLabel: { x: a.x, y: (a.y + ay) / 2 },
    toLabel: { x: b.x, y: (b.y + by) / 2 },
  };
}

/**
 * Every satellite hangs off db.person, so the root end of each edge is always 1
 * and the far end is N, or 1 for the one-to-one contact record.
 */
function farGlyph(id: string): string {
  return id === 'db.contact' ? '1' : 'N';
}

export function routeDiagram(
  diagram: Diagram,
  heights: Record<string, number>,
): { connectors: Connector[]; labels: Label[] } {
  const root = boxOf(diagram.person, heights);
  const connectors: Connector[] = [];
  const labels: Label[] = [];

  diagram.satellites.forEach((sat, index) => {
    const box = boxOf(sat, heights);
    const { d, fromLabel, toLabel } = route(anchor(root, box), anchor(box, root));
    const base = 0.5 + index * 0.09;

    connectors.push({ d, delay: base });

    labels.push({ x: fromLabel.x, y: fromLabel.y, text: '1', anchor: 'middle', delay: base + 0.38 });
    labels.push({
      x: toLabel.x,
      y: toLabel.y,
      text: farGlyph(sat.id),
      anchor: 'middle',
      delay: base + 0.46,
    });
  });

  return { connectors, labels };
}