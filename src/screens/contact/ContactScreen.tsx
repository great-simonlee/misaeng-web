export function ContactScreen() {
  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16'>
      <section className='grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]'>
        <div className='space-y-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400'>
            Contact
          </p>
          <h1 className='text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl'>
            Not launched yet, but fully reachable.
          </h1>
          <p className='text-sm leading-relaxed text-zinc-600'>
            Even before the official launch, we are open to conversations on partnerships, housing
            interest, hiring, and investment. Reach out via the channels below and our Operations
            Manager in New York will review first.
          </p>

          <div className='grid gap-4 text-sm text-zinc-300 sm:grid-cols-2'>
            <div className='space-y-1'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400'>
                US Office
              </p>
              <p className='text-zinc-900'>
                45 Rockefeller Plaza
                <br />
                New York, NY 10111
              </p>
            </div>
            <div className='space-y-1'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400'>
                Contact
              </p>
              <p>Email: info@example.com</p>
              <p>Kakao: misaeng_us</p>
            </div>
          </div>

          <div className='rounded-2xl border border-[#FF6C25]/40 bg-[#FF6C25]/10 p-3 text-xs text-zinc-900'>
            <p className='font-semibold'>Before we launch</p>
            <p className='mt-1 leading-relaxed'>
              This website is a beta version for market research. No contracts, payments, or
              legally-binding agreements are executed online. All communication is for information
              and consultation purposes only.
            </p>
          </div>
        </div>

        <div className='rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm'>
          <h2 className='text-sm font-semibold text-zinc-900'>Leave a message (Beta)</h2>
          <p className='mt-2 text-xs leading-relaxed text-zinc-500'>
            This form is a UX prototype only. Actual message delivery will be enabled after the
            official launch.
          </p>
          <form className='mt-4 space-y-4 text-sm'>
            <div className='space-y-1'>
              <label htmlFor='name' className='text-xs text-zinc-300'>
                Name
              </label>
              <input
                id='name'
                name='name'
                type='text'
                disabled
                className='w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed'
                placeholder='Available after official launch'
              />
            </div>
            <div className='space-y-1'>
              <label htmlFor='email' className='text-xs text-zinc-300'>
                Email
              </label>
              <input
                id='email'
                name='email'
                type='email'
                disabled
                className='w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed'
                placeholder='Available after official launch'
              />
            </div>
            <div className='space-y-1'>
              <label htmlFor='message' className='text-xs text-zinc-300'>
                Message
              </label>
              <textarea
                id='message'
                name='message'
                rows={4}
                disabled
                className='w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed'
                placeholder='This is a beta version for market research purposes only.'
              />
            </div>
            <button
              type='button'
              disabled
              className='mt-2 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed'
            >
              Available after official launch
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

