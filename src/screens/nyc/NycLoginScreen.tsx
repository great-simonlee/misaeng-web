'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { AuthConfigBanner } from '@widgets/nyc/AuthConfigBanner'
import { GoogleSignInButton } from '@widgets/nyc/GoogleSignInButton'
import { isGoogleSignInConfigured } from '@lib/google/config'

const inputClass =
  'mt-2 min-h-[48px] w-full rounded-xl border border-[#dde2ea] bg-white px-3.5 text-[15px] font-normal text-[var(--foreground)] outline-none transition placeholder:text-[#98a2b3] focus:border-[#F64310] focus:shadow-[0_0_0_3px_rgba(246,67,16,0.12)]'

export function NycLoginScreen() {
  const {
    user,
    loading,
    sessionLoading,
    configured,
    signInEmail,
    signUpEmail,
    signInGoogle,
    resetPassword,
  } = useAuth()
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/nyc'

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canUseGoogle = useMemo(
    () => configured && isGoogleSignInConfigured(),
    [configured],
  )

  useEffect(() => {
    if (!loading && !sessionLoading && user) {
      router.replace(next)
    }
  }, [loading, sessionLoading, user, router, next])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'reset') {
        await resetPassword(email.trim())
        success('비밀번호 재설정 메일을 보냈어요')
        setMode('signin')
        return
      }
      if (mode === 'signin') {
        await signInEmail(email.trim(), password)
        success('로그인했어요')
      } else {
        await signUpEmail(email.trim(), password)
        success('회원가입이 완료되었어요')
      }
      router.replace(next)
    } catch (err) {
      toastError(
        getErrorMessage(
          err,
          mode === 'reset'
            ? '재설정 메일을 보내지 못했어요'
            : '인증에 실패했어요',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: {
      idToken: string
      email: string | null
      name: string | null
    }) => {
      setSubmitting(true)
      try {
        await signInGoogle(credential)
        success('로그인했어요')
        router.replace(next)
      } catch (err) {
        toastError(getErrorMessage(err, 'Google 로그인에 실패했어요'))
      } finally {
        setSubmitting(false)
      }
    },
    [next, router, signInGoogle, success, toastError],
  )

  const handleGoogleError = useCallback(
    (message: string) => {
      toastError(message)
    },
    [toastError],
  )

  const isResetMode = mode === 'reset'
  const title = isResetMode
    ? '비밀번호 찾기'
    : mode === 'signup'
      ? '회원가입'
      : '로그인'
  const description = isResetMode
    ? '가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.'
    : '유학생 · 직장인을 위한 New York City 정보 공유 공간이에요.'

  const submitLabel = submitting
    ? '잠시만 기다려 주세요…'
    : mode === 'signin'
      ? '로그인'
      : mode === 'signup'
        ? '회원가입'
        : '재설정 메일 보내기'

  return (
    <div className='relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#eef1f6_0%,#e8edf4_42%,#f4f6fa_100%)]'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -left-20 -top-28 h-72 w-72 rounded-full bg-[#F64310]/20 blur-3xl' />
        <div className='absolute right-[-72px] top-[14%] h-80 w-80 rounded-full bg-[#ff6b3d]/22 blur-3xl' />
        <div className='absolute bottom-[-100px] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#ffb08f]/28 blur-3xl' />
      </div>

      <div className='relative mx-auto max-w-[420px] px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-12'>
        <div className='rounded-[1.5rem] border border-white/80 bg-white/92 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_48px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:p-7'>
          <header className='text-center sm:text-left'>
            <p className='text-[11px] font-medium tracking-[0.22em] text-[#8b95a7]'>
              MISAENG NYC COMMUNITY
            </p>
            <h1 className='mt-2 text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--foreground)] sm:text-[1.75rem]'>
              {title}
            </h1>
            <p className='mt-2 text-[14px] font-normal leading-[1.55] text-[#667085]'>
              {description}
            </p>
          </header>

          {!isResetMode && (
            <div
              className='mt-6 rounded-full bg-[#edf0f5] p-1'
              role='tablist'
              aria-label='인증 모드'
            >
              <div className='grid grid-cols-2 gap-1'>
                <button
                  type='button'
                  role='tab'
                  aria-selected={mode === 'signin'}
                  onClick={() => setMode('signin')}
                  className={`min-h-[40px] rounded-full text-[14px] transition ${
                    mode === 'signin'
                      ? 'bg-white font-semibold text-[var(--foreground)] shadow-[0_2px_8px_rgba(15,23,42,0.07)]'
                      : 'font-medium text-[#8b95a7] hover:text-[var(--foreground)]'
                  }`}
                >
                  로그인
                </button>
                <button
                  type='button'
                  role='tab'
                  aria-selected={mode === 'signup'}
                  onClick={() => setMode('signup')}
                  className={`min-h-[40px] rounded-full text-[14px] transition ${
                    mode === 'signup'
                      ? 'bg-white font-semibold text-[var(--foreground)] shadow-[0_2px_8px_rgba(15,23,42,0.07)]'
                      : 'font-medium text-[#8b95a7] hover:text-[var(--foreground)]'
                  }`}
                >
                  회원가입
                </button>
              </div>
            </div>
          )}

          {!configured && (
            <div className='mt-5'>
              <AuthConfigBanner />
            </div>
          )}

          <form onSubmit={handleSubmit} className='mt-6 space-y-5'>
            <div className='space-y-4'>
              <label className='block'>
                <span className='text-[13px] font-medium text-[#344054]'>
                  이메일
                </span>
                <input
                  required
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete='email'
                  placeholder='you@example.com'
                />
              </label>

              {!isResetMode && (
                <label className='block'>
                  <span className='text-[13px] font-medium text-[#344054]'>
                    비밀번호
                  </span>
                  <input
                    required
                    type='password'
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    placeholder='6자 이상'
                  />
                </label>
              )}
            </div>

            {mode === 'signin' && (
              <div className='-mt-2 flex justify-end'>
                <button
                  type='button'
                  className='text-[13px] font-medium text-[#667085] transition hover:text-[#F64310]'
                  onClick={() => setMode('reset')}
                >
                  비밀번호 찾기
                </button>
              </div>
            )}

            <button
              type='submit'
              disabled={submitting || !configured}
              className='min-h-[48px] w-full rounded-full bg-[linear-gradient(135deg,#ff4c14_0%,#f64310_50%,#df390e_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(246,67,16,0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
            >
              {submitLabel}
            </button>

            {!isResetMode && (
              <>
                <div className='flex items-center gap-3'>
                  <span className='h-px flex-1 bg-[#e4e7ec]' />
                  <span className='text-[12px] font-medium text-[#98a2b3]'>
                    또는
                  </span>
                  <span className='h-px flex-1 bg-[#e4e7ec]' />
                </div>

                <GoogleSignInButton
                  disabled={submitting || !canUseGoogle}
                  onCredential={(credential) =>
                    void handleGoogleCredential(credential)
                  }
                  onError={handleGoogleError}
                />
              </>
            )}
          </form>
        </div>

        <footer className='mt-5 space-y-2 text-center'>
          <p className='text-[14px] font-normal text-[#667085]'>
            {mode === 'signin' ? (
              <>
                처음이신가요?{' '}
                <button
                  type='button'
                  className='font-semibold text-[#F64310]'
                  onClick={() => setMode('signup')}
                >
                  회원가입
                </button>
              </>
            ) : mode === 'signup' ? (
              <>
                이미 계정이 있으신가요?{' '}
                <button
                  type='button'
                  className='font-semibold text-[#F64310]'
                  onClick={() => setMode('signin')}
                >
                  로그인
                </button>
              </>
            ) : (
              <>
                로그인 화면으로{' '}
                <button
                  type='button'
                  className='font-semibold text-[#F64310]'
                  onClick={() => setMode('signin')}
                >
                  돌아가기
                </button>
              </>
            )}
          </p>

          <Link
            href='/nyc'
            className='inline-flex min-h-[40px] items-center text-[13px] font-medium text-[#98a2b3] transition hover:text-[#F64310]'
          >
            ← NYC로 돌아가기
          </Link>
        </footer>
      </div>
    </div>
  )
}
