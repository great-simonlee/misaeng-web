import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'
import { listVerifiedSchools } from '@lib/verification/verifiedSchools'

/**
 * Account tiers for points (spec 3.1.1):
 *   identity  = school email OR approved workplace → everything
 *   basic     = identity OR Instagram              → check-in, comments, food reviews
 *   none                                           → no earning
 */

export type PointsTier = 'identity' | 'basic' | 'none'

export function isIdentityVerifiedProfile(profile: SupabaseProfileRecord | null | undefined): boolean {
  return Boolean(profile?.schoolEmailVerified) || profile?.workplaceStatus === 'approved'
}

export function pointsTierOf(profile: SupabaseProfileRecord | null | undefined): PointsTier {
  if (isIdentityVerifiedProfile(profile)) return 'identity'
  if (profile?.instagramVerified) return 'basic'
  return 'none'
}

export async function getPointsProfile(uid: string) {
  const profile = await getSupabaseProfile(uid)
  return { profile, tier: pointsTierOf(profile) }
}

/**
 * Earliest school/work verification time (ms). Unknown timestamps (old profiles) count as -Infinity,
 * i.e. "before cutover". null = no identity verification at all.
 */
export function earliestIdentityVerificationMs(profile: SupabaseProfileRecord | null | undefined): number | null {
  if (!profile) return null
  const times: number[] = []
  if (profile.schoolEmailVerified) {
    const schools = listVerifiedSchools(profile)
    if (schools.length === 0) times.push(-Infinity)
    for (const school of schools) times.push(typeof school.verifiedAt === 'number' ? school.verifiedAt : -Infinity)
  }
  if (profile.workplaceStatus === 'approved') {
    times.push(typeof profile.workplaceReviewedAt === 'number' ? profile.workplaceReviewedAt : -Infinity)
  }
  return times.length ? Math.min(...times) : null
}

/** Earliest verification of any kind (school, work, instagram). */
export function earliestAnyVerificationMs(profile: SupabaseProfileRecord | null | undefined): number | null {
  const identity = earliestIdentityVerificationMs(profile)
  const times = identity === null ? [] : [identity]
  if (profile?.instagramVerified) {
    times.push(typeof profile.instagramReviewedAt === 'number' ? profile.instagramReviewedAt : -Infinity)
  }
  return times.length ? Math.min(...times) : null
}

/** Required profile fields (same rule as /api/app/me `profileComplete`). */
export function isProfileCompleteForPoints(profile: SupabaseProfileRecord | null | undefined): boolean {
  return Boolean(
    profile?.nickname?.trim() &&
      profile?.firstName?.trim() &&
      profile?.mbti?.trim() &&
      profile?.gender?.trim() &&
      profile?.occupationType?.trim(),
  )
}
