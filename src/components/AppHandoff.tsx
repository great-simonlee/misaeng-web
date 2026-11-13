'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import QRCode from 'qrcode'

import { BRAND_CONFIG } from '@lib/brand'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import { MisaengStoreButtons } from '@widgets/nyc/MisaengStoreButtons'

/**
 * 웹 → 앱 연결 한 곳 (댓글을 뺀 상호작용은 앱에서: 커피챗, 커리어 질문, 문의 메시지, 새 공고 알림).
 * - 휴대폰: "앱에서 열기"(misaeng://… 같은 화면) + 앱이 없을 때 스토어 버튼.
 * - 데스크톱: 이 페이지 주소의 QR. 휴대폰 카메라로 찍으면 앱이 있으면 앱에서(유니버설 링크), 없으면 이 페이지가 열린다.
 * 앱 경로는 misaeng-app AppRouter.open(url:) 와 같다 (housing/{id}, review/{id}, company/{slug}, posting/{id} …).
 */
export type AppHandoffAction = 'open' | 'coffeeChat' | 'ask' | 'follow' | 'inquiry' | 'message'

const MOBILE = /iPhone|iPad|iPod|Android/i
const noSubscribe = () => () => {}
const isMobile = () => MOBILE.test(navigator.userAgent)
const notMobileOnServer = () => false

export function useIsPhone() {
  return useSyncExternalStore(noSubscribe, isMobile, notMobileOnServer)
}

export function appHref(appPath: string) {
  return `misaeng://${appPath.replace(/^\/+/, '')}`
}

export function AppHandoffSheet({
  open,
  onClose,
  appPath,
  action = 'open',
  footer,
}: {
  open: boolean
  onClose: () => void
  appPath: string
  action?: AppHandoffAction
  /** 시트 아래 보조 링크 (예: 하우징 문의의 카카오톡·이메일) */
  footer?: ReactNode
}) {
  const t = useT('common')
  const phone = useIsPhone()
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 데스크톱: 지금 페이지 주소를 QR 로 (휴대폰에서 찍으면 같은 화면이 앱이나 웹에서 열린다)
  useEffect(() => {
    if (!open || phone) return
    let alive = true
    QRCode.toDataURL(window.location.href, { margin: 1, width: 360, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null))
    return () => {
      alive = false
    }
  }, [open, phone])

  if (!open || BRAND_CONFIG.id !== 'misaeng') return null
  return (
    <div
      className='fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6'
      role='dialog'
      aria-modal='true'
      aria-label={t(`appHandoff.${action}.title`)}
      onClick={onClose}
    >
      <div
        className='w-full max-w-md rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem]'
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className='text-[1.2rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          {t(`appHandoff.${action}.title`)}
        </h2>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t(`appHandoff.${action}.body`)}</p>

        {phone ? (
          <>
            <a
              href={appHref(appPath)}
              className='mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgb(var(--brand-rgb)/0.22)] transition hover:bg-[var(--brand-hover)]'
            >
              {t('appHandoff.openApp')}
            </a>
            <p className='mt-4 text-[12px] text-[var(--muted)]'>{t('appHandoff.notInstalled')}</p>
            <MisaengStoreButtons className='mt-2' appStoreLabel={t('appHandoff.appStore')} googlePlayLabel={t('appHandoff.googlePlay')} />
          </>
        ) : (
          <div className='mt-5 flex items-center gap-5'>
            <div className='flex h-[148px] w-[148px] shrink-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-white p-2'>
              {qr ? <img src={qr} alt={t('appHandoff.qrAlt')} className='h-full w-full' /> : null}
            </div>
            <div className='min-w-0'>
              <p className='text-[14px] font-semibold text-[var(--foreground)]'>{t('appHandoff.qrTitle')}</p>
              <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{t('appHandoff.qrBody')}</p>
            </div>
          </div>
        )}
        {!phone ? (
          <MisaengStoreButtons className='mt-5' appStoreLabel={t('appHandoff.appStore')} googlePlayLabel={t('appHandoff.googlePlay')} />
        ) : null}

        {footer}
        <button type='button' onClick={onClose} className='mt-4 w-full py-2 text-[13px] font-medium text-[var(--muted-foreground)]'>
          {t('appHandoff.close')}
        </button>
      </div>
    </div>
  )
}

/** 행동 버튼 하나 (커피챗 신청, 질문하기, 새 공고 알림 …): 누르면 앱 연결 시트. */
export function AppHandoffButton({
  appPath,
  action,
  label,
  icon,
  variant = 'secondary',
  className,
}: {
  appPath: string
  action: AppHandoffAction
  label: string
  icon?: ReactNode
  /** plain: only `className` (to match the buttons around it) */
  variant?: 'primary' | 'secondary' | 'plain'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (BRAND_CONFIG.id !== 'misaeng') return null
  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={
          variant === 'plain'
            ? className
            : cn(
                'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-semibold touch-manipulation transition',
                variant === 'primary'
                  ? 'bg-[var(--brand)] text-white shadow-[0_8px_20px_rgb(var(--brand-rgb)/0.22)] hover:bg-[var(--brand-hover)]'
                  : 'border border-black/[0.08] bg-white text-[var(--foreground)] hover:bg-[#fafbfc]',
                className,
              )
        }
      >
        {icon}
        {label}
      </button>
      <AppHandoffSheet open={open} onClose={() => setOpen(false)} appPath={appPath} action={action} />
    </>
  )
}
