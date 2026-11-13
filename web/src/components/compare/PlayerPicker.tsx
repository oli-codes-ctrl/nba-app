'use client';

import { PlayerSearchDialog } from '@/components/PlayerSearchDialog';
import type { Player } from '@/data/types';
import type { Side } from '@/players/versus';

import { Glyph } from './Glyph';

type Props = {
  /** Which side is being picked; null when closed. */
  side: Side | null;
  /** Best first (qualified, then Game Score), as the data file orders them. */
  players: readonly Player[];
  /** The players are still on their way. */
  loading: boolean;
  /** The player on the other side, left out of the list. */
  excludeId: number | null;
  onPick: (side: Side, id: number) => void;
  onClose: () => void;
};

/** Choose a player for one side of a matchup. An empty field lists the best players by Game Score. */
export function PlayerPicker({ side, players, loading, excludeId, onPick, onClose }: Props) {
  return (
    <PlayerSearchDialog
      open={side != null}
      title={side === 'b' ? 'Pick Player 2' : 'Pick Player 1'}
      placeholder={side === 'b' ? 'Player 2: search by name…' : 'Player 1: search by name…'}
      icon={side ? <Glyph side={side} /> : undefined}
      players={players}
      topLabel="Top players by Game Score"
      loading={loading}
      excludeIds={excludeId != null ? [excludeId] : []}
      onPick={(id) => {
        if (side) onPick(side, id);
      }}
      onClose={onClose}
    />
  );
}
