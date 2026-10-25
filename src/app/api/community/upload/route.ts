import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
import {
  isCommunityImageStorageConfigured,
  uploadCommunityImageToSupabase,
} from '@lib/supabase/communityImages.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!isCommunityImageStorageConfigured()) {
      return NextResponse.json(
        {
          error: t('common.supabaseNotConfiguredDetail'),
          code: 'STORAGE_UNAVAILABLE',
        },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    }
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: t('upload.fileRequired') },
        { status: 400 },
      )
    }

    const url = await uploadCommunityImageToSupabase({
      uid: user.uid,
      file,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Community image upload error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'upload.imageUploadFailed'),
      },
      { status: 500 },
    )
  }
}
