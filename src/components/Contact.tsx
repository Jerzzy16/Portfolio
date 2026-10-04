import { ArrowRight, EnvelopeSimple } from '@phosphor-icons/react';

import Reveal from '@/components/Reveal';
import { person, queries } from '@/data/profile';

export default function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="container-page">
        <Reveal>
          <div className="panel overflow-hidden px-6 py-14 md:px-14 md:py-20">
            <p className="tech-label">{queries.contact}</p>

            <h2 className="text-section-title mt-5 max-w-[16ch] text-[length:var(--text-display)] text-primary">
              CONNECT WITH ME
            </h2>

            <p className="mt-6 max-w-[52ch] leading-relaxed text-body">
              Feel free to reach out for collaborations, inquiries, or just to say hello. I’m always open to discussing new projects, creative ideas, or opportunities to be part of your visions.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a href={`mailto:${person.links.email}`} className="action action-primary">
                <EnvelopeSimple size={16} weight="bold" aria-hidden="true" />
                Contact
              </a>
              <a
                href={person.links.github}
                target="_blank"
                rel="noreferrer noopener"
                className="action action-ghost"
              >
                GitHub
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}