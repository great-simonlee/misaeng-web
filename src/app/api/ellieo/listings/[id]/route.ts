import { NextResponse } from 'next/server'

import { deleteListing, getListing } from '@lib/ellieo/listings.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const UUID = /^[0-9a-f-]{36}$/i

export async function GET(_request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const { id } = await params
    const listing = UUID.test(id) ? await getListing(id, await signedInUid()) : null
    if (!listing) return NextResponse.json({ error: 'Listing not found.', code: 'NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ listing })
  } catch (error) {
    return errorResponse(error, 'listing')
  }
}

/** The owner deletes it: hidden now, gone for good after 7 days. */
export async function DELETE(_request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Listing not found.', code: 'NOT_FOUND' }, { status: 404 })
    await deleteListing(id, uid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'delete listing')
  }
}
