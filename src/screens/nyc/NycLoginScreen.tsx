'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCityInfo, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { TermsConsentFields } from '@components/consent/TermsConsentFields'
import { useConsentLocale } from '@components/consent/ConsentLocaleProvider'
import {
  DEFAULT_PRIVACY_VERSION,
  DEFAULT_TERMS_VERSION,
} from '@lib/consent/copy'
import type { LegalPolicy } from '@lib/consent/types'
import { AuthConfigBanner } from '@widgets/nyc/AuthConfigBanner'
import { GoogleSignInButton } from '@widgets/nyc/GoogleSignInButton'
import { isAppConnectConfigured } from '@lib/constants/appConnect'
import { BRAND_CONFIG } from '@lib/brand'
import { EllieoAuthNote } from '@widgets/ellieo/EllieoAuthNote'
import { useT } from '@lib/i18n/client'
import { isGoogleSignInConfigured } from '@lib/google/config'
import {
  bindPersistedReferralIfNeeded,
  captureReferralFromLocation,
  persistReferralCode,
  REFERRAL_QUERY_KEY,
} from '@lib/community/referral'

const inputClass =
  'mt-2 min-h-[48px] w-full rounded-xl border border-[#dde2ea] bg-white px-3.5 text-[15px] font-normal text-[var(--foreground)] outline-none transition placeholder:text-[#98a2b3] focus:border-brand focus:shadow-[0_0_0_3px_rgb(var(--brand-rgb)/0.12)]'

/** `{terms}`·`{privacy}` 자리에 링크를 끼운다 (언어마다 어순이 달라서 문장을 쪼개지 않는다) */
function renderWithSlots(template: string, slots: Record<string, ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1]
    if (name && name in slots) return <span key={index}>{slots[name]}</span>
    return part
  })
}

