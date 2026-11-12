import type { ReactNode } from 'react';

import { ChevronRightIcon } from './icons';
import s from './ChartFrame.module.css';

type Props = {
  /** The question this panel answers. */
  title: string;
  /** Who is included and how fresh it is: "132 qualified guards · games through Nov 10, 2026". */
  meta?: ReactNode;
  /** Controls that change the view (stat picker, table toggle). */
  controls?: ReactNode;
  /** The takeaway in words, above the chart. */
  answer?: ReactNode;
  /** Method notes, tucked behind "How to read this" so nothing sits as a caption under the chart. */
  howTo?: ReactNode;
  children: ReactNode;
  id: string;
  className?: string;
};

/**
 * The frame every chart and data panel sits in: question, who is included,
 * the answer in words, then the visual. Explanations live in a disclosure.
 */
export function ChartFrame({ title, meta, controls, answer, howTo, children, id, className }: Props) {
  return (
    <section className={className ? `${s.frame} ${className}` : s.frame} aria-labelledby={`${id}-title`}>
      <header className={s.head}>
        <div className={s.titles}>
          <h2 id={`${id}-title`} className="t-card-title">
            {title}
          </h2>
          {meta ? <p className="t-caption t-subtle num">{meta}</p> : null}
        </div>
        {controls ? <div className={s.controls}>{controls}</div> : null}
      </header>
      {answer ? <div className={s.answer}>{answer}</div> : null}
      {children}
      {howTo ? <Disclosure summary="How to Read This">{howTo}</Disclosure> : null}
    </section>
  );
}

/** Extra detail behind a click. Native <details>, so it works without JavaScript. */
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className={s.disclosure}>
      <summary className={s.summary}>
        <ChevronRightIcon size={14} />
        {summary}
      </summary>
      <div className={`t-body-sm ${s.detail}`}>{children}</div>
    </details>
  );
}
