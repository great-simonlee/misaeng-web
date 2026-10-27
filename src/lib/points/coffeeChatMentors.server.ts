import { readBlockedUsers, getViewerBlockedUids } from '@lib/community/blocks.server'
import type { Translate } from '@lib/i18n/translate'
import { listProfileCache } from '@lib/supabase/listCache.server'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

import { pointsTierOf } from './account.server'
import { COFFEE_MESSAGE_MAX, COFFEE_TOPIC_MAX, transitionCoffeeChat, type CoffeeChatStatus } from './coffeeChat.server'
import { getPointsConfig, ruleAmount, ruleCap, type PointsConfig } from './config.server'
import {
  COFFEE_CHAT_MENTOR_CONSENT_KEY,
  COFFEE_CHAT_MENTOR_CONSENT_VERSION,
  COFFEE_CHAT_REQUEST_DISCLAIMER_VERSION,
} from './defaults'
import { isPointsLedgerActive } from './engine.server'
import { pointsErrors, PointsError } from './errors'
import { ensureLegacyOpening } from './legacy.server'
import { notifyCoffeeChatMentor } from './notify.server'
import { enc, inList, pointsRest, pointsRpc, PointsStoreError, type PointsRpcResult } from './rest.server'

/**
 * Coffee chat v2 — peer mentors (misaeng-app only; supabase/coffee_chat_mentors.sql).
 *   * Mentor = a user with an approved 'offer' review verification who agreed to the mentor consent. No reward.
 *   * Requester proposes 1–3 times, pays spend.coffee_chat (hold; 0 = free, no hold), identity tier required.
 *   * Mentor accepts one proposed time + pastes their own Zoom link, or declines. Either side may cancel
 *     (requester: only more than 6 hours before the start). Holds are released on cancel / decline / expiry.
 *   * Lazy upkeep on every read: requests whose proposed times are all past → cancelled ('admin', note 'expired');
 *     scheduled chats 90 minutes past the start → completed (hold captured).
 * Mentor cards never link to a review (reviews stay anonymous).
 *
 * LinkedIn exchange (supabase/coffee_chat_linkedin.sql): the requester sends a LinkedIn URL with every request, the
 * mentor gives one when accepting. Visibility is decided here (see linkedinVisible), never by the client; a mentor's
 * LinkedIn never appears in mentor lists / cards / profiles.
 */

// MARK: limits

export const MENTOR_ROLE_MAX = 60
export const MENTOR_INTRO_MAX = 500
export const MENTOR_TOPICS_MAX = 5
export const MENTOR_TOPIC_CHARS = 30
export const DECLINE_REASON_MAX = 200
export const REPORT_REASON_MAX = 1000
export const ZOOM_LINK_MAX = 300
export const LINKEDIN_MAX = 200
const MIN_LEAD_MS = 12 * 60 * 60 * 1000
const MAX_AHEAD_MS = 30 * 24 * 60 * 60 * 1000
const COMPLETE_AFTER_MS = 90 * 60 * 1000

// MARK: rows and views

type MentorRow = {
  user_id: string
  submission_id: string
  company: string
  role: string
  intro: string
  topics: string[] | null
  active: boolean
  consent_version: string
  agreed_at: string
  created_at: string
  updated_at: string
  /** Only selected for the mentor themself (MENTOR_OWN_SELECT); never read for lists or cards. */
  linkedin?: string | null
}

/** Public card columns: no LinkedIn (a mentor's LinkedIn must never reach lists / cards / profiles). */
const MENTOR_SELECT = 'user_id,submission_id,company,role,intro,topics,active,consent_version,agreed_at,created_at,updated_at'
/** The mentor's own row (GET mentor/me, accept). */
const MENTOR_OWN_SELECT = `${MENTOR_SELECT},linkedin`

type ChatRow = {
  id: string
  user_id: string
  mentor_id: string | null
  topic: string
  message: string | null
  status: CoffeeChatStatus
  amount: number
  hold_id: string | null
  proposed_times: string[] | null
  scheduled_at: string | null
  zoom_link: string | null
  accepted_at: string | null
  declined_at: string | null
  cancelled_by: 'user' | 'mentor' | 'admin' | null
  reported_at: string | null
  report_reason: string | null
  requester_linkedin: string | null
  mentor_linkedin: string | null
  created_at: string
}

const CHAT_SELECT =
  'id,user_id,mentor_id,topic,message,status,amount,hold_id,proposed_times,scheduled_at,zoom_link,accepted_at,declined_at,cancelled_by,reported_at,report_reason,requester_linkedin,mentor_linkedin,created_at'

export type MentorView = {
  userId: string
  nickname: string
  avatarUrl: string | null
  company: string
  role: string
  intro: string
  topics: string[]
  verified: true
  schoolVerified: boolean
}

export type MyMentorView = MentorView & {
  active: boolean
  submissionId: string
  consentVersion: string
  linkedinUrl: string | null
}

export type ChatView = {
  id: string
  status: CoffeeChatStatus
  role: 'requester' | 'mentor'
  counterpart: {
    userId: string
    nickname: string
    avatarUrl: string | null
    company: string | null
    role: string | null
    schoolVerified: boolean
    /** null whenever I may not see it (see linkedinVisible). */
    linkedinUrl: string | null
  }
  /** The LinkedIn I gave on this chat (requester: with the request; mentor: when accepting). */
  myLinkedinUrl: string | null
  topic: string
  message: string | null
  proposedTimes: string[]
  scheduledAt: string | null
  zoomLink: string | null
  declined: boolean
  cancelledBy: 'user' | 'mentor' | 'admin' | null
  reported: boolean
  amount: number
  createdAt: string
}

