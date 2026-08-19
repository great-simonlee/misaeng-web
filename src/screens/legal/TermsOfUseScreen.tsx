import Link from 'next/link'

export function TermsOfUseScreen() {
  return (
    <div className='flex flex-1 flex-col bg-[var(--background)]'>
      <article className='mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          LEGAL
        </p>
        <h1 className='mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl'>
          Terms of Use
        </h1>
        <p className='mt-2 text-sm text-[var(--muted)]'>
          Last updated: August 14, 2026
        </p>

        <div className='mt-8 space-y-6 text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Misaeng NYC and related Misaeng services
              (the &quot;Services&quot;), you agree to these Terms of Use. If
              you do not agree, please do not use the Services.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              2. Community Use
            </h2>
            <p>
              You are responsible for the content you post. Do not post
              unlawful, fraudulent, harassing, or misleading content. Misaeng
              may remove content or restrict accounts that violate these Terms
              or community guidelines.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              3. Housing & Listings
            </h2>
            <p>
              Listings and community posts are provided for informational
              purposes. You should independently verify listings, counterparties,
              and transaction details before making any commitment.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              4. Accounts
            </h2>
            <p>
              You must provide accurate information and keep your login
              credentials secure. You are responsible for activity under your
              account.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              5. Contact
            </h2>
            <p>
              Questions about these Terms:{' '}
              <a
                href='mailto:info@misaeng.com'
                className='font-medium text-[#F64310] underline-offset-2 hover:underline'
              >
                info@misaeng.com
              </a>
            </p>
          </section>
        </div>

        <Link
          href='/nyc'
          className='mt-10 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#F64310] touch-manipulation hover:underline'
        >
          ← Back to NYC
        </Link>
      </article>
    </div>
  )
}
