export type SupportKind = 'housing' | 'question' | 'suggestion'
export type SupportStatus = 'open' | 'waiting_user' | 'closed'
export type SupportSender = 'user' | 'staff' | 'system'

export type ConversationRow = {
  id: string
  brand: string
  city: string
  kind: SupportKind
  status: SupportStatus
  user_uid: string
  user_email: string | null
  user_name: string | null
  title: string | null
  listing_id: string | null
  listing_snapshot: ListingSnapshot | null
  housing_snapshot: HousingProfile | null
  lead_source: string
  assignee_email: string | null
  assigned_at: string | null
  sla_started_at: string | null
  escalation_level: number
  first_response_at: string | null
  last_message_at: string
  last_message_preview: string | null
  last_sender: SupportSender | null
  user_unread: number
  staff_unread: number
  user_last_read_at: string | null
  staff_last_read_at: string | null
  user_email_due_at: string | null
  user_emailed_at: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  closed_by: string | null
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_type: SupportSender
  sender_uid: string | null
  sender_email: string | null
  sender_display: string | null
  body: string
  redactions: number
  created_at: string
}

export type StaffRow = {
  email: string
  agent_id: string | null
  display_name: string
  active: boolean
  in_rotation: boolean
  rotation_order: number
  accepting: boolean
  last_assigned_at: string | null
  inbox_key: string
}

export type ListingSnapshot = {
  title?: string
  address?: string
  area?: string
  price?: number | null
  photo?: string | null
  propertyId?: string | null
  unitId?: string | null
}

/** Housing first-inquiry form (spec §4.1 + §15). Option values are keys; texts live in i18n. */
export type HousingProfile = {
  name?: string
  email?: string
  phone?: string
  moveIn?: string // YYYY-MM-DD
  budget?: string
  /** Exact monthly budget typed by the user (USD); `budget` is its range key */
  budgetAmount?: number
  roomType?: string
  occupants?: number
  occupation?: 'worker' | 'student'
  income?: string
  school?: string
  graduation?: string // YYYY-MM
  approval?: string
  approvalOther?: string
  pets?: 'yes' | 'no' | null
}

export const BUDGET_OPTIONS = ['under_1500', '1500_2000', '2000_2500', '2500_3000', '3000_3500', '3500_4500', 'over_4500'] as const
export const INCOME_OPTIONS = ['under_50k', '50_75k', '75_100k', '100_150k', 'over_150k'] as const
export const ROOM_OPTIONS = ['roommate_room', 'studio', 'one_bed', 'two_bed_plus', 'any'] as const
export const APPROVAL_OPTIONS = ['own_income', 'guarantor', 'guarantor_company', 'other'] as const
