import Link from 'next/link';
import Image from 'next/image';
import { BrandAppCards } from '@widgets/BrandApps';
import { Hero } from '@widgets/Hero';

/** 아이콘: 검증 배지 */
function IconVerified() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
      />
    </svg>
  );
}

/** 아이콘: 사람들 */
function IconRoommates() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
      />
    </svg>
  );
}

/** 아이콘: 방/집 */
function IconHome() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25'
      />
    </svg>
  );
}

/** 아이콘: 서류가방 (취업·비자) */
function IconBriefcase() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0'
      />
    </svg>
  );
}

/** 아이콘: 말풍선 (커뮤니티·중고거래) */
function IconChat() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155'
      />
    </svg>
  );
}

/** 두 플랫폼이 함께 제공하는 서비스 */
const SERVICES = [
  {
    title: 'Real Estate Brokerage',
    body: 'New York–licensed agents help you find, tour and lease apartments in New York City.',
    Icon: IconHome,
  },
  {
    title: 'Roommate Matching',
    body: 'Get matched by lifestyle, budget and location. Identity verification keeps everyone accountable.',
    Icon: IconRoommates,
  },
  {
    title: 'Jobs & Visa',
    body: 'In Misaeng: open positions, interview reviews, coffee chats with people already working here, and OPT and visa know-how.',
    Icon: IconBriefcase,
  },
  {
    title: 'Community & Marketplace',
    body: 'Boards for every part of life, plus a used-goods marketplace in the Misaeng app for buying and selling with neighbors.',
    Icon: IconChat,
  },
  {
    title: 'Verified & Safe',
    body: 'School email and identity checks, reporting and blocking, and safety rules built into every flow.',
    Icon: IconVerified,
  },
] as const;

/**
 * 회사 사이트 랜딩 페이지 (misaeng.com/)
 * - Hero: 두 앱 다운로드
 * - 아래: 미생(한국어·영어)·엘리오(베트남어·영어) 생활 플랫폼 소개와 서비스
 */
