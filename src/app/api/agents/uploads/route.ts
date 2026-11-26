import { NextResponse } from 'next/server'

import { isUploadRole, uploadListingFile } from '@lib/agents/listings.server'

import { errorResponse, loginRequired, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** One listing photo (multipart: `file` = JPEG the app already shrank, `role` = photo | thumb | floor_plan). */
export async function POST(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const form = await request.formData()
    const file = form.get('file')
    const role = form.get('role') ?? 'photo'
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a photo.', code: 'FILE_REQUIRED' }, { status: 400 })
    if (!isUploadRole(role)) return NextResponse.json({ error: 'Unknown photo type.', code: 'INVALID' }, { status: 400 })
    return NextResponse.json(await uploadListingFile({ uid, file, role }))
  } catch (error) {
    return errorResponse(error, 'upload')
  }
}
