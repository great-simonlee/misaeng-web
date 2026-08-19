'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

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
// 임시: 파이어베이스 인증 연동 비활성화
// import {
//   clearPendingSchoolOtp,
//   confirmPhoneOtp,
//   confirmSchoolEmailOtp,
//   resetPhoneVerification,
//   sendPhoneOtp,
//   sendSchoolEmailOtp,
// } from '@lib/firebase/verification'
import {
  formatPhoneDisplay,
  isSchoolEmail,
  normalizePhoneE164,
} from '@lib/utils/verification'
import type { NycUserProfile } from '@/types/nyc'

type VerifyKind = 'school' | 'phone' | null

type Props = {
  profile: NycUserProfile | null
}

export function ProfileVerificationSection({ profile }: Props) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [active, setActive] = useState<VerifyKind>(null)

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
              <StatusIcon verified={item.verified} />
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
                  완료
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

      {active === 'school' && user && (
        <SchoolEmailVerifyModal
          onClose={() => {
            // clearPendingSchoolOtp()
            setActive(null)
          }}
          onVerified={(schoolName) => {
            success(
              schoolName
                ? `${schoolName}로 인증했어요`
                : '학교 이메일 인증을 완료했어요',
            )
            setActive(null)
          }}
          onError={(msg) => toastError(msg)}
        />
      )}

      {active === 'phone' && user && (
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

function StatusIcon({ verified }: { verified: boolean }) {
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

  return (
    <span
      className='size-8 shrink-0 rounded-full bg-[#f0f1f3] ring-1 ring-inset ring-black/[0.04]'
      aria-hidden
    />
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

function SchoolEmailVerifyModal({
  onClose,
  onVerified,
  onError,
}: {
  onClose: () => void
  onVerified: (schoolName: string | null) => void
  onError: (msg: string) => void
}) {
  const { user } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
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
    const trimmed = email.trim().toLowerCase()
    if (!isSchoolEmail(trimmed)) {
      onError('.edu 학교 이메일을 입력해 주세요')
      return
    }
    setBusy(true)
    try {
      // 임시: 파이어베이스 학교 이메일 OTP 비활성화
      throw new Error('Firebase가 일시적으로 비활성화되어 있어요')
      /*
      const result = await sendSchoolEmailOtp(user, trimmed)
      setDevCode(result.devCode ?? null)
      setCode('')
      setStep('code')
      setCooldown(Math.ceil(SCHOOL_OTP_COOLDOWN_MS / 1000))
      */
    } catch (err) {
      onError(getErrorMessage(err, '인증 메일 전송에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (!user) return
    setBusy(true)
    try {
      // 임시: 파이어베이스 학교 이메일 확인 비활성화
      throw new Error('Firebase가 일시적으로 비활성화되어 있어요')
      /*
      const result = await confirmSchoolEmailOtp(user, code)
      onVerified(result.schoolName)
      */
    } catch (err) {
      onError(getErrorMessage(err, '인증에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <VerifySheet title='학교 이메일 인증' onClose={onClose}>
      {step === 'email' ? (
        <>
          <p className='text-xs leading-relaxed text-[var(--muted-foreground)]'>
            학교 이메일로 6자리 코드를 보내 드려요. (.edu)
          </p>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='name@school.edu'
            className='mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[#F64310]/50'
            autoComplete='email'
          />
          <button
            type='button'
            disabled={busy || !email.trim()}
            onClick={() => void handleSend()}
            className='mt-3 flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white disabled:opacity-50'
          >
            {busy ? '전송 중…' : '인증 코드 받기'}
          </button>
        </>
      ) : (
        <>
          <p className='text-center text-xs leading-relaxed text-[var(--muted-foreground)]'>
            <span className='font-medium text-[var(--foreground)]'>{email}</span>
            <br />
            으로 보낸 6자리 코드를 입력해 주세요
          </p>

          {devCode && (
            <p className='mt-3 rounded-xl border border-dashed border-[#F64310]/35 bg-[#F64310]/[0.06] px-3 py-2 text-center text-[11px] leading-relaxed text-[var(--foreground)]'>
              개발용 코드 (메일 템플릿 미설정 또는 테스트 모드)
              <span className='mt-1 block font-mono text-lg font-bold tracking-[0.35em] text-[#F64310]'>
                {devCode}
              </span>
            </p>
          )}

          <div className='mt-4'>
            <OtpDigitInputs
              value={code}
              onChange={setCode}
              disabled={busy}
            />
          </div>

          <button
            type='button'
            disabled={busy || code.length !== 6}
            onClick={() => void handleConfirm()}
            className='mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white disabled:opacity-50'
          >
            {busy ? '확인 중…' : '인증 완료'}
          </button>
          <button
            type='button'
            disabled={busy || cooldown > 0}
            onClick={() => void handleSend()}
            className='mt-2 w-full py-2 text-xs font-medium text-[#F64310] disabled:text-[var(--muted)]'
          >
            {cooldown > 0 ? `재전송 ${cooldown}s` : '코드 다시 받기'}
          </button>
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
      throw new Error('Firebase가 일시적으로 비활성화되어 있어요')
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
      throw new Error('Firebase가 일시적으로 비활성화되어 있어요')
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
          <p className='text-xs leading-relaxed text-[var(--muted-foreground)]'>
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
            className='mt-3 h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[#F64310]/50'
            autoComplete='tel'
          />
          <button
            type='button'
            disabled={busy || !phone.trim()}
            onClick={() => void handleSend()}
            className='mt-3 flex h-10 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white disabled:opacity-50'
          >
            {busy ? '전송 중…' : '인증 문자 받기'}
          </button>
        </>
      ) : (
        <>
          <p className='text-xs leading-relaxed text-[var(--muted-foreground)]'>
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
            className='mt-3 h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-center text-base tracking-[0.3em] outline-none focus:border-[#F64310]/50'
            autoComplete='one-time-code'
          />
          <button
            type='button'
            disabled={busy || code.length < 4}
            onClick={() => void handleConfirm()}
            className='mt-3 flex h-10 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white disabled:opacity-50'
          >
            {busy ? '확인 중…' : '인증 완료'}
          </button>
          <button
            type='button'
            disabled={busy || cooldown > 0}
            onClick={() => void handleSend()}
            className='mt-2 w-full py-2 text-xs font-medium text-[#F64310] disabled:text-[var(--muted)]'
          >
            {cooldown > 0 ? `재전송 ${cooldown}s` : '문자 다시 받기'}
          </button>
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
    <BottomSheet open onClose={onClose} title={title}>
      <div className='px-3 pb-2 pt-1'>{children}</div>
    </BottomSheet>
  )
}
