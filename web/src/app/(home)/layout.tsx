import Link from 'next/link';
import type { ReactNode } from 'react';

import { ButtonLink } from '@/components/Button';
import s from '@/components/home/home.module.css';
import { Footer } from '@/components/shell/Footer';
import { SearchTrigger } from '@/components/shell/SearchTrigger';
import { playerPath } from '@/lib/routes';
import { loadData } from '@/server/data';
import { leaders } from '@/today/feed';

/** The home page ends on its closing call, which shares the last screen with the footer links. */
export default function HomeLayout({ children }: { children: ReactNode }) {
  const { manifest, teams, players } = loadData();
  const starters = leaders(players.players, 'game_score', 4);
  return (
    <>
      <main id="main">{children}</main>
      <Footer
        close={
          <div className={s.close}>
            <h2 className="t-display-md">Settle the next argument with stats.</h2>
            <p className="t-body-lg t-muted num">
              {manifest.playerCount} players and {teams.teams.length} teams, updated after every night of games.
            </p>
            <div className={s.actions}>
              <SearchTrigger />
              <ButtonLink href="/players">Browse All Players</ButtonLink>
            </div>
            <p className={`t-body-sm ${s.starters}`}>
              <span className="t-subtle">Or start with the top 4 by Game Score:</span>
              {starters.map((p) => (
                <Link key={p.id} href={playerPath(p)} className="link">
                  {p.name}
                </Link>
              ))}
            </p>
          </div>
        }
      />
    </>
  );
}
