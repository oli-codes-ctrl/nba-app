'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { CloseIcon, MenuIcon } from '@/components/icons';
import { NAV_LINKS } from '@/lib/site';

import s from './shell.module.css';

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className={s.linkList}>
      {NAV_LINKS.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className={s.link}
            aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}
            onClick={onNavigate}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The section links as a drop-down sheet on small screens. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);

  // Close after navigating, and on Escape (returning focus to the button).
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={s.mobileOnly}>
      <button
        ref={button}
        type="button"
        className={s.iconButton}
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}>
        {open ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
      </button>
      <nav id={id} aria-label="Main" className={s.sheet} hidden={!open}>
        <div className="container">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </nav>
    </div>
  );
}