// MARK: config

/** Requester cost right now (0 = free, no hold). */
export function coffeeChatCost(config: PointsConfig) {
  return ruleAmount(config, 'spend.coffee_chat')
}

/** The whole feature is behind point setting `coffee_chat.enabled` (and needs the points tables). */
export async function assertCoffeeChatEnabled() {
  const config = await getPointsConfig()
  if (!config.settings['coffee_chat.enabled'] || !config.tablesReady) throw pointsErrors.disabled()
  return config
}

export function mentorConsent(t: Translate) {
  return { text: t(COFFEE_CHAT_MENTOR_CONSENT_KEY), version: COFFEE_CHAT_MENTOR_CONSENT_VERSION }
}

// MARK: helpers

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id)

const notFound = () => new PointsError('Not found', 'points.coffeeChat.notFound', 404, undefined, 'NOT_FOUND')

function profileOf(uid: string): Promise<SupabaseProfileRecord | null> {
  return listProfileCache.get(uid, () => getSupabaseProfile(uid)).catch(() => null)
}

async function profilesOf(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))]
  const entries = await Promise.all(unique.map(async (uid) => [uid, await profileOf(uid)] as const))
  return new Map(entries)
}

const isGone = (profile: SupabaseProfileRecord | null | undefined) =>
  profile?.status === 'deleted' || profile?.status === 'suspended'

const blocks = (profile: SupabaseProfileRecord | null | undefined, uid: string) =>
  readBlockedUsers(profile).some((entry) => entry.uid === uid)

function photoOf(profile: SupabaseProfileRecord | null | undefined) {
  const url = typeof profile?.photoURL === 'string' ? profile.photoURL.trim() : ''
  return url && !url.startsWith('blob:') ? url : null
}

const iso = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null)

/** "Google LLC" / "google" / "Google, Inc." → "google" */
export function normalizeCompany(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|incorporated|limited)\b/g, ' ')
    .replace(/\s+/g, '')
}

function toMentor(row: MentorRow, profile: SupabaseProfileRecord | null | undefined): MentorView {
  return {
    userId: row.user_id,
    nickname: profile?.nickname?.trim() || '',
    avatarUrl: photoOf(profile),
    company: row.company,
    role: row.role,
    intro: row.intro,
    topics: row.topics ?? [],
    verified: true,
    schoolVerified: Boolean(profile?.schoolEmailVerified),
  }
}

function toMyMentor(row: MentorRow, profile: SupabaseProfileRecord | null | undefined): MyMentorView {
  return {
    ...toMentor(row, profile),
    active: row.active,
    submissionId: row.submission_id,
    consentVersion: row.consent_version,
    linkedinUrl: row.linkedin ?? null,
  }
}

function storeError(error: unknown): never {
  if (error instanceof PointsStoreError && error.setupRequired) throw pointsErrors.notConfigured()
  throw error
}

/** `own` adds the LinkedIn column: only for the mentor themself. */
async function getMentorRow(uid: string, own = false): Promise<MentorRow | null> {
  const select = own ? MENTOR_OWN_SELECT : MENTOR_SELECT
  const rows = await pointsRest<MentorRow[]>(`coffee_chat_mentors?user_id=eq.${enc(uid)}&select=${select}`)
  return rows?.[0] ?? null
}

// MARK: LinkedIn

/**
 * LinkedIn profile URL → normalized `https://<host>/in/<slug>` or null when invalid. Accepts a missing scheme and
 * http (upgraded), www.linkedin.com / country subdomains (kr.linkedin.com) / bare linkedin.com (→ www); the path must be
 * /in/<slug> (optional trailing slash); query and fragment are dropped. At most 200 characters.
 * Mirrors CoffeeChatFormat.linkedinURL in misaeng-app.
 */
export function parseLinkedinUrl(raw: unknown): string | null {
  let value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password || url.port) return null
  const host = url.hostname.toLowerCase()
  if (!/^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/.test(host)) return null
  const match = /^\/in\/([A-Za-z0-9_%-]{2,150})\/?$/.exec(url.pathname)
  if (!match) return null
  const normalized = `https://${host === 'linkedin.com' ? 'www.linkedin.com' : host}/in/${match[1]}`
  return normalized.length <= LINKEDIN_MAX ? normalized : null
}

export const linkedinInvalid = () =>
  new PointsError('Invalid LinkedIn URL', 'points.coffeeChat.linkedinInvalid', 400, { max: LINKEDIN_MAX }, 'LINKEDIN_INVALID')

/**
 * Who sees the other side's LinkedIn on a chat:
 *   requested → the mentor sees the requester's; the requester does not see the mentor's (there is none yet).
 *   scheduled / completed → both see each other's.
 *   declined, cancelled, expired, no_show → nobody.
 */
function linkedinVisible(row: ChatRow, viewerRole: 'requester' | 'mentor') {
  if (row.status === 'scheduled' || row.status === 'completed') return true
  return row.status === 'requested' && viewerRole === 'mentor'
}

