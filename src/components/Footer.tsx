import { nav, person } from '@/data/profile';

export default function Footer() {
  // Localised, so a reader in another locale does not get an unfamiliar order.
  const year = new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(new Date());

  return (
    <footer className="relative border-t border-ink-line py-12">
      <div className="container-page flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <p className="font-display text-2xl font-extrabold tracking-tight text-canvas-soft">
            {person.name}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-body">
            {person.role}. {person.tagline}
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-xs tracking-[0.1em] text-mute transition-colors duration-200 hover:text-primary"
            >
              {item.label.toUpperCase()}
            </a>
          ))}
        </nav>

<div className="flex flex-col gap-3">
            <a
              href={`mailto:${person.links.email}`}
              translate="no"
              className="font-mono text-xs tracking-[0.06em] break-all text-body transition-colors duration-200 hover:text-primary"
            >
              {person.links.email}
            </a>
            <a
              href={person.links.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              translate="no"
              className="font-mono text-xs tracking-[0.06em] text-mute transition-colors duration-200 hover:text-primary"
            >
              LINKEDIN
            </a>
            <span className="font-mono text-xs tracking-[0.06em] text-mute">
              {person.location}
            </span>
          </div>
      </div>

      <div className="container-page mt-12 border-t border-ink-line pt-6">
        <p className="font-mono text-[11px] text-mute">
          {year} {person.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}