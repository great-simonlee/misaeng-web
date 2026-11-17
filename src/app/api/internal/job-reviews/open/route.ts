import { NextResponse } from 'next/server'

import { mentorSummary, syncAutoMentor } from '@lib/points/coffeeChatMentors.server'
import { getStoredCommunityPost, patchStoredCommunityPost } from '@lib/supabase/community.server'
import { isVerificationInternalRequest, reviewerEmailFrom } from '@lib/verification/internalAuth.server'
import type { CommunityPost } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Career questions / coffee chats on one interview·job review, set by an admin (ellieo-erp, header x-internal-secret).
 *   GET  ?postId=                                                          → state
 *   POST { postId, reviewerEmail, questionsOpen?, coffeeChatOpen? }        → state after saving
 * state = { questionsOpen, coffeeChatOpen, hasAuthor, mentor: { active, takesCoffee, takesQuestions, source, consented } | null }
 * Same post fields the author sets on the last write step (missing = open). Saving re-runs the author's automatic
 * mentor row, like an author edit. A coffee chat also needs the author to be an active mentor (shown in `mentor`).
 */
async function state(post: CommunityPost) {
  const authorUid = String(post.authorUid || '').trim()
  return {
    questionsOpen: post.jobReviewQuestionsOpen !== false,
    coffeeChatOpen: post.jobReviewCoffeeChatOpen !== false,
    hasAuthor: Boolean(authorUid),
    mentor: authorUid ? await mentorSummary(authorUid) : null,
  }
}

async function jobReview(postId: string) {
  const post = postId ? await getStoredCommunityPost(postId) : null
  if (!post) return { error: NextResponse.json({ error: 'Post not found.' }, { status: 404 }) }
  if (post.categoryId !== 'job-review') {
    return { error: NextResponse.json({ error: 'Only interview / job reviews take questions or coffee chats.' }, { status: 400 }) }
  }
  return { post }
}

export async function GET(request: Request) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const found = await jobReview(String(new URL(request.url).searchParams.get('postId') || '').trim())
    if (found.error) return found.error
    return NextResponse.json(await state(found.post))
  } catch (error) {
    console.error('Job review open state error:', error)
    return NextResponse.json({ error: 'Failed to load the review settings.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isVerificationInternalRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  const postId = String(body.postId || '').trim()
  const reviewerEmail = reviewerEmailFrom(body.reviewerEmail)
  const patch: Record<string, boolean> = {}
  if (typeof body.questionsOpen === 'boolean') patch.jobReviewQuestionsOpen = body.questionsOpen
  if (typeof body.coffeeChatOpen === 'boolean') patch.jobReviewCoffeeChatOpen = body.coffeeChatOpen
  if (!postId || !reviewerEmail || Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'postId, reviewerEmail and questionsOpen or coffeeChatOpen are required.' },
      { status: 400 },
    )
  }
  try {
    const found = await jobReview(postId)
    if (found.error) return found.error
    if (!(await patchStoredCommunityPost(postId, patch))) {
      return NextResponse.json({ error: 'Failed to save the review settings.' }, { status: 500 })
    }
    console.info('Job review open set by admin', { postId, reviewerEmail, ...patch })
    const authorUid = String(found.post.authorUid || '').trim()
    if (authorUid) await syncAutoMentor(authorUid)
    const saved = (await getStoredCommunityPost(postId)) ?? { ...found.post, ...patch }
    return NextResponse.json({ ok: true, ...(await state(saved as CommunityPost)) })
  } catch (error) {
    console.error('Job review open save error:', error)
    return NextResponse.json({ error: 'Failed to save the review settings.' }, { status: 500 })
  }
}
