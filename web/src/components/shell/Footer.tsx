import Link from 'next/link';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/icons';
import { formatDate } from '@/lib/format';
import { NAV_LINKS, SITE } from '@/lib/site';
import { loadData } from '@/server/data';

import s from './shell.module.css';

/**
 * Where the numbers come from, how fresh they are, and the rest of the site.
 * The home page passes `close`: its closing call, which makes the footer the
 * last full screen of the page.
 */
export function Footer({ close }: { close?: ReactNode }) {
  const through = formatDate(loadData().through);
  return (
    <footer className={close ? `closing ${s.footer} ${s.footerClosing}` : `closing ${s.footer}`}>
      <div className={`wrap ${s.footerWrap}`}>
        {close ? <div className={s.footerClose}>{close}</div> : null}
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <span className={s.brand}>
              <BrandMark />
              <span translate="no">{SITE.name}</span>
            </span>
            <p className="t-caption">{SITE.tagline}</p>
            <p className="t-caption num">Games through {through}. Updated daily.</p>
          </div>
          <nav aria-label="Footer" className={s.footerNav}>
            <ul className={s.footerList}>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={s.footerLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className={s.footerList}>
              <li>
                <Link href="/glossary" className={s.footerLink}>
                  Glossary
                </Link>
              </li>
              <li>
                <Link href="/about" className={s.footerLink}>
                  About the Data
                </Link>
              </li>
            </ul>
          </nav>
          <p className={`t-caption ${s.footerLegal}`}>
            An independent fan project. Not affiliated with or endorsed by any league, team or broadcaster.
            Statistics are computed from public box scores.
          </p>
        </div>
      </div>
    </footer>
  );
}
