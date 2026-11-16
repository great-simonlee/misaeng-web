'use client'

import Link from 'next/link'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import type { LegalViewBlock, LegalViewDocument, LegalViewText } from '@lib/constants/legalDocument'
import { useFormat, useT } from '@lib/i18n/client'

/**
 * Ellieo legal document (terms, privacy): big title, a chip row for the sections, the language notice as a soft card,
 * then each section as its own card. English is the official text; the reader's language shows under it as a reference.
 * Same data as the Misaeng view (LegalDocumentView).
 */
export function EllieoLegalDocumentView({
  doc,
  related,
}: {
  doc: LegalViewDocument
  related: { href: string; label: LegalViewText }
}) {
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
    <div className='min-w-0 flex-1 bg-white'>
      <article lang='en' className='mx-auto w-full max-w-[40rem] px-4 pb-14 pt-6'>
        <span className='inline-flex rounded-full bg-[var(--surface)] px-3 py-1 text-[12px] font-bold text-[var(--muted-foreground)]'>
          {doc.eyebrow}
        </span>
        <h1 className='mt-3 text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[var(--foreground)] sm:text-[40px]'>
          {doc.title.en}
        </h1>
        {doc.title.ref ? (
          <p lang={ref ?? undefined} className='mt-1.5 text-[16px] font-semibold text-[var(--muted-foreground)]'>
            {doc.title.ref} <span className='text-[12px] font-normal text-[var(--muted)]'>({t('reference')})</span>
          </p>
        ) : null}
        <div className='mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-semibold'>
          <span className='rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[var(--brand-deep)]'>v{doc.version}</span>
          <span className='rounded-full bg-[var(--surface)] px-2.5 py-1 text-[var(--muted-foreground)]'>
            Updated {doc.lastUpdated}
          </span>
          <span className='rounded-full bg-[var(--brand)] px-2.5 py-1 text-white'>Effective {doc.effectiveDate}</span>
        </div>
        {ref ? (
          <p lang={ref} className='mt-2 text-[12px] text-[var(--muted)]'>
            {t('versionLine', { version: doc.version, updated: localDate(doc.lastUpdated), effective: localDate(doc.effectiveDate) })}
          </p>
        ) : null}

        {/* Sections as chips */}
        <nav aria-label='Table of contents' className='sticky top-14 z-10 -mx-4 mt-5 bg-white/95 px-4 py-2.5 backdrop-blur sm:top-16'>
          <ol className='flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {doc.sections.map((section) => (
              <li key={section.id} className='shrink-0'>
                <a
                  href={`#${section.id}`}
                  className={
                    section.emphasized
                      ? 'inline-flex h-9 items-center rounded-full bg-[var(--brand)] px-3.5 text-[13.5px] font-semibold text-white'
                      : 'inline-flex h-9 items-center rounded-full bg-[var(--surface)] px-3.5 text-[13.5px] font-semibold text-[var(--foreground)] hover:bg-[var(--border)]'
                  }
                >
                  {section.title.en}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Language notice */}
        <div className='mt-4 rounded-[1.25rem] bg-[var(--brand-soft)] px-4 py-3.5'>
          <p className='text-[13.5px] leading-relaxed text-[var(--foreground)]'>{doc.languageNotice.en}</p>
          {doc.languageNotice.ref ? (
            <p lang={ref ?? undefined} className='mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
              {doc.languageNotice.ref}
            </p>
          ) : null}
          {ref && doc.refIncomplete ? (
            <p lang={ref} className='mt-1.5 text-[12px] text-[var(--muted)]'>
              {t('translationIncomplete')}
            </p>
          ) : null}
        </div>

        {doc.intro.length > 0 ? (
          <div className='mt-5 space-y-4'>
            {doc.intro.map((paragraph) => (
              <Paragraph key={paragraph.en.slice(0, 40)} text={paragraph} refLocale={ref} />
            ))}
          </div>
        ) : null}

        <div className='mt-6 space-y-3'>
          {doc.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className={
                section.emphasized
                  ? 'scroll-mt-32 space-y-3 rounded-[1.5rem] bg-[var(--brand-soft)] p-5 ring-2 ring-[var(--brand)]/30'
                  : 'scroll-mt-32 space-y-3 rounded-[1.5rem] bg-white p-5 shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)]'
              }
            >
              <div className='flex items-start gap-3'>
                <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[13px] font-extrabold text-[var(--brand)]'>
                  {index + 1}
                </span>
                <div className='min-w-0'>
                  <h2 className='text-[18px] font-extrabold leading-snug tracking-[-0.02em] text-[var(--foreground)]'>
                    {section.title.en.replace(/^\d+\.\s*/, '')}
                  </h2>
                  {section.title.ref ? (
                    <p lang={ref ?? undefined} className='mt-0.5 text-[12.5px] font-medium text-[var(--muted)]'>
                      {section.title.ref}
                    </p>
                  ) : null}
                </div>
              </div>
              {section.blocks.map((block, blockIndex) => (
                <Block key={`${section.id}-${blockIndex}`} block={block} refLocale={ref} noteLabel={t('note')} />
              ))}
            </section>
          ))}
        </div>

        <div className='mt-8 flex flex-wrap gap-2'>
          <Link
            href={href()}
            lang={ref ?? 'en'}
            className='inline-flex h-11 items-center rounded-full bg-[var(--brand)] px-5 text-[14px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
          >
            {t('back', { city: cityInfo.shortLabel })}
          </Link>
          <Link
            href={related.href}
            className='inline-flex h-11 items-center rounded-full bg-[var(--surface)] px-5 text-[14px] font-bold text-[var(--foreground)] transition hover:bg-[var(--border)]'
          >
            {related.label.en}
            {related.label.ref ? (
              <span lang={ref ?? undefined} className='ml-1 text-[12px] font-medium text-[var(--muted)]'>
                ({related.label.ref})
              </span>
            ) : null}
          </Link>
          <a
            href={`mailto:${doc.contactEmail}`}
            className='inline-flex h-11 items-center rounded-full px-3 text-[14px] font-semibold text-[var(--brand)]'
          >
            {doc.contactEmail}
          </a>
        </div>
      </article>
    </div>
  )
}

