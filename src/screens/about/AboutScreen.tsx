export function AboutScreen() {
  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16'>
      <section className='grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] md:items-start'>
        <div className='space-y-6'>
          <p className='text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400'>
            About Us
          </p>
          <h1 className='text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl md:text-4xl'>
            Redesigning the New York housing experience with operations and data.
          </h1>
          <p className='text-sm leading-relaxed text-zinc-600'>
            In one of the most complex rental markets in the world, we are building an{' '}
            <span className='font-semibold text-zinc-900'>operations-first housing platform</span>{' '}
            that serves both residents and building owners. Our goal is not just to show &quot;nice
            looking apartments&quot;, but to surface homes that people are genuinely happy living in.
          </p>
          <p className='text-sm leading-relaxed text-zinc-600'>
            We are currently in the pre-launch phase, validating the core product and UI/UX through
            market research and user interviews. This website is also designed to transparently show
            the{' '}
            <span className='font-semibold text-zinc-900'>
              real corporate structure and technical investment behind misaeng
            </span>
            .
          </p>
        </div>

        <div className='space-y-5 rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.75)]'>
          <div className='text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400'>
            Operations Manager
          </div>
          <div className='flex items-center gap-4'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-zinc-100 via-zinc-300 to-zinc-500 text-lg font-semibold text-zinc-900 shadow-[0_0_40px_rgba(250,250,250,0.75)]'>
              Ain
            </div>
            <div className='space-y-1'>
              <p className='text-sm font-semibold text-zinc-50'>Ain</p>
              <p className='text-xs text-zinc-400'>Operations Manager · New York</p>
              <p className='text-xs leading-relaxed text-zinc-400'>
                Ain leads day-to-day operations in New York, including building management
                relationships, move-in processes, partnerships, and compliance.
              </p>
            </div>
          </div>
          <div className='space-y-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-50'>
            <p className='font-semibold'>Clear separation of operational responsibility</p>
            <p className='mt-1 leading-relaxed'>
              All on-the-ground operations in the U.S. – resident support, building communication,
              and local partnerships – are handled by{' '}
              <span className='font-semibold'>Operations Manager Ain</span>. The founder/investor
              focuses on strategy and capital allocation and is explicitly not the direct operational
              owner in the U.S.
            </p>
          </div>
          <div className='grid gap-3 text-xs text-zinc-300 sm:grid-cols-2'>
            <div className='rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400'>
                Office
              </p>
              <p className='mt-1 text-zinc-100'>
                45 Rockefeller Plaza{', '}
                <br />
                New York, NY 10111
              </p>
              <p className='mt-2 text-[11px] text-zinc-500'>
                The office is set up to host resident meetings and partner sessions in a consistent,
                professional environment.
              </p>
            </div>
            <div className='rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400'>
                Tech & Investment
              </p>
              <p className='mt-1 text-[11px] leading-relaxed text-zinc-300'>
                A significant portion of the initial USD 120k investment has been allocated to
                product design, engineering, and UX research – including the interactive map
                interface, data model for listings, and review/community features.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-8 border-t border-zinc-200 pt-8 text-sm text-zinc-600 md:grid-cols-3'>
        <div className='space-y-2'>
          <h2 className='text-sm font-semibold text-zinc-900'>Our Mission</h2>
          <p className='leading-relaxed'>
            Our first mission is simple: when someone arrives in New York, we want to make sure
            housing is not the reason they feel lost. We reduce the risk and friction of the first
            months by combining transparent information with reliable operations.
          </p>
        </div>
        <div className='space-y-2'>
          <h2 className='text-sm font-semibold text-zinc-900'>What Makes Us Different</h2>
          <p className='leading-relaxed'>
            We are not just surfacing &quot;nice looking units&quot;. We care about resident
            reviews, building management feedback, and actual lease terms. Every decision is anchored
            to one question: &quot;Will people still be glad they live here after six months?&quot;
          </p>
        </div>
        <div className='space-y-2'>
          <h2 className='text-sm font-semibold text-zinc-900'>For Immigration Officers</h2>
          <p className='leading-relaxed'>
            This site is not just a landing page. It also acts as a transparent business plan,
            exposing our real office address, operations lead, hiring plans, and product investment.
            Every UI element here is part of our preparation for a formal launch.
          </p>
        </div>
      </section>
    </div>
  )
}