/** Requester's last used LinkedIn (prefills the next request); the mentor card's is the fallback and vice versa. */
export async function getMyLinkedin(uid: string) {
  const [profiles, mentor] = await Promise.all([
    pointsRest<{ linkedin: string | null }[]>(`coffee_chat_profiles?user_id=eq.${enc(uid)}&select=linkedin`),
    getMentorRow(uid, true),
  ]).catch(storeError)
  return { linkedinUrl: profiles?.[0]?.linkedin ?? null, mentorLinkedinUrl: mentor?.linkedin ?? null }
}

async function saveLastLinkedin(uid: string, linkedin: string) {
  await pointsRest(`coffee_chat_profiles?on_conflict=user_id`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ user_id: uid, linkedin, updated_at: new Date().toISOString() }),
  }).catch(storeError)
}

async function getChatRow(id: string): Promise<ChatRow | null> {
  if (!isUuid(id)) return null
  const rows = await pointsRest<ChatRow[]>(`coffee_chat_requests?id=eq.${enc(id)}&select=${CHAT_SELECT}`)
  return rows?.[0] ?? null
}

// MARK: offers (approved 'offer' review verifications)

export type OfferOption = { submissionId: string; company: string }

export async function listApprovedOffers(uid: string): Promise<OfferOption[]> {
  try {
    const rows = await pointsRest<{ id: string; result_label: string | null }[]>(
      `verification_submissions?user_id=eq.${enc(uid)}&kind=eq.offer&status=eq.approved&select=id,result_label&order=decided_at.desc.nullslast`,
    )
    return (rows ?? [])
      .map((row) => ({ submissionId: row.id, company: row.result_label?.trim() || '' }))
      .filter((row) => row.company)
  } catch (error) {
    // verification.sql not run → nobody is eligible
    if (error instanceof PointsStoreError && error.setupRequired) return []
    throw error
  }
}

// MARK: mentors

/** Active mentors, newest first, without me and anyone I blocked / who blocked me. `company` matches loosely. */
export async function listMentors(viewerUid: string, company?: string | null): Promise<MentorView[]> {
  const rows = await pointsRest<MentorRow[]>(
    `coffee_chat_mentors?active=eq.true&select=${MENTOR_SELECT}&order=created_at.desc&limit=500`,
  ).catch(storeError)
  const wanted = company?.trim() ? normalizeCompany(company) : ''
  const candidates = (rows ?? []).filter(
    (row) => row.user_id !== viewerUid && (!wanted || normalizeCompany(row.company) === wanted),
  )
  const [myBlocked, profiles] = await Promise.all([
    getViewerBlockedUids(viewerUid),
    profilesOf(candidates.map((row) => row.user_id)),
  ])
  return candidates
    .filter((row) => {
      const profile = profiles.get(row.user_id)
      return profile && !isGone(profile) && !myBlocked.has(row.user_id) && !blocks(profile, viewerUid)
    })
    .map((row) => toMentor(row, profiles.get(row.user_id)))
}

export type PostMentorView = { mentorId: string; company: string; role: string }

/**
 * Coffee chat entry on a job review, for the review's own author only (the one exception to "mentor cards never
 * link to a review" — it goes review → mentor, never mentor card → review). Null unless all of these hold: the
 * feature is on, the post is a visible job review (not on an anonymous board), the viewer is not the author, the
 * author is an active mentor who agreed to the current consent (it says the button shows on their reviews), the
 * mentor row's offer verification is still approved, and neither side blocked the other. The author uid is only
 * returned when all of that holds.
 */
export async function mentorForPost(viewerUid: string, postId: string): Promise<PostMentorView | null> {
  const config = await getPointsConfig()
  if (!config.settings['coffee_chat.enabled'] || !config.tablesReady) return null
  const id = postId.trim()
  if (!id || id.length > 200) return null
  const [{ getStoredCommunityPost }, { isAnonymousBoard }, { isModerationHidden }] = await Promise.all([
    import('@lib/supabase/community.server'),
    import('@lib/constants/nyc'),
    import('@lib/community/moderation'),
  ])
  const post = await getStoredCommunityPost(id).catch(() => null)
  const authorUid = post?.authorUid?.trim() || ''
  if (
    !post ||
    !authorUid ||
    authorUid === viewerUid ||
    post.categoryId !== 'job-review' ||
    isAnonymousBoard(post.categoryId) ||
    post.status === 'closed' ||
    isModerationHidden(post)
  ) {
    return null
  }
  const row = await getMentorRow(authorUid).catch(() => null)
  if (!row?.active || row.consent_version !== COFFEE_CHAT_MENTOR_CONSENT_VERSION) return null
  const [offers, authorProfile, viewerProfile, myBlocked] = await Promise.all([
    listApprovedOffers(authorUid),
    profileOf(authorUid),
    profileOf(viewerUid),
    getViewerBlockedUids(viewerUid),
  ])
  if (!offers.some((offer) => offer.submissionId === row.submission_id)) return null
  if (
    !authorProfile ||
    isGone(authorProfile) ||
    myBlocked.has(authorUid) ||
    blocks(authorProfile, viewerUid) ||
    blocks(viewerProfile, authorUid)
  ) {
    return null
  }
  return { mentorId: authorUid, company: row.company, role: row.role }
}

