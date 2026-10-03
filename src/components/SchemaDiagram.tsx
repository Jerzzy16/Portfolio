import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { buildDiagram, routeDiagram, type Roll, type Row, STAGE_H, STAGE_W } from '@/schema';
import Corners from './Corners';
import { schemaHandle } from '@/data/profile';

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

export default function SchemaDiagram({ roll }: { roll: Roll }) {
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

  // Container width drives the scale. Never a scroll listener.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Card heights drive the connector anchors, so they are measured after layout.
  useLayoutEffect(() => {
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
  }, [diagram]);

  const { connectors, labels } = useMemo(() => routeDiagram(diagram, heights), [diagram, heights]);

  const scale = Math.min(1, width / STAGE_W);
  const frameStyle = { height: STAGE_H * scale };
  const stageStyle = {
    transform: `scale(${scale})`,
    marginLeft: Math.max(0, (width - STAGE_W * scale) / 2),
  };

  const d = diagram.dialect;
  const { person } = diagram;

  return (
    <div className="diagram-wrap" ref={wrapRef}>
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
                className={`ln-${d}`}
                style={{ animationDelay: `${c.delay}s` }}
              />
            ))}
            {labels.map((lb, i) => (
              <text
                key={i}
                x={lb.x}
                y={lb.y}
                textAnchor={lb.anchor}
                className={`lb-${d}`}
                style={{ animationDelay: `${lb.delay}s` }}
              >
                {lb.text}
              </text>
            ))}
          </svg>

          <div
            ref={setBox('db.person')}
            className="card blueprint hoverable ent ent-person"
            style={{
              left: person.slot.l,
              top: person.slot.t,
              width: person.slot.w,
              animationDelay: `${person.delay}s`,
            }}
          >
            <Corners />
            <div className={`ent-head ${d} person`}>
              <span className={`ent-title ${d}`}>{person.title}</span>
              <span className="ent-badge">{person.badge}</span>
            </div>
            <Rows rows={person.rows} />
          </div>

          {diagram.satellites.map((ent) => (
            <a
              key={ent.id}
              ref={setBox(ent.id)}
              href={ent.href}
              className="card blueprint hoverable ent ent-link"
              style={{
                left: ent.slot.l,
                top: ent.slot.t,
                width: ent.slot.w,
                animationDelay: `${ent.delay}s`,
              }}
              aria-label={`${ent.id}, ${ent.badge}, jump to ${ent.href.slice(1)}`}
            >
              <Corners />
              <div className={`ent-head ${d}`}>
                <span className={`ent-title ${d}`}>{ent.title}</span>
                <span className="ent-badge tag tag-accent">{ent.badge}</span>
              </div>
              <Rows rows={ent.rows} />
            </a>
          ))}
        </div>
      </div>

      {/* Each edge is labelled at both ends, so the cardinality reads without a
          key. This line only names the two glyphs. */}
      <p className="diagram-note">
        every collection carries one {schemaHandle} key. N marks the many side.
      </p>
    </div>
  );
}