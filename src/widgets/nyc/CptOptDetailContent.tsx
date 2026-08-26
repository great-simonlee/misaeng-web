'use client'

import Link from 'next/link'

import { cn } from '@lib'
import {
  CPT_OPT_TIMELINE_FIELDS,
  formatCptOptDate,
  getCptOptTypeStyle,
  getLatestTimelineEntryId,
  sortTimelineByDate,
  summarizeTimelineEntry,
} from '@lib/community/cptOpt'
import { formatCommunityCount } from '@lib/constants/communityMock'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { CptOptActivityMeta } from '@widgets/nyc/CptOptActivityMeta'
import { CptOptTypeBadge } from '@widgets/nyc/CptOptTypeBadge'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import type { NycCommunityBoardId } from '@lib/constants/nyc'

type CptOptDetailContentProps = {
  post: CommunityPost
  boardId: NycCommunityBoardId
  boardTitle: string
  isAuthor: boolean
  onDelete: () => void
}

export function CptOptDetailContent({
  post,
  boardId,
  isAuthor,
  onDelete,
}: CptOptDetailContentProps) {
  const bodyHtml = post.contentHtml || `<p>${post.description}</p>`
  const timeline = sortTimelineByDate(post.cptOptTimeline || [])
  const tips = post.cptOptTips?.trim() || ''
  const typeStyle = getCptOptTypeStyle(post.cptOptType)
  const latestEntryId = getLatestTimelineEntryId(timeline)

  return (
    <article>
      {isAuthor ? (
        <div className='mb-5 px-1 sm:px-0'>
          <BoardSurface className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
            <div>
              <p className='text-[13px] font-semibold text-[var(--foreground)]'>
                진행 중인 기록이에요
              </p>
              <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
                새 날짜가 생기면 업데이트 화면에서 기록 한 건만 추가하면
                됩니다. 저장하면 목록 맨 위로 올라갑니다.
              </p>
            </div>
            <Link
              href={`/nyc/${boardId}/${post.id}/edit`}
              className='inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)]'
            >
              새 기록 추가
            </Link>
          </BoardSurface>
        </div>
      ) : null}

      <div className='mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 sm:px-0'>
        <CptOptTypeBadge type={post.cptOptType} />
        <CptOptActivityMeta
          createdAt={post.createdAt}
          updatedAt={post.updatedAt}
        />
        <span className='text-[12px] text-[var(--muted)]'>
          · 조회 {formatCommunityCount(post.viewCount)}
        </span>
      </div>

      <h1 className='px-1 text-[1.55rem] font-semibold leading-[1.25] tracking-[-0.035em] text-[var(--foreground)] sm:px-0 sm:text-[1.9rem]'>
        {post.title}
      </h1>

      {post.location?.trim() ? (
        <p className='mt-3 flex items-center gap-1.5 px-1 text-[14px] font-medium text-[var(--muted-foreground)] sm:px-0'>
          <BuildingIcon className='size-4 shrink-0 opacity-60' />
          {post.location.trim()}
        </p>
      ) : null}

      {timeline.length > 0 ? (
        <section className='mt-8'>
          <SectionLabel>
            진행 기록 {timeline.length}건
          </SectionLabel>
          <ol className='mt-4 space-y-2 px-1 sm:px-0'>
            {timeline.map((entry, index) => {
              const isLatest = entry.id === latestEntryId
              const summary = summarizeTimelineEntry(entry)
              return (
                <li key={entry.id}>
                  <div
                    className={cn(
                      'rounded-2xl bg-white p-4 ring-1 sm:p-5',
                      isLatest
                        ? 'ring-[var(--brand)]/25'
                        : 'ring-black/[0.06]',
                    )}
                  >
                    <div className='flex items-start gap-3'>
                      <span
                        className='inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold'
                        style={{
                          backgroundColor: typeStyle.soft,
                          color: typeStyle.accent,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                            {entry.date
                              ? formatCptOptDate(entry.date)
                              : '날짜 미입력'}
                          </p>
                          {isLatest ? (
                            <span className='inline-flex rounded-full bg-[#fff8f5] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
                              최신
                            </span>
                          ) : null}
                        </div>
                        {summary ? (
                          <p className='mt-1.5 text-[14px] leading-relaxed text-[var(--foreground)]'>
                            {summary}
                          </p>
                        ) : null}
                        <dl className='mt-3 space-y-2'>
                          {CPT_OPT_TIMELINE_FIELDS.map((field) => (
                            <TimelineDetailRow
                              key={field.key}
                              field={field}
                              value={entry[field.key]}
                            />
                          ))}
                        </dl>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {tips ? (
        <section className='mt-8'>
          <SectionLabel>조심해야 할 점</SectionLabel>
          <BoardSurface className='mt-4 overflow-hidden'>
            <div className='flex gap-3 bg-[#fffbeb] p-4 sm:p-5'>
              <span
                className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[15px]'
                aria-hidden
              >
                ⚠️
              </span>
              <p className='min-w-0 whitespace-pre-wrap text-[14px] leading-[1.7] text-[var(--foreground)] sm:text-[15px]'>
                {tips}
              </p>
            </div>
          </BoardSurface>
        </section>
      ) : null}

      <section className='mt-8'>
        <SectionLabel>후기</SectionLabel>
        <div className='mt-4 px-1 sm:px-0'>
          <CommunityRichBody
            html={bodyHtml}
            className='text-[15px] leading-[1.75] text-[var(--foreground)]'
          />
        </div>
      </section>

      <div className='mt-8'>
        <CommunityPostFooter
          post={post}
          boardId={boardId}
          anonymous={false}
          isAuthor={isAuthor}
          loginNext={`/nyc/${boardId}/${post.id}`}
          editLabel='업데이트'
          onDelete={onDelete}
        />
      </div>
    </article>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='flex items-center gap-3 px-1 text-[13px] font-semibold tracking-wide text-[var(--muted)] sm:px-0'>
      {children}
      <span className='h-px flex-1 bg-black/[0.06]' aria-hidden />
    </h2>
  )
}

function TimelineDetailRow({
  field,
  value,
}: {
  field: (typeof CPT_OPT_TIMELINE_FIELDS)[number]
  value: string
}) {
  if (!value.trim()) return null
  return (
    <div className={cn('rounded-lg px-3 py-2', field.rowClass)}>
      <dt className={cn('text-[11px] font-semibold', field.labelClass)}>
        {field.shortLabel}
      </dt>
      <dd className='mt-0.5 text-[13px] leading-[1.55] text-[var(--foreground)]'>
        {value.trim()}
      </dd>
    </div>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
      aria-hidden
    >
      <path d='M4 20V8l8-4 8 4v12' strokeLinecap='round' strokeLinejoin='round' />
      <path d='M9 20v-6h6v6' strokeLinecap='round' strokeLinejoin='round' />
      <path d='M9 10h.01M15 10h.01M9 14h.01M15 14h.01' strokeLinecap='round' />
    </svg>
  )
}
