'use client'

import { useMemo, useState, type ReactNode } from 'react'

import { AuthorBadges, PhotoLightbox, type PhotoLightboxItem } from '@components'
import { useCity } from '@hooks/useCity'
import { hrefForCommunityPost } from '@lib/constants/cities'
import { communityBoardKey } from '@lib/constants/nyc'
import {
  formatRoommateBudget,
  getRoommateFormConfigText,
  getRoommateLookingForLabel,
  getRoommateLookingForStyle,
  getRoommateTimeline,
  isRoommateOffer,
  normalizeRoommateLookingFor,
} from '@lib/community/roommate'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardMetaChip, BoardSurface } from '@widgets/nyc/BoardPageShell'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { RoommateBoostPanel } from '@widgets/nyc/RoommateBoostPanel'
import { getRoommatePhotoUrls, useRoommateDateLine } from '@widgets/nyc/RoommatePostCard'

type RoommateDetailContentProps = {
  post: CommunityPost
  boardTitle: string
  isAuthor: boolean
  onDelete: () => void
  /** 번역 표시 + 원문 보기 (번역된 글일 때만 그려진다) */
  translationNotice?: ReactNode
  /** 원문/번역 글자의 언어 (lang 속성) */
  contentLang?: string
}

/** 룸메이트·서블렛 상세: 사진 · 핵심 정보 · 본문 · 연락/안전 안내 · 작성자 상단 노출 */
export function RoommateDetailContent({
  post,
  boardTitle,
  isAuthor,
  onDelete,
  translationNotice,
  contentLang,
}: RoommateDetailContentProps) {
  const t = useT('housing')
  const tCommunity = useT('community')
  const format = useFormat()
  const city = useCity()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const lookingFor = normalizeRoommateLookingFor(post.roommateLookingFor, post.detail)
  const style = getRoommateLookingForStyle(lookingFor)
  const typeLabel = getRoommateLookingForLabel(lookingFor, t)
  const formText = getRoommateFormConfigText(lookingFor, t)
  const offer = isRoommateOffer(lookingFor)
  const budget = formatRoommateBudget(post.roommateBudgetMax)
  const dateLine = useRoommateDateLine(post)
  const { ended, availableNow } = getRoommateTimeline(post)
  const location = post.location?.trim() || ''
  const bodyHtml = post.contentHtml || `<p>${post.description}</p>`
  const loginNext = hrefForCommunityPost(post, city)

  const photos = useMemo<PhotoLightboxItem[]>(
    () =>
      getRoommatePhotoUrls(post).map((imageUrl, index) => ({
        id: `photo-${index}`,
        imageUrl,
      })),
    [post],
  )

  const facts: { label: string; value: string; emphasize?: boolean }[] = [
    budget && {
      label: offer ? t('roommate.detail.rent') : t('roommate.detail.budget'),
      value: t('roommate.card.pricePerMonth', { price: budget }),
      emphasize: true,
    },
    dateLine && {
      label:
        post.roommateMoveInDate && post.roommateMoveOutDate
          ? t('roommate.detail.stay')
          : post.roommateMoveInDate
            ? (formText?.moveInStartLabel ?? t('roommate.detail.stay'))
            : (formText?.moveInEndLabel ?? t('roommate.detail.stay')),
      value: dateLine,
    },
    location && {
      label:
        formText?.locationLabel ??
        tCommunity(communityBoardKey('roommate', 'locationLabel')),
      value: location,
    },
  ].filter(Boolean) as { label: string; value: string; emphasize?: boolean }[]

  return (
    <article>
      <BoardSurface as='div' className='overflow-hidden'>
        {photos.length > 0 ? (
          <PhotoGallery
            photos={photos}
            label={t('roommate.detail.viewPhoto')}
            onOpen={setLightboxIndex}
          />
        ) : null}

        <div className='border-b border-black/[0.04] bg-gradient-to-b from-white to-[#fafbfc] px-5 py-5 sm:px-8 sm:py-7'>
          <div className='flex flex-wrap items-center gap-2'>
            <BoardMetaChip>{boardTitle}</BoardMetaChip>
            {typeLabel ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                  style.badge,
                )}
              >
                {typeLabel}
              </span>
            ) : null}
            {ended ? (
              <BoardMetaChip>{t('roommate.card.ended')}</BoardMetaChip>
            ) : availableNow ? (
              <BoardMetaChip tone='work'>{t('roommate.card.availableNow')}</BoardMetaChip>
            ) : null}
          </div>

          <h1
            lang={contentLang}
            className='mt-3.5 text-[1.55rem] font-semibold leading-[1.25] tracking-[-0.035em] text-[var(--foreground)] sm:text-[1.9rem]'
          >
            {post.title}
          </h1>
          {translationNotice ? <div className='mt-1.5'>{translationNotice}</div> : null}

          <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]'>
            <AuthorBadges
              schoolId={post.authorSchoolId}
              workplaceVerified={post.authorWorkplaceVerified}
              instagramVerified={post.authorInstagramVerified}
            />
            <span>{format.relative(post.createdAt)}</span>
            <span aria-hidden className='opacity-40'>·</span>
            <span>{tCommunity('detail.views', { n: format.number(post.viewCount, { notation: 'compact' }) })}</span>
          </div>

          {facts.length > 0 ? (
            <dl
              className={cn(
                'mt-5 grid overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05]',
                facts.length === 3 ? 'sm:grid-cols-3' : facts.length === 2 ? 'sm:grid-cols-2' : null,
              )}
            >
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className='border-b border-black/[0.05] px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0'
                >
                  <dt className='text-[11px] font-medium text-[var(--muted)]'>{fact.label}</dt>
                  <dd
                    className={cn(
                      'mt-0.5 text-[15px] font-semibold tabular-nums leading-snug',
                      fact.emphasize ? 'text-[var(--brand)]' : 'text-[var(--foreground)]',
                    )}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div lang={contentLang} className='px-5 py-6 sm:px-8 sm:py-8'>
          <CommunityRichBody html={bodyHtml} />
        </div>

        {!isAuthor ? (
          <div className='space-y-3 px-5 pb-6 sm:px-8 sm:pb-8'>
            <div className='rounded-2xl bg-[#f7f8fa] px-4 py-3.5'>
              <p className='text-[13px] font-semibold text-[var(--foreground)]'>
                {t('roommate.detail.contactTitle')}
              </p>
              <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
                {t('roommate.detail.contactBody')}
              </p>
            </div>
            <SafetyNotice />
          </div>
        ) : null}

        <CommunityPostFooter
          post={post}
          boardId='roommate'
          isAuthor={isAuthor}
          loginNext={loginNext}
          onDelete={onDelete}
        />
      </BoardSurface>

      {isAuthor ? <RoommateBoostPanel postId={post.id} className='mt-4' /> : null}

      <PhotoLightbox
        open={lightboxIndex !== null}
        items={photos}
        index={lightboxIndex ?? 0}
        eyebrow={t('roommate.detail.photos')}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </article>
  )
}

