'use client'

import Link from 'next/link'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import type {
  LegalViewBlock,
  LegalViewDocument,
  LegalViewText,
} from '@lib/constants/legalDocument'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'

type LegalDocumentViewProps = {
  doc: LegalViewDocument
  related: { href: string; label: LegalViewText }
}

/**
 * NYC 법률 문서 — 영어가 공식 문구이고, 보는 언어(영어가 아니면)의 참고 번역을 아래에 작게 보여 준다.
 * 아직 번역이 없는 문단은 영어만 보인다.
 */
export function LegalDocumentView({ doc, related }: LegalDocumentViewProps) {
  const href = useCityPath()
  const cityInfo = useCityInfo()
  const t = useT('legal.view')
  const format = useFormat()
  const ref = doc.refLocale
  const localDate = (value: string) => {
    const time = Date.parse(value)
    return Number.isNaN(time) ? value : format.date(time, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className='flex flex-1 flex-col bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_28%,#ffffff_100%)]'>
      <article
        lang='en'
        className={cn(
          NYC_PAGE_SHELL_CLASS,
          'max-w-3xl pb-16 pt-8 sm:pb-20 sm:pt-12',
        )}
      >
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          {doc.eyebrow}
        </p>
        <h1 className='mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl'>
          {doc.title.en}
        </h1>
        {doc.title.ref ? (
          <p lang={ref ?? undefined} className='mt-1 text-[15px] font-medium text-[var(--muted)]'>
            {doc.title.ref}
            <span className='ml-2 text-[12px] font-normal'>({t('reference')})</span>
          </p>
        ) : null}
        <p className='mt-3 text-sm text-[var(--muted)]'>
          Version {doc.version} · Last updated: {doc.lastUpdated}
          <span className='mx-2 text-[var(--border)]' aria-hidden>
            ·
          </span>
          Effective: {doc.effectiveDate}
        </p>
        {ref ? (
          <p lang={ref} className='mt-1 text-[12px] text-[var(--muted)]/80'>
            {t('versionLine', {
              version: doc.version,
              updated: localDate(doc.lastUpdated),
              effective: localDate(doc.effectiveDate),
            })}
          </p>
        ) : null}

        <div className='mt-5 rounded-xl bg-brand-soft px-4 py-3.5 ring-1 ring-[var(--brand)]/15'>
          <p className='text-[13px] leading-relaxed text-[var(--foreground)]'>
            {doc.languageNotice.en}
          </p>
          {doc.languageNotice.ref ? (
            <p lang={ref ?? undefined} className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
              {doc.languageNotice.ref}
            </p>
          ) : null}
          {ref && doc.refIncomplete ? (
            <p lang={ref} className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]'>
              {t('translationIncomplete')}
            </p>
          ) : null}
        </div>

        <div className='mt-6 rounded-2xl bg-white p-4 ring-1 ring-black/[0.06] sm:p-5'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            Table of contents
          </p>
          {ref ? (
            <p lang={ref} className='mt-0.5 text-[11px] text-[var(--muted)]'>
              {t('tableOfContents')}
            </p>
          ) : null}
          <nav
            className='mt-2.5 columns-1 gap-x-8 sm:columns-2'
            aria-label='Table of contents'
          >
            <ol className='space-y-2 text-[13px] leading-snug text-[var(--muted-foreground)]'>
              {doc.sections.map((section) => (
                <li key={section.id} className='break-inside-avoid'>
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      'touch-manipulation underline-offset-2 hover:underline',
                      section.emphasized
                        ? 'font-semibold text-[var(--brand)]'
                        : 'text-[var(--foreground)]/85',
                    )}
                  >
                    {section.title.en}
                  </a>
                  {section.title.ref ? (
                    <span lang={ref ?? undefined} className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                      {section.title.ref}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className='mt-8 space-y-5'>
          {doc.intro.map((paragraph) => (
            <ReferencedParagraph key={paragraph.en.slice(0, 40)} text={paragraph} refLocale={ref} />
          ))}
        </div>

        <div className='mt-10 space-y-10'>
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={cn(
                'scroll-mt-24 space-y-3',
                section.emphasized &&
                  'rounded-2xl bg-brand-soft p-4 ring-2 ring-[var(--brand)]/25 sm:p-5',
              )}
            >
              <h2
                className={cn(
                  'text-base font-semibold text-[var(--foreground)] sm:text-[17px]',
                  section.emphasized && 'text-[var(--brand)]',
                )}
              >
                {section.title.en}
              </h2>
              {section.title.ref ? (
                <p lang={ref ?? undefined} className='-mt-1 text-[12px] font-medium text-[var(--muted)]'>
                  {section.title.ref}
                </p>
              ) : null}
              {section.blocks.map((block, index) => (
                <LegalBlockView
                  key={`${section.id}-${index}`}
                  block={block}
                  refLocale={ref}
                  noteLabel={t('note')}
                />
              ))}
            </section>
          ))}
        </div>

        <div className='mt-12 flex flex-col gap-3 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap gap-x-4 gap-y-2 text-sm'>
            <Link
              href={href()}
              lang={ref ?? 'en'}
              className='font-semibold text-brand touch-manipulation hover:underline'
            >
              {t('back', { city: cityInfo.shortLabel })}
            </Link>
            <Link
              href={related.href}
              className='font-medium text-[var(--muted-foreground)] touch-manipulation hover:text-[var(--foreground)] hover:underline'
            >
              {related.label.en} →
              {related.label.ref ? (
                <span lang={ref ?? undefined} className='ml-1 text-[12px] text-[var(--muted)]'>
                  ({related.label.ref})
                </span>
              ) : null}
            </Link>
          </div>
          <a
            href={`mailto:${doc.contactEmail}`}
            className='text-sm font-medium text-[var(--muted-foreground)] touch-manipulation hover:text-[var(--foreground)]'
          >
            {doc.contactEmail}
          </a>
        </div>
      </article>
    </div>
  )
}

