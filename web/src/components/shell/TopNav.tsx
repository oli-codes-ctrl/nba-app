import Link from 'next/link';

import { BrandMark } from '@/components/icons';
import { SITE } from '@/lib/site';

import { MobileMenu, NavLinks } from './NavLinks';
import { Search } from './Search';
import s from './shell.module.css';

/** Sticky bar: wordmark, section links, search. Links fold into a menu under 768px. */
export function TopNav() {
  return (
    <header className={`nav ${s.nav}`}>
      <div className={`wrap ${s.navInner}`}>
        <a href="#main" className="skip-link">
          Skip to Content
        </a>
        <Link href="/" className={s.brand} aria-label={`${SITE.name} home`}>
          <BrandMark />
          <span translate="no">{SITE.name}</span>
        </Link>
        <nav aria-label="Main" className={s.links}>
          <NavLinks />
        </nav>
        <div className={s.navEnd}>
          <Search />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
