/**
 * The scoring end of a court seen from above, drawn to scale in feet (pro
 * dimensions), the baseline off the right edge: the key, the free throw
 * circle, the three-point line, the restricted area and the rim. It frames the card
 * field (player and team headers) as faint lines in the team's color.
 * Decoration only: hidden from assistive technology.
 */
const BASE = 47; // baseline x; half court is x = 0
const HOOP = { x: BASE - 5.25, y: 25 };
const THREE = 23.75;
const CORNER_Y = 3; // the corner three lines run 3 ft in from each sideline
const CORNER_X = HOOP.x - Math.sqrt(THREE ** 2 - (HOOP.y - CORNER_Y) ** 2);

export function CourtLines({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 47 50" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {/* The key, 16 ft wide and 19 ft deep, with the free throw circle. */}
        <rect x={BASE - 19} y="17" width="19" height="16" vectorEffect="non-scaling-stroke" />
        <circle cx={BASE - 19} cy="25" r="6" vectorEffect="non-scaling-stroke" />
        {/* Three-point line: straight in the corners, then the arc. */}
        <path
          d={`M${BASE} ${CORNER_Y} H${CORNER_X} A${THREE} ${THREE} 0 0 0 ${CORNER_X} ${50 - CORNER_Y} H${BASE}`}
          vectorEffect="non-scaling-stroke"
        />
        {/* Restricted area, backboard and rim. */}
        <path d={`M${HOOP.x} ${HOOP.y - 4} A4 4 0 0 0 ${HOOP.x} ${HOOP.y + 4}`} vectorEffect="non-scaling-stroke" />
        <line x1={BASE - 4} y1="22" x2={BASE - 4} y2="28" vectorEffect="non-scaling-stroke" />
        <circle cx={HOOP.x} cy={HOOP.y} r="0.75" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