export async function getMyMentorState(uid: string, t: Translate) {
  const [offers, row, profile] = await Promise.all([
    listApprovedOffers(uid),
    getMentorRow(uid, true).catch(storeError),
    profileOf(uid),
  ])
  const mentor: MyMentorView | null = row ? toMyMentor(row, profile) : null
  return { eligible: offers.length > 0, offers, mentor, consent: mentorConsent(t) }
}

export type MentorInput = {
  submissionId: string
  role: string
  intro: string
  topics: string[]
  active: boolean
  agreed: boolean
  consentVersion: string
  /** undefined = leave as is (older apps don't send it); null = clear. */
  linkedinUrl: string | null | undefined
}

/** Parses + validates the PUT body (PointsError with api keys on failure). */
export function parseMentorInput(body: Record<string, unknown>): MentorInput {
  if (body.agreed !== true) {
    throw new PointsError('Consent not agreed', 'points.coffeeChat.mentorConsentRequired', 400, undefined, 'CONSENT_NOT_AGREED')
  }
  if (body.consentVersion !== COFFEE_CHAT_MENTOR_CONSENT_VERSION) {
    throw new PointsError('Consent outdated', 'points.coffeeChat.mentorConsentOutdated', 409, undefined, 'CONSENT_OUTDATED')
  }
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  if (!role) throw new PointsError('Role required', 'points.coffeeChat.mentorRoleRequired', 400, undefined, 'ROLE_REQUIRED')
  if (role.length > MENTOR_ROLE_MAX) {
    throw new PointsError('Role too long', 'points.coffeeChat.mentorRoleTooLong', 400, { max: MENTOR_ROLE_MAX }, 'ROLE_TOO_LONG')
  }
  const intro = typeof body.intro === 'string' ? body.intro.trim() : ''
  if (intro.length > MENTOR_INTRO_MAX) {
    throw new PointsError('Intro too long', 'points.coffeeChat.mentorIntroTooLong', 400, { max: MENTOR_INTRO_MAX }, 'INTRO_TOO_LONG')
  }
  const rawTopics = body.topics === undefined || body.topics === null ? [] : body.topics
  const topics = Array.isArray(rawTopics)
    ? [...new Set(rawTopics.map((topic) => (typeof topic === 'string' ? topic.trim() : '')).filter(Boolean))]
    : null
  if (!topics || topics.length > MENTOR_TOPICS_MAX || topics.some((topic) => topic.length > MENTOR_TOPIC_CHARS)) {
    throw new PointsError(
      'Invalid topics',
      'points.coffeeChat.mentorTopicsInvalid',
      400,
      { max: MENTOR_TOPICS_MAX, chars: MENTOR_TOPIC_CHARS },
      'TOPICS_INVALID',
    )
  }
  let linkedinUrl: string | null | undefined
  if (body.linkedinUrl === null || (typeof body.linkedinUrl === 'string' && !body.linkedinUrl.trim())) {
    linkedinUrl = null
  } else if (body.linkedinUrl !== undefined) {
    linkedinUrl = parseLinkedinUrl(body.linkedinUrl)
    if (!linkedinUrl) throw linkedinInvalid()
  }
  return {
    linkedinUrl,
    submissionId: typeof body.submissionId === 'string' ? body.submissionId.trim() : '',
    role,
    intro,
    topics,
    active: body.active === undefined ? true : body.active === true,
    agreed: true,
    consentVersion: COFFEE_CHAT_MENTOR_CONSENT_VERSION,
  }
}

/** Creates or updates my mentor card. 403 unless the submission is my approved offer verification. */
export async function saveMentor(uid: string, input: MentorInput): Promise<MyMentorView> {
  const [offers, profile] = await Promise.all([listApprovedOffers(uid), getSupabaseProfile(uid)])
  const offer = offers.find((item) => item.submissionId === input.submissionId)
  if (!offer) {
    throw new PointsError('No approved offer verification', 'points.coffeeChat.mentorNotEligible', 403, undefined, 'MENTOR_NOT_ELIGIBLE')
  }
  if (!profile?.nickname?.trim()) {
    throw new PointsError('Nickname required', 'points.coffeeChat.nicknameRequired', 400, undefined, 'NICKNAME_REQUIRED')
  }
  const now = new Date().toISOString()
  const rows = await pointsRest<MentorRow[]>(`coffee_chat_mentors?on_conflict=user_id&select=${MENTOR_OWN_SELECT}`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({
      user_id: uid,
      submission_id: offer.submissionId,
      company: offer.company,
      role: input.role,
      intro: input.intro,
      topics: input.topics,
      active: input.active,
      consent_version: input.consentVersion,
      agreed_at: now,
      updated_at: now,
      // merge-duplicates only updates the columns sent: leaving it out keeps the stored LinkedIn
      ...(input.linkedinUrl === undefined ? {} : { linkedin: input.linkedinUrl }),
    }),
  }).catch(storeError)
  const row = rows?.[0]
  if (!row) throw new Error('coffee_chat_mentors upsert returned nothing')
  return toMyMentor(row, profile)
}

