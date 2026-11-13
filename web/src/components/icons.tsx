/**
 * Icons, drawn here so the site ships no icon font or library. All are
 * decorative (aria-hidden): the control that holds one carries the label.
 */
import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.25 10.25 3.25 3.25" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 5h11M2.5 11h11" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3.5v9M3.5 8h9" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.5 6 4.5 4.5L12.5 6" />
  </Icon>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m8 1.9 1.85 3.9 4.25.56-3.1 2.98.77 4.26L8 11.55 4.23 13.6 5 9.34 1.9 6.36l4.25-.56L8 1.9Z" />
  </Icon>
);

export const CompareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 2.5v11M10.5 2.5v11M2 5.5l3.5-3 3.5 3M7 10.5l3.5 3 3.5-3" />
  </Icon>
);

export const TableIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M2 6.5h12M2 9.75h12M6.25 6.5V13" />
  </Icon>
);

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 13.5h11M2.5 10.5l3.25-3.5 2.75 2 4.5-5.5" />
  </Icon>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 13V3M3.75 7.25 8 3l4.25 4.25" />
  </Icon>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3v10M3.75 8.75 8 13l4.25-4.25" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.25 14.25 13H1.75L8 2.25ZM8 6.5v3M8 11.25v.01" />
  </Icon>
);

/** The brand mark: a percentile ring with its range bar, the site's signature chart. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="5" stroke="var(--accent)" strokeWidth="2.5" />
      <rect x="3" y="16" width="14" height="2.5" rx="1.25" fill="var(--accent)" />
    </svg>
  );
}