export function NycLoginScreen() {
  const t = useT('auth')
  const {
    user,
    loading,
    sessionLoading,
    configured,
    signInEmail,
    signUpEmail,
    verifyEmail,
    resendCode,
    confirmReset,
    signInGoogle,
    resetPassword,
  } = useAuth()
  const { success, error: toastError } = useToast()
  const href = useCityPath()
  const cityInfo = useCityInfo()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || href()
  // 새로 가입하면 프로필(선호 언어 포함)부터 입력하도록 마이페이지 설정 시트로 보낸다
  const afterSignup = `${href('/me')}?setup=1&next=${encodeURIComponent(next)}`
  const signedUpRef = useRef(false)

  const { locale } = useConsentLocale()
  // verify: the code emailed after sign-up · resetCode: the reset code + a new password (Misaeng's own login)
  // `?mode=signup` (Ellieo header "Join") opens the sign-up tab directly
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'verify' | 'resetCode'>(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [resending, setResending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)
  const [policy, setPolicy] = useState<LegalPolicy | null>(null)
  const authReady = useMemo(
    () => isAppConnectConfigured() && isGoogleSignInConfigured(),
    [],
  )
  const canUseGoogle = useMemo(
    () => (configured || isAppConnectConfigured()) && isGoogleSignInConfigured(),
    [configured],
  )
  const needsTermsAcceptance = mode === 'signup'
  const canSubmitAuth = !needsTermsAcceptance || acceptedTerms

  const consentPayload = useMemo(
    () => ({
      acceptedTerms,
      termsVersion: policy?.termsVersion || DEFAULT_TERMS_VERSION,
      privacyVersion: policy?.privacyVersion || DEFAULT_PRIVACY_VERSION,
      uiLanguage: locale,
    }),
    [acceptedTerms, locale, policy?.privacyVersion, policy?.termsVersion],
  )

  const changeMode = useCallback((nextMode: 'signin' | 'signup' | 'reset' | 'verify' | 'resetCode') => {
    setMode(nextMode)
    setCode('')
    if (nextMode !== 'signup') {
      setAcceptedTerms(false)
      setShowTermsError(false)
    }
  }, [])

  useEffect(() => {
    captureReferralFromLocation()
    const ref = searchParams.get(REFERRAL_QUERY_KEY)
    if (ref) persistReferralCode(ref)
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/legal/policy', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { policy?: LegalPolicy }) => {
        if (!cancelled && data?.policy) setPolicy(data.policy)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loading && !sessionLoading && user && !signedUpRef.current) {
      router.replace(next)
    }
  }, [loading, sessionLoading, user, router, next])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (needsTermsAcceptance && !acceptedTerms) {
      setShowTermsError(true)
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'reset') {
        const { codeSent } = await resetPassword(email.trim())
        if (codeSent) {
          success(t('login.toasts.codeSent'))
          setPassword('')
          setMode('resetCode')
          return
        }
        success(t('login.toasts.resetEmailSent'))
        changeMode('signin')
        return
      }
      if (mode === 'verify') {
        signedUpRef.current = true
        await verifyEmail(email.trim(), code.trim())
        await bindPersistedReferralIfNeeded()
        success(t('login.toasts.signedUp'))
        router.replace(afterSignup)
        return
      }
      if (mode === 'resetCode') {
        await confirmReset(email.trim(), code.trim(), password)
        success(t('login.toasts.signedIn'))
        router.replace(next)
        return
      }
      if (mode === 'signin') {
        await signInEmail(email.trim(), password)
        success(t('login.toasts.signedIn'))
      } else {
        signedUpRef.current = true
        const { verificationRequired } = await signUpEmail(email.trim(), password, consentPayload)
        if (verificationRequired) {
          signedUpRef.current = false
          success(t('login.toasts.codeSent'))
          changeMode('verify')
          return
        }
        await bindPersistedReferralIfNeeded()
        success(t('login.toasts.signedUp'))
      }
      router.replace(mode === 'signup' ? afterSignup : next)
    } catch (err) {
      signedUpRef.current = false
      // signed up earlier but never entered the code: send a fresh one and ask for it
      if (mode === 'signin' && (err as { code?: string | null })?.code === 'auth.emailNotConfirmed') {
        await resendCode(email.trim()).catch(() => null)
        changeMode('verify')
      }
      toastError(
        getErrorMessage(
          err,
          mode === 'reset'
            ? t('login.errors.resetEmailFailed')
            : t('login.errors.authFailed'),
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
      if (mode === 'signup' && !acceptedTerms) {
        setShowTermsError(true)
        return
      }
      setSubmitting(true)
      if (mode === 'signup') signedUpRef.current = true
      try {
        await signInGoogle({
          ...credential,
          consent: mode === 'signup' ? consentPayload : undefined,
        })
        if (mode === 'signup') {
          await bindPersistedReferralIfNeeded()
        }
        success(
          mode === 'signup'
            ? t('login.toasts.signedUp')
            : t('login.toasts.signedIn'),
        )
        router.replace(mode === 'signup' ? afterSignup : next)
      } catch (err) {
        signedUpRef.current = false
        toastError(getErrorMessage(err, t('errors.googleLoginFailed')))
      } finally {
        setSubmitting(false)
      }
    },
    [
      acceptedTerms,
      afterSignup,
      consentPayload,
      mode,
      next,
      router,
      signInGoogle,
      success,
      t,
      toastError,
    ],
  )

  const handleGoogleError = useCallback(
    (message: string) => {
      toastError(message)
    },
    [toastError],
  )

  async function handleResend() {
    setResending(true)
    try {
      if (mode === 'resetCode') await resetPassword(email.trim())
      else await resendCode(email.trim())
      success(t('login.toasts.codeResent'))
    } catch (err) {
      toastError(getErrorMessage(err, t('login.errors.authFailed')))
    } finally {
      setResending(false)
    }
  }

  const isCodeMode = mode === 'verify' || mode === 'resetCode'
  // the reset and code steps hide the tabs and Google (email-only steps)
  const isResetMode = mode === 'reset' || isCodeMode
  const title =
    mode === 'verify'
      ? t('login.verifyTitle')
      : mode === 'resetCode'
        ? t('login.resetCodeTitle')
        : mode === 'reset'
          ? t('login.resetTitle')
          : mode === 'signup'
            ? t('login.signUpTitle')
            : t('login.signInTitle')
  const description =
    mode === 'verify'
      ? t('login.verifyDescription', { email: email.trim() })
      : mode === 'resetCode'
        ? t('login.resetCodeDescription', { email: email.trim() })
        : mode === 'reset'
          ? t('login.resetDescription')
          : mode === 'signup'
            ? t('login.signUpDescription')
            : t('login.signInDescription')

  const submitLabel = submitting
    ? t('login.submitting')
    : mode === 'signin'
      ? t('login.submitSignIn')
      : mode === 'signup'
        ? t('login.submitSignUp')
        : mode === 'verify'
          ? t('login.submitVerify')
          : mode === 'resetCode'
            ? t('login.submitResetCode')
            : t('login.submitReset')

  return (
    <div data-ui='auth-page' className='relative min-h-[100dvh] bg-[linear-gradient(180deg,#eef1f6_0%,#e8edf4_42%,#f4f6fa_100%)]'>
      <div data-ui='auth-decor' className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden>
        <div className='absolute -left-20 -top-28 h-72 w-72 rounded-full bg-brand/20 blur-3xl' />
        <div className='absolute right-[-72px] top-[14%] h-80 w-80 rounded-full bg-brand-bright/22 blur-3xl' />
      </div>

      <div className='relative mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center px-4 py-8 sm:px-6 sm:py-10'>
        <div data-ui='auth-card' className='rounded-[1.5rem] border border-white/80 bg-white/92 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_48px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:p-6'>
          <header>
            <p data-ui='auth-eyebrow' className='text-[11px] font-medium tracking-[0.22em] text-[#8b95a7]'>
              {t('login.eyebrow', { brand: BRAND_CONFIG.name.toUpperCase() })}
            </p>
            <h1 className='mt-1.5 text-[1.5rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--foreground)]'>
              {title}
            </h1>
            <p className='mt-1.5 text-[13px] leading-relaxed text-[#667085]'>
              {description}
            </p>
          </header>

          {!isResetMode && (
            <div
              data-ui='auth-tabs'
              className='mt-5 rounded-full bg-[#edf0f5] p-1'
              role='tablist'
              aria-label={t('login.modeTabsAria')}
            >
              <div className='grid grid-cols-2 gap-1'>
                <button
                  type='button'
                  role='tab'
                  aria-selected={mode === 'signin'}
                  onClick={() => changeMode('signin')}
                  className={`min-h-[40px] rounded-full text-[14px] transition ${
                    mode === 'signin'
                      ? 'bg-white font-semibold text-[var(--foreground)] shadow-[0_2px_8px_rgba(15,23,42,0.07)]'
                      : 'font-medium text-[#8b95a7] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t('login.signInTab')}
                </button>
                <button
                  type='button'
                  role='tab'
                  aria-selected={mode === 'signup'}
                  onClick={() => changeMode('signup')}
                  className={`min-h-[40px] rounded-full text-[14px] transition ${
                    mode === 'signup'
                      ? 'bg-white font-semibold text-[var(--foreground)] shadow-[0_2px_8px_rgba(15,23,42,0.07)]'
                      : 'font-medium text-[#8b95a7] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t('login.signUpTab')}
                </button>
              </div>
            </div>
          )}

          {!authReady && process.env.NODE_ENV !== 'production' && (
            <div className='mt-4'>
              <AuthConfigBanner />
            </div>
          )}

          {mode === 'signup' && (
            <div className='mt-5'>
              <TermsConsentFields
                checked={acceptedTerms}
                onChange={(nextChecked) => {
                  setAcceptedTerms(nextChecked)
                  if (nextChecked) setShowTermsError(false)
                }}
                error={showTermsError}
              />
            </div>
          )}

          {!isResetMode && (
            <div className={mode === 'signup' ? 'mt-4 space-y-3' : 'mt-5 space-y-3'}>
              <GoogleSignInButton
                disabled={submitting || !canUseGoogle || !canSubmitAuth}
                onCredential={(credential) =>
                  void handleGoogleCredential(credential)
                }
                onError={handleGoogleError}
              />

              <div className='flex items-center gap-3 pt-1'>
                <span className='h-px flex-1 bg-[#e4e7ec]' />
                <span className='text-[12px] font-medium text-[#98a2b3]'>
                  {t('login.orWithEmail')}
                </span>
                <span className='h-px flex-1 bg-[#e4e7ec]' />
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={isResetMode ? 'mt-5 space-y-4' : 'mt-4 space-y-4'}
          >
            <div className='space-y-3'>
              <label className='block'>
                <span className='text-[13px] font-medium text-[#344054]'>
                  {t('login.emailLabel')}
                </span>
                <input
                  required
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete='email'
                  placeholder='you@example.com'
                  readOnly={isCodeMode}
                />
              </label>

              {isCodeMode && (
                <label className='block'>
                  <span className='text-[13px] font-medium text-[#344054]'>
                    {t('login.codeLabel')}
                  </span>
                  <input
                    required
                    inputMode='numeric'
                    pattern='[0-9]{6}'
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`${inputClass} text-center text-[20px] font-semibold tracking-[0.4em]`}
                    autoComplete='one-time-code'
                    placeholder='123456'
                    autoFocus
                  />
                </label>
              )}

              {mode === 'resetCode' && (
                <label className='block'>
                  <span className='text-[13px] font-medium text-[#344054]'>
                    {t('login.newPasswordLabel')}
                  </span>
                  <input
                    required
                    type='password'
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    autoComplete='new-password'
                    placeholder={t('login.passwordPlaceholder')}
                  />
                </label>
              )}

              {!isResetMode && (
                <label className='block'>
                  <span className='text-[13px] font-medium text-[#344054]'>
                    {t('login.passwordLabel')}
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
                    placeholder={t('login.passwordPlaceholder')}
                  />
                </label>
              )}
            </div>

            {mode === 'signin' && (
              <div className='-mt-1 flex items-center justify-between gap-3'>
                <p className='min-w-0 text-[11px] leading-snug text-[#98a2b3]'>
                  {renderWithSlots(t('login.agreeNotice'), {
                    terms: (
                      <Link
                        href={href('/terms-of-use')}
                        className='underline-offset-2 hover:text-brand hover:underline'
                      >
                        {t('login.agreeTerms')}
                      </Link>
                    ),
                    privacy: (
                      <Link
                        href={href('/privacy-policy')}
                        className='underline-offset-2 hover:text-brand hover:underline'
                      >
                        {t('login.agreePrivacy')}
                      </Link>
                    ),
                  })}
                </p>
                <button
                  type='button'
                  className='shrink-0 text-[13px] font-medium text-[#667085] transition hover:text-brand'
                  onClick={() => changeMode('reset')}
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            )}

            <button
              type='submit'
              data-ui='auth-submit'
              disabled={
                submitting || !isAppConnectConfigured() || !canSubmitAuth
              }
              className='min-h-[48px] w-full rounded-full bg-[linear-gradient(135deg,var(--brand-bright)_0%,var(--brand)_50%,var(--brand-deep)_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgb(var(--brand-rgb)/0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
            >
              {submitLabel}
            </button>

            {isCodeMode && (
              <button
                type='button'
                disabled={resending || submitting}
                onClick={() => void handleResend()}
                className='w-full text-center text-[13px] font-medium text-[#667085] transition hover:text-brand disabled:opacity-50'
              >
                {t('login.resendCode')}
              </button>
            )}
          </form>
        </div>

        {BRAND_CONFIG.theme === 'ellieo' ? <EllieoAuthNote /> : null}

        <footer className='mt-4 space-y-1.5 text-center'>
          <p className='text-[14px] font-normal text-[#667085]'>
            {mode === 'signin' ? (
              <>
                {t('login.footer.newHere')}{' '}
                <button
                  type='button'
                  className='font-semibold text-brand'
                  onClick={() => changeMode('signup')}
                >
                  {t('login.signUpTab')}
                </button>
              </>
            ) : mode === 'signup' ? (
              <>
                {t('login.footer.haveAccount')}{' '}
                <button
                  type='button'
                  className='font-semibold text-brand'
                  onClick={() => changeMode('signin')}
                >
                  {t('login.signInTab')}
                </button>
              </>
            ) : (
              renderWithSlots(t('login.footer.backToSignIn'), {
                action: (
                  <button
                    type='button'
                    className='font-semibold text-brand'
                    onClick={() => changeMode('signin')}
                  >
                    {t('login.footer.backToSignInAction')}
                  </button>
                ),
              })
            )}
          </p>

          <Link
            href={href()}
            className='inline-flex min-h-[36px] items-center text-[13px] font-medium text-[#98a2b3] transition hover:text-brand'
          >
            ← {t('login.backToCity', { city: cityInfo.shortLabel })}
          </Link>
        </footer>
      </div>
    </div>
  )
}
