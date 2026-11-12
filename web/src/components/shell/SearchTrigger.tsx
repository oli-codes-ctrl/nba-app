'use client';

import { SearchIcon } from '@/components/icons';

import { OPEN_SEARCH_EVENT } from './Search';
import s from './shell.module.css';

/**
 * A large field that opens the site search: the main action on the home
 * page. The palette itself lives in the top bar, so there is one search.
 */
export function SearchTrigger({ label = 'Search players and teams' }: { label?: string }) {
  return (
    <button type="button" className={s.searchHero} onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}>
      <SearchIcon size={18} />
      <span>{label}</span>
    </button>
  );
}
