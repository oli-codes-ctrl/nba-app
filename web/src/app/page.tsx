import Link from 'next/link';

import { playerPath } from '@/lib/routes';
import { SITE } from '@/lib/site';
import { loadData } from '@/server/data';

/**
 * Interim home page: enough to reach player pages while the site is rebuilt
 * one page at a time. Replaced in build step 2 (Home).
 */
export default function HomePage() {
  const { players } = loadData();
  const top = [...players.players]
    .filter((p) => p.q)
    .sort((a, b) => (b.s.game_score ?? 0) - (a.s.game_score ?? 0))
    .slice(0, 8);
  return (
    <div className="container" style={{ paddingBlock: 'var(--space-12)', display: 'grid', gap: 'var(--space-6)' }}>
      <h1 className="t-display-md">{SITE.tagline}</h1>
      <p className="t-body-lg t-muted" style={{ maxWidth: '60ch' }}>
        {SITE.description}
      </p>
      <ul style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {top.map((p) => (
          <li key={p.id}>
            <Link href={playerPath(p)} className="link">
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
