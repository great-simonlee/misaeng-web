import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { purgeLicensePhotos } from '@lib/agents/agentLicense.server'
import { purgeDueFiles } from '@lib/agents/listings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deletes Misaeng agent listing photos whose time is up (the daily SQL job misaeng_listings_daily only marks them).
 * Called once a day after that job (pg_cron + pg_net, like support-tick) with `x-internal-secret: $INTERNAL_PUSH_SECRET`.
 * Repeats in batches of 500 until nothing is left. Also deletes Licensed Agent license photos 30 days after the
 * decision (agentLicense.server.ts purgeLicensePhotos).
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
    let licensePhotos = 0
    for (let round = 0; round < 20; round++) {
      const { deleted } = await purgeLicensePhotos(200)
      licensePhotos += deleted
      if (deleted < 200) break
    }
    return NextResponse.json({ deleted: total, licensePhotos })
  } catch (error) {
    console.error('Misaeng purge error:', error)
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 })
  }
}
