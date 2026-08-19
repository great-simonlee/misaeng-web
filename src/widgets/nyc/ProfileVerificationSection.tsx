'use client'

import type { HTMLInputTypeAttribute, InputHTMLAttributes, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BottomSheet, SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  PHONE_OTP_COOLDOWN_MS,
  PHONE_OTP_DAILY_MAX,
  REQUIRE_SCHOOL_BEFORE_PHONE,
  SCHOOL_OTP_COOLDOWN_MS,
  isPhoneSmsEnabled,
  isPhoneTestOnly,
} from '@lib/constants/verificationSafety'
import {
  confirmSchoolEmailVerification,
  sendSchoolEmailVerification,
} from '@lib/api/schoolVerification'
import { sendSchoolRegistrationRequest } from '@lib/api/schoolRegistrationRequest'
import { resolveSchoolFromEmail } from '@lib/constants/schools'
import {
  isValidSchoolDomain,
  normalizeSchoolDomain,
} from '@lib/utils/schoolDomain'
import {
  formatPhoneDisplay,
  isSchoolEmail,
  isValidEmailFormat,
  normalizePhoneE164,
} from '@lib/utils/verification'
import type { NycUserProfile } from '@/types/nyc'

type VerifyKind = 'school' | 'phone' | null

type Props = {
  profile: NycUserProfile | null
  openSchoolVerify?: boolean
  onSchoolVerifyOpenChange?: (open: boolean) => void
}

