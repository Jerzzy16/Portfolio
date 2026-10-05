import { useEffect } from 'react';
import Lenis from 'lenis';

import { usePrefersReducedMotion } from '@/components/Reveal';
import { setLenis } from '@/lib/smoothScroll';

/**
 * Smooth scrolling. One Lenis instance, mounted once at the root.
 *
 * Not created at all under reduced motion: Lenis can be told not to smooth, but
 * it still leaves a virtual-scroll layer intercepting the wheel. Native browser
 * scrolling is the honest answer, and watching the preference live means
 * toggling it at the OS level takes effect without a reload.
 *
 * `anchors` hands internal link clicks to Lenis so nav animates to the section.
 * It reads `scroll-margin-top` from the target, so `scroll-mt-*` still applies
 * and the sticky header does not cover the heading.
 */
export default function SmoothScroll() {
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      // Wheel only. Reproducing touch inertia fights the browser's own, and
      // getting that wrong is worse than not smoothing a finger.
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