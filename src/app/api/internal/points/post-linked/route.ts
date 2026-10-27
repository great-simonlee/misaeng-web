import { NextResponse } from 'next/server'

import { isPointsLedgerActive, onGuestPostLinked } from '@lib/points/facade.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { getStoredCommunityPost } from '@lib/supabase/community.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → web after an admin linked a guest post to an account (ellieo-erp misaeng-food/[id]/link-author).
 * Header `x-internal-secret`. { postId, uid }. Ledger only: creates / refreshes the review claim like a
 * self-link does. Before cutover it does nothing (the ERP still pays the legacy credit itself).
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const postId = String(body.postId || '').trim()
    const uid = String(body.uid || '').trim()
    if (!postId || !uid) return NextResponse.json({ error: 'postId and uid are required.' }, { status: 400 })
    if (!(await isPointsLedgerActive())) return NextResponse.json({ skipped: 'legacy' })
    const post = await getStoredCommunityPost(postId)
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    if (post.authorUid !== uid) {
      return NextResponse.json({ error: 'The post is not linked to this user.' }, { status: 409 })
    }
    return NextResponse.json(await onGuestPostLinked({ uid, post, linkedAt: Date.now() }))
  } catch (error) {
    return internalErrorResponse(error)
  }
}
