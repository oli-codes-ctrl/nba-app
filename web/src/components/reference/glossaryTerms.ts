/**
 * The glossary's words. Stat labels, abbreviations and direction come from
 * stats/catalog.ts; formulas are written out from pipeline/hoops_pipeline/formulas.py
 * (sources there); the rules for ranking and judging restate what the
 * pipeline and the site's logic do (CLAUDE.md, Data). Built at build time,
 * so live numbers (today's attempt minimums, pool sizes) are the published ones.
 */
import type { PlayersDoc } from '@/data/types';
import { statPath } from '@/lib/routes';
import { attemptsText } from '@/stats/samples';
import { CATALOG, GROUPS, statsInGroup, type StatDef, type StatGroup, type StatId } from '@/stats/catalog';

export type Term = {
  /** Anchor: /glossary#ts_pct. */
  id: string;
  term: string;
  short?: string;
  body: string;
  formula?: string;
  /** How to read the direction: better, fewer is better, a role, context. */
  tag?: string;
  href?: string;
  hrefLabel?: string;
};

export type GlossaryGroup = { id: string; title: string; note?: string; terms: Term[] };
export type GlossarySection = { id: string; title: string; lede: string; groups: GlossaryGroup[] };

type Words = { body: string; formula?: string };

/** Plain-English meaning of every stat, with its formula where it has one. */
const STAT_WORDS: Record<StatId, Words> = {
  gp: { body: 'Games he has played in this season.' },
  mpg: { body: 'Average minutes on the court per game he played.', formula: 'Minutes / games played' },
  age: { body: 'His age in years.' },

  game_score: {
    body: 'John Hollinger’s one number for a box score: points and made shots count for him, misses, fouls and turnovers against, and the rest by roughly what each is worth. About 10 is an average game; 40 is an outstanding one. The site averages it over his season.',
    formula: 'PTS + 0.4 FGM − 0.7 FGA − 0.4 (FTA − FTM) + 0.7 OREB + 0.3 DREB + STL + 0.7 AST + 0.7 BLK − 0.4 PF − TOV',
  },

  pts: { body: 'Points per game he played.' },
  fgm: { body: 'Field goals made per game, twos and threes. Free throws are counted separately.' },
  fga: { body: 'Field goal attempts per game: how many shots he takes. A measure of volume.' },
  fg3m: { body: 'Three-pointers made per game.' },
  fg3a: { body: 'Three-point attempts per game: a measure of volume.' },
  ftm: { body: 'Free throws made per game.' },
  fta: { body: 'Free throw attempts per game: how often he gets to the line.' },

  fg_pct: {
    body: 'Shots made out of shots taken. It counts a three the same as a two and leaves out free throws, so it favors players who shoot near the rim.',
    formula: 'FGM / FGA',
  },
  fg2_pct: { body: 'Two-point shots made out of two-point shots taken.', formula: '(FGM − 3PM) / (FGA − 3PA)' },
  fg3_pct: {
    body: 'Threes made out of threes taken. Few attempts make it swing a lot, so the site also shows a skill estimate (see below).',
    formula: '3PM / 3PA',
  },
  ft_pct: {
    body: 'Free throws made out of free throws taken. Also has a skill estimate.',
    formula: 'FTM / FTA',
  },
  efg_pct: {
    body: 'Field goal percentage with a made three counted as one and a half makes, because it is worth 50% more.',
    formula: '(FGM + 0.5 × 3PM) / FGA',
  },
  ts_pct: {
    body: 'Points per scoring chance, counting twos, threes and free throws. The fairest single measure of how efficiently someone scores. The 0.44 turns free throw attempts into scoring chances: two shots use one trip, an and-one uses none.',
    formula: 'PTS / (2 × (FGA + 0.44 × FTA))',
  },
  fg3a_rate: { body: 'The share of his shots taken from three: his shot diet. How well he makes them is three-point percentage.', formula: '3PA / FGA' },
  fta_rate: { body: 'Free throw attempts per 100 shots: how often his shots come with a trip to the line.', formula: '100 × FTA / FGA' },

  reb: { body: 'Rebounds per game, offensive and defensive.' },
  oreb: { body: 'Offensive rebounds per game: his team’s missed shots he grabbed.' },
  dreb: { body: 'Defensive rebounds per game: opponents’ missed shots he grabbed.' },
  ast: { body: 'Assists per game: passes that led straight to a teammate’s basket.' },
  stl: { body: 'Steals per game.' },
  blk: { body: 'Blocked shots per game.' },
  tov: { body: 'Turnovers per game: possessions he lost before a shot.' },
  pf: { body: 'Personal fouls per game.' },

  usg_pct: {
    body: 'The share of his team’s plays he finishes with a shot, free throws or a turnover while he is on the court. A role: high means the offense runs through him, whether or not it works.',
    formula: '100 × (FGA + 0.44 FTA + TOV) × (Team MIN / 5) / (MIN × (Team FGA + 0.44 Team FTA + Team TOV))',
  },
  ast_pct: {
    body: 'The share of his teammates’ baskets he assisted while he was on the court.',
    formula: '100 × AST / ((MIN / (Team MIN / 5)) × Team FGM − FGM)',
  },
  tov_pct: { body: 'Turnovers per 100 of his own plays.', formula: '100 × TOV / (FGA + 0.44 FTA + TOV)' },
  oreb_pct: {
    body: 'The share of available offensive rebounds he grabbed while on the court.',
    formula: '100 × OREB × (Team MIN / 5) / (MIN × (Team OREB + Opp DREB))',
  },
  dreb_pct: {
    body: 'The share of available defensive rebounds he grabbed while on the court.',
    formula: '100 × DREB × (Team MIN / 5) / (MIN × (Team DREB + Opp OREB))',
  },
  reb_pct: {
    body: 'The share of all available rebounds he grabbed while on the court.',
    formula: '100 × REB × (Team MIN / 5) / (MIN × (Team REB + Opp REB))',
  },
  stl_pct: {
    body: 'The share of opponent possessions that ended in his steal while he was on the court.',
    formula: '100 × STL × (Team MIN / 5) / (MIN × Opp possessions)',
  },
  blk_pct: {
    body: 'The share of opponent two-point attempts he blocked while on the court.',
    formula: '100 × BLK × (Team MIN / 5) / (MIN × (Opp FGA − Opp 3PA))',
  },

  pts36: { body: '' },
  reb36: { body: '' },
  ast36: { body: '' },
  stl36: { body: '' },
  blk36: { body: '' },
  fg3m36: { body: '' },
  tov36: { body: '' },
  pts100: { body: '' },
  reb100: { body: '' },
  ast100: { body: '' },
  stl100: { body: '' },
  blk100: { body: '' },
  fg3m100: { body: '' },
  tov100: { body: '' },
};

