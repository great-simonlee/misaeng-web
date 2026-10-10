import { cn } from '@lib'
import type { CompanyVisaInfo as VisaInfo } from '@lib/company/client'
import { visaStatusLabel, type VisaStatus } from '@lib/constants/company'
import { companyCopy } from '@lib/constants/companyCopy'

const VISA_ROWS: { key: keyof VisaInfo; label: string }[] = [
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
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1', BADGE_TONE[status])}>
      {visaStatusLabel(status)}
    </span>
  )
}

/**
 * 비자 정보. 세 값이 모두 비어 있으면 "추후 업데이트 예정" 한 줄만.
 * 하나라도 있으면 항목별 배지 (없는 항목은 "-").
 */
export function CompanyVisaInfo({ visa }: { visa: VisaInfo }) {
  const hasAny = VISA_ROWS.some(({ key }) => visa[key])
  return (
    <section className='mt-8'>
      <h2 className='text-[1.05rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.15rem]'>
        {companyCopy.visaTitle}
      </h2>
      {hasAny ? (
        <>
          <dl className='mt-3 divide-y divide-black/[0.05] rounded-2xl bg-white ring-1 ring-black/[0.05]'>
            {VISA_ROWS.map(({ key, label }) => {
              const status = visa[key]
              return (
                <div key={key} className='flex items-center justify-between gap-3 px-4 py-3'>
                  <dt className='text-[14px] text-[var(--foreground)]'>{label}</dt>
                  <dd>
                    {status ? <VisaStatusBadge status={status} /> : <span className='text-[13px] text-[var(--muted)]'>-</span>}
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className='mt-2 text-[12px] leading-relaxed text-[var(--muted)]'>{companyCopy.visaNotice}</p>
        </>
      ) : (
        <p className='mt-2 text-[13px] text-[var(--muted)]'>{companyCopy.visaPending}</p>
      )}
    </section>
  )
}
