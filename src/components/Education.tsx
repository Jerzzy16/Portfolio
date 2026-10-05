import { education, queries } from '@/data/profile';
import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';

/**
 * Deliberately not a table, so it does not read as a second copy of the
 * Experience block.
 */
export default function Education() {
  return (
    <section id="education" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader title="Education" query={queries.education} />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {education.map((item, index) => (
            <Reveal
              key={`${item.school}-${item.period}`}
              delay={index * 0.06}
              className={`panel flex flex-col p-5 ${
                index === 0 ? 'md:col-span-7' : 'md:col-span-5'
              }`}
            >
              <span className="tech-label tabular-nums">{item.period}</span>

              <h3 className="mt-3 font-display text-lg font-extrabold tracking-tight break-words text-canvas-soft">
                {item.degree}
              </h3>

              <p className="mt-1 font-mono text-xs break-words text-primary">{item.school}</p>

              <p className="mt-4 max-w-[52ch] text-sm leading-relaxed break-words text-body">
                {item.detail}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}