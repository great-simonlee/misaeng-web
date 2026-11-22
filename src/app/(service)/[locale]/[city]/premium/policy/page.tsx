import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale, type Locale } from '@lib/i18n/locales'
import { getMessages } from '@lib/i18n/messages.server'
import { getT } from '@lib/i18n/server'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

/** /premium/policy — subscription & refund policy (owner 11-22: full refund within 7 days only, never partial). */

interface PolicyPageProps {
  params: Promise<{ locale: string; city: string }>
}

type Section = { h: string; p: string[] | Record<string, string> }
type PolicyCopy = { title: string; updated: string; note: string; sections: Section[] | Record<string, Section> }

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
