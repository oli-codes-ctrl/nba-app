import type { ReactNode } from 'react';

import { ChevronRightIcon } from './icons';
import s from './ChartFrame.module.css';

type Props = {
  /** The question this panel answers. */
  title: string;
  /** Who is included: "50 qualified centers". Shown in the footer, beside "How to Read This". */
  meta?: ReactNode;
  /** Controls that change the view (stat picker, table toggle), top right. */
  controls?: ReactNode;
  /** The answer in words: the lead, straight under the question. */
  answer?: ReactNode;
  /** Method notes, behind "How to Read This", so nothing sits as a caption under the chart. */
  howTo?: ReactNode;
  children: ReactNode;
  id: string;
  className?: string;
};

/**
 * The frame every chart and data panel sits in, answer first: the question,
 * the answer in words, the visual, then one footer line saying who is
 * included, with the method behind a disclosure.
 */
export function ChartFrame({ title, meta, controls, answer, howTo, children, id, className }: Props) {
  return (
    <section className={className ? `${s.frame} ${className}` : s.frame} aria-labelledby={`${id}-title`}>
      <header className={s.head}>
        <h2 id={`${id}-title`} className="t-card-title">
          {title}
        </h2>
        {controls ? <div className={s.controls}>{controls}</div> : null}
      </header>
      {answer ? <div className={s.answer}>{answer}</div> : null}
      {children}
      {meta || howTo ? (
        <footer className={howTo ? s.foot : `${s.foot} ${s.footPlain}`}>
          {meta ? <p className={`t-caption t-subtle num ${s.meta}`}>{meta}</p> : null}
          {howTo ? (
            <Disclosure summary="How to Read This" bare>
              {howTo}
            </Disclosure>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}

/**
 * Extra detail behind a click. Native <details>, so it works without JavaScript.
 * By default it runs edge to edge along the bottom of a panel; `bare` drops
 * that, for use inside the chart frame's footer.
 */
export function Disclosure({ summary, children, bare = false }: { summary: string; children: ReactNode; bare?: boolean }) {
  return (
    <details className={bare ? `${s.disclosure} ${s.bare}` : s.disclosure}>
      <summary className={s.summary}>
        <ChevronRightIcon size={14} />
        {summary}
      </summary>
      <div className={`t-body-sm ${s.detail}`}>{children}</div>
    </details>
  );
}