/** The per-game stat a per-36 or per-100 stat scales. */
const BASE: Partial<Record<StatId, StatId>> = {
  pts36: 'pts', reb36: 'reb', ast36: 'ast', stl36: 'stl', blk36: 'blk', fg3m36: 'fg3m', tov36: 'tov',
  pts100: 'pts', reb100: 'reb', ast100: 'ast', stl100: 'stl', blk100: 'blk', fg3m100: 'fg3m', tov100: 'tov',
};

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function scaledWords(def: StatDef): Words {
  const base = CATALOG[BASE[def.id]!];
  const what = lower(base.label.replace(/ per game$/, ''));
  return def.group === 'per36'
    ? { body: `His ${what} scaled to 36 minutes on the court, so starters and bench players compare on the same playing time.`, formula: `${base.short} total × 36 / minutes` }
    : {
        body: `His ${what} scaled to 100 of his team’s possessions while he was on the court, so the same playing time and pace of play.`,
        formula: `${base.short} total × 100 / (Team possessions × MIN / (Team MIN / 5))`,
      };
}

function direction(def: StatDef): string {
  if (!def.ranked) return 'Context only: unranked';
  if (def.neutral) return 'A role: neither end is better';
  return def.lowerIsBetter ? 'Fewer is better' : 'Higher is better';
}

