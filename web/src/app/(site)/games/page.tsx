import type { Metadata } from 'next';

import { DailyFeature, DailyRecord, OtherGames } from '@/components/games/GamesHub';
import s from '@/components/games/games.module.css';
import { buildDayPuzzleDate } from '@/components/games/puzzleDate';
import { formatDate } from '@/lib/format';
import { loadData } from '@/server/data';

export function generateMetadata(): Metadata {
  return {
    title: 'Games: Play the Numbers',
    description:
      'Stat games built on this season’s numbers: name the Daily Guess mystery player from a chart, keep a Higher or Lower chain going, and read a box score to find its player.',
    alternates: { canonical: '/games' },
  };
}

export default function GamesPage() {
  const data = loadData();
  const puzzles = data.puzzles.puzzles;
  const buildDate = buildDayPuzzleDate(data.through);
  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">Play the numbers.</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Quick games built on this season’s stats: a new Daily Guess every day, and games you can play as often as you
          like. No account; your scores stay in this browser.
        </p>
      </header>

      <div className={s.hubGrid}>
        <DailyFeature puzzles={puzzles} buildDate={buildDate} />
        <section className={s.more} aria-labelledby="more-title">
          <h2 id="more-title" className="t-card-title">
            What else can you play?
          </h2>
          <OtherGames />
        </section>
      </div>

      <section className={s.recordSection} aria-labelledby="record-title">
        <header className={s.panelHead}>
          <h2 id="record-title" className="t-card-title">
            How are you doing?
          </h2>
          <p className="t-caption t-subtle">Your Daily Guess record in this browser.</p>
        </header>
        <DailyRecord />
      </section>

      <p className="t-caption t-subtle">Every game uses stats through {formatDate(data.through)}.</p>
    </div>
  );
}
