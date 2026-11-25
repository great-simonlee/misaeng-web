import { NextResponse } from 'next/server'

import { agentLicenseState, applyAgentLicense } from '@lib/ellieo/agentLicense.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** My Licensed Agent status: { status: none|pending|approved|rejected|expired, licenseType, brokerage, expiresOn, rejectReason, … } */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json(await agentLicenseState(uid), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'agent license')
  }
}

/**
 * Apply (multipart): licenseNumber, licenseType (broker | salesperson), holderName, brokerage, contact (business phone
 * or email), expiresOn (yyyy-mm-dd, optional), photo = JPEG of the license / pocket card (the app shrinks it).
 * The photo is stored privately; only staff see it, through a 60-second link.
 */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const form = await request.formData()
    const text = (key: string) => {
      const value = form.get(key)
      return typeof value === 'string' ? value : ''
    }
    const photo = form.get('photo')
    const state = await applyAgentLicense(
      uid,
      {
        licenseNumber: text('licenseNumber'),
        licenseType: text('licenseType'),
        holderName: text('holderName'),
        brokerage: text('brokerage'),
        contact: text('contact'),
        expiresOn: text('expiresOn') || null,
      },
      photo instanceof File ? photo : null,
    )
    return NextResponse.json(state)
  } catch (error) {
    return errorResponse(error, 'agent license apply')
  }
}
