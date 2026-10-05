'use client';

import { useCallback, useEffect, useState } from 'react';

import { useFinePointer } from '@/components/Reveal';
import { cn } from '@/lib/utils';

/*
 * Adapted from the supplied animated-text-04, which was a block of its own below
 * the h1. Seven deliberate departures from the original, all documented where
 * they occur:
 *   1. The copy is a prop. profile.ts is the single source of page copy, so
 *      hardcoding role strings here would be the one place on the site that
 *      has to be edited separately.
 *   2. Colour is the page accent, not four fixed Tailwind hues. lib/palette.ts
 *      rewrites --color-primary on every page load, so the original's
 *      blue/orange/teal/sky would be the only colours on the page that ignore
 *      the rotation -- wrong on five of the six themes.
 *   3. It runs INLINE, inside a sentence, rather than owning a line. The intro
 *      is 'I'm a {roles} passionate about...', so every element here has to stay
 *      in the inline formatting context: one block-level box inside the <p> and
 *      the browser splits the sentence into anonymous blocks, dropping
 *      'passionate about...' onto its own line. Hence spans and inline-flex.
 *   4. The list is rendered twice so the cycle only ever travels forwards. See
 *      the index effect below.
 *   5. The visible stack is hidden from assistive tech and the roles are
 *      exposed once as a list. The original stacked every role in the DOM, so a
 *      screen reader announced all of them at once instead of the current one.
 *   6. Under prefers-reduced-motion only the slide is dropped. The strings
 *      still rotate, they just swap instead of travelling, so the information
 *      on the page is identical either way.
 *   7. It pauses while the pointer is on it, and only on devices with a real
 *      pointer. A reel that keeps turning under a cursor parked on it is the one
 *      thing a reader cannot read.
 */

/** How long each role is held before the reel moves on. Two seconds is long
 *  enough to have read it and short enough that the page never feels stalled. */
const HOLD_MS = 2000;

/** Travel time for one row. Shorter than the original's 700ms because the
 *  motion is now inside a sentence the reader is actively parsing -- a reel that
 *  takes 700ms to settle drags against the reading rhythm. */
const SLIDE_MS = 500;

export interface AnimatedTextRollerProps {
  /** The strings to cycle, in order. */
  roles: readonly string[];
  /** Time each string is held, in ms. */
  intervalMs?: number;
  className?: string;
}

export default function AnimatedTextRoller({
  roles,
  intervalMs = HOLD_MS,
  className,
}: AnimatedTextRollerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const finePointer = useFinePointer();

  /*
    index runs 0..roles.length, one step past the last item. The list is
    duplicated, so at index === roles.length the top of the visible window is
    showing the SECOND copy's first item -- which is the same string the first
    copy's first item would show. Wrapping back to 0 is therefore a jump between
    two identical renders and reads as nothing at all, and the cycle appears to
    travel forward forever instead of rewinding the whole stack on every lap.

    `paused` is a dependency rather than a separate clearInterval call, so the
    pointer handlers stay declarative and there is no interval id to leak. It
    also means leaving the reel restarts a FULL hold rather than resuming
    mid-countdown -- the pointer is the reader asking for time, not for the
    remainder of the old one.
  */
  useEffect(() => {
    if (roles.length < 2 || paused) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev >= roles.length ? 0 : prev + 1));
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, paused, roles.length]);

  /*
    Only bound on a fine pointer. On touch a tap fires pointerenter and there is
    no hover to leave, so the reel would latch paused and stay that way.
  */
  const hold = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  if (roles.length === 0) return null;

  return (
    <>
      {/*
        The window. inline-flex, not flex: a flex container is block-level and
        would break the paragraph. h-[1lh] is one line box of the surrounding
        copy, so the window is exactly as tall as the sentence it sits in and
        cannot change the line count -- 1lh tracks whatever leading the
        paragraph sets, including the md:text-lg step, with no second number to
        keep in sync. align-bottom because the default baseline alignment reads
        the baseline off the LAST row in the stack, which is a different string
        from the one on screen. items-start so the stack keeps its full height
        and the window, not the stack, is what clips.
      */}
      <span
        aria-hidden="true"
        onPointerEnter={finePointer ? hold : undefined}
        onPointerLeave={finePointer ? resume : undefined}
        className={cn(
          'inline-flex h-[1lh] items-start overflow-hidden align-bottom',
          className,
        )}
      >
        <span
          className="flex flex-col transition-transform ease-in-out-ui motion-reduce:transition-none"
          style={{
            transform: `translateY(calc(${index} * -1lh))`,
            transitionDuration: `${SLIDE_MS}ms`,
          }}
        >
          {[...roles, ...roles].map((role, i) => (
            <span
              key={i}
              /*
                nowrap: a role is one unbreakable unit, so it clips rather than
                wrapping mid-phrase.

                justify-center is load-bearing. The window has to be as wide as the
                LONGEST role or that role clips sideways, which makes the window
                a fixed-width slot; centring each role inside it splits the slack
                evenly instead of leaving a hole before 'passionate'. The
                alternative -- letting the window shrink to each role -- re-wraps
                the rest of the sentence every time the reel turns.
              */
              className="flex h-[1lh] items-center justify-center whitespace-nowrap"
            >
              {role}
            </span>
          ))}
        </span>
      </span>

      {/*
        What a screen reader gets instead: every role once, in order, sitting in
        the same position in the sentence the reel occupies.

        Deliberately NOT an aria-live region. This text changes every two
        seconds, and a polite live region queues an announcement per change --
        a screen reader would be interrupted by the role indefinitely, for as
        long as the reader stayed on the page. This copy is static, so it is
        read once in context and then left alone.
      */}
      <span className="sr-only">{roles.join(', ')}</span>
    </>
  );
}