import { supportRest } from './rest.server'

let staffAvatarCache: { at: number; map: Map<string, string> } | null = null

/** email → photo URL of every staff member who has one (support_staff.avatar_url, synced from the ERP agent photo). */
export async function staffAvatars(): Promise<Map<string, string>> {
  if (staffAvatarCache && Date.now() - staffAvatarCache.at < 60_000) return staffAvatarCache.map
  const rows = await supportRest<{ email: string; avatar_url: string | null }[]>(
    'support_staff?avatar_url=not.is.null&select=email,avatar_url',
  ).catch(() => null) // column not added yet → no photos, never an error
  const map = new Map<string, string>()
  for (const row of rows ?? []) if (row.avatar_url?.trim()) map.set(row.email.toLowerCase(), row.avatar_url.trim())
  staffAvatarCache = { at: Date.now(), map }
  return map
}
