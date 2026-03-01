import Image from 'next/image'
import Link from 'next/link'

/* ─── Single source of truth: roadmap data (update here for future edits) ─── */
const ROADMAP = {
  launchCity: { city: 'New York City', year: 2026 },
  nextMarkets: ['Boston', 'Chicago', 'LA'],
  trustSystem:
    '.edu email verification, LinkedIn verification, and Verified agent and licensed professional standards.',
  cityPhases: [
    {
      year: '2026',
      label: 'Launch & Prove',
      title: 'New York City',
      description:
        'Full launch in New York City. We build density and trust first, then replicate our verified operations-first playbook in every new market.',
      microLine: 'Density before geography.',
    },
    {
      year: '2027',
      label: 'Expand',
      title: 'Boston',
      description:
        'Boston only. Same verified, operations-first model. Expansion only after New York City density and operational playbooks are proven.',
    },
    {
      year: '2028',
      label: 'Scale',
      title: 'Chicago · LA',
      description:
        'Expansion to Chicago and LA with the same verified operational model.',
    },
    {
      year: '2029+',
      label: 'Nationwide',
      title: 'Nationwide',
      description:
        'Additional cities and product expansion. Ellieo becomes the go-to platform for verified shared housing across the US.',
    },
  ],
  cityTimeline: [
    { year: 2026, cities: ['New York City'] },
    { year: 2027, cities: ['New York City', 'Boston'] },
    { year: 2028, cities: ['New York City', 'Boston', 'Chicago', 'LA'] },
    { year: '2029+', cities: ['New York City', 'Boston', 'Chicago', 'LA', 'Nationwide'] },
  ],
  productMilestones: [
    {
      label: 'MVP Launch',
      time: '2025 Q4',
      details: 'Listing registration, .edu verification, LinkedIn verification.',
    },
    {
      label: 'Full Service v1',
      time: '2026 Q1',
      details: 'Agent license registration & verification, roommate status updates, profile photo required.',
    },
    {
      label: 'Full Service v2',
      time: '2026 Q2',
      details: 'User reviews, AI matching, behavioral compatibility insights.',
    },
    {
      label: 'Maintenance',
      time: '2026 Q3',
      details: 'Ongoing improvements and maintenance.',
    },
    {
      label: 'Break-even target',
      time: '2026 Q4',
      details: 'Target profitability.',
    },
  ],
  kpis: [
    { label: 'Launch city', value: 'New York City', sub: '2026', targetLabel: 'Target' },
    { label: 'Target cities', value: 'Nationwide', sub: 'By 2029+', targetLabel: 'New York City → Boston → Chicago, LA → Nationwide' },
    { label: 'Ellieo professional agents', value: '20+', sub: 'By 2026', targetLabel: 'Target' },
    { label: 'Gross Lease Value (GLV)', value: '$5M+', sub: 'Target', targetLabel: 'Target' },
    { label: 'Revenue', value: '$500K+', sub: 'By 2026', targetLabel: 'Target' },
    { label: 'Break-even', value: '2026 Q4', sub: 'Target', targetLabel: 'Target' },
  ],
  growthPillars: [
    {
      title: 'Supply density',
      subheadline: 'Verified Agents and verified listings first.',
      description:
        'We onboard Verified Agents and prioritize verified listings before expanding demand—building inventory depth and consistent quality in each neighborhood.',
      microLine: 'Operations-first supply in every new city.',
      icon: 'building',
    },
    {
      title: 'Demand growth',
      subheadline: 'Campus partnerships, ambassadors, and community.',
      description:
        'We grow demand through university partnerships, ambassadors, and community. .edu and LinkedIn verification build trust and improve conversion from first click to tour.',
      icon: 'users',
    },
    {
      title: 'Platform intelligence',
      subheadline: 'Matching, fraud signals, and lease clarity.',
      description:
        'Structured profiles and behavior signals improve compatibility and reduce mismatched leads. Fraud signals and standardized lease flows scale trust without sacrificing speed.',
      icon: 'sparkles',
    },
    {
      title: 'Ecosystem partnerships',
      subheadline: 'Brokerage, institutional, and brand partnerships.',
      description:
        'We partner with brokerages and local operators to strengthen supply and execution. Brands and institutions help users move faster from discovery to move-in.',
      icon: 'handshake',
    },
  ],
  growthLoop:
    'Verified Supply → Trusted Demand → Recurring Transactions → Brokerage & Investment Expansion',
  buildingInPublic: [
    {
      label: 'MVP Launch',
      value: '2025 Q4',
      details: 'Listing + .edu + LinkedIn verification',
    },
    {
      label: 'Full Service v1',
      value: '2026 Q1',
      details: 'License verification, roommate status, photo required',
    },
    {
      label: 'Full Service v2',
      value: '2026 Q2',
      details: 'Reviews, AI matching, behavioral compatibility insights',
    },
    {
      label: 'Break-even target',
      value: '2026 Q4',
      details: 'Target profitability',
    },
  ],
} as const

