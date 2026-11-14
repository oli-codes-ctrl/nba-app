import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import pl from '@/components/player/player.module.css';
import { packStatRow } from '@/components/stat/statData';
import s from '@/components/stat/stat.module.css';
import { StatView } from '@/components/stat/StatView';
import { formatDate, formatStat, seasonLabel } from '@/lib/format';
import { loadData } from '@/server/data';
import { CATALOG, GROUPS, isStatId, STAT_IDS, type StatId } from '@/stats/catalog';
import { ogImage, pageMeta, statQuestion } from '@/lib/meta';

type Params = { params: Promise<{ stat: string }> };

export const dynamicParams = false;

/** One page per ranked stat: games played and age are context, not rankings. */
export function generateStaticParams() {
  return STAT_IDS.filter((id) => CATALOG[id].ranked).map((stat) => ({ stat }));
}

function findStat(param: string): StatId | null {
  return isStatId(param) && CATALOG[param].ranked ? param : null;
}

/** The best value among ranked players: highest, or fewest for lower-is-better stats. */
function leader(stat: StatId) {
  const def = CATALOG[stat];
  const ranked = loadData().players.players.filter((p) => p.pct?.[stat] != null && p.s[stat] != null);
  return ranked.sort((a, b) => (def.lowerIsBetter ? a.s[stat]! - b.s[stat]! : b.s[stat]! - a.s[stat]!) || a.id - b.id)[0];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const stat = findStat((await params).stat);
  if (!stat) return {};
  const data = loadData();
  const def = CATALOG[stat];
  const top = leader(stat);
  const description =
    `${def.label} for every qualified player of ${seasonLabel(data.manifest.season)}, ranked, with the median, the middle half and how far luck could move each player.` +
    (top ? ` ${def.lowerIsBetter ? 'Fewest' : 'Highest'}: ${top.name}, ${formatStat(stat, top.s[stat])}.` : '') +
    ` Games through ${formatDate(data.through)}.`;
  return pageMeta({
    title: `${def.label}: Every Player Ranked`,
    description,
    path: `/stats/${stat}`,
    share: statQuestion(stat),
    image: ogImage.stat(stat),
    imageAlt: `${statQuestion(stat)} The top three qualified players.`,
  });
}

export default async function StatPage({ params }: Params) {
  const stat = findStat((await params).stat);
  if (!stat) notFound();
  const data = loadData();
  const def = CATALOG[stat];
  const rules = data.players.minAttempts;
  const group = GROUPS.find((g) => g.id === def.group);
  const related = STAT_IDS.filter((id) => id !== stat && CATALOG[id].ranked && CATALOG[id].group === def.group);
  // Ranked players first, best first, so the player search opens on them.
  const sign = def.lowerIsBetter ? 1 : -1;
  const packed = [...data.players.players]
    .sort(
      (a, b) =>
        Number(b.pct?.[stat] != null) - Number(a.pct?.[stat] != null) ||
        sign * ((a.s[stat] ?? 0) - (b.s[stat] ?? 0)) ||
        a.id - b.id,
    )
    .map((p) => packStatRow(p, stat, rules));

  return (
    <div className={`wrap ${s.page}`}>
      <nav aria-label="Breadcrumb" className={`t-caption ${pl.crumbs}`}>
        <Link href="/players" className={pl.crumb}>
          Players
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{def.label}</span>
      </nav>
      <header className={s.header}>
        <h1 className="t-display-md">{def.label}</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          {group ? `${group.title}. ` : ''}
          {group?.note ? `${group.note} ` : ''}
          Every qualified player, {def.neutral ? 'highest' : def.lowerIsBetter ? 'fewest' : 'best'} first. Games through{' '}
          {formatDate(data.through)}.
        </p>
      </header>
      <StatView
        stat={stat}
        packed={packed}
        rule={rules?.[stat] ?? null}
        through={formatDate(data.through)}
        related={related}
        relatedTitle={group ? `More in ${group.title.toLowerCase()}` : 'More stats'}
      />
    </div>
  );
}
