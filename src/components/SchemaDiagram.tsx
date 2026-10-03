import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useMediaQuery } from '@/components/Reveal';
import { schemaRelations } from '@/data/profile';
import { buildDiagram, routeDiagram, STAGE_H, STAGE_W, type Ent, type Roll, type Row } from '@/schema';
import Corners from './Corners';

/** Matches the `md` breakpoint the layout switches at. */
const WIDE = '(min-width: 768px)';

function Rows({ rows }: { rows: Row[] }) {
  return (
    <div className="ent-body">
      {rows.map((row, index) => (
        <div
          key={index}
          className={`ent-row${row.indent ? ' indent' : ''}${row.keyBg ? ' key' : ''}`}
        >
          <span className="ent-key">
            {row.key}
            {row.marker && <b> {row.marker}</b>}
          </span>
          <span className={`ent-val${row.accent ? ' accent' : ''}`}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** The edge cardinality from the root, or null for the root itself. */
function edgeLabel(id: string): string | null {
  const edge = schemaRelations.find((r) => r.from === 'db.person' && r.to === id);
  return edge ? edge.label : null;
}

/**
 * One entity card.
 *
 * `slot` is the desktop form: absolutely positioned inside the scaled stage at an
 * authored coordinate. `flow` is the mobile form: ordinary flow at full size.
 * The stage cannot simply be scaled down further, because at a 375px viewport
 * the factor lands near 0.29 and every label drops to roughly 4px, so below md
 * the diagram re-flows instead of shrinking.
 */
function EntCard({
  ent,
  variant,
  style,
  setRef,
  relation,
}: {
  ent: Ent;
  variant: 'slot' | 'flow';
  style?: React.CSSProperties;
  setRef: (el: HTMLElement | null) => void;
  relation: string | null;
}) {
  const isRoot = ent.id === 'db.person';
  const dialect = 'sql';

  return (
    <a
      ref={setRef}
      href={ent.href}
      className={`card blueprint hoverable ent ${variant} ${isRoot ? 'ent-person' : 'ent-link'}`}
      style={style}
      aria-label={`${ent.id}, ${ent.badge}, jump to ${ent.href.slice(1)}`}
    >
      <Corners />
      <div className={`ent-head ${dialect}${isRoot ? ' person' : ''}`}>
        <span className={`ent-title ${dialect}`} translate="no">
          {ent.title}
        </span>
        <span className={`ent-badge${isRoot ? '' : ' tag tag-accent'}`}>{ent.badge}</span>
      </div>
      <Rows rows={ent.rows} />
      {variant === 'flow' && (
        <p className="diagram-edge">
          {isRoot ? 'root record' : <>{schemaRelations.find((r) => r.to === ent.id)?.from}</>}
          {relation ? <span className="text-primary"> {relation} </span> : null}
          {isRoot ? null : ent.id}
        </p>
      )}
    </a>
  );
}

export default function SchemaDiagram({ roll }: { roll: Roll }) {
  const wide = useMediaQuery(WIDE);
  const diagram = useMemo(() => buildDiagram(roll), [roll]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(STAGE_W);

  const boxes = useRef(new Map<string, HTMLElement>());
  const [heights, setHeights] = useState<Record<string, number>>({});

  const setBox = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) boxes.current.set(key, el);
      else boxes.current.delete(key);
    },
    [],
  );

  // Container width drives the scale. The observer fires once on observe, so
  // there is no separate initial read interleaved with the write it triggers.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !wide) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);

  // Card heights drive the connector anchors, so they are measured after layout.
  // Mobile cards are in normal flow and route nothing, so they are not measured.
  useLayoutEffect(() => {
    if (!wide) return;

    const measure = () => {
      setHeights((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        boxes.current.forEach((el, key) => {
          const h = el.offsetHeight;
          next[key] = h;
          if (Math.abs((prev[key] ?? 0) - h) > 0.5) changed = true;
        });
        return changed || Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    boxes.current.forEach((el) => ro.observe(el));

    // Web fonts land after first paint and change every card height.
    void document.fonts?.ready.then(measure).catch(() => {});

    return () => ro.disconnect();
  }, [diagram, wide]);

  const { connectors, labels } = useMemo(
    () => (wide ? routeDiagram(diagram, heights) : { connectors: [], labels: [] }),
    [diagram, heights, wide],
  );

  const scale = Math.min(1, width / STAGE_W);
  const frameStyle = { height: STAGE_H * scale };
  const stageStyle = {
    transform: `scale(${scale})`,
    marginLeft: Math.max(0, (width - STAGE_W * scale) / 2),
  };

  const person = diagram.person;

  return (
    <div className="diagram-wrap" ref={wrapRef}>
      {wide ? (
        <div className="diagram-frame" style={frameStyle}>
          <div className="diagram-stage" style={stageStyle}>
            <svg
              className="diagram-svg"
              width={STAGE_W}
              height={STAGE_H}
              viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
              aria-hidden="true"
            >
              {connectors.map((c, i) => (
                <path
                  key={i}
                  d={c.d}
                  pathLength={1}
                  className="ln-sql"
                  style={{ animationDelay: `${c.delay}s` }}
                />
              ))}
              {labels.map((lb, i) => (
                <text
                  key={i}
                  x={lb.x}
                  y={lb.y}
                  textAnchor={lb.anchor}
                  className="lb-sql"
                  style={{ animationDelay: `${lb.delay}s` }}
                >
                  {lb.text}
                </text>
              ))}
            </svg>

            <EntCard
              ent={person}
              variant="slot"
              relation={null}
              setRef={setBox(person.id)}
              style={{
                left: person.slot.l,
                top: person.slot.t,
                width: person.slot.w,
                animationDelay: `${person.delay}s`,
              }}
            />

            {diagram.satellites.map((ent) => (
              <EntCard
                key={ent.id}
                ent={ent}
                variant="slot"
                relation={edgeLabel(ent.id)}
                setRef={setBox(ent.id)}
                style={{
                  left: ent.slot.l,
                  top: ent.slot.t,
                  width: ent.slot.w,
                  animationDelay: `${ent.delay}s`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <EntCard
            ent={person}
            variant="flow"
            relation={null}
            setRef={setBox(person.id)}
            style={{ animationDelay: `${person.delay}s` }}
          />
          {diagram.satellites.map((ent) => (
            <EntCard
              key={ent.id}
              ent={ent}
              variant="flow"
              relation={edgeLabel(ent.id)}
              setRef={setBox(ent.id)}
              style={{ animationDelay: `${ent.delay}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}