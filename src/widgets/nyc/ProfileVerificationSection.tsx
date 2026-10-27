'use client'

import type { HTMLInputTypeAttribute, InputHTMLAttributes, ReactNode } from 'react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { BottomSheet, SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { SCHOOL_OTP_COOLDOWN_MS } from '@lib/constants/verificationSafety'
import {
  confirmSchoolEmailVerification,
  sendSchoolEmailVerification,
  setPrimarySchool,
} from '@lib/api/schoolVerification'
import { postInstagramVerification } from '@lib/api/instagramVerification'
import {
  MISAENG_INSTAGRAM_DM_URL,
  MISAENG_INSTAGRAM_HANDLE,
  type InstagramVerificationState,
} from '@lib/verification/instagram'
import { MAX_VERIFIED_SCHOOLS, type VerifiedSchoolEntry } from '@lib/verification/verifiedSchools'
import {
  confirmWorkplaceEmailVerification,
  sendWorkplaceEmailVerification,
} from '@lib/api/workplaceVerification'
import { WORKPLACE_COMPANY_MAX } from '@lib/constants/workplace'
import { sendSchoolRegistrationRequest } from '@lib/api/schoolRegistrationRequest'
import { resolveSchoolFromEmail } from '@lib/constants/schools'
import { useVerifiedSchools } from '@hooks/useVerifiedSchools'
import {
  isValidSchoolDomain,
  normalizeSchoolDomain,
} from '@lib/utils/schoolDomain'
import { isSchoolEmail, isValidEmailFormat } from '@lib/utils/verification'
import { getWorkplaceEmailErrorCode } from '@lib/utils/workplaceEmail'
import { BRAND_CONFIG } from '@lib/brand'
import { useFormat, useT } from '@lib/i18n/client'
import type { NycUserProfile } from '@/types/nyc'

type VerifyKind = 'school' | 'schools' | 'workplace' | 'instagram' | 'chooser' | null

/** `{name}` 자리에 요소를 끼운다 (언어마다 어순이 달라서 문장을 쪼개지 않는다) */
function renderWithSlots(template: string, slots: Record<string, ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1]
    if (name && name in slots) return <Fragment key={index}>{slots[name]}</Fragment>
    return part
  })
}

type Props = {
  profile: NycUserProfile | null
  openSchoolVerify?: boolean
  onSchoolVerifyOpenChange?: (open: boolean) => void
  openWorkplaceVerify?: boolean
  onWorkplaceVerifyOpenChange?: (open: boolean) => void
  openIdentityVerify?: boolean
  onIdentityVerifyOpenChange?: (open: boolean) => void
}

