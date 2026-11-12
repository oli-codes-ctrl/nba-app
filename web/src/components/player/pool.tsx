'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { SegmentedControl } from '@/components/SegmentedControl';
import { useQueryParam } from '@/lib/useQueryParam';

/** Who a player's ranks compare him with: his position group (default) or every qualified player. */
export type PoolChoice = 'pos' | 'all';

const POOLS: readonly PoolChoice[] = ['pos', 'all'];
const PoolContext = createContext<PoolChoice>('pos');

/** Holds the choice for the page and keeps it in the URL as `?pool=all`. */
export function PoolProvider({
  children,
  groupLabel,
}: {
  children: ReactNode;
  /** "Guards": the label for his position group. Null when ranks by position are unavailable. */
  groupLabel: string | null;
}) {
  const [pool] = useQueryParam<PoolChoice>('pool', 'pos', POOLS);
  return <PoolContext.Provider value={groupLabel ? pool : 'all'}>{children}</PoolContext.Provider>;
}

export function PoolSwitch({ groupLabel }: { groupLabel: string }) {
  const [pool, setPool] = useQueryParam<PoolChoice>('pool', 'pos', POOLS);
  return (
    <SegmentedControl
      label="Compare him with"
      options={[
        { id: 'pos', label: groupLabel },
        { id: 'all', label: 'All Players' },
      ]}
      value={pool}
      onChange={setPool}
    />
  );
}

/**
 * Shows its children only for the chosen pool. Both versions are rendered
 * at build time, so switching is instant and needs no data in the browser.
 */
export function PoolView({ pool, children }: { pool: PoolChoice; children: ReactNode }) {
  return useContext(PoolContext) === pool ? <>{children}</> : null;
}