function ReferencedParagraph({ text, refLocale }: { text: LegalViewText; refLocale: string | null }) {
  return (
    <div className='space-y-1.5'>
      <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
        {text.en}
      </p>
      {text.ref ? (
        <p lang={refLocale ?? undefined} className='text-[13px] leading-relaxed text-[var(--muted)]'>
          {text.ref}
        </p>
      ) : null}
    </div>
  )
}

function LegalBlockView({
  block,
  refLocale,
  noteLabel,
}: {
  block: LegalViewBlock
  refLocale: string | null
  noteLabel: string
}) {
  if (block.type !== 'ul' && block.type !== 'ol') {
    if (block.type === 'p') return <ReferencedParagraph text={block} refLocale={refLocale} />
    return (
      <div className='rounded-xl bg-white px-4 py-3 ring-1 ring-[var(--brand)]/20'>
        <p className='text-[13px] font-medium leading-relaxed text-[var(--foreground)]'>
          <span className='font-semibold'>Note. </span>
          {block.en}
        </p>
        {block.ref ? (
          <p lang={refLocale ?? undefined} className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]'>
            <span className='font-medium'>{noteLabel} </span>
            {block.ref}
          </p>
        ) : null}
      </div>
    )
  }

  const ListTag = block.type === 'ol' ? 'ol' : 'ul'
  const listClass =
    block.type === 'ol'
      ? 'list-decimal space-y-3 pl-5'
      : 'list-disc space-y-3 pl-5'

  return (
    <ListTag className={listClass}>
      {block.items.map((item) => (
        <li key={item.en} className='marker:text-[var(--muted)]'>
          <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
            {item.en}
          </p>
          {item.ref ? (
            <p lang={refLocale ?? undefined} className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
              {item.ref}
            </p>
          ) : null}
        </li>
      ))}
    </ListTag>
  )
}
