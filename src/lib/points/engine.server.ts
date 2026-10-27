import { getPointsConfig } from './config.server'

/**
 * Which points system is in charge right now.
 *   legacy → src/lib/community/creditLedger.ts (Storage JSON per user), unchanged
 *   ledger → point_ledger (supabase/points.sql)
 * The ledger is active only when the points tables are reachable AND `points.cutover_at` is set AND now ≥ cutover.
 * Any failure keeps the legacy system (the config loader never throws).
 */

export type PointsEngine = 'legacy' | 'ledger'

export type PointsEngineState = {
  engine: PointsEngine
  tablesReady: boolean
  cutoverAt: string | null
}

export async function getPointsEngineState(now = Date.now()): Promise<PointsEngineState> {
  const config = await getPointsConfig()
  const cutoverAt = config.settings['points.cutover_at']
  const cutoverMs = cutoverAt ? Date.parse(cutoverAt) : NaN
  const active = config.tablesReady && Number.isFinite(cutoverMs) && now >= cutoverMs
  return { engine: active ? 'ledger' : 'legacy', tablesReady: config.tablesReady, cutoverAt }
}

export async function isPointsLedgerActive(now = Date.now()): Promise<boolean> {
  return (await getPointsEngineState(now)).engine === 'ledger'
}

/** Cutover as epoch ms (null = not scheduled). */
export async function getCutoverMs(): Promise<number | null> {
  const { settings } = await getPointsConfig()
  const ms = settings['points.cutover_at'] ? Date.parse(settings['points.cutover_at']) : NaN
  return Number.isFinite(ms) ? ms : null
}
