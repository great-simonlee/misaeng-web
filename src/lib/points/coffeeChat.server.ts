import { getPointsProfile } from './account.server'
import { getPointsConfig, ruleAmount, ruleCap } from './config.server'
import { COFFEE_CHAT_DISCLAIMER_VERSION } from './defaults'
import { pointsErrors, PointsError } from './errors'
import { ensureLegacyOpening } from './legacy.server'
import { notifyCoffeeChat, type CoffeeChatPushStatus } from './notify.server'
import { enc, pointsRest, pointsRpc, type PointsRpcResult } from './rest.server'

/**
 * Coffee chats (spec 4.4): request → hold spend.coffee_chat; complete / no_show → capture (spend row);
 * cancel → release. School/work verification required to request (spec 3.1.1).
 */

export type CoffeeChatStatus = 'requested' | 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type CoffeeChatRequest = {
  id: string
  user_id: string
  mentor_id: string | null
  topic: string
  message: string | null
  preferred_times: string | null
  status: CoffeeChatStatus
  amount: number
  hold_id: string | null
  disclaimer_version: string
  agreed_at: string
  scheduled_at: string | null
  mentor_note: string | null
  cancelled_by: 'user' | 'mentor' | 'admin' | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const SELECT =
  'id,user_id,mentor_id,topic,message,preferred_times,status,amount,hold_id,disclaimer_version,agreed_at,scheduled_at,mentor_note,cancelled_by,completed_at,created_at,updated_at'

export const COFFEE_TOPIC_MAX = 120
export const COFFEE_MESSAGE_MAX = 2000

export async function requestCoffeeChat(input: {
  uid: string
  topic: string
  message?: string | null
  preferredTimes?: string | null
  mentorId?: string | null
  requestKey?: string | null
}) {
  const { tier } = await getPointsProfile(input.uid)
  if (tier !== 'identity') throw pointsErrors.identityRequired()
  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'spend.coffee_chat')
  if (amount <= 0) throw pointsErrors.disabled()

  await ensureLegacyOpening(input.uid)
  const key = `coffee:${input.uid}:${input.requestKey?.trim() || crypto.randomUUID()}`
  const result = await pointsRpc<PointsRpcResult>('request_coffee_chat', {
    p_user_id: input.uid,
    p_amount: amount,
    p_monthly_cap: ruleCap(config, 'cap.coffee_chat_monthly'),
    p_topic: input.topic.slice(0, COFFEE_TOPIC_MAX),
    p_message: input.message ? input.message.slice(0, COFFEE_MESSAGE_MAX) : null,
    p_preferred_times: input.preferredTimes ? input.preferredTimes.slice(0, 500) : null,
    p_mentor_id: input.mentorId || null,
    p_disclaimer_version: COFFEE_CHAT_DISCLAIMER_VERSION,
    p_idempotency_key: key,
  })
  if (!result?.ok) {
    if (result?.error === 'insufficient') throw pointsErrors.insufficient(result.required ?? amount, result.available ?? 0)
    if (result?.error === 'monthly_cap') {
      throw new PointsError('Coffee chat monthly limit', 'points.coffeeChat.monthlyCap', 409, { max: result.cap ?? 0 }, 'COFFEE_CHAT_MONTHLY_CAP')
    }
    if (result?.error === 'disabled') throw pointsErrors.disabled()
    throw new Error(`request_coffee_chat failed: ${result?.error ?? 'unknown'}`)
  }
  const request = await getCoffeeChat(String(result.request_id))
  return { request, duplicate: Boolean(result.duplicate), balance: result.balance ?? 0, available: result.available ?? 0 }
}

export async function getCoffeeChat(id: string): Promise<CoffeeChatRequest | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await pointsRest<CoffeeChatRequest[]>(`coffee_chat_requests?id=eq.${enc(id)}&select=${SELECT}`)
  return rows?.[0] ?? null
}

export async function listMyCoffeeChats(uid: string, limit = 50): Promise<CoffeeChatRequest[]> {
  return (
    (await pointsRest<CoffeeChatRequest[]>(
      `coffee_chat_requests?user_id=eq.${enc(uid)}&select=${SELECT}&order=created_at.desc&limit=${Math.min(limit, 100)}`,
    )) ?? []
  )
}

export type CoffeeChatAction = 'schedule' | 'complete' | 'cancel' | 'no_show'

const PUSH_FOR: Record<CoffeeChatAction, CoffeeChatPushStatus> = {
  schedule: 'scheduled',
  complete: 'completed',
  cancel: 'cancelled',
  no_show: 'no_show',
}

export async function transitionCoffeeChat(input: {
  id: string
  action: CoffeeChatAction
  actor: string | null
  actorRole: 'user' | 'mentor' | 'admin'
  mentorId?: string | null
  scheduledAt?: string | null
  mentorNote?: string | null
  adminNote?: string | null
}) {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new PointsError('Not found', 'points.coffeeChat.notFound', 404)
  const result = await pointsRpc<PointsRpcResult>('transition_coffee_chat', {
    p_request_id: input.id,
    p_action: input.action,
    p_actor: input.actor,
    p_actor_role: input.actorRole,
    p_mentor_id: input.mentorId ?? null,
    p_scheduled_at: input.scheduledAt ?? null,
    p_mentor_note: input.mentorNote ?? null,
    p_admin_note: input.adminNote ?? null,
  })
  if (!result?.ok) {
    if (result?.error === 'not_found') throw new PointsError('Not found', 'points.coffeeChat.notFound', 404)
    if (result?.error === 'invalid_transition') {
      throw new PointsError(`Cannot ${input.action} a ${result.status} request`, 'points.coffeeChat.invalidTransition', 409)
    }
    throw new Error(`transition_coffee_chat failed: ${result?.error ?? 'unknown'}`)
  }
  // the requester gets a push unless they did it themselves
  if (!result.duplicate && result.user_id && input.actorRole !== 'user') {
    notifyCoffeeChat(result.user_id, PUSH_FOR[input.action], input.id)
  }
  return { request: await getCoffeeChat(input.id), duplicate: Boolean(result.duplicate) }
}
