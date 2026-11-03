import { supportRest } from './rest.server'

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
}

let cache: { at: number; value: SupportSettings } | null = null
const TTL_MS = 15_000

/** Settings with defaults for missing keys. Missing table → defaults (features stay off). */
export async function getSupportSettings(): Promise<SupportSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  const value: SupportSettings = { ...SUPPORT_DEFAULTS }
  try {
    const rows = await supportRest<{ key: string; value: unknown }[]>('support_settings?select=key,value')
    for (const row of rows ?? []) {
      if (row.key in value) (value as Record<string, unknown>)[row.key] = row.value
    }
  } catch {
    return value
  }
  cache = { at: Date.now(), value }
  return value
}

export function invalidateSupportSettings() {
  cache = null
}

export const normalizeEmail = (email: string | null | undefined) => String(email || '').trim().toLowerCase()
