'use client'

import type { ReactNode } from 'react'

import { SchoolBadge, UserAvatar } from '@components'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import type { CommunityPost } from '@/types/nyc'

type ListingAuthorMetaProps = {
  post: CommunityPost
  /** 닉네임 옆 학교 인증 배지 */
  showSchool?: boolean
  /** 작성자 뒤에 붙는 조회수·시간 등 */
  children?: ReactNode
}

/** 목록 카드용 작성자(프로필 사진 + 닉네임) */
export function ListingAuthorMeta({
  post,
  showSchool = false,
  children,
}: ListingAuthorMetaProps) {
  const authorName = getCommunityAuthorDisplayName(post)
  const authorInitial = authorName.charAt(0).toUpperCase()
  const authorPhoto = post.authorPhotoURL?.trim() || null

  return (
    <span className='inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5'>
      <UserAvatar
        photoURL={authorPhoto}
        initial={authorInitial}
        size='sm'
        className='!h-5 !w-5 text-[9px]'
      />
      <span className='max-w-[7.5rem] truncate font-semibold text-[var(--muted-foreground)] sm:max-w-[10rem]'>
        {authorName}
      </span>
      {showSchool ? (
        <SchoolBadge schoolId={post.authorSchoolId} size='author' />
      ) : null}
      {children ? (
        <>
          <span className='text-black/20' aria-hidden>
            ·
          </span>
          {children}
        </>
      ) : null}
    </span>
  )
}
