import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import {
  getCommunityCreditLedger,
  getCommunityCreditSummary,
} from '@lib/community/creditLedger'
import { isCommunityCreditStorageConfigured } from '@lib/supabase/communityCredit.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SECURE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
} as const

function json(
  body: unknown,
  init?: { status?: number },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: SECURE_HEADERS,
  })
}

export async function GET(request: Request) {
  try {
    if (!isCommunityCreditStorageConfigured()) {
      return json(
        { error: 'Supabase 설정이 필요해요.', code: 'STORAGE_UNAVAILABLE' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wantLedger = searchParams.get('ledger') === '1'
    const limitRaw = Number(searchParams.get('limit') || 50)
    const limit = Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 50

    if (wantLedger) {
      const ledger = await getCommunityCreditLedger(user.uid, limit)
      return json(ledger)
    }

    const summary = await getCommunityCreditSummary(user.uid)
    return json(summary)
  } catch (error) {
    console.error('Community credit GET error:', error)
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : '크레딧 정보를 불러오지 못했어요.',
      },
      { status: 500 },
    )
  }
}
