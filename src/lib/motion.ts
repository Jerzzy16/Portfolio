/**
 * The only module that touches GSAP.
 *
 * Same arrangement as `lib/smoothScroll.ts`: the component that draws the
 * animation does not own the library, it asks for a timeline. That keeps the
 * dynamic import in one place, so there is exactly one lazy chunk and one
 * place to look when the drawer misbehaves.
 *
 * Every `gsap` reference here is either a type-only import or inside an async
 * function, so importing this module costs nothing at runtime. That matters
 * because the components import the timing constants below eagerly.
 */

/**
 * GSAP's bundled types declare `GSAPTimeline` as a file-local alias rather than
 * exporting it, so the timeline type is derived from the factory instead.
 */
type Gsap = typeof import('gsap')['gsap'];

type GsapTimeline = ReturnType<Gsap['timeline']>;
type GsapTween = ReturnType<Gsap['to']>;

/**
 * The drawer animation, as the rest of the app is allowed to see it.
 *
 * Deliberately a plain object wrapping the timeline rather than the timeline
 * itself. **A GSAP animation is thenable** -- `await gsap.to(...)` is a
 * supported GSAP feature -- so returning one directly out of an `async`
 * function makes the promise adopt it, and adoption waits for the animation to
 * *complete*. The drawer timeline is paused until the caller receives it and
 * calls play, so that is a deadlock: the promise never settles, the caller never
 * gets the timeline, the timeline never plays, and the sheet is left stuck at
 * its closed opacity behind an opaque backdrop.
 *
 * Exposing only these three verbs also means no caller can accidentally await
 * the animation, which is what caused it.
 */
export type DrawerMotion = {
  /** Runs the sheet open. */
  play: () => void;
  /** Runs the sheet closed, backwards from wherever it currently is. */
  reverse: () => void;
  /** Stops the animation where it stands. */
  kill: () => void;
};

/**
 * The drawer's curve, kept as a CustomEase rather than one of the GSAP
 * built-ins so the sheet animates on the exact cubic-bezier it shipped on
 * before GSAP existed. These are the same four numbers the retired
 * `--ease-drawer` token held; this file is now their only home, because GSAP
 * cannot read a CSS custom property and a second copy in the stylesheet would
 * only guarantee the two drift apart.
 */
const DRAWER_EASE_ID = 'drawer';
const DRAWER_EASE_DATA = '0.32,0.72,0,1';

/** Matches the `transformOrigin` the sheet carried as an inline style before. */
export const DRAWER_TRANSFORM_ORIGIN = 'top center';

/**
 * The sheet's closed state, in GSAP's transform vocabulary.
 *
 * Rendered by React as an inline style too, and that copy is load-bearing: a
 * paused GSAP timeline does not apply a `fromTo`'s from-values, so nothing else
 * is holding the sheet invisible between `hidden` lifting and `play()` running
 * the first frame.
 */
export const DRAWER_SHEET_FROM = { opacity: 0, y: -8, scale: 0.98 } as const;

const DRAWER_SHEET_DURATION = 0.25;
const DRAWER_ITEM_DURATION = 0.2;
/** Per-item delay. Was `index * 35ms` off a linear transition-delay. */
const DRAWER_ITEM_STAGGER = 0.035;
/** Sheet starts moving before the items, so the two overlap instead of queueing. */
const DRAWER_ITEM_START = 0.04;

type GsapInstance = typeof import('gsap')['gsap'];

let pending: Promise<GsapInstance> | null = null;

/**
 * Loads GSAP once and registers the drawer ease.
 *
 * Cached in a module-level promise so concurrent callers share one fetch, and
 * so a second open never re-registers the ease. A failed load clears the cache
 * rather than poisoning it: the drawer falls back to appearing without
 * animation, and the next attempt gets to try again.
 */
function loadGsap(): Promise<GsapInstance> {
  if (!pending) {
    pending = (async () => {
      const [{ gsap }, { CustomEase }] = await Promise.all([
        import('gsap'),
        import('gsap/CustomEase'),
      ]);

      gsap.registerPlugin(CustomEase);
      CustomEase.create(DRAWER_EASE_ID, DRAWER_EASE_DATA);

      return gsap;
    })().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }

  return pending;
}

/**
 * Warms GSAP while the browser is idle.
 *
 * Waiting for the import on the open tap instead costs a network round trip
 * between the tap and the first painted frame of the animation, which is
 * exactly the delay the animation was meant to hide. Callers should gate this on
 * a mobile media query: the drawer is `md:hidden`, so a desktop visitor has no
 * use for these bytes and should never pay for them.
 *
 * Failures are swallowed on purpose. This runs with no one awaiting it, and a
 * prefetch that rejects must not surface as an unhandled rejection.
 */
export function preloadDrawerMotion(): void {
  void loadGsap().catch(() => {});
}

/**
 * Builds the paused drawer timeline and wraps it. Progress 0 is closed, 1 is
 * open, so the caller's intent is readable straight off the timeline's position.
 *
 * `onClosed` fires when the sheet has finished leaving, which is the whole
 * reason this is a timeline and not a CSS transition: the element has to
 * outlive its closing animation so there is something to animate, and only the
 * animation knows when that animation is genuinely over.
 */
export async function createDrawerMotion(
  sheet: HTMLElement,
  onClosed: () => void,
): Promise<DrawerMotion> {
  const gsap = await loadGsap();
  const items = gsap.utils.toArray<HTMLElement>('[data-drawer-item]', sheet);

  const timeline: GsapTimeline = gsap.timeline({ paused: true });

  timeline.fromTo(
    sheet,
    { ...DRAWER_SHEET_FROM },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      transformOrigin: DRAWER_TRANSFORM_ORIGIN,
      duration: DRAWER_SHEET_DURATION,
      ease: DRAWER_EASE_ID,
    },
    0,
  );

  if (items.length > 0) {
    timeline.fromTo(
      items,
      { opacity: 0 },
      {
        opacity: 1,
        duration: DRAWER_ITEM_DURATION,
        ease: DRAWER_EASE_ID,
        // The stagger carries its own ease, which is what turns an evenly
        // spaced run of delays into a settle: items leave early and land
        // together instead of marching.
        stagger: { each: DRAWER_ITEM_STAGGER, ease: 'power2.out' },
      },
      DRAWER_ITEM_START,
    );
  }

  /*
    Direction is a tween of the timeline's own progress, not `play()` and
    `reverse()`.

    `reverse()` only travels back as far as the animation has already got, so
    dismissing the drawer 90ms into its 415ms entrance finished the exit in
    90ms -- a flicker, not a close, and exactly the moment a reader is most
    likely to change their mind. Tweening progress to a fixed endpoint costs the
    same duration from wherever the sheet happens to be.

    `overwrite` is what makes an interruption an interruption rather than two
    animations fighting: the new direction kills the tween running against it,
    and a close that gets interrupted never reaches `onComplete`, so the sheet is
    not unmounted out from under an animation still driving it.
   */
  let travelTween: GsapTween | null = null;

  const travel = (to: number, onComplete?: () => void) => {
    travelTween = gsap.to(timeline, {
      progress: to,
      duration: timeline.duration(),
      // Linear on purpose. The per-tween eases above are what shape the values;
      // easing this tween too would apply two curves to every property.
      ease: 'none',
      overwrite: true,
      onComplete,
    });
  };

  return {
    play: () => travel(1),
    reverse: () => travel(0, onClosed),
    kill: () => {
      // The progress tween writes to the timeline independently of it, so
      // killing the timeline alone would leave something still driving it.
      travelTween?.kill();
      timeline.kill();
    },
  };
}