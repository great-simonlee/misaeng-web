import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'

type Props = {
  params: Promise<{ locale: string; city: string }>
}

/**
 * Ellieo credit top-up (the app's "Top up" opens ellieo.com/credits). Ellieo has no Stripe account yet, so this is a
 * "coming soon" page; credits are added by the Ellieo team for now (ERP → Licensed Agents → Credits).
 */
const TEXT = {
  en: {
    title: 'Top up credits',
    badge: 'Coming soon',
    body: 'Buying Ellieo credits online is coming soon. 1 credit = $1. Credits pay for brokered listings, Premium spots and more.',
    help: 'Need credits now? Email info@ellieo.com and our team will add them to your account.',
  },
  vi: {
    title: 'Nạp credit',
    badge: 'Sắp có',
    body: 'Tính năng mua credit Ellieo trực tuyến sắp ra mắt. 1 credit = $1. Credit dùng để đăng tin qua môi giới, vị trí Premium và nhiều hơn nữa.',
    help: 'Cần credit ngay? Gửi email tới info@ellieo.com, đội ngũ Ellieo sẽ thêm vào tài khoản của bạn.',
  },
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: (locale === 'vi' ? TEXT.vi : TEXT.en).title }
}

export default async function EllieoCreditsPage({ params }: Props) {
  if (BRAND_CONFIG.theme !== 'ellieo') notFound()
  const { locale } = await params
  const text = locale === 'vi' ? TEXT.vi : TEXT.en
  return (
    <main className='mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center'>
      <span className='rounded-full bg-[#FFD60A] px-3 py-1 text-xs font-bold text-[#12131A]'>{text.badge}</span>
      <h1 className='mt-4 text-3xl font-bold text-[#12131A]'>{text.title}</h1>
      <p className='mt-3 text-base text-[#3A4256]'>{text.body}</p>
      <p className='mt-6 text-sm text-[#5B6070]'>
        {text.help.split('info@ellieo.com')[0]}
        <a className='font-semibold text-[#0057D9]' href='mailto:info@ellieo.com'>
          info@ellieo.com
        </a>
        {text.help.split('info@ellieo.com')[1]}
      </p>
    </main>
  )
}
