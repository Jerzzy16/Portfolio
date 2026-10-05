import { ArrowUpRight } from '@phosphor-icons/react';

import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';
import { projects, queries, type ProjectSpan, type ProjectStatus } from '@/data/profile';

// Row 1: 7 + 5. Row 2: (feature bleeds) + 5. Row 3: 5 + 7. Always 12 columns.
const SPAN: Record<ProjectSpan, string> = {
  feature: 'md:col-span-7 md:row-span-2',
  third: 'md:col-span-5',
  seven: 'md:col-span-7',
};

/*
  What the browser should think it is fetching, in CSS pixels, so it can pick a
  srcset candidate before layout. Mirrors SPAN: one column on mobile, 7 or 5 of
  12 from md up, inside container-page's gutters.
 */
const SIZES: Record<ProjectSpan, string> = {
  feature: '(min-width: 768px) 56vw, 92vw',
  seven: '(min-width: 768px) 56vw, 92vw',
  third: '(min-width: 768px) 40vw, 92vw',
};

const SRCSET_WIDTHS = [320, 480, 640, 800, 960, 1200, 1600];

/**
 * Builds a srcset from the authored Picsum URL, whose trailing `/<w>/<h>` is the
 * only part that changes -- so candidates derive from the intrinsic size instead
 * of being hand-maintained. Anything wider than intrinsic is dropped: upscaling
 * costs bytes and buys nothing, since `object-cover` already scales to the box.
 */
function responsiveSrcSet(image: string, width: number, height: number): string {
  const base = image.replace(/\/\d+\/\d+$/, '');
  const ratio = height / width;

  return SRCSET_WIDTHS.filter((candidate) => candidate <= width)
    .map((candidate) => `${base}/${candidate}/${Math.round(candidate * ratio)} ${candidate}w`)
    .join(', ');
}

const STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  shipped: { label: 'shipped', className: 'border-positive/40 text-positive' },
  in_progress: { label: 'in progress', className: 'border-primary/50 text-primary' },
  prototype: { label: 'prototype', className: 'border-ink-line text-mute' },
};

export default function Projects() {
  return (
    <section id="projects" className="relative scroll-mt-20">
      <div className="container-page">
        <Reveal>
          <SectionHeader
            title="Projects"
            query={queries.projects}
            note="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          {projects.map((project, index) => {
            const status = STATUS[project.status];
            // The fifth cell breaks the image rhythm with a spec panel instead.
            const showImage = index < 4;

            return (
              <Reveal
                key={project.title}
                as="article"
                delay={index * 0.06}
                className={`panel group flex flex-col overflow-hidden ${SPAN[project.span]}`}
              >
                {showImage ? (
                  <div className="relative min-h-[210px] flex-1 overflow-hidden">
                    <img
                      src={project.image}
                      srcSet={responsiveSrcSet(
                        project.image,
                        project.imageWidth,
                        project.imageHeight,
                      )}
                      sizes={SIZES[project.span]}
                      alt=""
                      width={project.imageWidth}
                      height={project.imageHeight}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 size-full object-cover grayscale opacity-55 transition-[filter,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-80"
                    />
                    {index === 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-primary/10 mix-blend-color"
                      />
                    )}
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    className="relative flex-1 border-b border-ink-line"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(var(--color-primary-rgb), 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(var(--color-primary-rgb), 0.14) 1px, transparent 1px)',
                      backgroundSize: '22px 22px',
                    }}
                  >
                    <dl className="grid grid-cols-2 gap-px bg-ink-line">
                      {project.stack.map((item) => (
                        <div key={item} className="bg-ink-deep/70 px-4 py-5">
                          <dt className="tech-label">module</dt>
                          <dd className="mt-1 font-mono text-xs text-canvas-soft">{item}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="min-w-0 font-display text-xl font-extrabold tracking-tight break-words text-canvas-soft">
                      {project.title}
                    </h3>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-mute">
                      {project.year}
                    </span>
                  </div>

                  <p className="mt-3 leading-relaxed break-words text-body">{project.blurb}</p>

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 pt-4">
                    {project.stack.map((item) => (
                      <span
                        key={item}
                        translate="no"
                        className="font-mono text-[11px] text-mute"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                    <span
                      className={`rounded-action border px-3 py-1 font-mono text-[10px] tracking-[0.06em] uppercase ${status.className}`}
                    >
                      {status.label}
                    </span>

                    <a
                      href={project.href}
                      aria-label={`Open ${project.title}`}
                      className="flex size-9 shrink-0 items-center justify-center rounded-action border border-ink-line text-mute transition-[transform,border-color,color] duration-150 hover:border-primary hover:text-primary active:scale-[0.94]"
                    >
                      <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}