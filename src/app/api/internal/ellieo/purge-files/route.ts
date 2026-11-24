import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { purgeDueFiles } from '@lib/ellieo/listings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deletes Ellieo listing photos whose time is up (the daily SQL job ellieo_retention_daily only marks them).
 * Called once a day after that job (pg_cron + pg_net, like support-tick) with `x-internal-secret: $INTERNAL_PUSH_SECRET`.
 * Repeats in batches of 500 until nothing is left.
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    let total = 0
    for (let round = 0; round < 20; round++) {
      const { deleted } = await purgeDueFiles(500)
      total += deleted
      if (deleted < 500) break
    }
    return NextResponse.json({ deleted: total })
  } catch (error) {
    console.error('Ellieo purge error:', error)
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 })
  }
}
