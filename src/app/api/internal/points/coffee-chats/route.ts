import { NextResponse } from 'next/server'

import type { CoffeeChatRequest } from '@lib/points/coffeeChat.server'
import { COFFEE_CHAT_DISCLAIMER, COFFEE_CHAT_DISCLAIMER_VERSION } from '@lib/points/defaults'
import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { enc, pointsRest } from '@lib/points/rest.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = ['requested', 'scheduled', 'completed', 'cancelled', 'no_show'] as const
const SELECT =
  'id,user_id,mentor_id,topic,message,preferred_times,status,amount,hold_id,disclaimer_version,agreed_at,scheduled_at,mentor_note,admin_note,cancelled_by,decided_by,completed_at,created_at,updated_at'

type AdminCoffeeChat = CoffeeChatRequest & { admin_note: string | null; decided_by: string | null }

/**
 * ERP coffee chat queue (header `x-internal-secret`).
 * ?status=requested|scheduled|completed|cancelled|no_show (comma list allowed, default requested,scheduled)
 * &limit=1–200 (default 100) &cursor=<nextCursor>. Newest first. Joined with the requester's nickname / email.
 * Also returns the current disclaimer text + version (each request stores the version and `agreed_at`).
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const { searchParams } = new URL(request.url)
    const statuses = (searchParams.get('status') || 'requested,scheduled')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const invalid = statuses.filter((s) => !STATUSES.includes(s as (typeof STATUSES)[number]))
    if (!statuses.length || invalid.length) {
      return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}.` }, { status: 400 })
    }
    const limitRaw = Math.trunc(Number(searchParams.get('limit') || 100))
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100
    const cursor = searchParams.get('cursor')

    let query = `coffee_chat_requests?status=in.(${statuses.join(',')})&select=${SELECT}&order=created_at.desc&limit=${limit + 1}`
    if (cursor && Number.isFinite(Date.parse(cursor))) query += `&created_at=lt.${enc(cursor)}`
    const rows = (await pointsRest<AdminCoffeeChat[]>(query)) ?? []
    const page = rows.slice(0, limit)

    const profiles = new Map<string, Awaited<ReturnType<typeof getSupabaseProfile>>>()
    await Promise.all(
      [...new Set(page.map((r) => r.user_id))].map(async (uid) => {
        profiles.set(uid, await getSupabaseProfile(uid).catch(() => null))
      }),
    )
    const last = page[page.length - 1]
    return NextResponse.json({
      requests: page.map((row) => {
        const profile = profiles.get(row.user_id) ?? null
        return {
          ...row,
          requester: { uid: row.user_id, nickname: profile?.nickname ?? null, email: profile?.email ?? null },
        }
      }),
      nextCursor: rows.length > limit && last ? last.created_at : null,
      disclaimer: { version: COFFEE_CHAT_DISCLAIMER_VERSION, text: COFFEE_CHAT_DISCLAIMER },
    })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
