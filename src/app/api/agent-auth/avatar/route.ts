import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import {
  isSupabaseStorageConfigured,
  uploadAvatarToSupabase,
} from '@lib/supabase/avatar.server'
import { upsertSupabaseProfile } from '@lib/supabase/profile.server'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json(
        {
          error: t('common.storageNotConfigured'),
        },
        { status: 503 },
      )
    }

    const currentUser = await resolveAuthenticatedUser()
    if (!currentUser?.uid) {
      return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { photoURL?: string }
      const photoURL = body.photoURL?.trim()
      if (!photoURL) {
        return NextResponse.json(
          { error: t('upload.photoUrlRequired') },
          { status: 400 },
        )
      }

      await upsertSupabaseProfile(currentUser.uid, {
        email: currentUser.email,
        photoURL,
      }).catch(() => null)

      return NextResponse.json({
        ok: true,
        photoURL,
      })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: t('upload.fileRequired') },
        { status: 400 },
      )
    }

    const bucket = getSupabaseAvatarBucket()
    const photoURL = await uploadAvatarToSupabase({
      uid: currentUser.uid,
      file,
      bucket,
    })

    await upsertSupabaseProfile(currentUser.uid, {
      email: currentUser.email,
      photoURL,
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      photoURL,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'upload.avatarUploadError'),
      },
      { status: 500 },
    )
  }
}
