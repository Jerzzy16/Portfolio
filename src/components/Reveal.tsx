import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Style object that also accepts CSS custom properties. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Scroll reveal. Purpose: storytelling, content enters in reading order.
 * Transform and opacity only. Collapses to static under reduced motion.
 */
type RevealTag = 'div' | 'li' | 'article' | 'section';

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
  const reduce = useReducedMotion();
  const MotionTag = motion[Tag];

  if (reduce) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/** Tracks whether the page has scrolled past the header, using an
 *  IntersectionObserver sentinel. Never a scroll listener. */
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
    return () => {
      document.body.style.overflow = previous;
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

export default Reveal;