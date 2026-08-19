import Link from 'next/link'

export function PrivacyPolicyScreen() {
  return (
    <div className='flex flex-1 flex-col bg-[var(--background)]'>
      <article className='mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          LEGAL
        </p>
        <h1 className='mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl'>
          Privacy Policy
        </h1>
        <p className='mt-2 text-sm text-[var(--muted)]'>
          Last updated: August 14, 2026
        </p>

        <div className='mt-8 space-y-6 text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              1. Information We Collect
            </h2>
            <p>
              We may collect account information (such as email and profile
              details), content you submit, verification-related information you
              choose to provide, and basic usage data needed to operate the
              Services.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              2. How We Use Information
            </h2>
            <p>
              We use information to provide and improve Misaeng NYC, enable
              community features, communicate with you, prevent abuse, and
              comply with legal obligations.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              3. Sharing
            </h2>
            <p>
              We do not sell your personal information. We may share information
              with service providers that help us operate the platform, or when
              required by law.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              4. Data Security & Retention
            </h2>
            <p>
              We take reasonable measures to protect information. No method of
              transmission or storage is completely secure. We retain data only
              as long as needed for the purposes described in this Policy.
            </p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-base font-semibold text-[var(--foreground)]'>
              5. Contact
            </h2>
            <p>
              Privacy inquiries:{' '}
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