/** Stops being a mentor: open (unanswered) requests are declined (holds released), then the card is deleted. */
export async function deleteMentor(uid: string, options: { actorDeleted?: boolean } = {}) {
  const open = await pointsRest<ChatRow[]>(
    `coffee_chat_requests?mentor_id=eq.${enc(uid)}&status=eq.requested&proposed_times=not.is.null&select=${CHAT_SELECT}`,
  ).catch(storeError)
  const actorName = options.actorDeleted ? null : (await profileOf(uid))?.nickname ?? null
  let failed = 0
  for (const chat of open ?? []) {
    try {
      const result = await transitionCoffeeChat({ id: chat.id, action: 'cancel', actor: uid, actorRole: 'mentor', notify: false })
      if (!result.duplicate) {
        notifyCoffeeChatMentor({
          kind: 'declined',
          to: chat.user_id,
          chatId: chat.id,
          actorName,
          actorDeleted: options.actorDeleted,
          refunded: chat.hold_id ? chat.amount : 0,
        })
      }
    } catch (error) {
      failed += 1
      console.error('Coffee chat decline on mentor removal failed:', chat.id, error)
    }
  }
  await pointsRest(`coffee_chat_mentors?user_id=eq.${enc(uid)}`, { method: 'DELETE' }).catch(storeError)
  return { declined: (open?.length ?? 0) - failed, failed }
}

// MARK: lazy upkeep

/** Expires stale requests and completes finished chats in `rows`; returns the rows as they are now. */
async function settle(rows: ChatRow[]): Promise<ChatRow[]> {
  const now = Date.now()
  const changed: string[] = []
  for (const row of rows) {
    if (!row.proposed_times) continue
    try {
      if (row.status === 'requested' && row.proposed_times.every((time) => Date.parse(time) <= now)) {
        await transitionCoffeeChat({ id: row.id, action: 'cancel', actor: 'system', actorRole: 'admin', adminNote: 'expired', notify: false })
        changed.push(row.id)
      } else if (
        row.status === 'scheduled' &&
        row.accepted_at &&
        row.scheduled_at &&
        Date.parse(row.scheduled_at) + COMPLETE_AFTER_MS < now
      ) {
        await transitionCoffeeChat({ id: row.id, action: 'complete', actor: 'system', actorRole: 'admin', notify: false })
        changed.push(row.id)
      }
    } catch (error) {
      console.error('Coffee chat upkeep failed:', row.id, error)
    }
  }
  if (changed.length === 0) return rows
  const fresh = new Map<string, ChatRow>()
  for (const id of changed) {
    const row = await getChatRow(id).catch(() => null)
    if (row) fresh.set(id, row)
  }
  return rows.map((row) => fresh.get(row.id) ?? row)
}

// MARK: chat views

async function toChats(rows: ChatRow[], viewerUid: string, t: Translate): Promise<ChatView[]> {
  const counterparts = rows.map((row) => (row.user_id === viewerUid ? row.mentor_id ?? '' : row.user_id))
  const mentorIds = [...new Set(rows.filter((row) => row.user_id === viewerUid && row.mentor_id).map((row) => row.mentor_id as string))]
  const [profiles, mentorRows] = await Promise.all([
    profilesOf(counterparts),
    mentorIds.length
      ? pointsRest<MentorRow[]>(
          `coffee_chat_mentors?user_id=in.${enc(inList(mentorIds))}&select=${MENTOR_SELECT}`,
        ).catch(() => [] as MentorRow[])
      : Promise.resolve([] as MentorRow[]),
  ])
  const mentors = new Map((mentorRows ?? []).map((row) => [row.user_id, row]))
  return rows.map((row, index) => {
    const role = row.user_id === viewerUid ? 'requester' : 'mentor'
    const otherUid = counterparts[index]
    const profile = profiles.get(otherUid)
    const deleted = profile?.status === 'deleted'
    const mentor = role === 'requester' ? mentors.get(otherUid) : undefined
    const otherLinkedin = role === 'mentor' ? row.requester_linkedin : row.mentor_linkedin
    return {
      id: row.id,
      status: row.status,
      role,
      counterpart: {
        userId: otherUid,
        nickname: deleted ? t('account.deletedUser') : profile?.nickname?.trim() || '',
        avatarUrl: deleted ? null : photoOf(profile),
        company: mentor?.company ?? null,
        role: mentor?.role ?? null,
        schoolVerified: !deleted && Boolean(profile?.schoolEmailVerified),
        linkedinUrl: !deleted && linkedinVisible(row, role) ? otherLinkedin ?? null : null,
      },
      myLinkedinUrl: (role === 'mentor' ? row.mentor_linkedin : row.requester_linkedin) ?? null,
      topic: row.topic,
      message: row.message,
      proposedTimes: (row.proposed_times ?? []).map((time) => new Date(time).toISOString()),
      scheduledAt: iso(row.scheduled_at),
      zoomLink: row.status === 'scheduled' ? row.zoom_link : null,
      declined: Boolean(row.declined_at),
      cancelledBy: row.status === 'cancelled' ? row.cancelled_by : null,
      reported: Boolean(row.reported_at),
      amount: row.amount,
      createdAt: new Date(row.created_at).toISOString(),
    } satisfies ChatView
  })
}

/** sent = I asked; received = I am the mentor. v2 chats only (v1 ERP-assigned chats have no proposed times). */
export async function listChats(uid: string, box: 'sent' | 'received', t: Translate): Promise<ChatView[]> {
  const column = box === 'sent' ? 'user_id' : 'mentor_id'
  const rows = await pointsRest<ChatRow[]>(
    `coffee_chat_requests?${column}=eq.${enc(uid)}&proposed_times=not.is.null&select=${CHAT_SELECT}&order=created_at.desc&limit=100`,
  ).catch(storeError)
  return toChats(await settle(rows ?? []), uid, t)
}

