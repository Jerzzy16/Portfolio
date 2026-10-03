import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { schemaBlocks, schemaRelations, type SchemaBlock } from '@/data/profile';
import type { CSSVars } from '@/components/Reveal';

// Jitter stays under half the 24px grid gap, so neighbours can never collide.
const JITTER_X = 8;
const JITTER_Y = 6;
const STUB = 16;

type Pt = { x: number; y: number };

type Slot = {
  id: string;
  dx: number;
  dy: number;
};

type Edge = {
  key: string;
  d: string;
  mid: Pt;
  label: string;
};

/**
 * Assigns every block to a distinct slot and offsets it slightly, so the diagram
 * lands in a different arrangement on each page load. Slots are a shuffle of the
 * block list rather than free placement: any permutation is guaranteed to be
 * collision-free, which free random offsets would not be.
 */
function scatter(): Slot[] {
  const ids = schemaBlocks.map((block) => block.id);

  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = ids[i];
    ids[i] = ids[j];
    ids[j] = swap;
  }

  return ids.map((id) => ({
    id,
    dx: Math.round((Math.random() * 2 - 1) * JITTER_X),
    dy: Math.round((Math.random() * 2 - 1) * JITTER_Y),
  }));
}

/** Edge of `self` that faces `other`, in container-relative pixels. */
function anchorPoint(container: DOMRect, self: DOMRect, other: DOMRect): Pt {
  const sc = {
    x: self.left - container.left + self.width / 2,
    y: self.top - container.top + self.height / 2,
  };
  const oc = {
    x: other.left - container.left + other.width / 2,
    y: other.top - container.top + other.height / 2,
  };
  const dx = oc.x - sc.x;
  const dy = oc.y - sc.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx > 0 ? self.right - container.left : self.left - container.left, y: sc.y };
  }
  return { x: sc.x, y: dy > 0 ? self.bottom - container.top : self.top - container.top };
}

/**
 * Classic ERD elbow: leave the anchor perpendicular by a short stub, run to the
 * far side, then turn in. Routes on whichever axis dominates, so it stays
 * readable no matter where the scatter puts the two blocks.
 */
function routeEdge(a: Pt, b: Pt): { d: string; mid: Pt } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const seg = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = Math.sign(dx) || 1;
    const ax = a.x + s * STUB;
    const bx = b.x - s * STUB;
    return {
      d: `M${a.x} ${a.y} H${ax} V${b.y} H${b.x}`,
      // Label the turn, which is the longest run in the horizontal case.
      mid: seg({ x: ax, y: a.y }, { x: bx, y: b.y }),
    };
  }

  const s = Math.sign(dy) || 1;
  const ay = a.y + s * STUB;
  const by = b.y - s * STUB;
  return {
    d: `M${a.x} ${a.y} V${ay} H${b.x} V${b.y}`,
    mid: seg({ x: a.x, y: ay }, { x: b.x, y: by }),
  };
}

