import { CATALOG, type StatId } from '@/stats/catalog';

export function formatStat(id: StatId, value: number | null | undefined): string {
  if (value == null) return '–';
  const def = CATALOG[id];
  const text = value.toFixed(def.decimals);
  return def.unit === 'percent' ? `${text}%` : text;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * The pipeline's percentile is the share of qualified players below the value.
 * For lower-is-better stats "better" means fewer, so flip it.
 */
export function betterThan(id: StatId, pct: number): number {
  return CATALOG[id].lowerIsBetter ? 100 - pct : pct;
}

/** Rank wording. Ranks are by value, so rank 1 for turnovers means the most. */
export function rankText(id: StatId, rank: number, poolSize: number): string {
  const most = CATALOG[id].lowerIsBetter ? ' most' : '';
  return `${ordinal(rank)}${most} of ${poolSize}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-02" -> "Nov 2, 2026", without timezone shifts. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Start year 2026 -> "2026-27". */
export function seasonLabel(season: number): string {
  return `${season}-${String((season + 1) % 100).padStart(2, '0')}`;
}
