'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type JobData = {
  title: string
  summary: string
  jobDescription: {
    roleOverview: string
    keyResponsibilities: string[]
  }
  requirements: string[]
  performanceCareerPath: string[]
}

const PARTNERSHIP_JOB: JobData = {
  title: 'Partnership & Operations Intern',
  summary:
    'Support partnership outreach, operations, and day-to-day execution as we scale Ellieo in New York City. Ideal for someone detail-oriented and eager to learn startup operations.',
  jobDescription: {
    roleOverview:
      'We are looking for a results-driven Partnership Intern to join our team in New York. This role is focused on the front-line expansion of our housing platform, Ellieo. You will be responsible for identifying potential housing providers and assisting students in discovering verified housing options. This is a hands-on role where your efforts in market outreach directly impact our growth in the New York City market.',
    keyResponsibilities: [
      'Identify potential housing partners, including independent landlords, property management companies, licensed real estate brokers, and co-living spaces across New York City.',
      'Visit potential properties to verify their condition and collect necessary visual/descriptive data for platform listing.',
      'Schedule and coordinate introductory meetings between senior management and potential partners.',
      'Represent Misaeng/Ellieo at campus events or student housing fairs to drive user community growth.',
      'Document outreach data and partnership leads in our internal CRM/tracking system.',
      'Prepare weekly reports on outreach success rates and partner feedback.',
      'Collaborate with the marketing team to align partnership pitches with current promotional campaigns.',
    ],
  },
  requirements: [
    'Proactive Mindset: A self-starter who takes initiative in identifying new opportunities and managing outreach.',
    'Communication: Superior verbal and written communication skills; comfortable engaging with various stakeholders.',
    'Availability: Must be able to commit to 10–20 hours per week (Flexible schedule; approx. 15 hours/week preferred).',
  ],
  performanceCareerPath: [
    'Weekly Individual Performance Meetings to review outreach activity, property data collection, and successful partner onboarding.',
    'Career Growth: High-performing interns will be considered for Full-time Operations or Management positions after a 2-month evaluation period.',
    'Assessment will be based on the accuracy of property information collected and the efficiency of partnership outreach.',
  ],
}

const MARKETING_JOB: JobData = {
  title: 'Marketing & Content Strategy Intern',
  summary:
    'Build Ellieo’s brand presence and community engagement through viral-ready content, social channels, and New York City trend-driven marketing. Ideal for someone creative and trend-savvy.',
  jobDescription: {
    roleOverview:
      'We are looking for a creative and trend-savvy Marketing Intern to join our team in New York. This role focuses on supporting Ellieo’s brand presence through AI-driven storytelling. Working closely with the Operations Manager, you will assist in creating content and managing social channels. This is a hands-on role where you will learn to use cutting-edge AI technology to fuel our user growth and platform credibility.',
    keyResponsibilities: [
      'AI-Powered Content Execution: Support the production of high-fidelity short-form videos (Reels/TikToks) by utilizing the Higgsfield Creator Plan under the guidance of the management team.',
      'Content Production: Script, film, and edit high-quality short-form videos (Reels/TikToks) focusing on New York City lifestyle, housing tips, and property showcases.',
      'Trend Analysis: Monitor and analyze the latest memes, social media trends, and New York City-specific viral topics to integrate them into our content calendar.',
      'Sales Support: Create visually compelling marketing materials (pitch decks, brochures) to assist the Partnership team in onboarding new housing providers.',
      'Community Engagement: Interact with student groups and international communities in New York City to foster trust and drive user acquisition.',
      'Brand Monitoring: Track engagement metrics and community feedback to optimize content performance and growth strategies.',
    ],
  },
  requirements: [
    'Creative Flair: Proficiency in video editing tools (CapCut or Premiere) and design platforms (Canva or Adobe).',
    'Trend Sensitivity: A deep understanding of Gen Z/Millennial digital culture and a "social-first" mindset.',
    'Communication: Strong storytelling skills with the ability to create witty, relatable, and professional copy.',
    'Availability: Must be able to commit to 10–20 hours per week (Flexible schedule; approx. 15 hours/week preferred).',
  ],
  performanceCareerPath: [
    'Weekly Creative Sync: Individual meetings to review content performance (engagement, reach) and brainstorm upcoming trend-based campaigns.',
    'Career Growth: High-performing interns will be considered for Full-time Creative Lead or Marketing Management positions after a 2-month evaluation period.',
    'Assessment: Based on the quality/consistency of content produced and the growth of Ellieo’s digital community engagement.',
  ],
}