function PhaseIcon({ icon }: { icon: string }) {
  const className = 'h-5 w-5 sm:h-6 sm:w-6'
  switch (icon) {
    case 'building':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case 'users':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    case 'handshake':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

export function RoadmapScreen() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ─── Hero ─── */}
      <header className="bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Roadmap
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            New York City first. Then we scale.
          </h1>
          <p className="mt-2 text-sm font-medium text-[#F64310] sm:text-base">
            Rental is the backbone of real estate cash flow and client relationships.
            <br />
            New York is where we build density, trust, and operational control.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-[1.65] text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:leading-[1.7]">
            We prove density, trust, and operational playbooks in New York before expanding to
            Boston, Chicago, and LA—one verified city at a time. Our trust system is built on{' '}
            {ROADMAP.trustSystem}
          </p>
        </div>
      </header>

      {/* ─── Next markets card ─── */}
      <section
        className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-16 lg:px-8"
        aria-labelledby="nyc-first-heading"
      >
        <h2 id="nyc-first-heading" className="sr-only">
          New York City first
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg md:grid md:grid-cols-[1.1fr_1fr]">
          <div className="relative aspect-[16/10] w-full min-h-[180px] sm:min-h-[200px] md:aspect-auto md:min-h-[280px]">
            <Image
              src="/img/banner_1.png"
              alt="New York City skyline"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 55vw"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 md:to-transparent" />
            <span className="absolute bottom-3 left-3 rounded-full bg-[#F64310] px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5">
              {ROADMAP.launchCity.city} · {ROADMAP.launchCity.year}
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F64310]">
              Next markets
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-3 sm:text-base">
              Expansion to Boston, Chicago, and LA happens only after New York City density and operating
              playbooks are proven. Same verified, operations-first approach in each city.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ROADMAP.nextMarkets.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F64310]" aria-hidden />
                  {city}
                </span>
              ))}
            </div>
            <Link
              href="https://ellieo.com/#early"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#F64310] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d93a0e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F64310] focus-visible:ring-offset-2 sm:w-auto"
            >
              Join Early Access
            </Link>
          </div>
        </div>
      </section>

      {/* ─── From one city to many: phases + city bar + product milestones ─── */}
      <section
        className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--surface)] py-14 sm:py-20 lg:py-24"
        aria-labelledby="phases-heading"
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F64310]">
            Future growth
          </p>
          <h2 id="phases-heading" className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-4xl">
            From one city to many
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
            Prove rental density and operational control in New York City (2025 Q4 MVP through 2026 full service), then replicate city by city. Product milestones and city expansion aligned.
          </p>

          {/* Phase timeline: 2026, 2027, 2028+ ─── */}
          <div className="mt-10 sm:mt-14 lg:mt-16">
            <div className="flex flex-col gap-0 lg:grid lg:grid-cols-4 lg:gap-8">
              {ROADMAP.cityPhases.map((phase) => (
                <div
                  key={phase.year}
                  className="relative flex gap-6 pb-12 last:pb-0 lg:flex-col lg:gap-4 lg:pb-0"
                >
                  <div className="relative z-10 flex shrink-0 items-start gap-4 lg:flex-col lg:gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#F64310] bg-[var(--background)] text-[#F64310] lg:h-16 lg:w-16 lg:border-[3px]">
                      <span className="text-xs font-bold sm:text-sm lg:text-base">{phase.year}</span>
                    </div>
                    <div className="min-w-0 flex-1 lg:flex-none">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        {phase.label}
                      </p>
                      <h3 className="mt-0.5 text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl lg:text-2xl">
                        {phase.title}
                      </h3>
                    </div>
                  </div>
                  <p className="ml-[52px] text-sm leading-[1.65] text-[var(--muted-foreground)] sm:ml-[56px] lg:ml-0 lg:mt-2">
                    {phase.description}
                  </p>
                  {'microLine' in phase && phase.microLine && (
                    <p className="ml-[52px] mt-2 text-xs font-semibold text-[#F64310] sm:ml-[56px] lg:ml-0">
                      {phase.microLine}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* City expansion + Product milestones: two rows ─── */}
          <div className="mt-14 flex flex-col gap-8 sm:mt-16 lg:gap-10">
            {/* Row 1: City expansion timeline */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                City expansion timeline
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                One city at a time—verified operations before scale.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8">
                {ROADMAP.cityTimeline.map((row) => {
                  const cities = row.cities
                  const placeholders = 5 - cities.length
                  return (
                    <div
                      key={row.year}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <span className="w-14 shrink-0 text-xs font-medium text-[var(--foreground)] sm:w-20 sm:text-sm">
                        {row.year}
                      </span>
                      <div className="flex flex-1 flex-wrap gap-1 sm:grid sm:grid-cols-5">
                        {cities.map((city) => (
                          <span
                            key={city}
                            className="rounded-lg bg-[#F64310] px-3 py-2 text-xs font-semibold text-white sm:text-sm"
                          >
                            {city}
                          </span>
                        ))}
                        {placeholders > 0 &&
                          Array.from({ length: placeholders }).map((_, i) => (
                            <span
                              key={`ph-${i}`}
                              className="rounded-lg bg-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] sm:text-sm"
                            >
                              —
                            </span>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Row 2: Product milestones */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Product milestones
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                2025 Q4 MVP through 2026 Q4 break-even target.
              </p>
              <div className="mt-6 flex flex-col gap-2 overflow-x-auto sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
                {ROADMAP.productMilestones.map((m) => (
                  <div
                    key={m.time}
                    className="flex min-w-0 shrink-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:flex-1 sm:min-w-[140px]"
                  >
                    <span className="text-xs font-bold tabular-nums text-[#F64310] sm:text-sm">
                      {m.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {m.label}
                      </p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">{m.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Key metrics at a glance ─── */}
      <section
        className="border-t border-[var(--border)] bg-[var(--background)] pt-10 pb-6 sm:pt-14 sm:pb-8 lg:pt-16 lg:pb-10"
        aria-labelledby="key-numbers-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F64310]">
            By the numbers
          </p>
          <h2 id="key-numbers-heading" className="mt-1.5 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl lg:text-3xl">
            Key metrics at a glance
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm">
            KPI targets from our business plan. Numbers update as we hit them.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-3 lg:gap-5">
            {ROADMAP.kpis.map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-sm sm:p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {item.targetLabel}
                </p>
                <p className="mt-1.5 flex flex-wrap items-baseline gap-1 text-2xl font-bold tabular-nums tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-4xl">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--foreground)]">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{item.sub}</p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--border)]" aria-hidden>
                  <div className="h-full w-full rounded-r-full bg-[#F64310]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How we grow: 4 pillars (no top border, flows from Key metrics) ─── */}
      <section
        className="bg-[var(--background)] pb-10 pt-8 sm:pb-14 sm:pt-10 lg:pb-16 lg:pt-12"
        aria-labelledby="pillars-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F64310]">
            Four pillars
          </p>
          <h2 id="pillars-heading" className="mt-1.5 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl lg:text-3xl">
            How we grow
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm">
            We scale city by city with an operations-first model that builds trust, density, and
            repeatable playbooks.
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)] sm:text-base">
            Rental density is our engine. Operational control is our moat.
          </p>

          {/* Growth loop: hero strip ─── */}
          <div
            className="relative mt-6 overflow-hidden rounded-xl bg-[var(--foreground)] py-4 px-5 sm:mt-8 sm:py-5 sm:px-6"
            aria-hidden
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(246,67,16,0.15),transparent_60%)]" />
            <p className="relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs font-medium tracking-wide text-white sm:gap-x-2 sm:text-sm">
              {ROADMAP.growthLoop.split(/\s*→\s*/).map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-[#F64310]" aria-hidden> → </span>}
                  <span>{part}</span>
                </span>
              ))}
            </p>
          </div>

          {/* 4 pillars: 테이블형 레이아웃 (데스크톱 4열×3행 / 모바일 카드 스택) ─── */}
          <div className="mt-6 sm:mt-8">
            {/* 모바일: 필러별 카드 스택 */}
            <div className="flex flex-col gap-3 lg:hidden">
              {ROADMAP.growthPillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F64310]/10 text-[#F64310]">
                      <PhaseIcon icon={pillar.icon} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">{pillar.title}</h3>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[var(--foreground)]">
                    {pillar.subheadline}
                  </p>
                  <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                    {pillar.description}
                  </p>
                  {'microLine' in pillar && pillar.microLine && (
                    <p className="mt-2 text-[11px] font-semibold text-[#F64310]">{pillar.microLine}</p>
                  )}
                </div>
              ))}
            </div>

            {/* 데스크톱: 4열 × 3행 테이블 */}
            <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] lg:block">
              <div className="grid grid-cols-4">
                {/* Row 1: 헤더 (아이콘 + 제목) */}
                {ROADMAP.growthPillars.map((pillar, i) => (
                  <div
                    key={`${pillar.title}-head`}
                    className={`flex flex-col items-center border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center ${i < 3 ? 'border-r border-[var(--border)]' : ''}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F64310]/10 text-[#F64310]">
                      <PhaseIcon icon={pillar.icon} />
                    </div>
                    <h3 className="mt-2 text-sm font-bold tracking-tight text-[var(--foreground)]">
                      {pillar.title}
                    </h3>
                  </div>
                ))}
                {/* Row 2: 서브헤드라인 */}
                {ROADMAP.growthPillars.map((pillar, i) => (
                  <div
                    key={`${pillar.title}-sub`}
                    className={`border-b border-[var(--border)] px-4 py-3 ${i < 3 ? 'border-r border-[var(--border)]' : ''}`}
                  >
                    <p className="text-xs font-medium text-[var(--foreground)]">
                      {pillar.subheadline}
                    </p>
                  </div>
                ))}
                {/* Row 3: 본문 */}
                {ROADMAP.growthPillars.map((pillar, i) => (
                  <div
                    key={`${pillar.title}-body`}
                    className={`px-4 py-3.5 ${i < 3 ? 'border-r border-[var(--border)]' : ''}`}
                  >
                    <p className="text-xs leading-[1.6] text-[var(--muted-foreground)]">
                      {pillar.description}
                    </p>
                    {'microLine' in pillar && pillar.microLine && (
                      <p className="mt-2 text-[11px] font-semibold text-[#F64310]">
                        {pillar.microLine}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Building in public: product milestone tracker ─── */}
      <section
        className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--foreground)] py-14 sm:py-20"
        aria-labelledby="milestones-heading"
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(246,67,16,0.12),transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="milestones-heading"
            className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Building in public
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-white/70 sm:text-base">
            Milestones are tracked publicly. Execution over promises.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {ROADMAP.buildingInPublic.map((m) => (
              <div
                key={m.value}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  {m.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {m.value}
                </p>
                <p className="mt-2 text-sm text-white/80">{m.details}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section
        className="border-t border-[var(--border)] bg-[var(--surface)] py-14 sm:py-20"
        aria-labelledby="roadmap-cta-heading"
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2
            id="roadmap-cta-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl"
          >
            Stay ahead of our expansion
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
            Access verified listings and structured roommate matching before public scale.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="https://ellieo.com/#early"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#F64310] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#F64310]/25 transition hover:bg-[#d93a0e] hover:shadow-[#F64310]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F64310] focus-visible:ring-offset-2 sm:w-auto"
            >
              Join New York City Early Access
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-8 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F64310] focus-visible:ring-offset-2 sm:w-auto"
            >
              Partner Inquiry
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
