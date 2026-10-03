import { ArrowRight, EnvelopeSimple } from '@phosphor-icons/react';

import { person, queries } from '@/data/profile';
import Reveal from '@/components/Reveal';

export default function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="container-page">
        <Reveal>
          <div className="panel overflow-hidden px-6 py-14 md:px-14 md:py-20">
            <p className="tech-label">{queries.contact}</p>

            <h2 className="text-section-title mt-5 max-w-[16ch] text-[length:var(--text-display)] text-primary">
              Lorem ipsum dolor sit amet.
            </h2>

            <p className="mt-6 max-w-[52ch] leading-relaxed text-body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vel sem at augue
              aliquam fermentum. Praesent vel nibh sed sapien ultricies pretium.
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