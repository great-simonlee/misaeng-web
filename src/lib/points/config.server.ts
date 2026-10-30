import {
  isPointRuleKey,
  isPointSettingKey,
  POINT_RULE_DEFAULTS,
  POINT_RULE_KEYS,
  POINT_SETTING_DEFAULTS,
  type PointRuleKey,
  type PointSettingKey,
  type PointSettings,
} from './defaults'
import { pointsRest, PointsStoreError } from './rest.server'

/**
 * Effective points config = defaults (defaults.ts) overridden by `point_rules` / `point_settings` rows.
 * Cached per server instance for CONFIG_TTL_MS; ERP writes through /api/internal/points/* invalidate it here.
 * If the tables are missing or unreachable, the defaults are returned with `tablesReady: false`
 * (and the engine selector keeps the legacy credit system in charge).
 */

export type EffectiveRule = { key: PointRuleKey; value: number; enabled: boolean; public: boolean; description: string }

export type PointsConfig = {
  rules: Record<PointRuleKey, EffectiveRule>
  settings: PointSettings
  tablesReady: boolean
  loadedAt: number
}

const CONFIG_TTL_MS = 30_000

type RuleRow = { key: string; value: number; enabled: boolean; description: string | null }
type SettingRow = { key: string; value: unknown }

let cached: { at: number; value: Promise<PointsConfig> } | null = null

function defaultRules(): Record<PointRuleKey, EffectiveRule> {
  return Object.fromEntries(
    POINT_RULE_KEYS.map((key) => {
      const d = POINT_RULE_DEFAULTS[key]
      return [key, { key, value: d.value, enabled: d.enabled, public: d.public, description: d.description }]
    }),
  ) as Record<PointRuleKey, EffectiveRule>
}

function coerceSetting<K extends PointSettingKey>(key: K, raw: unknown): PointSettings[K] {
  const fallback = POINT_SETTING_DEFAULTS[key]
  switch (key) {
    case 'paywall.enabled':
    case 'coffee_chat.enabled':
    case 'review_qna.enabled':
    case 'cities.dc.enabled':
      return (typeof raw === 'boolean' ? raw : raw === 'true' ? true : raw === 'false' ? false : fallback) as PointSettings[K]
    case 'paywall.notice_days': {
      const n = Number(raw)
      return (Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback) as PointSettings[K]
    }
    case 'paywall.start_date':
      return (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw === null ? null : fallback) as PointSettings[K]
    case 'points.cutover_at':
      return (typeof raw === 'string' && Number.isFinite(Date.parse(raw)) ? new Date(raw).toISOString() : null) as PointSettings[K]
    default:
      return fallback
  }
}

export function normalizeSettingValue(key: PointSettingKey, raw: unknown) {
  return coerceSetting(key, raw)
}

async function load(): Promise<PointsConfig> {
  const rules = defaultRules()
  const settings: PointSettings = { ...POINT_SETTING_DEFAULTS }
  try {
    const [ruleRows, settingRows] = await Promise.all([
      pointsRest<RuleRow[]>('point_rules?select=key,value,enabled,description'),
      pointsRest<SettingRow[]>('point_settings?select=key,value'),
    ])
    for (const row of ruleRows ?? []) {
      if (!isPointRuleKey(row.key)) continue
      const value = Math.trunc(Number(row.value))
      rules[row.key] = {
        ...rules[row.key],
        value: Number.isFinite(value) ? value : rules[row.key].value,
        enabled: Boolean(row.enabled),
        description: row.description ?? rules[row.key].description,
      }
    }
    for (const row of settingRows ?? []) {
      if (!isPointSettingKey(row.key)) continue
      ;(settings as Record<PointSettingKey, unknown>)[row.key] = coerceSetting(row.key, row.value)
    }
    return { rules, settings, tablesReady: true, loadedAt: Date.now() }
  } catch (error) {
    if (!(error instanceof PointsStoreError && error.setupRequired)) {
      console.error('Points config load error:', error)
    }
    return { rules, settings, tablesReady: false, loadedAt: Date.now() }
  }
}

export function getPointsConfig(): Promise<PointsConfig> {
  if (cached && Date.now() - cached.at < CONFIG_TTL_MS) return cached.value
  const value = load()
  cached = { at: Date.now(), value }
  return value
}

export function invalidatePointsConfig() {
  cached = null
}

/** Amount for earn.* / spend.* / quota.* keys: 0 when disabled. */
export function ruleAmount(config: PointsConfig, key: PointRuleKey): number {
  const rule = config.rules[key]
  return rule.enabled ? Math.max(0, rule.value) : 0
}

/** Limit for cap.* keys: null (= no cap) when disabled. */
export function ruleCap(config: PointsConfig, key: PointRuleKey): number | null {
  const rule = config.rules[key]
  return rule.enabled ? Math.max(0, rule.value) : null
}

/** Threshold for rule.* keys: null (= skip the check) when disabled. */
export function ruleThreshold(config: PointsConfig, key: PointRuleKey): number | null {
  const rule = config.rules[key]
  return rule.enabled ? rule.value : null
}
