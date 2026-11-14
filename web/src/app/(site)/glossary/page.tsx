import type { Metadata } from 'next';
import Link from 'next/link';

import { Glossary } from '@/components/reference/Glossary';
import { glossary } from '@/components/reference/glossaryTerms';
import s from '@/components/reference/reference.module.css';
import { ogImage, pageMeta } from '@/lib/meta';
import { loadData } from '@/server/data';

export function generateMetadata(): Metadata {
  return pageMeta({
    title: 'Glossary: Every Stat Explained',
    description:
      'Every stat on the site in plain words with its formula: true shooting, usage, Game Score, net rating, the four factors, and the rules behind every rank, range and verdict.',
    path: '/glossary',
    share: 'What does each stat mean?',
    image: ogImage.page('glossary'),
    imageAlt: 'What does each stat mean? The glossary.',
  });
}

export default function GlossaryPage() {
  const data = loadData();
  const sections = glossary(data.players, data.manifest.qualifiedCount);
  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.header}>
        <h1 className="t-display-md">What does each stat mean?</h1>
        <p className={`t-body t-subtle ${s.lede}`}>
          Every stat on the site in plain words, with the formula behind it, and the rules behind every rank, range and
          verdict. Where the data comes from is on{' '}
          <Link href="/about" className="link">
            About the Data
          </Link>
          .
        </p>
      </header>
      <Glossary sections={sections} />
    </div>
  );
}