/** 대표 사진 크게 + 나머지 썸네일 (최대 6장) */
function PhotoGallery({
  photos,
  label,
  onOpen,
}: {
  photos: PhotoLightboxItem[]
  label: string
  onOpen: (index: number) => void
}) {
  const [cover, ...rest] = photos
  return (
    <div className='bg-[#f4f5f7] p-1.5 sm:p-2'>
      <div className={cn('grid gap-1.5 sm:gap-2', rest.length > 0 && 'sm:grid-cols-[2fr_1fr]')}>
        <PhotoButton photo={cover} label={label} onClick={() => onOpen(0)} className='aspect-[4/3]' />
        {rest.length > 0 ? (
          <div className='grid grid-cols-5 gap-1.5 sm:grid-cols-2 sm:content-start sm:gap-2'>
            {rest.map((photo, index) => (
              <PhotoButton
                key={photo.id}
                photo={photo}
                label={label}
                onClick={() => onOpen(index + 1)}
                className='aspect-square'
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PhotoButton({
  photo,
  label,
  onClick,
  className,
}: {
  photo: PhotoLightboxItem
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className={cn(
        'block w-full overflow-hidden rounded-xl bg-[#e8eaee] touch-manipulation transition hover:opacity-90',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.imageUrl} alt='' className='h-full w-full object-cover' />
    </button>
  )
}

function SafetyNotice() {
  const t = useT('housing')
  const items = ['item1', 'item2', 'item3', 'item4'] as const
  return (
    <div className='rounded-2xl bg-[#fff8eb] px-4 py-3.5 ring-1 ring-[#f5d9a8]/70'>
      <p className='flex items-center gap-1.5 text-[13px] font-semibold text-[#92400e]'>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          className='size-4 shrink-0'
          aria-hidden
        >
          <path strokeLinejoin='round' d='M12 3 2.5 20h19L12 3Z' />
          <path strokeLinecap='round' d='M12 10v4.5M12 17.2v.1' />
        </svg>
        {t('roommate.safety.title')}
      </p>
      <ul className='mt-2 space-y-1.5 text-[12px] leading-relaxed text-[#78350f]'>
        {items.map((key) => (
          <li key={key} className='flex gap-2'>
            <span aria-hidden className='mt-[0.55em] size-1 shrink-0 rounded-full bg-current opacity-60' />
            <span>{t(`roommate.safety.${key}`)}</span>
          </li>
        ))}
      </ul>
      <p className='mt-2 text-[12px] font-medium text-[#92400e]'>{t('roommate.safety.report')}</p>
    </div>
  )
}
