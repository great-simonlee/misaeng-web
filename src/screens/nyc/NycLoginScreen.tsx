'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'

export function NycLoginScreen() {
  const {
    user,
    loading,
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

  useEffect(() => {
    if (!loading && user) {
      router.replace(next)
    }
  }, [loading, user, router, next])

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

  async function handleGoogle() {
    setSubmitting(true)
    try {
      await signInGoogle()
      success('로그인했어요')
      router.replace(next)
    } catch (err) {
      toastError(getErrorMessage(err, 'Google 로그인에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen min-w-0 bg-[var(--background)]'>
      <div className='mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-16'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          NYC 커뮤니티
        </p>
        <h1 className='mt-2.5 text-[1.65rem] font-bold tracking-tight text-[var(--foreground)] sm:mt-3 sm:text-3xl'>
          {mode === 'signin'
            ? '로그인'
            : mode === 'signup'
              ? '회원가입'
              : '비밀번호 찾기'}
        </h1>
        <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)] sm:text-sm'>
          {mode === 'reset'
            ? '가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.'
            : 'Misaeng NYC에서 하우징과 커뮤니티를 한곳에서 만나보세요.'}
        </p>

        {/* 임시: 파이어베이스 배너 비활성화
        {!configured && (
          <div className='mt-6'>
            <FirebaseConfigBanner />
          </div>
        )}
        */}

        <form
          onSubmit={handleSubmit}
          className='mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6'
        >
          <label className='block text-sm font-medium text-[var(--foreground)]'>
            이메일
            <input
              required
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='mt-1.5 min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[#F64310]'
              autoComplete='email'
            />
          </label>
          {mode !== 'reset' && (
            <label className='block text-sm font-medium text-[var(--foreground)]'>
              비밀번호
              <input
                required
                type='password'
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='mt-1.5 min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[#F64310]'
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
              />
            </label>
          )}

          {mode === 'signin' && (
            <p className='-mt-1 text-right'>
              <button
                type='button'
                className='min-h-[44px] text-[13px] font-medium text-[var(--muted)] touch-manipulation hover:text-[#F64310]'
                onClick={() => setMode('reset')}
              >
                비밀번호 찾기
              </button>
            </p>
          )}

          <button
            type='submit'
            disabled={submitting || !configured}
            className='min-h-[48px] w-full rounded-full bg-[#F64310] text-sm font-semibold text-white touch-manipulation transition hover:bg-[#d93a0e] disabled:opacity-50'
          >
            {submitting
              ? '잠시만 기다려 주세요…'
              : mode === 'signin'
                ? '로그인'
                : mode === 'signup'
                  ? '회원가입'
                  : '재설정 메일 보내기'}
          </button>

          {mode !== 'reset' && (
            <button
              type='button'
              disabled={submitting || !configured}
              onClick={() => void handleGoogle()}
              className='min-h-[48px] w-full rounded-full border border-[var(--border)] bg-white text-sm font-semibold text-[var(--foreground)] touch-manipulation transition hover:border-[#F64310]/40 disabled:opacity-50'
            >
              Google로 계속하기
            </button>
          )}
        </form>

        <p className='mt-6 text-center text-[13px] text-[var(--muted-foreground)] sm:text-sm'>
          {mode === 'signin' ? (
            <>
              처음이신가요?{' '}
              <button
                type='button'
                className='min-h-[44px] font-semibold text-[#F64310] touch-manipulation'
                onClick={() => setMode('signup')}
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <button
                type='button'
                className='min-h-[44px] font-semibold text-[#F64310] touch-manipulation'
                onClick={() => setMode('signin')}
              >
                로그인
              </button>
            </>
          )}
        </p>

        <p className='mt-3 text-center sm:mt-4'>
          <Link
            href='/nyc'
            className='inline-flex min-h-[44px] items-center text-[13px] text-[var(--muted)] touch-manipulation hover:text-[#F64310] sm:text-sm'
          >
            ← NYC로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
