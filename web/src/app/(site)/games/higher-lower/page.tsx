import type { Metadata } from 'next';
import Link from 'next/link';

import { packStreak } from '@/components/games/gameData';
import s from '@/components/games/games.module.css';
import { HigherLower } from '@/components/games/HigherLower';
import pl from '@/components/player/player.module.css';
import { formatDate } from '@/lib/format';
import { loadData } from '@/server/data';
import { ogImage, pageMeta } from '@/lib/meta';

export function generateMetadata(): Metadata {
  return pageMeta({
    title: 'Higher or Lower: Season Averages',
    description:
      'Does the next player average more or less? Chain right answers as the stat changes every round and the gaps get smaller. One miss ends the run.',
    path: '/games/higher-lower',
    share: 'Higher or lower?',
    image: ogImage.page('higher-lower'),
    imageAlt: 'Higher or lower? Guess who averages more.',
  });
}

export default function HigherLowerPage() {
  const data = loadData();
  return (
    <div className={`wrap ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${pl.crumbs}`}>
        <Link href="/games" className={pl.crumb}>
          Games
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Higher or Lower</span>
      </nav>
      <HigherLower data={packStreak(data.players.players)} />
      <p className="t-caption t-subtle">Season averages through {formatDate(data.through)}.</p>
    </div>
  );
}
