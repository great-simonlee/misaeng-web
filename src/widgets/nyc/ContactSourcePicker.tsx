'use client'

import { useEffect, useState } from 'react'

import { cn } from '@lib'
import { LoadingSpinner } from '@components/LoadingSpinner'
import {
  findContactSourceOptionId,
  type ContactSourceKind,
  type ContactSourceOption,
  type ContactSourceValue,
} from '@lib/community/contactSources'
import { useT } from '@lib/i18n/client'
import { useCity } from '@hooks/useCity'

/** 제목을 붙여 따로 묶는 종류 (나머지는 제목 없이 위·아래에) */
const GROUP_HEADINGS: Partial<Record<ContactSourceKind, string>> = {
  'student-org': 'contactSource.groups.studentOrg',
  partner: 'contactSource.groups.partner',
}

async function fetchContactSourceOptions(city: string): Promise<ContactSourceOption[]> {
  const res = await fetch(`/api/community/contact-sources?city=${encodeURIComponent(city)}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`contact sources ${res.status}`)
  const data = (await res.json()) as { options?: ContactSourceOption[] }
  return Array.isArray(data.options) ? data.options : []
}

/** 옵션을 화면 순서대로 묶는다. 같은 종류가 이어지면 한 묶음 */
function groupOptions(options: ContactSourceOption[]) {
  const groups: { kind: ContactSourceKind; options: ContactSourceOption[] }[] = []
  for (const option of options) {
    const last = groups[groups.length - 1]
    const heading = GROUP_HEADINGS[option.kind]
    if (last && (last.kind === option.kind || (!heading && !GROUP_HEADINGS[last.kind]))) {
      last.options.push(option)
    } else {
      groups.push({ kind: option.kind, options: [option] })
    }
  }
  return groups
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

  const selectedId = findContactSourceOptionId(options, source, orgId)

  return (
    <div className='space-y-3'>
      {groupOptions(options).map((group, index) => {
        const heading = GROUP_HEADINGS[group.kind]
        return (
          <div key={`${group.kind}-${index}`}>
            {heading ? (
              <p className='mb-1.5 text-[12px] font-medium text-[var(--muted-foreground)]'>
                {t(heading)}
              </p>
            ) : null}
            <div className='space-y-2'>
              {groupByArea(group.options).map((row) => (
                <div key={row.area ?? 'all'}>
                  {row.areaLabel ? (
                    <p className='mb-1 text-[11px] text-[var(--muted)]'>{row.areaLabel}</p>
                  ) : null}
                  <div className='flex flex-wrap gap-2'>
                    {row.options.map((option) => {
                      const active = option.id === selectedId
                      return (
                        <button
                          key={option.id}
                          type='button'
                          aria-pressed={active}
                          onClick={() => onChange({ source: option.source, orgId: option.orgId })}
                          className={cn(
                            'rounded-full px-3.5 py-2 text-[14px] font-medium ring-1 touch-manipulation transition',
                            active
                              ? 'bg-[var(--brand)]/5 text-[var(--brand)] ring-2 ring-[var(--brand)]'
                              : 'bg-white text-[var(--foreground)] ring-[var(--border)] hover:ring-[var(--muted)]'
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
