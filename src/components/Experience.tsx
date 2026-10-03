import { experience, queries } from '@/data/profile';
import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';

/**
 * Tabular, per the reference. Columns collapse to a 4 track stack on narrow
 * screens and open to 12 from md up, so the row keeps its four fields at any
 * width instead of overflowing.
 *
 * Only a rule above the header and between rows. A hairline under every cell
 * would turn this into a ruled spec sheet.
 */
export default function Experience() {
  return (
    <section id="experience" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader title="Experience" query={queries.experience} />
        </Reveal>

        <div className="border-t border-ink-line">
          <div className="grid grid-cols-4 gap-x-4 py-3 md:grid-cols-12 md:gap-x-6">
            <span className="tech-label">Role</span>
            <span className="tech-label">Company</span>
            <span className="tech-label">Period</span>
            <span className="tech-label md:col-span-6">Notes</span>
          </div>

          {experience.map((item, index) => (
            <Reveal
              key={`${item.company}-${item.period}`}
              delay={index * 0.05}
              className="grid grid-cols-4 gap-x-4 gap-y-2 border-t border-ink-line py-5 transition-colors duration-200 hover:bg-ink-deep md:grid-cols-12 md:gap-x-6"
            >
              <span className="text-sm font-semibold text-canvas-soft">{item.role}</span>
              <span className="font-mono text-xs text-primary">{item.company}</span>
              <span className="font-mono text-[11px] text-mute">{item.period}</span>

              <ul className="col-span-4 flex flex-col gap-1.5 md:col-span-6 md:col-start-7">
                {item.notes.map((note) => (
                  <li key={note} className="text-sm leading-relaxed text-body">
                    {note}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}