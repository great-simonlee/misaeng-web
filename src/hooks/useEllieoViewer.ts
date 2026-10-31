'use client'

import { useSyncExternalStore } from 'react'

import { useAuth } from '@hooks/useAuth'
import { ELLIEO_MOCK_CONTENT } from '@widgets/ellieo/mockContent'
import type { AuthUser } from '@/types/auth'
import type { NycUserProfile } from '@/types/nyc'

/**
 * Who is viewing, for Ellieo-only chrome (header, bottom tabs, side rail profile card).
 *
 * DESIGN PREVIEW: on a dev server with NEXT_PUBLIC_ELLIEO_MOCK_CONTENT=1, adding `?preview=member` to any URL
 * shows these screens as a signed-in sample member (no real session; data, posting and My page still use the
 * real account). `?preview=off` turns it off. Never active in production builds (the flag isn't set there).
 */
const PREVIEW_KEY = 'ellieo.previewMember'

const PREVIEW_USER: AuthUser = {
  uid: 'preview-member',
  email: 'preview@example.com',
  displayName: 'Linh Tran',
  photoURL: null,
  phoneNumber: null,
}

function readPreview(): boolean {
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

const noopSubscribe = () => () => {}

export function useEllieoViewer() {
  const auth = useAuth()
  // Read once on the client (false on the server, so the first render matches the HTML)
  const preview = useSyncExternalStore(noopSubscribe, readPreview, () => false)

  if (!preview || auth.user) return auth
  return {
    ...auth,
    loading: false,
    user: PREVIEW_USER,
    displayName: 'linh.tran',
    avatarURL: null,
    profile: {
      ...(auth.profile ?? {}),
      verifiedSchoolId: 'nyu',
      verifiedSchoolName: 'New York University',
    } as NycUserProfile,
  }
}
