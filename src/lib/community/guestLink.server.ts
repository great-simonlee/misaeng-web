import { awardPostCredit } from '@lib/community/creditLedger'
import { isUnlinkedGuestCommunityPost } from '@lib/community/guest'
import {
  COMMUNITY_CREDIT_BONUS_RULES,
  COMMUNITY_CREDIT_TIMELINE_ENTRY,
  COMMUNITY_CREDIT_TIMELINE_POST_MAX,
} from '@lib/constants/communityCredit'
import {
  listStoredUnlinkedGuestPostsByEmail,
  saveStoredCommunityPost,
} from '@lib/supabase/community.server'
import {
  getStoredCommunityCreditAccount,
  isCommunityCreditStorageConfigured,
} from '@lib/supabase/communityCredit.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import type { CommunityPost } from '@/types/nyc'

/** 게스트 글 ↔ 계정 연결 (서버 전용) */

export type GuestLinkActor = {
  uid: string
  email: string
}

/** 타임라인 단계 수로 자동 적립될 크레딧 (첫 글 보너스 제외) */
export function estimateTimelinePostCredit(timelineCount: number): number {
  const steps = Math.max(0, Math.trunc(timelineCount || 0))
  return Math.min(
    steps * COMMUNITY_CREDIT_TIMELINE_ENTRY,
    COMMUNITY_CREDIT_TIMELINE_POST_MAX,
  )
}

export function firstPostBonusAmount(): number {
  return (
    COMMUNITY_CREDIT_BONUS_RULES.find((rule) => rule.id === 'first-post')
      ?.amount ?? 0
  )
}

async function readBalance(uid: string): Promise<number | null> {
  if (!isCommunityCreditStorageConfigured()) return null
  try {
    const account = await getStoredCommunityCreditAccount(uid)
    return account.balance
  } catch {
    return null
  }
}

/**
 * 게스트 글 하나를 계정에 연결하고 글 크레딧을 적립한다.
 * 닉네임은 게스트가 정한 것을 유지하고, 사진·학교는 프로필에서 채운다.
 */
export async function linkGuestPostToAccount(
  post: CommunityPost,
  actor: GuestLinkActor,
  options: { linkedBy: 'self' | 'admin'; linkedByEmail?: string | null },
): Promise<{ post: CommunityPost; creditAwarded: number }> {
  if (!post.guestAuthor) {
    throw new Error('게스트 글이 아니에요.')
  }
  if (post.authorUid && post.authorUid !== actor.uid) {
    throw new Error('이미 다른 계정에 연결된 글이에요.')
  }

  const profile = await getSupabaseProfile(actor.uid).catch(() => null)
  const now = Date.now()
  const linked: CommunityPost = {
    ...post,
    authorUid: actor.uid,
    authorEmail: actor.email || post.authorEmail || post.guestAuthor.email,
    authorNickname:
      post.authorNickname?.trim() ||
      post.guestAuthor.nickname ||
      profile?.nickname?.trim() ||
      null,
    authorPhotoURL:
      (typeof profile?.photoURL === 'string' && profile.photoURL.trim()) ||
      post.authorPhotoURL ||
      null,
    authorSchoolId:
      (typeof profile?.verifiedSchoolId === 'string' &&
        profile.verifiedSchoolId.trim()) ||
      post.authorSchoolId ||
      null,
    authorSchoolName:
      (typeof profile?.verifiedSchoolName === 'string' &&
        profile.verifiedSchoolName.trim()) ||
      post.authorSchoolName ||
      null,
    guestAuthor: {
      ...post.guestAuthor,
      linkedUid: actor.uid,
      linkedAt: post.guestAuthor.linkedAt ?? now,
      linkedBy: post.guestAuthor.linkedBy ?? options.linkedBy,
      linkedByEmail:
        options.linkedBy === 'admin'
          ? options.linkedByEmail?.trim() || post.guestAuthor.linkedByEmail
          : post.guestAuthor.linkedByEmail,
    },
  }

  const saved = await saveStoredCommunityPost(linked)

  let creditAwarded = 0
  try {
    const before = await readBalance(actor.uid)
    const account = await awardPostCredit({
      uid: actor.uid,
      postId: saved.id,
      boardId: saved.categoryId,
      timelineCount: saved.jobReviewTimeline.length,
    })
    if (account && before != null) {
      creditAwarded = Math.max(0, account.balance - before)
    }
  } catch (error) {
    console.error('Guest post link credit error:', error)
  }

  return { post: saved, creditAwarded }
}

/**
 * 로그인한 사용자의 이메일과 일치하는 미연결 게스트 글을 모두 연결한다.
 * 가입 직후(완료 화면)와 내 글 목록 조회 시 호출.
 */
export async function claimGuestPostsForAccount(
  actor: GuestLinkActor,
): Promise<{ posts: CommunityPost[]; creditAwarded: number }> {
  if (!actor.uid || !actor.email) return { posts: [], creditAwarded: 0 }

  const candidates = await listStoredUnlinkedGuestPostsByEmail(actor.email)
  const linked: CommunityPost[] = []
  let creditAwarded = 0

  for (const post of candidates) {
    if (!isUnlinkedGuestCommunityPost(post)) continue
    try {
      const result = await linkGuestPostToAccount(post, actor, {
        linkedBy: 'self',
      })
      linked.push(result.post)
      creditAwarded += result.creditAwarded
    } catch (error) {
      console.error('Guest post claim error:', post.id, error)
    }
  }

  return { posts: linked, creditAwarded }
}
