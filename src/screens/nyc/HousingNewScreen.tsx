'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { useT } from '@lib/i18n/client'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { createHousingPost } from '@lib/firebase/housing'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { LoadingState } from '@components'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'

export function HousingNewScreen() {
  const t = useT('housing')
  const href = useCityPath()
  const { user, loading, isAuthenticated, isMisaengUser } = useRequireAuth(
    href('/housing/new'),
  )
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
    if (!user?.email) {
      toastError(t('new.errors.loginRequired'))
      return
    }
    setSubmitting(true)
    try {
      // 임시: 파이어베이스 하우징 등록 비활성화
      throw new Error(t('detail.toasts.notAvailableYet'))
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
      router.push(href(`/housing/${id}`))
      */
    } catch (err) {
      toastError(getErrorMessage(err, t('new.errors.submitFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !isAuthenticated || !user) {
    return (
      <LoadingState
        fullPage
        label={
          !loading && !isAuthenticated ? t('new.redirectingToLogin') : undefined
        }
      />
    )
  }

  if (!isMisaengUser) {
    const [teamOnlyBefore, teamOnlyAfter = ''] = t('new.teamOnly.description', {
      email: user?.email ?? t('new.teamOnly.unknownEmail'),
    }).split('{domain}')
    return (
      <div className='mx-auto max-w-2xl px-4 py-12'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          {t('list.title')}
        </p>
        <h1 className='mt-3 text-2xl font-bold tracking-tight'>
          {t('new.teamOnly.title')}
        </h1>
        <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]'>
          {teamOnlyBefore}
          <strong className='text-[var(--foreground)]'>@misaeng.com</strong>
          {teamOnlyAfter}
        </p>
        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            href={href('/housing')}
            className='rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold'
          >
            {t('detail.backToList')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[var(--background)]'>
      <div className='mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          <Link href={href('/housing')} className='hover:text-brand'>
            {t('list.title')}
          </Link>{' '}
          / {t('new.breadcrumb')}
        </p>
        <h1 className='mt-3 text-2xl font-bold tracking-tight sm:text-3xl'>
          {t('new.title')}
        </h1>
        <p className='mt-2 text-sm text-[var(--muted-foreground)]'>
          {t('new.signedInAs', { email: user.email })}
        </p>

        <form
          onSubmit={handleSubmit}
          className='mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6'
        >
          <CommunityWritingGuidelines className='mb-2' />
          <Field label={t('new.fields.streetAddress')} required>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder='2950 Broadway'
            />
          </Field>
          <Field label={t('new.fields.neighborhood')} required>
            <input
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={inputClass}
              placeholder='Morningside Heights'
            />
          </Field>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Field label={t('new.fields.unitRent')} required>
              <input
                required
                type='number'
                min={0}
                value={unitRent}
                onChange={(e) => setUnitRent(e.target.value)}
                className={inputClass}
                placeholder={t('new.fields.unitRentPlaceholder')}
              />
            </Field>
            <Field label={t('new.fields.roomRent')} required>
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
            <Field label={t('new.fields.bedrooms')} required>
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
            <Field label={t('new.fields.availableFrom')} required>
              <input
                required
                type='date'
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t('new.fields.availableTo')} required>
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
          <Field label={t('new.fields.contactEmail')}>
            <input
              type='email'
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              placeholder={user.email ?? ''}
            />
          </Field>
          <Field label={t('new.fields.description')} required>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder={t('new.fields.descriptionPlaceholder')}
            />
          </Field>

          <button
            type='submit'
            disabled={submitting}
            className='min-h-[48px] w-full rounded-full bg-brand text-sm font-semibold text-white touch-manipulation hover:bg-brand-hover disabled:opacity-50'
          >
            {submitting ? t('new.submitting') : t('new.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'mt-1.5 min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-brand'

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