/** One chat I take part in (settled), or 404. */
async function getMyChatRow(uid: string, id: string): Promise<ChatRow> {
  const row = await getChatRow(id).catch(storeError)
  if (!row || !row.proposed_times || (row.user_id !== uid && row.mentor_id !== uid)) throw notFound()
  return (await settle([row]))[0]
}

export async function getChat(uid: string, id: string, t: Translate): Promise<ChatView> {
  return (await toChats([await getMyChatRow(uid, id)], uid, t))[0]
}

// MARK: request

/** 1–3 distinct ISO times, each ≥ now + 12h and ≤ now + 30d, sorted. */
export function parseProposedTimes(raw: unknown, now = Date.now()): string[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 3) {
    throw new PointsError('1-3 proposed times required', 'points.coffeeChat.timesRequired', 400, undefined, 'TIMES_REQUIRED')
  }
  const times = raw.map((value) => (typeof value === 'string' ? Date.parse(value) : NaN))
  if (times.some((ms) => !Number.isFinite(ms) || ms < now + MIN_LEAD_MS || ms > now + MAX_AHEAD_MS)) {
    throw new PointsError('Proposed time out of range', 'points.coffeeChat.timesInvalid', 400, undefined, 'TIMES_INVALID')
  }
  return [...new Set(times)].sort((a, b) => a - b).map((ms) => new Date(ms).toISOString())
}

export async function requestMentorChat(input: {
  uid: string
  mentorId: string
  topic: string
  message: string | null
  proposedTimes: string[]
  /** Normalized (parseLinkedinUrl); required. */
  linkedinUrl: string
  requestKey: string | null
  t: Translate
}): Promise<{ chat: ChatView; duplicate: boolean }> {
  const config = await assertCoffeeChatEnabled()
  const { uid, mentorId } = input
  if (!mentorId) throw new PointsError('Mentor required', 'points.coffeeChat.mentorRequired', 400, undefined, 'MENTOR_REQUIRED')
  if (mentorId === uid) throw new PointsError('Own mentor card', 'points.coffeeChat.selfRequest', 400, undefined, 'SELF_REQUEST')

  const [myProfile, mentorProfile, mentorRow] = await Promise.all([
    getSupabaseProfile(uid),
    profileOf(mentorId),
    getMentorRow(mentorId).catch(storeError),
  ])
  if (pointsTierOf(myProfile) !== 'identity') throw pointsErrors.identityRequired()
  if (
    !mentorRow?.active ||
    !mentorProfile ||
    isGone(mentorProfile) ||
    blocks(mentorProfile, uid) ||
    blocks(myProfile, mentorId)
  ) {
    throw new PointsError('Mentor unavailable', 'points.coffeeChat.mentorUnavailable', 409, undefined, 'MENTOR_UNAVAILABLE')
  }

  // last used LinkedIn (prefills the next request). Also fails early (503) when coffee_chat_linkedin.sql hasn't run,
  // before any points are held.
  await saveLastLinkedin(uid, input.linkedinUrl)

  const amount = coffeeChatCost(config)
  // a hold needs the points ledger; before the cutover only a free coffee chat (spend.coffee_chat off) works
  if (amount > 0) {
    if (!(await isPointsLedgerActive())) throw pointsErrors.notActive()
    await ensureLegacyOpening(uid)
  }
  const key = `coffee:${uid}:${input.requestKey?.trim() || crypto.randomUUID()}`
  const result = await pointsRpc<PointsRpcResult>('request_coffee_chat', {
    p_user_id: uid,
    p_amount: amount,
    p_monthly_cap: ruleCap(config, 'cap.coffee_chat_monthly'),
    p_topic: input.topic.slice(0, COFFEE_TOPIC_MAX),
    p_message: input.message ? input.message.slice(0, COFFEE_MESSAGE_MAX) : null,
    p_preferred_times: null,
    p_mentor_id: mentorId,
    p_disclaimer_version: COFFEE_CHAT_REQUEST_DISCLAIMER_VERSION,
    p_idempotency_key: key,
    p_proposed_times: input.proposedTimes,
  }).catch(storeError)
  if (!result?.ok) {
    switch (result?.error) {
      case 'insufficient':
        throw pointsErrors.insufficient(result.required ?? amount, result.available ?? 0)
      case 'monthly_cap':
        throw new PointsError('Coffee chat monthly limit', 'points.coffeeChat.monthlyCap', 409, { max: result.cap ?? 0 }, 'COFFEE_CHAT_MONTHLY_CAP')
      case 'mentor_busy':
        throw new PointsError('Mentor has too many open requests', 'points.coffeeChat.mentorBusy', 409, undefined, 'MENTOR_BUSY')
      case 'duplicate_open':
        throw new PointsError('Open request to this mentor exists', 'points.coffeeChat.duplicateOpen', 409, undefined, 'DUPLICATE_OPEN')
      case 'invalid_times':
        throw new PointsError('1-3 proposed times required', 'points.coffeeChat.timesRequired', 400, undefined, 'TIMES_REQUIRED')
      case 'disabled':
        throw pointsErrors.disabled()
      default:
        throw new Error(`request_coffee_chat failed: ${result?.error ?? 'unknown'}`)
    }
  }
  const requestId = String(result.request_id)
  // request_coffee_chat doesn't know the column; set it right away (before the mentor is told). A repeated
  // requestKey keeps the LinkedIn sent first.
  await pointsRest(
    `coffee_chat_requests?id=eq.${enc(requestId)}&user_id=eq.${enc(uid)}&requester_linkedin=is.null`,
    { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ requester_linkedin: input.linkedinUrl }) },
  ).catch(storeError)
  if (!result.duplicate) {
    notifyCoffeeChatMentor({
      kind: 'request',
      to: mentorId,
      chatId: requestId,
      actorName: myProfile?.nickname ?? null,
      topic: input.topic,
    })
  }
  return { chat: await getChat(uid, requestId, input.t), duplicate: Boolean(result.duplicate) }
}

