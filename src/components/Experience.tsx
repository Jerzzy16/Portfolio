import { experience } from '@/data/profile';
import Reveal, { type CSSVars } from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';

/**
 * Vertical rail. The lime node is real semantic state: a position in time,
 * one per entry and no more.
 */
export default function Experience() {
  return (
    <section id="experience" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader title="Experience" />
        </Reveal>

        <ol className="relative border-l border-ink-line pl-7 md:pl-10">
          {experience.map((item, index) => (
            <Reveal
              key={`${item.company}-${item.period}`}
              as="li"
              delay={index * 0.06}
              className="relative pb-12 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="node-in absolute -left-[32px] top-1.5 size-2 rounded-full bg-primary md:-left-[44px]"
                style={{ animationDelay: `${index * 90}ms` } as CSSVars}
              />

              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="font-display text-xl font-extrabold tracking-tight text-canvas-soft">
                  {item.role}
                </h3>
                <span className="font-mono text-[11px] text-mute">{item.period}</span>
              </div>

              <p className="mt-1 font-mono text-sm text-primary">{item.company}</p>

              <ul className="mt-4 flex max-w-[68ch] flex-col gap-2">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-3 leading-relaxed text-body">
                    <span aria-hidden="true" className="mt-[11px] size-1 shrink-0 bg-ink-line" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}