import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { MISAENG_DESIGN } from '@lib/brand/design'
import { isLocale, type Locale } from '@lib/i18n/locales'
import { getMessages } from '@lib/i18n/messages.server'
import { getT } from '@lib/i18n/server'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

/** /premium/policy — subscription & refund policy (owner 11-22: full refund within 7 days only, never partial). */

interface PolicyPageProps {
  params: Promise<{ locale: string; city: string }>
}

type Section = { h: string; p: string[] | Record<string, string> }
type PolicyCopy = { title: string; updated: string; note: string; contents?: string; sections: Section[] | Record<string, Section> }

// The message loader merges locales key by key, so arrays can come back as { '0': …, '1': … }.
const list = <T,>(value: T[] | Record<string, T>): T[] => (Array.isArray(value) ? value : Object.values(value))

const resolve = (locale: string): Locale => (isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale)

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const t = await getT(resolve((await params).locale), 'premium')
  return { title: t('policy.metaTitle') }
}

export default async function PremiumPolicyPage({ params }: PolicyPageProps) {
  const messages = (await getMessages(resolve((await params).locale))) as { premium?: { policy?: PolicyCopy } }
  const policy = messages.premium?.policy
  if (!policy) return null
  if (MISAENG_DESIGN) {
    // Misaeng: white document card with a sticky contents list beside it on desktop
    const sections = list(policy.sections)
    return (
      <BoardPageShell width='wide'>
        <div className='w-full pb-20 pt-4 sm:pt-5 lg:pt-6'>
          <header className='flex flex-col gap-2'>
            <h1 className='text-[1.75rem] font-bold tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.1rem]'>{policy.title}</h1>
            <p className='text-[13px] text-[var(--muted)]'>{policy.updated}</p>
          </header>
          <div className='mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10'>
            <nav aria-label={policy.contents} className='hidden lg:order-2 lg:block'>
              <div className='sticky top-24 rounded-[20px] bg-white p-4 ring-1 ring-black/[0.05]'>
                {policy.contents ? <p className='px-2 pb-2 text-[12px] font-bold text-[var(--muted)]'>{policy.contents}</p> : null}
                <ol className='flex flex-col gap-0.5'>
                  {sections.map((section, i) => (
                    <li key={section.h}>
                      <a
                        href={`#policy-${i + 1}`}
                        className='block rounded-xl px-2 py-2 text-[13.5px] font-medium text-[var(--muted-foreground)] transition hover:bg-[#f4f5f7] hover:text-[var(--foreground)]'
                      >
                        {section.h}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
            <article className='flex flex-col gap-8 rounded-[28px] bg-white px-6 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_36px_-22px_rgba(15,23,42,0.25)] ring-1 ring-black/[0.04] sm:px-10 sm:py-10'>
              {sections.map((section, i) => (
                <section key={section.h} id={`policy-${i + 1}`} className='flex scroll-mt-24 flex-col gap-2.5'>
                  <h2 className='flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>
                    <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/[0.1] text-[12px] font-bold tabular-nums text-[var(--brand)]'>
                      {i + 1}
                    </span>
                    {section.h}
                  </h2>
                  {list(section.p).map((line) => (
                    <p key={line} className='max-w-[68ch] text-[15px] leading-[1.75] text-[var(--muted-foreground)]'>
                      {line}
                    </p>
                  ))}
                </section>
              ))}
              <p className='rounded-2xl bg-[#FFF6EE] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{policy.note}</p>
            </article>
          </div>
        </div>
      </BoardPageShell>
    )
  }
  return (
    <BoardPageShell>
      <article className='mx-auto flex w-full max-w-[720px] flex-col gap-8 px-1 pb-20 pt-6'>
        <header className='flex flex-col gap-2'>
          <h1 className='text-[30px] font-black tracking-tight text-[var(--foreground)]'>{policy.title}</h1>
          <p className='text-[13px] text-[var(--muted)]'>{policy.updated}</p>
        </header>
        {list(policy.sections).map((section) => (
          <section key={section.h} className='flex flex-col gap-2.5'>
            <h2 className='text-[19px] font-extrabold tracking-tight text-[var(--foreground)]'>{section.h}</h2>
            {list(section.p).map((line) => (
              <p key={line} className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
                {line}
              </p>
            ))}
          </section>
        ))}
        <p className='rounded-2xl bg-[#FFF6EE] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{policy.note}</p>
      </article>
    </BoardPageShell>
  )
}
