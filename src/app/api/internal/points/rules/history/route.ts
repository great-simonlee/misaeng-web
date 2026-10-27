import { NextResponse } from 'next/server'

import { internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { enc, pointsRest } from '@lib/points/rest.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HistoryRow = {
  id: string
  target: 'rule' | 'setting'
  key: string
  before: unknown
  after: unknown
  changed_by: string | null
  changed_at: string
  note: string | null
}

/**
 * Change history of rules and settings for the ERP (header `x-internal-secret`), newest first.
 * ?key=<rule or setting key> &target=rule|setting &limit=1–200 (default 50) &cursor=<nextCursor>
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = Math.trunc(Number(searchParams.get('limit') || 50))
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50
    const key = searchParams.get('key')?.trim()
    const target = searchParams.get('target')
    const cursor = searchParams.get('cursor')

    let query = `point_rules_history?select=id,target,key,before,after,changed_by,changed_at,note&order=changed_at.desc&limit=${limit + 1}`
    if (key) query += `&key=eq.${enc(key)}`
    if (target === 'rule' || target === 'setting') query += `&target=eq.${target}`
    if (cursor && Number.isFinite(Date.parse(cursor))) query += `&changed_at=lt.${enc(cursor)}`
    const rows = (await pointsRest<HistoryRow[]>(query)) ?? []
    const page = rows.slice(0, limit)
    const last = page[page.length - 1]
    return NextResponse.json({ history: page, nextCursor: rows.length > limit && last ? last.changed_at : null })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
