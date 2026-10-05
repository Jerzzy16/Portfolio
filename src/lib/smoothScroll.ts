import type Lenis from 'lenis';

/**
 * Holder for the page's single Lenis instance. Kept apart from the component that
 * creates it so SmoothScroll and Reveal can both reach it without importing each
 * other.
 */
let instance: Lenis | null = null;

export function setLenis(next: Lenis | null): void {
  instance = next;
}

/** The live instance. Null before mount and after teardown. */
export function getLenis(): Lenis | null {
  return instance;
}