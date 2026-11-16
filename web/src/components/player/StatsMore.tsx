'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { ChevronDownIcon } from '@/components/icons';
import { useQuery } from '@/lib/useQueryParam';

import s from './player.module.css';

/**
 * "Every stat" opens on the short list; one button shows every stat (and,
 * on phones, the group chips that come with it). The choice lives in the
 * URL (`?stats=all`), so a shared link opens the same view.
 */
export function StatsMore({ short, full, total }: { short: ReactNode; full: ReactNode; total: number }) {
  const [query, update] = useQuery();
  const all = query.get('stats') === 'all';

  function toggle() {
    update({ stats: all ? null : 'all', group: null });
    // Collapsing from a long list: bring the section's top back into view.
    if (all) window.requestAnimationFrame(() => document.getElementById('every')?.scrollIntoView({ block: 'start' }));
  }

  return (
    <>
      <div id="every-list">{all ? full : short}</div>
      <div className={s.moreRow}>
        <Button onClick={toggle} aria-expanded={all} aria-controls="every-list" icon={<ChevronDownIcon className={all ? s.moreOpen : undefined} />}>
          {all ? 'Show Key Stats' : `Show All ${total} Stats`}
        </Button>
      </div>
    </>
  );
}