// MARK: actions

/** https, host zoom.us / zoom.com (or a subdomain), ≤ 300 chars. Returns the trimmed link or null. */
export function parseZoomLink(raw: unknown): string | null {
  const link = typeof raw === 'string' ? raw.trim() : ''
  if (!link || link.length > ZOOM_LINK_MAX) return null
  try {
    const url = new URL(link)
    const host = url.hostname.toLowerCase()
    const zoomHost = ['zoom.us', 'zoom.com'].some((domain) => host === domain || host.endsWith(`.${domain}`))
    return url.protocol === 'https:' && zoomHost && !url.username && !url.password ? link : null
  } catch {
    return null
  }
}

export const REPORT_REASON_CODES = ['linkedin_not_owner'] as const
export type ReportReasonCode = (typeof REPORT_REASON_CODES)[number]

export type ChatAction =
  | { action: 'accept'; scheduledAt: string; zoomLink: string; linkedinUrl: string }
  | { action: 'decline'; reason: string | null }
  | { action: 'cancel' }
  | { action: 'report'; reason: string; reasonCode: ReportReasonCode | null }

export async function actOnChat(uid: string, id: string, input: ChatAction, t: Translate): Promise<ChatView> {
  await assertCoffeeChatEnabled()
  const row = await getMyChatRow(uid, id)
  const isMentor = row.mentor_id === uid
  const isRequester = row.user_id === uid
  const myName = (await profileOf(uid))?.nickname ?? null
  const refunded = row.hold_id ? row.amount : 0

  if (input.action === 'accept') {
    if (!isMentor) throw notFound()
    const wanted = Date.parse(input.scheduledAt)
    const match = (row.proposed_times ?? []).find((time) => Date.parse(time) === wanted)
    if (!match || wanted <= Date.now()) {
      throw new PointsError('Pick one of the proposed times', 'points.coffeeChat.scheduledAtInvalid', 400, undefined, 'SCHEDULED_AT_INVALID')
    }
    // accepting shares the mentor's LinkedIn: the mentor must have agreed to the current consent (which says so)
    const mentorRow = await getMentorRow(uid, true).catch(storeError)
    if (mentorRow?.consent_version !== COFFEE_CHAT_MENTOR_CONSENT_VERSION) {
      throw new PointsError('Consent outdated', 'points.coffeeChat.mentorConsentOutdated', 409, undefined, 'CONSENT_OUTDATED')
    }
    const result = await transitionCoffeeChat({
      id,
      action: 'schedule',
      actor: uid,
      actorRole: 'mentor',
      scheduledAt: match,
      zoomLink: input.zoomLink,
      notify: false,
    })
    // after the transition (nothing is stored when it fails), before the requester is told
    await pointsRest(`coffee_chat_requests?id=eq.${enc(id)}&mentor_id=eq.${enc(uid)}&status=eq.scheduled`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ mentor_linkedin: input.linkedinUrl }),
    }).catch(storeError)
    // the mentor card keeps the latest one to prefill the next accept
    if (mentorRow.linkedin !== input.linkedinUrl) {
      await pointsRest(`coffee_chat_mentors?user_id=eq.${enc(uid)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ linkedin: input.linkedinUrl, updated_at: new Date().toISOString() }),
      }).catch((error) => console.error('Coffee chat mentor LinkedIn save failed:', error))
    }
    if (!result.duplicate) notifyCoffeeChatMentor({ kind: 'accepted', to: row.user_id, chatId: id, actorName: myName })
  } else if (input.action === 'decline' || (input.action === 'cancel' && isMentor && row.status === 'requested')) {
    // a mentor cancelling an unanswered request is a decline
    if (!isMentor) throw notFound()
    if (row.status !== 'requested') {
      throw new PointsError('Not open', 'points.coffeeChat.invalidTransition', 409, undefined, 'INVALID_TRANSITION')
    }
    const result = await transitionCoffeeChat({
      id,
      action: 'cancel',
      actor: uid,
      actorRole: 'mentor',
      declineReason: input.action === 'decline' ? input.reason : null,
      notify: false,
    })
    if (!result.duplicate) {
      notifyCoffeeChatMentor({ kind: 'declined', to: row.user_id, chatId: id, actorName: myName, refunded })
    }
  } else if (input.action === 'cancel') {
    const result = await transitionCoffeeChat({
      id,
      action: 'cancel',
      actor: uid,
      actorRole: isRequester ? 'user' : 'mentor',
      notify: false,
    })
    const other = isRequester ? row.mentor_id : row.user_id
    if (!result.duplicate && other) {
      notifyCoffeeChatMentor({
        kind: 'cancelled',
        to: other,
        chatId: id,
        actorName: myName,
        // the requester hears about the refund; the mentor has nothing at stake
        refunded: isRequester ? 0 : refunded,
      })
    }
  } else if (input.action === 'report') {
    const reporterRole = isRequester ? 'requester' : 'mentor'
    const text = input.reasonCode ? `[${input.reasonCode}]${input.reason ? ` ${input.reason}` : ''}` : input.reason
    const entry = `${reporterRole}: ${text}`
    const reason = (row.report_reason ? `${row.report_reason}\n${entry}` : entry).slice(0, REPORT_REASON_MAX)
    await pointsRest(`coffee_chat_requests?id=eq.${enc(id)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ reported_at: new Date().toISOString(), report_reason: reason, updated_at: new Date().toISOString() }),
    }).catch(storeError)
    const { notifyTeamOfCoffeeChatReport } = await import('@lib/erp/notifyCoffeeChatReport')
    await notifyTeamOfCoffeeChatReport({
      chatId: id,
      reporterRole,
      reporterUid: uid,
      reportedUid: isRequester ? row.mentor_id : row.user_id,
      status: row.status,
      reason: text,
    })
  }
  return getChat(uid, id, t)
}

