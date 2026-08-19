'use client'

import { useEffect, useRef, useState } from 'react'

interface GoogleSignInButtonProps {
  clientId: string
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

async function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    )

    if (existing) {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Google 스크립트를 불러오지 못했어요.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Google 스크립트를 불러오지 못했어요.'))
    document.head.appendChild(script)
  })
}

let googleIdentityClientId: string | null = null

export function GoogleSignInButton({
  clientId,
  disabled,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const googleContainerRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const onErrorRef = useRef(onError)
  const [initialized, setInitialized] = useState(false)
  const [buttonWidth, setButtonWidth] = useState(320)

  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const updateWidth = () => {
      const nextWidth = Math.floor(wrapper.getBoundingClientRect().width)
      if (nextWidth > 0) {
        setButtonWidth(nextWidth)
      }
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(wrapper)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!clientId || disabled) return

    let cancelled = false

    ;(async () => {
      try {
        await loadGoogleIdentityScript()
        if (cancelled) return

        if (googleIdentityClientId !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (!response.credential) {
                onErrorRef.current('Google 자격 증명을 받지 못했어요.')
                return
              }

              let email: string | null = null
              let name: string | null = null

              try {
                const payload = JSON.parse(
                  atob(response.credential.split('.')[1] || ''),
                ) as { email?: string; name?: string }
                email = payload.email || null
                name = payload.name || null
              } catch {
                email = null
                name = null
              }

              onCredentialRef.current({
                idToken: response.credential,
                email,
                name,
              })
            },
            ux_mode: 'popup',
            auto_select: false,
          })
          googleIdentityClientId = clientId
        }

        if (!cancelled) setInitialized(true)
      } catch (error) {
        if (!cancelled) {
          setInitialized(false)
          onErrorRef.current(
            error instanceof Error
              ? error.message
              : 'Google 로그인 버튼을 불러오지 못했어요.',
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientId, disabled])

  useEffect(() => {
    if (!initialized || disabled || !googleContainerRef.current) return

    googleContainerRef.current.innerHTML = ''
    window.google.accounts.id.renderButton(googleContainerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: buttonWidth,
    })
  }, [buttonWidth, disabled, initialized])

  if (!clientId) {
    return (
      <p className='rounded-full border border-[#dde2ea] bg-[#f9fafb] px-4 py-3 text-center text-[13px] font-normal text-[#667085]'>
        Google 로그인 설정이 필요해요.
      </p>
    )
  }

  return (
    <div ref={wrapperRef} className='relative w-full'>
      <div
        aria-hidden='true'
        className='pointer-events-none flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-[#dde2ea] bg-white px-4 text-[15px] font-medium text-[#344054]'
      >
        <GoogleLogo />
        {initialized ? 'Google로 계속하기' : 'Google 버튼 불러오는 중…'}
      </div>

      <div
        ref={googleContainerRef}
        aria-label='Google로 계속하기'
        className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden ${
          disabled || !initialized
            ? 'pointer-events-none opacity-0'
            : 'opacity-[0.001]'
        } [&>div]:!h-full [&>div]:!w-full [&>div>div]:!w-full`}
      />
    </div>
  )
}
