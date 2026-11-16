'use client';

import { useEffect, useRef, useState } from 'react';

import s from './sectionNav.module.css';

export type Section = { id: string; label: string };

/**
 * In-page navigation that sticks under the top bar: real links to each
 * section, the one being read marked as current. On narrow screens it
 * scrolls sideways and keeps the current item in view.
 */
export function SectionNav({ sections, label }: { sections: readonly Section[]; label: string }) {
  const [current, setCurrent] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      // The section whose top has passed under the sticky bars is the one being read.
      const line = (list.current?.getBoundingClientRect().bottom ?? 0) + 24;
      // The lowest section top that has passed the line; side-by-side sections tie, and the first one wins.
      let found: string | null = null;
      let best = -Infinity;
      for (const { id } of sections) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top != null && top <= line && top > best + 1) {
          best = top;
          found = id;
        }
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections]);

  // Keep the current item visible when the list scrolls sideways (phones).
  useEffect(() => {
    const ul = list.current;
    const item = current ? ul?.querySelector<HTMLElement>(`[data-section="${current}"]`) : null;
    if (!ul || !item || ul.scrollWidth <= ul.clientWidth) return;
    const left = item.offsetLeft - (ul.clientWidth - item.offsetWidth) / 2;
    ul.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [current]);

  return (
    <nav aria-label={label} className={s.bar}>
      <ul ref={list} className={s.list}>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              data-section={section.id}
              className={s.item}
              aria-current={current === section.id ? 'location' : undefined}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
