import {
  getHousingRoommateAffiliationLabel,
  getHousingRoommateComposition,
  getHousingRoommateRoomPreferenceLabel,
} from '@lib/constants/housingMock'
import { cn } from '@lib'
import type { HousingRoommateWaiting } from '@/types/nyc'
import { RoommateCompositionBadge } from '@widgets/nyc/HousingPostCard'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'

interface HousingRoommateIntroProps {
  roommate: HousingRoommateWaiting
  className?: string
}

export function HousingRoommateIntro({
  roommate,
  className,
}: HousingRoommateIntroProps) {
  const profiles = roommate.profiles
  if (profiles.length === 0) return null

  const composition = getHousingRoommateComposition(roommate)

  return (
    <BoardSurface
      as='section'
      className={cn('px-4 py-4 sm:px-5 sm:py-5', className)}
    >
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <h2 className='text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
          기다리는 룸메이트
        </h2>
        <RoommateCompositionBadge composition={composition} compact />
      </div>

      <ul className='mt-4 divide-y divide-[#eef0f3]'>
        {profiles.map((profile) => {
          const intro =
            profile.intro.trim() ||
            '자세한 소개는 문의 시 안내해 드려요.'
          const genderLabel = profile.gender === 'male' ? '남성' : '여성'
          const affiliationLabel = getHousingRoommateAffiliationLabel(
            profile.affiliation,
          )
          const preferences = profile.preferredRoomTypes
            .map(getHousingRoommateRoomPreferenceLabel)
            .join(' · ')

          return (
            <li
              key={profile.id}
              className='flex gap-3 py-3.5 first:pt-0 last:pb-0'
            >
              <div
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white',
                  profile.gender === 'male' ? 'bg-[#2563eb]' : 'bg-[#db2777]',
                )}
                aria-hidden
              >
                {profile.gender === 'male' ? 'M' : 'F'}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-[13px] font-semibold leading-snug text-[var(--foreground)]'>
                  {genderLabel}
                  <span className='font-medium text-[var(--muted)]'>
                    {' '}
                    · {affiliationLabel}
                  </span>
                  {preferences ? (
                    <span className='font-medium text-[var(--muted)]'>
                      {' '}
                      · {preferences}
                    </span>
                  ) : null}
                </p>
                <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                  {intro}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </BoardSurface>
  )
}
