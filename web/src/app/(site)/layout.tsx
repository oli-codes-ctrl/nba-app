import type { ReactNode } from 'react';

import { Footer } from '@/components/shell/Footer';

/** Every page except the home page: content, then the plain footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
