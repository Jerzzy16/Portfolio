import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react';

import { getLenis } from '@/lib/smoothScroll';

/** Style object that also accepts CSS custom properties. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Scroll reveal. Purpose: storytelling, content enters in reading order.
 * Transform and opacity only. Collapses to static under reduced motion.
 *
 * Travel distance and stagger go to CSS as custom properties so the curve,
 * duration and easing live in the MOTION block of index.css rather than being
 * restated per component.
 */
type RevealTag = 'div' | 'li' | 'article' | 'section' | 'tr';

/**
 * One observer drives every reveal. Each unobserves itself on entry, so a
 * re-animation on scroll-past is impossible -- the interface never interrupts
 * a reader scrolling back up.
 */
let revealObserver: IntersectionObserver | null = null;
const revealCallbacks = new WeakMap<Element, () => void>();

function observeReveal(el: Element, onVisible: () => void): () => void {
  revealCallbacks.set(el, onVisible);

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          revealCallbacks.get(entry.target)?.();
          revealObserver?.unobserve(entry.target);
          revealCallbacks.delete(entry.target);
        }
      },
      { threshold: 0.2 },
    );
  }

  revealObserver.observe(el);

  return () => {
    revealObserver?.unobserve(el);
    revealCallbacks.delete(el);
  };
}

export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: RevealTag;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const Tag_ = Tag as ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Without IntersectionObserver there is nothing to trigger the reveal, so
    // show the content rather than leave the page permanently blank.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    return observeReveal(el, () => setVisible(true));
  }, []);

  return (
    <Tag_
      ref={ref}
      data-visible={visible ? '' : undefined}
      className={className ? `reveal ${className}` : 'reveal'}
      style={{ '--reveal-delay': `${delay * 1000}ms`, '--reveal-y': `${y}px` } as CSSVars}
    >
      {children}
    </Tag_>
  );
}

/** Whether the page has scrolled past the header. Sentinel observer, never a
 *  scroll listener. */
export function useScrolledPastHeader(offset = 12): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('header-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: `${offset}px 0px 0px 0px`, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [offset]);

  return scrolled;
}

/** Locks body scroll while the mobile drawer is open. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Lenis drives the scroll position, so body's overflow alone would freeze the
    // native scrollbar while the page behind is still open to wheel input.
    getLenis()?.stop();
    return () => {
      document.body.style.overflow = previous;
      getLenis()?.start();
    };
  }, [locked]);
}

/** Reads the prefers-reduced-motion media query, kept live. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduce(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduce;
}

/**
 * Whether the device has a real pointer to hover with -- the same query
 * Tailwind's `hover:` variants gate on, so a JS affordance and a CSS one always
 * agree on the same devices.
 *
 * Exists so hover behaviour can be skipped on touch, where a tap fires
 * pointerenter and would latch the interaction on with nothing to clear it.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    setFine(query.matches);
    const onChange = (event: MediaQueryListEvent) => setFine(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return fine;
}

/**
 * Whether an element's content overflows it horizontally, to decide if a scroll
 * container needs the accessible plumbing for one. A permanently focusable
 * `role="region"` is a phantom tab stop wherever nothing actually scrolls, so
 * this follows the real measurement rather than a guessed breakpoint.
 */
export function useOverflowX<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, overflowing];
}

export default Reveal;