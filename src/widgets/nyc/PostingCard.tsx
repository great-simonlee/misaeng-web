'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import {
  cityFirst,
  cityFirstText,
  daysUntil,
  fetchPostingsWithMore,
  matchesKind,
  trackPostingClick,
  type PostingKind,
  type PostingLevel,
  type PublicPosting,
} from '@lib/company/postings'
import {
  DEGREE_LABELS,
  JOB_FUNCTION_LABELS,
  JOB_FUNCTIONS,
  postingCopy,
  type DegreeLevel,
  type JobFunction,
} from '@lib/constants/postingCopy'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CompanyMark } from '@widgets/nyc/CompanyBrand'

const LEVEL_LABEL: Record<PostingLevel, string> = {
  intern: postingCopy.levelIntern,
  new_grad: postingCopy.levelNewGrad,
}
const LEVEL_TONE: Record<PostingLevel, string> = {
  intern: 'bg-[#fff1eb] text-[var(--brand)] ring-[#ffd2c2]',
  new_grad: 'bg-[#eef2ff] text-[#4338ca] ring-[#c7d2fe]',
}
const WORK_LABEL: Partial<Record<PublicPosting['workArrangement'], string>> = {
  remote: postingCopy.workRemote,
  hybrid: postingCopy.workHybrid,
  onsite: postingCopy.workOnsite,
}
const TAG = 'inline-flex items-center rounded-md px-2 py-[3px] text-[11px] font-semibold leading-none ring-1'
const FUNCTION_TAG = 'bg-[#ecfeff] text-[#0e7490] ring-[#a5f3fc]'
const DEGREE_TAG: Record<DegreeLevel, string> = {
  undergraduate: 'bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe]',
  graduate: 'bg-[#fdf4ff] text-[#a21caf] ring-[#f5d0fe]',
  both: 'bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe]',
  unspecified: 'bg-[#f4f5f7] text-[var(--muted)] ring-black/[0.05]',
}
/** 구분 필터 칩: 레벨(인턴·신입)과 자동 태그(한국어 우대·한국 근무) */
export const KIND_OPTIONS: { id: Exclude<PostingKind, 'all'>; label: string }[] = [
  { id: 'intern', label: postingCopy.levelIntern },
  { id: 'new_grad', label: postingCopy.levelNewGrad },
  { id: 'korean_preferred', label: postingCopy.tagKoreanPreferred },
  { id: 'korea_based', label: postingCopy.tagKoreaBased },
]

/** 공고가 있는 구분만 [id, label, count] */
export function kindCounts(postings: PublicPosting[]) {
  return KIND_OPTIONS.map((k) => [k.id, k.label, postings.filter((p) => matchesKind(p, k.id)).length] as const).filter(
    ([, , count]) => count > 0,
  )
}

const TAG_LABEL: Record<string, string> = {
  korean_preferred: postingCopy.tagKoreanPreferred,
  korea_based: postingCopy.tagKoreaBased,
}

/** 회사 페이지에서 처음 보여 주는 공고 수 */
const COMPANY_PAGE_SIZE = 5

