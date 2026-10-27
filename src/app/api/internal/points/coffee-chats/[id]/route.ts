import { NextResponse } from 'next/server'

import { transitionCoffeeChat, type CoffeeChatAction } from '@lib/points/coffeeChat.server'
import { internalActor, internalErrorResponse, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

const ACTIONS: CoffeeChatAction[] = ['schedule', 'complete', 'cancel', 'no_show']

/**
 * ERP coffee chat transitions (header `x-internal-secret`).
 * { action: 'schedule', mentorId?, scheduledAt? (ISO), mentorNote?, adminNote? }
 * { action: 'complete' }  → hold captured (spend row)
 * { action: 'cancel', by?: 'mentor'|'admin' } → hold released
 * { action: 'no_show' }   → hold captured
 * The requester gets a push for every change.
 */
export async function POST(request: Request, context: RouteContext) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    const { id } = await context.params
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const action = body.action as CoffeeChatAction
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action must be one of ${ACTIONS.join(', ')}.` }, { status: 400 })
    }
    const scheduledAt = typeof body.scheduledAt === 'string' && Number.isFinite(Date.parse(body.scheduledAt))
      ? new Date(body.scheduledAt).toISOString()
      : null
    const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
    const result = await transitionCoffeeChat({
      id,
      action,
      actor: internalActor(request, body),
      actorRole: body.by === 'mentor' ? 'mentor' : 'admin',
      mentorId: str(body.mentorId, 200),
      scheduledAt,
      mentorNote: str(body.mentorNote, 2000),
      adminNote: str(body.adminNote, 2000),
    })
    return NextResponse.json(result)
  } catch (error) {
    return internalErrorResponse(error)
  }
}
