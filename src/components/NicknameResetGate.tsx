'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { NicknameAvailabilityHint } from '@components/NicknameAvailabilityHint'
import { useAuth } from '@hooks/useAuth'
import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import { useNicknameAvailability } from '@hooks/useNicknameAvailability'
import { useToast } from '@hooks/useToast'
import { isCityId } from '@lib/constants/cities'
import {
  getNicknameValidationIssue,
  MAX_NICKNAME_LEN,
  nicknameNeedsReset,
  sanitizeNicknameInput,
} from '@lib/constants/profile'
import { useT } from '@lib/i18n/client'

/** Legal pages and login stay reachable, like ReconsentGate. */
function isPassthroughPath(pathname: string) {
  if (pathname === '/terms' || pathname === '/privacy') return true
  const [maybeCity, ...rest] = pathname.split('/').filter(Boolean)
  if (!isCityId(maybeCity)) return false
  const suffix = rest[0] ?? ''
  return suffix === 'login' || suffix === 'terms-of-use' || suffix === 'privacy-policy'
}

/**
 * Nicknames are English letters and "." only since 2026-11-25 (shared by Misaeng and Ellieo). A signed-in member
 * whose saved nickname breaks the rule (e.g. Hangul) must pick a new one before going on — no close button.
 * Logging out is the only other way out; the modal comes back on the next sign-in.
 */
export function NicknameResetGate() {
  const pathname = usePathname()
  const { user, profile, loading, sessionLoading } = useAuth()
  const current = profile?.nickname ?? null
  const open =
    !loading && !sessionLoading && Boolean(user && profile) && nicknameNeedsReset(current) && !isPassthroughPath(pathname)

  if (!open) return null
  return <NicknameResetModal currentNickname={current || ''} />
}

function NicknameResetModal({ currentNickname }: { currentNickname: string }) {
  const t = useT('me')
  const { saveNickname, logout } = useAuth()
  const { success } = useToast()
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useBodyScrollLock(true)

  const trimmed = draft.trim()
  const issue = trimmed ? getNicknameValidationIssue(trimmed) : null
  const issueText = issue
    ? t(`nickname.errors.${issue.code}`, {
        min: 'min' in issue ? issue.min : undefined,
        max: 'max' in issue ? issue.max : undefined,
      })
    : null
  const availability = useNicknameAvailability(trimmed, { enabled: Boolean(trimmed) && !issue })
  const canSave = Boolean(trimmed) && !issue && availability.status === 'available' && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await saveNickname(trimmed)
      success(t('nickname.reset.saved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('nickname.checkFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className='fixed inset-0 z-[10040] flex items-end justify-center overscroll-none bg-black/55 p-4 sm:items-center'
      role='dialog'
      aria-modal='true'
      aria-labelledby='nickname-reset-title'
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.stopPropagation()
      }}
    >
      <div className='absolute inset-0 touch-none' aria-hidden onClick={(e) => e.stopPropagation()} />
      <form
        className='relative w-full max-w-[420px] rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6'
        onSubmit={(e) => {
          e.preventDefault()
          void handleSave()
        }}
      >
        <span
          className='flex size-11 items-center justify-center rounded-[14px] bg-brand/10 text-brand'
          aria-hidden
        >
          <svg viewBox='0 0 24 24' className='size-[22px]' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round'>
            <path d='M12 20h9' />
            <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' />
          </svg>
        </span>
        <h2 id='nickname-reset-title' className='mt-4 text-[1.3rem] font-bold tracking-[-0.02em] text-[var(--foreground)]'>
          {t('nickname.reset.title')}
        </h2>
        <p className='mt-2 text-[14px] leading-[1.6] text-[var(--muted-foreground)]'>
          {t('nickname.reset.body', { nickname: currentNickname })}
        </p>

        <label htmlFor='nickname-reset-input' className='mt-5 block text-[13px] font-semibold text-[var(--foreground)]'>
          {t('nickname.reset.label')}
        </label>
        <div className='mt-1.5 flex min-h-[50px] items-center gap-1 rounded-2xl border border-[var(--border)] px-3.5 focus-within:border-brand'>
          <span className='text-[15px] text-[var(--muted)]' aria-hidden>
            @
          </span>
          <input
            id='nickname-reset-input'
            value={draft}
            onChange={(e) => {
              setDraft(sanitizeNicknameInput(e.target.value))
              setError(null)
            }}
            placeholder={t('nickname.reset.placeholder')}
            autoComplete='off'
            autoCapitalize='none'
            autoCorrect='off'
            spellCheck={false}
            maxLength={MAX_NICKNAME_LEN}
            autoFocus
            className='min-w-0 flex-1 bg-transparent text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]'
          />
          <span className='text-[12px] tabular-nums text-[var(--muted)]'>
            {trimmed.length}/{MAX_NICKNAME_LEN}
          </span>
        </div>
        <div className='mt-1.5 min-h-[18px]'>
          {issueText ? (
            <p className='text-[12px] leading-relaxed text-red-500'>{issueText}</p>
          ) : trimmed ? (
            <NicknameAvailabilityHint availability={availability} />
          ) : (
            <p className='text-[12px] leading-relaxed text-[var(--muted)]'>{t('nickname.ruleHint')}</p>
          )}
          {error ? <p className='mt-1 text-[12px] leading-relaxed text-red-500'>{error}</p> : null}
        </div>

        <button
          type='submit'
          disabled={!canSave}
          className='mt-4 min-h-[52px] w-full rounded-full bg-[linear-gradient(135deg,var(--brand-bright)_0%,var(--brand)_50%,var(--brand-deep)_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgb(var(--brand-rgb)/0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {saving ? t('nickname.reset.saving') : t('nickname.reset.save')}
        </button>
        <button
          type='button'
          onClick={() => void logout()}
          disabled={saving}
          className='mt-1 min-h-[44px] w-full text-[14px] font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] disabled:opacity-50'
        >
          {t('nickname.reset.logout')}
        </button>
      </form>
    </div>
  )
}
