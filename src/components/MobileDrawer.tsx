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
 * The mobile navigation sheet.
 *
 * Two pieces of state, and keeping them apart is the point of this component.
 * `open` is intent -- the reader pressed the toggle. `present` is whether the
 * sheet is in the DOM. They used to be one value, and `hidden={!open}` meant
 * the element stopped existing the instant intent flipped, so the drawer could
 * ease in but had no way to ease out. Now `hidden` waits for `present`, which
 * waits for the exit animation to finish.
 *
 * The animation is a single paused GSAP timeline at progress 0 (closed) or 1
 * (open), held behind a small handle, so a toggle mid-flight is a `reverse()`
 * rather than a fresh tween: the sheet continues from wherever it had got to
 * instead of jumping. See `lib/motion.ts` for why GSAP is loaded lazily.
 *
 * GSAP is never loaded under `prefers-reduced-motion`. That check runs before
 * the import, so those readers get an instant, unanimated drawer and download
 * none of it, rather than downloading a library to animate nothing.
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
    Warm GSAP while the browser is idle rather than on the open tap. Between a
    tap and a cold dynamic import there is a network round trip, which delays
    the first painted frame of the very animation meant to cover that delay.

    Gated on the breakpoint the drawer actually renders at. The sheet is
    `md:hidden`, so a desktop reader never opens it and should never download
    it. The media query is not watched live: resizing a desktop window down to
    phone width mid-session is not worth a matchMedia listener, and the first
    tap still works without the prefetch, just a beat later.

    Also gated on reduced motion, which `usePrefersReducedMotion` reports as
    `false` until its own effect has read the query. The prefetch is scheduled on
    that first pass and cancelled on the next, but `requestIdleCallback` cannot
    fire until the browser goes idle -- well after React has re-rendered with the
    real value -- so a reader who asked for reduced motion still never downloads
    GSAP.
   */
  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    const idle = window.requestIdleCallback(preloadDrawerMotion, { timeout: 2000 });
    return () => window.cancelIdleCallback(idle);
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
    this the page behind stays in the tab order and keyboard users walk straight
    out of an open menu into content they cannot see. `inert` removes the
    background from both the tab order and the accessibility tree, and moves
    focus into the drawer.

    Tied to `open`, not `present`: the background is released the moment the
    reader dismisses the sheet, not once the sheet has finished sliding away.
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
    Entering needs no explicit `setPresent(false)` on the way out -- the exit
    animation owns that, via the timeline's `onReverseComplete`. Without
    reduced motion there is no timeline, so this effect owns the whole
    lifecycle itself.
   */
  useEffect(() => {
    if (open) setPresent(true);
    else if (reduce) setPresent(false);
  }, [open, reduce]);

  /**
   * Builds the animation for as long as the sheet is on screen, and only once.
   *
   * Keyed on `present` rather than `open` so a close does not tear it down:
   * reversing it is what performs the exit. Cleanup runs when `present` finally
   * drops, which is after the exit has already played out.
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
          * Dismissed again before GSAP finished loading, so the play/reverse
          * effect below already ran against nothing. Settle it here rather than
          * leaving a full-viewport backdrop parked over the page.
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
          * GSAP failed to load -- an offline chunk, a blocked CDN, a corporate
          * proxy. The honest fallback is a drawer that is simply already open,
          * so drop `present` and let the next tap retry the import. Nothing
          * here is left invisible or unclickable.
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
    The closed state is painted from React as well as from GSAP, and this copy
    is load-bearing rather than belt-and-braces: a paused GSAP timeline does not
    apply a `fromTo`'s from-values, so between `hidden` lifting and `play()`
    running its first frame, this inline style is the only thing holding the
    sheet invisible. Without it the backdrop would paint on its own -- it is a
    full-viewport `bg-ink` div that no tween targets -- with the links still
    transparent inside it.

    React rewrites these properties only when their values change, so re-rendering
    mid-animation does not stamp `opacity: 0` back over GSAP's in-flight value.

    Under reduced motion there is no animation coming at all, so the resting
    state is just "no inline style".
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