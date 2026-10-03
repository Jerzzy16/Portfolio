import { experience, queries } from '@/data/profile';
import Reveal, { useOverflowX } from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';

/**
 * A real table, because this is tabular data with a header row and repeating
 * records: a caption for the table, a header row of column headers, and cells
 * that belong to the row they sit in.
 *
 * One composition at every width. Four columns with the notes in the fourth, the
 * same as the wide layout, rather than a separate stacked arrangement per
 * breakpoint — a second layout meant the notes either had to be duplicated into
 * a second row, where they were announced twice, or squeezed into a fraction of
 * the viewport, where they were unreadable.
 *
 * Four real columns cannot fit a 375px viewport at a legible measure, so where
 * they cannot fit, the table keeps its composition and its column widths and
 * scrolls sideways instead of reflowing. That leaves the notes column around
 * 245px, which is the width it needs to be readable. The scroll region gets the
 * landmark, label and focus stop only while it is actually scrollable.
 */
export default function Experience() {
  const [scrollRef, scrolls] = useOverflowX<HTMLDivElement>();

  return (
    <section id="experience" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader title="Experience" query={queries.experience} />
        </Reveal>

        <div className="border-t border-ink-line">
          <div
            ref={scrollRef}
            role={scrolls ? 'region' : undefined}
            aria-label={scrolls ? 'Experience table, scrollable' : undefined}
            tabIndex={scrolls ? 0 : undefined}
            className="overflow-x-auto overscroll-x-contain"
          >
            <table className="w-full min-w-[680px] table-fixed border-collapse text-left">
              <caption className="sr-only">Experience by role, company, period and notes</caption>
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
                <col className="w-[36%]" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="tech-label py-3 font-normal">
                    Role
                  </th>
                  <th scope="col" className="tech-label py-3 font-normal">
                    Company
                  </th>
                  <th scope="col" className="tech-label py-3 font-normal tabular-nums">
                    Period
                  </th>
                  <th scope="col" className="tech-label py-3 font-normal">
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
                    <td className="py-5 pr-4 align-top text-sm font-semibold break-words text-canvas-soft">
                      {item.role}
                    </td>
                    <td className="py-5 pr-4 align-top font-mono text-xs break-words text-primary">
                      {item.company}
                    </td>
                    <td className="py-5 pr-4 align-top font-mono text-[11px] whitespace-nowrap tabular-nums text-mute">
                      {item.period}
                    </td>
                    <td className="py-5 align-top">
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Shown only while the table is actually scrollable. */}
        {scrolls && <p className="diagram-note">scroll the table sideways for all columns</p>}
      </div>
    </section>
  );
}