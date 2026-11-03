import { NextResponse } from 'next/server'

import type { Translate } from '@lib/i18n/translate'

import { SupportStoreError } from './rest.server'
import { SupportError } from './service.server'
import {
  APPROVAL_OPTIONS,
  BUDGET_OPTIONS,
  INCOME_OPTIONS,
  ROOM_KIND_OPTIONS,
  ROOM_OPTIONS,
  type ConversationRow,
  type HousingProfile,
  type MessageRow,
} from './types'

export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
} as const

export const supportJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS })

/** `t` = api namespace translator. */
export function supportErrorResponse(t: Translate, error: unknown) {
  if (error instanceof SupportError) return supportJson({ error: t(error.key), code: error.code }, error.status)
  if (error instanceof SupportStoreError && error.setupRequired) {
    return supportJson({ error: t('support.notConfigured'), code: 'SUPPORT_NOT_CONFIGURED' }, 503)
  }
  console.error('Support API error:', error)
  return supportJson({ error: t('support.failed'), code: 'SUPPORT_ERROR' }, 500)
}

/** What a user sees of a conversation (no staff emails). */
export function toUserConversation(row: ConversationRow) {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    listingId: row.listing_id,
    listing: row.listing_snapshot,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    lastSender: row.last_sender,
    unread: row.user_unread,
    staffLastReadAt: row.staff_last_read_at,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  }
}

export function toUserMessage(m: MessageRow) {
  return {
    id: m.id,
    sender: m.sender_type,
    senderName: m.sender_type === 'user' ? null : m.sender_display,
    body: m.body,
    redactions: m.redactions,
    createdAt: m.created_at,
  }
}

const str = (value: unknown, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const oneOf = <T extends readonly string[]>(value: unknown, options: T) =>
  (options as readonly string[]).includes(String(value)) ? (String(value) as T[number]) : undefined

/** Range key for a typed amount (same ranges as the options). */
function budgetKey(amount: number): HousingProfile['budget'] {
  if (amount < 1500) return 'under_1500'
  if (amount < 2000) return '1500_2000'
  if (amount < 2500) return '2000_2500'
  if (amount < 3000) return '2500_3000'
  if (amount < 3500) return '3000_3500'
  if (amount < 4500) return '3500_4500'
  return 'over_4500'
}

/** Cleans the housing form (spec §4.1, §15). Returns null when a required field is missing. */
export function parseHousingProfile(input: unknown): HousingProfile | null {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const occupation = raw.occupation === 'worker' || raw.occupation === 'student' ? raw.occupation : undefined
  const occupants = Math.round(Number(raw.occupants))
  const amount = Math.round(Number(raw.budgetAmount))
  const budgetAmount = Number.isFinite(amount) && amount >= 100 && amount <= 100000 ? amount : undefined
  const profile: HousingProfile = {
    name: str(raw.name, 80),
    email: str(raw.email, 200),
    phone: str(raw.phone, 40),
    moveIn: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.moveIn)) ? String(raw.moveIn) : undefined,
    budget: oneOf(raw.budget, BUDGET_OPTIONS) ?? (budgetAmount ? budgetKey(budgetAmount) : undefined),
    budgetAmount,
    roomType: oneOf(raw.roomType, ROOM_OPTIONS),
    roomKind: raw.roomType === 'roommate_room' ? oneOf(raw.roomKind, ROOM_KIND_OPTIONS) : undefined,
    occupants: Number.isFinite(occupants) && occupants >= 1 && occupants <= 10 ? occupants : undefined,
    occupation,
    income: occupation === 'worker' ? oneOf(raw.income, INCOME_OPTIONS) : undefined,
    school: occupation === 'student' ? str(raw.school, 120) : undefined,
    graduation: occupation === 'student' && /^\d{4}-\d{2}$/.test(String(raw.graduation)) ? String(raw.graduation) : undefined,
    approval: oneOf(raw.approval, APPROVAL_OPTIONS),
    approvalOther: raw.approval === 'other' ? str(raw.approvalOther, 200) : undefined,
    pets: raw.pets === 'yes' || raw.pets === 'no' ? raw.pets : null,
  }
  const required = [profile.name, profile.email, profile.phone, profile.moveIn, profile.budget, profile.roomType, profile.occupants, profile.occupation, profile.approval]
  if (required.some((v) => v === undefined || v === '')) return null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email!)) return null
  if (profile.occupation === 'worker' && !profile.income) return null
  if (profile.occupation === 'student' && (!profile.school || !profile.graduation)) return null
  return profile
}
