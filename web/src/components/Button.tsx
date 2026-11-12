import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import s from './ui.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

type Common = {
  variant?: ButtonVariant;
  /** Decorative icon before the label. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

function classes(variant: ButtonVariant, className?: string): string {
  return [s.button, s[variant], className].filter(Boolean).join(' ');
}

/** An action. One primary per page; everything else is secondary or tertiary. */
export function Button({
  variant = 'secondary',
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, className)} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

/** Navigation that looks like a button: a real link, so it opens in a new tab and can be copied. */
export function ButtonLink({
  variant = 'secondary',
  icon,
  children,
  className,
  href,
  ...rest
}: Common & { href: string; 'aria-label'?: string }) {
  return (
    <Link href={href} className={classes(variant, className)} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}
