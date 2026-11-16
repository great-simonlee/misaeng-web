'use client'

import { useAuth } from '@hooks/useAuth'

/**
 * Who is viewing, for Ellieo-only chrome (header, bottom tabs, side rail profile card).
 *
 * DESIGN PREVIEW: on a dev server with NEXT_PUBLIC_ELLIEO_MOCK_CONTENT=1, adding `?preview=member` to any URL
 * shows these screens as a signed-in sample member (no real session; data, posting and My page still use the
 * real account). `?preview=off` turns it off. Never active in production builds (the flag isn't set there).
 */
export function useEllieoViewer() {
  // The design preview now lives in useAuth (hooks/designPreview.ts), so every screen sees the same viewer
  return useAuth()
}
