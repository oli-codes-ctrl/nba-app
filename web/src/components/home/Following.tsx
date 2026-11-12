'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readFollows } from '@/components/player/FollowButton';
import { Avatar, TeamChip } from '@/components/primitives';
import { playerPath } from '@/lib/routes';
import { SITE } from '@/lib/site';

import s from './home.module.css';

/** Mirrors app/players-lite.json: [id, name, team, PTS, REB, AST, Game Score]. */
type LitePlayer = [number, string, string, string, string, string, string];

/**
 * "Your players": the players followed in this browser, with their season
 * lines. Renders nothing (and fetches nothing) for readers who follow no one.
 */
export function Following() {
  const [players, setPlayers] = useState<LitePlayer[]>([]);

  useEffect(() => {
    const ids = readFollows();
    if (ids.length === 0) return;
    let live = true;
    fetch(`${SITE.basePath}/players-lite.json`)
      .then((res) => (res.ok ? (res.json() as Promise<LitePlayer[]>) : []))
      .then((rows) => {
        if (!live) return;
        const byId = new Map(rows.map((r) => [r[0], r]));
        setPlayers(ids.map((id) => byId.get(id)).filter((r): r is LitePlayer => r != null));
      })
      .catch(() => {
        // Offline or blocked: the strip stays hidden; the rest of the page does not need it.
      });
    return () => {
      live = false;
    };
  }, []);

  if (players.length === 0) return null;
  return (
    <section className={s.following} aria-labelledby="following-title">
      <div className={`wrap ${s.followingWrap}`}>
        <h2 id="following-title" className="t-card-title">
          Your players
        </h2>
        <ul className={s.followList}>
          {players.map(([id, name, team, pts, reb, ast, gmsc]) => (
            <li key={id}>
              <Link href={playerPath({ id, name })} className={`${s.panel} ${s.follow}`}>
                <span className={s.followHead}>
                  <Avatar name={name} size={32} />
                  <span className={s.name}>{name}</span>
                  <TeamChip abbr={team} />
                </span>
                <span className={`num ${s.followLine}`}>
                  <span>
                    <b>{pts}</b> PTS
                  </span>
                  <span>
                    <b>{reb}</b> REB
                  </span>
                  <span>
                    <b>{ast}</b> AST
                  </span>
                  <span>
                    <b>{gmsc}</b> GmSc
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