export function ProfileVerificationSection({
  profile,
  openSchoolVerify = false,
  onSchoolVerifyOpenChange,
  openWorkplaceVerify = false,
  onWorkplaceVerifyOpenChange,
  openIdentityVerify = false,
  onIdentityVerifyOpenChange,
}: Props) {
  const t = useT('me')
  const { user, refreshSession, mergeStoredProfile } = useAuth()
  const { success, error: toastError } = useToast()
  const [active, setActive] = useState<VerifyKind>(null)
  const resolvedActive: VerifyKind = openWorkplaceVerify
    ? 'workplace'
    : openSchoolVerify
      ? 'school'
      : openIdentityVerify
        ? 'chooser'
        : active

  const closeVerify = useCallback(
    (kind: VerifyKind) => {
      setActive(null)
      if (kind === 'school') {
        onSchoolVerifyOpenChange?.(false)
      }
      if (kind === 'workplace') {
        onWorkplaceVerifyOpenChange?.(false)
      }
      if (kind === 'chooser') {
        onIdentityVerifyOpenChange?.(false)
      }
    },
    [
      onSchoolVerifyOpenChange,
      onWorkplaceVerifyOpenChange,
      onIdentityVerifyOpenChange,
    ],
  )

  const schools = profile?.verifiedSchools ?? []
  const instagram = profile?.instagram
  const instagramPending = instagram?.status === 'pending' && !instagram.expired

  const workplaceStatus = profile?.workplaceStatus ?? 'none'
  const workplaceApproved = workplaceStatus === 'approved'
  const workplacePending = workplaceStatus === 'pending'

  const workplaceDetail =
    workplaceApproved
      ? [profile?.workplaceCompanyName, profile?.workEmail]
          .filter(Boolean)
          .join(' · ') || t('verification.verifiedShort')
      : workplacePending
        ? t('verification.workplace.pendingDetail')
        : workplaceStatus === 'rejected'
          ? profile?.workplaceRejectReason || t('verification.workplace.retry')
          : t('verification.workplace.rowHint')

  const items = [
    {
      id: 'school' as const,
      label: t('verification.school.rowLabel'),
      verified: Boolean(profile?.schoolEmailVerified),
      schoolId: profile?.verifiedSchoolId ?? null,
      detail: profile?.schoolEmailVerified
        ? schools.length > 1
          ? t('verification.school.moreSchools', {
              school: schools[0]?.name ?? '',
              count: schools.length - 1,
            })
          : profile.schoolEmail || t('verification.verifiedShort')
        : t('verification.school.rowHint'),
      pending: false,
    },
    {
      id: 'workplace' as const,
      label: t('verification.workplace.rowLabel'),
      verified: workplaceApproved,
      schoolId: null as string | null,
      detail: workplaceDetail,
      pending: workplacePending,
    },
    // 휴대폰 인증은 실제로 개발할 때까지 숨긴다 (Twilio 예정)
    {
      id: 'instagram' as const,
      label: t('verification.instagram.rowLabel'),
      verified: Boolean(profile?.instagramVerified) && !instagramPending,
      schoolId: null as string | null,
      detail: instagramPending
        ? instagram?.sentAt
          ? t('verification.instagram.pendingDetail', { handle: instagram.handle ?? '' })
          : t('verification.instagram.codeIssuedDetail')
        : profile?.instagramVerified
          ? `@${profile.instagramHandle ?? ''}`
          : instagram?.status === 'rejected'
            ? t('verification.instagram.rejectedTitle')
            : t('verification.instagram.rowHint'),
      pending: instagramPending && Boolean(instagram?.sentAt),
    },
  ]

  return (
    <section className='mt-0'>
      <h2 className='mb-1.5 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        {t('verification.title')}
      </h2>
      <p className='mb-3 px-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
        {t('verification.description')}
      </p>
      <ul className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const pending = item.pending
          const canVerify = !item.verified && !pending
          // 학교는 인증 뒤에도 열어서 대표 학교를 고르거나 더 인증한다. 인스타그램은 진행 상태·재인증을 본다
          const canOpen =
            canVerify || pending || item.id === 'school' || item.id === 'instagram'

          const row = (
            <div className='flex items-center gap-3.5 px-5 py-4'>
              <VerificationItemIcon kind={item.id} verified={item.verified} />
              <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
                  <p className='text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                    {item.label}
                  </p>
                  {item.id === 'school' &&
                    item.verified &&
                    schools.map((school) => (
                      <SchoolBadge key={school.email} schoolId={school.id} />
                    ))}
                </div>
                <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                  {item.detail}
                </p>
              </div>
              {item.verified ? (
                <span className='shrink-0 text-[12px] font-medium text-emerald-600'>
                  {t('verification.status.verified')}
                </span>
              ) : pending ? (
                <span className='shrink-0 text-[12px] font-medium text-amber-700'>
                  {t('verification.status.inReview')}
                </span>
              ) : (
                <span className='shrink-0 text-[12px] font-medium text-[var(--brand)]'>
                  {t('verification.status.verify')}
                </span>
              )}
              {canOpen && <ChevronRight />}
            </div>
          )

          return (
            <li
              key={item.id}
              className={isLast ? undefined : 'border-b border-[#f0f1f3]'}
            >
              {canOpen ? (
                <button
                  type='button'
                  onClick={() =>
                    setActive(item.id === 'school' && item.verified ? 'schools' : item.id)
                  }
                  className='w-full text-left touch-manipulation transition active:bg-[#f8f9fb]'
                >
                  {row}
                </button>
              ) : (
                row
              )}
            </li>
          )
        })}
      </ul>

      {resolvedActive === 'chooser' && user ? (
        <VerifySheet
          title={t('verification.chooser.title')}
          onClose={() => closeVerify('chooser')}
        >
          <p className={verifyDescriptionClass}>
            {t('verification.chooser.description')}
          </p>
          <button
            type='button'
            onClick={() => {
              onIdentityVerifyOpenChange?.(false)
              setActive('school')
            }}
            className={verifyPrimaryButtonClass}
          >
            {t('verification.chooser.school')}
          </button>
          <button
            type='button'
            onClick={() => {
              onIdentityVerifyOpenChange?.(false)
              setActive('workplace')
            }}
            className={verifyGhostButtonClass}
          >
            {t('verification.chooser.workplace')}
          </button>
        </VerifySheet>
      ) : null}

      {resolvedActive === 'workplace' && user && (
        workplacePending || workplaceApproved ? (
          <WorkplaceStatusSheet
            approved={workplaceApproved}
            companyName={profile?.workplaceCompanyName}
            workEmail={profile?.workEmail}
            rejectReason={profile?.workplaceRejectReason}
            onClose={() => closeVerify('workplace')}
          />
        ) : (
          <WorkplaceEmailVerifyModal
            initialEmail={profile?.workEmail ?? ''}
            initialCompanyName={profile?.workplaceCompanyName ?? ''}
            onClose={() => closeVerify('workplace')}
            onSubmitted={(storedProfile) => {
              if (storedProfile) mergeStoredProfile(storedProfile)
              void refreshSession()
              success(t('verification.workplace.submittedToast'))
              closeVerify('workplace')
            }}
            onError={(msg) => toastError(msg)}
          />
        )
      )}

      {resolvedActive === 'school' && user && (
        <SchoolEmailVerifyModal
          onClose={() => closeVerify('school')}
          onVerified={(schoolName, storedProfile, isPrimary) => {
            if (storedProfile) mergeStoredProfile(storedProfile)
            void refreshSession()
            success(
              schoolName
                ? t('verification.school.verifiedWithSchool', { school: schoolName })
                : t('verification.school.verifiedToast'),
            )
            closeVerify('school')
            // 두 번째 학교부터는 바로 대표 학교를 고를 수 있게 학교 목록을 연다
            if (isPrimary === false) setActive('schools')
          }}
          onRegistered={() => {
            success(t('verification.school.registrationSentToast'))
            closeVerify('school')
          }}
          onError={(msg) => toastError(msg)}
        />
      )}

      {resolvedActive === 'schools' && user && (
        <SchoolsSheet
          schools={schools}
          onClose={() => setActive(null)}
          onAddSchool={() => setActive('school')}
          onChanged={(storedProfile, schoolName) => {
            if (storedProfile) mergeStoredProfile(storedProfile)
            success(t('verification.school.primaryChangedToast', { school: schoolName }))
          }}
          onError={(msg) => toastError(msg)}
        />
      )}

      {resolvedActive === 'instagram' && user && (
        <InstagramVerifySheet
          state={instagram ?? null}
          verifiedHandle={profile?.instagramVerified ? profile.instagramHandle : null}
          onClose={() => setActive(null)}
          onChanged={(next) => mergeStoredProfile({ instagram: next })}
          onError={(msg) => toastError(msg)}
        />
      )}
    </section>
  )
}

