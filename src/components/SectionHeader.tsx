/**
 * Section header. One focused message, stacked vertically.
 * The optional `note` sits under the headline, never floated in a corner.
 */
export default function SectionHeader({
  title,
  note,
  id,
}: {
  title: string;
  note?: string;
  id?: string;
}) {
  return (
    <header className="mb-10 md:mb-14">
      <h2 id={id} className="text-section-title text-[length:var(--text-section)] text-canvas-soft">
        {title}
      </h2>
      {note && <p className="mt-4 max-w-[58ch] leading-relaxed text-body">{note}</p>}
    </header>
  );
}