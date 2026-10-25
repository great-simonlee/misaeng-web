'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import { cn } from '@lib'
import { descriptionParagraphs, type AboutTeamMember } from '@lib/about/team'

/**
 * About → 팀 소개. 모든 멤버를 같은 카드(사진 · 이름 · 직책)로 보여 주고,
 * 카드를 누르면 소개글과 이메일이 있는 창이 열린다.
 */

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function Portrait({
  member,
  className,
  sizes,
  priority,
}: {
  member: AboutTeamMember
  className: string
  sizes: string
  priority?: boolean
}) {
  const url = String(member.photoURL || '').trim()
  const isRemote = /^https?:\/\//i.test(url)
  const isLocal = url.startsWith('/')

  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-[var(--surface)]', className)}>
      {isRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={member.name} className='absolute inset-0 h-full w-full object-cover object-center' />
      ) : isLocal ? (
        <Image src={url} alt={member.name} fill className='object-cover object-center' sizes={sizes} priority={priority} />
      ) : (
        <div className='flex h-full w-full items-center justify-center bg-brand/10 text-2xl font-semibold text-brand'>
          {initials(member.name)}
        </div>
      )}
    </div>
  )
}

function MemberCard({
  member,
  priority,
  onOpen,
}: {
  member: AboutTeamMember
  priority: boolean
  onOpen: () => void
}) {
  return (
    <button
      type='button'
      onClick={onOpen}
      className='group flex w-full flex-col items-center text-center touch-manipulation focus-visible:outline-none'
      aria-haspopup='dialog'
      aria-label={`${member.name} — view profile`}
    >
      <Portrait
        member={member}
        className='size-20 rounded-full ring-1 ring-black/[0.06] transition duration-200 group-hover:ring-2 group-hover:ring-brand/60 group-focus-visible:ring-2 group-focus-visible:ring-brand sm:size-24'
        sizes='96px'
        priority={priority}
      />
      <h3 className='mt-3 text-[14px] font-semibold tracking-tight text-[var(--foreground)] transition group-hover:text-brand'>
        {member.name}
      </h3>
      {member.position ? (
        <p className='mt-0.5 text-[12px] leading-snug text-[var(--muted)]'>{member.position}</p>
      ) : null}
    </button>
  )
}

function MemberDialog({ member, onClose }: { member: AboutTeamMember; onClose: () => void }) {
  useBodyScrollLock(true)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const paragraphs = descriptionParagraphs(member.description)

  return createPortal(
    <div
      className='fixed inset-0 z-[10050] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6'
      role='dialog'
      aria-modal='true'
      aria-labelledby='team-member-name'
      onClick={onClose}
    >
      <div
        className='relative max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8'
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type='button'
          onClick={onClose}
          aria-label='Close'
          className='absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
        >
          <svg className='size-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2} aria-hidden>
            <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>

        <div className='flex items-center gap-4 pr-8'>
          <Portrait member={member} className='size-20 rounded-2xl' sizes='80px' />
          <div className='min-w-0'>
            <h3 id='team-member-name' className='text-xl font-bold tracking-tight text-[var(--foreground)]'>
              {member.name}
            </h3>
            {member.position ? <p className='mt-0.5 text-sm font-medium text-brand'>{member.position}</p> : null}
            {member.role ? <p className='mt-0.5 text-[13px] text-[var(--muted)]'>{member.role}</p> : null}
          </div>
        </div>

        {paragraphs.length ? (
          <div className='mt-6 space-y-3 text-[14px] leading-[1.75] text-[var(--muted-foreground)]'>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {member.email ? (
          <a
            href={`mailto:${member.email}`}
            className='mt-6 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-brand/10'
          >
            <span className='inline-flex items-center gap-2'>
              <svg className='size-4 text-brand' fill='none' viewBox='0 0 24 24' strokeWidth={1.6} stroke='currentColor' aria-hidden>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'
                />
              </svg>
              {member.email}
            </span>
            <span className='text-[var(--muted)]' aria-hidden>
              →
            </span>
          </a>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function AboutTeamSection({ members }: { members: AboutTeamMember[] }) {
  const team = Array.isArray(members) ? members : []
  const [openId, setOpenId] = useState<string | null>(null)
  const open = team.find((member) => member.id === openId) ?? null

  return (
    <section
      className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8'
      aria-labelledby='about-team-heading'
    >
      <div className='max-w-2xl'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-brand'>Team</p>
        <h2 id='about-team-heading' className='mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl'>
          Meet the Misaeng team
        </h2>
        <p className='mt-3 text-base leading-relaxed text-[var(--muted-foreground)]'>
          The people you&apos;ll talk to — based in New York, here to help with tours, listings, and getting you settled.
        </p>
      </div>

      {team.length ? (
        <div className='mt-10 grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5'>
          {team.map((member, index) => (
            <MemberCard key={member.id} member={member} priority={index < 3} onOpen={() => setOpenId(member.id)} />
          ))}
        </div>
      ) : null}

      {open ? <MemberDialog member={open} onClose={() => setOpenId(null)} /> : null}
    </section>
  )
}
