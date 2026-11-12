import { fold } from '@/lib/fold';
import { betterThan, formatDate, formatStat, ordinal, rankText, seasonLabel } from '@/lib/format';

describe('fold', () => {
  // Same cases as test_fold_name in pipeline/tests/test_aggregate_metrics.py.
  it.each([
    ['Luka Dončić', 'luka doncic'],
    ['Luka Doncic', 'luka doncic'],
    ['Nikola Jokić', 'nikola jokic'],
    ['Kristaps Porziņģis', 'kristaps porzingis'],
    ['Dāvis Bertāns', 'davis bertans'],
    ["D'Angelo Russell", 'dangelo russell'],
    ['P.J. Washington', 'pj washington'],
    ['Walter Clayton Jr.', 'walter clayton jr'],
    ['Nikola Đurišić', 'nikola durisic'],
  ])('%s -> %s', (raw, folded) => {
    expect(fold(raw)).toBe(folded);
  });

  it('collapses spaces and trims', () => {
    expect(fold('  LeBron   James ')).toBe('lebron james');
  });
});

describe('format', () => {
  it('formats counts and percentages', () => {
    expect(formatStat('pts', 27.25)).toBe('27.3');
    expect(formatStat('fg_pct', 44.9)).toBe('44.9%');
    expect(formatStat('gp', 5)).toBe('5');
    expect(formatStat('fg3_pct', null)).toBe('–');
  });

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th',
    ]);
  });

  it('flips percentiles and rank wording for lower-is-better stats', () => {
    expect(betterThan('pts', 80)).toBe(80);
    expect(betterThan('tov', 80)).toBe(20);
    expect(rankText('pts', 3, 305)).toBe('3rd of 305');
    expect(rankText('tov', 3, 305)).toBe('3rd most of 305');
  });

  it('formats dates and seasons without timezone shifts', () => {
    expect(formatDate('2026-11-02')).toBe('Nov 2, 2026');
    expect(seasonLabel(2026)).toBe('2026-27');
    expect(seasonLabel(2099)).toBe('2099-00');
  });
});
