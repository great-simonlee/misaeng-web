'use client'

import Image from 'next/image'
import Link from 'next/link'

const ELLIEO_BLUE = '#00A5FF'

/* ─── Hero: Careers/다른 페이지와 동일한 타이틀 블록 ─── */
function HeroSection() {
  return (
    <header className='bg-[var(--background)]'>
      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          Our Service
        </p>
        <h1 className='mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]'>
          <span className='inline-flex items-baseline gap-2'>
            <Image
              src='/img/ellieo_logo.png'
              alt=''
              width={40}
              height={40}
              className='h-8 w-8 shrink-0 self-center sm:h-9 sm:w-9 lg:h-10 lg:w-10'
              aria-hidden
            />
            <span style={{ color: ELLIEO_BLUE }}>Ellieo:</span>
          </span>{' '}
          Next-Gen Housing for New York City
        </h1>
        <p className='mt-3 max-w-xl text-sm leading-[1.65] text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:leading-[1.7]'>
          New York&apos;s rental market operates at extreme speed. We turn shared housing into a
          structured, accountable process—Half the Rent means financial efficiency; Twice the Story
          means better roommate alignment and a smoother move-in experience.
        </p>
      </div>
    </header>
  )
}

/* ─── How Ellieo Works: 사용자 유형별 플로우 + 공유 조정 레이어 ─── */
const AGENT_STEPS = [
  {
    num: 1,
    title: 'Property Intake & Structuring',
    description:
      "Agents or verified users upload a unit or available room. Required details include lease structure, availability date, room configuration, and pricing. Listings are standardized through Ellieo's structured submission workflow.",
  },
  {
    num: 2,
    title: 'On-Site Media & Listing Verification',
    description:
      "Agents and verified listers capture on-site photos and videos and submit them through Ellieo's structured workflow. Media must reflect actual unit conditions — no digitally altered or outdated imagery. Ellieo applies submission standards to improve listing consistency and transparency.",
  },
  {
    num: 3,
    title: 'Listing Activation & Visibility',
    description: (
      <>
        The verified listing is published with structured data tags, roommate compatibility
        indicators, and real-time availability status. If a current resident is already living in
        the unit, their roommate profile can be linked to the listing so future roommates can review{' '}
        <strong className='text-[var(--foreground)]'>compatibility before touring</strong>. This
        allows future roommates to assess alignment before touring — reducing uncertainty and
        last-minute conflicts.
      </>
    ),
  },
]

const ROOM_SEEKER_STEPS = [
  {
    num: 1,
    title: 'Profile Creation & Compatibility Setup',
    description:
      'Users complete lifestyle preferences, lease timing readiness, and co-living behavior inputs.',
  },
  {
    num: 2,
    title: 'Browse Verified Units & Roommate Visibility',
    description: (
      <>
        Users can see: verified listings; existing roommates waiting for matches; current residents
        already in the unit; and{' '}
        <strong className='text-[var(--foreground)]'>compatibility alignment indicators</strong>.
        Visibility into current or waiting roommates reduces failed matches and improves shared
        living alignment.
      </>
    ),
  },
  {
    num: 3,
    title: 'Chat & Tour Request',
    description:
      'Users initiate chat within the platform. They can request in-person tours, video tours, or virtual walkthroughs.',
  },
  {
    num: 4,
    title: 'Lease Guidance & Documentation',
    description:
      'Once alignment is confirmed, Ellieo guides users through required documentation, application submission, lease structure explanation, and approval coordination.',
  },
]

