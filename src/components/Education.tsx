import { education } from '@/data/profile';
import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';

/**
 * Ledger layout. Rows separated by whitespace and a single rule above the
 * group, not a hairline under every row.
 */
export default function Education() {
  return (
    <section id="education" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader title="Education" />
        </Reveal>

        <div className="border-t border-ink-line">
          {education.map((item, index) => (
            <Reveal
              key={`${item.school}-${item.period}`}
              delay={index * 0.06}
              className="grid grid-cols-1 gap-3 border-b border-ink-line py-7 transition-colors duration-200 hover:bg-ink-deep md:grid-cols-12 md:gap-8"
            >
              <div className="md:col-span-3">
                <span className="font-mono text-[11px] text-mute">{item.period}</span>
              </div>

              <div className="md:col-span-4">
                <h3 className="font-display text-lg font-extrabold tracking-tight text-canvas-soft">
                  {item.degree}
                </h3>
                <p className="mt-1 font-mono text-xs text-primary">{item.school}</p>
              </div>

              <div className="md:col-span-5">
                <p className="leading-relaxed text-body">{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}