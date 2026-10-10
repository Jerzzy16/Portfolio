import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';
import { queries, skillGroups } from '@/data/profile';
import { getActiveAccent } from '@/lib/palette';

/**
 * Clustered skill tiles. Brand marks from the Simple Icons CDN, tinted to the
 * active accent.
 *
 * The CDN takes the colour as a hex in the path and cannot read a CSS custom
 * property, so the resolved accent is read from the palette. A hardcoded hex
 * left every logo lime on the other five themes.
 */
export default function Skills() {
  const accent = getActiveAccent().replace('#', '');

  return (
    <section id="skills" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeader
            title="Skills"
            query={queries.skills}
          />
        </Reveal>

        <div className="flex flex-col gap-12">
          {skillGroups.map((group, groupIndex) => (
            <Reveal key={group.label} delay={groupIndex * 0.05}>
              {/* One soft divider per cluster, never a hairline per row. */}
              <div className="border-t border-ink-line pt-6">
                <h3 className="font-mono text-sm text-canvas-soft">{group.label}</h3>

                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {group.items.map((skill) => (
                    <li key={skill.name}>
                      <a
                        href="#projects"
                        className="panel group flex items-center gap-3 px-4 py-3.5 transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                      >
                        <img
                          src={`https://cdn.simpleicons.org/${skill.icon}/${accent}`}
                          alt=""
                          width={20}
                          height={20}
                          loading="lazy"
                          decoding="async"
                          className="size-5 shrink-0"
                          onError={(event) => {
                            event.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                        <span
                          translate="no"
                          className="text-sm break-words text-body transition-colors duration-200 group-hover:text-canvas-soft"
                        >
                          {skill.name}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}