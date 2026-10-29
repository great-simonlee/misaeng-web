import { getViewerBlockedUids, readBlockedUsers } from '@lib/community/blocks.server'
import { listProfileCache } from '@lib/supabase/listCache.server'
import { getStoredCommunityPost } from '@lib/supabase/community.server'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

import { pointsTierOf } from './account.server'
import { getPointsConfig, ruleAmount, ruleCap } from './config.server'
import { isPointsLedgerActive } from './engine.server'
import { pointsErrors, PointsError } from './errors'
import { captureHold, earnPoints, holdPoints, releaseHold } from './ledger.server'
import { notifyReviewQuestion } from './notify.server'
import { enc, pointsRest, PointsStoreError } from './rest.server'

/**
 * Private career questions to an interview/job review's author (misaeng-app only; supabase/review_questions.sql).
 *   * A reader asks the review's author, with a topic (QUESTION_TOPICS) and optionally their own situation:
 *     spend.review_question is held (20P).
 *   * The author answers → the hold is captured and the author earns earn.review_answer (10P);
 *     declines → released. Pending questions past expires_at (7 days) are released lazily on every read.
 *   * Text is private to the asker and the author. Anyone sees how many questions a review received (never how many
 *     were answered). One asker may send cap.review_question_monthly (3) about the same review per 30 days,
 *     declined / expired ones included.
 * Behind point setting `review_qna.enabled`.
 */

export const QUESTION_MAX = 300
export const ANSWER_MAX = 1000
export const CONTEXT_MAX = 200
/** Career question topics the asker picks (app: app.reviewQna.topics.*). */
export const QUESTION_TOPICS = ['interview', 'process', 'role', 'career', 'visa'] as const
export type QuestionTopic = (typeof QUESTION_TOPICS)[number]
const isTopic = (value: unknown): value is QuestionTopic => QUESTION_TOPICS.includes(value as QuestionTopic)
const SOURCE = 'review_question'

export type ReviewQuestionStatus = 'pending' | 'answered' | 'declined' | 'expired' | 'cancelled'

type Row = {
  id: string
  post_id: string
  asker_id: string
  author_id: string
  question: string
  topic: string | null
  context: string | null
  answer: string | null
  status: ReviewQuestionStatus
  hold_id: string | null
  amount: number
  reward: number
  created_at: string
  answered_at: string | null
  expires_at: string
  reported_at: string | null
  report_reason: string | null
}

export type ReviewQuestionView = {
  id: string
  postId: string
  postTitle: string | null
  role: 'asker' | 'author'
  /** The other side's nickname (asker as seen by the author; the author as seen by the asker). */
  counterpartName: string | null
  question: string
  /** One of QUESTION_TOPICS (null on questions sent before topics existed). */
  topic: QuestionTopic | null
  /** The asker's own situation (year, major, target role…), optional. */
  context: string | null
  answer: string | null
  status: ReviewQuestionStatus
  amount: number
  reward: number
  createdAt: string
  answeredAt: string | null
  expiresAt: string
  /** The viewer's side or the other side reported it (the team reviews it). */
  reported: boolean
}

const SELECT = 'id,post_id,asker_id,author_id,question,topic,context,answer,status,hold_id,amount,reward,created_at,answered_at,expires_at,reported_at,report_reason'

function storeError(error: unknown): never {
  if (error instanceof PointsStoreError && error.setupRequired) throw pointsErrors.notConfigured()
  throw error
}

async function rest<T>(path: string, init: Parameters<typeof pointsRest>[1] = {}) {
  return pointsRest<T>(path, init).catch(storeError)
}

export async function assertReviewQnaEnabled() {
  const config = await getPointsConfig()
  if (!config.settings['review_qna.enabled'] || !config.tablesReady) throw pointsErrors.disabled()
  return config
}

export async function isReviewQnaEnabled() {
  const config = await getPointsConfig().catch(() => null)
  return Boolean(config?.settings['review_qna.enabled'] && config.tablesReady)
}

const profileOf = (uid: string): Promise<SupabaseProfileRecord | null> =>
  listProfileCache.get(uid, () => getSupabaseProfile(uid)).catch(() => null)

const isGone = (profile: SupabaseProfileRecord | null | undefined) =>
  profile?.status === 'deleted' || profile?.status === 'suspended'

const blocks = (profile: SupabaseProfileRecord | null | undefined, uid: string) =>
  readBlockedUsers(profile).some((entry) => entry.uid === uid)

