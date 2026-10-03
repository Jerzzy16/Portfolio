import { useEffect, useState } from 'react';
import { List, X } from '@phosphor-icons/react';

import { nav, person, schemaLabel } from '@/data/profile';
import {
  usePrefersReducedMotion,
  useScrolledPastHeader,
  useScrollLock,
  type CSSVars,
} from '@/components/Reveal';

/**
 * Desktop shows all five links on one line. Below md they collapse into a
 * drawer, because the full set cannot fit a 320px viewport at a legible size.
 *
 * The header carries no vector field of its own. The hero owns the field and
 * spans behind the nav while the page is at the top, so drawing one here too
 * would double the texture and break the fade at the projects boundary.
 */
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
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
          scrolled || open
            ? 'border-b border-ink-line bg-ink/80'
            : 'border-b border-transparent'
        }`}
      >
        <div className="container-page relative z-10 flex h-16 items-center justify-between gap-6">
          <a
            href="#top"
            className="font-mono text-[9.5px] tracking-[0.08em] text-canvas-soft transition-colors duration-200 hover:text-primary md:text-xs md:tracking-[0.14em]"
          >
            {schemaLabel.name}
            <span className="mx-1.5 hidden text-ink-line md:inline">
              /
            </span>
            <span className="hidden md:inline">{schemaLabel.rev}</span>
          </a>

          <nav aria-label="Primary" className="hidden items-center md:flex">
            {nav.map((item, index) => (
              <div key={item.href} className="flex items-center">
                {index > 0 && <span aria-hidden="true" className="nav-rule" />}
                <a href={item.href} className="nav-link">
                  {item.label.toUpperCase()}
                </a>
              </div>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 items-center justify-center rounded-action border border-ink-line text-canvas-soft transition-[transform,border-color,color] duration-150 hover:border-primary hover:text-primary active:scale-[0.97] md:hidden"
          >
            {open ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </header>

      {/* Drawer. Enters from the trigger edge on the drawer curve. The header
          sits above it so the close button is always reachable. */}
      <div
        id="mobile-drawer"
        className={`fixed inset-0 z-40 bg-ink px-5 pb-10 pt-20 md:hidden ${
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