function formatDate(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return new Date(ms).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

/** "2026-11-07" → "11월 7일" (달력 날짜라 시간대 변환 없이) */
function formatIsoDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}월 ${d}일`
}

/** "A · B · C": 구분점은 항목 사이에만 (줄 끝에 남지 않도록 점을 다음 항목에 붙인다) */
type MetaItem = { key: string; node: React.ReactNode; desktopOnly?: boolean }

function MetaLine({ items }: { items: (MetaItem | null)[] }) {
  const shown = items.filter((item): item is MetaItem => Boolean(item))
  if (!shown.length) return null
  return (
    <span className='mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-[var(--muted)]'>
      {shown.map((item, i) => (
        <span key={item.key} className={cn('items-center gap-1.5', item.desktopOnly ? 'hidden sm:inline-flex' : 'inline-flex')}>
          {i > 0 ? <span aria-hidden>·</span> : null}
          {item.node}
        </span>
      ))}
    </span>
  )
}

/** 마감 7일 이내면 D-day 뱃지 */
const URGENT_DAYS = 7

function DeadlineText({ applyBy }: { applyBy: string }) {
  const days = daysUntil(applyBy)
  const urgent = days >= 0 && days <= URGENT_DAYS
  return (
    <span className={cn('inline-flex items-center gap-1', urgent ? 'font-semibold text-[#dc2626]' : 'text-[var(--muted-foreground)]')}>
      {postingCopy.deadline(formatIsoDate(applyBy))}
      {urgent ? (
        <span className='rounded bg-[#fee2e2] px-1.5 py-[2px] text-[10px] font-bold leading-none text-[#b91c1c]'>
          {postingCopy.dDay(days)}
        </span>
      ) : null}
    </span>
  )
}

/** 펼친 공고 맨 위: 마감일 · 조기 지원 · 지원 팁. 하나도 없으면 그리지 않는다. */
function ApplyGuide({ posting }: { posting: PublicPosting }) {
  const { applyNotes, earlyApply } = posting.summary
  // "빨리 지원할수록 유리" 팁이 이미 있으면 같은 말을 두 번 하지 않는다.
  const notes = earlyApply && !applyNotes.some((n) => /빨리|일찍|수시/.test(n))
    ? [postingCopy.earlyApplyNote, ...applyNotes]
    : applyNotes
  const { alwaysOpen } = posting.summary
  if (!posting.applyBy && !alwaysOpen && !notes.length) return null
  return (
    <div className='rounded-xl bg-[#f0fdf4] px-3.5 py-3 ring-1 ring-[#bbf7d0]'>
      <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold text-[#14532d]'>
        {postingCopy.applyGuideTitle}
        {posting.applyBy ? (
          <span className='text-[12px] font-semibold'>
            <DeadlineText applyBy={posting.applyBy} />
          </span>
        ) : alwaysOpen ? (
          <span className='text-[12px] font-semibold'>{postingCopy.alwaysOpen}</span>
        ) : null}
      </p>
      {notes.length ? (
        <ul className='mt-1.5 space-y-0.5 text-[13px] text-[#166534]'>
          {notes.map((note, i) => (
            <li key={i} className='flex gap-2'>
              <span aria-hidden>✓</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** "Charlotte, NC · Dallas, TX 외 1곳" */
function regionSummary(regions: string[]) {
  if (regions.length <= 2) return regions.join(' · ')
  return `${regions.slice(0, 2).join(' · ')} ${postingCopy.moreRegions(regions.length - 2)}`
}

/**
 * 공고 한 줄: 레벨·직무·제목·지역만 보이고, 누르면 그 자리에서 요약과 지원 링크가 펼쳐진다.
 * showCompany: 전체 공고 목록에서는 회사 로고·이름을 같이 보여 준다.
 */
export function PostingRow({
  posting,
  open,
  onToggle,
  showCompany = false,
}: {
  posting: PublicPosting
  open: boolean
  onToggle: () => void
  showCompany?: boolean
}) {
  const href = useCityPath()
  const city = useCity()
  const { summary } = posting
  const work = WORK_LABEL[posting.workArrangement]
  const detailId = `posting-${posting.id}`
  // 보고 있는 도시(뉴욕 등)가 지역 목록 맨 앞에 오도록
  const regions = cityFirst(posting.regions, city)

  return (
    <li
      data-posting-id={posting.id}
      className={cn('scroll-mt-24 transition-colors', open ? 'bg-[#fafafa]' : 'hover:bg-[#fafafa]')}
    >
      <div className='flex items-start gap-3 px-4 py-3.5 sm:px-5'>
        {showCompany ? (
          // 넓은 화면에서만 로고 열. 모바일은 제목 폭을 위해 회사 줄에 작은 로고를 넣는다.
          <Link
            href={href(`/companies/${posting.company.slug}`)}
            className='mt-0.5 hidden shrink-0 sm:block'
            aria-label={posting.company.name}
          >
            <CompanyMark company={posting.company} className='size-9 rounded-xl text-[13px]' />
          </Link>
        ) : null}
        <button
          type='button'
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={detailId}
          className='flex min-w-0 flex-1 items-start gap-3 text-left'
        >
          <span className='min-w-0 flex-1'>
            {showCompany ? (
              <span className='mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted-foreground)]'>
                <CompanyMark company={posting.company} className='size-5 rounded-md text-[9px] sm:hidden' />
                {posting.company.name}
              </span>
            ) : null}
            <span className='flex flex-wrap items-center gap-1.5'>
              <span className={cn(TAG, LEVEL_TONE[posting.level])}>{LEVEL_LABEL[posting.level]}</span>
              {posting.jobFunction && posting.jobFunction !== 'other' ? (
                <span className={cn(TAG, FUNCTION_TAG)}>{JOB_FUNCTION_LABELS[posting.jobFunction]}</span>
              ) : null}
              <span className={cn(TAG, DEGREE_TAG[summary.degree])}>{DEGREE_LABELS[summary.degree]}</span>
              {posting.tags
                .filter((t) => TAG_LABEL[t])
                .map((t) => (
                  <span key={t} className={cn(TAG, 'bg-[#fff1f2] text-[#be123c] ring-[#fecdd3]')}>
                    {TAG_LABEL[t]}
                  </span>
                ))}
            </span>
            <span className='mt-1.5 block text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)]'>
              {posting.title}
            </span>
            {posting.applyBy || summary.alwaysOpen || summary.earlyApply || posting.noSponsorship ? (
              // 마감일과 같은 글자 모양으로 "마감 11월 7일 · 조기 지원 유리 · 스폰서십 불가"
              <span className='mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-[var(--muted-foreground)]'>
                {[
                  posting.applyBy ? <DeadlineText key='deadline' applyBy={posting.applyBy} /> : null,
                  !posting.applyBy && summary.alwaysOpen ? <span key='always'>{postingCopy.alwaysOpen}</span> : null,
                  summary.earlyApply ? <span key='early'>{postingCopy.earlyApply}</span> : null,
                  posting.noSponsorship ? <span key='sponsor'>{postingCopy.noSponsorshipShort}</span> : null,
                ]
                  .filter(Boolean)
                  .map((node, i) => (
                    <span key={i} className='inline-flex items-center gap-1.5'>
                      {i > 0 ? <span aria-hidden>·</span> : null}
                      {node}
                    </span>
                  ))}
              </span>
            ) : null}
            <MetaLine
              items={[
                regions.length ? { key: 'regions', node: regionSummary(regions) } : null,
                work ? { key: 'work', node: work } : null,
                // 등록일은 넓은 화면에서만 (모바일은 줄이 길어진다)
                { key: 'posted', node: postingCopy.postedOn(formatDate(posting.postedAt)), desktopOnly: true },
              ]}
            />
          </span>
          <ChevronIcon className={cn('mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open ? (
        <div id={detailId} className='space-y-3 px-4 pb-4 text-[13px] leading-relaxed sm:px-5 sm:text-[14px]'>
          <ApplyGuide posting={posting} />
          <ul className='space-y-1 text-[var(--muted-foreground)]'>
            {summary.overview.map((line, i) => (
              <li key={i} className='flex gap-2'>
                <span aria-hidden className='mt-[9px] size-1 shrink-0 rounded-full bg-[var(--brand)]/70' />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {posting.noSponsorship ? (
            <p className='rounded-xl bg-[#fff7ed] px-3 py-2 text-[12px] font-medium text-[#c2410c]'>
              {postingCopy.noSponsorship}
            </p>
          ) : null}
          {summary.qualifications.length ? (
            <div>
              <p className='font-semibold text-[var(--foreground)]'>{postingCopy.qualificationsTitle}</p>
              <ul className='mt-1 list-disc space-y-0.5 pl-5 text-[var(--muted-foreground)]'>
                {summary.qualifications.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <dl className='grid gap-1.5 sm:grid-cols-[80px_1fr]'>
            {summary.workType ? (
              <>
                <dt className='font-semibold text-[var(--foreground)]'>{postingCopy.workTypeLabel}</dt>
                <dd className='text-[var(--muted-foreground)]'>{summary.workType}</dd>
              </>
            ) : null}
            {summary.location ? (
              <>
                <dt className='font-semibold text-[var(--foreground)]'>{postingCopy.locationLabel}</dt>
                <dd className='text-[var(--muted-foreground)]'>{cityFirstText(summary.location, city)}</dd>
              </>
            ) : null}
          </dl>
          <div className='flex flex-wrap items-center gap-3 pt-1'>
            <a
              href={posting.applyUrl}
              target='_blank'
              rel='noopener noreferrer'
              onClick={() => trackPostingClick(posting.id)}
              className='inline-flex h-9 items-center gap-1 rounded-full bg-[var(--foreground)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98]'
            >
              {postingCopy.applyButton}
              <ExternalIcon className='size-3.5' />
            </a>
            <p className='min-w-0 flex-1 text-[11px] text-[var(--muted)]'>{postingCopy.summaryNotice}</p>
          </div>
        </div>
      ) : null}
    </li>
  )
}

/** 공고 줄 묶음: 한 번에 하나만 펼친다 (다른 줄을 누르면 앞서 펼친 줄은 접힌다). */
export function PostingRows({ postings, showCompany = false }: { postings: PublicPosting[]; showCompany?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // 위쪽의 긴 공고가 접히면서 방금 연 줄이 화면 위로 밀려나면, 그 줄이 보이도록 스크롤한다.
  useEffect(() => {
    if (!openId) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-posting-id="${openId}"]`)
    if (row && row.getBoundingClientRect().top < 80) {
      row.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [openId])

  return (
    <ul
      ref={listRef}
      className='divide-y divide-black/[0.05] overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-black/[0.06]'
    >
      {postings.map((posting) => (
        <PostingRow
          key={posting.id}
          posting={posting}
          showCompany={showCompany}
          open={openId === posting.id}
          onToggle={() => setOpenId((id) => (id === posting.id ? null : posting.id))}
        />
      ))}
    </ul>
  )
}

