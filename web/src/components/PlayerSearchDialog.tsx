'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { SearchIcon } from '@/components/icons';
import { Avatar, TeamChip } from '@/components/primitives';
import shell from '@/components/shell/shell.module.css';
import type { Player } from '@/data/types';
import { search, type PlayerEntry } from '@/lib/search';
import { positionName } from '@/stats/views';

const LIMIT = 8;

type Props = {
  open: boolean;
  /** The dialog's name: "Pick Player 1", "Highlight a Player". */
  title: string;
  placeholder: string;
  /** Shown in the field before the input; a search icon when omitted. */
  icon?: ReactNode;
  /** Best first, as the data file orders them: an empty field lists the first few. */
  players: readonly Pick<Player, 'id' | 'name' | 'searchName' | 'team' | 'pos'>[];
  /** Heading over the list while the field is empty. */
  topLabel: string;
  /** The players are still on their way. */
  loading?: boolean;
  /** Players left out of the list (already picked). */
  excludeIds?: readonly number[];
  onPick: (id: number) => void;
  onClose: () => void;
};

/**
 * Choose one player: a combobox in a modal dialog, like the site search, but
 * picking hands the player back instead of opening a page.
 */
export function PlayerSearchDialog({
  open,
  title,
  placeholder,
  icon,
  players,
  topLabel,
  loading = false,
  excludeIds = [],
  onPick,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery('');
      setActive(0);
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
    // The title is a dependency too: Compare goes straight from Player 1 to Player 2 without closing.
  }, [open, title]);

  const excluded = excludeIds.join(',');
  const index = useMemo(() => {
    const skip = new Set(excluded ? excluded.split(',').map(Number) : []);
    return {
      players: players.filter((p) => !skip.has(p.id)).map((p): PlayerEntry => [p.id, p.name, p.searchName, p.team, p.pos]),
      teams: [],
    };
  }, [players, excluded]);
  const results = useMemo(() => search(index, query, { players: LIMIT, teams: 0 }).players, [index, query]);
  const current = results[Math.min(active, results.length - 1)];

  function choose(id: number) {
    onPick(id);
    dialog.current?.close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const n = results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (n ? (i + 1) % n : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (n ? (i - 1 + n) % n : 0));
    } else if (e.key === 'Home' && n) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && n) {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === 'Enter' && current) {
      e.preventDefault();
      choose(current[0]);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={shell.palette}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === dialog.current) dialog.current?.close();
      }}>
      {open && (
        <div className={shell.paletteBody}>
          <div className={shell.paletteField}>
            {icon ?? <SearchIcon />}
            <input
              // The reader just asked to pick: the field is the only thing to do here.
              autoFocus
              className={shell.paletteInput}
              type="text"
              name="player-pick"
              inputMode="search"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={placeholder}
              aria-label={`${title}: search by name`}
              role="combobox"
              aria-expanded="true"
              aria-controls="pick-results"
              aria-autocomplete="list"
              aria-activedescendant={current ? `pick-${current[0]}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
            <button type="button" className={shell.kbdButton} onClick={() => dialog.current?.close()} aria-label="Close">
              <kbd className={shell.kbd}>Esc</kbd>
            </button>
          </div>

          <div id="pick-results" role="listbox" aria-label="Players" className={shell.results}>
            {loading ? (
              <div className={shell.paletteMessage}>Loading players…</div>
            ) : results.length === 0 ? (
              <div className={shell.paletteMessage}>
                <p>No player matches “{query.trim()}”.</p>
                <p className="t-subtle">Try a last name only, like “Jokic”.</p>
              </div>
            ) : (
              <div role="group" aria-labelledby="pick-group">
                <div id="pick-group" className={`t-eyebrow ${shell.groupLabel}`}>
                  {query.trim() ? 'Players' : topLabel}
                </div>
                {results.map((p) => (
                  <div
                    key={p[0]}
                    id={`pick-${p[0]}`}
                    role="option"
                    aria-selected={p === current}
                    className={shell.option}
                    style={{ cursor: 'pointer' }}
                    onPointerMove={() => setActive(results.indexOf(p))}
                    onClick={() => choose(p[0])}>
                    <Avatar name={p[1]} size={28} />
                    <span className={shell.optionName}>{p[1]}</span>
                    <span className={shell.optionMeta}>{positionName(p[4])}</span>
                    <TeamChip abbr={p[3]} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="visually-hidden" role="status" aria-live="polite">
            {loading ? '' : results.length === 0 ? 'No results' : `${results.length} ${results.length === 1 ? 'player' : 'players'}`}
          </p>

          <div className={`t-caption ${shell.paletteHints}`} aria-hidden="true">
            <span>
              <kbd className={shell.kbd}>↑</kbd> <kbd className={shell.kbd}>↓</kbd> to move
            </span>
            <span>
              <kbd className={shell.kbd}>Enter</kbd> to pick
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}
