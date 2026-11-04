import { router, useSegments, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';

/** Route prefix of the current tab's stack ('' for Today, which owns '/'). */
function useTabPrefix(): string {
  const tab: string = useSegments()[0] ?? '';
  return tab === 'players' || tab === 'graphs' || tab === 'play' ? `/${tab}` : '';
}

/**
 * Links that open inside the current tab's stack, so Back returns to where
 * you were. Every tab folder has player/[id], team/[abbr] and versus routes
 * that re-export the shared screens.
 */
export function useLinks() {
  const prefix = useTabPrefix();
  return useMemo(
    () => ({
      player: (id: number) => router.push(`${prefix}/player/${id}` as Href),
      team: (abbr: string) => router.push(`${prefix}/team/${encodeURIComponent(abbr)}` as Href),
      versus: (a: number, b?: number) => router.push(`${prefix}/versus?a=${a}${b != null ? `&b=${b}` : ''}` as Href),
    }),
    [prefix],
  );
}

export function usePlayerLink(): (id: number) => void {
  const links = useLinks();
  return useCallback((id: number) => links.player(id), [links]);
}
