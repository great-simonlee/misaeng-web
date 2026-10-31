'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import Link from 'next/link'

import { useCity } from '@hooks/useCity'
import { cn } from '@lib'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import {
  CPT_OPT_TIMELINE_FIELDS,
  formatCptOptDate,
  getLatestTimelineEntryId,
  sortTimelineByDate,
} from '@lib/community/cptOpt'
import { htmlToPlainText } from '@lib/community/html'
import {
  JOB_REVIEW_TIMELINE_FIELDS,
  formatJobReviewDate,
  getLatestJobReviewTimelineEntryId,
  sortJobReviewTimelineByDate,
} from '@lib/community/jobReview'
import { hrefForCommunityPost } from '@lib/constants/cities'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import { getVerifiedSchool } from '@lib/constants/schools'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { BadgeCheckIcon, FlagIcon } from '@widgets/ellieo/icons'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CptOptTypeBadge } from '@widgets/nyc/CptOptTypeBadge'
import { CreditReviewRequestCard } from '@widgets/nyc/CreditReviewRequestCard'
import { JobReviewTypeBadge } from '@widgets/nyc/JobReviewTypeBadge'

type Props = {
  post: CommunityPost
  boardId: NycCommunityBoardId
  isAuthor: boolean
  onDelete: () => void
  translationNotice?: ReactNode
  contentLang?: string
}

type Step = {
  id: string
  date: string
  /** Shown big next to the date (job reviews: the stage, e.g. "Onsite") */
  headline: string
  fields: { key: string; label: string; value: string }[]
  notesHtml: string
  latest: boolean
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1f5eff, #12b5cb)',
  'linear-gradient(135deg, #0b8f6a, #7fd8b8)',
  'linear-gradient(135deg, #f2a516, #ff5a5f)',
  'linear-gradient(135deg, #7a4cff, #c13584)',
]

