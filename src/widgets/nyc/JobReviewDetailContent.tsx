'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'

import { useCity } from '@hooks/useCity'
import { hrefForCommunityPost } from '@lib/constants/cities'
import {
  JOB_REVIEW_TIMELINE_FIELDS,
  formatJobReviewDate,
  getJobReviewTypeStyle,
  getLatestJobReviewTimelineEntryId,
  sortJobReviewTimelineByDate,
  summarizeJobReviewTimelineEntry,
} from '@lib/community/jobReview'
import { htmlToPlainText } from '@lib/community/html'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { JobReviewActivityMeta } from '@widgets/nyc/JobReviewActivityMeta'
import { JobReviewTypeBadge } from '@widgets/nyc/JobReviewTypeBadge'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { CreditReviewRequestCard } from '@widgets/nyc/CreditReviewRequestCard'
import { TimelineAccordion } from '@widgets/nyc/TimelineAccordion'
import { TimelineFieldGrid } from '@widgets/nyc/TimelineFieldGrid'
import type { NycCommunityBoardId } from '@lib/constants/nyc'

type JobReviewDetailContentProps = {
  post: CommunityPost
  boardId: NycCommunityBoardId
  boardTitle: string
  isAuthor: boolean
  onDelete: () => void
  /** 번역 표시 + 원문 보기 (번역된 글일 때만 그려진다) */
  translationNotice?: ReactNode
  /** 원문/번역 글자의 언어 (lang 속성) */
  contentLang?: string
}

