/**
 * The puzzle the static HTML shows. A build runs after the night's games, so
 * most readers' today is the day after `gamesThrough`; the reader's own date
 * takes over once the page hydrates.
 */
export function buildDayPuzzleDate(gamesThrough: string): string {
  const [y, m, d] = gamesThrough.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
