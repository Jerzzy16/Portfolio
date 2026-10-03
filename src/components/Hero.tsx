import type { CSSVars } from '@/components/Reveal';
import SchemaDiagram from '@/components/SchemaDiagram';
import { person, schemaLabel } from '@/data/profile';

export default function Hero() {
  return (
    <section id="top" className="relative pt-28 pb-16 md:pt-24 md:pb-24">
      <div className="container-page">
        {/* Eyebrow. The only one on the page. */}
        <p className="rise tech-label text-center" style={{ animationDelay: '0ms' } as CSSVars}>
          <span className="text-canvas-soft">{schemaLabel.name}</span>
          <span aria-hidden="true" className="mx-2 text-ink-line">
            /
          </span>
          <span>{schemaLabel.rev}</span>
        </p>

        <h1
          className="rise text-display mt-6 text-center text-primary"
          style={{ animationDelay: '70ms' } as CSSVars}
        >
          {person.name}
        </h1>

        <p
          className="rise mx-auto mt-6 max-w-[62ch] text-center text-base leading-relaxed text-body md:text-lg"
          style={{ animationDelay: '140ms' } as CSSVars}
        >
          {person.intro}
        </p>

        <div className="rise mt-16 md:mt-24" style={{ animationDelay: '280ms' } as CSSVars}>
          <SchemaDiagram />
        </div>
      </div>
    </section>
  );
}