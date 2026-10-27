import { NextResponse } from 'next/server'

import { getPointsConfig, invalidatePointsConfig } from '@lib/points/config.server'
import { isPointRuleKey, POINT_RULE_DEFAULTS } from '@lib/points/defaults'
import { getPointsEngineState } from '@lib/points/engine.server'
import { internalActor, internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { enc, inList, pointsRest } from '@lib/points/rest.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RuleRow = { key: string; value: number; enabled: boolean; description: string | null; updated_at?: string; updated_by?: string | null }

/** All effective rules (incl. disabled and internal ones) + settings, for the ERP rule editor. */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const [config, state] = await Promise.all([getPointsConfig(), getPointsEngineState()])
    return NextResponse.json({
      tablesReady: config.tablesReady,
      /** 'legacy' before `points.cutover_at` (or without points.sql), 'ledger' after */
      engine: state.engine,
      rules: Object.values(config.rules).map((rule) => ({ ...rule, default: POINT_RULE_DEFAULTS[rule.key].value })),
      settings: config.settings,
    })
  } catch (error) {
    return internalErrorResponse(error)
  }
}

/**
 * Update rules (ERP). Header `x-internal-secret`, `x-admin-id`.
 * { rules: [{ key, value?, enabled?, description? }], note? } — unknown keys are rejected.
 * Each change is written to point_rules_history (before/after). → { updated: [...] }
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const actor = internalActor(request, body)
    const input = Array.isArray(body.rules) ? (body.rules as Record<string, unknown>[]) : []
    if (input.length === 0) return NextResponse.json({ error: 'rules[] is required.' }, { status: 400 })

    const keys = input.map((r) => String(r?.key || ''))
    const unknown = keys.filter((k) => !isPointRuleKey(k))
    if (unknown.length) return NextResponse.json({ error: `Unknown rule keys: ${unknown.join(', ')}` }, { status: 400 })

    const config = await getPointsConfig()
    const stored = await pointsRest<RuleRow[]>(`point_rules?key=in.${enc(inList(keys))}&select=key,value,enabled,description`)
    const storedByKey = new Map((stored ?? []).map((row) => [row.key, row]))
    const now = new Date().toISOString()

    const rows: RuleRow[] = []
    const history: Record<string, unknown>[] = []
    for (const item of input) {
      const key = String(item.key)
      if (!isPointRuleKey(key)) continue
      const current = config.rules[key]
      const before = storedByKey.get(key) ?? null
      const value = item.value === undefined ? current.value : Math.trunc(Number(item.value))
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `${key}: value must be a non-negative integer.` }, { status: 400 })
      }
      const next: RuleRow = {
        key,
        value,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : current.enabled,
        description: typeof item.description === 'string' ? item.description.slice(0, 500) : (before?.description ?? current.description ?? null),
        updated_at: now,
        updated_by: actor,
      }
      rows.push(next)
      history.push({
        target: 'rule',
        key,
        before: before ?? { value: current.value, enabled: current.enabled, default: true },
        after: { value: next.value, enabled: next.enabled, description: next.description },
        changed_by: actor,
        note: typeof body.note === 'string' ? body.note.slice(0, 500) : null,
      })
    }

    await pointsRest('point_rules?on_conflict=key', {
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