const err = (key: string, status: number, code: string) => new PointsError(code, `points.reviewQna.${key}`, status, undefined, code)

/** Releases the holds of pending questions past their 7 days (lazy, on every read). */
async function expireDue(filter: string) {
  const due = await rest<Row[]>(
    `review_questions?status=eq.pending&expires_at=lt.${enc(new Date().toISOString())}&${filter}&select=${SELECT}`,
  )
  for (const row of due) {
    const updated = await rest<Row[]>(`review_questions?id=eq.${row.id}&status=eq.pending`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({ status: 'expired', resolved_at: new Date().toISOString() }),
    })
    if (!updated.length) continue
    if (row.hold_id) await releaseHold(row.hold_id, 'system', 'review question expired').catch((e) => console.error('Q&A release:', e))
    notifyReviewQuestion({ kind: 'expired', to: row.asker_id, questionId: row.id, postId: row.post_id, refunded: row.amount })
  }
}

async function view(rows: Row[], viewer: string): Promise<ReviewQuestionView[]> {
  const posts = new Map<string, string | null>()
  const names = new Map<string, string | null>()
  await Promise.all(
    [...new Set(rows.map((r) => r.post_id))].map(async (id) => {
      const post = await getStoredCommunityPost(id).catch(() => null)
      posts.set(id, post?.title ?? null)
    }),
  )
  await Promise.all(
    [...new Set(rows.map((r) => (r.asker_id === viewer ? r.author_id : r.asker_id)))].map(async (uid) => {
      const profile = await profileOf(uid)
      names.set(uid, isGone(profile) ? null : profile?.nickname?.trim() || null)
    }),
  )
  return rows.map((r) => {
    const role = r.asker_id === viewer ? 'asker' : 'author'
    return {
      id: r.id,
      postId: r.post_id,
      postTitle: posts.get(r.post_id) ?? null,
      role,
      counterpartName: names.get(role === 'asker' ? r.author_id : r.asker_id) ?? null,
      question: r.question,
      topic: isTopic(r.topic) ? r.topic : null,
      context: r.context,
      answer: r.answer,
      status: r.status,
      amount: r.amount,
      reward: r.reward,
      createdAt: r.created_at,
      answeredAt: r.answered_at,
      expiresAt: r.expires_at,
      reported: Boolean(r.reported_at),
    }
  })
}

/** Review screen: the public count + the viewer's own questions on it + what they may do now. */
export async function questionsForPost(viewer: string | null, postId: string) {
  if (!(await isReviewQnaEnabled())) return { enabled: false as const }
  const config = await getPointsConfig()
  await expireDue(`post_id=eq.${enc(postId)}`)
  const all = await rest<{ id: string }[]>(`review_questions?post_id=eq.${enc(postId)}&select=id`)
  const post = await getStoredCommunityPost(postId).catch(() => null)
  const isAuthor = Boolean(viewer && post?.authorUid === viewer)
  let mine: ReviewQuestionView[] = []
  let remaining = 0
  if (viewer && !isAuthor) {
    const rows = await rest<Row[]>(
      `review_questions?post_id=eq.${enc(postId)}&asker_id=eq.${enc(viewer)}&select=${SELECT}&order=created_at.desc`,
    )
    mine = await view(rows, viewer)
    const since = Date.now() - 30 * 86_400_000
    const recent = rows.filter((r) => Date.parse(r.created_at) >= since).length
    remaining = Math.max(0, (ruleCap(config, 'cap.review_question_monthly') ?? 99) - recent)
  }
  return {
    enabled: true as const,
    count: all.length,
    cost: ruleAmount(config, 'spend.review_question'),
    reward: ruleAmount(config, 'earn.review_answer'),
    canAsk: Boolean(viewer && post && post.categoryId === 'job-review' && post.authorUid && !isAuthor),
    isAuthor,
    remaining,
    mine,
  }
}