function SchemaPanel({
  block,
  slot,
  register,
}: {
  block: SchemaBlock;
  slot: Slot;
  register: (id: string, node: HTMLAnchorElement | null) => void;
}) {
  const highlighted = block.variant === 'primary';

  return (
    <a
      ref={(node) => register(block.id, node)}
      href={block.href}
      aria-label={`${block.id}, jump to ${block.href.slice(1)}`}
      style={{ transform: `translate3d(${slot.dx}px, ${slot.dy}px, 0)` }}
      className={`group panel flex flex-col overflow-hidden transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:border-primary ${
        highlighted ? '' : 'hover:border-primary/60'
      }`}
    >
      <div
        className={`flex items-baseline justify-between gap-3 border-b px-4 py-3 ${
          highlighted ? 'border-primary bg-primary' : 'border-ink-line'
        }`}
      >
        <span
          className={`font-mono text-[11px] tracking-[0.02em] ${
            highlighted ? 'text-ink' : 'text-canvas-soft'
          }`}
        >
          {block.id}
        </span>

        <span className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${highlighted ? 'text-ink/70' : 'text-mute'}`}>
            {block.docs} docs
          </span>
          <ArrowUpRight
            size={12}
            weight="bold"
            aria-hidden="true"
            className={`transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 ${
              highlighted
                ? 'opacity-70'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
          />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 py-3">
        <span className="font-mono text-[13px] leading-5 text-mute">{'{'}</span>

        {block.fields.map(([name, type]) => (
          <div key={name} className="flex items-baseline justify-between gap-3 py-[3px]">
            <span className="font-mono text-[11px] text-canvas-soft">{name}</span>
            <span className="font-mono text-[10.5px] text-mute">{type}</span>
          </div>
        ))}

        <span className="mt-auto font-mono text-[13px] leading-5 text-mute">{'}'}</span>
      </div>
    </a>
  );
}

export default function SchemaDiagram() {
  // Frozen for the lifetime of the page. A reload re-rolls it.
  const [slots] = useState<Slot[]>(scatter);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [edges, setEdges] = useState<Edge[]>([]);

  const byId = useMemo(
    () => Object.fromEntries(schemaBlocks.map((block) => [block.id, block])),
    [],
  );

  const register = useCallback((id: string, node: HTMLAnchorElement | null) => {
    if (node) panelRefs.current.set(id, node);
    else panelRefs.current.delete(id);
  }, []);

  /**
   * Connectors are measured from the laid-out DOM instead of hardcoded
   * coordinates. That is what lets the blocks move: the routing follows
   * whatever arrangement the scatter produced.
   */
  useEffect(() => {
    const recompute = () => {
      const container = containerRef.current;
      if (!container) return;

      const box = container.getBoundingClientRect();
      const next: Edge[] = [];

      for (const relation of schemaRelations) {
        const from = panelRefs.current.get(relation.from);
        const to = panelRefs.current.get(relation.to);
        if (!from || !to) continue;

        const a = anchorPoint(box, from.getBoundingClientRect(), to.getBoundingClientRect());
        const b = anchorPoint(box, to.getBoundingClientRect(), from.getBoundingClientRect());
        const { d, mid } = routeEdge(a, b);

        next.push({ key: `${relation.from}>${relation.to}`, d, mid, label: relation.label });
      }

      setEdges(next);
    };

    recompute();

    const observer = new ResizeObserver(recompute);
    if (containerRef.current) observer.observe(containerRef.current);
    for (const node of panelRefs.current.values()) observer.observe(node);

    // Web fonts land after first paint and change panel heights.
    void document.fonts?.ready.then(recompute);
    window.addEventListener('resize', recompute);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [slots]);

  return (
    <figure className="m-0">
      <div ref={containerRef} className="relative">
        {/* Connectors. Hidden on mobile: a single column turns every edge into a
            full-height vertical line, which is noise rather than information. */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden size-full md:block">
          {edges.map((edge, index) => (
            <g key={edge.key}>
              <path
                d={edge.d}
                fill="none"
                stroke="var(--color-primary)"
                strokeOpacity="0.42"
                strokeWidth="1"
                pathLength={100}
                className="draw-pct"
                style={{ animationDelay: `${520 + index * 90}ms` } as CSSVars}
              />
              <text
                x={edge.mid.x}
                y={edge.mid.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-primary)"
                fontFamily="var(--font-mono)"
                fontSize="10"
                stroke="var(--color-ink)"
                strokeWidth="4"
                strokeLinejoin="round"
                paintOrder="stroke"
                className="fade"
                style={{ animationDelay: `${900 + index * 90}ms` } as CSSVars}
              >
                {edge.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="relative z-10 grid grid-cols-1 gap-6 md:auto-rows-[188px] md:grid-cols-3">
          {slots.map((slot) => {
            const block = byId[slot.id];
            return block ? (
              <SchemaPanel key={slot.id} block={block} slot={slot} register={register} />
            ) : null;
          })}
        </div>
      </div>

      {/* Disambiguates the notation. Without it, 1:N and N:1 are the same edge
          read from opposite ends and the labels look arbitrary. */}
      <figcaption className="mt-5 hidden font-mono text-[10px] text-mute md:block">
        cardinality read outward from db.person. reverse reads N:1.
      </figcaption>
    </figure>
  );
}