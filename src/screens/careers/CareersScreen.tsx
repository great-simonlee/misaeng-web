export function CareersScreen() {
  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16'>
      <section className='space-y-6'>
        <div className='space-y-3'>
          <p className='text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400'>
            Careers
          </p>
          <h1 className='text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl md:text-4xl'>
            Part-time Marketers (NYC-based)
          </h1>
          <p className='text-sm leading-relaxed text-zinc-600'>
            Ahead of our full launch, we are looking for{' '}
            <span className='font-semibold text-zinc-900'>part-time marketers</span> to help us
            validate real demand and channels in New York. This is a hands-on role where you shape
            and read the earliest market signals.
          </p>
          <div className='inline-flex items-center gap-2 rounded-full border border-[#FF6C25]/40 bg-[#FF6C25]/10 px-4 py-2 text-xs text-[#FF6C25]'>
            <span className='h-1.5 w-1.5 rounded-full bg-[#FF6C25]' />
            Currently hiring · Market research &amp; early traction
          </div>
        </div>
      </section>

      <section className='grid gap-8 text-sm text-zinc-600 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'>
        <div className='space-y-6 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm'>
          <div className='space-y-2'>
            <h2 className='text-sm font-semibold text-zinc-50'>
              Role: Part-time Marketer (New York)
            </h2>
            <p className='text-xs text-zinc-400'>
              Location: New York &amp; nearby / Type: Part-time · Contract · Freelance (flexible)
            </p>
          </div>

          <div className='space-y-3'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400'>
              Responsibilities
            </h3>
            <ul className='space-y-2 text-sm leading-relaxed text-zinc-600'>
              <li>· Identify and test channels to reach Korean/Asian residents in or moving to NYC</li>
              <li>· Recruit early users for interviews and surveys via community, schools, and workplaces</li>
              <li>· Use this beta website to run landing page experiments and measure conversion</li>
              <li>· Support co-marketing ideas with partner brokers/buildings</li>
              <li>· Share on-the-ground insights with the team on a regular basis</li>
            </ul>
          </div>

          <div className='space-y-3'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400'>
              Requirements
            </h3>
            <ul className='space-y-2 text-sm leading-relaxed text-zinc-600'>
              <li>· Based in NYC or with deep familiarity with the NYC community</li>
              <li>· Korean fluency preferred, with working English communication</li>
              <li>· Experience in marketing, community building, or sales is a plus</li>
              <li>· Able to commit at least 10 hours per week</li>
            </ul>
          </div>

          <div className='space-y-3'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400'>
              Compensation
            </h3>
            <ul className='space-y-2 text-sm leading-relaxed text-zinc-600'>
              <li>· Hourly or project-based compensation, depending on experience and network</li>
              <li>· Early joiners may receive additional incentives or strong references after launch</li>
              <li>· Remote / hybrid is possible, with occasional in-person meetings at Rockefeller Plaza</li>
            </ul>
          </div>
        </div>

        <div className='space-y-5'>
          <div className='rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400'>
              How to apply
            </h3>
            <p className='mt-3 text-sm leading-relaxed text-zinc-600'>
              Please send a brief application and resume including the points below:
            </p>
            <ul className='mt-3 space-y-2 text-sm leading-relaxed text-zinc-600'>
              <li>· Short self-introduction (what you do now, and your connection to NYC)</li>
              <li>· Relevant experience (marketing, community, sales, etc.)</li>
              <li>· Weekly availability and preferred working style</li>
              <li>· Contact details (Kakao / email)</li>
            </ul>
            <div className='mt-4 rounded-2xl border border-[#FF6C25]/40 bg-[#FF6C25]/10 p-3 text-xs text-zinc-900'>
              <p className='font-semibold'>Example</p>
              <p className='mt-1'>
                Email: careers@example.com
                <br />
                Subject: [Part-time Marketer] Your name / Location
              </p>
            </div>
          </div>

          <div className='rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 text-xs text-zinc-600 shadow-sm'>
            <p className='font-semibold text-zinc-900'>Purpose of this job posting</p>
            <p className='mt-2 leading-relaxed'>
              This posting is for a real part-time hiring need and also serves as a clear signal of
              our intent to employ. It is written so that even an immigration officer can see that
              this is not a generic statement, but a role with concrete responsibilities and
              expectations.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

