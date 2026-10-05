/**
 * Section header: headline, query line, optional note.
 *
 * The query line states what the section holds rather than describing it. It
 * wraps rather than scrolling horizontally, so it never introduces a scroll
 * region inside a heading block.
 */
export default function SectionHeader({
  title,
  query,
  note,
}: {
  title: string;
  query?: string;
  note?: string;
}) {
  return (
    <header className="mb-10 md:mb-14">
      <h2 className="text-section-title text-[length:var(--text-section)] text-canvas-soft">
        {title}
      </h2>

      {query && (
        <p className="mt-3 font-mono text-[10.5px] leading-relaxed break-words text-primary md:text-xs">
          {query}
        </p>
      )}

      {note && <p className="mt-4 max-w-[58ch] leading-relaxed text-body">{note}</p>}
    </header>
  );
}