export async function askQuestion(input: {
  uid: string
  postId: string
  question: string
  topic?: unknown
  context?: unknown
  /** The app's per-screen key (a uuid): a retry of the same send returns the first question instead of a second. */
  requestKey?: unknown
}) {
  const config = await assertReviewQnaEnabled()
  const key = typeof input.requestKey === 'string' && /^[0-9a-f-]{36}$/i.test(input.requestKey) ? input.requestKey.toLowerCase() : null
  if (key) {
    const existing = await getRow(key)
    if (existing) {
      if (existing.asker_id !== input.uid || existing.post_id !== input.postId) throw err('notFound', 404, 'QUESTION_NOT_FOUND')
      return (await view([existing], input.uid))[0]
    }
  }
  const text = input.question.trim().slice(0, QUESTION_MAX)
  if (text.length < 5) throw err('tooShort', 400, 'QUESTION_TOO_SHORT')
  const topic = isTopic(input.topic) ? input.topic : null
  const context = typeof input.context === 'string' ? input.context.trim().slice(0, CONTEXT_MAX) || null : null

  const post = await getStoredCommunityPost(input.postId)
  if (!post || post.status !== 'open' || post.categoryId !== 'job-review' || !post.authorUid) {
    throw err('postUnavailable', 404, 'POST_UNAVAILABLE')
  }
  const authorId = post.authorUid
  if (authorId === input.uid) throw err('ownReview', 400, 'OWN_REVIEW')

  const [me, author] = await Promise.all([getSupabaseProfile(input.uid), profileOf(authorId)])
  if (pointsTierOf(me) !== 'identity') throw pointsErrors.identityRequired()
  if (!author || isGone(author) || blocks(author, input.uid) || blocks(me, authorId)) {
    throw err('authorUnavailable', 409, 'AUTHOR_UNAVAILABLE')
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const recent = await rest<{ id: string }[]>(
    `review_questions?post_id=eq.${enc(input.postId)}&asker_id=eq.${enc(input.uid)}&created_at=gte.${enc(since)}&select=id`,
  )
  const cap = ruleCap(config, 'cap.review_question_monthly')
  if (cap !== null && recent.length >= cap) throw pointsErrors.monthlyCap()

  const amount = ruleAmount(config, 'spend.review_question')
  const id = key ?? crypto.randomUUID()
  let holdId: string | null = null
  if (amount > 0) {
    if (!(await isPointsLedgerActive())) throw pointsErrors.notActive()
    const hold = await holdPoints({ uid: input.uid, amount, sourceType: SOURCE, sourceId: id, key: `qna:${id}`, note: input.postId })
    holdId = hold.holdId
  }
  try {
    const rows = await rest<Row[]>('review_questions', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        id,
        post_id: input.postId,
        asker_id: input.uid,
        author_id: authorId,
        question: text,
        topic,
        context,
        hold_id: holdId,
        amount,
      }),
    })
    notifyReviewQuestion({ kind: 'asked', to: authorId, questionId: id, postId: input.postId, preview: text })
    return (await view(rows, input.uid))[0]
  } catch (error) {
    // Same requestKey sent twice at once: the other request inserted it (and owns the hold, keyed by the same id).
    const winner = key ? await getRow(key).catch(() => null) : null
    if (winner && winner.asker_id === input.uid) return (await view([winner], input.uid))[0]
    if (holdId) await releaseHold(holdId, 'system', 'question insert failed').catch(() => null)
    throw error
  }
}

async function getRow(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await rest<Row[]>(`review_questions?id=eq.${id}&select=${SELECT}`)
  return rows[0] ?? null
}

export async function answerQuestion(input: { uid: string; id: string; answer: string }) {
  const config = await assertReviewQnaEnabled()
  const row = await getRow(input.id)
  if (!row || row.author_id !== input.uid) throw err('notFound', 404, 'QUESTION_NOT_FOUND')
  await expireDue(`id=eq.${row.id}`)
  const text = input.answer.trim().slice(0, ANSWER_MAX)
  if (text.length < 2) throw err('answerRequired', 400, 'ANSWER_REQUIRED')

  const reward = ruleAmount(config, 'earn.review_answer')
  const now = new Date().toISOString()
  const updated = await rest<Row[]>(`review_questions?id=eq.${row.id}&status=eq.pending`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ status: 'answered', answer: text, answered_at: now, resolved_at: now, reward }),
  })
  if (!updated.length) throw err('closed', 409, 'QUESTION_CLOSED')
  if (row.hold_id) await captureHold(row.hold_id, 'review_question', input.uid).catch((e) => console.error('Q&A capture:', e))
  if (reward > 0) {
    await earnPoints({
      uid: input.uid,
      amount: reward,
      reason: 'review_answer',
      sourceType: SOURCE,
      sourceId: row.id,
      key: `qna-answer:${row.id}`,
    }).catch((e) => console.error('Q&A reward:', e))
  }
  notifyReviewQuestion({ kind: 'answered', to: row.asker_id, questionId: row.id, postId: row.post_id })
  return (await view(updated, input.uid))[0]
}

