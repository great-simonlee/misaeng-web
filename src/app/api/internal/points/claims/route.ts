import { NextResponse } from 'next/server'

import { DEFAULT_CITY_ID, hrefForCommunityPost } from '@lib/constants/cities'
import { htmlToPlainText } from '@lib/community/html'
import type { PointClaim } from '@lib/points/claims.server'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { enc, pointsRest } from '@lib/points/rest.server'
import { getStoredCommunityPost } from '@lib/supabase/community.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const
const BOARDS = ['interview', 'visa', 'food'] as const
const SELECT =
  'id,user_id,post_id,board,requested,components,checks,status,hold_reason,dedupe_key,cycle,reviewed_by,reviewed_at,reject_reason,created_at,updated_at'

/**
 * ERP claims queue (header `x-internal-secret`).
 * ?status=pending|approved|rejected|expired (default pending) &board=interview|visa|food &limit=1–200 (default 50)
 * &cursor=<nextCursor of the previous page>. Pending is oldest first (queue order), the rest newest first.
 * Each claim is joined with its post (title, board, url path, excerpt, status) and the author's nickname / email.
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const { searchParams } = new URL(request.url)
    const statusRaw = searchParams.get('status') || 'pending'
    if (!STATUSES.includes(statusRaw as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}.` }, { status: 400 })
    }
    const board = searchParams.get('board')
    if (board && !BOARDS.includes(board as (typeof BOARDS)[number])) {
      return NextResponse.json({ error: `board must be one of ${BOARDS.join(', ')}.` }, { status: 400 })
    }
    const limitRaw = Math.trunc(Number(searchParams.get('limit') || 50))
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50
    const cursor = searchParams.get('cursor')
    const pending = statusRaw === 'pending'

    let query = `point_claims?status=eq.${statusRaw}&select=${SELECT}&limit=${limit + 1}`
    if (board) query += `&board=eq.${board}`
    if (cursor && Number.isFinite(Date.parse(cursor))) {
      query += pending ? `&created_at=gt.${enc(cursor)}` : `&created_at=lt.${enc(cursor)}`
    }
    query += pending ? '&order=created_at.asc' : '&order=created_at.desc'
    const rows = (await pointsRest<PointClaim[]>(query)) ?? []
    const page = rows.slice(0, limit)

    const profiles = new Map<string, Awaited<ReturnType<typeof getSupabaseProfile>>>()
    await Promise.all(
      [...new Set(page.map((c) => c.user_id))].map(async (uid) => {
        profiles.set(uid, await getSupabaseProfile(uid).catch(() => null))
      }),
    )
    const claims = await Promise.all(
      page.map(async (claim) => {
        const post = await getStoredCommunityPost(claim.post_id).catch(() => null)
        const profile = profiles.get(claim.user_id) ?? null
        return {
          ...claim,
          post: post
            ? {
                id: post.id,
                title: post.title,
                categoryId: post.categoryId,
                status: post.status,
                path: hrefForCommunityPost(post, DEFAULT_CITY_ID),
                excerpt: htmlToPlainText(post.contentHtml || '').slice(0, 400),
                createdAt: post.createdAt,
                companyId: post.companyId ?? null,
                location: post.location || null,
              }
            : null,
          author: {
            uid: claim.user_id,
            nickname: profile?.nickname ?? null,
            email: profile?.email ?? null,
          },
        }
      }),
    )
    const last = page[page.length - 1]
    return NextResponse.json({
      status: statusRaw,
      claims,
      nextCursor: rows.length > limit && last ? last.created_at : null,
    })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
