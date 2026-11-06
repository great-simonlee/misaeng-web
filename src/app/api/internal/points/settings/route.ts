import { NextResponse } from 'next/server'

import { getPointsConfig, invalidatePointsConfig, normalizeSettingValue } from '@lib/points/config.server'
import { isPointSettingKey, type PointSettingKey } from '@lib/points/defaults'
import { internalActor, internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { pointsRest } from '@lib/points/rest.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validSetting(key: PointSettingKey, raw: unknown): boolean {
  switch (key) {
    case 'paywall.enabled':
    case 'coffee_chat.enabled':
    case 'review_qna.enabled':
    case 'cities.dc.enabled':
      return typeof raw === 'boolean'
    case 'paywall.start_date':
      return raw === null || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw))
    case 'paywall.notice_days':
      return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0
    case 'points.cutover_at':
      return raw === null || (typeof raw === 'string' && Number.isFinite(Date.parse(raw)))
    default:
      return false
  }
}

/**
 * Update settings (ERP). Header `x-internal-secret`, `x-admin-id`.
 * { settings: { 'paywall.enabled'?: boolean, 'paywall.start_date'?: 'YYYY-MM-DD'|null,
 *               'paywall.notice_days'?: number, 'points.cutover_at'?: ISO|null,
 *               'coffee_chat.enabled'?: boolean, 'cities.dc.enabled'?: boolean }, note? }
 * Setting `points.cutover_at` switches every server to the new ledger at that instant (config cache ≤ 30 s).
 * Each change is written to point_rules_history (target 'setting').
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const actor = internalActor(request, body)
    const input = body.settings && typeof body.settings === 'object' ? (body.settings as Record<string, unknown>) : {}
    const keys = Object.keys(input)
    if (keys.length === 0) return NextResponse.json({ error: 'settings{} is required.' }, { status: 400 })
    const unknown = keys.filter((k) => !isPointSettingKey(k))
    if (unknown.length) return NextResponse.json({ error: `Unknown setting keys: ${unknown.join(', ')}` }, { status: 400 })

    const config = await getPointsConfig()
    const now = new Date().toISOString()
    const rows: { key: string; value: unknown; updated_at: string; updated_by: string }[] = []
    const history: Record<string, unknown>[] = []
    for (const key of keys as PointSettingKey[]) {
      const raw = input[key]
      if (!validSetting(key, raw)) return NextResponse.json({ error: `${key}: invalid value.` }, { status: 400 })
      const value = normalizeSettingValue(key, raw)
      rows.push({ key, value, updated_at: now, updated_by: actor })
      history.push({
        target: 'setting',
        key,
        before: { value: config.settings[key] },
        after: { value },
        changed_by: actor,
        note: typeof body.note === 'string' ? body.note.slice(0, 500) : null,
      })
    }

    await pointsRest('point_settings?on_conflict=key', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(rows),
    })
    await pointsRest('point_rules_history', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(history) })
    invalidatePointsConfig()
    return NextResponse.json({ updated: rows })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
