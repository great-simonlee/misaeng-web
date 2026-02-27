import Link from 'next/link'

export function HomeScreen() {
  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16'>
      <section className='grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center'>
        <div className='space-y-6'>
          <p className='text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400'>
            Ready engine, paused rocket
          </p>
          <h1 className='text-balance text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl md:text-5xl'>
            Official Launching in Spring 2026
          </h1>
          <p className='text-lg leading-relaxed text-zinc-600'>
            misaeng is a{' '}
            <span className='font-semibold text-zinc-900'>high-end rental platform for NYC</span>,
            connecting residents to curated, institutional-grade buildings. The engine is already
            built – we are currently running a{' '}
            <span className='font-semibold text-zinc-900'>beta version for market research only</span>
            , right before ignition.
          </p>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='inline-flex items-center gap-2 rounded-full border border-[#FF6C25]/40 bg-[#FF6C25]/10 px-4 py-2 text-xs text-[#FF6C25]'>
              <span className='h-1.5 w-1.5 rounded-full bg-[#FF6C25] shadow-[0_0_12px_rgba(255,108,37,0.9)]' />
              Coming Soon to NYC
            </div>
            <span className='text-xs text-zinc-400'>
              This is a beta version for market research purposes only.
            </span>
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-600'>
            <span className='rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1'>
              No payments · No contracts yet
            </span>
            <span className='rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1'>
              Real buildings · Simulated flow
            </span>
          </div>
        </div>

        <div className='relative'>
          <div className='pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(248,113,38,0.08),transparent_60%)] opacity-90 blur-3xl' />
          <div className='relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]'>
            <div className='flex items-center justify-between border-b border-zinc-100 px-4 py-3 text-xs text-zinc-500'>
              <span className='font-semibold tracking-[0.18em] text-zinc-700'>
                NYC INTERACTIVE MAP
              </span>
              <span className='rounded-full bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-500'>
                Prototype · Beta
              </span>
            </div>
            <div className='grid h-64 grid-cols-[1.2fr_minmax(0,1fr)] gap-px bg-zinc-100 p-3 sm:h-72'>
              <div className='space-y-3 rounded-2xl bg-linear-to-br from-orange-100 via-white to-sky-50 p-3 sm:p-4'>
                <div className='flex items-center justify-between text-[11px] text-zinc-600'>
                  <span className='font-medium uppercase tracking-[0.18em]'>Manhattan Focus</span>
                  <span className='rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-500'>
                    Drag · Hover · Filter (Concept)
                  </span>
                </div>
                <div className='mt-1 flex gap-2 text-[11px]'>
                  <span className='rounded-full bg-zinc-900 text-white px-2 py-1'>
                    Midtown
                  </span>
                  <span className='rounded-full bg-zinc-100 px-2 py-1 text-zinc-700'>
                    Downtown
                  </span>
                  <span className='rounded-full bg-zinc-100 px-2 py-1 text-zinc-700'>
                    Upper West · East
                  </span>
                </div>
                <div className='mt-2 grid flex-1 grid-cols-3 grid-rows-3 gap-2 text-[10px] text-zinc-900'>
                  <div className='col-span-2 row-span-2 rounded-2xl border border-[#FF6C25]/40 bg-linear-to-br from-[#FFEDD5] via-white to-sky-50 p-2 shadow-[0_0_40px_rgba(255,108,37,0.35)]'>
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold'>Midtown</span>
                      <span className='rounded-full bg-white px-2 py-0.5 text-[9px] text-zinc-600'>
                        High Demand
                      </span>
                    </div>
                    <p className='mt-1 text-[10px] text-zinc-700'>
                      Class A rental buildings around Rockefeller, Bryant Park, Columbus Circle.
                    </p>
                    <div className='mt-2 flex items-center justify-between text-[10px] text-zinc-700'>
                      <span>Avg. $4,200 · 1BR</span>
                      <span className='text-xs font-semibold'>12 beta listings</span>
                    </div>
                  </div>
                  <div className='rounded-xl border border-sky-200 bg-linear-to-br from-sky-100 via-sky-50 to-white p-2'>
                    <div className='flex items-center justify-between'>
                      <span>Downtown</span>
                      <span className='h-1.5 w-1.5 rounded-full bg-sky-400' />
                    </div>
                    <p className='mt-1 text-[10px] text-zinc-700'>
                      FiDi · Tribeca · SoHo
                    </p>
                  </div>
                  <div className='rounded-xl border border-purple-200 bg-linear-to-br from-purple-100 via-purple-50 to-white p-2'>
                    <div className='flex items-center justify-between'>
                      <span>Uptown</span>
                      <span className='h-1.5 w-1.5 rounded-full bg-purple-400' />
                    </div>
                    <p className='mt-1 text-[10px] text-zinc-700'>
                      Upper West · Upper East
                    </p>
                  </div>
                  <div className='col-span-3 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-[10px] text-zinc-600'>
                    <span>
                      We are designing an interface that lets you filter by{' '}
                      <span className='font-semibold text-zinc-900'>budget, commute, and lifestyle</span>{' '}
                      on a live NYC map.
                    </span>
                  </div>
                </div>
              </div>
              <div className='flex flex-col gap-3 rounded-2xl bg-white p-3 sm:p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700'>
                    Beta Listings
                  </span>
                  <span className='rounded-full bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500'>
                    Market Research Only
                  </span>
                </div>
                <p className='text-[11px] leading-relaxed text-zinc-600'>
                  These are{' '}
                  <span className='font-semibold text-zinc-900'>sample listing cards</span> designed
                  from real NYC pricing and building specs. All data here is for research and UX
                  validation only.
                </p>
                <div className='space-y-2 text-xs'>
                  <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-3'>
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-zinc-900'>
                        Midtown · Luxury Rental
                      </span>
                      <span className='rounded-full bg-[#FF6C25]/5 px-2 py-0.5 text-[10px] text-[#FF6C25]'>
                        1BR · 650ft²
                      </span>
                    </div>
                    <p className='mt-1 text-[11px] text-zinc-600'>
                      Concierge · Gym · Rooftop · No Broker Fee (Concept)
                    </p>
                    <div className='mt-2 flex items-center justify-between'>
                      <span className='text-sm font-semibold text-zinc-900'>$4,200 / month</span>
                      <button
                        type='button'
                        disabled
                        className='cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500'
                      >
                        Available after official launch
                      </button>
                    </div>
                  </div>
                  <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-3'>
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-zinc-900'>
                        Downtown · River View
                      </span>
                      <span className='rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-700'>
                        Studio · 480ft²
                      </span>
                    </div>
                    <p className='mt-1 text-[11px] text-zinc-600'>
                      Waterfront · Lounge · Co-working Space (Concept)
                    </p>
                    <div className='mt-2 flex items-center justify-between'>
                      <span className='text-sm font-semibold text-zinc-900'>$3,300 / month</span>
                      <button
                        type='button'
                        disabled
                        className='cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500'
                      >
                        Payments disabled in beta
                      </button>
                    </div>
                  </div>
                </div>
                <p className='mt-1 text-[10px] text-zinc-500'>
                  * All listing cards are UX test examples only. No real contracts or payments are
                  processed here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-8 border-t border-zinc-200 pt-8 md:grid-cols-3'>
        <div className='space-y-3'>
          <h2 className='text-sm font-semibold text-zinc-900'>Prepared Engine</h2>
          <p className='text-sm leading-relaxed text-zinc-600'>
            The core engine – data model, building review system, and leasing flows – is already
            designed and largely implemented. What you see here is the interface sitting on top of
            that work.
          </p>
        </div>
        <div className='space-y-3'>
          <h2 className='text-sm font-semibold text-zinc-900'>Holding Rocket</h2>
          <p className='text-sm leading-relaxed text-zinc-600'>
            We are in the final checks – aligning regulation, legal, and building partnerships
            before ignition. The UI/UX here is being validated so that we can accelerate from day
            one of launch.
          </p>
        </div>
        <div className='space-y-3'>
          <h2 className='text-sm font-semibold text-zinc-900'>Immigration Ready</h2>
          <p className='text-sm leading-relaxed text-zinc-600'>
            We surface our real New York office address, operations lead, hiring plan, and product
            investment on the site so that anyone – including immigration officers – can see this is
            a real, operating business.
          </p>
          <Link
            href='/about'
            className='inline-flex items-center text-sm font-medium text-[#FF6C25] underline-offset-4 hover:underline'
          >
            Learn more about misaeng
          </Link>
        </div>
      </section>
    </div>
  )
}