const JOBS = [
  { key: 'partnership', job: PARTNERSHIP_JOB },
  { key: 'marketing', job: MARKETING_JOB },
] as const

function JobCard({ job, onClick }: { job: JobData; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F64310]/30 hover:shadow-md hover:shadow-[#F64310]/[0.06] sm:p-5'
    >
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F64310]'>
          Intern
        </p>
        <span className='rounded-full bg-[#F64310]/10 px-2.5 py-1 text-[10px] font-medium text-[#F64310]'>
          New York City Internship
        </span>
      </div>
      <h3 className='mt-3 line-clamp-2 text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
        {job.title}
      </h3>
      <p className='mt-2 line-clamp-3 text-xs leading-[1.5] text-[var(--muted-foreground)]'>
        {job.summary}
      </p>
      <span className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#F64310]'>
        View details
        <span className='transition group-hover:translate-x-0.5' aria-hidden>
          →
        </span>
      </span>
    </button>
  )
}

function JobDetailModal({ job, onClose }: { job: JobData; onClose: () => void }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className='fixed inset-0 z-[10001] flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='job-modal-title'
    >
      <div
        className='absolute inset-0 bg-[var(--foreground)]/50 backdrop-blur-sm'
        onClick={onClose}
        aria-hidden
      />
      <div className='relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-xl'>
        <div className='flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--background)] p-6 sm:p-8'>
          <div>
            <p className='text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F64310]'>
              Intern · New York City
            </p>
            <h2
              id='job-modal-title'
              className='mt-1 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'
            >
              {job.title}
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='shrink-0 cursor-pointer rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
            aria-label='Close'
          >
            <svg
              className='h-5 w-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto p-6 sm:p-8'>
          <div className='space-y-8'>
            <section>
              <h3 className='text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Job Description
              </h3>
              <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]'>
                {job.jobDescription.roleOverview}
              </p>
              <p className='mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Key Responsibilities
              </p>
              <ul className='mt-1.5 list-inside list-disc space-y-1 text-sm leading-relaxed text-[var(--muted-foreground)]'>
                {job.jobDescription.keyResponsibilities.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className='text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Requirements
              </h3>
              <ul className='mt-3 list-inside list-disc space-y-1 text-sm leading-relaxed text-[var(--muted-foreground)]'>
                {job.requirements.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className='text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Performance & Career Path
              </h3>
              <ul className='mt-3 list-inside list-disc space-y-1 text-sm leading-relaxed text-[var(--muted-foreground)]'>
                {job.performanceCareerPath.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className='mt-8 flex flex-wrap gap-3'>
            <a
              href='#apply'
              onClick={onClose}
              className='inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#F64310] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d93a0e]'
            >
              How to apply
            </a>
            <Link
              href='/contact'
              onClick={onClose}
              className='inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-elevated)]'
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CareersScreen() {
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null)

  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[var(--background)]'>
      {/* Hero */}
      <header className='bg-[var(--background)]'>
        <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10'>
          <div className='text-center sm:text-left'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
              Careers
            </p>
            <h1 className='mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]'>
              Join Misaeng
            </h1>
            <p className='mt-3 max-w-xl text-sm leading-[1.65] text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:leading-[1.7]'>
              We are building Ellieo—next-gen housing for New York City.{' '}
              <br className='hidden sm:block' /> We’re looking for driven interns to help us grow
              from the ground up.
            </p>
          </div>

          {/* Open positions – glass card */}
          <div
            className='mt-6 rounded-2xl border border-[var(--border)]/80 bg-[var(--surface)]/80 p-5 shadow-lg shadow-[var(--foreground)]/[0.03] backdrop-blur-xl sm:mt-8 sm:p-8'
            style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 92%, transparent)' }}
          >
            <p className='text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]'>
              Open positions
            </p>
            <p className='mt-3 text-sm leading-relaxed text-[var(--foreground)] sm:text-base'>
              <strong className='font-semibold text-[var(--foreground)]'>
                Partnership & Operations Intern
              </strong>
              —support partnership outreach and day-to-day execution. <br />
              <strong className='font-semibold text-[var(--foreground)]'>
                Marketing & Content Strategy Intern
              </strong>
              —shape our brand, content, and growth channels. Both roles are New York City-based and
              ideal for those eager to learn startup operations.
            </p>
            <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
              <a
                href='#apply'
                className='animate-shimmer inline-flex min-h-[48px] w-full min-w-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#F64310]/25 transition duration-300 hover:shadow-[#F64310]/35 active:scale-[0.98] sm:w-auto sm:min-w-[140px]'
              >
                How to apply
                <span className='text-white/90' aria-hidden>
                  ↓
                </span>
              </a>
              <Link
                href='/contact'
                className='inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition duration-200 hover:border-[var(--border-muted)] hover:bg-[var(--surface)] active:scale-[0.98] sm:w-auto'
              >
                Contact us
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Job cards – 4-column grid */}
      <section
        className='mx-auto max-w-7xl px-4 pt-6 pb-14 sm:px-6 sm:pt-8 sm:pb-20 lg:px-8'
        aria-labelledby='openings-heading'
      >
        <h2 id='openings-heading' className='sr-only'>
          Open positions
        </h2>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'>
          {JOBS.map(({ key, job }) => (
            <JobCard key={key} job={job} onClick={() => setSelectedJob(job)} />
          ))}
        </div>
      </section>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}

      <div className='h-4 sm:h-6' />

      {/* How to apply */}
      <section
        id='apply'
        className='z-20 rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)]/90 shadow-[0_-8px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl'
        aria-labelledby='apply-heading'
        style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 94%, transparent)' }}
      >
        <div className='mx-auto max-w-7xl px-5 py-5 sm:px-6 sm:py-6 lg:px-8'>
          <h2
            id='apply-heading'
            className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'
          >
            How to apply
          </h2>
          <p className='mt-2 text-sm leading-relaxed text-[var(--foreground)] sm:text-base'>
            Please send your <strong className='font-semibold'>resume</strong> and{' '}
            <strong className='font-semibold'>cover letter</strong> to the email below. We’ll get
            back to qualified candidates as we review applications.
          </p>
          <div className='mt-4 grid gap-4 sm:grid-cols-3 sm:gap-x-6'>
            <div className='flex flex-col gap-0.5 sm:gap-1'>
              <span className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Email
              </span>
              <a
                href='mailto:laura@misaeng.com'
                className='font-mono text-sm font-medium text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-2 transition hover:decoration-[#F64310]/50 hover:text-[#F64310]'
              >
                laura@misaeng.com
              </a>
            </div>
            <div className='flex flex-col gap-0.5 sm:gap-1'>
              <span className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Subject
              </span>
              <span className='font-mono text-sm text-[var(--foreground)]'>
                [Intern – Role] Your Name
              </span>
            </div>
            <div className='flex flex-col gap-0.5 sm:gap-1'>
              <span className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]'>
                Example
              </span>
              <span className='font-mono text-sm text-[var(--foreground)]'>
                [Partnership & Operations Intern] Jane Doe
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