// MARK: account deletion

/**
 * Account deletion: every open chat of the user is cancelled (holds released, the other side is told) and the
 * mentor card is deleted. Works whether or not the feature is switched on. Returns a short step summary.
 */
export async function cleanupCoffeeChatsForDeletedUser(uid: string): Promise<string> {
  const asRequester =
    (await pointsRest<ChatRow[]>(
      `coffee_chat_requests?user_id=eq.${enc(uid)}&status=in.(requested,scheduled)&select=id,user_id,mentor_id,status,amount,hold_id`,
    )) ?? []
  let cancelled = 0
  let failed = 0
  for (const chat of asRequester) {
    try {
      // 'admin': the requester's own 6-hour rule must not keep a deleted account's chat (and hold) alive
      const result = await transitionCoffeeChat({
        id: chat.id,
        action: 'cancel',
        actor: uid,
        actorRole: 'admin',
        adminNote: 'account_deleted',
        notify: false,
      })
      cancelled += 1
      if (!result.duplicate && chat.mentor_id) {
        notifyCoffeeChatMentor({ kind: 'cancelled', to: chat.mentor_id, chatId: chat.id, actorName: null, actorDeleted: true })
      }
    } catch (error) {
      failed += 1
      console.error('Account deletion: coffee chat cancel failed', chat.id, error)
    }
  }

  // as a mentor: unanswered requests are declined by deleteMentor; scheduled ones are cancelled here
  const scheduled =
    (await pointsRest<ChatRow[]>(
      `coffee_chat_requests?mentor_id=eq.${enc(uid)}&status=eq.scheduled&select=id,user_id,mentor_id,status,amount,hold_id`,
    )) ?? []
  for (const chat of scheduled) {
    try {
      const result = await transitionCoffeeChat({ id: chat.id, action: 'cancel', actor: uid, actorRole: 'mentor', notify: false })
      cancelled += 1
      if (!result.duplicate) {
        notifyCoffeeChatMentor({
          kind: 'cancelled',
          to: chat.user_id,
          chatId: chat.id,
          actorName: null,
          actorDeleted: true,
          refunded: chat.hold_id ? chat.amount : 0,
        })
      }
    } catch (error) {
      failed += 1
      console.error('Account deletion: coffee chat cancel failed', chat.id, error)
    }
  }

  let declined = 0
  try {
    const result = await deleteMentor(uid, { actorDeleted: true })
    declined = result.declined
    failed += result.failed
  } catch (error) {
    // coffee_chat_mentors.sql not run yet: nothing to clean up
    if (!(error instanceof PointsError && error.code === 'POINTS_NOT_CONFIGURED')) throw error
  }
  // stored LinkedIn values: the last used one and the copies on this user's chats (the mentor card is gone above)
  let linkedin = 'ok'
  try {
    await Promise.all([
      pointsRest(`coffee_chat_profiles?user_id=eq.${enc(uid)}`, { method: 'DELETE', prefer: 'return=minimal' }),
      pointsRest(`coffee_chat_requests?user_id=eq.${enc(uid)}&requester_linkedin=not.is.null`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ requester_linkedin: null }),
      }),
      pointsRest(`coffee_chat_requests?mentor_id=eq.${enc(uid)}&mentor_linkedin=not.is.null`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ mentor_linkedin: null }),
      }),
    ])
  } catch (error) {
    // coffee_chat_linkedin.sql not run yet: nothing stored
    if (!(error instanceof PointsStoreError && error.setupRequired)) {
      failed += 1
      linkedin = 'failed'
      console.error('Account deletion: coffee chat LinkedIn wipe failed', error)
    }
  }
  const summary = `${cancelled} cancelled, ${declined} declined, linkedin ${linkedin}`
  if (failed > 0) return `failed (${failed} failed, ${summary})`
  return cancelled + declined > 0 ? `ok (${summary})` : 'skipped'
}