function Paragraph({ text, refLocale }: { text: LegalViewText; refLocale: string | null }) {
  return (
    <div className='space-y-1'>
      <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{text.en}</p>
      {text.ref ? (
        <p lang={refLocale ?? undefined} className='text-[13px] leading-relaxed text-[var(--muted)]'>
          {text.ref}
        </p>
      ) : null}
    </div>
  )
}

function Block({ block, refLocale, noteLabel }: { block: LegalViewBlock; refLocale: string | null; noteLabel: string }) {
  if (block.type === 'p') return <Paragraph text={block} refLocale={refLocale} />
  if (block.type !== 'ul' && block.type !== 'ol') {
    return (
      <div className='rounded-[1.125rem] bg-[var(--surface)] px-4 py-3'>
        <p className='text-[13.5px] font-medium leading-relaxed text-[var(--foreground)]'>
          <span className='font-bold'>Note. </span>
          {block.en}
        </p>
        {block.ref ? (
          <p lang={refLocale ?? undefined} className='mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]'>
            <span className='font-medium'>{noteLabel} </span>
            {block.ref}
          </p>
        ) : null}
      </div>
    )
  }
  const ListTag = block.type === 'ol' ? 'ol' : 'ul'
  return (
    <ListTag className={block.type === 'ol' ? 'list-decimal space-y-2.5 pl-5' : 'space-y-2.5'}>
      {block.items.map((item) => (
        <li key={item.en} className={block.type === 'ol' ? 'marker:font-bold marker:text-[var(--brand)]' : 'flex gap-2.5'}>
          {block.type === 'ul' ? <span aria-hidden className='mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[var(--brand)]' /> : null}
          <div className='min-w-0'>
            <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{item.en}</p>
            {item.ref ? (
              <p lang={refLocale ?? undefined} className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
                {item.ref}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ListTag>
  )
}
