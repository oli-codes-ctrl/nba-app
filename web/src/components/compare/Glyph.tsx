import type { Side } from '@/players/versus';

import s from './compare.module.css';

/** Player 1 is a filled dot, player 2 a ring: told apart by shape, both in text color. */
export function Glyph({ side, size = 10 }: { side: Side; size?: number }) {
  return (
    <span
      className={side === 'a' ? s.glyphDot : s.glyphRing}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
