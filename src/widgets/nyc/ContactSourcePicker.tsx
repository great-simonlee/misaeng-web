'use client'

import { useEffect, useState } from 'react'

import { LoadingSpinner } from '@components/LoadingSpinner'
import {
  findContactSourceOptionId,
  type ContactSourceOption,
  type ContactSourceValue,
} from '@lib/community/contactSources'
import { useT } from '@lib/i18n/client'
import { useCity } from '@hooks/useCity'
import { ChoiceCards } from '@widgets/nyc/JobReviewOutcomePicker'

async function fetchContactSourceOptions(city: string): Promise<ContactSourceOption[]> {
  const res = await fetch(`/api/community/contact-sources?city=${encodeURIComponent(city)}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`contact sources ${res.status}`)
  const data = (await res.json()) as { options?: ContactSourceOption[] }
  return Array.isArray(data.options) ? data.options : []
}

const STUDENT_ORG = 'student-org'

type Row = { id: string; label: string; description: string }

/** 큰 선택 카드: 직접·파트너는 하나씩, 학생회는 한 장으로 묶고 (고르면 아래에 학생회 목록), 지인·기타 */
function buildRows(options: ContactSourceOption[], t: ReturnType<typeof useT>): Row[] {
  const rows: Row[] = []
  for (const option of options) {
    if (option.kind === 'student-org') {
      if (!rows.some((row) => row.id === STUDENT_ORG)) {
        rows.push({
          id: STUDENT_ORG,
          label: t('contactSource.studentOrg.label'),
          description: t('contactSource.studentOrg.description'),
        })
      }
    } else if (option.kind === 'direct' || option.kind === 'partner') {
      rows.push({
        id: option.id,
        label: t('contactSource.via', { name: option.label }),
        description: t(`contactSource.descriptions.${option.kind}`, { name: option.label }),
      })
    } else {
      rows.push({
        id: option.id,
        label: option.label,
        description: t(`contactSource.descriptions.${option.kind}`),
      })
    }
  }
  return rows
}

/** 학생회 안에서 지역별로 (API 순서 그대로) */
function groupByArea(options: ContactSourceOption[]) {
  const rows: { area: string | null; areaLabel: string | null; options: ContactSourceOption[] }[] =
    []
  for (const option of options) {
    const last = rows[rows.length - 1]
    if (last && last.area === option.area) last.options.push(option)
    else rows.push({ area: option.area, areaLabel: option.areaLabel, options: [option] })
  }
  return rows
}

type ContactSourcePickerProps = {
  source: string | null
  orgId: string | null
  onChange: (value: ContactSourceValue) => void
}

/**
 * 어떤 경로로 연락받았는지 (필수, 비공개). 면접/취업 · 비자 글쓰기 공용.
 * 선택지는 ERP(Contact Sources)에서 관리하고 브랜드별로 다르다.
 */
export function ContactSourcePicker({ source, orgId, onChange }: ContactSourcePickerProps) {
  const t = useT('reviews')
  const city = useCity()
  const [options, setOptions] = useState<ContactSourceOption[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchContactSourceOptions(city)
      .then((next) => {
        if (!cancelled) setOptions(next)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, city])

  function retry() {
    setFailed(false)
    setOptions(null)
    setAttempt((value) => value + 1)
  }

  if (failed) {
    return (
      <div className='flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3'>
        <p className='flex-1 text-[13px] text-[var(--muted-foreground)]'>
          {t('contactSource.loadFailed')}
        </p>
        <button
          type='button'
          onClick={retry}
          className='shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/40 touch-manipulation'
        >
          {t('contactSource.retry')}
        </button>
      </div>
    )
  }

  if (!options) {
    return (
      <div className='flex justify-center py-4'>
        <LoadingSpinner size='sm' />
      </div>
    )
  }

  const rows = buildRows(options, t)
  const selectedRow =
    source === STUDENT_ORG ? STUDENT_ORG : findContactSourceOptionId(options, source, orgId)
  const studentOrgs = options.filter((option) => option.kind === 'student-org')

  return (
    <div className='space-y-3'>
      <ChoiceCards
        options={rows}
        value={selectedRow}
        onChange={(id) => {
          if (id === STUDENT_ORG) {
            onChange({ source: STUDENT_ORG, orgId: source === STUDENT_ORG ? orgId : null })
            return
          }
          const option = options.find((item) => item.id === id)
          if (option) onChange({ source: option.source, orgId: option.orgId })
        }}
      />
      {source === STUDENT_ORG ? (
        <div>
          <p className='mb-2 text-[13px] font-medium text-[var(--foreground)]'>
            {t('contactSource.studentOrg.question')}
            <span className='text-[var(--brand)]'> *</span>
          </p>
          <div className='space-y-3'>
            {groupByArea(studentOrgs).map((group) => (
              <div key={group.area ?? 'all'}>
                {group.areaLabel ? (
                  <p className='mb-1.5 text-[12px] font-semibold text-[var(--muted-foreground)]'>
                    {group.areaLabel}
                  </p>
                ) : null}
                <ChoiceCards
                  options={group.options.map((option) => ({ id: option.id, label: option.label }))}
                  value={orgId}
                  onChange={(nextOrg) => onChange({ source: STUDENT_ORG, orgId: nextOrg })}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
