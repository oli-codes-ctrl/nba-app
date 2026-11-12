import { readFileSync } from 'fs';
import { join } from 'path';

import { CATALOG, STAT_IDS } from '@/stats/catalog';

const metricsPy = readFileSync(
  join(__dirname, '..', '..', 'pipeline', 'hoops_pipeline', 'metrics.py'),
  'utf8',
);

function pythonStrings(block: string): string[] {
  return Array.from(block.matchAll(/"([a-z0-9_]+)"/g), (m) => m[1]);
}

describe('stat catalog matches the pipeline', () => {
  it('has exactly the stat ids the pipeline publishes, in order', () => {
    const block = metricsPy.match(/STAT_IDS = \(([\s\S]*?)\n\)/);
    expect(block).not.toBeNull();
    expect([...STAT_IDS]).toEqual(pythonStrings(block![1]));
  });

  it('marks the same stats as lower-is-better', () => {
    const block = metricsPy.match(/LOWER_IS_BETTER = frozenset\(\{([^}]*)\}\)/);
    expect(block).not.toBeNull();
    const lower = STAT_IDS.filter((id) => CATALOG[id].lowerIsBetter);
    expect(lower.sort()).toEqual(pythonStrings(block![1]).sort());
  });

  it('ranks every stat except games played and age', () => {
    const unranked = STAT_IDS.filter((id) => !CATALOG[id].ranked);
    expect(unranked).toEqual(['gp', 'age']);
  });
});