function statTerm(id: StatId): Term {
  const def = CATALOG[id];
  const words = BASE[id] ? scaledWords(def) : STAT_WORDS[id];
  return {
    id,
    term: def.label,
    short: def.short,
    body: words.body,
    formula: words.formula,
    tag: direction(def),
    href: def.ranked ? statPath(id) : undefined,
    hrefLabel: def.ranked ? 'See every player' : undefined,
  };
}

const PLAYER_GROUPS: { id: StatGroup | 'context'; title: string; note?: string }[] = [
  { id: 'context', title: 'Games and minutes', note: 'Context for everything else. Minutes are ranked; games and age are not.' },
  ...GROUPS,
];

/** Today's attempt minimums in words: "39 shots (FG%, eFG%, TS%, ...); 20 three-point attempts (3P%)". */
function minimumsInWords(rules: PlayersDoc['minAttempts']): string | null {
  if (!rules) return null;
  const byKey = new Map<string, { min: number; by: Parameters<typeof attemptsText>[1]; stats: string[] }>();
  for (const [stat, rule] of Object.entries(rules)) {
    if (!rule) continue;
    const key = `${rule.by}:${rule.min}`;
    const entry = byKey.get(key) ?? { min: rule.min, by: rule.by, stats: [] };
    entry.stats.push(CATALOG[stat as StatId].short);
    byKey.set(key, entry);
  }
  return [...byKey.values()].map((e) => `${attemptsText(e.min, e.by)} for ${e.stats.join(', ')}`).join('; ');
}

