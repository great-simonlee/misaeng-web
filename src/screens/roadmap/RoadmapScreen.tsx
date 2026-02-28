import Image from 'next/image'
import Link from 'next/link'

export function RoadmapScreen() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Roadmap
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            NYC first—then we scale
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-[1.65] text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:leading-[1.7]">
            Ellieo launches in New York City in 2026. We’re building density and trust in one market
            first, then expanding to Boston, Chicago, and LA. Our roadmap is built for national
            scale—one city at a time.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-20 lg:px-8">
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
              NYC · 2026
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F64310]">
              Next markets
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-3 sm:text-base">
              After establishing our NYC operations and community, we plan to expand to Boston,
              Chicago, and LA—bringing the same verified, operations-first approach to each city.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F64310]" aria-hidden />
                Boston
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F64310]" aria-hidden />
                Chicago
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F64310]" aria-hidden />
                LA
              </span>
            </div>
            <Link
              href="https://ellieo.com/#early"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#F64310] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d93a0e] sm:w-auto"
            >
              Join Early Access
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
