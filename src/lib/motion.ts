/**
 * The only module that touches GSAP. The component that draws the animation does
 * not own the library, it asks for a timeline -- so there is one lazy chunk and
 * one place to look when the drawer misbehaves.
 *
 * Every `gsap` reference is type-only or inside an async function, so importing
 * this module costs nothing at runtime. That matters because components import
 * the timing constants below eagerly.
 */

/** GSAP's types declare GSAPTimeline as a file-local alias, so derive it. */
type Gsap = typeof import('gsap')['gsap'];

type GsapTimeline = ReturnType<Gsap['timeline']>;
type GsapTween = ReturnType<Gsap['to']>;

/**
 * The drawer animation, as the rest of the app is allowed to see it.
 *
 * Deliberately a plain object wrapping the timeline. **A GSAP animation is
 * thenable** -- `await gsap.to(...)` is supported -- so returning one from an
 * `async` function makes the promise adopt it, and adoption waits for the
 * animation to *complete*. The timeline is paused until the caller receives it,
 * so that deadlocks: the sheet never plays and is left stuck at its closed
 * opacity behind an opaque backdrop. Exposing only these three verbs means no
 * caller can accidentally await it.
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
 * The drawer's curve, as a CustomEase rather than a built-in, so the sheet keeps
 * the exact cubic-bezier it shipped with. Its only home: GSAP cannot read a CSS
 * custom property, and a second copy would only guarantee the two drift apart.
 */
const DRAWER_EASE_ID = 'drawer';
const DRAWER_EASE_DATA = '0.32,0.72,0,1';

/** Matches the transformOrigin the sheet carried as an inline style. */
export const DRAWER_TRANSFORM_ORIGIN = 'top center';

/**
 * The sheet's closed state, in GSAP's transform vocabulary.
 *
 * Also rendered by React as an inline style, and that copy is load-bearing: a
 * paused timeline does not apply a fromTo's from-values, so nothing else holds
 * the sheet invisible between `hidden` lifting and play()'s first frame.
 */
export const DRAWER_SHEET_FROM = { opacity: 0, y: -8, scale: 0.98 } as const;

const DRAWER_SHEET_DURATION = 0.25;
const DRAWER_ITEM_DURATION = 0.2;
/** Per-item stagger. */
const DRAWER_ITEM_STAGGER = 0.035;
/** Sheet starts before the items, so the two overlap instead of queueing. */
const DRAWER_ITEM_START = 0.04;

type GsapInstance = typeof import('gsap')['gsap'];

let pending: Promise<GsapInstance> | null = null;

/**
 * Loads GSAP once and registers the drawer ease.
 *
 * Cached so concurrent callers share one fetch and the ease is registered once.
 * A failed load clears the cache rather than poisoning it, so the next attempt
 * can retry.
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
 * Warms GSAP on idle. Importing on the open tap instead costs a round trip
 * before the first frame of the animation meant to hide it. Callers should gate
 * this on a mobile media query -- the drawer is `md:hidden`.
 *
 * Failures are swallowed: nobody awaits this, so a rejection must not surface as
 * an unhandled rejection.
 */
export function preloadDrawerMotion(): void {
  void loadGsap().catch(() => {});
}

/**
 * Builds the paused drawer timeline and wraps it. Progress 0 is closed, 1 is
 * open, so the caller's intent reads straight off the timeline's position.
 *
 * `onClosed` fires when the sheet has finished leaving -- the reason this is a
 * timeline and not a CSS transition: the element must outlive its closing
 * animation, and only the animation knows when that is over.
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
        // The stagger carries its own ease, which turns an evenly spaced run of
        // delays into a settle: items leave early and land together.
        stagger: { each: DRAWER_ITEM_STAGGER, ease: 'power2.out' },
      },
      DRAWER_ITEM_START,
    );
  }

  /*
    Direction is a tween of the timeline's own progress, not `reverse()`.

    `reverse()` only travels back as far as the animation has already got, so
    dismissing 90ms into a 415ms entrance finished the exit in 90ms -- a flicker,
    at exactly the moment a reader is most likely to change their mind. Tweening
    progress to a fixed endpoint costs the same duration from wherever it is.

    `overwrite` makes an interruption an interruption rather than two animations
    fighting; an interrupted close never reaches `onComplete`, so the sheet is
    not unmounted out from under an animation still driving it.
   */
  let travelTween: GsapTween | null = null;

  const travel = (to: number, onComplete?: () => void) => {
    travelTween = gsap.to(timeline, {
      progress: to,
      duration: timeline.duration(),
      // Linear: the per-tween eases shape the values. Easing this too would
      // apply two curves to every property.
      ease: 'none',
      overwrite: true,
      onComplete,
    });
  };

  return {
    play: () => travel(1),
    reverse: () => travel(0, onClosed),
    kill: () => {
      // The progress tween writes independently of the timeline, so killing the
      // timeline alone would leave something still driving it.
      travelTween?.kill();
      timeline.kill();
    },
  };
}