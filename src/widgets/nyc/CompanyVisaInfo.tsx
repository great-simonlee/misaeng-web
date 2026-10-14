import { cn } from '@lib'
import type { CompanyVisaInfo as VisaInfo } from '@lib/company/client'
import { visaStatusLabel, type VisaStatus } from '@lib/constants/company'
import { companyCopy } from '@lib/constants/companyCopy'

const VISA_ROWS: { key: 'h1bSponsor' | 'eVerify' | 'optCpt'; label: string }[] = [
  { key: 'h1bSponsor', label: companyCopy.visaH1b },
  { key: 'eVerify', label: companyCopy.visaEVerify },
  { key: 'optCpt', label: companyCopy.visaOptCpt },
]

const BADGE_TONE: Record<VisaStatus, string> = {
  yes: 'bg-[#eefaf4] text-[#0f766e] ring-[#99f6e4]/60',
  no: 'bg-[#f4f5f7] text-[var(--muted)] ring-black/[0.06]',
  case_by_case: 'bg-[#fff7ed] text-[#c2410c] ring-[#fdba74]/50',
}

export function VisaStatusBadge({ status }: { status: VisaStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1',
        BADGE_TONE[status]
      )}
    >
      {visaStatusLabel(status)}
    </span>
  )
}

/**
 * 비자 정보 카드. 세 값이 모두 비어 있으면 "추후 업데이트 예정" 한 줄만.
 * 하나라도 있으면 항목별 배지 (없는 항목은 "-").
 */
export function CompanyVisaInfo({ visa }: { visa: VisaInfo }) {
  const hasAny = VISA_ROWS.some(({ key }) => visa[key])
  return (
    <section className='overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-black/[0.06]'>
      <h2 className='flex items-center gap-2.5 border-b border-black/[0.05] px-4 py-3.5 text-[15px] font-bold tracking-tight text-[var(--foreground)] sm:px-5'>
        <span
          aria-hidden
          className='inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#34d399] to-[#059669] text-white shadow-[0_4px_10px_-4px_rgba(5,150,105,0.6)]'
        >
          <PassportIcon className='size-4' />
        </span>
        {companyCopy.visaTitle}
      </h2>
      {visa.summary ? <VisaPolicySummary visa={visa} /> : null}
      {hasAny ? (
        <>
          <dl className='divide-y divide-black/[0.05]'>
            {VISA_ROWS.map(({ key, label }) => {
              const status = visa[key]
              return (
                <div
                  key={key}
                  className='flex items-center justify-between gap-3 px-4 py-3 sm:px-5'
                >
                  <dt className='text-[14px] font-medium text-[var(--foreground)]'>{label}</dt>
                  <dd>
                    {status ? (
                      <VisaStatusBadge status={status} />
                    ) : (
                      <span className='text-[13px] text-[var(--muted)]'>-</span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className='bg-[#f8fafc] px-4 py-3 text-[12px] leading-relaxed text-[var(--muted)] sm:px-5'>
            {companyCopy.visaNotice}
          </p>
        </>
      ) : visa.summary ? null : (
        <p className='flex items-center gap-2 px-4 py-4 text-[13px] text-[var(--muted)] sm:px-5'>
          <ClockIcon className='size-4 shrink-0' />
          {companyCopy.visaPending}
        </p>
      )}
    </section>
  )
}

/** 회사 공개 비자 안내 (예: "비자 지원 언급 있음") + 안내문 + 근거 링크·확인일 */
function VisaPolicySummary({ visa }: { visa: VisaInfo }) {
  const checked = visa.checkedAt ? visa.checkedAt.slice(0, 10).replace(/-/g, '.') : null
  return (
    <div className='border-b border-black/[0.05] px-4 py-3.5 sm:px-5'>
      <p className='text-[14px] font-semibold text-[var(--foreground)]'>{visa.summary}</p>
      {visa.notice ? (
        <p className='mt-1 text-[12px] leading-relaxed text-[#b45309]'>{visa.notice}</p>
      ) : null}
      {visa.sourceUrl ? (
        <a
          href={visa.sourceUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-1.5 inline-block text-[11px] font-medium text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]'
        >
          근거 보기{checked ? ` (${checked} 확인)` : ''}
        </a>
      ) : null}
    </div>
  )
}

function PassportIcon({ className }: { className?: string }) {
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
      <rect x='5' y='3' width='14' height='18' rx='2' />
      <circle cx='12' cy='10' r='3' />
      <path d='M9 17h6' />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
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
      <circle cx='12' cy='12' r='9' />
      <path d='M12 7v5l3 2' />
    </svg>
  )
}
