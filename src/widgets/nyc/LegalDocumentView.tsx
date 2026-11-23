'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import type {
  LegalViewBlock,
  LegalViewDocument,
  LegalViewText,
} from '@lib/constants/legalDocument'
import { MISAENG_DESIGN } from '@lib/brand/design'
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
export function LegalDocumentView(props: LegalDocumentViewProps) {
  // Misaeng: one readable language with an English (controlling) toggle. Ellieo keeps the stacked layout below.
  return MISAENG_DESIGN ? <MisaengLegalView {...props} /> : <ClassicLegalView {...props} />
}

function ClassicLegalView({ doc, related }: LegalDocumentViewProps) {
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

/* ───────────── Misaeng (owner 11-23 review): one language, document card, sticky contents ───────────── */

function MisaengLegalView({ doc, related }: LegalDocumentViewProps) {
  const href = useCityPath()
  const cityInfo = useCityInfo()
  const t = useT('legal.view')
  const format = useFormat()
  const pathname = usePathname()
  // /app-view/* has no site header: the sticky parts sit at the very top there
  const inApp = pathname?.includes('/app-view/') ?? false
  const ref = doc.refLocale
  // Korean/Vietnamese readers see their translation (English where a paragraph isn't translated yet);
  // anyone can switch to the English text, which is the controlling version.
  const [english, setEnglish] = useState(!ref)
  const [tocOpen, setTocOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const lang = english ? 'en' : (ref ?? 'en')
  const pick = (text: LegalViewText) => (english ? text.en : (text.ref ?? text.en))

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const localDate = (value: string) => {
    if (english) return value
    const time = Date.parse(value)
    return Number.isNaN(time) ? value : format.date(time, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const contents = (onPick?: () => void) => (
    <ol className='space-y-1'>
      {doc.sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onPick}
            className={cn(
              'block rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug touch-manipulation transition hover:bg-black/[0.04]',
              section.emphasized ? 'font-semibold text-[var(--brand)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            {pick(section.title)}
          </a>
        </li>
      ))}
    </ol>
  )

  return (
    <div className='flex flex-1 flex-col bg-[var(--canvas)]' id='legal-top'>
      <div className={cn(NYC_PAGE_SHELL_CLASS, 'pb-16 pt-4 sm:pt-5 lg:pt-6 sm:pb-20')}>
        {/* Document on the left (title lines up with the nav logo), contents on the right */}
        <div className='lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10'>
          {/* Desktop: contents rail that follows the page */}
          <aside className='hidden lg:order-2 lg:block'>
            <nav
              aria-label={t('contents')}
              className={cn('sticky max-h-[calc(100dvh-7rem)] overflow-y-auto pb-6', inApp ? 'top-4' : 'top-24')}
            >
              <p className='px-2.5 pb-2 text-[12px] font-bold tracking-wide text-[var(--muted)]'>{t('contents')}</p>
              {contents()}
            </nav>
          </aside>

          <article lang={lang} className='min-w-0'>
            <header className='px-1'>
              <p className='text-[13px] font-semibold text-[var(--muted)]'>{doc.eyebrow}</p>
              <h1 className='mt-2 text-[2rem] font-bold leading-tight tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.4rem]'>
                {pick(doc.title)}
              </h1>
              <div className='mt-3 flex flex-wrap items-center gap-2'>
                <span className='rounded-full bg-[var(--brand)]/10 px-3 py-1 text-[13px] font-bold text-[var(--brand)]'>
                  {t('effectivePill', { date: localDate(doc.effectiveDate) })}
                </span>
                <span className='text-[13px] text-[var(--muted)]'>
                  {t('updatedLine', { date: localDate(doc.lastUpdated), version: doc.version })}
                </span>
              </div>
              {ref ? (
                <div className='mt-4 flex flex-wrap items-center gap-2'>
                  <div className='inline-flex rounded-full bg-white p-1 ring-1 ring-black/[0.06]' role='group'>
                    <button
                      type='button'
                      onClick={() => setEnglish(false)}
                      aria-pressed={!english}
                      className={cn(
                        'h-9 rounded-full px-4 text-[13px] font-semibold transition',
                        !english ? 'bg-[var(--foreground)] text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {t('viewTranslation')}
                    </button>
                    <button
                      type='button'
                      onClick={() => setEnglish(true)}
                      aria-pressed={english}
                      className={cn(
                        'h-9 rounded-full px-4 text-[13px] font-semibold transition',
                        english ? 'bg-[var(--foreground)] text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {t('viewEnglish')}
                    </button>
                  </div>
                  <span className='text-[12.5px] text-[var(--muted)]'>{t('controllingShort')}</span>
                </div>
              ) : null}
            </header>

            {/* Mobile: collapsible contents */}
            <div className='mt-5 lg:hidden'>
              <button
                type='button'
                onClick={() => setTocOpen((open) => !open)}
                aria-expanded={tocOpen}
                className='flex h-12 w-full items-center justify-between rounded-2xl bg-white px-4 text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.06]'
              >
                {t('contents')}
                <svg viewBox='0 0 24 24' className={cn('size-4 transition', tocOpen && 'rotate-180')} fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
                  <path d='m6 9 6 6 6-6' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </button>
              {tocOpen ? (
                <nav aria-label={t('contents')} className='mt-2 rounded-2xl bg-white p-2 ring-1 ring-black/[0.06]'>
                  {contents(() => setTocOpen(false))}
                </nav>
              ) : null}
            </div>

            <div className='mt-5 rounded-[1.75rem] bg-white px-5 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.05] sm:px-10 sm:py-10'>
              <p className='rounded-2xl bg-[var(--brand)]/[0.06] px-4 py-3.5 text-[13.5px] leading-relaxed text-[var(--foreground)]'>
                {pick(doc.languageNotice)}
                {!english && doc.refIncomplete ? (
                  <span className='mt-1 block text-[12.5px] text-[var(--muted-foreground)]'>{t('translationIncomplete')}</span>
                ) : null}
              </p>

              <div className='mt-7 space-y-4'>
                {doc.intro.map((paragraph) => (
                  <p key={paragraph.en.slice(0, 40)} className='text-[15px] leading-[1.75] text-[var(--muted-foreground)]'>
                    {pick(paragraph)}
                  </p>
                ))}
              </div>

              <div className='mt-10 space-y-10'>
                {doc.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className={cn(
                      'space-y-3.5',
                      inApp ? 'scroll-mt-4' : 'scroll-mt-24',
                      section.emphasized && 'rounded-2xl bg-[var(--brand)]/[0.05] p-4 ring-1 ring-[var(--brand)]/20 sm:p-6',
                    )}
                  >
                    <h2 className={cn('group text-[17px] font-bold tracking-[-0.01em] text-[var(--foreground)] sm:text-[19px]', section.emphasized && 'text-[var(--brand)]')}>
                      <a href={`#${section.id}`} className='hover:underline hover:underline-offset-4'>
                        {pick(section.title)}
                      </a>
                    </h2>
                    {section.blocks.map((block, index) => (
                      <MisaengLegalBlock key={`${section.id}-${index}`} block={block} pick={pick} />
                    ))}
                  </section>
                ))}
              </div>
            </div>

            <div className='mt-8 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex flex-wrap gap-x-5 gap-y-2 text-[14px]'>
                <Link href={href()} className='font-semibold text-brand touch-manipulation hover:underline'>
                  {t('back', { city: cityInfo.shortLabel })}
                </Link>
                <Link
                  href={related.href}
                  className='font-medium text-[var(--muted-foreground)] touch-manipulation hover:text-[var(--foreground)] hover:underline'
                >
                  {pick(related.label)} →
                </Link>
              </div>
              <a
                href={`mailto:${doc.contactEmail}`}
                className='text-[14px] font-medium text-[var(--muted-foreground)] touch-manipulation hover:text-[var(--foreground)]'
              >
                {doc.contactEmail}
              </a>
            </div>
          </article>
        </div>
      </div>

      {/* Mobile: back to top once the reader is deep in the document */}
      {showTop ? (
        <a
          href='#legal-top'
          aria-label={t('backToTop')}
          className='fixed bottom-5 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-[var(--foreground)] text-white shadow-[0_10px_24px_-10px_rgba(15,23,42,0.6)] lg:hidden'
        >
          <svg viewBox='0 0 24 24' className='size-5' fill='none' stroke='currentColor' strokeWidth='2.2' aria-hidden>
            <path d='m6 15 6-6 6 6' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </a>
      ) : null}
    </div>
  )
}

function MisaengLegalBlock({ block, pick }: { block: LegalViewBlock; pick: (text: LegalViewText) => string }) {
  if (block.type === 'p') {
    return <p className='text-[15px] leading-[1.75] text-[var(--muted-foreground)]'>{pick(block)}</p>
  }
  if (block.type === 'note') {
    return (
      <p className='rounded-2xl bg-[#f6f7f9] px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[var(--foreground)] ring-1 ring-black/[0.04]'>
        {pick(block)}
      </p>
    )
  }
  const ListTag = block.type === 'ol' ? 'ol' : 'ul'
  return (
    <ListTag className={cn('space-y-2.5 pl-5', block.type === 'ol' ? 'list-decimal' : 'list-disc')}>
      {block.items.map((item) => (
        <li key={item.en} className='text-[15px] leading-[1.7] text-[var(--muted-foreground)] marker:text-[var(--muted)]'>
          {pick(item)}
        </li>
      ))}
    </ListTag>
  )
}
