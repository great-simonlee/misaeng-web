'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { useAnchoredPosition } from '@hooks/useAnchoredPosition'
import {
  ANONYMOUS_TOPICS,
  isAnonymousTopic,
} from '@lib/constants/anonymousTopics'
import { cn } from '@lib'

type AnonymousTopicSelectProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** 익명게시판 주제 선택 — 브랜드 톤 맞춤 커스텀 드롭다운 */
export function AnonymousTopicSelect({
  value,
  onChange,
  placeholder = '주제를 선택해 주세요',
  className,
}: AnonymousTopicSelectProps) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const position = useAnchoredPosition(triggerRef, open, 8)

  const topics = [
    ...ANONYMOUS_TOPICS,
    ...(value && !isAnonymousTopic(value) ? [value] : []),
  ]
  const hasValue = Boolean(value.trim())
  const displayLabel = hasValue ? value : placeholder

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function selectValue(next: string) {
    onChange(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const dropdown =
    mounted && open && position
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role='listbox'
            aria-label='주제'
            className='fixed z-[10050] overflow-auto rounded-2xl bg-white py-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.06]'
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: Math.max(position.maxHeight, 280),
            }}
          >
            <li>
              <button
                type='button'
                role='option'
                aria-selected={!hasValue}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectValue('')}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left touch-manipulation transition',
                  !hasValue
                    ? 'bg-[#fff8f5] text-[var(--brand)]'
                    : 'text-[var(--muted)] hover:bg-[#f8f9fb]',
                )}
              >
                <span className='flex size-5 shrink-0 items-center justify-center'>
                  {!hasValue ? <CheckIcon className='size-3.5' /> : null}
                </span>
                <span className='text-[14px] font-medium'>{placeholder}</span>
              </button>
            </li>
            <li aria-hidden className='mx-3 my-1 h-px bg-black/[0.06]' />
            {topics.map((topic) => {
              const selected = value === topic
              return (
                <li key={topic}>
                  <button
                    type='button'
                    role='option'
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectValue(topic)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left touch-manipulation transition',
                      selected
                        ? 'bg-[#fff8f5] text-[var(--foreground)]'
                        : 'text-[var(--foreground)] hover:bg-[#f8f9fb]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full',
                        selected
                          ? 'bg-[var(--brand)] text-white'
                          : 'bg-[#f1f2f4] text-transparent',
                      )}
                    >
                      {selected ? (
                        <CheckIcon className='size-3' />
                      ) : (
                        <span className='size-1.5 rounded-full bg-[#c5c8ce]' />
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[14px]',
                        selected ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {topic}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'mt-1.5 flex h-11 w-full items-center justify-between gap-2 rounded-xl bg-white px-3.5 text-left text-[15px] outline-none ring-1 transition touch-manipulation',
          open
            ? 'ring-[var(--brand)]/35 shadow-[0_0_0_3px_rgba(246,67,16,0.08)]'
            : 'ring-black/[0.08] hover:ring-black/15 focus:ring-black/20',
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate',
            hasValue
              ? 'font-medium text-[var(--foreground)]'
              : 'text-[var(--muted)]',
          )}
        >
          {displayLabel}
        </span>
        <ChevronIcon
          className={cn(
            'size-4 shrink-0 text-[var(--muted)] transition-transform duration-200',
            open && 'rotate-180 text-[var(--brand)]',
          )}
        />
      </button>
      {dropdown}
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='M6 9l6 6 6-6' />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
    </svg>
  )
}