function VerificationItemIcon({
  kind,
  verified,
}: {
  kind: 'school' | 'workplace' | 'instagram'
  verified: boolean
}) {
  if (verified) {
    return (
      <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.5'
          className='size-4'
          aria-hidden
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m5 12.5 4.5 4.5L19 7.5'
          />
        </svg>
      </span>
    )
  }

  const styles = {
    school: 'bg-[#57068c]/10 text-[#57068c]',
    workplace: 'bg-[#0f766e]/10 text-[#0f766e]',
    instagram: 'bg-[#fdf2f8] text-[#db2777]',
  }[kind]

  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${styles}`}
      aria-hidden
    >
      {kind === 'school' && <SchoolVerifyIcon />}
      {kind === 'workplace' && <WorkplaceRowIcon />}
      {kind === 'instagram' && <InstagramVerifyIcon />}
    </span>
  )
}

function WorkplaceRowIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M4.5 9.5h15v9a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5v-9Z'
      />
      <path strokeLinecap='round' strokeLinejoin='round' d='M4.5 13h15' />
    </svg>
  )
}

function SchoolVerifyIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M12 3 2 8.25 12 13.5l10-5.25L12 3Z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M6.5 10.8V16c0 .9 2.46 2.25 5.5 2.25s5.5-1.35 5.5-2.25v-5.2'
      />
      <path strokeLinecap='round' strokeLinejoin='round' d='M20 8.25V14' />
    </svg>
  )
}

function InstagramVerifyIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <rect x='4.5' y='4.5' width='15' height='15' rx='4.5' />
      <circle cx='12' cy='12' r='3.6' />
      <circle cx='17.2' cy='6.8' r='1' fill='currentColor' stroke='none' />
    </svg>
  )
}

function ChevronRight({ muted }: { muted?: boolean }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className={
        muted
          ? 'size-4 shrink-0 text-[#d4d7dd]'
          : 'size-4 shrink-0 text-[#c4c9d1]'
      }
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='m9 6 6 6-6 6' />
    </svg>
  )
}

const verifyDescriptionClass =
  'text-[13px] leading-relaxed text-[var(--muted-foreground)]'

const verifyLabelClass = 'text-[12px] font-medium text-[var(--muted)]'

const verifyInputClass =
  'h-11 w-full rounded-xl bg-[#f4f5f7] px-3.5 text-sm text-[var(--foreground)] outline-none ring-1 ring-transparent transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30'

const verifyHintClass = 'block text-[11px] leading-snug text-[var(--muted)]'

const verifyPrimaryButtonClass =
  'flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[13px] font-semibold leading-none text-white touch-manipulation disabled:opacity-50'

const verifyLinkButtonClass =
  'flex h-9 w-full items-center justify-center text-[13px] font-medium leading-none text-brand touch-manipulation disabled:text-[var(--muted)]'

const verifyGhostButtonClass =
  'flex h-9 w-full items-center justify-center text-[13px] font-medium leading-none text-[var(--muted-foreground)] touch-manipulation'

function VerifyClearableInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
  inputMode,
  autoCapitalize,
  autoCorrect,
}: {
  value: string
  onChange: (value: string) => void
  type?: HTMLInputTypeAttribute
  placeholder?: string
  autoComplete?: string
  disabled?: boolean
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoCapitalize?: string
  autoCorrect?: string
}) {
  const t = useT('me')
  const showClear = Boolean(value.trim()) && !disabled

  return (
    <div className='relative'>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        className={`${verifyInputClass}${showClear ? ' pr-14' : ''}`}
      />
      {showClear ? (
        <button
          type='button'
          onClick={() => onChange('')}
          className='absolute inset-y-0 right-0 flex items-center px-3.5 text-[12px] font-medium text-[var(--muted)]/60 touch-manipulation transition hover:text-[var(--muted-foreground)]'
          aria-label={t('verification.clearInputAria')}
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}

function VerifySheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <BottomSheet open onClose={onClose} title={title} scrollable={false}>
      <div className='space-y-4 px-3 pb-2 pt-1'>{children}</div>
    </BottomSheet>
  )
}

function WorkplaceStatusSheet({
  approved,
  companyName,
  workEmail,
  rejectReason,
  onClose,
}: {
  approved: boolean
  companyName?: string | null
  workEmail?: string | null
  rejectReason?: string | null
  onClose: () => void
}) {
  const t = useT('me')
  return (
    <VerifySheet
      title={
        approved
          ? t('verification.workplace.approvedTitle')
          : t('verification.workplace.pendingTitle')
      }
      onClose={onClose}
    >
      <p className={verifyDescriptionClass}>
        {approved
          ? t('verification.workplace.approvedDescription')
          : t('verification.workplace.pendingDescription')}
      </p>
      {companyName ? (
        <p className='text-[14px] font-medium text-[var(--foreground)]'>
          {companyName}
        </p>
      ) : null}
      {workEmail ? (
        <p className='text-[13px] text-[var(--muted)]'>{workEmail}</p>
      ) : null}
      {rejectReason ? (
        <p className='text-[13px] text-red-600'>{rejectReason}</p>
      ) : null}
    </VerifySheet>
  )
}

function WorkplaceEmailVerifyModal({
  initialEmail,
  initialCompanyName,
  onClose,
  onSubmitted,
  onError,
}: {
  initialEmail?: string
  initialCompanyName?: string
  onClose: () => void
  onSubmitted: (profile: Record<string, unknown> | null) => void
  onError: (msg: string) => void
}) {
  const t = useT('me')
  const tRoot = useT()
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [email, setEmail] = useState(initialEmail ?? '')
  const [companyName, setCompanyName] = useState(initialCompanyName ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function handleSend() {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedCompany = companyName.trim()
    const emailErrorCode = getWorkplaceEmailErrorCode(trimmedEmail)
    if (emailErrorCode) {
      onError(t(`verification.workplace.errors.${emailErrorCode}`))
      return
    }
    if (trimmedCompany.length < 2) {
      onError(t('verification.workplace.errors.companyRequired'))
      return
    }
    setBusy(true)
    try {
      await sendWorkplaceEmailVerification(
        {
          email: trimmedEmail,
          companyName: trimmedCompany,
        },
        tRoot,
      )
      setCode('')
      setStep('code')
      setCooldown(Math.ceil(SCHOOL_OTP_COOLDOWN_MS / 1000))
    } catch (err) {
      onError(getErrorMessage(err, t('verification.errors.sendFailed')))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    setBusy(true)
    try {
      const result = await confirmWorkplaceEmailVerification(
        {
          email: email.trim().toLowerCase(),
          companyName: companyName.trim(),
          code,
        },
        tRoot,
      )
      onSubmitted(result.profile)
    } catch (err) {
      onError(getErrorMessage(err, t('verification.errors.confirmFailed')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <VerifySheet title={t('verification.workplace.rowLabel')} onClose={onClose}>
      {step === 'form' ? (
        <>
          <p className={verifyDescriptionClass}>
            {t('verification.workplace.formDescription')}
          </p>
          <label className='block space-y-2'>
            <span className={verifyLabelClass}>
              {t('verification.workplace.companyLabel')}
            </span>
            <VerifyClearableInput
              value={companyName}
              onChange={(value) =>
                setCompanyName(value.slice(0, WORKPLACE_COMPANY_MAX))
              }
              placeholder={t('verification.workplace.companyPlaceholder')}
              disabled={busy}
            />
            <span className={verifyHintClass}>
              {companyName.length}/{WORKPLACE_COMPANY_MAX}
            </span>
          </label>
          <label className='block space-y-2'>
            <span className={verifyLabelClass}>
              {t('verification.workplace.emailLabel')}
            </span>
            <VerifyClearableInput
              type='email'
              value={email}
              onChange={setEmail}
              placeholder='name@company.com'
              autoComplete='email'
              disabled={busy}
            />
          </label>
          <button
            type='button'
            disabled={busy || !email.trim() || companyName.trim().length < 2}
            onClick={() => void handleSend()}
            className={verifyPrimaryButtonClass}
          >
            {busy ? t('verification.sending') : t('verification.getCode')}
          </button>
        </>
      ) : (
        <>
          <p className={`${verifyDescriptionClass} text-center`}>
            {renderWithSlots(t('verification.codeSentTo'), {
              email: (
                <span className='font-medium text-[var(--foreground)]'>{email}</span>
              ),
              br: <br />,
            })}
          </p>
          <OtpDigitInputs value={code} onChange={setCode} disabled={busy} />
          <div className='space-y-2'>
            <button
              type='button'
              disabled={busy || code.length !== 6}
              onClick={() => void handleConfirm()}
              className={verifyPrimaryButtonClass}
            >
              {busy ? t('verification.checking') : t('verification.workplace.confirmButton')}
            </button>
            <button
              type='button'
              disabled={busy || cooldown > 0}
              onClick={() => void handleSend()}
              className={verifyLinkButtonClass}
            >
              {cooldown > 0
                ? t('verification.resendIn', { seconds: cooldown })
                : t('verification.resendCode')}
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => setStep('form')}
              className={verifyGhostButtonClass}
            >
              {t('verification.workplace.editForm')}
            </button>
          </div>
        </>
      )}
    </VerifySheet>
  )
}

function SchoolEmailVerifyModal({
  onClose,
  onVerified,
  onRegistered,
  onError,
}: {
  onClose: () => void
  onVerified: (
    schoolName: string | null,
    profile: Record<string, unknown> | null,
    isPrimary: boolean,
  ) => void
  onRegistered: () => void
  onError: (msg: string) => void
}) {
  const t = useT('me')
  const tRoot = useT()
  const { user } = useAuth()
  const [step, setStep] = useState<'email' | 'code' | 'register'>('email')
  // ERP에서 더한 학교 도메인도 '학교 이메일'로 알아보도록 목록을 불러 둔다
  useVerifiedSchools()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [schoolNameDraft, setSchoolNameDraft] = useState('')
  const [emailDomainDraft, setEmailDomainDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    const accountEmail = user?.email?.trim().toLowerCase()
    if (accountEmail && isSchoolEmail(accountEmail)) {
      setEmail(accountEmail)
    }
  }, [user?.email])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  function openRegisterStep(sourceEmail?: string) {
    const fromEmail = (sourceEmail ?? email).trim().toLowerCase()
    const domain = fromEmail.includes('@')
      ? normalizeSchoolDomain(fromEmail.split('@')[1] ?? '')
      : normalizeSchoolDomain(fromEmail)

    if (domain) {
      setEmailDomainDraft(domain)
    }

    const matched = fromEmail.includes('@')
      ? resolveSchoolFromEmail(fromEmail)
      : null
    if (matched && !schoolNameDraft.trim()) {
      setSchoolNameDraft(matched.fullName)
    }

    setStep('register')
  }

  async function handleSend() {
    if (!user) return
    const trimmed = email.trim().toLowerCase()
    if (!isSchoolEmail(trimmed)) {
      if (isValidEmailFormat(trimmed)) {
        openRegisterStep(trimmed)
        return
      }
      onError(t('verification.school.errors.eduRequired'))
      return
    }
    setBusy(true)
    try {
      await sendSchoolEmailVerification(trimmed, tRoot)
      setCode('')
      setStep('code')
      setCooldown(Math.ceil(SCHOOL_OTP_COOLDOWN_MS / 1000))
    } catch (err) {
      const code =
        err &&
        typeof err === 'object' &&
        'code' in err &&
        typeof (err as { code?: string }).code === 'string'
          ? (err as { code: string }).code
          : null

      if (code === 'SCHOOL_DOMAIN_UNSUPPORTED') {
        openRegisterStep(trimmed)
        onError(
          getErrorMessage(
            err,
            t('verification.school.errors.unsupported'),
          ),
        )
        return
      }

      onError(getErrorMessage(err, t('verification.errors.sendFailed')))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (!user) return
    setBusy(true)
    try {
      const result = await confirmSchoolEmailVerification(
        email.trim().toLowerCase(),
        code,
        tRoot,
      )
      onVerified(result.schoolName, result.profile, result.isPrimary)
    } catch (err) {
      onError(getErrorMessage(err, t('verification.errors.confirmFailed')))
    } finally {
      setBusy(false)
    }
  }

  async function handleRegisterSubmit() {
    if (!user?.email) {
      onError(tRoot('auth.errors.loginRequired'))
      return
    }

    const schoolName = schoolNameDraft.trim()
    const emailDomain = normalizeSchoolDomain(emailDomainDraft)

    if (schoolName.length < 2) {
      onError(t('verification.school.errors.nameRequired'))
      return
    }
    if (!isValidSchoolDomain(emailDomain)) {
      onError(t('verification.school.errors.invalidDomain'))
      return
    }

    setBusy(true)
    try {
      await sendSchoolRegistrationRequest(
        {
          schoolName,
          emailDomain,
          requesterEmail: user.email,
          requesterName: user.displayName,
        },
        tRoot,
      )
      onRegistered()
    } catch (err) {
      onError(getErrorMessage(err, t('verification.school.errors.registrationFailed')))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'register') {
    return (
      <VerifySheet title={t('verification.school.registerTitle')} onClose={onClose}>
        <p className={verifyDescriptionClass}>
          {t('verification.school.registerDescription', { brand: BRAND_CONFIG.name })}
        </p>

        <label className='block space-y-2'>
          <span className={verifyLabelClass}>
            {t('verification.school.nameLabel')}
          </span>
          <input
            type='text'
            value={schoolNameDraft}
            onChange={(e) => setSchoolNameDraft(e.target.value)}
            placeholder='Monroe University'
            className={verifyInputClass}
          />
        </label>

        <label className='block space-y-2'>
          <span className={verifyLabelClass}>
            {t('verification.school.domainLabel')}
          </span>
          <input
            type='text'
            value={emailDomainDraft}
            onChange={(e) =>
              setEmailDomainDraft(normalizeSchoolDomain(e.target.value))
            }
            placeholder='monroeu.com'
            className={verifyInputClass}
            autoCapitalize='none'
            autoCorrect='off'
          />
          <span className={verifyHintClass}>
            {t('verification.school.domainHint')}
          </span>
        </label>

        <div className='space-y-2 pt-1'>
          <button
            type='button'
            disabled={
              busy ||
              schoolNameDraft.trim().length < 2 ||
              !isValidSchoolDomain(emailDomainDraft)
            }
            onClick={() => void handleRegisterSubmit()}
            className={verifyPrimaryButtonClass}
          >
            {busy ? t('verification.sending') : t('verification.school.registerSubmit')}
          </button>

          <button
            type='button'
            disabled={busy}
            onClick={() => setStep('email')}
            className={verifyGhostButtonClass}
          >
            {t('verification.school.backToVerify')}
          </button>
        </div>
      </VerifySheet>
    )
  }

  return (
    <VerifySheet title={t('verification.school.verifyTitle')} onClose={onClose}>
      {step === 'email' ? (
        <>
          <p className={verifyDescriptionClass}>
            {t('verification.school.formDescription')}
          </p>
          <VerifyClearableInput
            type='email'
            value={email}
            onChange={setEmail}
            placeholder='name@school.edu'
            autoComplete='email'
            disabled={busy}
          />
          <div className='space-y-2'>
            <button
              type='button'
              disabled={busy || !email.trim()}
              onClick={() => void handleSend()}
              className={verifyPrimaryButtonClass}
            >
              {busy ? t('verification.sending') : t('verification.getCode')}
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => openRegisterStep()}
              className={verifyLinkButtonClass}
            >
              {t('verification.school.notFoundRequest')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={`${verifyDescriptionClass} text-center`}>
            {renderWithSlots(t('verification.codeSentTo'), {
              email: (
                <span className='font-medium text-[var(--foreground)]'>{email}</span>
              ),
              br: <br />,
            })}
          </p>

          <OtpDigitInputs value={code} onChange={setCode} disabled={busy} />

          <div className='space-y-2'>
            <button
              type='button'
              disabled={busy || code.length !== 6}
              onClick={() => void handleConfirm()}
              className={verifyPrimaryButtonClass}
            >
              {busy ? t('verification.checking') : t('verification.confirmButton')}
            </button>
            <button
              type='button'
              disabled={busy || cooldown > 0}
              onClick={() => void handleSend()}
              className={verifyLinkButtonClass}
            >
              {cooldown > 0
                ? t('verification.resendIn', { seconds: cooldown })
                : t('verification.resendCode')}
            </button>
          </div>
        </>
      )}
    </VerifySheet>
  )
}

function OtpDigitInputs({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const t = useT('me')
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  function setAt(index: number, char: string) {
    const next = digits.map((d, i) => (i === index ? char : d))
    onChange(next.join('').replace(/\D/g, '').slice(0, 6))
  }

  function handlePaste(raw: string) {
    const pasted = raw.replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    refs.current[focusIdx]?.focus()
  }

  return (
    <div className='flex justify-center gap-2'>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type='text'
          inputMode='numeric'
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={t('verification.digitAria', { position: index + 1 })}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (!v) {
              setAt(index, '')
              return
            }
            if (v.length > 1) {
              handlePaste(v)
              return
            }
            setAt(index, v)
            if (index < 5) refs.current[index + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus()
            }
            if (e.key === 'ArrowLeft' && index > 0) {
              e.preventDefault()
              refs.current[index - 1]?.focus()
            }
            if (e.key === 'ArrowRight' && index < 5) {
              e.preventDefault()
              refs.current[index + 1]?.focus()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            handlePaste(e.clipboardData.getData('text'))
          }}
          className='h-12 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center text-lg font-bold text-[var(--foreground)] shadow-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 disabled:opacity-50 sm:h-13 sm:w-11'
        />
      ))}
    </div>
  )
}

/** 인증한 학교 목록 — 대표 학교(글 배지·학교 게시판)를 고르고, 최대 MAX_VERIFIED_SCHOOLS개까지 더 인증한다 */
function SchoolsSheet({
  schools,
  onClose,
  onAddSchool,
  onChanged,
  onError,
}: {
  schools: VerifiedSchoolEntry[]
  onClose: () => void
  onAddSchool: () => void
  onChanged: (profile: Record<string, unknown> | null, schoolName: string) => void
  onError: (msg: string) => void
}) {
  const t = useT('me')
  const tRoot = useT()
  const [saving, setSaving] = useState<string | null>(null)
  const primaryEmail = schools[0]?.email
  const canAdd = schools.length < MAX_VERIFIED_SCHOOLS

  async function choose(school: VerifiedSchoolEntry) {
    if (school.email === primaryEmail || saving) return
    setSaving(school.email)
    try {
      const profile = await setPrimarySchool(school.email, tRoot)
      onChanged(profile, school.name)
    } catch (err) {
      onError(getErrorMessage(err, t('verification.errors.confirmFailed')))
    } finally {
      setSaving(null)
    }
  }

  return (
    <VerifySheet title={t('verification.school.manageTitle')} onClose={onClose}>
      <p className={verifyDescriptionClass}>
        {t('verification.school.manageDescription', { max: MAX_VERIFIED_SCHOOLS })}
      </p>
      <ul className='overflow-hidden rounded-2xl ring-1 ring-black/[0.06]'>
        {schools.map((school, index) => {
          const primary = school.email === primaryEmail
          return (
            <li key={school.email} className={index > 0 ? 'border-t border-[#f0f1f3]' : undefined}>
              <button
                type='button'
                onClick={() => void choose(school)}
                disabled={Boolean(saving)}
                className='flex w-full items-center gap-3 px-4 py-3.5 text-left touch-manipulation transition active:bg-[#f8f9fb] disabled:opacity-60'
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    primary ? 'border-[var(--brand)]' : 'border-[#d4d7dd]'
                  }`}
                  aria-hidden
                >
                  {primary && <span className='size-2.5 rounded-full bg-[var(--brand)]' />}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='flex items-center gap-1.5'>
                    <span className='truncate text-[14px] font-medium text-[var(--foreground)]'>
                      {school.name}
                    </span>
                    {primary && (
                      <span className='shrink-0 rounded-md bg-[var(--brand)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]'>
                        {t('verification.school.primary')}
                      </span>
                    )}
                  </span>
                  <span className='block truncate text-[12px] text-[var(--muted)]'>{school.email}</span>
                </span>
                {saving === school.email && (
                  <span className='size-4 shrink-0 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent' />
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {canAdd ? (
        <button type='button' onClick={onAddSchool} className={verifyPrimaryButtonClass}>
          {t('verification.school.addAnother')}
        </button>
      ) : (
        <p className={verifyHintClass}>
          {t('verification.school.limitReached', { max: MAX_VERIFIED_SCHOOLS })}
        </p>
      )}
    </VerifySheet>
  )
}

