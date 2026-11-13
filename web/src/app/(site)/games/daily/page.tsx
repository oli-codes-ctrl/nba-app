import type { Metadata } from 'next';
import Link from 'next/link';

import { DailyGame } from '@/components/games/DailyGame';
import s from '@/components/games/games.module.css';
import { buildDayPuzzleDate } from '@/components/games/puzzleDate';
import pl from '@/components/player/player.module.css';
import { formatDate } from '@/lib/format';
import { loadData } from '@/server/data';

export function generateMetadata(): Metadata {
  return {
    title: 'Daily Guess: Name the Mystery Player',
    description:
      'One of the season’s top scorers is hidden on a chart. Switch stats to see where he stands, then name him in three guesses. A new puzzle every day; clues cost points.',
    alternates: { canonical: '/games/daily' },
    openGraph: { title: 'Who’s the mystery player?', url: '/games/daily' },
  };
}

export default function DailyPage() {
  const data = loadData();
  // Every published puzzle (yesterday to two days ahead): the reader's own date picks one.
  const puzzles = data.puzzles.puzzles;
  const known = new Set(data.players.players.map((p) => p.id));
  const pageIds = [...new Set(puzzles.flatMap((p) => p.pool.map((e) => e.id)))].filter((id) => known.has(id));
  return (
    <div className={`wrap ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${pl.crumbs}`}>
        <Link href="/games" className={pl.crumb}>
          Games
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Daily Guess</span>
      </nav>
      <DailyGame
        puzzles={puzzles}
        buildDate={buildDayPuzzleDate(data.through)}
        through={formatDate(data.through)}
        pageIds={pageIds}
      />
    </div>
  );
}
