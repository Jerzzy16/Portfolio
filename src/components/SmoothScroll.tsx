import { useEffect } from 'react';
import Lenis from 'lenis';

import { usePrefersReducedMotion } from '@/components/Reveal';
import { setLenis } from '@/lib/smoothScroll';

/**
 * Smooth scrolling.
 *
 * One Lenis instance for the page, mounted once at the root. `autoRaf` lets
 * Lenis own its own animation frame rather than the app running a second loop
 * beside the kinetic grid's.
 *
 * The instance is not created at all when the reader has asked for reduced
 * motion. Lenis can be told to keep running and simply not smooth
 * (`respectReducedMotion`), which is better than nothing, but it still leaves a
 * virtual-scroll layer intercepting the wheel. Letting the browser scroll
 * natively is the honest answer to that preference, and the preference is
 * watched live, so toggling it at the OS level takes effect without a reload.
 *
 * `anchors` hands internal link clicks to Lenis, so the header and footer nav
 * animate to their section instead of jumping. It reads `scroll-margin-top`
 * from the target, so the `scroll-mt-*` on each section still applies and the
 * sticky header does not cover the heading it scrolled to.
 */
export default function SmoothScroll() {
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      // Wheel only. Touch inertia is left to the platform: reproducing it here
      // fights the browser's own, and getting that wrong is worse than not
      // smoothing a finger.
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    setLenis(lenis);

    return () => {
      setLenis(null);
      lenis.destroy();
    };
  }, [reduce]);

  return null;
}