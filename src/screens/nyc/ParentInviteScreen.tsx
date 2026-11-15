'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { MisaengStoreButtons } from '@widgets/nyc/MisaengStoreButtons'
import { PARENT_APP_READY } from '@lib/parents/constants'

type PublicInvite = {
  code: string
  status: 'valid' | 'used' | 'expired' | 'revoked'
  inviterName: string | null
  city: string
}

/**
 * 학부모 초대 랜딩 (1.0.7): "○○님이 미생에 초대했어요" + 앱 다운로드 + 웹으로 가입.
 * 가입(또는 로그인)하고 돌아오면 "초대한 학생 계정과 연결되며, 부정 사용이 확인되면 두 계정 모두 제재될 수 있어요"를
 * 확인하고 학부모 계정으로 연결한다 (POST /api/parent-invites/{code}/accept).
 */
export function ParentInviteScreen({ code }: { code: string }) {
  const t = useT('me.parentLanding')
  const tCommon = useT('common')
  const { user, profile, loading, refreshSession } = useAuth()
  const { error: toastError } = useToast()
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const [invite, setInvite] = useState<PublicInvite | null>(null)
  const [missing, setMissing] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linked, setLinked] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/parent-invites/${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { invite?: PublicInvite } | null
        if (cancelled) return
        if (!res.ok || !data?.invite) setMissing(true)
        else setInvite(data.invite)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const selfPath = href(`/invite/parent/${code}`)
  const signupHref = `${cityLoginPath(city, selfPath)}&mode=signup`
  const loginHref = cityLoginPath(city, selfPath)
  const alreadyParent = profile?.accountType === 'parent'

  async function accept() {
    setLinking(true)
    try {
      const res = await fetch(`/api/parent-invites/${encodeURIComponent(code)}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error || t('linkFailed'))
      await refreshSession()
      setLinked(true)
    } catch (err) {
      toastError(getErrorMessage(err, t('linkFailed')))
    } finally {
      setLinking(false)
    }
  }

  if (!invite && !missing) return <LoadingState fullPage />

  const name = invite?.inviterName || t('someone')
  const usable = invite?.status === 'valid'

  return (
    <BoardPageShell width='narrow'>
      <div className='mx-auto max-w-md px-4 pb-16 pt-10 text-center'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]'>{t('eyebrow')}</p>
        <h1 className='mt-3 text-[1.45rem] font-semibold leading-snug tracking-tight text-[var(--foreground)]'>
          {missing ? t('notFoundTitle') : t('title', { name })}
        </h1>
        <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          {missing
            ? t('notFoundBody')
            : !usable
              ? t(`status.${invite?.status ?? 'used'}`)
              : t('body')}
        </p>

        {!missing && usable ? (
          <ul className='mt-6 space-y-2 rounded-2xl bg-white px-5 py-4 text-left text-[13px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-black/[0.06]'>
            <li>· {t('point1')}</li>
            <li>· {t('point2')}</li>
            <li>· {t('point3')}</li>
          </ul>
        ) : null}

        {linked || (alreadyParent && user) ? (
          <div className='mt-8 space-y-3'>
            <p className='rounded-2xl bg-emerald-50 px-4 py-3.5 text-[14px] font-semibold text-emerald-800'>
              {t('linked', { name })}
            </p>
            <button
              type='button'
              onClick={() => router.push(href('/anonymous'))}
              className='flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white'
            >
              {t('toAnonymous')}
            </button>
          </div>
        ) : !missing && usable ? (
          <div className='mt-8 space-y-3'>
            {loading ? null : user ? (
              <>
                <label className='flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3.5 text-left ring-1 ring-black/10'>
                  <input
                    type='checkbox'
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className='mt-0.5 size-5 shrink-0 accent-[var(--brand)]'
                  />
                  <span className='text-[13px] font-medium leading-snug text-[var(--foreground)]'>{t('agreement')}</span>
                </label>
                <button
                  type='button'
                  disabled={!agreed || linking}
                  onClick={() => void accept()}
                  className='flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white disabled:opacity-40'
                >
                  {linking ? t('linking') : t('linkButton')}
                </button>
                <p className='text-[12px] text-[var(--muted)]'>{t('signedInAs', { email: user.email ?? '' })}</p>
              </>
            ) : (
              <>
                <p className='rounded-2xl bg-[#f7f8fa] px-4 py-3 text-left text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
                  {t('agreement')}
                </p>
                <Link
                  href={signupHref}
                  className='flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white'
                >
                  {t('signupWeb')}
                </Link>
                <Link href={loginHref} className='block text-[13px] font-medium text-[var(--muted)] underline-offset-2 hover:underline'>
                  {t('haveAccount')}
                </Link>
              </>
            )}
            {/* Store buttons only once the parent-aware app (1.0.7) is live: 1.0.6 blocks parent accounts */}
            {PARENT_APP_READY ? (
              <div className='pt-4'>
                <p className='mb-2 text-[12px] font-medium text-[var(--muted)]'>{t('orApp')}</p>
                <MisaengStoreButtons
                  appStoreLabel={tCommon('appHandoff.appStore')}
                  googlePlayLabel={tCommon('appHandoff.googlePlay')}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <Link
            href={href()}
            className='mt-8 inline-flex h-11 items-center rounded-full bg-[var(--foreground)] px-6 text-[14px] font-semibold text-white'
          >
            {t('toHome')}
          </Link>
        )}
      </div>
    </BoardPageShell>
  )
}
