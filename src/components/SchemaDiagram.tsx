import { ArrowUpRight } from '@phosphor-icons/react';

import { schemaBlocks, type SchemaBlock } from '@/data/profile';
import type { CSSVars } from '@/components/Reveal';

type Connector = {
  d: string;
  label: string;
  lx: number;
  ly: number;
  dashed: boolean;
  delay: string;
};

/**
 * The hero diagram. Grid placement below drives the connector geometry:
 *   columns  0-304 / 348-652 / 696-1000   (gap 44)
 *   rows     0-188 / 232-420             (row 188, gap 44)
 * The SVG stretches to fit with preserveAspectRatio="none", and
 * non-scaling-stroke keeps every hairline exactly 1px at any width.
 */
const CONNECTORS: readonly Connector[] = [
  { d: 'M500 232 V188', label: '1', lx: 508, ly: 214, dashed: true, delay: '620ms' },
  { d: 'M348 326 H152 V232', label: '1', lx: 250, ly: 318, dashed: true, delay: '760ms' },
  { d: 'M652 326 H848 V232', label: '1', lx: 750, ly: 318, dashed: true, delay: '760ms' },
  { d: 'M420 232 V216 H152 V188', label: 'N', lx: 280, ly: 210, dashed: false, delay: '900ms' },
  { d: 'M580 232 V202 H848 V188', label: 'N', lx: 708, ly: 196, dashed: false, delay: '900ms' },
];

function SchemaPanel({ block }: { block: SchemaBlock }) {
  const highlighted = block.variant === 'primary';

  return (
    <a
      href={block.href}
      aria-label={`${block.id}, jump to ${block.href.slice(1)}`}
      className={`group panel flex flex-col overflow-hidden transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:border-primary active:scale-[0.99] ${
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
          <span
            className={`font-mono text-[10px] ${highlighted ? 'text-ink/70' : 'text-mute'}`}
          >
            {block.docs} docs
          </span>
          <ArrowUpRight
            size={12}
            weight="bold"
            aria-hidden="true"
            className={`transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 ${
              highlighted ? 'opacity-70' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
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
  const blocks = Object.fromEntries(schemaBlocks.map((block) => [block.id, block]));

  // Grid order mirrors the reference diagram: three across, three below,
  // with db.person highlighted as the root record in the centre.
  const order = [
    'db.experience',
    'db.contact',
    'db.education',
    'db.skills',
    'db.person',
    'db.projects',
  ] as const;

  return (
    <div className="relative">
      {/* Connectors. Desktop only; on mobile the panels stack and lines are dropped. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 420"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      >
        {CONNECTORS.map((connector) => (
          <g key={connector.d}>
            <path
              d={connector.d}
              fill="none"
              stroke="var(--color-primary)"
              strokeOpacity={connector.dashed ? '0.5' : '0.34'}
              strokeWidth="1"
              strokeDasharray={connector.dashed ? '5 5' : undefined}
              vectorEffect="non-scaling-stroke"
              className="draw"
              style={{ '--draw-len': 400, animationDelay: connector.delay } as CSSVars}
            />
            <text
              x={connector.lx}
              y={connector.ly}
              fill="var(--color-primary)"
              fillOpacity="0.75"
              fontFamily="var(--font-mono)"
              fontSize="9"
              className="fade"
              style={{ animationDelay: connector.delay } as CSSVars}
            >
              {connector.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="relative grid grid-cols-1 gap-6 md:auto-rows-[188px] md:grid-cols-3 md:gap-11">
        {order.map((id) => {
          const block = blocks[id];
          return block ? <SchemaPanel key={id} block={block} /> : null;
        })}
      </div>
    </div>
  );
}