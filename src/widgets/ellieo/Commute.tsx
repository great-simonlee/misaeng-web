'use client'

import { useMySchool } from '@hooks/useMySchool'
import { cn } from '@lib'
import { COMMUTE_SCHOOLS, commuteSchool, estimateCommuteMinutes } from '@lib/housing/commute'
import { useT } from '@lib/i18n/client'
import { ChevronDownIcon, TrainIcon } from '@widgets/ellieo/icons'

/** "Commute to [NYU ▾]" pill. The choice is shared by every listing on the page (useMySchool) */
export function CommuteSchoolPicker({ className }: { className?: string }) {
  const t = useT('hub')
  const [schoolId, setSchoolId] = useMySchool()
  return (
    <label
      className={cn(
        'relative inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-white pl-3 pr-8 text-[13px] font-semibold text-[var(--foreground)] transition hover:border-[var(--border-muted)]',
        schoolId && 'border-[var(--brand-subtle)] bg-[var(--brand-soft)] text-[var(--brand-deep)]',
        className,
      )}
    >
      <TrainIcon className='size-4 shrink-0' />
      <span className='whitespace-nowrap'>{t('ellieo.commute.label')}</span>
      <select
        value={schoolId ?? ''}
        onChange={(event) => setSchoolId(event.target.value || null)}
        aria-label={t('ellieo.commute.label')}
        className='absolute inset-0 cursor-pointer opacity-0'
      >
        <option value=''>{t('ellieo.commute.pick')}</option>
        {COMMUTE_SCHOOLS.map((school) => (
          <option key={school.id} value={school.id}>
            {school.short} · {school.campus}
          </option>
        ))}
      </select>
      <span aria-hidden className='whitespace-nowrap'>
        {commuteSchool(schoolId)?.short ?? t('ellieo.commute.pickShort')}
      </span>
      <ChevronDownIcon className='pointer-events-none absolute right-2.5 size-3.5' />
    </label>
  )
}

/** "≈ 20 min to NYU" for a listing's neighborhood; nothing when no school is picked or the area isn't known */
export function CommuteLine({ area, className }: { area: string | null | undefined; className?: string }) {
  const t = useT('hub')
  const [schoolId] = useMySchool()
  const minutes = estimateCommuteMinutes(area, schoolId)
  const school = commuteSchool(schoolId)
  if (minutes === null || !school) return null
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--brand-deep)]', className)}
      title={t('ellieo.commute.estimateNote')}
    >
      <TrainIcon className='size-3.5 shrink-0' />
      {t('ellieo.commute.minutes', { minutes, school: school.short })}
    </span>
  )
}
