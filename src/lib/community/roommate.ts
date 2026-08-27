import type { RoommateLookingFor } from '@/types/nyc'

export type { RoommateLookingFor }

export const ROOMMATE_LOOKING_FOR_OPTIONS: {
  id: RoommateLookingFor
  label: string
  description: string
}[] = [
  {
    id: 'roommate',
    label: '룸메이트 구해요',
    description: '함께 살 사람을 찾고 있어요',
  },
  {
    id: 'room',
    label: '방 구해요',
    description: '들어갈 방·집을 찾고 있어요',
  },
  {
    id: 'sublet',
    label: '서블렛',
    description: '단기 임대·서블렛을 올리거나 구해요',
  },
]

export const ROOMMATE_LOOKING_FOR_STYLES: Record<
  RoommateLookingFor,
  { badge: string; soft: string; accent: string }
> = {
  roommate: {
    badge: 'bg-[#eff6ff] text-[#1d4ed8] ring-[#93c5fd]/60',
    soft: '#eff6ff',
    accent: '#1d4ed8',
  },
  room: {
    badge: 'bg-[#eefaf4] text-[#0f766e] ring-[#99f6e4]/60',
    soft: '#eefaf4',
    accent: '#0f766e',
  },
  sublet: {
    badge: 'bg-[#fff7ed] text-[#c2410c] ring-[#fdba74]/60',
    soft: '#fff7ed',
    accent: '#c2410c',
  },
}

export const ROOMMATE_BUDGET_MAX = 20_000

export function isRoommateLookingFor(
  value: unknown,
): value is RoommateLookingFor {
  return value === 'roommate' || value === 'room' || value === 'sublet'
}

export function normalizeRoommateLookingFor(
  raw: unknown,
  detailFallback?: string,
): RoommateLookingFor | null {
  if (isRoommateLookingFor(raw)) return raw
  const detail = String(detailFallback || '').trim().toLowerCase()
  if (detail.includes('서블') || detail.includes('sublet')) return 'sublet'
  if (detail.includes('방') || detail === 'room') return 'room'
  if (detail.includes('룸메') || detail === 'roommate') return 'roommate'
  return null
}

export function getRoommateLookingForLabel(
  value: RoommateLookingFor | null | undefined,
) {
  return (
    ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === value)?.label ?? ''
  )
}

export function getRoommateLookingForStyle(
  value: RoommateLookingFor | null | undefined,
) {
  if (value && value in ROOMMATE_LOOKING_FOR_STYLES) {
    return ROOMMATE_LOOKING_FOR_STYLES[value]
  }
  return ROOMMATE_LOOKING_FOR_STYLES.roommate
}

export function normalizeRoommateBudgetMax(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(Math.floor(n), ROOMMATE_BUDGET_MAX)
}

export function normalizeRoommateMoveInDate(raw: unknown): string | null {
  const value = String(raw || '').trim()
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

export function formatRoommateBudget(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return `$${Math.floor(value).toLocaleString('en-US')}`
}

export function formatRoommateMoveInDate(value: string | null | undefined) {
  const date = String(value || '').trim()
  if (!date) return null
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return date
  return `${match[1]}.${match[2]}.${match[3]}`
}

export function isRoommateBoard(id: string) {
  return id === 'roommate'
}
