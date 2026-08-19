'use client'

import { useState } from 'react'

import { useToast } from '@hooks/useToast'

export function CopyLinkButton({ url }: { url?: string }) {
  const { success, error } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const value =
      url ?? (typeof window !== 'undefined' ? window.location.href : '')
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      success('링크를 복사했어요')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      error('링크 복사에 실패했어요')
    }
  }

  return (
    <button
      type='button'
      onClick={handleCopy}
      className='inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] touch-manipulation transition hover:border-[#F64310]/40 hover:text-[#F64310] sm:w-auto'
    >
      {copied ? '링크 복사됨' : '링크 복사'}
    </button>
  )
}
