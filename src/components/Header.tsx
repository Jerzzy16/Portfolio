import { List, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import MobileDrawer from '@/components/MobileDrawer';
import { useScrolledPastHeader } from '@/components/Reveal';
import { nav, schemaLabel } from '@/data/profile';

/**
 * Desktop shows all five links on one line. Below md they collapse into a
 * drawer, because the full set cannot fit a 320px viewport at a legible size.
 *
 * This component owns only the intent to show the drawer. The sheet itself --
 * its presence, animation and background inerting -- belongs to MobileDrawer.
 *
 * The header carries no vector field of its own. The hero owns the field and
 * spans behind the nav while the page is at the top, so drawing one here too
 * would double the texture and break the fade at the projects boundary.
 */
export default function Header() {
  const scrolled = useScrolledPastHeader(12);
  const [open, setOpen] = useState(false);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  /** Stable, so MobileDrawer's Escape listener is not rebuilt on every render. */
  const close = useCallback(() => setOpen(false), []);

  /*
    Return focus to the trigger once the drawer is dismissed. Focus moved into
    the sheet on open, and leaving it on a link that is animating out of the
    accessibility tree would drop the reader at the document root.

    Fires on dismissal rather than on the exit finishing -- waiting 250ms to
    hand focus back is a worse experience than handing it back immediately.
   */
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }

    if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Sentinel observed by useScrolledPastHeader. */}
      <div id="header-sentinel" aria-hidden="true" className="absolute top-0 h-px w-full" />

      <header
        className={`header-bar fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
          scrolled || open
            ? 'border-b border-ink-line bg-ink/80'
            : 'border-b border-transparent'
        }`}
      >
        <div className="container-page relative z-10 flex h-16 items-center justify-between gap-6">
          <a
            href="#top"
            translate="no"
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
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 items-center justify-center text-canvas-soft transition-[transform,border-color,color] duration-150 hover:border-primary hover:text-primary active:scale-[0.97] md:hidden"
          >
            {open ? (
              <X size={18} weight="bold" aria-hidden="true" />
            ) : (
              <List size={18} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Enters from the trigger edge on the drawer curve. The header sits above
          it so the close button is always reachable. */}
      <MobileDrawer open={open} onClose={close} />
    </>
  );
}