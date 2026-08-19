'use client'

import { signInWithPopup } from 'firebase/auth'
import { useState } from 'react'

import {
  createEllieoGoogleProvider,
  getEllieoFirebaseAuth,
  isEllieoFirebaseConfigured,
} from '@lib/ellieo/firebaseAuth'

interface GoogleSignInButtonProps {
  disabled?: boolean
  onCredential: (credential: {
    idToken: string
    email: string | null
    name: string | null
  }) => void
  onError: (message: string) => void
}

function GoogleLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 24 24' className='h-5 w-5 shrink-0'>
      <path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
      />
      <path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      />
      <path
        fill='#FBBC05'
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
      />
      <path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      />
    </svg>
  )
}

export function GoogleSignInButton({
  disabled,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    if (disabled || submitting) return

    if (!isEllieoFirebaseConfigured()) {
      onError('Firebase Google 로그인 설정이 필요해요.')
      return
    }

    setSubmitting(true)
    try {
      const auth = getEllieoFirebaseAuth()
      const result = await signInWithPopup(auth, createEllieoGoogleProvider())
      const idToken = await result.user.getIdToken(true)

      onCredential({
        idToken,
        email: result.user.email,
        name: result.user.displayName,
      })
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : ''

      if (code === 'auth/popup-closed-by-user') {
        return
      }

      onError(
        error instanceof Error
          ? error.message
          : 'Google 로그인에 실패했어요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!isEllieoFirebaseConfigured()) {
    return (
      <p className='rounded-full border border-[#dde2ea] bg-[#f9fafb] px-4 py-3 text-center text-[13px] font-normal text-[#667085]'>
        Firebase Google 로그인 설정이 필요해요.
      </p>
    )
  }

  return (
    <button
      type='button'
      onClick={() => void handleClick()}
      disabled={disabled || submitting}
      className='flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-[#dde2ea] bg-white px-4 text-[15px] font-medium text-[#344054] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50'
    >
      <GoogleLogo />
      {submitting ? 'Google 계정 연결 중…' : 'Google로 계속하기'}
    </button>
  )
}
