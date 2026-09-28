import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import { claimGuestPostsForAccount } from '@lib/community/guestLink.server'
import { isCommunityStorageConfigured } from '@lib/supabase/community.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 로그인한 계정의 이메일과 같은 이메일로 남긴 미연결 게스트 글을 이 계정에 연결하고
 * 글 크레딧을 적립한다. 가입 완료 화면·내 글 목록에서 호출.
 */
export async function POST() {
  if (!isCommunityStorageConfigured()) {
    return NextResponse.json({ posts: [], creditAwarded: 0 })
  }
  const user = await resolveAuthenticatedUser()
  if (!user?.uid || !user.email) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  try {
    const result = await claimGuestPostsForAccount({
      uid: user.uid,
      email: user.email,
    })
    return NextResponse.json({
      posts: result.posts.map((post) =>
        sanitizeAnonymousCommunityPost(post, user.uid),
      ),
      creditAwarded: result.creditAwarded,
    })
  } catch (error) {
    console.error('Guest post claim error:', error)
    return NextResponse.json(
      { error: '게스트 글 연결에 실패했어요.' },
      { status: 500 },
    )
  }
}
