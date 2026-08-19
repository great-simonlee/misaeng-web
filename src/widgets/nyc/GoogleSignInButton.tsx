'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  decodeGoogleCredential,
  getGoogleClientId,
  isGoogleSignInConfigured,
} from '@lib/google/config'

interface GoogleSignInButtonProps {
  disabled?: boolean
  onCredential: (credential: {
    idToken: string
    email: string | null
    name: string | null
  }) => void
  onError: (message: string) => void
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let gisScriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google 로그인은 브라우저에서만 사용할 수 있어요.'),
    )
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (gisScriptPromise) {
    return gisScriptPromise
  }

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Google 로그인 스크립트를 불러오지 못했어요.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Google 로그인 스크립트를 불러오지 못했어요.'))
    document.head.appendChild(script)
  })

  return gisScriptPromise
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

function GoogleSignInInner({
  disabled,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const clientId = getGoogleClientId()
  const containerRef = useRef<HTMLDivElement>(null)
  const googleRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [buttonWidth, setButtonWidth] = useState(0)

  const handleCredential = useCallback(
    (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        onError('Google 로그인에 실패했어요.')
        return
      }

      setSubmitting(true)
      try {
        const { email, name } = decodeGoogleCredential(response.credential)
        onCredential({
          idToken: response.credential,
          email,
          name,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [onCredential, onError],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function measure() {
      const width = Math.floor(container!.getBoundingClientRect().width)
      if (width > 0) {
        setButtonWidth(width)
      }
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!clientId || !googleRef.current || buttonWidth <= 0) return

    let cancelled = false
    const googleRoot = googleRef.current

    void loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleRoot) {
          return
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          ux_mode: 'popup',
          auto_select: false,
        })

        googleRoot.innerHTML = ''
        window.google.accounts.id.renderButton(googleRoot, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: buttonWidth,
        })

        setReady(true)
      })
      .catch((error) => {
        if (!cancelled) {
          onError(
            error instanceof Error
              ? error.message
              : 'Google 로그인을 준비하지 못했어요.',
          )
        }
      })

    return () => {
      cancelled = true
      setReady(false)
    }
  }, [buttonWidth, clientId, handleCredential, onError])

  const isDisabled = disabled || submitting || !ready
  const label = submitting
    ? 'Google 계정 연결 중…'
    : !ready
      ? 'Google 로그인 준비 중…'
      : 'Google로 계속하기'

  return (
    <div ref={containerRef} className='relative w-full min-h-[48px]'>
      <div
        aria-hidden
        className={`pointer-events-none flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-[#dde2ea] bg-white px-4 text-[15px] font-medium text-[#344054] transition ${
          isDisabled ? 'opacity-50' : ''
        }`}
      >
        <GoogleLogo />
        {label}
      </div>

      <div
        ref={googleRef}
        aria-label='Google로 계속하기'
        className={`absolute inset-0 z-10 overflow-hidden rounded-full [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full ${
          isDisabled
            ? 'pointer-events-none invisible'
            : 'cursor-pointer opacity-[0.001]'
        }`}
      />
    </div>
  )
}

export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  if (!isGoogleSignInConfigured()) {
    return (
      <p className='rounded-full border border-[#dde2ea] bg-[#f9fafb] px-4 py-3 text-center text-[13px] font-normal leading-relaxed text-[#667085]'>
        Google 로그인 설정이 필요해요.{' '}
        <code className='font-mono text-[11px]'>
          NEXT_PUBLIC_GOOGLE_CLIENT_ID
        </code>
        를 확인해 주세요.
      </p>
    )
  }

  return <GoogleSignInInner {...props} />
}