export function HomeScreen() {
  return (
    <div className='flex min-w-0 flex-col overflow-x-hidden'>
      <Hero />

      {/* We're hiring — compact CTA strip */}
      <section
        id='careers'
        className='relative overflow-hidden bg-[var(--foreground)] py-12 sm:py-20 md:py-24'
        aria-labelledby='careers-heading'
      >
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgb(var(--brand-rgb)/0.2),transparent)]' />
        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:gap-8 sm:text-left'>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-brand'>
                We&apos;re hiring
              </p>
              <h2
                id='careers-heading'
                className='mt-1.5 text-lg font-bold tracking-tight text-white sm:mt-2 sm:text-2xl'
              >
                Join Misaeng in New York City
              </h2>
              <p className='mt-1 max-w-xl text-sm text-white/80 sm:mt-1.5'>
                Partnership & Operations Intern. <br className='sm:hidden' />
                Marketing & Content Strategy Intern.{' '}
                <br className='sm:hidden' />
                <br className='sm:hidden' />
                Grow with us from the ground up.{' '}
              </p>
            </div>
            <Link
              href='/careers'
              className='shrink-0 rounded-full border-2 border-white bg-white px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition active:scale-[0.98] hover:border-white/90 hover:bg-white/95 sm:px-6 sm:py-3'
            >
              View open positions →
            </Link>
          </div>
        </div>
      </section>

      {/* Two platforms — Misaeng (Korean·English) and Ellieo (Vietnamese·English) */}
      <section
        id='platforms'
        className='relative overflow-hidden bg-[var(--background)] py-12 sm:py-20 md:py-24'
        aria-labelledby='platforms-heading'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-3xl text-center'>
            <span className='inline-block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand'>
              Our platforms
            </span>
            <h2
              id='platforms-heading'
              className='mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:mt-4 sm:text-4xl md:text-[2.75rem] md:leading-[1.15]'
            >
              Two everyday-life platforms,
              <br />
              <span className='text-brand'>in your language.</span>
            </h2>
            <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-4 sm:text-lg'>
              Misaeng LLC runs <strong className='font-semibold text-[var(--foreground)]'>Misaeng</strong> for
              Korean speakers and <strong className='font-semibold text-[var(--foreground)]'>Ellieo</strong> for
              Vietnamese speakers—both in English too. Housing, roommates and community in one app.
            </p>
          </div>
          <BrandAppCards className='mt-8 sm:mt-12' />
        </div>
      </section>

      {/* What you can do — services shared by both platforms */}
      <section
        id='our-service'
        className='relative overflow-hidden border-t border-[var(--border)] bg-[var(--background)] py-12 sm:py-20 md:py-24'
        aria-labelledby='services-heading'
      >
        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='grid gap-8 text-center sm:gap-12 sm:text-left lg:grid-cols-12 lg:gap-16'>
            <div className='lg:col-span-5'>
              <span className='inline-block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand'>
                What we do
              </span>
              <h2
                id='services-heading'
                className='mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:mt-4 sm:text-4xl md:text-[2.75rem] md:leading-[1.15]'
              >
                Everything for
                <br />
                <span className='text-brand'>life in a new city.</span>
              </h2>
              <p className='mt-3 text-sm text-[var(--muted-foreground)] sm:mt-4 sm:text-lg'>
                From finding a home and roommates
                <br className='sm:hidden' /> to your first job and your neighbors.
              </p>
            </div>
            <div className='grid gap-6 sm:grid-cols-2 sm:gap-8 lg:col-span-7 lg:pt-2'>
              {SERVICES.map((service) => (
                <div key={service.title} className='space-y-2'>
                  <div className='flex items-center justify-center gap-3 sm:justify-start'>
                    <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand sm:h-10 sm:w-10'>
                      <service.Icon />
                    </span>
                    <h3 className='text-base font-bold text-[var(--foreground)] sm:text-xl'>{service.title}</h3>
                  </div>
                  <p className='text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base'>
                    {service.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* New York City First — horizontal layout */}
      <section
        id='roadmap'
        className='relative border-t border-[var(--border)] bg-[var(--surface)] pt-12 pb-10 sm:pt-20 sm:pb-14 md:pt-24 md:pb-16'
        aria-labelledby='roadmap-heading'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='rounded-2xl shadow-[0_20px_50px_-16px_rgba(15,23,42,0.18)]'>
            <div className='grid grid-cols-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] md:grid-cols-[1.1fr_1fr]'>
            <div className='relative aspect-[16/10] w-full min-h-[180px] sm:min-h-[200px] md:aspect-auto md:min-h-[260px]'>
              <Image
                src='/img/banner_1.png'
                alt='New York City skyline'
                fill
                className='object-cover object-center'
                sizes='(max-width: 768px) 100vw, 55vw'
                priority={false}
              />
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 md:to-transparent' />
              <span className='absolute bottom-3 left-3 rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5'>
                New York City · Live now
              </span>
            </div>
            <div className='flex flex-col justify-center p-4 sm:p-6 md:p-7 lg:p-8'>
              <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-brand'>
                Roadmap
              </p>
              <h2
                id='roadmap-heading'
                className='mt-1.5 text-lg font-bold tracking-tight text-[var(--foreground)] sm:mt-2 sm:text-2xl md:text-3xl'
              >
                New York City first—then we scale
              </h2>
              <p className='mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-3 sm:text-base'>
                Misaeng&apos;s community is live in New York City and Boston.{' '}
                <br className='sm:hidden' /> Our housing and brokerage service starts in
                New York City and grows one city at a time—Boston, Chicago, and LA next.
              </p>
              <div className='mt-4 flex flex-wrap items-center gap-2 sm:mt-5'>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm'>
                  <span
                    className='h-1.5 w-1.5 rounded-full bg-brand'
                    aria-hidden
                  />
                  Boston
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm'>
                  <span
                    className='h-1.5 w-1.5 rounded-full bg-brand'
                    aria-hidden
                  />
                  Chicago
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm'>
                  <span
                    className='h-1.5 w-1.5 rounded-full bg-brand'
                    aria-hidden
                  />
                  LA
                </span>
                <Link
                  href='/roadmap'
                  className='inline-flex items-center gap-1 text-xs font-semibold text-brand transition hover:text-brand-hover sm:text-sm'
                >
                  Full roadmap
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Partners — light CTA */}
      <section
        id='partners'
        className='relative bg-[var(--surface)] pt-10 pb-6 sm:pt-14 sm:pb-8 md:pt-16 md:pb-10'
        aria-labelledby='partners-heading'
      >
        <div className='mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8'>
          <h2
            id='partners-heading'
            className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-4xl'
          >
            Partner with Misaeng &amp; Ellieo
          </h2>
          <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:text-lg'>
            Landlords and strategic partners: <br className='sm:hidden' /> we’re
            building the future of verified, <br className='sm:hidden' />{' '}
            student-friendly housing together. <br />
            <br className='sm:hidden' /> Get in touch to list properties,{' '}
            <br className='sm:hidden' /> explore integrations, or join our
            ecosystem.
          </p>
          <Link
            href='/contact'
            className='mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition active:scale-[0.98] hover:bg-brand-hover hover:shadow-xl hover:shadow-brand/30 sm:mt-8 sm:px-8 sm:py-3.5'
          >
            Partner Inquiry
          </Link>
        </div>
      </section>
    </div>
  );
}
