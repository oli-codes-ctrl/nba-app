import type { Metadata } from 'next';
import Link from 'next/link';

import { ChevronRightIcon } from '@/components/icons';
import s from '@/components/reference/reference.module.css';
import { Footer } from '@/components/shell/Footer';
import { SearchTrigger } from '@/components/shell/SearchTrigger';
import { loadData } from '@/server/data';
import { TEAMS } from '@/theme/teams';

export const metadata: Metadata = { title: 'Page Not Found', robots: { index: false, follow: true } };

const PLACES = [
  { href: '/players', label: 'Players', note: 'Every player, ranked' },
  { href: '/teams', label: 'Teams', note: 'Every team, rated' },
  { href: '/compare', label: 'Compare', note: 'Any two players, head to head' },
  { href: '/games', label: 'Games', note: 'Today’s Daily Guess and more' },
] as const;

/** Rendered for any unknown URL (404.html on a static host). Search is the way back. */
export default function NotFound() {
  const players = loadData().players.players.length;
  const teams = Object.keys(TEAMS).length;
  return (
    <>
      <main id="main">
        <div className={`wrap ${s.missing}`}>
          <div className={s.header}>
            <p className="t-eyebrow t-subtle">Page not found</p>
            <h1 className="t-display-md">Looking for a player or team?</h1>
            <p className={`t-body t-muted ${s.lede}`}>
              This page isn’t here. The link may be old, or the player may not have played this season. Search all{' '}
              <span className="num">{players}</span> players and <span className="num">{teams}</span> teams of this
              season:
            </p>
          </div>
          <div className={s.missingSearch}>
            <SearchTrigger />
          </div>
          <nav aria-label="Places to start" className={s.places}>
            <p className="t-caption t-subtle">Or start from</p>
            <ul className={s.placeList}>
              {PLACES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={s.place}>
                    <span className={s.placeText}>
                      <span className="t-strong">{p.label}</span>
                      <span className="t-caption t-subtle">{p.note}</span>
                    </span>
                    <ChevronRightIcon size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}