function WorkflowSection() {
  return (
    <section
      className='relative overflow-hidden bg-gradient-to-b from-white to-[#F8FAFC] py-12 sm:py-16 lg:py-20'
      aria-labelledby='workflow-heading'
    >
      {/* Subtle grid / noise for depth */}
      <div
        className='absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.4]'
        aria-hidden
      />

      <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Section header */}
        <div className='text-left'>
          <h2
            id='workflow-heading'
            className='text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl'
          >
            How Ellieo Works
          </h2>
          <p className='mt-4 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)]'>
            From listing to move-in — structured, verified, and coordinated.
          </p>
        </div>

        {/* Two-column: Agent Flow | Room Seeker Flow */}
        <div className='mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 lg:mt-10'>
          {/* PART 1 — For Agents & Listers */}
          <div className='relative'>
            <div className='mb-8 flex items-center gap-3'>
              <span
                className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#00A5FF]/10 text-[#00A5FF]'
                aria-hidden
              >
                <svg
                  className='h-5 w-5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                  />
                </svg>
              </span>
              <div>
                <span className='text-xs font-semibold uppercase tracking-widest text-[var(--muted)]'>
                  Supply
                </span>
                <h3 className='mt-0.5 text-xl font-bold tracking-tight text-[var(--foreground)]'>
                  For Agents & Verified Listers
                </h3>
              </div>
            </div>
            <div className='space-y-5'>
              {AGENT_STEPS.map((step) => (
                <div
                  key={step.num}
                  className='group relative overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00A5FF]/25 hover:shadow-[0_24px_48px_-12px_rgba(0,165,255,0.15)] sm:p-7'
                >
                  <span
                    className='absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#00A5FF]/0 via-[#00A5FF]/40 to-[#00A5FF]/0 opacity-0 transition-opacity group-hover:opacity-100'
                    aria-hidden
                  />
                  <span className='text-xs font-bold tracking-widest text-[#00A5FF]/80'>
                    Step {String(step.num).padStart(2, '0')}
                  </span>
                  <h4 className='mt-2 text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
                    {step.title}
                  </h4>
                  <p className='mt-3 text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* PART 2 — For Room Seekers */}
          <div className='relative'>
            <div className='mb-8 flex items-center gap-3'>
              <span
                className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#00A5FF]/10 text-[#00A5FF]'
                aria-hidden
              >
                <svg
                  className='h-5 w-5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              </span>
              <div>
                <span className='text-xs font-semibold uppercase tracking-widest text-[var(--muted)]'>
                  Demand
                </span>
                <h3 className='mt-0.5 text-xl font-bold tracking-tight text-[var(--foreground)]'>
                  For Room Seekers
                </h3>
              </div>
            </div>
            <div className='space-y-5'>
              {ROOM_SEEKER_STEPS.map((step) => (
                <div
                  key={step.num}
                  className='group relative overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00A5FF]/25 hover:shadow-[0_24px_48px_-12px_rgba(0,165,255,0.15)] sm:p-7'
                >
                  <span
                    className='absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#00A5FF]/0 via-[#00A5FF]/40 to-[#00A5FF]/0 opacity-0 transition-opacity group-hover:opacity-100'
                    aria-hidden
                  />
                  <span className='text-xs font-bold tracking-widest text-[#00A5FF]/80'>
                    Step {String(step.num).padStart(2, '0')}
                  </span>
                  <h4 className='mt-2 text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
                    {step.title}
                  </h4>
                  <p className='mt-3 text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Convergence */}
        <div className='mt-14 flex flex-col items-center gap-4 lg:mt-16' aria-hidden>
          <div className='flex items-center gap-2'>
            <span className='h-px w-16 bg-gradient-to-r from-transparent to-[#00A5FF]/40' />
            <span className='flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#00A5FF]/30 bg-white text-[#00A5FF] shadow-lg shadow-[#00A5FF]/10'>
              <svg
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path strokeLinecap='round' strokeLinejoin='round' d='M13 10V3L4 14h7v7l9-11h-7z' />
              </svg>
            </span>
            <span className='h-px w-16 bg-gradient-to-l from-transparent to-[#00A5FF]/40' />
          </div>
          <span className='text-xs font-semibold uppercase tracking-widest text-[var(--muted)]'>
            Convergence
          </span>
          <svg
            className='h-6 w-6 text-[#00A5FF]/50'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M19 14l-7 7m0 0l-7-7m7 7V3' />
          </svg>
        </div>

        {/* PART 3 — Shared Coordination Layer */}
        <div className='mt-10 rounded-3xl border border-[#00A5FF]/15 bg-gradient-to-br from-white via-white to-[#00A5FF]/[0.03] p-8 shadow-[0_8px_30px_rgba(0,165,255,0.08)] sm:mt-12 sm:p-10 lg:p-12'>
          <div className='flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8'>
            <span
              className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#00A5FF]/10 text-[#00A5FF]'
              aria-hidden
            >
              <svg
                className='h-7 w-7'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                />
              </svg>
            </span>
            <div className='min-w-0 flex-1'>
              <h3 className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'>
                Smart Match & Move-In Coordination
              </h3>
              <p className='mt-4 text-sm leading-[1.7] text-[var(--muted-foreground)] sm:text-base'>
                Ellieo connects{' '}
                <strong className='font-semibold text-[var(--foreground)]'>verified agents</strong>,{' '}
                <strong className='font-semibold text-[var(--foreground)]'>room seekers</strong>,
                and{' '}
                <strong className='font-semibold text-[var(--foreground)]'>
                  existing residents
                </strong>
                . If a unit already has residents or users waiting for roommates, new applicants can
                view profiles and compatibility indicators before making decisions. This reduces
                failed matches and avoids last-minute roommate conflicts. Ellieo functions as a
                structured coordination layer between supply and demand — increasing transparency
                across every stage of shared housing.
              </p>
              <p className='mt-4 text-sm leading-[1.7] text-[var(--muted-foreground)]'>
                After approval: move-in logistics are coordinated, lease clarity is confirmed, and
                all parties are aligned before occupancy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Ellieo Verified Standard: 프레임워크 3개 카테고리 ─── */
const VERIFIED_GROUPS = [
  {
    title: 'Listing Integrity',
    items: ['Physical Access Check', 'Room Condition Documentation', 'Utility & Amenity Audit'],
  },
  {
    title: 'Lease Clarity',
    items: ['Lease Term Confirmation', 'Application Process Oversight'],
  },
  {
    title: 'Participant Transparency',
    items: ['Identity Verification of Participants'],
    footer: (
      <>
        <p className='mt-4 text-sm leading-relaxed text-slate-400'>
          For students, a verified school email address is required during onboarding. For working
          professionals, professional identity transparency is supported through LinkedIn or
          Instagram account verification during onboarding.
        </p>
        <p className='mt-3 text-sm leading-relaxed text-slate-400'>
          Ellieo also provides built-in safety features, including user reporting tools and the
          ability to block unwanted messages. These safeguards are designed to reduce fraud, prevent
          harassment, and promote respectful communication within shared housing interactions.
        </p>
      </>
    ),
  },
]

function VerifiedStandardSection() {
  return (
    <section
      className='bg-[var(--surface)] pt-8 pb-20 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-28'
      aria-labelledby='verified-heading'
    >
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <h2
          id='verified-heading'
          className='text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl'
        >
          Ellieo Verified Standard
        </h2>
        <p className='mt-4 text-[var(--muted-foreground)] leading-relaxed'>
          Ellieo&apos;s Verified Standard establishes structured accountability across listings,
          participants, and lease processes. Rather than relying solely on digital postings, our
          framework enforces documentation standards, participant transparency, and structured
          coordination to reduce uncertainty in shared housing.
        </p>
        <div className='mt-12 rounded-3xl border border-[var(--border)] bg-[var(--foreground)] p-4 shadow-2xl sm:p-10 lg:p-12'>
          {/* 상단 2열: Listing Integrity, Lease Clarity */}
          <div className='grid grid-cols-1 gap-10 sm:grid-cols-2'>
            {VERIFIED_GROUPS.filter((g) => g.title !== 'Participant Transparency').map((group) => (
              <div key={group.title} className='space-y-4'>
                <h3 className='text-xs font-semibold uppercase tracking-widest text-[#00A5FF]'>
                  {group.title}
                </h3>
                <ul className='space-y-3'>
                  {group.items.map((item) => (
                    <li key={item} className='flex items-center gap-4 text-white'>
                      <span
                        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00A5FF]'
                        aria-hidden
                      >
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      </span>
                      <span className='font-medium'>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* 하단 풀폭: Participant Transparency */}
          <div className='mt-8 space-y-4 border-t border-white/10 pt-6 sm:mt-10 sm:pt-10'>
            {VERIFIED_GROUPS.filter((g) => g.title === 'Participant Transparency').map((group) => (
              <div key={group.title}>
                <h3 className='text-xs font-semibold uppercase tracking-widest text-[#00A5FF]'>
                  {group.title}
                </h3>
                <ul className='mt-4 space-y-3'>
                  {group.items.map((item) => (
                    <li key={item} className='flex items-center gap-4 text-white'>
                      <span
                        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00A5FF]'
                        aria-hidden
                      >
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      </span>
                      <span className='font-medium'>{item}</span>
                    </li>
                  ))}
                </ul>
                {'footer' in group && <div className='mt-4'>{group.footer}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Operational Business Model + New York City: 다크 배경(How we do it 스타일) 안으로 통합 ─── */
const REVENUE_ITEMS = [
  'Subscription-based access tiers for room seekers seeking verified visibility and structured roommate alignment',
  "Premium listing placements for agents and verified listers operating within New York City's competitive rental landscape",
  'AI-enhanced compatibility insights tailored to urban co-living dynamics',
  'Brokerage coordination partnerships aligned with New York City leasing practices',
]

function BusinessModelSection() {
  return (
    <section
      className='relative bg-[var(--foreground)] py-16 sm:py-20 lg:py-24'
      aria-labelledby='business-heading'
    >
      <div
        className='absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,165,255,0.15),transparent_50%)]'
        aria-hidden
      />
      <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16'>
          <div>
            <h2
              id='business-heading'
              className='text-2xl font-bold tracking-tight text-white sm:text-3xl'
            >
              Operational Business Model
            </h2>
            <p className='mt-4 text-white leading-relaxed'>
              Ellieo operates a hybrid, dual-sided revenue model designed for scalability within New
              York City&apos;s structured shared housing market.
            </p>
            <p className='mt-3 text-white'>Revenue streams include:</p>
            <ul className='mt-6 space-y-3'>
              {REVENUE_ITEMS.map((item) => (
                <li key={item} className='flex items-start gap-3'>
                  <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00A5FF]' aria-hidden />
                  <span className='min-w-0 text-sm font-medium text-white break-words sm:text-base'>{item}</span>
                </li>
              ))}
            </ul>
            <p className='mt-8 text-sm leading-relaxed text-slate-400'>
              By integrating technology infrastructure with real-world housing coordination in New
              York City, Ellieo monetizes both supply and demand participation within a regulated
              and high-density rental ecosystem.
            </p>
            <p className='mt-4 text-sm leading-relaxed text-slate-400'>
              This dual-sided revenue structure supports sustainable growth while maintaining
              structured operational oversight at the local level.
            </p>
          </div>
          <div>
            <h2
              id='presence-heading'
              className='text-2xl font-bold tracking-tight text-white sm:text-3xl'
            >
              New York Operational Base
            </h2>
            <p className='mt-4 text-base leading-relaxed text-white'>
              Ellieo maintains an active operational presence in New York City, coordinating listing
              intake, structured documentation workflows, partnership development, and resident
              support through local team members.
            </p>
            <p className='mt-4 text-base leading-relaxed text-white'>
              Our New York City base supports platform integrity, agent coordination, and shared housing
              oversight — ensuring that digital activity aligns with real-world housing processes.
            </p>
            <div
              className='relative mt-8 aspect-[2/1] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5'
              aria-hidden
            >
              <Image
                src='/img/map_2.png'
                alt='Map of New York City showing Ellieo operational base'
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 28rem'
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── CTA: 풀와이드 브랜드 섹션 ─── */
function CTASection() {
  return (
    <section
      className='relative overflow-hidden bg-[var(--foreground)] py-16 sm:py-20'
      aria-labelledby='cta-heading'
    >
      <div
        className='absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(0,165,255,0.25),transparent_60%)]'
        aria-hidden
      />
      <div className='relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8'>
        <h2 id='cta-heading' className='text-2xl font-bold tracking-tight text-white sm:text-3xl'>
          Purpose-built for New York City —
        </h2>
        <p className='mt-3 text-slate-400'>
          integrating verification, coordination, and structured shared housing operations.
        </p>
        <div className='mt-8'>
          <Link
            href='/contact'
            className='inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[var(--brand)]/30 transition hover:bg-[var(--brand-hover)] hover:shadow-[var(--brand)]/40 active:scale-[0.98]'
          >
            Contact us
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export function ServiceScreen() {
  return (
    <div className='min-h-screen bg-[var(--background)]'>
      <HeroSection />
      <WorkflowSection />
      <VerifiedStandardSection />
      <BusinessModelSection />
      <CTASection />
    </div>
  )
}
