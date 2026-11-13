'use client';

import { useEffect } from 'react';

/** Counts a team page toward the Scout trophy. Renders nothing; the games' code loads after the page. */
export function TeamVisit({ abbr }: { abbr: string }) {
  useEffect(() => {
    import('./browser').then((m) => m.countTeamVisit(abbr)).catch(() => {});
  }, [abbr]);
  return null;
}

/** Counts a head-to-head toward the Debate Club trophy, once per matchup shown. */
export function useVersusCount(pair: string | null) {
  useEffect(() => {
    if (!pair) return;
    import('./browser').then((m) => m.countVersus()).catch(() => {});
  }, [pair]);
}
