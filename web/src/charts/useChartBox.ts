'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * A chart's container: its width (charts are sized by their column, not the
 * window) and whether it has come near the viewport, so charts below the
 * fold are not drawn until the reader scrolls toward them (and then appear
 * at rest: only charts visible at load animate in).
 */
export function useChartBox<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  width: number;
  ready: boolean;
  /** On screen when the page loaded: the only charts that play the load-in. */
  entering: boolean;
} {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  const [near, setNear] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setEntering(el.getBoundingClientRect().top < window.innerHeight);
    const resize = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    resize.observe(el);
    const view = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          view.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    view.observe(el);
    return () => {
      resize.disconnect();
      view.disconnect();
    };
  }, []);

  return { ref, width, ready: near && width > 0, entering };
}