/** 작은 필터 칩 (회사 페이지 공고 섹션) */
export function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-semibold leading-none transition active:scale-[0.97]',
        active
          ? 'bg-[var(--foreground)] text-white'
          : 'bg-[#f3f4f6] text-[var(--muted-foreground)] hover:bg-[#e9ebee] hover:text-[var(--foreground)]',
      )}
    >
      {label}
      {count !== undefined ? <span className={cn('tabular-nums', active ? 'text-white/60' : 'text-[var(--muted)]')}>{count}</span> : null}
    </button>
  )
}

/**
 * 회사 상세 페이지의 "인턴 · 신입 공고" 섹션. 공고가 없으면 아무것도 그리지 않는다.
 * 공고가 많은 회사를 위해: 한 줄 목록 + 레벨·직무 필터 + 처음 5개만 보이고 "더 보기".
 */
export function CompanyPostings({ companySlug, companyName }: { companySlug: string; companyName: string }) {
  const city = useCity()
  const href = useCityPath()
  const [postings, setPostings] = useState<PublicPosting[]>([])
  const [moreUrl, setMoreUrl] = useState<string | null>(null)
  const [kind, setKind] = useState<PostingKind>('all')
  const [jobFunction, setJobFunction] = useState<'all' | JobFunction>('all')
  const [showAll, setShowAll] = useState(false)
  // 모바일: 필터가 상단 메뉴 아래에 붙었을 때만 그림자
  const stickySentinel = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = stickySentinel.current
    if (!el) return
    // 상단 메뉴(56px) 바로 아래 선을 지나가면 "붙음"
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: '-58px 0px 0px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [postings.length])

  useEffect(() => {
    let alive = true
    fetchPostingsWithMore(city, companySlug)
      .then((data) => {
        if (!alive) return
        setPostings(data.postings)
        setMoreUrl(data.moreUrl)
      })
      .catch(() => {
        // 공고는 부가 정보라, 못 불러오면 섹션을 숨긴다.
        if (alive) setPostings([])
      })
    return () => {
      alive = false
    }
  }, [city, companySlug])

  const kinds = useMemo(() => kindCounts(postings), [postings])
  const functions = useMemo(
    () =>
      JOB_FUNCTIONS.map((code) => [code, postings.filter((p) => p.jobFunction === code).length] as const).filter(
        ([, count]) => count > 0,
      ),
    [postings],
  )
  const filtered = useMemo(
    () =>
      postings.filter(
        (p) => matchesKind(p, kind) && (jobFunction === 'all' || p.jobFunction === jobFunction),
      ),
    [postings, kind, jobFunction],
  )

  // 공고가 없어도 공식 채용 검색 링크가 있으면 링크만 보여 준다.
  if (!postings.length) {
    return moreUrl ? (
      <section>
        <h2 className='text-[17px] font-bold tracking-tight text-[var(--foreground)] sm:text-[19px]'>
          {postingCopy.sectionTitle}
        </h2>
        <MoreOnCareersLink url={moreUrl} companyName={companyName} className='mt-3' />
      </section>
    ) : null
  }
  const visible = showAll ? filtered : filtered.slice(0, COMPANY_PAGE_SIZE)
  // 구분이 하나뿐이고(예: 전부 인턴) 태그도 없으면 필터가 의미 없다.
  const showLevelFilter = kinds.length > 1 || kinds.some(([id]) => id === 'korean_preferred' || id === 'korea_based')
  const showFunctionFilter = functions.length > 1

  function pick(update: () => void) {
    update()
    setShowAll(false)
  }

  return (
    <section>
      <div className='flex items-center gap-3'>
        <h2 className='flex items-baseline gap-2 text-[17px] font-bold tracking-tight text-[var(--foreground)] sm:text-[19px]'>
          {postingCopy.sectionTitle}
          <span className='text-[14px] font-semibold tabular-nums text-[var(--muted)]'>{postings.length}</span>
        </h2>
        <span aria-hidden className='h-px flex-1 bg-gradient-to-r from-black/10 to-transparent' />
      </div>
      <p className='mt-1 text-[12px] text-[var(--muted)] sm:text-[13px]'>{postingCopy.sectionDescription}</p>

      {showLevelFilter || showFunctionFilter ? <div ref={stickySentinel} aria-hidden className='h-px' /> : null}
      {showLevelFilter || showFunctionFilter ? (
        // 모바일·태블릿(한 단 화면)에서는 스크롤해도 상단 메뉴 바로 아래에 붙어 있다 (공고 섹션 안에서만).
        <div
          className={cn(
            'mt-4 space-y-2.5',
            'max-lg:sticky max-lg:top-[57px] max-lg:z-20 max-lg:-mx-4 max-lg:bg-[var(--background)] max-lg:px-4 max-lg:py-2.5',
            'sm:max-lg:top-[65px] sm:max-lg:-mx-6 sm:max-lg:px-6',
            'transition-shadow',
            stuck && 'max-lg:shadow-[0_10px_14px_-12px_rgba(15,23,42,0.35)]',
          )}
        >
          {showLevelFilter ? (
            // 레벨도 직무와 같은 칩 줄 ("전체"를 앞에 고정)
            <ChipScrollRow
              ariaLabel={postingCopy.allLevels}
              leading={
                <FilterChip label={postingCopy.allLevels} active={kind === 'all'} onClick={() => pick(() => setKind('all'))} />
              }
            >
              {kinds.map(([id, label, count]) => (
                <FilterChip key={id} label={label} count={count} active={kind === id} onClick={() => pick(() => setKind(id))} />
              ))}
            </ChipScrollRow>
          ) : null}
          {showFunctionFilter ? (
            // 직무는 많아질 수 있어 한 줄 가로 스크롤 (줄바꿈하지 않는다)
            <ChipScrollRow
              ariaLabel={postingCopy.allFunctions}
              leading={
                <FilterChip
                  label={postingCopy.allFunctions}
                  active={jobFunction === 'all'}
                  onClick={() => pick(() => setJobFunction('all'))}
                />
              }
            >
              {functions.map(([code, count]) => (
                <FilterChip
                  key={code}
                  label={JOB_FUNCTION_LABELS[code]}
                  count={count}
                  active={jobFunction === code}
                  onClick={() => pick(() => setJobFunction(code))}
                />
              ))}
            </ChipScrollRow>
          ) : null}
        </div>
      ) : null}

      <div className='mt-4'>
        {filtered.length ? (
          <PostingRows postings={visible} />
        ) : (
          <p className='rounded-[1.25rem] bg-white px-5 py-8 text-center text-[13px] text-[var(--muted)] ring-1 ring-black/[0.06]'>
            {postingCopy.noMatchTitle}
          </p>
        )}
      </div>

      {moreUrl ? <MoreOnCareersLink url={moreUrl} companyName={companyName} className='mt-3' /> : null}

      {filtered.length > COMPANY_PAGE_SIZE ? (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
          <button
            type='button'
            onClick={() => setShowAll((v) => !v)}
            className='inline-flex h-9 items-center rounded-full bg-[#f3f4f6] px-4 text-[13px] font-semibold text-[var(--muted-foreground)] transition hover:bg-[#e9ebee] hover:text-[var(--foreground)]'
          >
            {showAll ? postingCopy.showLess : postingCopy.showMorePostings(filtered.length - COMPANY_PAGE_SIZE)}
          </button>
          <Link href={href('/companies/postings')} className='text-[12px] font-semibold text-[var(--brand)] hover:underline'>
            {postingCopy.listLink} ›
          </Link>
        </div>
      ) : null}
    </section>
  )
}

/** "더 많은 공고는 Google 공식 채용 사이트에서 확인하세요" (관리자가 등록한 감시 검색으로) */
function MoreOnCareersLink({ url, companyName, className }: { url: string; companyName: string; className?: string }) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl bg-[#f8fafc] px-4 py-3 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.06] transition hover:bg-[#f1f5f9]',
        className,
      )}
    >
      {postingCopy.moreOnCareers(companyName)}
      <ExternalIcon className='size-3.5 shrink-0 text-[var(--muted)]' />
    </a>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round' className={className} aria-hidden>
      <path d='m6 9 6 6 6-6' />
    </svg>
  )
}

export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' />
    </svg>
  )
}
