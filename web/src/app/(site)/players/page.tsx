import type { Metadata } from 'next';

import s from '@/components/players/players.module.css';
import { PlayersTable } from '@/components/players/PlayersTable';
import { packPlayer } from '@/components/players/tableData';
import { formatDate, seasonLabel } from '@/lib/format';
import { loadData } from '@/server/data';
import { ogImage, pageMeta } from '@/lib/meta';

export function generateMetadata(): Metadata {
  const data = loadData();
  const season = seasonLabel(data.manifest.season);
  return pageMeta({
    title: `Player Stats and Rankings, ${season}`,
    description: `All ${data.manifest.playerCount} players of the ${season} season in one sortable table: points, rebounds, assists, shooting, usage and Game Score, per game, per 36 minutes or per 100 possessions. Games through ${formatDate(data.through)}.`,
    path: '/players',
    share: 'Every player, ranked.',
    image: ogImage.page('players'),
    imageAlt: 'Every player, ranked: one sortable table.',
  });
}

export default function PlayersPage() {
  const data = loadData();
  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">Every player, ranked.</h1>
        <p className="t-body t-subtle num">
          {data.manifest.playerCount} players in {seasonLabel(data.manifest.season)}. Select a column to sort by it; select
          it again to flip the order.
        </p>
      </header>
      <PlayersTable
        rows={data.players.players.map(packPlayer)}
        rules={data.players.minAttempts}
        through={formatDate(data.through)}
      />
    </div>
  );
}
