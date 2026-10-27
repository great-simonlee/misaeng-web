import { NextResponse } from 'next/server'

import { isMisaengEmail } from '@lib/constants/nyc'
import { getVerifiedSchool, resolveSchoolFromEmail } from '@lib/constants/schools'
import { getSchoolRegistry } from '@lib/supabase/schoolRegistry.server'
import { isPhoneSmsEnabled } from '@lib/constants/verificationSafety'
import { getRequestT } from '@lib/i18n/server'
import { getLatestSupabaseAvatarUrl, isSupabaseStorageConfigured } from '@lib/supabase/avatar.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import { instagramStateFromProfile } from '@lib/verification/instagram'
import { listVerifiedSchools, MAX_VERIFIED_SCHOOLS } from '@lib/verification/verifiedSchools'
import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Everything the app's My page shows, already resolved (school names, affiliation, completeness),
 * so the app does not copy the web's rules. Same data as GET /api/agent-auth/session + the stored profile.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })

  // ERP 학교 목록을 불러 둔다 (아래 getVerifiedSchool·resolveSchoolFromEmail이 ERP에서 더한 학교도 찾게)
  const [profile] = await Promise.all([getSupabaseProfile(user.uid).catch(() => null), getSchoolRegistry()])
  let photoURL = profile?.photoURL ?? user.photoURL ?? null
  if (isSupabaseStorageConfigured()) {
    const latest = await getLatestSupabaseAvatarUrl({ uid: user.uid, bucket: getSupabaseAvatarBucket() }).catch(
      () => null,
    )
    photoURL = latest ?? photoURL
  }

  const schoolVerified = Boolean(profile?.schoolEmailVerified)
  const school = schoolVerified
    ? getVerifiedSchool(profile?.verifiedSchoolId) ??
      (profile?.schoolEmail ? resolveSchoolFromEmail(profile.schoolEmail) : null)
    : null
  const schoolName = schoolVerified ? profile?.verifiedSchoolName?.trim() || school?.fullName || null : null
  const workplaceStatus = profile?.workplaceStatus ?? 'none'
  const company = profile?.workplaceCompanyName?.trim() || null

  const nameParts = (user.displayName ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = profile?.firstName?.trim() || ''
  const profileComplete = Boolean(
    profile?.nickname?.trim() &&
      firstName &&
      profile?.mbti?.trim() &&
      profile?.gender?.trim() &&
      profile?.occupationType?.trim(),
  )

  return NextResponse.json(
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? null,
      photoURL,
      isTeam: isMisaengEmail(user.email),
      nickname: profile?.nickname?.trim() || null,
      firstName: firstName || nameParts[0] || '',
      lastName: profile?.lastName?.trim() || nameParts.slice(1).join(' '),
      mbti: profile?.mbti?.trim().toUpperCase() || null,
      gender: profile?.gender || null,
      occupationType: profile?.occupationType || null,
      profileComplete,
      suspended: profile?.status === 'suspended',
      // Shown under the name: approved company first, then the verified school.
      affiliation: (workplaceStatus === 'approved' && company) || schoolName,
      school: {
        verified: schoolVerified,
        email: profile?.schoolEmail ?? null,
        id: school?.id ?? profile?.verifiedSchoolId ?? null,
        shortName: school?.shortName ?? null,
        name: schoolName,
      },
      workplace: {
        status: workplaceStatus,
        email: profile?.workEmail ?? null,
        companyName: company,
        rejectReason: profile?.workplaceRejectReason ?? null,
      },
      // All verified schools (max 3), the main one (used for badges) first.
      schools: listVerifiedSchools(profile).map((entry, index) => ({
        email: entry.email,
        id: entry.id,
        shortName: getVerifiedSchool(entry.id)?.shortName ?? null,
        name: entry.name,
        primary: index === 0,
      })),
      maxSchools: MAX_VERIFIED_SCHOOLS,
      instagram: instagramStateFromProfile(profile),
      // Stays true while a request for another account is in review (the earlier approval still counts).
      instagramVerified: Boolean(profile?.instagramVerified),
      // Phone verification is hidden until it's built (Twilio); older app builds still read this.
      phone: {
        verified: Boolean(profile?.phoneVerified),
        number: profile?.phone ?? user.phoneNumber ?? null,
        smsEnabled: isPhoneSmsEnabled(),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
