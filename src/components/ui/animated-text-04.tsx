'use client';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Transition, Variants } from 'framer-motion';
import { Children, useEffect, useState } from 'react';

type TextLoopProps = {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  onIndexChange?: (index: number) => void;
};

export function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
}: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);

  /*
    Reduced motion drops the travel and keeps the swap. The site's global
    `transition-duration: 1ms !important` override cannot do this, because
    Framer writes `transform` inline on every frame instead of transitioning a
    class, so nothing in CSS can shorten it.
  */
  const reduce = useReducedMotion();

  useEffect(() => {
    const intervalMs = interval * 1000;

    const timer = setInterval(() => {
      const next = (currentIndex + 1) % items.length;
      setCurrentIndex(next);
      // Outside the updater on purpose. An updater has to be pure and React
      // invokes it twice in StrictMode, so a callback inside it fires twice per
      // change.
      onIndexChange?.(next);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [currentIndex, items.length, interval, onIndexChange]);

  const motionVariants: Variants = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -20, opacity: 0 },
      };

  return (
    /*
      Spans, not divs. This renders inside the intro <p>, and a div there is
      invalid HTML -- React logs "a <div> cannot be a descendant of <p>" and
      hydration would break on a server-rendered page.

      h-[1lh] + overflow-hidden turn the two words into a reel. With popLayout
      both are mounted at once, so without a clip they are painted on top of
      each other for the length of the transition, and the incoming word starts
      20px below the baseline on top of the line beneath it. Clipped to a single
      line box, the outgoing word leaves through the top edge and the incoming
      one arrives through the bottom. 1lh is the paragraph's own line box, so the
      box can never change the line count.
    */
    <span
      className={cn(
        'relative inline-block h-[1lh] overflow-hidden whitespace-nowrap align-bottom',
        className,
      )}
    >
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.span
          key={currentIndex}
          className='inline-block'
          initial='initial'
          animate='animate'
          exit='exit'
          transition={transition}
          variants={variants || motionVariants}
        >
          {items[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

