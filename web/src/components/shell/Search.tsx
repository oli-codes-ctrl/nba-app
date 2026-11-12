'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { SearchIcon } from '@/components/icons';
import { Avatar, TeamChip } from '@/components/primitives';
import { playerPath, teamPath } from '@/lib/routes';
import { search, type SearchIndex } from '@/lib/search';
import { SITE } from '@/lib/site';
import { positionName } from '@/stats/views';

import s from './shell.module.css';

type Item = { key: string; href: string; label: string };

/** Other parts of a page (the home hero) open search with this event. */
export const OPEN_SEARCH_EVENT = 'hoops:open-search';

let indexPromise: Promise<SearchIndex> | null = null;
function loadIndex(): Promise<SearchIndex> {
  indexPromise ??= fetch(`${SITE.basePath}/search-index.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SearchIndex>;
    })
    .catch((error) => {
      indexPromise = null;
      throw error;
    });
  return indexPromise;
}

/**
 * Search for any player or team from every page: a field in the top bar,
 * Ctrl/Cmd+K or "/" from the keyboard. A combobox inside a modal dialog, so
 * focus is trapped and Escape closes it without extra code.
 */
export function Search() {
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');

  const fetchIndex = useCallback(() => {
    setFailed(false);
    loadIndex().then(setIndex, () => setFailed(true));
  }, []);

  const show = useCallback(() => {
    if (dialog.current?.open) return;
    setQuery('');
    setActive(0);
    dialog.current?.showModal();
    setOpen(true);
    fetchIndex();
  }, [fetchIndex]);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('⌘K');
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target != null && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show();
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        show();
      }
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, show);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, show);
    };
  }, [show]);

  // Following a result changes the page: close behind it.
  useEffect(() => close(), [pathname, close]);

  const results = useMemo(() => (index ? search(index, query) : null), [index, query]);
  const items = useMemo<Item[]>(() => {
    if (!results) return [];
    return [
      ...results.players.map((p) => ({ key: `p${p[0]}`, href: playerPath({ id: p[0], name: p[1] }), label: p[1] })),
      ...results.teams.map((t) => ({ key: `t${t[0]}`, href: teamPath(t[0]), label: t[1] })),
    ];
  }, [results]);
  const current = items[Math.min(active, items.length - 1)];

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Home' && items.length) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && items.length) {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === 'Enter' && current) {
      e.preventDefault();
      close();
      router.push(current.href);
    }
  }

  // Keep the highlighted option in view while arrowing through the list.
  useEffect(() => {
    if (current) document.getElementById(`search-${current.key}`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const empty = query.trim() === '';
  const count = items.length;
  let offset = 0;

  return (
    <>
      <button
        type="button"
        className={s.searchField}
        aria-label="Search players and teams"
        aria-keyshortcuts="Control+K Meta+K /"
        onClick={show}
        onPointerEnter={fetchIndex}
        onFocus={fetchIndex}>
        <SearchIcon />
        <span className={s.searchPlaceholder}>
          <span className={s.searchLong}>Search players and teams…</span>
          <span className={s.searchShort}>Search…</span>
        </span>
        <kbd className={s.kbd}>{shortcut}</kbd>
      </button>
      <button type="button" className={`${s.iconButton} ${s.searchIcon}`} onClick={show} aria-label="Search players and teams">
        <SearchIcon size={18} />
      </button>

      <dialog
        ref={dialog}
        className={s.palette}
        aria-label="Search players and teams"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === dialog.current) close();
        }}>
        {open && (
          <div className={s.paletteBody}>
            <div className={s.paletteField}>
              <SearchIcon />
              <input
                ref={input}
                // The reader just asked to search: the field is the only thing to do here.
                autoFocus
                className={s.paletteInput}
                type="text"
                name="search"
                inputMode="search"
                enterKeyHint="go"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Search players and teams…"
                aria-label="Search players and teams"
                role="combobox"
                aria-expanded="true"
                aria-controls="search-results"
                aria-autocomplete="list"
                aria-activedescendant={current ? `search-${current.key}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
              />
              <button type="button" className={s.kbdButton} onClick={close} aria-label="Close search">
                <kbd className={s.kbd}>Esc</kbd>
              </button>
            </div>

            <div id="search-results" role="listbox" aria-label="Results" className={s.results}>
              {failed && !index ? (
                <div className={s.paletteMessage} role="alert">
                  <p>Search couldn’t load. Check your connection.</p>
                  <button type="button" className="link" onClick={fetchIndex}>
                    Try Again
                  </button>
                </div>
              ) : !results ? (
                <div className={s.paletteMessage}>Loading players…</div>
              ) : count === 0 ? (
                <div className={s.paletteMessage}>
                  <p>No player or team matches “{query.trim()}”.</p>
                  <p className="t-subtle">Try a last name or a city, like “Jokic” or “Denver”.</p>
                </div>
              ) : (
                <>
                  {results.players.length > 0 && (
                    <div role="group" aria-labelledby="search-players">
                      <div id="search-players" className={`t-eyebrow ${s.groupLabel}`}>
                        {empty ? 'Top players by Game Score' : 'Players'}
                      </div>
                      {results.players.map((p) => {
                        const item = items[offset++];
                        return (
                          <Link
                            key={item.key}
                            id={`search-${item.key}`}
                            href={item.href}
                            role="option"
                            aria-selected={item === current}
                            tabIndex={-1}
                            className={s.option}
                            onPointerMove={() => setActive(items.indexOf(item))}
                            onClick={close}>
                            <Avatar name={p[1]} size={28} />
                            <span className={s.optionName}>{p[1]}</span>
                            <span className={s.optionMeta}>{positionName(p[4])}</span>
                            <TeamChip abbr={p[3]} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {results.teams.length > 0 && (
                    <div role="group" aria-labelledby="search-teams">
                      <div id="search-teams" className={`t-eyebrow ${s.groupLabel}`}>
                        Teams
                      </div>
                      {results.teams.map((t) => {
                        const item = items[offset++];
                        return (
                          <Link
                            key={item.key}
                            id={`search-${item.key}`}
                            href={item.href}
                            role="option"
                            aria-selected={item === current}
                            tabIndex={-1}
                            className={s.option}
                            onPointerMove={() => setActive(items.indexOf(item))}
                            onClick={close}>
                            <TeamChip abbr={t[0]} />
                            <span className={s.optionName}>{t[1]}</span>
                            <span className={s.optionMeta}>Team</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="visually-hidden" role="status" aria-live="polite">
              {results ? (count === 0 ? 'No results' : `${count} ${count === 1 ? 'result' : 'results'}`) : ''}
            </p>

            <div className={`t-caption ${s.paletteHints}`} aria-hidden="true">
              <span>
                <kbd className={s.kbd}>↑</kbd> <kbd className={s.kbd}>↓</kbd> to move
              </span>
              <span>
                <kbd className={s.kbd}>Enter</kbd> to open
              </span>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
