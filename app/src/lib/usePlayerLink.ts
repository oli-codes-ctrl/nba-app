import { router, useSegments } from 'expo-router';
import { useCallback } from 'react';

/**
 * Opens a player page inside the current tab's stack, so Back returns to
 * where you were. Shared screens use this instead of a fixed path.
 */
export function usePlayerLink(): (id: number) => void {
  const tab: string = useSegments()[0] ?? '';
  return useCallback(
    (id: number) => {
      const params = { id: String(id) };
      switch (tab) {
        case 'players':
          router.push({ pathname: '/players/player/[id]', params });
          break;
        case 'graphs':
          router.push({ pathname: '/graphs/player/[id]', params });
          break;
        case 'play':
          router.push({ pathname: '/play/player/[id]', params });
          break;
        default:
          router.push({ pathname: '/player/[id]', params });
      }
    },
    [tab],
  );
}
