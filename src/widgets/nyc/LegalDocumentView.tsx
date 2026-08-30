import Link from 'next/link'

import type {
  BilingualText,
  LegalBlock,
  LegalDocument,
} from '@lib/constants/legalDocument'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { cn } from '@lib'

type LegalDocumentViewProps = {
  doc: LegalDocument
  relatedHref: string
  relatedLabel: string
  relatedLabelKo?: string
}

/** NYC 법률 문서 — 영어 공식, 한글 참고 표시 */
export function LegalDocumentView({
  doc,
  relatedHref,
  relatedLabel,
  relatedLabelKo,
}: LegalDocumentViewProps) {
  return (
    <div className='flex flex-1 flex-col bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_28%,#ffffff_100%)]'>
      <article
        className={cn(
          NYC_PAGE_SHELL_CLASS,
          'max-w-3xl pb-16 pt-8 sm:pb-20 sm:pt-12',
        )}
      >
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          {doc.eyebrow}
        </p>
        <h1 className='mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl'>
          {doc.title}
        </h1>
        <p className='mt-1 text-[15px] font-medium text-[var(--muted)]'>
          {doc.titleKo}
          <span className='ml-2 text-[12px] font-normal'>(reference)</span>
        </p>
        <p className='mt-3 text-sm text-[var(--muted)]'>
          Version {doc.version} · Last updated: {doc.lastUpdated}
          <span className='mx-2 text-[var(--border)]' aria-hidden>
            ·
          </span>
          Effective: {doc.effectiveDate}
        </p>
        <p className='mt-1 text-[12px] text-[var(--muted)]/80'>
          버전 {doc.version} · 최종 업데이트: {doc.lastUpdatedKo} · 시행일:{' '}
          {doc.effectiveDateKo}
        </p>

        <div className='mt-5 rounded-xl bg-[#fff8f5] px-4 py-3.5 ring-1 ring-[var(--brand)]/15'>
          <p className='text-[13px] leading-relaxed text-[var(--foreground)]'>
            {doc.languageNotice.en}
          </p>
          <p className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
            {doc.languageNotice.ko}
          </p>
        </div>

        <div className='mt-6 rounded-2xl bg-white p-4 ring-1 ring-black/[0.06] sm:p-5'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            Table of contents
          </p>
          <p className='mt-0.5 text-[11px] text-[var(--muted)]'>목차 (참고)</p>
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
                    {section.title}
                  </a>
                  <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                    {section.titleKo}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className='mt-8 space-y-5'>
          {doc.intro.map((paragraph) => (
            <BilingualParagraph key={paragraph.en.slice(0, 40)} text={paragraph} />
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
                  'rounded-2xl bg-[#fff8f5] p-4 ring-2 ring-[var(--brand)]/25 sm:p-5',
              )}
            >
              <h2
                className={cn(
                  'text-base font-semibold text-[var(--foreground)] sm:text-[17px]',
                  section.emphasized && 'text-[var(--brand)]',
                )}
              >
                {section.title}
              </h2>
              <p className='-mt-1 text-[12px] font-medium text-[var(--muted)]'>
                {section.titleKo}
              </p>
              {section.blocks.map((block, index) => (
                <LegalBlockView
                  key={`${section.id}-${index}`}
                  block={block}
                />
              ))}
            </section>
          ))}
        </div>

        <div className='mt-12 flex flex-col gap-3 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap gap-x-4 gap-y-2 text-sm'>
            <Link
              href='/nyc'
              className='font-semibold text-[#F64310] touch-manipulation hover:underline'
            >
              ← Back to NYC
            </Link>
            <Link
              href={relatedHref}
              className='font-medium text-[var(--muted-foreground)] touch-manipulation hover:text-[var(--foreground)] hover:underline'
            >
              {relatedLabel}
              {relatedLabelKo ? (
                <span className='ml-1 text-[12px] text-[var(--muted)]'>
                  ({relatedLabelKo})
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

function BilingualParagraph({ text }: { text: BilingualText }) {
  return (
    <div className='space-y-1.5'>
      <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
        {text.en}
      </p>
      <p className='text-[13px] leading-relaxed text-[var(--muted)]'>{text.ko}</p>
    </div>
  )
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === 'p') {
    return <BilingualParagraph text={block} />
  }

  if (block.type === 'note') {
    return (
      <div className='rounded-xl bg-white px-4 py-3 ring-1 ring-[var(--brand)]/20'>
        <p className='text-[13px] font-medium leading-relaxed text-[var(--foreground)]'>
          <span className='font-semibold'>Note. </span>
          {block.en}
        </p>
        <p className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]'>
          <span className='font-medium'>참고. </span>
          {block.ko}
        </p>
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
          <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
            {item.ko}
          </p>
        </li>
      ))}
    </ListTag>
  )
}
