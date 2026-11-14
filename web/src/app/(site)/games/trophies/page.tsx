import type { Metadata } from 'next';
import Link from 'next/link';

import s from '@/components/games/games.module.css';
import { TrophyCase } from '@/components/games/TrophyCase';
import pl from '@/components/player/player.module.css';
import { ogImage, pageMeta } from '@/lib/meta';

export function generateMetadata(): Metadata {
  return pageMeta({
    title: 'Trophies',
    description:
      'Milestones across every game and the rest of the site: from your first Daily Guess to a 30-day streak, a perfect Box Score Mystery and 20 in a row at Higher or Lower.',
    path: '/games/trophies',
    share: 'Which trophies have you earned?',
    image: ogImage.page('trophies'),
    imageAlt: 'Which trophies have you earned?',
  });
}

export default function TrophiesPage() {
  return (
    <div className={`wrap ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${pl.crumbs}`}>
        <Link href="/games" className={pl.crumb}>
          Games
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Trophies</span>
      </nav>
      <header className={s.header}>
        <h1 className="t-display-md">Which trophies have you earned?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Milestones across the games and the rest of the site, from your first solve to a 30-day streak. No account:
          they are kept in this browser.
        </p>
      </header>
      <TrophyCase />
    </div>
  );
}
