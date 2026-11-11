'use client'

import { useEffect, useState } from 'react'

import { LoadingSpinner } from '@components/LoadingSpinner'
import {
  normalizeStoredContactSource,
  type ContactSourceCategoryView,
  type ContactSourceOrganizationView,
} from '@lib/community/contactSources'
import { useT } from '@lib/i18n/client'
import { useCity } from '@hooks/useCity'
import { ChoiceCards } from '@widgets/nyc/JobReviewOutcomePicker'

async function fetchContactSourceCategories(city: string): Promise<ContactSourceCategoryView[]> {
  const res = await fetch(`/api/community/contact-sources?v=2&city=${encodeURIComponent(city)}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`contact sources ${res.status}`)
  const data = (await res.json()) as { categories?: ContactSourceCategoryView[] }
  return Array.isArray(data.categories) ? data.categories : []
}

/** 카테고리 안 조직을 지역별로 (API 순서 그대로) */
function groupByArea(options: ContactSourceOrganizationView[]) {
  const rows: { area: string | null; areaLabel: string | null; options: ContactSourceOrganizationView[] }[] = []
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
  /** 조직이 있는 카테고리를 열고 조직을 고르기 전에는 source가 null */
  onChange: (value: { source: string | null; orgId: string | null }) => void
}

/**
 * 어떤 경로로 연락받았는지 (필수, 비공개). 면접/취업 · 비자 글쓰기 공용.
 * 카테고리(줄)와 조직(칩)은 ERP(Contact sources)에서 관리하고 브랜드별로 다르다.
 * 조직이 있는 카테고리는 열어서 조직을 골라야 값이 생긴다.
 */
export function ContactSourcePicker({ source, orgId, onChange }: ContactSourcePickerProps) {
  const t = useT('reviews')
  const city = useCity()
  const [categories, setCategories] = useState<ContactSourceCategoryView[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // 조직을 아직 안 고른 채 연 카테고리 (고르기 전까지 값은 비워 둔다)
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchContactSourceCategories(city)
      .then((next) => {
        if (!cancelled) setCategories(next)
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
    setCategories(null)
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

  if (!categories) {
    return (
      <div className='flex justify-center py-4'>
        <LoadingSpinner size='sm' />
      </div>
    )
  }

  const stored = normalizeStoredContactSource(source, orgId)
  const storedCategory = categories.find((cat) => cat.id === stored.source) ?? null
  // 조직이 있는 카테고리: 저장된 조직, 없으면 (지점 생기기 전 글) 첫 조직
  const storedOrg = storedCategory?.options.length
    ? (storedCategory.options.find((org) => org.id === stored.orgId) ?? storedCategory.options[0])
    : null
  const selectedCategory = storedCategory ?? categories.find((cat) => cat.id === openCategory) ?? null
  const rows = categories.map((cat) => ({ id: cat.id, label: cat.title, description: cat.description }))

  return (
    <div className='space-y-3'>
      <ChoiceCards
        options={rows}
        value={selectedCategory?.id ?? null}
        onChange={(id) => {
          const cat = categories.find((item) => item.id === id)
          if (!cat) return
          if (cat.options.length === 0) {
            setOpenCategory(null)
            onChange({ source: cat.id, orgId: null })
            return
          }
          if (selectedCategory?.id === cat.id) return
          // 조직을 고를 때까지 미완료로 둔다
          setOpenCategory(cat.id)
          onChange({ source: null, orgId: null })
        }}
      />
      {selectedCategory && selectedCategory.options.length > 0 ? (
        <div className='space-y-3'>
          {source ? null : (
            <p className='text-[13px] font-medium text-[var(--brand)]'>{t('contactSource.organizationRequired')}</p>
          )}
          {groupByArea(selectedCategory.options).map((group) => (
            <div key={group.area ?? 'all'}>
              {group.areaLabel && selectedCategory.options.some((org) => org.area !== group.area) ? (
                <p className='mb-1.5 text-[12px] font-semibold text-[var(--muted-foreground)]'>{group.areaLabel}</p>
              ) : null}
              <ChoiceCards
                options={group.options.map((org) => ({ id: org.id, label: org.label }))}
                value={source ? (storedOrg?.id ?? null) : null}
                onChange={(nextOrg) => onChange({ source: selectedCategory.id, orgId: nextOrg })}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
