import type { Metadata } from 'next';
import Link from 'next/link';

import { BoxScoreMystery } from '@/components/games/BoxScoreMystery';
import { packMystery } from '@/components/games/gameData';
import s from '@/components/games/games.module.css';
import pl from '@/components/player/player.module.css';
import { formatDate } from '@/lib/format';
import { loadData } from '@/server/data';

export function generateMetadata(): Metadata {
  return {
    title: 'Box Score Mystery: Whose Line Is It?',
    description:
      'Ten real stat lines from the latest games, four names each. The wrong names scored about as many points, so read the rest of the line to find who posted it.',
    alternates: { canonical: '/games/box-score' },
    openGraph: { title: 'Whose line is it?', url: '/games/box-score' },
  };
}

export default function BoxScorePage() {
  const data = loadData();
  return (
    <div className={`wrap ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${pl.crumbs}`}>
        <Link href="/games" className={pl.crumb}>
          Games
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Box Score Mystery</span>
      </nav>
      <BoxScoreMystery data={packMystery(data.players.players)} through={formatDate(data.through)} />
    </div>
  );
}
