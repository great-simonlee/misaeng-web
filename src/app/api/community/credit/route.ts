import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import {
  getCommunityCreditLedger,
  getCommunityCreditSummary,
} from '@lib/community/creditLedger'
import { isCommunityCreditStorageConfigured } from '@lib/supabase/communityCredit.server'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'
import type { CommunityCreditEntry } from '@lib/constants/communityCredit'
import {
  getPointsEngineState,
  getPointsHistoryFor,
  getPointsSummary,
} from '@lib/points/facade.server'
import type { PointsHistoryItem } from '@lib/points/ledger.server'

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

/** Points ledger row → the legacy entry shape the credit widget renders (label = translated reason). */
function ledgerEntry(t: Translate, item: PointsHistoryItem): CommunityCreditEntry {
  const kind: CommunityCreditEntry['kind'] =
    item.entryType === 'earn'
      ? 'earn'
      : item.entryType === 'clawback'
        ? 'revoke'
        : item.amount >= 0
          ? 'restore'
          : 'spend'
  const key = `points.reasons.${item.reason}`
  const translated = t(key)
  let label = translated !== key ? translated : ''
  if (!label && item.legacy) {
    const legacyKey = `credit.ledger.reasons.${item.reason.replace(/^legacy\./, '')}`
    const legacyLabel = t(legacyKey)
    label = legacyLabel !== legacyKey ? legacyLabel : item.legacyLabel || item.reason
  }
  return {
    id: item.id,
    kind,
    reason: 'other',
    amount: item.amount,
    label: label || item.reason,
    sourceId: item.sourceId,
    createdAt: Date.parse(item.createdAt) || Date.now(),
  }
}

/**
 * After the points cutover the legacy JSON must not be written any more (ensureCreditBackfill writes it),
 * so the same response shape is served from the points ledger (src/lib/points/WIRING.md 3).
 */
async function ledgerResponse(request: Request, uid: string, wantLedger: boolean, limit: number) {
  const [summary, history, t] = await Promise.all([
    getPointsSummary(uid),
    getPointsHistoryFor(uid, null, wantLedger ? Math.min(Math.max(limit, 1), 100) : 100),
    getRequestT(request),
  ])
  const entries = history.items.map((item) => ledgerEntry(t, item))
  const sum = (kinds: CommunityCreditEntry['kind'][]) =>
    entries.filter((e) => kinds.includes(e.kind)).reduce((total, e) => total + Math.abs(e.amount), 0)
  const body = {
    balance: summary.balance,
    held: summary.held,
    available: summary.available,
    /** from the most recent entries only (the ledger has no lifetime counters) */
    lifetimeEarned: sum(['earn']),
    lifetimeRevoked: sum(['revoke']),
    lifetimeSpent: sum(['spend']),
    entryCount: entries.length,
    integrityOk: true,
    updatedAt: Date.now(),
    engine: 'ledger' as const,
  }
  return json(wantLedger ? { ...body, entries } : body)
}

export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!isCommunityCreditStorageConfigured()) {
      return json(
        { error: t('common.supabaseNotConfigured'), code: 'STORAGE_UNAVAILABLE' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return json({ error: t('common.loginRequired') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wantLedger = searchParams.get('ledger') === '1'
    const limitRaw = Number(searchParams.get('limit') || 50)
    const limit = Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 50

    if ((await getPointsEngineState()).engine === 'ledger') {
      return await ledgerResponse(request, user.uid, wantLedger, limit)
    }

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
        error: apiErrorMessage(t, error, 'credit.loadFailed'),
      },
      { status: 500 },
    )
  }
}
