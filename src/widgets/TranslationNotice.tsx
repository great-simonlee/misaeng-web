'use client'

import { useMemo, useState, type ReactNode } from 'react'

import { cn } from '@lib'
import { useLocale, useT } from '@lib/i18n/client'
import { localeDisplayName } from '@lib/i18n/locales'
import { restoreOriginal, type ContentI18n, type ContentKind } from '@lib/translations/content'

/**
 * 번역된 글·댓글·매물에 붙는 작은 표시와 "원문 보기" 토글.
 *
 * - 글: `文A 베트남어에서 번역됨 · 원문 보기`
 * - 댓글: `文A 원문 보기` (언어 이름은 아이콘 툴팁)
 * - 번역 전: `文A 번역 준비 중`
 * - 원문 언어로 보는 중이면 아무것도 그리지 않는다
 *
 * 원문은 API가 같이 내려 주므로 누르면 페이지 이동·로딩 없이 그 자리에서 바뀐다.
 */
export function useTranslatedContent<T extends { i18n?: ContentI18n }, I extends T | null>(
  item: I,
  kind: ContentKind,
): { item: I; showingOriginal: boolean; toggle: () => void; lang: string | undefined } {
  const [showingOriginal, setShowingOriginal] = useState(false)
  const i18n = item?.i18n
  const canToggle = Boolean(i18n?.state === 'translated' && i18n.original)
  const shown = useMemo(() => {
    if (!item || !showingOriginal || !canToggle || !i18n?.original) return item
    return restoreOriginal(item as T, kind, i18n.original) as I
  }, [item, showingOriginal, canToggle, i18n, kind])

  // 화면 언어와 다른 글자를 보여 줄 때 lang을 붙여 글꼴·읽기 순서를 맞춘다
  const lang =
    !i18n || i18n.state === 'original'
      ? undefined
      : showingOriginal || i18n.state === 'pending'
        ? i18n.sourceLocale
        : i18n.displayLocale

  return {
    item: shown,
    showingOriginal: canToggle && showingOriginal,
    toggle: () => setShowingOriginal((value) => !value),
    lang,
  }
}

export function TranslationNotice({
  i18n,
  showingOriginal,
  onToggle,
  variant = 'post',
  className,
}: {
  i18n: ContentI18n | undefined
  showingOriginal: boolean
  onToggle: () => void
  variant?: 'post' | 'comment'
  className?: string
}) {
  const t = useT('common.translation')
  const locale = useLocale()
  if (!i18n || i18n.state === 'original') return null

  const language = localeDisplayName(i18n.sourceLocale, locale)
  const icon = <TranslateIcon title={t('translatedFrom', { language })} />
  const wrap = (children: ReactNode) => (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[var(--muted)]',
        variant === 'post' ? 'text-[12px]' : 'text-[11px]',
        className,
      )}
    >
      {children}
    </span>
  )

  if (i18n.state === 'pending') {
    return wrap(
      <>
        {icon}
        <span>{t('pending')}</span>
      </>,
    )
  }

  const toggle = (
    <button
      type='button'
      onClick={onToggle}
      className='touch-manipulation underline-offset-2 transition hover:text-brand hover:underline'
    >
      {showingOriginal ? t('showTranslation') : t('showOriginal')}
    </button>
  )

  if (variant === 'comment') {
    return wrap(
      <>
        {icon}
        {toggle}
      </>,
    )
  }

  return wrap(
    <>
      {icon}
      <span>{showingOriginal ? t('original') : t('translatedFrom', { language })}</span>
      <span aria-hidden>·</span>
      {toggle}
    </>,
  )
}

/** 文A 모양 번역 아이콘 */
function TranslateIcon({ title }: { title: string }) {
  return (
    <svg viewBox='0 0 16 16' fill='none' className='size-3 shrink-0' role='img' aria-label={title}>
      <title>{title}</title>
      <path
        d='M1.75 3.25h6.5M5 2v1.25M3 3.25c.4 2.1 1.9 3.9 4 4.75M7 3.25c-.4 2.1-1.9 3.9-4 4.75'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='m8.5 14 2.75-6.5L14 14M9.4 12h3.7'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