function gradientFor(text: string): string {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

function escapeText(text: string): string {
  return `<p>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br />')}</p>`
}

/**
 * Ellieo detail for visa (status) and job review posts. Misaeng keeps CptOptDetailContent /
 * JobReviewDetailContent. Header like the list rows (type tag, big title, author line), every step
 * open on a vertical timeline (dot + line, date, short fields, stage notes), tips as a calm callout,
 * then the shared actions footer.
 */
export function EllieoTimelineDetail({ post, boardId, isAuthor, onDelete, translationNotice, contentLang }: Props) {
  const t = useT('reviews')
  const tc = useT('community')
  const th = useT('hub')
  const locale = useLocale()
  const format = useFormat()
  const city = useCity()
  const isJob = boardId === 'job-review'

  const steps: Step[] = isJob
    ? (() => {
        const sorted = sortJobReviewTimelineByDate(post.jobReviewTimeline ?? [])
        const latestId = getLatestJobReviewTimelineEntryId(sorted)
        return sorted.map((entry) => ({
          id: entry.id,
          date: entry.date ? formatJobReviewDate(entry.date, { locale }) : t('detail.noDate'),
          headline: entry.stageLabel.trim(),
          fields: JOB_REVIEW_TIMELINE_FIELDS.filter((field) => field.key !== 'stageLabel').map((field) => ({
            key: field.key,
            label: t(`jobReview.fields.${field.key}.shortLabel`),
            value: String(entry[field.key] ?? '').trim(),
          })),
          notesHtml: entry.stageReviewHtml ?? '',
          latest: entry.id === latestId,
        }))
      })()
    : (() => {
        const sorted = sortTimelineByDate(post.cptOptTimeline ?? [])
        const latestId = getLatestTimelineEntryId(sorted)
        return sorted.map((entry) => ({
          id: entry.id,
          date: entry.date ? formatCptOptDate(entry.date, { locale }) : t('detail.noDate'),
          headline: '',
          fields: CPT_OPT_TIMELINE_FIELDS.map((field) => ({
            key: field.key,
            label: t(`cptOpt.fields.${field.key}.shortLabel`),
            value: String(entry[field.key] ?? '').trim(),
          })),
          notesHtml: entry.stageReviewHtml ?? '',
          latest: entry.id === latestId,
        }))
      })()

  const tipsHtml = (() => {
    const html = post.contentHtml?.trim() || ''
    if (html && htmlToPlainText(html)) return html
    const tips = (isJob ? post.jobReviewTips : post.cptOptTips)?.trim() || ''
    return tips ? escapeText(tips) : ''
  })()

  const name = getCommunityAuthorDisplayName(post, null, tc)
  const school = getVerifiedSchool(post.authorSchoolId ?? '')?.shortName ?? null
  const photo = post.authorPhotoURL?.trim() || null
  const prefix = isJob ? 'jobReview' : 'cptOpt'

  return (
    <article className='min-w-0'>
      {/* Header */}
      <div className='flex flex-wrap items-center gap-2'>
        {isJob ? <JobReviewTypeBadge type={post.jobReviewType} /> : <CptOptTypeBadge type={post.cptOptType} />}
        {post.location?.trim() ? (
          <span className='rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--muted-foreground)]'>
            {post.location.trim()}
          </span>
        ) : null}
      </div>
      <h1
        lang={contentLang}
        className='mt-3 text-[1.75rem] font-extrabold leading-[1.2] tracking-[-0.03em] text-[var(--foreground)] sm:text-[2.1rem]'
      >
        {post.title}
      </h1>
      {translationNotice ? <div className='mt-2'>{translationNotice}</div> : null}

      <div className='mt-4 flex items-center gap-2.5'>
        <Avatar photo={photo} name={name} />
        <div className='min-w-0'>
          <p className='flex items-center gap-1 text-[14px] font-semibold text-[var(--foreground)]'>
            <span className='truncate'>{name}</span>
            {school ? (
              <>
                <BadgeCheckIcon className='size-4 shrink-0 text-[var(--ellieo-jade)]' />
                <span className='font-medium text-[var(--muted-foreground)]'>{school}</span>
              </>
            ) : null}
          </p>
          <p className='text-[12.5px] text-[var(--muted)]'>
            {format.date(post.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
            {post.updatedAt > post.createdAt + 60_000
              ? ` · ${th('ellieo.detail.updated', { date: format.relative(post.updatedAt) })}`
              : ''}
            {` · ${th('ellieo.row.views', { count: format.number(post.viewCount) })}`}
          </p>
        </div>
      </div>

      {/* Author tools: add a step, credit review */}
      {isAuthor ? (
        <div className='mt-6 space-y-3'>
          <div className='flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[#f8f9fc] p-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='min-w-0'>
              <p className='text-[14px] font-semibold text-[var(--foreground)]'>{t(`${prefix}.detail.authorTitle`)}</p>
              <p className='mt-0.5 text-[13px] leading-relaxed text-[var(--muted)]'>{t(`${prefix}.detail.authorBody`)}</p>
            </div>
            <Link
              href={hrefForCommunityPost(post, city, 'edit')}
              className='inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
            >
              {t(`${prefix}.detail.addEntry`)}
            </Link>
          </div>
          <CreditReviewRequestCard post={post} boardId={boardId} isAuthor={isAuthor} />
        </div>
      ) : null}

      {/* Timeline */}
      <section className='mt-9'>
        <h2 className='text-[1.15rem] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>
          {t(`${prefix}.detail.timelineTitle`, { count: steps.length })}
        </h2>
        {steps.length === 0 ? (
          <p className='mt-3 text-[14px] text-[var(--muted)]'>
            {isJob ? t('jobReview.detail.emptyBody') : t('detail.noDate')}
          </p>
        ) : (
          <ol className='mt-5'>
            {steps.map((step, index) => (
              <TimelineStep key={step.id} step={step} index={index} last={index === steps.length - 1} />
            ))}
          </ol>
        )}
      </section>

      {/* Tips */}
      {tipsHtml ? (
        <section className='mt-8 rounded-2xl bg-[var(--ellieo-sun-soft)]/70 p-5 sm:p-6'>
          <h2 className='flex items-center gap-2 text-[14px] font-bold text-[#8a5800]'>
            <FlagIcon className='size-4' />
            {t(`${prefix}.detail.tipsTitle`)}
          </h2>
          <CommunityRichBody
            html={tipsHtml}
            className='mt-2 !text-[14.5px] !leading-[1.7] text-[var(--foreground)]'
          />
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

function TimelineStep({ step, index, last }: { step: Step; index: number; last: boolean }) {
  const t = useT('reviews')
  const th = useT('hub')
  const filled = step.fields.filter((field) => field.value)
  const hasNotes = Boolean(htmlToPlainText(step.notesHtml))

  return (
    <li className='relative flex gap-4'>
      {/* Rail: numbered dot, line down to the next step */}
      <div className='relative flex w-8 shrink-0 flex-col items-center'>
        <span
          className={cn(
            'z-[1] flex size-8 items-center justify-center rounded-full text-[13px] font-bold',
            step.latest
              ? 'bg-[var(--brand)] text-white ring-4 ring-[var(--brand)]/15'
              : 'bg-[var(--brand-soft)] text-[var(--brand-deep)]',
          )}
        >
          {index + 1}
        </span>
        {!last ? <span aria-hidden className='w-px flex-1 bg-[var(--border-muted)]' /> : null}
      </div>

      <div className={cn('min-w-0 flex-1', last ? 'pb-2' : 'pb-8')}>
        <p className='flex flex-wrap items-center gap-x-2 gap-y-1 pt-1'>
          <span className='text-[15.5px] font-bold text-[var(--foreground)]'>{step.headline || step.date}</span>
          {step.headline ? <span className='text-[13px] text-[var(--muted)]'>{step.date}</span> : null}
          {step.latest ? (
            <span className='rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--brand-deep)]'>
              {th('ellieo.detail.latest')}
            </span>
          ) : null}
        </p>

        {filled.length > 0 ? (
          <dl className='mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2'>
            {filled.map((field) => (
              // Long answers take the full width instead of a squeezed half column
              <div key={field.key} className={cn('min-w-0', field.value.length > 60 && 'sm:col-span-2')}>
                <dt className='text-[11.5px] font-semibold uppercase tracking-[0.02em] text-[var(--muted)]'>
                  {field.label}
                </dt>
                <dd className='mt-0.5 text-[14px] leading-snug text-[var(--foreground)]'>{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {hasNotes ? (
          <div className='mt-3 rounded-2xl bg-[#f8f9fc] px-4 py-3.5'>
            <p className='text-[11.5px] font-semibold uppercase tracking-[0.02em] text-[var(--muted)]'>
              {t('detail.stageReview')}
            </p>
            <CommunityRichBody html={step.notesHtml} className='mt-1 !text-[14.5px] !leading-[1.7] text-[var(--foreground)]' />
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** Photo when it loads, otherwise a gradient initial */
function Avatar({ photo, name }: { photo: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  if (photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external profile URL
      <img src={photo} alt='' onError={() => setFailed(true)} className='size-10 shrink-0 rounded-full object-cover' />
    )
  }
  return (
    <span
      aria-hidden
      className='flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold uppercase text-white'
      style={{ background: gradientFor(name) }}
    >
      {name.charAt(0)}
    </span>
  )
}
