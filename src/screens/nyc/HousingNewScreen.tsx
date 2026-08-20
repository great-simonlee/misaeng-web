'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { createHousingPost } from '@lib/firebase/housing'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { LoadingState } from '@components'

export function HousingNewScreen() {
  const { user, loading, isMisaengUser } = useAuth()
  const { error: toastError } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [unitRent, setUnitRent] = useState('')
  const [rent, setRent] = useState('')
  const [bedrooms, setBedrooms] = useState('1')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) return
    setSubmitting(true)
    try {
      // 임시: 파이어베이스 하우징 등록 비활성화
      throw new Error('Supabase 연동 후 이용할 수 있어요')
      /*
      const id = await createHousingPost(
        {
          title: title.trim(),
          description: description.trim(),
          neighborhood: neighborhood.trim(),
          bedrooms: Number(bedrooms),
          unitType: inferHousingUnitType(Number(bedrooms)),
          unitRent: Number(unitRent),
          roomOptions: [
            {
              id: 'option-1',
              roomType: null,
              rent: Number(rent),
              availableFrom,
              availableTo,
              roommateWaiting: false,
              roommateComposition: null,
              roommateIntro: null,
            },
          ],
          perks: [],
          creditOffer: null,
          roommateWaiting: null,
          contactEmail: contactEmail.trim() || user.email,
          images: [],
          youtubeUrl: null,
        },
        user.uid,
        user.email,
        {
          id: profile?.verifiedSchoolId ?? null,
          name: profile?.verifiedSchoolName ?? null,
        },
      )
      success('하우징 글을 등록했어요')
      router.push(`/nyc/housing/${id}`)
      */
    } catch (err) {
      toastError(getErrorMessage(err, '등록에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingState fullPage />
  }

  // 임시: 파이어베이스 배너 비활성화
  /*
  if (!configured || !isFirebaseConfigured()) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-12'>
        <FirebaseConfigBanner />
      </div>
    )
  }
  */

  if (!user) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-12'>
        <h1 className='text-2xl font-bold'>로그인이 필요합니다</h1>
        <p className='mt-2 text-sm text-[var(--muted-foreground)]'>
          하우징은 @misaeng.com 계정으로 로그인한 후에만 등록할 수 있습니다.
        </p>
        <Link
          href='/nyc/login?next=/nyc/housing/new'
          className='mt-6 inline-flex rounded-full bg-[#F64310] px-5 py-2.5 text-sm font-semibold text-white'
        >
          로그인
        </Link>
      </div>
    )
  }

  if (!isMisaengUser) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-12'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          하우징
        </p>
        <h1 className='mt-3 text-2xl font-bold tracking-tight'>
          팀 계정만 등록 가능
        </h1>
        <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]'>
          하우징 매물은{' '}
          <strong className='text-[var(--foreground)]'>@misaeng.com</strong>{' '}
          이메일로만 등록할 수 있습니다. 현재 로그인:{' '}
          {user.email}
        </p>
        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            href='/nyc/housing'
            className='rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold'
          >
            하우징 목록
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[var(--background)]'>
      <div className='mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          <Link href='/nyc/housing' className='hover:text-[#F64310]'>
            하우징
          </Link>{' '}
          / 등록
        </p>
        <h1 className='mt-3 text-2xl font-bold tracking-tight sm:text-3xl'>
          하우징 등록
        </h1>
        <p className='mt-2 text-sm text-[var(--muted-foreground)]'>
          로그인: {user.email}
        </p>

        <form
          onSubmit={handleSubmit}
          className='mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6'
        >
          <Field label='스트리트 주소' required>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder='2950 Broadway'
            />
          </Field>
          <Field label='동네' required>
            <input
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={inputClass}
              placeholder='Morningside Heights'
            />
          </Field>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Field label='전체 유닛 월세 ($)' required>
              <input
                required
                type='number'
                min={0}
                value={unitRent}
                onChange={(e) => setUnitRent(e.target.value)}
                className={inputClass}
                placeholder='룸 합산 전체 유닛 가격'
              />
            </Field>
            <Field label='룸 월세 ($)' required>
              <input
                required
                type='number'
                min={0}
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Field label='침실 수' required>
              <input
                required
                type='number'
                min={0}
                step={0.5}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='입주 시작일' required>
              <input
                required
                type='date'
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label='입주 종료일' required>
              <input
                required
                type='date'
                value={availableTo}
                min={availableFrom || undefined}
                onChange={(e) => setAvailableTo(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label='연락 이메일'>
            <input
              type='email'
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              placeholder={user.email ?? ''}
            />
          </Field>
          <Field label='상세 설명' required>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder='계약 조건, 편의시설, 추천 대상 등'
            />
          </Field>

          <button
            type='submit'
            disabled={submitting}
            className='min-h-[48px] w-full rounded-full bg-[#F64310] text-sm font-semibold text-white touch-manipulation hover:bg-[#d93a0e] disabled:opacity-50'
          >
            {submitting ? '등록 중…' : '게시하기'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'mt-1.5 min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[#F64310]'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className='block text-sm font-medium text-[var(--foreground)]'>
      {label}
      {required ? ' *' : ''}
      {children}
    </label>
  )
}
