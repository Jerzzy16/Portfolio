import { useState } from 'react';

import type { CSSVars } from '@/components/Reveal';
import SchemaDiagram from '@/components/SchemaDiagram';
import KineticGrid from '@/components/ui/kinetic-grid';
import { TextLoop } from '@/components/ui/animated-text-04';
import { person, schemaLabel } from '@/data/profile';
import type { Roll } from '@/schema';

const ROLLS: readonly Roll[] = [0, 1, 2, 3];

/**
 * The intro is a template: `{roles}` is the one token it takes, and the reel
 * takes that slot. Splitting rather than interpolating means the roles are live
 * text in the sentence instead of a frozen copy of it, and it keeps the string
 * in profile.ts readable as prose. The trailing default is the guard for a
 * future edit that drops the token -- without it the sentence would end silently
 * after "I'm a".
 */
const [INTRO_HEAD, INTRO_TAIL = ''] = person.intro.split('{roles}');

/**
 * The vector field. Per the brief it fills this container and stops where the
 * projects section begins, so the hero reads as a lit panel that the page
 * emerges from rather than as a texture laid over everything.
 *
 * Two stacked layers do the dissolving:
 *   1. an accent wash, strongest at the top of the page, gone by the fold
 *   2. the canvas grid, masked to a hard top edge and a soft bottom edge
 *
 * The accent is read from --color-primary-rgb at paint time, so both follow the
 * per-load theme rotation with no extra wiring.
 */
function VectorField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(var(--color-primary-rgb), 0.14) 0%, rgba(var(--color-primary-rgb), 0.05) 45%, transparent 88%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 46%, transparent 96%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 46%, transparent 96%)',
        }}
      >
        <KineticGrid cellSize={54} influenceRadius={250} className="size-full" />
      </div>
    </div>
  );
}

export default function Hero() {
  // Re-rolled on every page load. Frozen for the lifetime of the page so the
  // connectors are not re-routed while the reader is looking at them.
  const [roll] = useState<Roll>(() => ROLLS[Math.floor(Math.random() * ROLLS.length)]);

  return (
    /*
      min-h-svh on mobile only, and it is a CLS fix rather than a stylistic
      flourish. This is a client-rendered app, so #root is empty until React
      commits at ~2.8s on a throttled phone. At 412x823 the hero used to end at
      y=665, which left #projects sitting in the initial viewport -- and an
      element inserted into a painted viewport is scored as a layout shift,
      worth 0.106 on its own. Filling the screen means the next section starts
      below the fold and has nothing to displace. Desktop is explicitly opted
      out: the diagram is authored at 1120x680 and is taller than the viewport
      there anyway.
    */
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col justify-center pt-32 pb-12 md:min-h-0"
    >
      <VectorField />

      <div className="container-page relative z-10">
        {/* Eyebrow. The only one on the page. Hidden on mobile, where the
            header already carries the schema label directly above this. */}
        <p
          translate="no"
          className="rise tech-label hidden text-center md:block"
          style={{ animationDelay: '0ms' } as CSSVars}
        >
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
          style={{ animationDelay: '210ms' } as CSSVars}
        >
          {INTRO_HEAD}
          {/* Weight and accent, not a font swap: the loop sits mid-sentence, and
              swapping families halfway through a line reads as a mistake. */}
          <TextLoop className="font-semibold text-primary" interval={2}>
            {person.roles.map((role) => (
              <span key={role}>{role}</span>
            ))}
          </TextLoop>
          {/* The loop only ever has the current role in the DOM, so a screen
              reader would only ever hear one of the three. This gives it the
              whole set, once, in the same slot. */}
          <span className="sr-only">{person.roles.join(', ')}</span>
          {INTRO_TAIL}
        </p>

        <div className="rise mt-14 md:mt-20" style={{ animationDelay: '350ms' } as CSSVars}>
          <SchemaDiagram roll={roll} />
        </div>
      </div>
    </section>
  );
}