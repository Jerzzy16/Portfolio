/**
 * Section header. One focused message, stacked vertically: headline, then the
 * query line, then an optional note.
 *
 * The query line is the motif from the reference. It earns its place because it
 * states what the section actually holds rather than describing it.
 */
export default function SectionHeader({
  title,
  query,
  note,
  id,
}: {
  title: string;
  query?: string;
  note?: string;
  id?: string;
}) {
  return (
    <header className="mb-10 md:mb-14">
      <h2
        id={id}
        className="text-section-title text-[length:var(--text-section)] text-canvas-soft"
      >
        {title}
      </h2>

      {query && (
        <p className="mt-3 overflow-x-auto font-mono text-[10.5px] leading-relaxed whitespace-nowrap text-primary md:text-xs">
          {query}
        </p>
      )}

      {note && <p className="mt-4 max-w-[58ch] leading-relaxed text-body">{note}</p>}
    </header>
  );
}