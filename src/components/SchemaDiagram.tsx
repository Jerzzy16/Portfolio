import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { buildDiagram, layoutDiagram, type Ent, type Roll, type Row } from '@/schema';
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

/**
 * The schema diagram. One layout at every viewport: the authored arrangement
 * inside a fixed 1120x680 stage, scaled to fit. Transformed rather than reflowed,
 * so a phone shows the same scatter and connectors as a desktop, just smaller.
 */
export default function SchemaDiagram({ roll }: { roll: Roll }) {
  const diagram = useMemo(() => buildDiagram(roll), [roll]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const boxes = useRef(new Map<string, HTMLElement>());
  const [heights, setHeights] = useState<Record<string, number>>({});

  const setBox = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) boxes.current.set(key, el);
      else boxes.current.delete(key);
    },
    [],
  );

  // Container width drives the scale. The observer fires once on observe, so there
  // is no initial read interleaved with the write it triggers.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
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

  const { connectors, labels, slots, stageW, stageH } = useMemo(
    () => layoutDiagram(diagram, heights),
    [diagram, heights],
  );

  // Until the first observation lands, fall back to stage width so scale is 1
  // rather than 0.
  const scale = Math.min(1, (width || stageW) / stageW);
  const frameStyle = { height: stageH * scale };
  const stageStyle = {
    width: stageW,
    height: stageH,
    transform: `scale(${scale})`,
    marginLeft: Math.max(0, (width - stageW * scale) / 2),
  };

  const card = (ent: Ent) => {
    const slot = slots[ent.id];
    const isRoot = ent.id === 'db.person';

    return (
      <a
        key={ent.id}
        ref={setBox(ent.id)}
        href={ent.href}
        className={`card blueprint hoverable ent ${isRoot ? 'ent-person' : 'ent-link'}`}
        style={{
          left: slot.l,
          top: slot.t,
          width: slot.w,
          animationDelay: `${ent.delay}s`,
        }}
      >
        <Corners />
        <div className={`ent-head sql${isRoot ? ' person' : ''}`}>
          <span className="ent-title sql" translate="no">
            {ent.title}
          </span>
          <span className={`ent-badge${isRoot ? '' : ' tag tag-accent'}`}>{ent.badge}</span>
        </div>
        <Rows rows={ent.rows} />
        {/*
          No aria-label, deliberately. Label in Name (WCAG 2.5.3) fails any
          accessible name that does not contain all the card's text, so a
          summarising label fights its own visible text however it is worded.
          Letting the name come from the content makes the visible text a prefix
          of it by construction; the sr-only span adds the destination, which a
          hash href conveys poorly on its own.
        */}
        <span className="sr-only">. Jump to {ent.href.slice(1)}</span>
      </a>
    );
  };

  return (
    <div className="diagram-wrap" ref={wrapRef}>
      <div className="diagram-frame" style={frameStyle}>
        <div className="diagram-stage" style={stageStyle}>
          <svg
            className="diagram-svg"
            width={stageW}
            height={stageH}
            viewBox={`0 0 ${stageW} ${stageH}`}
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

          {card(diagram.person)}
          {diagram.satellites.map(card)}
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