'use client';

import { useCallback, useSyncExternalStore } from 'react';

const CHANGE = 'hoops:query-change';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/**
 * One piece of view state kept in the query string, so a link reproduces
 * what the reader sees. The static HTML renders the fallback; the URL's
 * value applies as soon as the page hydrates. The fallback is never written
 * to the URL, so default links stay clean.
 */
export function useQueryParam<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(key),
    () => null,
  );
  const value = raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

  const set = useCallback(
    (next: T) => {
      const url = new URL(window.location.href);
      if (next === fallback) url.searchParams.delete(key);
      else url.searchParams.set(key, next);
      // Replace, not push: flipping a filter should not fill the Back button.
      window.history.replaceState(null, '', url);
      window.dispatchEvent(new Event(CHANGE));
    },
    [key, fallback],
  );

  return [value, set];
}

/**
 * The whole query string, for views with several linked settings (a table's
 * sort, filters and page). `update` changes any number of keys in one
 * history entry; a null value removes the key.
 */
export function useQuery(): [URLSearchParams, (patch: Record<string, string | null>) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
  const update = useCallback((patch: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(CHANGE));
  }, []);
  return [new URLSearchParams(search), update];
}
