'use client'

import Image from 'next/image'
import { BRAND_CONFIG } from '@lib/brand'

import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

const SIZE_MAP = {
  sm: {
    box: 'size-10',
    ring: 'border-[2.5px]',
    icon: 'size-5',
  },
  md: {
    box: 'size-14',
    ring: 'border-[3px]',
    icon: 'size-7',
  },
  lg: {
    box: 'size-20',
    ring: 'border-[3.5px]',
    icon: 'size-10',
  },
} as const

export type LoadingSpinnerSize = keyof typeof SIZE_MAP

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize
  label?: string
  className?: string
  'aria-label'?: string
}

/** 미생 브랜드 오렌지 스피너 + 중앙 로고 */
export function LoadingSpinner({
  size = 'md',
  label,
  className,
  'aria-label': ariaLabel,
}: LoadingSpinnerProps) {
  const t = useT('common')
  const dims = SIZE_MAP[size]
  const accessibleName = ariaLabel ?? label ?? t('ui.loading.aria')

  if (BRAND_CONFIG.theme === 'ellieo') {
    return <EllieoLoading size={size} label={label} accessibleName={accessibleName} className={className} />
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center gap-2.5',
        className,
      )}
      role='status'
      aria-live='polite'
      aria-label={accessibleName}
    >
      <span
        className={cn(
          'relative inline-flex items-center justify-center',
          dims.box,
        )}
      >
        <span
          className={cn(
            'misaeng-spinner-orbit absolute inset-0 rounded-full border-brand/20 border-t-brand',
            dims.ring,
          )}
          aria-hidden
        />
        <span
          className={cn('relative z-[1] block', dims.icon)}
          aria-hidden
        >
          {/* 검정 배경은 lighten으로 밝게 처리되어 흰 배경에서 사라짐 */}
          <Image
            src={BRAND_CONFIG.assets.square}
            alt=''
            width={80}
            height={80}
            className={cn(
              'size-full object-contain',
              // misaeng 아이콘은 검정 배경이라 lighten으로 지운다
              BRAND_CONFIG.id === 'misaeng' && 'mix-blend-lighten',
            )}
            priority
          />
        </span>
      </span>
      {label ? (
        <span className='text-[13px] font-medium text-[var(--muted)] sm:text-sm'>
          {label}
        </span>
      ) : (
        <span className='sr-only'>{accessibleName}</span>
      )}
    </div>
  )
}

/** Ellieo vertical logo (symbol over ELLIEO) width per size; the wordmark needs more room than the app's 48pt symbol */
const ELLIEO_LOGO_PX = { sm: 52, md: 76, lg: 92 } as const
const ELLIEO_WAVE_SCALE = { sm: 0.7, md: 0.95, lg: 1.05 } as const

/**
 * Ellieo loader, same as the Misaeng app's SectionLoading (ios/Misaeng/Components/LoadingWave.swift):
 * the vertical logo (symbol over ELLIEO) over five short bars rising and falling in one wave, left → right, fading in after 350ms
 * so fast loads never flash it. Logo and bars use the Ellieo cyan → blue gradient. Motion: globals ellieo-wave.
 */
function EllieoLoading({
  size,
  label,
  accessibleName,
  className,
}: {
  size: LoadingSpinnerSize
  label?: string
  accessibleName: string
  className?: string
}) {
  const scale = ELLIEO_WAVE_SCALE[size]
  return (
    <div
      className={cn('ellieo-loading inline-flex flex-col items-center justify-center gap-3', className)}
      role='status'
      aria-live='polite'
      aria-label={accessibleName}
    >
      <Image
        src={BRAND_CONFIG.assets.vertical ?? BRAND_CONFIG.assets.square}
        alt=''
        width={ELLIEO_LOGO_PX[size]}
        height={ELLIEO_LOGO_PX[size]}
        className='object-contain'
        style={{ width: ELLIEO_LOGO_PX[size], height: ELLIEO_LOGO_PX[size] }}
        priority
      />
      <span aria-hidden className='flex items-center' style={{ gap: 5.5 * scale, height: 22 * scale }}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className='ellieo-wave-bar rounded-full'
            style={{ width: 4.5 * scale, height: 22 * scale, animationDelay: `${(index * 0.096).toFixed(3)}s` }}
          />
        ))}
      </span>
      {/* Like the app: logo and wave only; the text is for screen readers */}
      <span className='sr-only'>{label ?? accessibleName}</span>
    </div>
  )
}

interface LoadingStateProps {
  label?: string
  size?: LoadingSpinnerSize
  className?: string
  fullPage?: boolean
}

export function LoadingState({
  label,
  size = 'md',
  className,
  fullPage = false,
}: LoadingStateProps) {
  const t = useT('common')
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center bg-[var(--background)]',
        fullPage ? 'flex-1 px-4 py-16' : 'px-4 py-12',
        className,
      )}
    >
      <LoadingSpinner
        size={fullPage ? 'lg' : size}
        label={label ?? t('ui.loading.label')}
        className={fullPage ? 'gap-3.5 sm:gap-4' : undefined}
      />
    </div>
  )
}
