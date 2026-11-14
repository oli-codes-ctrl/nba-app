'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { ChevronRightIcon, SearchIcon } from '@/components/icons';
import { fold } from '@/lib/fold';
import { useQuery } from '@/lib/useQueryParam';

import type { GlossarySection, Term } from './glossaryTerms';
import s from './reference.module.css';

function haystack(t: Term): string {
  return fold([t.term, t.short, t.body, t.formula].filter(Boolean).join(' '));
}

/**
 * Every term, grouped, with a filter whose text lives in ?q=. The static
 * HTML holds every term; the filter applies after hydration.
 */
export function Glossary({ sections }: { sections: GlossarySection[] }) {
  const [query, update] = useQuery();
  const search = query.get('q') ?? '';
  // The field keeps its own text and writes the URL after a pause.
  const [text, setText] = useState(search);
  useEffect(() => setText(search), [search]);
  useEffect(() => {
    if (text === search) return;
    const timer = window.setTimeout(() => update({ q: text.trim() ? text : null }), 250);
    return () => window.clearTimeout(timer);
  }, [text, search, update]);

  // A link to a term (/glossary#usg_pct) lands before the web font swaps in and the text reflows; land again once it has.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    let live = true;
    void document.fonts.ready.then(() => {
      if (live) document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => {
      live = false;
    };
  }, []);

  const index = useMemo(() => {
    const map = new Map<string, string>();
    for (const sec of sections) for (const g of sec.groups) for (const t of g.terms) map.set(t.id, haystack(t));
    return map;
  }, [sections]);
  const total = index.size;

  const needle = fold(text.trim());
  const words = needle.split(/\s+/).filter(Boolean);
  const matches = (t: Term) => words.every((w) => index.get(t.id)!.includes(w));
  const shown = sections
    .map((sec) => ({
      ...sec,
      groups: sec.groups.map((g) => ({ ...g, terms: words.length ? g.terms.filter(matches) : g.terms })).filter((g) => g.terms.length),
    }))
    .filter((sec) => sec.groups.length);
  const count = shown.reduce((n, sec) => n + sec.groups.reduce((m, g) => m + g.terms.length, 0), 0);

  // While a search hides part of the page, a contents link clears it first, then jumps once the section is back.
  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (!words.length) return;
    event.preventDefault();
    setText('');
    update({ q: null });
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
        window.history.replaceState(window.history.state, '', '#' + id);
      }),
    );
  }

  return (
    <div className={s.layout}>
      <aside className={s.rail} aria-label="On this page">
        <p className={`t-eyebrow t-subtle ${s.railTitle}`}>On this page</p>
        <ul className={s.toc}>
          {sections.map((sec) => (
            <li key={sec.id}>
              <a href={`#${sec.id}`} className={s.tocLink} onClick={(e) => jump(e, sec.id)}>
                {sec.title}
              </a>
              <ul className={s.tocSub}>
                {sec.groups.map((g) => (
                  <li key={g.id}>
                    <a href={`#${g.id}`} className={s.tocSubLink} onClick={(e) => jump(e, g.id)}>
                      {g.title}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>

      <div className={s.content}>
        <div className={s.tools}>
          <label className={s.filter}>
            <span className="visually-hidden">Find a term</span>
            <SearchIcon />
            <input
              className={s.filterInput}
              type="text"
              name="glossary-filter"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Find a term, like TS% or usage…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="t-caption t-subtle num" aria-live="polite">
            {words.length ? `${count} of ${total} terms match` : `${total} terms`}
          </p>
        </div>

        {shown.length === 0 ? (
          <div className={s.empty}>
            <p className="t-body t-strong">No term matches “{text.trim()}”.</p>
            <p className="t-body-sm t-subtle">Try an abbreviation (TS%, USG%) or a plain word (rebounds, luck).</p>
            <Button onClick={() => setText('')}>Clear Search</Button>
          </div>
        ) : (
          shown.map((sec) => (
            <section key={sec.id} id={sec.id} className={s.section} aria-labelledby={`${sec.id}-title`}>
              <header className={s.sectionHead}>
                <h2 id={`${sec.id}-title`} className="t-headline">
                  {sec.title}
                </h2>
                <p className="t-body t-muted">{sec.lede}</p>
              </header>
              {sec.groups.map((g) => (
                <div key={g.id} id={g.id} className={s.group}>
                  <div className={s.groupHead}>
                    <h3 className="t-card-title">{g.title}</h3>
                    {g.note ? <p className="t-body-sm t-muted">{g.note}</p> : null}
                  </div>
                  <dl className={s.terms}>
                    {g.terms.map((t) => (
                      <div key={t.id} id={t.id} className={s.term}>
                        <dt className={s.termName}>
                          <span className="t-strong">{t.term}</span>
                          {t.short ? <span className={`t-caption t-subtle ${s.short}`} translate="no">
                              {t.short}
                            </span> : null}
                        </dt>
                        <dd className={s.termBody}>
                          <p className="t-body-sm t-muted">{t.body}</p>
                          {t.formula ? (
                            <p className={s.formula}>
                              <span className="visually-hidden">Formula: </span>
                              <code translate="no">{t.formula}</code>
                            </p>
                          ) : null}
                          {t.tag || t.href ? (
                            <p className={`t-caption ${s.termFoot}`}>
                              {t.tag ? <span className="t-subtle">{t.tag}</span> : null}
                              {t.href ? (
                                <Link href={t.href} prefetch={false} className={`link ${s.termLink}`}>
                                  {t.hrefLabel}
                                  <span className="visually-hidden"> ranked by {t.term.toLowerCase()}</span>
                                  <ChevronRightIcon size={12} />
                                </Link>
                              ) : null}
                            </p>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
