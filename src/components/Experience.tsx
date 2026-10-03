import { experience, queries } from '@/data/profile';
import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';

/**
 * A real table, because this is tabular data with a header row and repeating
 * records. It reads as a grid visually but the semantics are genuine: a caption
 * for the table, a header row of column headers, and cells that belong to the
 * row they sit in.
 *
 * The responsive behaviour comes from which row holds the notes, not from
 * stripping the table down to divs:
 *
 *   md+   notes live in the fourth column of the row
 *   below notes get their own full-width row, so they are never squeezed into
 *         a 4-track column that is too narrow to read
 *
 * Exactly one of those two is displayed at any width, so the notes are never
 * announced twice.
 */
export default function Experience() {
  return (
    <section id="experience" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader title="Experience" query={queries.experience} />
        </Reveal>

        <div className="border-t border-ink-line">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">
              Experience by role, company, period and notes
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="tech-label w-1/4 py-3 font-normal md:w-3/12 md:pr-6"
                >
                  Role
                </th>
                <th scope="col" className="tech-label w-1/4 py-3 font-normal md:w-2/12 md:pr-6">
                  Company
                </th>
                <th
                  scope="col"
                  className="tech-label w-1/4 py-3 font-normal tabular-nums md:w-2/12 md:pr-6"
                >
                  Period
                </th>
                <th scope="col" className="tech-label hidden py-3 font-normal md:table-cell md:w-6/12">
                  Notes
                </th>
              </tr>
            </thead>

            <tbody>
              {experience.map((item, index) => (
                <Reveal
                  key={`${item.company}-${item.period}`}
                  as="tr"
                  delay={index * 0.05}
                  className="border-t border-ink-line"
                >
                  <td className="pt-5 pr-4 align-top text-sm font-semibold text-canvas-soft md:py-5 md:pr-6">
                    {item.role}
                  </td>
                  <td className="pt-5 pr-4 align-top font-mono text-xs text-primary md:py-5 md:pr-6">
                    {item.company}
                  </td>
                  <td className="pt-5 align-top font-mono text-[11px] whitespace-nowrap tabular-nums text-mute md:py-5">
                    {item.period}
                  </td>
                  <td className="hidden pb-5 align-top pt-5 md:table-cell">
                    <ul className="flex flex-col gap-1.5">
                      {item.notes.map((note) => (
                        <li key={note} className="text-sm leading-relaxed text-body">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </td>
                </Reveal>
              ))}

              {/* Mobile-only notes row, tucked directly under its entry so the
                  two read as one record. No rule above it: the entry row
                  already carries the divider. */}
              {experience.map((item) => (
                <tr key={`notes-${item.company}-${item.period}`} className="md:hidden">
                  <td colSpan={4} className="pb-5">
                    <ul className="flex flex-col gap-1.5">
                      {item.notes.map((note) => (
                        <li key={note} className="text-sm leading-relaxed text-body">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}