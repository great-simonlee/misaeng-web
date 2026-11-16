import type { AuthUser } from '@/types/auth'
import type { NycUserProfile } from '@/types/nyc'
import { ELLIEO_MOCK_CONTENT } from '@widgets/ellieo/mockContent'

/**
 * DESIGN PREVIEW (dev only): on a dev server with NEXT_PUBLIC_ELLIEO_MOCK_CONTENT=1, `?preview=member` on any URL makes
 * every screen render as a signed-in, school-verified sample member (no real session: API calls still go out
 * without a token, so data that needs an account stays empty). `?preview=off` turns it off.
 * Never active in production builds (the flag isn't set there).
 */
const PREVIEW_KEY = 'ellieo.previewMember'

export const PREVIEW_USER: AuthUser = {
  uid: 'preview-member',
  email: 'preview@example.com',
  displayName: 'Linh Tran',
  photoURL: null,
  phoneNumber: null,
}

export const PREVIEW_PROFILE = {
  uid: 'preview-member',
  email: 'preview@example.com',
  displayName: 'Linh Tran',
  firstName: 'Linh',
  lastName: 'Tran',
  nickname: 'linh.tran',
  mbti: null,
  gender: 'female',
  occupationType: 'student',
  photoURL: null,
  roommatePostId: null,
  schoolEmail: 'lt2481@nyu.edu',
  schoolEmailVerified: true,
  verifiedSchoolId: 'nyu',
  verifiedSchoolName: 'New York University',
  workEmail: null,
  workEmailVerified: false,
  workplaceCompanyName: null,
  workplaceStatus: 'none',
  workplaceRequestId: null,
  workplaceRejectReason: null,
  workplaceReviewedAt: null,
  workplaceReviewedByEmail: null,
  phone: null,
  phoneVerified: false,
  verifiedSchools: [{ id: 'nyu', name: 'New York University', email: 'lt2481@nyu.edu', verifiedAt: Date.UTC(2026, 9, 1) }],
  instagramHandle: null,
  instagramVerified: false,
  instagram: { status: 'none', handle: null, code: null, expiresAt: null, sentAt: null, expired: false, rejectReasonCode: null, rejectReason: null },
  preferredLocale: null,
  status: 'active',
  otpQuota: null,
  createdAt: Date.UTC(2026, 8, 1),
  updatedAt: Date.UTC(2026, 9, 1),
} as unknown as NycUserProfile

export function readPreviewMember(): boolean {
  if (!ELLIEO_MOCK_CONTENT) return false
  try {
    const param = new URLSearchParams(window.location.search).get('preview')
    if (param === 'member') window.sessionStorage.setItem(PREVIEW_KEY, '1')
    if (param === 'off') window.sessionStorage.removeItem(PREVIEW_KEY)
    return window.sessionStorage.getItem(PREVIEW_KEY) === '1'
  } catch {
    return false
  }
}

export const noopSubscribe = () => () => {}
