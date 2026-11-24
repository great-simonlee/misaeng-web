'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage } from '@hooks/useToast'
import { cn } from '@lib'
import { byBrand } from '@lib/brand/design'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { acceptFamilyRequest, declineFamilyRequest, fetchRequestByToken } from '@lib/family/client'
import { useFormat, useT } from '@lib/i18n/client'

/**
 * /family/accept?token=… — a parent asked by email to link with this child. Shows only the parent's nickname; the child
 * signs in (or signs up) and accepts or declines. Email alone never links. Signed-in children also see the request
 * under My → 부모님 and in the apps.
 */
export function FamilyAcceptScreen() {
  const t = useT('me.familyAccept')
  const fmt = useFormat()
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const { user, loading } = useAuth()
  const token = params.get('token') || ''
  const [request, setRequest] = useState<Awaited<ReturnType<typeof fetchRequestByToken>> | null>(null)
  const [state, setState] = useState<'loading' | 'missing' | 'ready' | 'accepted' | 'declined'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    if (!token) {
      setState('missing')
      return
    }
    fetchRequestByToken(token)
      .then((found) => {
        if (!alive) return
        setRequest(found)
        setState('ready')
      })
      .catch(() => alive && setState('missing'))
    return () => {
      alive = false
    }
  }, [token])

  async function decide(accept: boolean) {
    if (!request) return
    setBusy(true)
    setError('')
    try {
      await (accept ? acceptFamilyRequest(request.id) : declineFamilyRequest(request.id))
      setState(accept ? 'accepted' : 'declined')
    } catch (e) {
      setError(getErrorMessage(e, t('failed')))
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || loading) return <LoadingState fullPage />

  const name = request?.parentNickname || t('parentFallback')
  const loginHref = cityLoginPath(city, `${pathname}?token=${encodeURIComponent(token)}`)

  return (
    <div className={byBrand('relative flex flex-1 flex-col bg-white', 'relative flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]')}>
      <div className={cn('mx-auto flex w-full max-w-md flex-1 flex-col pb-14 pt-10', NYC_PAGE_SHELL_CLASS)}>
        <div className='rounded-[1.5rem] bg-white px-6 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]'>
          {state === 'missing' ? (
            <>
              <h1 className='text-[20px] font-semibold tracking-tight text-[var(--foreground)]'>{t('missingTitle')}</h1>
              <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('missingBody')}</p>
            </>
          ) : state === 'accepted' ? (
            <>
              <h1 className='text-[20px] font-semibold tracking-tight text-[var(--foreground)]'>{t('acceptedTitle', { name })}</h1>
              <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('acceptedBody')}</p>
              <Link href={href('/me/family')} className='mt-5 flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white'>
                {t('openFamily')}
              </Link>
            </>
          ) : state === 'declined' ? (
            <>
              <h1 className='text-[20px] font-semibold tracking-tight text-[var(--foreground)]'>{t('declinedTitle')}</h1>
              <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('declinedBody')}</p>
            </>
          ) : request && request.status !== 'pending' ? (
            <>
              <h1 className='text-[20px] font-semibold tracking-tight text-[var(--foreground)]'>{t(`closed.${request.status === 'accepted' ? 'accepted' : request.status === 'expired' ? 'expired' : 'other'}`)}</h1>
              <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('closedBody')}</p>
            </>
          ) : (
            <>
              <h1 className='text-[20px] font-semibold tracking-tight text-[var(--foreground)]'>{t('title', { name })}</h1>
              <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('body', { name })}</p>
              <ul className='mt-4 space-y-1.5 rounded-2xl bg-[#f4f5f7] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                <li>• {t('sees')}</li>
                <li>• {t('notSees')}</li>
                <li>• {t('unlink')}</li>
              </ul>
              {request ? (
                <p className='mt-3 text-[12px] text-[var(--muted)]'>
                  {t('until', { date: fmt.date(request.expiresAt, { month: 'long', day: 'numeric' }) })}
                </p>
              ) : null}
              {user ? (
                <div className='mt-5 flex gap-2'>
                  <button
                    type='button'
                    disabled={busy}
                    onClick={() => void decide(true)}
                    className='flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white disabled:opacity-50'
                  >
                    {t('accept')}
                  </button>
                  <button
                    type='button'
                    disabled={busy}
                    onClick={() => void decide(false)}
                    className='flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#f4f5f7] text-[14px] font-semibold text-[var(--foreground)] disabled:opacity-50'
                  >
                    {t('decline')}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => router.push(loginHref)}
                    className='mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white'
                  >
                    {t('login')}
                  </button>
                  <p className='mt-2 text-center text-[12px] text-[var(--muted)]'>{t('loginHint')}</p>
                </>
              )}
              {error ? <p className='mt-3 text-center text-[13px] font-semibold text-[#DC2626]'>{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
