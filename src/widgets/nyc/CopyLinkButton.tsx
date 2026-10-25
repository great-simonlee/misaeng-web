'use client'

import { useState } from 'react'

import { useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

type CopyLinkButtonProps = {
  url?: string
  variant?: 'default' | 'icon' | 'ghost' | 'pill'
  className?: string
}

export function CopyLinkButton({
  url,
  variant = 'default',
  className,
}: CopyLinkButtonProps) {
  const { success, error } = useToast()
  const t = useT('common')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const value =
      url ?? (typeof window !== 'undefined' ? window.location.href : '')
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      success(t('ui.copyLink.copiedToast'))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      error(t('ui.copyLink.failedToast'))
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type='button'
        onClick={handleCopy}
        aria-label={copied ? t('ui.copyLink.linkCopied') : t('ui.copyLink.copyLink')}
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-[var(--muted-foreground)] shadow-sm touch-manipulation transition hover:border-black/12 hover:text-[var(--foreground)] active:scale-[0.97]',
          copied && 'border-emerald-200 text-emerald-600',
          className,
        )}
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
      </button>
    )
  }

  if (variant === 'pill') {
    return (
      <button
        type='button'
        onClick={handleCopy}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f4f5f7] px-3 text-[13px] font-medium text-[var(--foreground)] touch-manipulation transition hover:bg-[#eceef1] active:scale-[0.98]',
          copied && 'text-emerald-600',
          className,
        )}
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
        {copied ? t('ui.copyLink.copied') : t('ui.copyLink.share')}
      </button>
    )
  }

  if (variant === 'ghost') {
    return (
      <button
        type='button'
        onClick={handleCopy}
        className={cn(
          'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-medium text-[var(--foreground)] ring-1 ring-black/[0.06] touch-manipulation transition hover:bg-[#fafbfc] active:scale-[0.99]',
          className,
        )}
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
        {copied ? t('ui.copyLink.copied') : t('ui.copyLink.copyLink')}
      </button>
    )
  }

  return (
    <button
      type='button'
      onClick={handleCopy}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/[0.07] bg-[#fafbfc] px-4 text-[13px] font-medium text-[var(--foreground)] touch-manipulation transition hover:border-black/15 hover:bg-white',
        className,
      )}
    >
      {copied ? t('ui.copyLink.linkCopied') : t('ui.copyLink.copyLink')}
    </button>
  )
}

function LinkIcon() {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
      <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M20 6 9 17l-5-5' />
    </svg>
  )
}
