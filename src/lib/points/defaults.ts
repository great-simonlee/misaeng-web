/**
 * Misaeng Points — default rules and settings (spec ch.3–4 + product decisions of 2026-10-26).
 * Rows in `point_rules` / `point_settings` override these (supabase/points.sql seeds the same values).
 * Keys are exactly the spec keys. Never hard-code a number elsewhere: read it through config.server.ts.
 *
 * enabled=false semantics (see config.server.ts):
 *   earn.* / spend.* / quota.* → value treated as 0 (feature off)
 *   cap.*                      → no cap
 *   rule.*                     → the check is skipped
 */

export type PointRuleDefault = {
  value: number
  enabled: boolean
  /** shown on the points page / config API (false = internal knob) */
  public: boolean
  description: string
}

export const POINT_RULE_DEFAULTS = {
  // 3.1 sign-up & participation
  'earn.verify_first_email': { value: 30, enabled: true, public: true, description: 'Welcome: first school OR work verification, once per account' },
  'earn.verify_second_email': { value: 10, enabled: false, public: true, description: 'Off by decision: additional verifications earn nothing' },
  'earn.verify_instagram': { value: 5, enabled: true, public: true, description: 'Instagram DM verification approved, once per account' },
  'earn.welcome_instagram_only': { value: 10, enabled: false, public: true, description: 'Off by decision' },
  'earn.onboarding_quiz': { value: 10, enabled: false, public: true, description: 'Quiz content does not exist yet' },
  'earn.profile_complete': { value: 5, enabled: true, public: true, description: 'Required profile fields completed, once' },
  'earn.checkin': { value: 1, enabled: true, public: true, description: 'Daily check-in (America/New_York day)' },
  'earn.checkin_streak7': { value: 3, enabled: true, public: true, description: 'Every 7th consecutive check-in day' },
  'cap.checkin_monthly': { value: 30, enabled: true, public: true, description: 'Max check-in points per month' },
  'earn.referral': { value: 20, enabled: true, public: true, description: 'Referrer, when the referred user completes school/work verification' },
  'cap.referral_monthly': { value: 5, enabled: true, public: true, description: 'Max referral rewards (people) per month' },

  // 3.2 boards
  'earn.interview.base': { value: 20, enabled: true, public: true, description: '' },
  'earn.interview.detail': { value: 15, enabled: true, public: true, description: '' },
  'earn.interview.verified': { value: 15, enabled: true, public: true, description: '' },
  'earn.interview.pick': { value: 20, enabled: true, public: true, description: '' },
  'earn.visa.base': { value: 20, enabled: true, public: true, description: '' },
  'earn.visa.detail': { value: 15, enabled: true, public: true, description: '' },
  'earn.visa.verified': { value: 15, enabled: true, public: true, description: '' },
  'earn.visa.pick': { value: 20, enabled: true, public: true, description: '' },
  'earn.food.base': { value: 5, enabled: true, public: true, description: '' },
  'earn.food.detail': { value: 0, enabled: true, public: false, description: '' },
  'earn.food.verified': { value: 0, enabled: true, public: false, description: '' },
  'earn.food.pick': { value: 5, enabled: true, public: true, description: '' },
  'earn.first_company_review': { value: 30, enabled: true, public: true, description: 'First interview/job review for a company with no reviews' },

  // 3.3 comments
  'earn.comment': { value: 1, enabled: true, public: true, description: '' },
  'cap.comment_daily': { value: 5, enabled: true, public: true, description: 'Max comment points per day' },
  'rule.comment_min_chars': { value: 20, enabled: true, public: true, description: '' },
  'earn.accepted_answer': { value: 5, enabled: false, public: true, description: 'No accepted-answer feature yet' },

  // 3.4 anti-farming
  'cap.interview_monthly': { value: 3, enabled: true, public: true, description: '' },
  'cap.visa_monthly': { value: 3, enabled: true, public: true, description: '' },
  'cap.food_daily': { value: 2, enabled: true, public: true, description: '' },
  'rule.food_min_chars': { value: 50, enabled: true, public: true, description: 'Min plain-text characters for a food review claim' },
  'rule.food_min_photos': { value: 1, enabled: true, public: true, description: '' },
  'rule.similarity_threshold': { value: 60, enabled: true, public: false, description: 'Word-shingle Jaccard % at/above which a claim is held' },

  // 4.1 spending (active)
  'spend.review_unlock': { value: 10, enabled: true, public: true, description: 'Interview/job and visa reviews. Food is always free' },
  'quota.free_unlocks_lifetime': { value: 5, enabled: true, public: true, description: 'Lifetime free unlocks per account (Misaeng + Ellieo)' },
  'spend.coffee_chat': { value: 120, enabled: true, public: true, description: 'Held on request, captured on completion / no-show, released on cancel / decline / expiry' },
  'cap.coffee_chat_monthly': { value: 1, enabled: true, public: true, description: 'Coffee chat requests per month (legacy limit)' },
  'spend.review_question': { value: 20, enabled: true, public: true, description: 'Private question to an interview/job review author. Held on send, captured on answer, released when declined or unanswered in 7 days' },
  'earn.review_answer': { value: 10, enabled: true, public: true, description: 'Review author, per answered question' },
  'cap.review_question_monthly': { value: 3, enabled: true, public: true, description: 'Questions one person can send about the same review per 30 days' },
  'spend.housing_post_boost': { value: 50, enabled: true, public: true, description: 'Roommate/sublet post pinned to the top for rule.housing_boost_days' },
  'rule.housing_boost_days': { value: 7, enabled: true, public: true, description: '' },
  'rule.housing_boost_cooldown_days': { value: 7, enabled: true, public: true, description: 'Days after a boost ends before the same post can be boosted again' },
  'cap.housing_boost_monthly': { value: 2, enabled: true, public: true, description: 'Boosts per user per month' },
  'cap.housing_boost_active': { value: 3, enabled: true, public: true, description: 'Boosted posts at the same time per board and city' },
  'cap.spend_monthly': { value: 0, enabled: false, public: true, description: 'No legacy monthly spend limit existed' },

  // 4.2 spending (inactive)
  'spend.consult_prep_kit': { value: 30, enabled: false, public: true, description: '' },
  'spend.mentor_qna_3': { value: 30, enabled: false, public: true, description: '' },
  'spend.resume_review': { value: 60, enabled: false, public: true, description: '' },
  'spend.mock_interview': { value: 150, enabled: false, public: true, description: '' },
  'spend.group_session_deposit': { value: 20, enabled: false, public: true, description: 'Released on attendance' },
  'spend.event_priority': { value: 10, enabled: false, public: true, description: '' },
  'spend.ai_interview_prep': { value: 5, enabled: false, public: true, description: '' },
} as const satisfies Record<string, PointRuleDefault>

