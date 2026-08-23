'use client'

import Link from 'next/link'

import { NYC_PARTNER_ORGS } from '@lib/constants/nyc'
import { MisaengNyInstagramDmCallout } from '@widgets/nyc/MisaengNyInstagramDmCallout'
import { PartnerSchoolLogo } from '@widgets/nyc/PartnerSchoolLogo'

export function PartnerSchoolsScreen() {
  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_42%,#ffffff_100%)]'>
      <div className='mx-auto max-w-lg px-5 pb-12 pt-8 sm:px-6 sm:pt-10'>
        <p className='text-[12px] font-medium text-[var(--muted)]'>
          협력 학교 한인 학생회
        </p>
        <h1 className='mt-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          파트너 학생회
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          NYC 한인 학생회와 함께하는 소식을 모아 볼 예정이에요.
        </p>

        <ul className='mt-6 overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
          {NYC_PARTNER_ORGS.map((org, index) => {
            const row = (
              <div className='flex items-center gap-3 px-5 py-4'>
                <PartnerSchoolLogo
                  shortName={org.shortName}
                  logoSrc={org.logoSrc}
                  size='md'
                />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                    {org.name}
                  </p>
                  <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                    {org.handle ? `@${org.handle}` : '프로필 준비 중'}
                  </p>
                </div>
              </div>
            )

            return (
              <li
                key={org.id}
                className={
                  index === NYC_PARTNER_ORGS.length - 1
                    ? undefined
                    : 'border-b border-[#f0f1f3]'
                }
              >
                {org.handle ? (
                  <a
                    href={`https://instagram.com/${org.handle}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block touch-manipulation transition active:bg-[#f8f9fb]'
                  >
                    {row}
                  </a>
                ) : (
                  row
                )}
              </li>
            )
          })}
        </ul>

        <MisaengNyInstagramDmCallout message='파트너 학생회 문의는 인스타그램' />

        <div className='mt-8 text-center'>
          <Link
            href='/nyc'
            className='text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]'
          >
            커뮤니티 홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
