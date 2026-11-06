import { supportRest } from './rest.server'
import type { SupportBrand } from './types'

export type SupportSettings = {
  'support.enabled': boolean
  'inquiry.enabled': boolean
  admins: string[]
  'inquiry.assignee': string
  'reports.assignee': string
  'escalation.final': string
  'housing.hours': { start: number; end: number; days: number[] }
  'housing.escalate_minutes': number[]
  'email.delay_minutes': number
  /** Beta testers (account emails): they get both features while the switches are still off (TestFlight checks on prod). */
  testers: string[]
}

export const SUPPORT_DEFAULTS: SupportSettings = {
  'support.enabled': false,
  'inquiry.enabled': false,
  admins: ['simon@misaeng.com'],
  'inquiry.assignee': 'simon@misaeng.com',
  'reports.assignee': 'simon@misaeng.com',
  'escalation.final': 'simon@misaeng.com',
  'housing.hours': { start: 9, end: 21, days: [0, 1, 2, 3, 4, 5, 6] },
  'housing.escalate_minutes': [60, 120],
  'email.delay_minutes': 5,
  testers: [],
}

/**
 * Keys a brand can override with `<key>.<brand>` in support_settings (e.g. `inquiry.assignee.ellieo`).
 * Not here: reports.assignee (community reports are not tied to a conversation brand) and the rotation cursors.
 */
export const BRAND_OVERRIDABLE_KEYS = [
  'support.enabled',
  'inquiry.enabled',
  'inquiry.assignee',
  'admins',
  'escalation.final',
  'housing.hours',
  'housing.escalate_minutes',
  'email.delay_minutes',
  'testers',
] as const satisfies readonly (keyof SupportSettings)[]

type RawSettings = Map<string, unknown>

let cache: { at: number; value: RawSettings } | null = null
const TTL_MS = 15_000

async function rawSettings(): Promise<RawSettings | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  try {
    const rows = await supportRest<{ key: string; value: unknown }[]>('support_settings?select=key,value')
    const value: RawSettings = new Map((rows ?? []).map((row) => [row.key, row.value]))
    cache = { at: Date.now(), value }
    return value
  } catch {
    return null
  }
}

/**
 * The one place brand settings are resolved: Misaeng always reads the base key; Ellieo reads `<key>.ellieo` when that
 * row exists, else the base key; missing → defaults.
 */
export function resolveSupportSettings(raw: RawSettings, brand: SupportBrand = 'misaeng'): SupportSettings {
  const value: SupportSettings = { ...SUPPORT_DEFAULTS }
  for (const key of Object.keys(value) as (keyof SupportSettings)[]) {
    if (raw.has(key)) (value as Record<string, unknown>)[key] = raw.get(key)
  }
  if (brand !== 'misaeng') {
    for (const key of BRAND_OVERRIDABLE_KEYS) {
      const brandKey = `${key}.${brand}`
      if (raw.has(brandKey)) (value as Record<string, unknown>)[key] = raw.get(brandKey)
    }
  }
  return value
}

/** Settings for a brand (default Misaeng) with defaults for missing keys. Missing table → defaults (features stay off). */
export async function getSupportSettings(brand: SupportBrand = 'misaeng'): Promise<SupportSettings> {
  const raw = await rawSettings()
  return resolveSupportSettings(raw ?? new Map(), brand)
}

export function invalidateSupportSettings() {
  cache = null
}

export const normalizeEmail = (email: string | null | undefined) => String(email || '').trim().toLowerCase()

/** Whether a feature is on for this user: the switch, or the user is on the tester list. */
export function supportFeatureOn(settings: SupportSettings, feature: 'support.enabled' | 'inquiry.enabled', email?: string | null) {
  if (settings[feature]) return true
  const e = normalizeEmail(email)
  return Boolean(e) && (settings.testers ?? []).map(normalizeEmail).includes(e)
}
