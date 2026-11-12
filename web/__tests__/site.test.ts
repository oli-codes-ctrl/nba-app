import { initials, percentileColor } from '@/components/primitives';
import { comparePath, idFromSlug, playerPath, playerSlug, statPath, teamPath } from '@/lib/routes';
import { search, type SearchIndex } from '@/lib/search';

describe('routes', () => {
  it('builds one canonical slug per player, ending in his id', () => {
    expect(playerSlug({ id: 3945274, name: 'Luka Doncic' })).toBe('luka-doncic-3945274');
    expect(playerSlug({ id: 1, name: 'Luka Dončić' })).toBe('luka-doncic-1');
    expect(playerSlug({ id: 2, name: "De'Aaron Fox" })).toBe('deaaron-fox-2');
    expect(playerSlug({ id: 3, name: 'Jaren Jackson Jr.' })).toBe('jaren-jackson-jr-3');
    expect(playerSlug({ id: 4, name: 'Shai Gilgeous-Alexander' })).toBe('shai-gilgeous-alexander-4');
    expect(playerPath({ id: 3975, name: 'Stephen Curry' })).toBe('/players/stephen-curry-3975');
  });

  it('reads the id back from a slug', () => {
    expect(idFromSlug('luka-doncic-3945274')).toBe(3945274);
    expect(idFromSlug('3975')).toBe(3975);
    expect(idFromSlug('jaren-jackson-jr-3')).toBe(3);
    expect(idFromSlug('no-id-here')).toBeNull();
  });

  it('keeps defaults out of the query string', () => {
    expect(teamPath('DEN')).toBe('/teams/den');
    expect(statPath('ts_pct')).toBe('/stats/ts_pct');
    expect(statPath('ts_pct', { player: 3975, pos: 'all' })).toBe('/stats/ts_pct?player=3975');
    expect(statPath('ts_pct', { player: 3975, pos: 'G' })).toBe('/stats/ts_pct?player=3975&pos=G');
    expect(comparePath()).toBe('/compare');
    expect(comparePath(1, 2)).toBe('/compare?a=1&b=2');
  });
});

describe('search', () => {
  const index: SearchIndex = {
    players: [
      [1, 'Nikola Jokic', 'nikola jokic', 'DEN', 'C'],
      [2, 'Nikola Jovic', 'nikola jovic', 'MIA', 'F'],
      [3, 'Jalen Johnson', 'jalen johnson', 'ATL', 'F'],
      [4, 'Denzel Valentine', 'denzel valentine', 'CHI', 'G'],
      [5, 'Luka Doncic', 'luka doncic', 'LAL', 'G'],
    ],
    teams: [
      ['DEN', 'Denver'],
      ['LAL', 'LA Lakers'],
    ],
  };

  it('shows the top players before anything is typed', () => {
    expect(search(index, '  ').players.map((p) => p[0])).toEqual([1, 2, 3, 4, 5]);
    expect(search(index, '').teams).toEqual([]);
  });

  it('matches without accents or case, on either side', () => {
    expect(search(index, 'JOKIĆ').players.map((p) => p[1])).toEqual(['Nikola Jokic']);
    expect(search(index, 'dončić').players.map((p) => p[1])).toEqual(['Luka Doncic']);
  });

  it('ranks name prefixes above matches inside a name', () => {
    expect(search(index, 'jo').players.map((p) => p[1])).toEqual(['Nikola Jokic', 'Nikola Jovic', 'Jalen Johnson']);
    expect(search(index, 'den').players.map((p) => p[1])).toEqual(['Denzel Valentine']);
  });

  it('needs every word to match', () => {
    expect(search(index, 'nikola jov').players.map((p) => p[1])).toEqual(['Nikola Jovic']);
    expect(search(index, 'nikola zzz').players).toEqual([]);
  });

  it('finds teams by city or abbreviation', () => {
    expect(search(index, 'den').teams).toEqual([['DEN', 'Denver']]);
    expect(search(index, 'lakers').teams).toEqual([['LAL', 'LA Lakers']]);
    expect(search(index, 'lal').teams).toEqual([['LAL', 'LA Lakers']]);
  });
});

describe('display helpers', () => {
  it('makes initials from the first and last name, skipping suffixes', () => {
    expect(initials('Luka Doncic')).toBe('LD');
    expect(initials('Jaren Jackson Jr.')).toBe('JJ');
    expect(initials('Shai Gilgeous-Alexander')).toBe('SG');
    expect(initials('Nene')).toBe('NE');
  });

  it('maps "better than X%" onto the five-step scale', () => {
    expect(percentileColor(0)).toBe('var(--viz-pct-1)');
    expect(percentileColor(19.9)).toBe('var(--viz-pct-1)');
    expect(percentileColor(20)).toBe('var(--viz-pct-2)');
    expect(percentileColor(50)).toBe('var(--viz-pct-3)');
    expect(percentileColor(79.9)).toBe('var(--viz-pct-4)');
    expect(percentileColor(80)).toBe('var(--viz-pct-5)');
    expect(percentileColor(100)).toBe('var(--viz-pct-5)');
  });
});
