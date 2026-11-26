import { NextResponse } from 'next/server'

import { agentLicenseState, applyAgentLicense } from '@lib/agents/agentLicense.server'

import { errorResponse, loginRequired, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** My Licensed Agent status (Misaeng only): { status: none|pending|approved|rejected|expired, brokerage, licenseType, expiresOn, rejectReason, … } */
export async function GET() {
  const blocked = notMisaeng()
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
 * Apply (multipart): licenseNumber, licenseType (salesperson | associate_broker | broker, optional), holderName,
 * brokerage, contact (business phone or email), expiresOn (yyyy-mm-dd, optional), photoConsent = 'true' (the ID /
 * face image notice), and three JPEGs the app shrinks: photo (license or pocket card), idPhoto (government ID),
 * selfie. Stored privately; staff see them through 60-second links and they are deleted 30 days after the decision.
 */
export async function POST(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const form = await request.formData()
    const text = (key: string) => {
      const value = form.get(key)
      return typeof value === 'string' ? value : ''
    }
    const file = (key: string) => {
      const value = form.get(key)
      return value instanceof File ? value : null
    }
    const state = await applyAgentLicense(
      uid,
      {
        licenseNumber: text('licenseNumber'),
        licenseType: text('licenseType') || null,
        photoConsent: text('photoConsent') === 'true',
        holderName: text('holderName'),
        brokerage: text('brokerage'),
        contact: text('contact'),
        expiresOn: text('expiresOn') || null,
      },
      { license: file('photo'), id: file('idPhoto'), selfie: file('selfie') },
    )
    return NextResponse.json(state)
  } catch (error) {
    return errorResponse(error, 'agent license apply')
  }
}
