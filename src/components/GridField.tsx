import KineticGrid from '@/components/ui/kinetic-grid';

/**
 * The blueprint field. One fixed canvas under the whole page, so the static and
 * interactive grids are the same system. It paints only while the pointer is
 * moving, so a resting page costs zero frames.
 */
export default function GridField() {
  return (
    <KineticGrid
      accent="lime"
      background="transparent"
      className="pointer-events-none fixed inset-0 h-[100dvh] w-full"
      // Explicit rather than relying on DOM order. main sits at z-10.
      style={{ zIndex: 'var(--z-grid)' }}
    />
  );
}