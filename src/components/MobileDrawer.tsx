import { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion, useScrollLock, type CSSVars } from '@/components/Reveal';
import { nav, person } from '@/data/profile';
import {
  createDrawerMotion,
  DRAWER_SHEET_FROM,
  DRAWER_TRANSFORM_ORIGIN,
  preloadDrawerMotion,
  type DrawerMotion,
} from '@/lib/motion';

/**
 * Mobile navigation sheet.
 *
 * `open` is intent, `present` is DOM presence. `hidden` waits for `present`,
 * which waits for the exit animation, so the sheet can animate out at all.
 *
 * GSAP is a single paused timeline tweened between progress 0 and 1, so a
 * toggle mid-flight continues from where it got to. Loaded lazily, and never
 * at all under `prefers-reduced-motion`.
 */
export default function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [present, setPresent] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const motionRef = useRef<DrawerMotion | null>(null);

  /** Latest intent, readable from the timeline's async build callback. */
  const openRef = useRef(open);

  const reduce = usePrefersReducedMotion();

  useScrollLock(open);

  // Declared first so `openRef` is already current for every effect below it in
  // this commit. No dependency array: this has to stay true on every render,
  // including the one where `present` flips and the build effect re-runs.
  useEffect(() => {
    openRef.current = open;
  });

  /*
    Warm GSAP on idle rather than on the open tap: a cold dynamic import on tap
    costs a round trip before the first frame of the animation meant to hide it.

    Gated to the breakpoint the sheet renders at (`md:hidden`), and on reduced
    motion. Not watched live -- resizing a desktop window down is not worth a
    matchMedia listener, and the first tap still works a beat later.
   */
  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    /*
      WebKit has never shipped requestIdleCallback -- it is still off by default
      in Safari Technology Preview -- so it is undefined on every iOS browser.
      Calling it bare threw a TypeError inside this effect, and React 19 treats
      an uncaught commit-phase error as fatal for the root, so the whole page
      rendered blank on a phone while desktop was fine.

      Fall back to a timeout rather than skipping: a phone is the only platform
      that needs this prefetch. Same 2s bound as the idle option's own timeout.
    */
    if (typeof window.requestIdleCallback === 'function') {
      const idle = window.requestIdleCallback(preloadDrawerMotion, { timeout: 2000 });
      return () => window.cancelIdleCallback(idle);
    }

    const timer = window.setTimeout(preloadDrawerMotion, 2000);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /*
    The drawer covers the viewport but sits below the header in z, so without
    this the page behind stays in the tab order and keyboard users walk out of
    an open menu into content they cannot see. Tied to `open`, not `present`:
    release the background on dismissal, not after the slide-out.
   */
  useEffect(() => {
    const behind = [
      document.querySelector('a[href="#main"]'),
      document.querySelector('main'),
      document.querySelector('footer'),
    ];

    if (!open) {
      behind.forEach((el) => el?.removeAttribute('inert'));
      return;
    }

    behind.forEach((el) => el?.setAttribute('inert', ''));
    drawerRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [open]);

  /*
    Without reduced motion there is no timeline, so this effect owns the exit.
    With one, the animation's onComplete is what drops `present`.
   */
  useEffect(() => {
    if (open) setPresent(true);
    else if (reduce) setPresent(false);
  }, [open, reduce]);

  /**
   * Builds the animation while the sheet is on screen, once.
   *
   * Keyed on `present`, not `open`, so a close does not tear it down -- the
   * reverse is what performs the exit.
   */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!present || reduce || !sheet) return;

    let cancelled = false;
    let built: DrawerMotion | null = null;

    void createDrawerMotion(sheet, () => setPresent(false))
      .then((motion) => {
        // Unmounted, or reduced motion switched on, while the import was in
        // flight.
        if (cancelled) {
          motion.kill();
          return;
        }

        /*
          * Dismissed before GSAP finished loading, so the play/reverse effect
          * below already ran against nothing. Settle here rather than leaving a
          * full-viewport backdrop parked over the page.
         */
        if (!openRef.current) {
          motion.kill();
          setPresent(false);
          return;
        }

        built = motion;
        motionRef.current = motion;
        motion.play();
      })
      .catch(() => {
        /*
          * GSAP failed to load -- offline chunk, blocked CDN, proxy. Fall back
          * to a drawer that is simply already open, and retry on the next tap.
         */
        if (!cancelled) setPresent(false);
      });

    return () => {
      cancelled = true;
      motionRef.current = null;
      built?.kill();
    };
  }, [present, reduce]);

  /** Turns intent into direction. A no-op until the animation exists. */
  useEffect(() => {
    const motion = motionRef.current;
    if (!motion) return;

    if (open) motion.play();
    else motion.reverse();
  }, [open]);

  /*
    Load-bearing, not belt-and-braces. A paused timeline does not apply a
    fromTo's from-values, so between `hidden` lifting and play()'s first frame
    this is the only thing holding the sheet invisible -- otherwise the
    full-viewport backdrop paints on its own with the links still transparent.

    React rewrites these only when the values change, so a mid-animation
    re-render does not stamp `opacity: 0` back over GSAP's in-flight value.
   */
  const sheetStyle: CSSVars | undefined = reduce
    ? undefined
    : {
        opacity: DRAWER_SHEET_FROM.opacity,
        transform: `translateY(${DRAWER_SHEET_FROM.y}px) scale(${DRAWER_SHEET_FROM.scale})`,
        transformOrigin: DRAWER_TRANSFORM_ORIGIN,
      };

  return (
    <div
      id="mobile-drawer"
      ref={drawerRef}
      hidden={!present}
      aria-hidden={!open}
      className={`drawer fixed inset-0 z-40 overflow-y-auto bg-ink md:hidden ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <nav ref={sheetRef} aria-label="Mobile" className="flex flex-col" style={sheetStyle}>
        {nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            data-drawer-item
            onClick={onClose}
            className="border-b border-ink-line py-5 font-display text-3xl font-extrabold tracking-tight text-canvas-soft transition-colors duration-150 hover:text-primary"
          >
            {item.label}
          </a>
        ))}
        <a
          href={person.links.github}
          target="_blank"
          rel="noreferrer noopener"
          data-drawer-item
          className="action action-primary mt-8 w-full justify-center"
        >
          GitHub
        </a>
      </nav>
    </div>
  );
}