export async function declineQuestion(input: { uid: string; id: string }) {
  await assertReviewQnaEnabled()
  const row = await getRow(input.id)
  if (!row || row.author_id !== input.uid) throw err('notFound', 404, 'QUESTION_NOT_FOUND')
  const updated = await rest<Row[]>(`review_questions?id=eq.${row.id}&status=eq.pending`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ status: 'declined', resolved_at: new Date().toISOString() }),
  })
  if (!updated.length) throw err('closed', 409, 'QUESTION_CLOSED')
  if (row.hold_id) await releaseHold(row.hold_id, input.uid, 'declined').catch((e) => console.error('Q&A release:', e))
  notifyReviewQuestion({ kind: 'declined', to: row.asker_id, questionId: row.id, postId: row.post_id, refunded: row.amount })
  return (await view(updated, input.uid))[0]
}

/** My page: questions I sent (`sent`) or received on my reviews (`received`), without people I blocked. */
export async function listQuestions(uid: string, box: 'sent' | 'received') {
  if (!(await isReviewQnaEnabled())) return []
  const column = box === 'sent' ? 'asker_id' : 'author_id'
  await expireDue(`${column}=eq.${enc(uid)}`)
  const [rows, blocked] = await Promise.all([
    rest<Row[]>(`review_questions?${column}=eq.${enc(uid)}&select=${SELECT}&order=created_at.desc&limit=100`),
    getViewerBlockedUids(uid),
  ])
  return view(rows.filter((r) => !blocked.has(box === 'sent' ? r.author_id : r.asker_id)), uid)
}

export const REPORT_REASON_MAX = 500

/** Either side reports the question / answer (App Store 1.2). The team is alerted and handles it by hand. */
export async function reportQuestion(input: { uid: string; id: string; reason: string }) {
  await assertReviewQnaEnabled()
  const row = await getRow(input.id)
  if (!row || (row.asker_id !== input.uid && row.author_id !== input.uid)) throw err('notFound', 404, 'QUESTION_NOT_FOUND')
  const text = input.reason.trim().slice(0, REPORT_REASON_MAX)
  if (!text) throw err('reportReasonRequired', 400, 'REASON_REQUIRED')
  const reporterRole = row.asker_id === input.uid ? 'asker' : 'author'
  const entry = `${reporterRole}: ${text}`
  const reason = (row.report_reason ? `${row.report_reason}\n${entry}` : entry).slice(0, REPORT_REASON_MAX * 2)
  const updated = await rest<Row[]>(`review_questions?id=eq.${row.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ reported_at: new Date().toISOString(), report_reason: reason }),
  })
  const { notifyTeamOfReviewQuestionReport } = await import('@lib/erp/notifyCoffeeChatReport')
  await notifyTeamOfReviewQuestionReport({
    questionId: row.id,
    postId: row.post_id,
    reporterRole,
    reporterUid: input.uid,
    reportedUid: reporterRole === 'asker' ? row.author_id : row.asker_id,
    status: row.status,
    reason: text,
  })
  return (await view(updated.length ? updated : [row], input.uid))[0]
}

/** Blocking from a question: the other side's uid (server only; never sent to the client), or null. */
export async function questionCounterpartUid(uid: string, id: string): Promise<string | null> {
  const row = await getRow(id).catch(() => null)
  if (!row || (row.asker_id !== uid && row.author_id !== uid)) return null
  return row.asker_id === uid ? row.author_id : row.asker_id
}

/** Account deletion: pending questions either way are closed and holds released. */
export async function cleanupQuestionsForDeletedUser(uid: string) {
  const rows = await rest<Row[]>(
    `review_questions?status=eq.pending&or=(asker_id.eq.${enc(uid)},author_id.eq.${enc(uid)})&select=${SELECT}`,
  ).catch(() => [] as Row[])
  for (const row of rows) {
    await rest(`review_questions?id=eq.${row.id}&status=eq.pending`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled', resolved_at: new Date().toISOString() }),
    }).catch(() => null)
    if (row.hold_id) await releaseHold(row.hold_id, 'system', 'account deleted').catch(() => null)
  }
  return `ok (${rows.length})`
}
