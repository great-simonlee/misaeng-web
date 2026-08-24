'use client'

import { useRef, useState } from 'react'

import { uploadCommunityImageFile } from '@lib/community/upload.client'
import { cn } from '@lib'

type ImageUploadButtonProps = {
  label?: string
  onUploaded: (url: string) => void
  className?: string
  compact?: boolean
}

export function ImageUploadButton({
  label = '사진 선택',
  onUploaded,
  className,
  compact,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadCommunityImageFile(file)
      onUploaded(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn(className)}>
      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-black/[0.08] bg-white font-semibold text-[var(--foreground)] touch-manipulation transition hover:border-black/15 disabled:opacity-50',
          compact ? 'h-9 px-3 text-[12px]' : 'h-10 px-4 text-[13px]',
        )}
      >
        {uploading ? '업로드 중…' : label}
      </button>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error ? (
        <p className='mt-1.5 text-[12px] text-red-600'>{error}</p>
      ) : null}
    </div>
  )
}

type ImagePreviewProps = {
  src: string
  alt?: string
  onRemove?: () => void
  className?: string
}

export function ImagePreview({
  src,
  alt = '',
  onRemove,
  className,
}: ImagePreviewProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-[#eef0f3]',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className='h-full w-full object-cover' />
      {onRemove ? (
        <button
          type='button'
          onClick={onRemove}
          className='absolute right-2 top-2 inline-flex h-7 items-center rounded-full bg-black/60 px-2.5 text-[11px] font-semibold text-white touch-manipulation'
        >
          삭제
        </button>
      ) : null}
    </div>
  )
}

type PhotoUploadZoneProps = {
  src?: string | null
  onUploaded: (url: string) => void
  onRemove?: () => void
  /** 빈 상태 메인 문구 */
  emptyLabel?: string
  /** 빈 상태 보조 문구 */
  emptyHint?: string
  className?: string
  /** 비율 클래스. 예: aspect-[16/10], aspect-square */
  aspectClassName?: string
  /** 작은 메뉴 썸네일용 */
  compact?: boolean
}

/** 탭해서 올리는 사진 영역 (대표·메뉴 공통) */
export function PhotoUploadZone({
  src,
  onUploaded,
  onRemove,
  emptyLabel = '사진 추가',
  emptyHint = '탭해서 올리기',
  className,
  aspectClassName = 'aspect-[16/10]',
  compact = false,
}: PhotoUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadCommunityImageFile(file)
      onUploaded(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl',
          aspectClassName,
          src
            ? 'bg-[#e8eaee]'
            : 'bg-[#f3f4f6] ring-1 ring-dashed ring-black/[0.12]',
        )}
      >
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=''
              className='h-full w-full object-cover'
            />
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/55 via-black/20 to-transparent',
                compact ? 'p-1.5 pt-8' : 'gap-2 p-3 pt-10',
              )}
            >
              <button
                type='button'
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'inline-flex items-center rounded-full bg-white/95 font-semibold text-[var(--foreground)] touch-manipulation shadow-sm disabled:opacity-50',
                  compact
                    ? 'h-7 px-2 text-[10px]'
                    : 'h-8 px-3 text-[12px]',
                )}
              >
                {uploading ? '…' : '바꾸기'}
              </button>
              {onRemove ? (
                <button
                  type='button'
                  onClick={onRemove}
                  className={cn(
                    'inline-flex items-center rounded-full bg-black/55 font-semibold text-white touch-manipulation backdrop-blur-sm',
                    compact
                      ? 'h-7 px-2 text-[10px]'
                      : 'h-8 px-3 text-[12px]',
                  )}
                >
                  삭제
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <button
            type='button'
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex h-full w-full flex-col items-center justify-center touch-manipulation transition hover:bg-black/[0.02] active:bg-black/[0.04] disabled:opacity-60',
              compact ? 'gap-1.5 px-1' : 'gap-2',
            )}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-2xl bg-white text-[var(--foreground)] shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.05]',
                compact ? 'size-9 rounded-xl' : 'size-11',
              )}
            >
              {uploading ? (
                <span className='text-[11px] font-semibold text-[var(--muted)]'>
                  …
                </span>
              ) : (
                <CameraIcon
                  className={cn(compact ? 'size-4' : 'size-5', 'opacity-80')}
                />
              )}
            </span>
            <span
              className={cn(
                'font-semibold text-[var(--foreground)]',
                compact ? 'text-[12px]' : 'text-[13px]',
              )}
            >
              {uploading ? '업로드 중…' : emptyLabel}
            </span>
            {!uploading && emptyHint ? (
              <span className='text-[11px] text-[var(--muted)]'>
                {emptyHint}
              </span>
            ) : null}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error ? (
        <p className='mt-1.5 text-[12px] font-medium text-red-600'>{error}</p>
      ) : null}
    </div>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6A1.5 1.5 0 0 1 10 3.8h4a1.5 1.5 0 0 1 1.2.6L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z'
      />
      <circle cx='12' cy='12.5' r='3.2' />
    </svg>
  )
}
