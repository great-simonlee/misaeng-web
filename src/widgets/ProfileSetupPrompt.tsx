'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { emailLocalNickname, sanitizeCommunityNickname } from '@lib/community/author'
import { cityPath, getCityFromPathname } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'

/**
 * Members who signed up without a profile (no nickname / name / gender — e.g. they closed the setup sheet right after
 * sign-up): ask once per browser session, on any page, to finish it (owner 11-23). "지금 설정하기" opens the existing
 * setup sheet on My page (/me?setup=1) and comes back here; "나중에" hides it until the next visit. Misaeng only.
 */
const SEEN_KEY = 'misaeng.profilePromptSeen'

export function ProfileSetupPrompt() {
  const t = useT('common')
  const pathname = usePathname() || ''
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [open, setOpen] = useState(false)

  const incomplete = Boolean(
    profile &&
      profile.status !== 'suspended' &&
      (!sanitizeCommunityNickname(profile.nickname, user?.email) || !profile.firstName?.trim() || !profile.gender?.trim()),
  )
  // My page has the sheet itself; sign-in screens come first
  const quietHere = /\/(me|login)(\/|$)/.test(pathname)

  useEffect(() => {
    if (loading || !user || !incomplete || quietHere) return
    let seen = false
    try {
      seen = sessionStorage.getItem(`${SEEN_KEY}:${user.uid}`) === '1'
    } catch {}
    if (seen) return
    const timer = window.setTimeout(() => setOpen(true), 800)
    return () => window.clearTimeout(timer)
  }, [loading, user, incomplete, quietHere])

  function close() {
    setOpen(false)
    try {
      if (user) sessionStorage.setItem(`${SEEN_KEY}:${user.uid}`, '1')
    } catch {}
  }

  if (!open || !user) return null
  const temp = sanitizeCommunityNickname(profile?.nickname, user.email) ? null : emailLocalNickname(user.email)
  const next = pathname + (typeof window !== 'undefined' ? window.location.search : '')

  return (
    <div className='fixed inset-0 z-[10040] flex items-end justify-center bg-black/40 sm:items-center sm:p-6' onClick={close}>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='profile-prompt-title'
        onClick={(e) => e.stopPropagation()}
        className='w-full max-w-[420px] rounded-t-[1.75rem] bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-7 shadow-2xl sm:rounded-[1.75rem] sm:pb-6'
      >
        <span className='flex size-12 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[var(--brand)]'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-6' aria-hidden>
            <circle cx='12' cy='8' r='4' />
            <path strokeLinecap='round' d='M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5' />
          </svg>
        </span>
        <h2 id='profile-prompt-title' className='mt-4 text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--foreground)]'>
          {t('profilePrompt.title')}
        </h2>
        <p className='mt-2 text-[14.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('profilePrompt.body')}</p>
        {temp ? (
          <p className='mt-3 rounded-xl bg-[#f5f6f8] px-3.5 py-2.5 text-[13px] text-[var(--muted-foreground)]'>
            {t('profilePrompt.current', { name: temp })}
          </p>
        ) : null}
        <div className='mt-6 flex gap-2.5'>
          <button type='button' onClick={close} className='h-12 rounded-full bg-[#F4F5F7] px-5 text-[15px] font-semibold text-[var(--foreground)]'>
            {t('profilePrompt.later')}
          </button>
          <button
            type='button'
            onClick={() => {
              close()
              router.push(`${cityPath(getCityFromPathname(pathname), '/me')}?setup=1&next=${encodeURIComponent(next)}`)
            }}
            className='h-12 flex-1 rounded-full bg-[var(--brand)] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)]'
          >
            {t('profilePrompt.setup')}
          </button>
        </div>
      </div>
    </div>
  )
}
