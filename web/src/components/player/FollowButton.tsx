'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { StarIcon } from '@/components/icons';

const KEY = 'hoops:follows';
const CHANGE = 'hoops:follows-change';

/** Followed player ids, saved in this browser only. */
export function readFollows(): number[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

function writeFollows(ids: number[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private mode or storage full: following just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** Follow a player to pin him to the home page. No account: the list lives in this browser. */
export function FollowButton({ id, name }: { id: number; name: string }) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const sync = () => setFollowing(readFollows().includes(id));
    sync();
    window.addEventListener(CHANGE, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE, sync);
      window.removeEventListener('storage', sync);
    };
  }, [id]);

  return (
    <Button
      aria-pressed={following}
      aria-label={following ? `Following ${name}. Select to unfollow` : `Follow ${name}`}
      icon={<StarIcon filled={following} />}
      onClick={() => {
        const ids = readFollows();
        writeFollows(following ? ids.filter((v) => v !== id) : [...ids, id]);
      }}>
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
