'use client'

import Image from 'next/image'
import { useState } from 'react'

import { descriptionParagraphs, type AboutTeamMember } from '@lib/about/team'

/** Mobile-only (sm:hidden parent): full-width, 48px+ touch target, clean iOS-adjacent row */
function MobileReadBioButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-expanded='false'
      className='group flex w-full min-h-[52px] touch-manipulation items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] outline-none ring-0 transition-[transform,box-shadow,background-color,border-color] focus-visible:border-[#F64310]/40 focus-visible:ring-4 focus-visible:ring-[#F64310]/15 active:scale-[0.985] active:bg-[var(--surface-elevated)]'
    >
      <span className='min-w-0 flex-1'>
        <span className='block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]'>
          About
        </span>
        <span className='mt-0.5 block text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)]'>
          Read bio
        </span>
      </span>
      <span
        className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F64310]/[0.11] text-[#F64310] transition-transform duration-200 group-active:translate-y-px'
        aria-hidden
      >
        <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' strokeWidth={2.25} stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
        </svg>
      </span>
    </button>
  )
}

function MobileShowLessBioButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-expanded='true'
      className='group mt-5 flex w-full min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-transparent px-4 py-3 text-sm font-semibold tracking-tight text-[var(--muted-foreground)] outline-none transition-[transform,background-color,border-color,color] focus-visible:border-[var(--foreground)]/25 focus-visible:bg-[var(--surface-elevated)] focus-visible:text-[var(--foreground)] active:scale-[0.985]'
    >
      <span>Show less</span>
      <svg
        className='h-4 w-4 shrink-0 transition-transform duration-200 group-active:-translate-y-px'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={2.25}
        stroke='currentColor'
      >
        <path strokeLinecap='round' strokeLinejoin='round' d='M5 15l7-7 7 7' />
      </svg>
    </button>
  )
}

function MailRow({ email }: { email: string }) {
  if (!email) return null
  return (
    <div className='mt-6 flex items-center gap-2.5'>
      <span
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F64310]/10 text-[#F64310]'
        aria-hidden
      >
        <svg
          className='h-4 w-4'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'
          />
        </svg>
      </span>
      <a
        href={`mailto:${email}`}
        className='text-sm font-medium text-[var(--foreground)] underline-offset-2 hover:underline'
      >
        {email}
      </a>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function Portrait({
  src,
  alt,
  name,
  priority,
}: {
  src: string
  alt: string
  name: string
  priority?: boolean
}) {
  const url = String(src || '').trim()
  const isRemote = /^https?:\/\//i.test(url)
  const isLocal = url.startsWith('/')

  return (
    <div className='relative mx-auto aspect-square w-44 shrink-0 overflow-hidden rounded-full shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] ring-2 ring-[#F64310]/25 sm:w-52 md:mx-0 md:w-56'>
      {isRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className='absolute inset-0 h-full w-full object-cover object-center' />
      ) : isLocal ? (
        <Image
          src={url}
          alt={alt}
          fill
          className='object-cover object-center'
          sizes='(max-width: 768px) 176px, 224px'
          priority={priority}
        />
      ) : (
        <div className='flex h-full w-full items-center justify-center bg-[#F64310]/10 text-3xl font-semibold text-[#F64310]'>
          {initials(name)}
        </div>
      )}
    </div>
  )
}

function BioParagraphs({
  paragraphs,
  compact,
}: {
  paragraphs: string[]
  compact?: boolean
}) {
  if (paragraphs.length === 0) return null
  const gap = compact ? 'space-y-3' : 'space-y-4'
  const leading = compact ? 'leading-[1.65]' : 'leading-[1.7]'
  return (
    <div className={gap}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={`text-sm ${leading} text-[var(--muted-foreground)]`}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}

const textBlock = 'min-w-0 border-l-[3px] border-[#F64310] pl-5 sm:pl-7 md:max-w-2xl'

function MemberCopy({
  member,
  expanded,
  onToggle,
  compactBio,
}: {
  member: AboutTeamMember
  expanded: boolean
  onToggle: () => void
  compactBio: boolean
}) {
  const paragraphs = descriptionParagraphs(member.description)

  return (
    <div className={textBlock}>
      <h3 className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'>
        {member.name}
      </h3>
      {member.position ? (
        <p className='mt-1 text-sm font-semibold text-[#F64310]'>{member.position}</p>
      ) : null}
      {member.role ? (
        <p className='mt-1 text-xs leading-snug text-[var(--muted-foreground)] sm:text-sm'>
          {member.role}
        </p>
      ) : null}
      {paragraphs.length > 0 ? (
        <>
          <div className='mt-5 hidden sm:block'>
            <BioParagraphs paragraphs={paragraphs} compact={compactBio} />
          </div>
          <div className='mt-4 sm:hidden'>
            {expanded ? (
              <>
                <BioParagraphs paragraphs={paragraphs} compact={compactBio} />
                <MobileShowLessBioButton onClick={onToggle} />
              </>
            ) : (
              <MobileReadBioButton onClick={onToggle} />
            )}
          </div>
        </>
      ) : null}
      <MailRow email={member.email} />
    </div>
  )
}

export function AboutTeamSection({ members }: { members: AboutTeamMember[] }) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const team = Array.isArray(members) ? members : []

  return (
    <section
      className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 py-10 sm:px-6 sm:py-14 lg:px-8'
      aria-labelledby='about-team-heading'
    >
      <div className='max-w-2xl'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          Team
        </p>
        <h2
          id='about-team-heading'
          className='mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-4xl'
        >
          Meet Misaeng Team
        </h2>
        <div className='mt-4 h-1 w-14 rounded-full bg-[#F64310]' aria-hidden />
        <p className='mt-5 text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg'>
          The people you&apos;ll talk to—based in New York, here to help with tours, listings, and
          getting you settled.
        </p>
      </div>

      {team.length === 0 ? null : (
        <div className='mt-14 space-y-0 md:mt-16'>
          {team.map((member, index) => {
            const photoLeft = index % 2 === 0
            const compactBio = index !== 0
            const alt = [member.name, member.position, member.role].filter(Boolean).join(' — ')
            const expanded = Boolean(expandedIds[member.id])
            const portrait = (
              <Portrait
                src={member.photoURL}
                alt={alt || member.name}
                name={member.name}
                priority={index === 0}
              />
            )
            const copy = (
              <MemberCopy
                member={member}
                expanded={expanded}
                compactBio={compactBio}
                onToggle={() =>
                  setExpandedIds((prev) => ({ ...prev, [member.id]: !prev[member.id] }))
                }
              />
            )

            return (
              <article
                key={member.id}
                className={
                  photoLeft
                    ? `flex flex-col gap-10 md:grid md:grid-cols-[minmax(180px,34%)_1fr] md:items-center md:gap-x-12 md:gap-y-0 lg:gap-x-16${
                        index === 0 ? '' : ' mt-12 border-t border-[var(--border)] pt-12 md:mt-16'
                      }`
                    : 'mt-12 flex flex-col-reverse gap-10 border-t border-[var(--border)] pt-12 md:mt-16 md:grid md:grid-cols-[1fr_minmax(180px,34%)] md:items-center md:gap-x-12 md:gap-y-0 lg:gap-x-16'
                }
              >
                {photoLeft ? (
                  <>
                    <div className='flex justify-center md:justify-end md:pr-4'>{portrait}</div>
                    {copy}
                  </>
                ) : (
                  <>
                    {copy}
                    <div className='flex justify-center md:justify-start md:pl-4'>{portrait}</div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
