import { normalizeEmailForPoints, normalizeInstagramForPoints, type PointIdentityKind } from './identity'
import { enc, pointsRest } from './rest.server'

/**
 * Binds a normalized identifier (email / instagram handle) to one account in `point_identities`.
 * Returns true when the identifier belongs to `userId` (newly bound or already bound to them),
 * false when another account already holds it (→ no welcome / verification / free-quota reward).
 */
export async function bindPointIdentity(
  kind: PointIdentityKind,
  identifier: string | null | undefined,
  userId: string,
): Promise<boolean> {
  const normalized = kind === 'instagram' ? normalizeInstagramForPoints(identifier) : normalizeEmailForPoints(identifier)
  if (!normalized) return true // nothing to compare: don't block
  await pointsRest('point_identities?on_conflict=kind,identifier_normalized', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify({ kind, identifier_normalized: normalized, user_id: userId }),
  })
  const rows = await pointsRest<{ user_id: string }[]>(
    `point_identities?kind=eq.${enc(kind)}&identifier_normalized=eq.${enc(normalized)}&select=user_id`,
  )
  return rows?.[0]?.user_id === userId
}
