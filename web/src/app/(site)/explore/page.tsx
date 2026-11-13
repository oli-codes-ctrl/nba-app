import type { Metadata } from 'next';

import { Explore } from '@/components/explore/Explore';
import s from '@/components/explore/explore.module.css';
import { packExplorePlayer } from '@/components/explore/exploreData';
import { formatDate, seasonLabel } from '@/lib/format';
import { loadData } from '@/server/data';

export function generateMetadata(): Metadata {
  const data = loadData();
  return {
    title: 'Explore: Any Two Stats, Every Player',
    description: `Plot any two stats for the ${data.manifest.qualifiedCount} qualified players of ${seasonLabel(data.manifest.season)}: who scores efficiently on high volume, who creates without turning it over, who cleans the glass. Named corners, honest samples, and whether the two stats really go together. Games through ${formatDate(data.through)}.`,
    alternates: { canonical: '/explore' },
  };
}

export default function ExplorePage() {
  const data = loadData();
  // Only qualified players are ever plotted; best Game Score first, so the player search opens on the stars.
  const packed = data.players.players
    .filter((p) => p.q)
    .sort((a, b) => (b.s.game_score ?? -Infinity) - (a.s.game_score ?? -Infinity))
    .map(packExplorePlayer);
  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">Any two stats, every player.</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Pick a question or two stats of your own. Each dot is one of the {packed.length} qualified players.
        </p>
      </header>
      <Explore packed={packed} rules={data.players.minAttempts ?? {}} through={formatDate(data.through)} />
    </div>
  );
}
