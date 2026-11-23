'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { MISAENG_DESIGN, byBrand } from '@lib/brand/design'
import { NAV_WIDTH } from '@widgets/nyc/BoardPageShell'
import { useT } from '@lib/i18n/client'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { createHousingPost } from '@lib/firebase/housing'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { LoadingState } from '@components'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { WriteColumns, WriteSubmitCard, writeSubmitClass } from '@widgets/nyc/WriteFormLayout'

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

  const housingSections = (
    <>
          <Section title={t('new.sections.location')}>
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
          </Section>
          <Section title={t('new.sections.price')}>
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
          </Section>
          <Section title={t('new.sections.dates')}>
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
          </Section>
          <Section title={t('new.sections.details')}>
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
          </Section>

    </>
  )

  return (
    <div className={byBrand('min-h-screen bg-[var(--canvas)]', 'min-h-screen bg-[var(--background)]')}>
      {/* Misaeng: nav width, the form in the main column and the usual right rail (owner 11-23) */}
      <div className={byBrand(NAV_WIDTH, 'mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12')}>
      <div className={byBrand('min-w-0 pt-4 sm:pt-5 lg:pt-6', '')}>
        <p
          className={byBrand(
            'text-[13px] font-semibold text-[var(--muted)]',
            'text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]',
          )}
        >
          <Link href={href('/housing')} className='hover:text-brand'>
            {t('list.title')}
          </Link>{' '}
          / {t('new.breadcrumb')}
        </p>
        <h1
          className={byBrand(
            'mt-2 text-[1.75rem] font-bold tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.1rem]',
            'mt-3 text-2xl font-bold tracking-tight sm:text-3xl',
          )}
        >
          {t('new.title')}
        </h1>
        {MISAENG_DESIGN ? (
          <p className='mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] text-[var(--muted-foreground)] ring-1 ring-black/[0.06]'>
            <span aria-hidden className='h-2 w-2 shrink-0 rounded-full bg-[#10b981]' />
            <span className='truncate'>{t('new.signedInAs', { email: user.email })}</span>
          </p>
        ) : (
          <p className='mt-2 text-sm text-[var(--muted-foreground)]'>
            {t('new.signedInAs', { email: user.email })}
          </p>
        )}

        {MISAENG_DESIGN ? (
          // 물건 올리기 layout (owner 11-23): numbered step cards left, guidelines + submit right; no generic rail
          <form onSubmit={handleSubmit}>
            <WriteColumns
              main={<div className='flex flex-col gap-4 [counter-reset:wstep]'>{housingSections}</div>}
              aside={
                <>
                  <CommunityWritingGuidelines className='rounded-[1.375rem] p-5' />
                  <WriteSubmitCard
                    missing={[
                      !title.trim() ? t('new.fields.streetAddress') : null,
                      !neighborhood.trim() ? t('new.fields.neighborhood') : null,
                      !unitRent ? t('new.fields.unitRent') : null,
                      !rent ? t('new.fields.roomRent') : null,
                      !bedrooms ? t('new.fields.bedrooms') : null,
                      !availableFrom ? t('new.fields.availableFrom') : null,
                      !availableTo ? t('new.fields.availableTo') : null,
                      !description.trim() ? t('new.fields.description') : null,
                    ].filter((item): item is string => Boolean(item))}
                    submit={
                      <button type='submit' disabled={submitting} className={writeSubmitClass}>
                        {submitting ? t('new.submitting') : t('new.submit')}
                      </button>
                    }
                  />
                </>
              }
            />
          </form>
        ) : (
        <form
          onSubmit={handleSubmit}
          className={byBrand(
            'mt-6 space-y-4',
            'mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6',
          )}
        >
          <CommunityWritingGuidelines className={byBrand('bg-white', 'mb-2')} />
          {housingSections}
          {/* Misaeng: the submit button stays in reach on phones (sticky bar), inline on larger screens */}
          <div
            className={byBrand(
              'fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
              '',
            )}
          >
            <button
              type='submit'
              disabled={submitting}
              className={byBrand(
                'mx-auto block min-h-[52px] w-full max-w-2xl rounded-full bg-[linear-gradient(90deg,#ff5a1f,#f64310)] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] touch-manipulation transition hover:brightness-105 disabled:opacity-50',
                'min-h-[48px] w-full rounded-full bg-brand text-sm font-semibold text-white touch-manipulation hover:bg-brand-hover disabled:opacity-50',
              )}
            >
              {submitting ? t('new.submitting') : t('new.submit')}
            </button>
          </div>
        </form>
        )}
      </div>
      </div>
    </div>
  )
}

/** Misaeng: one white card per step (위치 · 가격 · 입주 기간 · 연락·설명); Ellieo keeps the single plain form. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!MISAENG_DESIGN) return <>{children}</>
  return (
    <section className='space-y-4 rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] [counter-increment:wstep] sm:p-6'>
      <h2 className="flex items-center gap-2 text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)] before:flex before:size-6 before:items-center before:justify-center before:rounded-full before:bg-[#FFF1E8] before:text-[12px] before:font-extrabold before:text-[var(--brand)] before:content-[counter(wstep)]">{title}</h2>
      {children}
    </section>
  )
}

const inputClass = byBrand(
  'mt-1.5 min-h-[50px] w-full rounded-2xl border border-[var(--border)] bg-[#fafbfc] px-4 py-3 text-base outline-none transition placeholder:text-[var(--muted)] focus:border-brand focus:bg-white focus:ring-4 focus:ring-[var(--brand)]/10',
  'mt-1.5 min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-brand',
)

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
    <label className={byBrand('block text-[13.5px] font-semibold text-[var(--foreground)]', 'block text-sm font-medium text-[var(--foreground)]')}>
      {label}
      {required ? ' *' : ''}
      {children}
    </label>
  )
}
