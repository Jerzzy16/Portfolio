import { useEffect, useState } from 'react';
import { List, X } from '@phosphor-icons/react';

import { nav, person } from '@/data/profile';
import KineticGrid from '@/components/ui/kinetic-grid';
import {
  overlayStyle,
  usePrefersReducedMotion,
  useScrolledPastHeader,
  useScrollLock,
  type CSSVars,
} from '@/components/Reveal';

/**
 * The vector field lives only here, per the brief. It is a band behind the nav
 * that dissolves downward, so it reads as the header emerging out of the page
 * rather than as a texture laid over the whole document.
 *
 * Two stacked layers do the dissolving:
 *   1. the canvas grid, masked to a hard top edge and a soft bottom edge
 *   2. a wash in the live accent, fading from the top of the page to nothing
 * The accent is read from --color-primary-rgb, so both follow the per-load
 * palette rotation with no extra wiring.
 */
function HeaderField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[260px]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgb(var(--color-primary-rgb) / 0.13) 0%, rgb(var(--color-primary-rgb) / 0.05) 42%, transparent 88%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          // Fade the grid out downward. No scroll listener, pure mask.
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 22%, transparent 92%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 22%, transparent 92%)',
        }}
      >
        <KineticGrid
          cellSize={38}
          influenceRadius={190}
          showDots
          className="size-full"
        />
      </div>
    </div>
  );
}

export default function Header() {
  const scrolled = useScrolledPastHeader(12);
  const [open, setOpen] = useState(false);
  const reduce = usePrefersReducedMotion();

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const sheetStyle: CSSVars = {
    opacity: open ? 1 : 0,
    transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
    transformOrigin: 'top center',
    transition: reduce
      ? 'none'
      : 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 250ms cubic-bezier(0.32, 0.72, 0, 1)',
  };

  return (
    <>
      {/* Sentinel observed by useScrolledPastHeader. */}
      <div id="header-sentinel" aria-hidden="true" className="absolute top-0 h-px w-full" />

      <header
        style={overlayStyle('header')}
        className={`fixed inset-x-0 top-0 transition-[background-color,border-color] duration-300 ${
          scrolled || open ? 'border-b border-ink-line bg-ink/80' : 'border-b border-transparent'
        }`}
      >
        <HeaderField />

        {/* Nav sits above both field layers. */}
        <div className="container-page relative z-10 flex h-16 items-center justify-between gap-6">
          <a
            href="#top"
            className="font-mono text-xs tracking-[0.14em] text-canvas-soft transition-colors duration-200 hover:text-primary"
          >
            {person.wordmark}
          </a>

          {/* Single line at desktop, hairline separated. No dot separators. */}
          <nav aria-label="Primary" className="hidden items-center md:flex">
            {nav.map((item, index) => (
              <div key={item.href} className="flex items-center">
                {index > 0 && <span aria-hidden="true" className="mx-5 h-3 w-px bg-ink-line" />}
                <a
                  href={item.href}
                  className="font-mono text-xs tracking-[0.12em] text-body transition-colors duration-200 hover:text-primary"
                >
                  {item.label.toUpperCase()}
                </a>
              </div>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-sheet"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 items-center justify-center rounded-action border border-ink-line text-canvas-soft transition-[transform,border-color,color] duration-150 hover:border-primary hover:text-primary active:scale-[0.97] md:hidden"
          >
            {open ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </header>

      {/* Mobile sheet. Enters from the trigger edge, drawer curve. */}
      <div
        id="mobile-sheet"
        style={overlayStyle('sheet')}
        className={`fixed inset-0 bg-ink px-5 pb-10 pt-20 md:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        hidden={!open}
      >
        <nav aria-label="Mobile" aria-hidden={!open} className="flex flex-col" style={sheetStyle}>
          {nav.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${index * 35}ms` : '0ms' }}
              className="border-b border-ink-line py-5 font-display text-3xl font-extrabold tracking-tight text-canvas-soft transition-colors duration-150 hover:text-primary"
            >
              {item.label}
            </a>
          ))}
          <a
            href={person.links.github}
            target="_blank"
            rel="noreferrer noopener"
            className="action action-primary mt-8 w-full justify-center"
          >
            GitHub
          </a>
        </nav>
      </div>
    </>
  );
}