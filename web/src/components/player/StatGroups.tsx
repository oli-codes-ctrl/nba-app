'use client';

import type { ReactNode } from 'react';

import { ChoiceChips } from '@/components/ChoiceChips';
import { useQueryParam } from '@/lib/useQueryParam';

import s from './player.module.css';

const GROUPS = [
  { id: 'overall', label: 'Overall' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'other', label: 'Boards & Defense' },
  { id: 'rates', label: 'Team Shares' },
  { id: 'per36', label: 'Per 36' },
  { id: 'per100', label: 'Per 100' },
] as const;

type GroupId = (typeof GROUPS)[number]['id'];
const IDS = GROUPS.map((g) => g.id);

/**
 * On phones, "Every stat" shows one group at a time, picked with chips
 * (`?group=` in the URL); wider screens show every group and no chips.
 * The tables are rendered on the server; this only marks which one shows.
 */
export function StatGroups({ children }: { children: ReactNode }) {
  const [group, setGroup] = useQueryParam<GroupId>('group', 'overall', IDS);
  return (
    <div className={s.groups} data-active={group}>
      <div className={s.groupPicker}>
        <ChoiceChips label="Stat group" options={GROUPS} value={group} onChange={setGroup} />
      </div>
      {children}
    </div>
  );
}
