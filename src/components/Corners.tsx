/**
 * Corner crosshairs for an absolutely positioned card. Four L-shaped ticks that
 * sit outside the border, matching the blueprint cards in the reference.
 *
 * Drawn as spans rather than pseudo-elements because the cards cannot use
 * overflow-hidden: these marks live outside the box and would be clipped.
 */
export default function Corners() {
  return (
    <>
      <span aria-hidden="true" className="corner tl" />
      <span aria-hidden="true" className="corner tr" />
      <span aria-hidden="true" className="corner bl" />
      <span aria-hidden="true" className="corner br" />
    </>
  );
}