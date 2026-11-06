import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { getConversation, handleAssigned, handleStaffMessage, signalConversation } from '@lib/support/service.server'
import { notifyFeedbackShipped, notifyReporterOfOutcome } from '@lib/support/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body =
  | { event: 'staff_message'; conversationId: string }
  | { event: 'assigned'; conversationId: string; by?: string }
  | { event: 'status'; conversationId: string }
  | { event: 'report_outcome'; reporterUids: string[]; outcome: 'resolved' | 'dismissed' }
  | { event: 'dev_note_done'; noteId: string }

/**
 * ellieo-erp → misaeng-web (x-internal-secret = INTERNAL_PUSH_SECRET). The ERP stores staff actions itself; this sends
 * what only misaeng-web can: user app push / delayed email, staff app push, realtime signals.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = (await request.json().catch(() => null)) as Body | null
  try {
    if (body?.event === 'staff_message' && body.conversationId) await handleStaffMessage(body.conversationId)
    else if (body?.event === 'assigned' && body.conversationId) await handleAssigned(body.conversationId, body.by || '')
    else if (body?.event === 'status' && body.conversationId) {
      const row = await getConversation(body.conversationId)
      if (row) await signalConversation(row, 'status')
    } else if (body?.event === 'report_outcome' && Array.isArray(body.reporterUids))
      notifyReporterOfOutcome(body.reporterUids, body.outcome === 'dismissed' ? 'dismissed' : 'resolved')
    else if (body?.event === 'dev_note_done' && body.noteId) await notifyFeedbackShipped(body.noteId).catch((error) => console.error('Feedback shipped notify failed:', error?.message || error))
    else return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Internal support error:', error)
    return NextResponse.json({ error: (error as Error)?.message || 'Internal error' }, { status: 500 })
  }
}