export function ProfileVerificationSection({
  profile,
  openSchoolVerify = false,
  onSchoolVerifyOpenChange,
}: Props) {
  const { user, refreshSession, mergeStoredProfile } = useAuth()
  const { success, error: toastError } = useToast()
  const [active, setActive] = useState<VerifyKind>(null)
  const resolvedActive: VerifyKind = openSchoolVerify ? 'school' : active

  const closeVerify = useCallback(
    (kind: VerifyKind) => {
      setActive(null)
      if (kind === 'school') {
        onSchoolVerifyOpenChange?.(false)
      }
    },
    [onSchoolVerifyOpenChange],
  )

  const smsEnabled = isPhoneSmsEnabled()
  const schoolOk = Boolean(profile?.schoolEmailVerified)
  const phoneBlockedReason = !smsEnabled
    ? 'SMS 비활성'
    : REQUIRE_SCHOOL_BEFORE_PHONE && !schoolOk
      ? '학교 인증 후'
      : null

  const items = [
    {
      id: 'school' as const,
      label: '학교 이메일',
      verified: Boolean(profile?.schoolEmailVerified),
      schoolId: profile?.verifiedSchoolId ?? null,
      detail: profile?.schoolEmailVerified
        ? profile.schoolEmail || '인증됨'
        : '학교 메일로 학생 인증',
    },
    {
      id: 'phone' as const,
      label: '휴대폰',
      verified: Boolean(profile?.phoneVerified),
      schoolId: null as string | null,
      detail: profile?.phoneVerified
        ? formatPhoneDisplay(profile.phone ?? '')
        : phoneBlockedReason
          ? phoneBlockedReason
          : '번호로 본인 인증',
    },
    {
      id: 'instagram' as const,
      label: '인스타그램',
      verified: Boolean(profile?.instagramVerified),
      schoolId: null as string | null,
      detail: profile?.instagramVerified
        ? `@${profile.instagramHandle ?? ''}`
        : '계정 연동',
      soon: true,
    },
  ]

  return (
    <section className='mt-0'>
      <h2 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        인증
      </h2>
      <ul className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const soon = 'soon' in item && item.soon
          const phoneBlocked = item.id === 'phone' && phoneBlockedReason
          const canVerify =
            !soon && !item.verified && !phoneBlocked &&
            (item.id === 'school' || item.id === 'phone')

          const row = (
            <div className='flex items-center gap-3.5 px-5 py-4'>
              <VerificationItemIcon
                kind={item.id}
                verified={item.verified}
                muted={Boolean(soon || phoneBlocked)}
              />
              <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
                  <p className='text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                    {item.label}
                  </p>
                  {item.id === 'school' && item.verified && (
                    <SchoolBadge schoolId={item.schoolId} />
                  )}
                </div>
                <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                  {item.detail}
                </p>
              </div>
              {soon ? (
                <span className='shrink-0 text-[12px] text-[var(--muted)]'>
                  준비 중
                </span>
              ) : item.verified ? (
                <span className='shrink-0 text-[12px] font-medium text-emerald-600'>
                  인증 완료
                </span>
              ) : phoneBlocked ? (
                <span className='shrink-0 text-[12px] text-[var(--muted)]'>
                  {phoneBlockedReason}
                </span>
              ) : (
                <span className='shrink-0 text-[12px] font-medium text-[var(--brand)]'>
                  인증
                </span>
              )}
              {(canVerify || soon || phoneBlocked) && !item.verified && (
                <ChevronRight muted={!canVerify} />
              )}
            </div>
          )

          return (
            <li
              key={item.id}
              className={isLast ? undefined : 'border-b border-[#f0f1f3]'}
            >
              {canVerify ? (
                <button
                  type='button'
                  onClick={() => setActive(item.id)}
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
      {!smsEnabled && (
        <p className='mt-2.5 px-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
          휴대폰 SMS 인증은 현재 비활성화되어 있어요.
        </p>
      )}

      {resolvedActive === 'school' && user && (
        <SchoolEmailVerifyModal
          onClose={() => closeVerify('school')}
          onVerified={(schoolName, storedProfile) => {
            if (storedProfile) mergeStoredProfile(storedProfile)
            void refreshSession()
            success(
              schoolName
                ? `${schoolName}로 인증했어요`
                : '학교 이메일 인증을 완료했어요',
            )
            closeVerify('school')
          }}
          onRegistered={() => {
            success('학교 등록 요청을 보냈어요. 검토 후 연락드릴게요.')
            closeVerify('school')
          }}
          onError={(msg) => toastError(msg)}
        />
      )}

      {resolvedActive === 'phone' && user && (
        <PhoneVerifyModal
          onClose={() => {
            // resetPhoneVerification()
            setActive(null)
          }}
          onVerified={() => {
            success('휴대폰 인증을 완료했어요')
            setActive(null)
          }}
          onError={(msg) => toastError(msg)}
        />
      )}

      <div id='nyc-phone-recaptcha' className='hidden' />
    </section>
  )
}

function VerificationItemIcon({
  kind,
  verified,
  muted,
}: {
  kind: 'school' | 'phone' | 'instagram'
  verified: boolean
  muted?: boolean
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
    school: muted
      ? 'bg-[#f0f1f3] text-[#94a3b8]'
      : 'bg-[#57068c]/10 text-[#57068c]',
    phone: muted
      ? 'bg-[#f0f1f3] text-[#94a3b8]'
      : 'bg-[#2563eb]/10 text-[#2563eb]',
    instagram: 'bg-[#fdf2f8] text-[#db2777]',
  }[kind]

  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${styles}`}
      aria-hidden
    >
      {kind === 'school' && <SchoolVerifyIcon />}
      {kind === 'phone' && <PhoneVerifyIcon />}
      {kind === 'instagram' && <InstagramVerifyIcon />}
    </span>
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

function PhoneVerifyIcon() {
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
        d='M6.6 3.5h2.2c.6 0 1.1.4 1.2 1l.4 2.4a1.2 1.2 0 0 1-.35 1.05l-1.5 1.5a12.5 12.5 0 0 0 5.6 5.6l1.5-1.5a1.2 1.2 0 0 1 1.05-.35l2.4.4c.6.1 1 .6 1 1.2v2.2c0 .66-.54 1.2-1.2 1.2C10.2 20.5 3.5 13.8 3.5 5.7c0-.66.54-1.2 1.2-1.2Z'
      />
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
  'flex h-9 w-full items-center justify-center text-[13px] font-medium leading-none text-[#F64310] touch-manipulation disabled:text-[var(--muted)]'

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
          aria-label='입력 지우기'
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
  ) => void
  onRegistered: () => void
  onError: (msg: string) => void
}) {
  const { user } = useAuth()
  const [step, setStep] = useState<'email' | 'code' | 'register'>('email')
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
    const t = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => window.clearInterval(t)
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
      onError('.edu 학교 이메일을 입력해 주세요')
      return
    }
    setBusy(true)
    try {
      await sendSchoolEmailVerification(trimmed)
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
            '아직 지원하지 않는 학교예요. 등록 요청을 보내 주세요.',
          ),
        )
        return
      }

      onError(getErrorMessage(err, '인증 메일 전송에 실패했어요'))
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
      )
      onVerified(result.schoolName, result.profile)
    } catch (err) {
      onError(getErrorMessage(err, '인증에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  async function handleRegisterSubmit() {
    if (!user?.email) {
      onError('로그인이 필요해요')
      return
    }

    const schoolName = schoolNameDraft.trim()
    const emailDomain = normalizeSchoolDomain(emailDomainDraft)

    if (schoolName.length < 2) {
      onError('학교 이름을 입력해 주세요')
      return
    }
    if (!isValidSchoolDomain(emailDomain)) {
      onError('올바른 이메일 도메인을 입력해 주세요 (예: monroeu.com)')
      return
    }

    setBusy(true)
    try {
      await sendSchoolRegistrationRequest({
        schoolName,
        emailDomain,
        requesterEmail: user.email,
        requesterName: user.displayName,
      })
      onRegistered()
    } catch (err) {
      onError(getErrorMessage(err, '학교 등록 요청 전송에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'register') {
    return (
      <VerifySheet title='학교 등록 요청' onClose={onClose}>
        <p className={verifyDescriptionClass}>
          목록에 없는 학교는 미생팀에 등록을 요청할 수 있어요. 학교 이름과
          이메일 도메인을 알려주시면 Ellieo·앱에 반영해 드려요.
        </p>

        <label className='block space-y-2'>
          <span className={verifyLabelClass}>학교 이름</span>
          <input
            type='text'
            value={schoolNameDraft}
            onChange={(e) => setSchoolNameDraft(e.target.value)}
            placeholder='Monroe University'
            className={verifyInputClass}
          />
        </label>

        <label className='block space-y-2'>
          <span className={verifyLabelClass}>학교 이메일 도메인</span>
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
            @ 없이 도메인만 입력 (예: monroeu.com)
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
            {busy ? '전송 중…' : '미생팀에 등록 요청'}
          </button>

          <button
            type='button'
            disabled={busy}
            onClick={() => setStep('email')}
            className={verifyGhostButtonClass}
          >
            학교 이메일 인증으로 돌아가기
          </button>
        </div>
      </VerifySheet>
    )
  }

  return (
    <VerifySheet title='학교 이메일 인증' onClose={onClose}>
      {step === 'email' ? (
        <>
          <p className={verifyDescriptionClass}>
            학교 이메일로 6자리 코드를 보내 드려요.
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
              {busy ? '전송 중…' : '인증 코드 받기'}
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => openRegisterStep()}
              className={verifyLinkButtonClass}
            >
              학교를 찾을 수 없어요 · 등록 요청
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={`${verifyDescriptionClass} text-center`}>
            <span className='font-medium text-[var(--foreground)]'>{email}</span>
            <br />
            으로 보낸 6자리 코드를 입력해 주세요
          </p>

          <OtpDigitInputs value={code} onChange={setCode} disabled={busy} />

          <div className='space-y-2'>
            <button
              type='button'
              disabled={busy || code.length !== 6}
              onClick={() => void handleConfirm()}
              className={verifyPrimaryButtonClass}
            >
              {busy ? '확인 중…' : '인증 완료'}
            </button>
            <button
              type='button'
              disabled={busy || cooldown > 0}
              onClick={() => void handleSend()}
              className={verifyLinkButtonClass}
            >
              {cooldown > 0 ? `재전송 ${cooldown}s` : '코드 다시 받기'}
            </button>
          </div>
        </>
      )}
    </VerifySheet>
  )
}

function PhoneVerifyModal({
  onClose,
  onVerified,
  onError,
}: {
  onClose: () => void
  onVerified: () => void
  onError: (msg: string) => void
}) {
  const { user } = useAuth()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [cooldown])

  async function handleSend() {
    if (!user) return
    setBusy(true)
    try {
      // 임시: 파이어베이스 휴대폰 OTP 비활성화
      throw new Error('Supabase 연동 후 이용할 수 있어요')
      /*
      const normalized = normalizePhoneE164(phone)
      await sendPhoneOtp(user, normalized)
      setE164(normalized)
      setStep('code')
      setCooldown(Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000))
      */
    } catch (err) {
      // resetPhoneVerification()
      onError(getErrorMessage(err, '인증 문자 전송에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (!user || !e164) return
    setBusy(true)
    try {
      // 임시: 파이어베이스 휴대폰 확인 비활성화
      throw new Error('Supabase 연동 후 이용할 수 있어요')
      /*
      await confirmPhoneOtp(user, code, e164)
      onVerified()
      */
    } catch (err) {
      onError(getErrorMessage(err, '휴대폰 인증에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <VerifySheet title='휴대폰 인증' onClose={onClose}>
      {step === 'phone' ? (
        <>
          <p className={verifyDescriptionClass}>
            미국(+1) 또는 한국(+82) 번호로 SMS 인증을 진행해요. 계정당 하루{' '}
            {PHONE_OTP_DAILY_MAX}회, {Math.ceil(PHONE_OTP_COOLDOWN_MS / 1000)}초
            쿨다운이 적용돼요.
            {isPhoneTestOnly() &&
              ' 지금은 테스트 허용 번호만 사용할 수 있어요.'}
          </p>
          <input
            type='tel'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder='+1 6465550123 / 01012345678'
            className={verifyInputClass}
            autoComplete='tel'
          />
          <button
            type='button'
            disabled={busy || !phone.trim()}
            onClick={() => void handleSend()}
            className={verifyPrimaryButtonClass}
          >
            {busy ? '전송 중…' : '인증 문자 받기'}
          </button>
        </>
      ) : (
        <>
          <p className={verifyDescriptionClass}>
            <span className='font-medium text-[var(--foreground)]'>
              {formatPhoneDisplay(e164)}
            </span>
            으로 보낸 코드를 입력해 주세요.
          </p>
          <input
            type='text'
            inputMode='numeric'
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder='6자리 코드'
            className={`${verifyInputClass} text-center tracking-[0.3em]`}
            autoComplete='one-time-code'
          />
          <div className='space-y-2'>
            <button
              type='button'
              disabled={busy || code.length < 4}
              onClick={() => void handleConfirm()}
              className={verifyPrimaryButtonClass}
            >
              {busy ? '확인 중…' : '인증 완료'}
            </button>
            <button
              type='button'
              disabled={busy || cooldown > 0}
              onClick={() => void handleSend()}
              className={verifyLinkButtonClass}
            >
              {cooldown > 0 ? `재전송 ${cooldown}s` : '문자 다시 받기'}
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
          aria-label={`${index + 1}번째 인증 숫자`}
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
          className='h-12 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center text-lg font-bold text-[var(--foreground)] shadow-sm outline-none transition focus:border-[#F64310] focus:bg-white focus:ring-2 focus:ring-[#F64310]/20 disabled:opacity-50 sm:h-13 sm:w-11'
        />
      ))}
    </div>
  )
}