export type PointRuleKey = keyof typeof POINT_RULE_DEFAULTS

export const POINT_RULE_KEYS = Object.keys(POINT_RULE_DEFAULTS) as PointRuleKey[]

export function isPointRuleKey(key: string): key is PointRuleKey {
  return Object.prototype.hasOwnProperty.call(POINT_RULE_DEFAULTS, key)
}

export type PointSettings = {
  'paywall.enabled': boolean
  /** YYYY-MM-DD, America/New_York */
  'paywall.start_date': string | null
  'paywall.notice_days': number
  /** ISO timestamp. Before it (or when null) the legacy credit JSON stays in charge. */
  'points.cutover_at': string | null
  /** Coffee chat v2 (peer mentors, app only). Off until the team turns it on. */
  'coffee_chat.enabled': boolean
  /** Private Q&A with interview/job review authors (app only). Off until the team turns it on. */
  'review_qna.enabled': boolean
}

export type PointSettingKey = keyof PointSettings

export const POINT_SETTING_DEFAULTS: PointSettings = {
  'paywall.enabled': false,
  'paywall.start_date': '2027-03-01',
  'paywall.notice_days': 21,
  'points.cutover_at': null,
  'coffee_chat.enabled': false,
  'review_qna.enabled': false,
}

export const POINT_SETTING_KEYS = Object.keys(POINT_SETTING_DEFAULTS) as PointSettingKey[]

export function isPointSettingKey(key: string): key is PointSettingKey {
  return Object.prototype.hasOwnProperty.call(POINT_SETTING_DEFAULTS, key)
}

/** Review boards that earn through claims */
export type ClaimBoard = 'interview' | 'visa' | 'food'
export type ClaimComponent = 'base' | 'detail' | 'verified' | 'pick' | 'first_company'
export const CLAIM_COMPONENTS: readonly ClaimComponent[] = ['base', 'detail', 'verified', 'pick', 'first_company']

export function claimComponentRuleKey(board: ClaimBoard, component: ClaimComponent): PointRuleKey {
  if (component === 'first_company') return 'earn.first_company_review'
  return `earn.${board}.${component}` as PointRuleKey
}

/**
 * Coffee chat disclaimer (spec 4.4). Shown on the request screen and in the confirmation email,
 * with a required checkbox. Bump the version whenever the text changes.
 */
export const COFFEE_CHAT_DISCLAIMER_VERSION = '2026-10-26'
export const COFFEE_CHAT_DISCLAIMER =
  "Coffee chats are voluntary conversations with mentors. Misaeng does not guarantee any referral, interview, or employment outcome. Any referral is made solely at the mentor's personal discretion and is subject to the policies of the mentor's employer. Misaeng does not receive any monetary benefit from coffee chats or referrals, and mentors are not compensated by Misaeng."

/**
 * Coffee chat v2: consent a peer mentor agrees to (required checkbox). The text itself is localized
 * (api.points.coffeeChat.mentorConsent in src/messages/<locale>/api.json); bump the version whenever it changes.
 */
export const COFFEE_CHAT_MENTOR_CONSENT_VERSION = '2026-10-28-mentor-times'
export const COFFEE_CHAT_MENTOR_CONSENT_KEY = 'points.coffeeChat.mentorConsent'

/**
 * Coffee chat v2: disclaimer the requester agrees to (required checkbox on the app's request sheet). Same content as
 * COFFEE_CHAT_DISCLAIMER plus the LinkedIn exchange, localized (api.points.coffeeChat.requestDisclaimer in
 * src/messages/<locale>/api.json). Bump the version whenever it changes.
 */
export const COFFEE_CHAT_REQUEST_DISCLAIMER_VERSION = '2026-10-28-mentor-times'
export const COFFEE_CHAT_REQUEST_DISCLAIMER_KEY = 'points.coffeeChat.requestDisclaimer'