export function glossary(doc: PlayersDoc, qualifiedCount: number): GlossarySection[] {
  const minimums = minimumsInWords(doc.minAttempts);
  const three = doc.shrinkage?.fg3_pct?.mean;
  const free = doc.shrinkage?.ft_pct?.mean;

  const reading: GlossaryGroup[] = [
    {
      id: 'ranking',
      title: 'Ranking',
      terms: [
        {
          id: 'qualified',
          term: 'Qualified player',
          body: `A player with at least 10 minutes a game and enough games: 20% of the most games any team has played, and never fewer than 3. Only qualified players are ranked, charted and used in the games. Today ${qualifiedCount} players qualify.`,
        },
        {
          id: 'attempt-minimum',
          term: 'Attempt minimum',
          body:
            'Shooting percentages (and shot diet and turnover rate) are ranked only once a player has taken enough shots, scaled to how far the season has gone, so a 3-for-3 shooter never tops a list. Players below it still show their number, but not a rank.' +
            (minimums ? ` Today: ${minimums}.` : ''),
        },
        {
          id: 'percentile',
          term: 'Percentile',
          body: 'The share of qualified players he ranks above, from 0 to 100, counted from the actual ranking (ties share the middle rank), never from a bell curve. On stats where fewer is better, the scale is flipped, so higher always means better. Sentences say “better than X%” and stop at 99: no one beats himself.',
        },
        {
          id: 'position-ranks',
          term: 'Position ranks',
          body: 'Percentiles among his own position only: guards, forwards or centers, the three positions the data lists. A center’s rebounding means more against other centers. Player pages open on these; you can switch to all players.',
        },
        {
          id: 'role-stats',
          term: 'Role stats',
          body: 'Usage, shot volume and shot diet describe what a player is asked to do, not how well he does it. They are ranked, but never colored as good or bad.',
        },
        {
          id: 'median',
          term: 'Median and middle half',
          body: 'The median is the middle qualified player. The middle half is the range from the 25th to the 75th percentile: half of all qualified players sit inside it.',
        },
      ],
    },
    {
      id: 'luck',
      title: 'Luck and sample size',
      note: 'A season so far is a sample. These are how the site tells skill from a hot or cold stretch.',
      terms: [
        {
          id: 'likely-range',
          term: 'Likely range',
          body: 'Where his long-run level probably sits, given how many shots, games or chances his number rests on: the range that holds his true level 95 times in 100. Narrow means the number has settled; wide means a streak could still be moving it. Built per stat from the matching model: makes out of attempts for shooting, counts per game for box stats, his game-to-game spread for Game Score.',
        },
        {
          id: 'skill-estimate',
          term: 'Skill estimate',
          body:
            'For three-point and free throw percentage, his percentage pulled toward the league average by how few attempts he has taken: a short hot streak counts for less than a full season. The pull is fitted to this season’s qualified players.' +
            (three != null && free != null ? ` Today the league averages are ${three.toFixed(1)}% on threes and ${free.toFixed(1)}% on free throws.` : '') +
            ' Early in a season, when the data cannot yet tell shooters apart, no estimate is shown.',
        },
        {
          id: 'rank-band',
          term: 'Rank band',
          body: 'Where the two ends of his likely range would rank, drawn as a bar under each ring on the player card. A band 25 or more points wide is called not settled yet.',
        },
        {
          id: 'elite',
          term: 'Elite and weak spot',
          body: 'Labels on the player card that only claim what the ranges support. Elite: even the unlucky end of his range ranks in the top 20%. Weak spot: even the lucky end ranks in the bottom 20%. A top or bottom 10% stat that no range confirms is flagged as not settled instead.',
        },
        {
          id: 'clear-edge',
          term: 'Clear edge',
          body: 'In a head-to-head, a stat counts as a clear edge only when the two players’ long-run estimates differ by more than luck explains (1.96 combined standard errors). Otherwise it is too close to call, even if one number is higher.',
        },
        {
          id: 'thin-sample',
          term: 'Thin sample',
          body: 'On scatter charts, a hollow dot marks a player with under half the median minutes: his numbers rest on less playing time.',
        },
      ],
    },
    {
      id: 'charts',
      title: 'Charts and trends',
      terms: [
        {
          id: 'relationship',
          term: 'Two stats going together',
          body: 'Explore says two stats are linked only when their rank correlation (Spearman’s) is stronger than chance would give with this many players. Otherwise it says there is no clear link.',
        },
        {
          id: 'corners',
          term: 'Corners',
          body: 'On Explore, the named corners of the scatter chart split the players at the median of each stat, so each corner holds the players above or below the middle on both.',
        },
        {
          id: 'trend',
          term: 'Recent trend',
          body: 'On a player page, the line is the average of up to his last 10 games, with a band showing how far it could sit from his true level given his game-to-game spread.',
        },
        {
          id: 'heat-check',
          term: 'Heat check',
          body: 'Compares each qualified player’s last 3 games (5 once a typical player has 10) with his earlier games. Because hundreds of players are checked at once, it only flags a change at least 2.5 times bigger than its noise.',
        },
        {
          id: 'style-match',
          term: 'Style match',
          body: 'How alike two players play, out of 100, from ten style stats: usage, true shooting, shot diet, assist and turnover rates, both rebound rates, steal and block rates. Each stat is measured against the average qualified player first, so no single stat dominates. The traits listed are the ones where both sit well on the same side of average.',
        },
      ],
    },
  ];

  const playerGroups: GlossaryGroup[] = PLAYER_GROUPS.map((g) => ({
    id: `stats-${g.id}`,
    title: g.title,
    note:
      g.id === 'rates'
        ? `${g.note} Estimated from his share of team minutes; for a player traded this season, his teams are averaged.`
        : g.note,
    terms: (g.id === 'context' ? (['gp', 'mpg', 'age'] as StatId[]).map((id) => CATALOG[id]) : statsInGroup(g.id)).map((d) =>
      statTerm(d.id),
    ),
  }));

  const team: GlossaryGroup[] = [
    {
      id: 'team-ratings',
      title: 'Ratings and pace',
      note: 'Per 100 possessions, so fast and slow teams compare fairly.',
      terms: [
        {
          id: 'possessions',
          term: 'Possessions',
          body: 'How many times a team had the ball, estimated from the box score and averaged with the opponent’s estimate. The data credits turnovers to players only, so these run about half a percent below official counts.',
          formula: 'FGA + 0.4 FTA − 1.07 × (OREB / (OREB + Opp DREB)) × (FGA − FGM) + TOV',
        },
        { id: 'pace', term: 'Pace', body: 'Possessions per 48 minutes: how fast a team plays.', formula: '48 × possessions / (Team MIN / 5)' },
        { id: 'ortg', term: 'Offensive rating', short: 'ORtg', body: 'Points scored per 100 possessions. Higher is better.', formula: '100 × points / possessions' },
        { id: 'drtg', term: 'Defensive rating', short: 'DRtg', body: 'Points allowed per 100 possessions. Lower is better.', formula: '100 × points allowed / possessions' },
        {
          id: 'net-rating',
          term: 'Net rating',
          short: 'Net',
          body: 'Offensive minus defensive rating: how many points per 100 possessions a team outscores opponents by. Each team’s comes with how far luck alone could move it after this many games (game margins vary about 12 points around the expected margin), and a team is only called better or worse than average when it clears that.',
          formula: 'ORtg − DRtg',
        },
      ],
    },
    {
      id: 'team-luck',
      title: 'Record and luck',
      terms: [
        {
          id: 'expected-wins',
          term: 'Expected wins',
          body: 'The wins a team’s points scored and allowed usually produce (Daryl Morey’s version of the Pythagorean expectation, exponent 14).',
          formula: 'Games × PF¹⁴ / (PF¹⁴ + PA¹⁴)',
        },
        {
          id: 'team-luck-term',
          term: 'Luck',
          body: 'Wins above or below expected wins. Each team gets a normal-luck band: how far its record could drift from expected wins if close games were coin flips. The site calls a team lucky or unlucky only outside that band, and then expects the record to drift back.',
          formula: 'Wins − expected wins',
        },
      ],
    },
    {
      id: 'four-factors',
      title: 'Four factors',
      note: 'Dean Oliver’s four things that win games, roughly weighted shooting 40%, turnovers 25%, rebounding 20% and free throws 15%. Each is measured for a team’s offense and again for its defense (what it allows).',
      terms: [
        { id: 'team-efg', term: 'Shooting', short: 'eFG%', body: 'Effective field goal percentage of the team’s shots.', formula: '(FGM + 0.5 × 3PM) / FGA' },
        { id: 'team-tov', term: 'Turnovers', short: 'TOV%', body: 'Turnovers per 100 plays. Lower is better on offense.', formula: '100 × TOV / (FGA + 0.44 FTA + TOV)' },
        { id: 'team-oreb', term: 'Offensive rebounding', short: 'OREB%', body: 'The share of its own missed shots a team gets back.', formula: '100 × OREB / (OREB + Opp DREB)' },
        { id: 'team-ft', term: 'Free throws', short: 'FT rate', body: 'Free throws made per field goal attempt.', formula: '100 × FTM / FGA' },
      ],
    },
  ];

  return [
    {
      id: 'reading',
      title: 'How does the site rank and judge?',
      lede: 'The rules behind every rank, range and verdict on the site.',
      groups: reading,
    },
    {
      id: 'players',
      title: 'What do the player stats mean?',
      lede: 'Every stat on player pages, tables and charts, grouped as on the player page.',
      groups: playerGroups,
    },
    {
      id: 'teams',
      title: 'What do the team stats mean?',
      lede: 'The numbers on team pages and the league charts.',
      groups: team,
    },
  ];
}