/**
 * 인스타그램 DM 인증: 아이디 입력 → 코드 발급 → 미리 쓴 메시지를 복사해 @misaeng.ny에 DM → "보냈어요" → ERP에서 승인.
 * 인스타그램은 DM 입력칸을 채워 주는 링크가 없어서, 복사와 대화창 열기를 버튼 하나로 묶어 붙여넣기만 남긴다.
 */
function InstagramVerifySheet({
  state,
  verifiedHandle,
  onClose,
  onChanged,
  onError,
}: {
  state: InstagramVerificationState | null
  verifiedHandle: string | null
  onClose: () => void
  onChanged: (next: InstagramVerificationState) => void
  onError: (msg: string) => void
}) {
  const t = useT('me')
  const tRoot = useT()
  const format = useFormat()
  const { success } = useToast()
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [changing, setChanging] = useState(false)
  const account = MISAENG_INSTAGRAM_HANDLE

  const pending = state?.status === 'pending' && !state.expired && state.code
  const showForm = changing || (!pending && !verifiedHandle)
  const message = pending ? t('verification.instagram.dmMessage', { code: state.code ?? '' }) : ''

  async function run(body: Parameters<typeof postInstagramVerification>[0], toast?: string) {
    setBusy(true)
    try {
      const next = await postInstagramVerification(body, tRoot)
      onChanged(next)
      setChanging(false)
      if (toast) success(toast)
    } catch (err) {
      onError(getErrorMessage(err, t('verification.errors.sendFailed')))
    } finally {
      setBusy(false)
    }
  }

  async function copyMessage(openDm: boolean) {
    // 창은 클릭 즉시 열어야 팝업 차단을 피한다
    if (openDm) window.open(MISAENG_INSTAGRAM_DM_URL, '_blank', 'noopener,noreferrer')
    try {
      await navigator.clipboard.writeText(message)
      success(t('verification.instagram.copiedToast'))
    } catch {
      onError(message)
    }
  }

  return (
    <VerifySheet title={t('verification.instagram.title')} onClose={onClose}>
      {showForm ? (
        <>
          <p className={verifyDescriptionClass}>
            {t('verification.instagram.intro', { account })}{' '}
            {t('verification.instagram.privacy')}
          </p>
          {state?.status === 'rejected' && !changing && (
            <div className='rounded-xl bg-red-50 px-3.5 py-3 text-[13px] text-red-700'>
              <p className='font-semibold'>{t('verification.instagram.rejectedTitle')}</p>
              <p className='mt-0.5'>
                {state.rejectReasonCode && state.rejectReasonCode !== 'other'
                  ? t(`verification.instagram.rejectReasons.${state.rejectReasonCode}`)
                  : state.rejectReason || t('verification.instagram.rejectReasons.other')}
              </p>
            </div>
          )}
          {state?.status === 'pending' && state.expired && (
            <p className='text-[13px] text-amber-700'>{t('verification.instagram.expired')}</p>
          )}
          <label className='block space-y-1.5'>
            <span className={verifyLabelClass}>{t('verification.instagram.handleLabel')}</span>
            <VerifyClearableInput
              value={handle}
              onChange={setHandle}
              placeholder={t('verification.instagram.handlePlaceholder')}
              autoCapitalize='none'
              autoCorrect='off'
              autoComplete='off'
              disabled={busy}
            />
          </label>
          <button
            type='button'
            disabled={busy || !handle.trim()}
            onClick={() => void run({ action: 'request', handle })}
            className={verifyPrimaryButtonClass}
          >
            {busy ? t('verification.sending') : t('verification.instagram.getCode')}
          </button>
        </>
      ) : pending ? (
        <>
          <p className='text-[13px] leading-relaxed text-[var(--foreground)]'>
            <span className='mr-1 font-semibold text-[var(--brand)]'>1</span>
            {t('verification.instagram.step1', { handle: state.handle ?? '', account })}
          </p>

          <div>
            <p className={verifyLabelClass}>{t('verification.instagram.previewLabel')}</p>
            {/* 인스타그램 DM 화면처럼: 위에 상대 계정, 오른쪽에 내가 보낼 말풍선 */}
            <div className='mt-1.5 rounded-2xl bg-[#f4f5f7] p-3.5'>
              <div className='flex items-center gap-2'>
                <span className='flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white'>
                  <span className='scale-75'>
                    <InstagramVerifyIcon />
                  </span>
                </span>
                <span className='text-[13px] font-semibold text-[var(--foreground)]'>{account}</span>
              </div>
              <div className='mt-3 flex justify-end'>
                <p className='max-w-[85%] whitespace-pre-line rounded-[1.1rem] rounded-br-md bg-[#3797f0] px-3.5 py-2.5 text-[13px] leading-snug text-white'>
                  {message}
                </p>
              </div>
              <p className='mt-1 text-right text-[11px] text-[var(--muted)]'>
                {t('verification.instagram.previewHint')}
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={() => void copyMessage(true)}
            className={verifyPrimaryButtonClass}
          >
            {t('verification.instagram.copyAndOpen')}
          </button>
          <button type='button' onClick={() => void copyMessage(false)} className={verifyLinkButtonClass}>
            {t('verification.instagram.copyOnly')}
          </button>

          <p className='text-[13px] leading-relaxed text-[var(--foreground)]'>
            <span className='mr-1 font-semibold text-[var(--brand)]'>2</span>
            {t('verification.instagram.step2')}
          </p>

          {state.sentAt ? (
            <div className='rounded-xl bg-amber-50 px-3.5 py-3'>
              <p className='text-[13px] font-semibold text-amber-800'>{t('verification.instagram.inReview')}</p>
              <p className='mt-0.5 text-[12px] text-amber-800/80'>
                {t('verification.instagram.inReviewDescription', { account })}
              </p>
            </div>
          ) : (
            <>
              <p className='text-[13px] leading-relaxed text-[var(--foreground)]'>
                <span className='mr-1 font-semibold text-[var(--brand)]'>3</span>
                {t('verification.instagram.step3')}
              </p>
              <button
                type='button'
                disabled={busy}
                onClick={() => void run({ action: 'sent' }, t('verification.instagram.sentToast'))}
                className={verifyPrimaryButtonClass}
              >
                {t('verification.instagram.sent')}
              </button>
            </>
          )}

          <ul className='space-y-1 text-[12px] text-[var(--muted)]'>
            <li>· {t('verification.instagram.noteOtherAccount')}</li>
            <li>· {t('verification.instagram.notePrivate')}</li>
            {state.expiresAt ? (
              <li>
                · {t('verification.instagram.noteExpiry', { date: format.date(state.expiresAt) })}
              </li>
            ) : null}
          </ul>
          <button
            type='button'
            disabled={busy}
            onClick={() => void run({ action: 'cancel' }, t('verification.instagram.cancelledToast'))}
            className={verifyGhostButtonClass}
          >
            {t('verification.instagram.cancel')}
          </button>
        </>
      ) : (
        <>
          <p className={verifyDescriptionClass}>
            {t('verification.instagram.verifiedDescription', { handle: verifiedHandle ?? '' })}
          </p>
          <button type='button' onClick={() => setChanging(true)} className={verifyGhostButtonClass}>
            {t('verification.instagram.changeAccount')}
          </button>
        </>
      )}
    </VerifySheet>
  )
}