export function JobReviewDetailContent({
  post,
  boardId,
  isAuthor,
  onDelete,
  translationNotice,
  contentLang,
}: JobReviewDetailContentProps) {
  const city = useCity()
  const t = useT('reviews')
  const locale = useLocale()
  const format = useFormat()
  const tipsHtml = (() => {
    const html = post.contentHtml?.trim() || ''
    if (html && htmlToPlainText(html)) return html
    const tips = post.jobReviewTips?.trim() || ''
    if (!tips) return ''
    return `<p>${tips
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('\n', '<br />')}</p>`
  })()
  const timeline = sortJobReviewTimelineByDate(post.jobReviewTimeline || [])
  const typeStyle = getJobReviewTypeStyle(post.jobReviewType)
  const latestEntryId = getLatestJobReviewTimelineEntryId(timeline)

  const accordionItems = timeline.map((entry, index) => {
    const hasReview = Boolean(htmlToPlainText(entry.stageReviewHtml || ''))
    const fieldItems = JOB_REVIEW_TIMELINE_FIELDS.map((field) => ({
      key: field.key,
      label: t(`jobReview.fields.${field.key}.shortLabel`),
      value: entry[field.key],
      rowClass: field.rowClass,
      labelClass: field.labelClass,
    }))
    return {
      id: entry.id,
      stepNumber: index + 1,
      title: entry.date
        ? formatJobReviewDate(entry.date, { locale })
        : t('detail.noDate'),
      isLatest: entry.id === latestEntryId,
      preview: summarizeJobReviewTimelineEntry(entry) || null,
      hasReview,
      body: (
        <>
          <TimelineFieldGrid items={fieldItems} />
          {hasReview ? (
            <div className='mt-3 rounded-xl bg-[#fafbfc] px-3.5 py-3 ring-1 ring-black/[0.05] sm:px-4 sm:py-3.5'>
              <p className='text-[11px] font-semibold text-[var(--muted)]'>
                {t('detail.stageReview')}
              </p>
              <CommunityRichBody
                html={entry.stageReviewHtml}
                className='mt-1.5 text-[14px] leading-[1.65] text-[var(--foreground)] sm:text-[15px]'
              />
            </div>
          ) : null}
        </>
      ),
    }
  })

  return (
    <article>
      {isAuthor ? (
        <div className='mb-5 px-1 sm:px-0'>
          <BoardSurface className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
            <div>
              <p className='text-[13px] font-semibold text-[var(--foreground)]'>
                {t('jobReview.detail.authorTitle')}
              </p>
              <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
                {t('jobReview.detail.authorBody')}
              </p>
            </div>
            <Link
              href={hrefForCommunityPost(post, city, 'edit')}
              className='inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)]'
            >
              {t('jobReview.detail.addEntry')}
            </Link>
          </BoardSurface>
        </div>
      ) : null}

      {isAuthor ? (
        <div className='mb-5 px-1 sm:px-0'>
          <CreditReviewRequestCard
            post={post}
            boardId={boardId}
            isAuthor={isAuthor}
          />
        </div>
      ) : null}

      <h1 lang={contentLang} className='px-1 text-[1.55rem] font-semibold leading-[1.25] tracking-[-0.035em] text-[var(--foreground)] sm:px-0 sm:text-[1.9rem]'>
        {post.title}
      </h1>

      {translationNotice ? <div className='mt-1.5 px-1 sm:px-0'>{translationNotice}</div> : null}

      <div className='mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 px-1 text-[12px] text-[var(--muted)] sm:px-0'>
        <JobReviewTypeBadge type={post.jobReviewType} />
        {post.location?.trim() ? (
          <>
            <span className='text-black/20' aria-hidden>
              ·
            </span>
            <span className='inline-flex max-w-full items-center truncate rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#3b5bdb] ring-1 ring-[#3b5bdb]/15'>
              {post.location.trim()}
            </span>
          </>
        ) : null}
        <span className='text-black/20' aria-hidden>
          ·
        </span>
        <JobReviewActivityMeta
          createdAt={post.createdAt}
          updatedAt={post.updatedAt}
          compact
        />
        <span className='text-black/20' aria-hidden>
          ·
        </span>
        <span>
          {t('detail.views', {
            views: formatViewCount(format.number, post.viewCount),
          })}
        </span>
        {post.jobReviewIndustry?.trim() ? (
          <span className='inline-flex rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] ring-1 ring-black/8'>
            {post.jobReviewIndustry.trim()}
          </span>
        ) : null}
      </div>

      {timeline.length > 0 ? (
        <section className='mt-8'>
          <SectionLabel>
            {t('jobReview.detail.timelineTitle', { count: timeline.length })}
          </SectionLabel>
          <p className='mt-1.5 px-1 text-[12px] text-[var(--muted)] sm:px-0'>
            {t('detail.accordionHint')}
          </p>
          <TimelineAccordion
            className='mt-4 px-1 sm:px-0'
            items={accordionItems}
            defaultOpenId={latestEntryId}
            accentColor={typeStyle.accent}
            softColor={typeStyle.soft}
          />
        </section>
      ) : (
        <section className='mt-8'>
          <SectionLabel>{t('jobReview.detail.emptySection')}</SectionLabel>
          <BoardSurface className='mt-4 px-4 py-5 sm:px-5'>
            <p className='text-[14px] font-semibold text-[var(--foreground)]'>
              {t('jobReview.detail.emptyTitle')}
            </p>
            <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
              {t('jobReview.detail.emptyBody')}
            </p>
            {isAuthor ? (
              <Link
                href={hrefForCommunityPost(post, city, 'edit')}
                className='mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)]'
              >
                {t('jobReview.detail.emptyCta')}
              </Link>
            ) : null}
          </BoardSurface>
        </section>
      )}

      {tipsHtml ? (
        <section className='mt-8'>
          <SectionLabel>{t('jobReview.detail.tipsTitle')}</SectionLabel>
          <BoardSurface className='mt-4 overflow-hidden'>
            <div className='flex gap-3 bg-[#fffbeb] p-4 sm:p-5'>
              <span
                className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[15px]'
                aria-hidden
              >
                ⚠️
              </span>
              <div className='min-w-0 flex-1'>
                <CommunityRichBody
                  html={tipsHtml}
                  className='!text-[13px] !leading-[1.65] text-[var(--foreground)]'
                />
              </div>
            </div>
          </BoardSurface>
        </section>
      ) : null}

      <div className='mt-8'>
        <CommunityPostFooter
          post={post}
          boardId={boardId}
          anonymous={false}
          isAuthor={isAuthor}
          loginNext={hrefForCommunityPost(post, city)}
          editLabel={t('detail.editLabel')}
          onDelete={onDelete}
        />
      </div>
    </article>
  )
}

/** 1만 이상은 축약 (10K / 1만) */
function formatViewCount(
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string,
  value: number,
) {
  const n = Math.max(0, Math.floor(Number(value) || 0))
  if (n >= 10_000) {
    return `${formatNumber(n, { notation: 'compact', maximumFractionDigits: 0 })}+`
  }
  return formatNumber(n)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='flex items-center gap-3 px-1 text-[13px] font-semibold tracking-wide text-[var(--muted)] sm:px-0'>
      {children}
      <span className='h-px flex-1 bg-black/[0.06]' aria-hidden />
    </h2>
  )
}

