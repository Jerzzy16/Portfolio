import type Lenis from 'lenis';

/**
 * Holder for the page's single Lenis instance.
 *
 * Kept apart from the component that creates it, and imported type-only, so
 * that `SmoothScroll` can reach for the shared `usePrefersReducedMotion` hook
 * while `Reveal` can stop the instance for the mobile drawer, without the two
 * modules importing each other.
 */
let instance: Lenis | null = null;

export function setLenis(next: Lenis | null): void {
  instance = next;
}

/** The live instance, for the few places that need to stop it. Null before mount, and after teardown. */
export function getLenis(): Lenis | null {
  return instance;
}