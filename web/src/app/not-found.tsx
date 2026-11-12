import type { Metadata } from 'next';

import { ButtonLink } from '@/components/Button';

export const metadata: Metadata = { title: 'Page Not Found', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: 'var(--space-section)', display: 'grid', gap: 'var(--space-4)', justifyItems: 'start' }}>
      <p className="t-eyebrow t-subtle">404</p>
      <h1 className="t-display-md">That page isn’t here.</h1>
      <p className="t-body t-muted" style={{ maxWidth: '52ch' }}>
        The link may be old, or the player may not have played this season. Search for any player or team with the
        field at the top, or start from the full list.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <ButtonLink variant="primary" href="/players">
          Browse Players
        </ButtonLink>
        <ButtonLink href="/">Go Home</ButtonLink>
      </div>
    </div>
  );
}
