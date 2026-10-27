import { notifyUsers } from '@lib/push/notify.server'
import {
  COMMUNITY_CREDIT_BONUS_RULES,
  COMMUNITY_CREDIT_EARN_RULES,
  COMMUNITY_CREDIT_LIMITS,
  COMMUNITY_CREDIT_REFERRAL_POST,
  COMMUNITY_CREDIT_REVIEW_BONUS,
  COMMUNITY_CREDIT_TIMELINE_ENTRY,
  COMMUNITY_CREDIT_TIMELINE_POST_MAX,
  type CommunityCreditAccount,
  type CommunityCreditEarnReason,
  communityCreditEntryLabel,
  type CommunityCreditEntry,
} from '@lib/constants/communityCredit'
import { isAnonymousBoard, isStatusCommunityBoard } from '@lib/constants/nyc'
import { listStoredCommunityPostsByAuthor } from '@lib/supabase/community.server'
import {
  getStoredCommunityCreditAccount,
  isCommunityCreditStorageConfigured,
  saveStoredCommunityCreditAccount,
} from '@lib/supabase/communityCredit.server'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'
import type { CommunityPost } from '@/types/nyc'
import { createTranslator, type Translate } from '@lib/i18n/translate'
import koCreditMessages from '@/messages/ko/credit.json'

function dayKeyAmericaNy(ts: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts))
}

function newEntryId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function earnAmountForReason(reason: CommunityCreditEarnReason): number {
  if (reason === 'school-verify' || reason === 'first-post') {
    const bonus = COMMUNITY_CREDIT_BONUS_RULES.find((item) => item.id === reason)
    return bonus?.amount ?? 0
  }
  if (reason === 'review-bonus') {
    return COMMUNITY_CREDIT_REVIEW_BONUS
  }
  if (reason === 'referral') {
    return COMMUNITY_CREDIT_REFERRAL_POST
  }
  const rule = COMMUNITY_CREDIT_EARN_RULES.find((item) => item.id === reason)
  return rule?.amount ?? 0
}

/**
 * 내역에 저장하는 label. 저장 데이터라서 언어와 상관없이 기존처럼 한국어 문구로 남긴다.
 * 화면은 `communityCreditEntryLabel(entry, t)`로 현재 언어 문구를 보여 준다.
 */
const storedLabelT = createTranslator({ credit: koCreditMessages }, 'ko')
const storedCreditT: Translate = (key, params) => storedLabelT(`credit.${key}`, params)

function storedEntryLabel(
  kind: CommunityCreditEntry['kind'],
  reason: CommunityCreditEarnReason,
): string {
  return communityCreditEntryLabel({ kind, reason, label: '' }, storedCreditT)
}

/** 게시판 → 적립 reason (대상이 아니면 null) */
export function creditReasonForBoard(
  boardId: string,
): Extract<CommunityCreditEarnReason, 'food' | 'status' | 'job-review'> | null {
  if (isAnonymousBoard(boardId)) return null
  if (boardId === 'food') return 'food'
  if (isStatusCommunityBoard(boardId) || boardId === 'status') return 'status'
  if (boardId === 'job-review') return 'job-review'
  return null
}

function hasEarnForSource(
  account: CommunityCreditAccount,
  reason: CommunityCreditEarnReason,
  sourceId: string,
) {
  return account.entries.some(
    (entry) =>
      entry.kind === 'earn' &&
      entry.reason === reason &&
      entry.sourceId === sourceId,
  )
}

function hasOpenRevokeForSource(
  account: CommunityCreditAccount,
  reason: CommunityCreditEarnReason,
  sourceId: string,
) {
  const earned = account.entries
    .filter(
      (entry) =>
        entry.kind === 'earn' &&
        entry.reason === reason &&
        entry.sourceId === sourceId,
    )
    .reduce((sum, entry) => sum + entry.amount, 0)
  const revoked = account.entries
    .filter(
      (entry) =>
        entry.kind === 'revoke' &&
        entry.reason === reason &&
        entry.sourceId === sourceId,
    )
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
  return revoked >= earned && earned > 0
}

function commentEarnToday(account: CommunityCreditAccount, now = Date.now()) {
  const today = dayKeyAmericaNy(now)
  return account.entries
    .filter(
      (entry) =>
        entry.kind === 'earn' &&
        entry.reason === 'comment' &&
        dayKeyAmericaNy(entry.createdAt) === today,
    )
    .reduce((sum, entry) => sum + entry.amount, 0)
}

function appendEntry(
  account: CommunityCreditAccount,
  entry: CommunityCreditEntry,
): CommunityCreditAccount {
  return {
    ...account,
    balance: account.balance + entry.amount,
    entries: [entry, ...account.entries],
    updatedAt: Date.now(),
  }
}

async function mutateAccount(
  uid: string,
  mutator: (account: CommunityCreditAccount) => CommunityCreditAccount,
): Promise<CommunityCreditAccount | null> {
  if (!isCommunityCreditStorageConfigured()) return null
  const userId = String(uid || '').trim()
  if (!userId) return null

  try {
    const current = await getStoredCommunityCreditAccount(userId)
    const next = mutator(current)
    if (next === current) return current
    const saved = await saveStoredCommunityCreditAccount(next)
    notifyCreditEarned(current, saved)
    return saved
  } catch (error) {
    console.error('Community credit mutate error:', error)
    return null
  }
}

/** App push when the balance went up (one notification per award, with the newest entry's reason). */
function notifyCreditEarned(before: CommunityCreditAccount, after: CommunityCreditAccount) {
  const amount = after.balance - before.balance
  if (amount <= 0) return
  const entry = after.entries[0]
  notifyUsers({
    type: 'credit',
    userIds: [after.uid],
    build: (t) => {
      const reasonKey = `credit.ledger.reasons.${entry?.reason ?? ''}`
      const reason = entry?.reason ? t(reasonKey) : ''
      return {
        title: t('api.push.credit.title', { amount }),
        body: t('api.push.credit.body', {
          label: reason && reason !== reasonKey ? reason : entry?.label || '',
          balance: after.balance,
        }),
        data: { type: 'credit' },
        threadId: 'credit',
      }
    },
  })
}

function claimBonus(
  account: CommunityCreditAccount,
  bonusId: 'school-verify' | 'first-post',
  sourceId?: string | null,
): CommunityCreditAccount {
  if (account.bonusesClaimed.includes(bonusId)) return account
  const amount = earnAmountForReason(bonusId)
  if (amount <= 0) return account

  const entry: CommunityCreditEntry = {
    id: newEntryId('bonus'),
    kind: 'earn',
    reason: bonusId,
    amount,
    label: storedEntryLabel('earn', bonusId),
    sourceId: sourceId ?? null,
    createdAt: Date.now(),
  }

  return {
    ...appendEntry(account, entry),
    bonusesClaimed: [...account.bonusesClaimed, bonusId],
  }
}

function netEarnedForSource(
  account: CommunityCreditAccount,
  reason: CommunityCreditEarnReason,
  sourceId: string,
) {
  const earned = account.entries
    .filter(
      (entry) =>
        entry.kind === 'earn' &&
        entry.reason === reason &&
        entry.sourceId === sourceId,
    )
    .reduce((sum, entry) => sum + entry.amount, 0)
  const revoked = account.entries
    .filter(
      (entry) =>
        entry.kind === 'revoke' &&
        entry.reason === reason &&
        entry.sourceId === sourceId,
    )
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
  return Math.max(0, earned - revoked)
}

function isTimelineBoardReason(
  reason: CommunityCreditEarnReason,
): reason is 'status' | 'job-review' {
  return reason === 'status' || reason === 'job-review'
}

export async function awardPostCredit(args: {
  uid: string
  postId: string
  boardId: string
  /** OPT·취업 후기 타임라인 단계 수 */
  timelineCount?: number
}): Promise<CommunityCreditAccount | null> {
  const reason = creditReasonForBoard(args.boardId)
  if (!reason) return null

  if (isTimelineBoardReason(reason)) {
    const steps = Math.max(0, Math.trunc(args.timelineCount ?? 0))
    const target = Math.min(
      steps * COMMUNITY_CREDIT_TIMELINE_ENTRY,
      COMMUNITY_CREDIT_TIMELINE_POST_MAX,
    )
    if (target <= 0) return null

    return mutateAccount(args.uid, (account) => {
      const already = netEarnedForSource(account, reason, args.postId)
      const delta = target - already
      if (delta <= 0) return account

      let next = appendEntry(account, {
        id: newEntryId('earn'),
        kind: 'earn',
        reason,
        amount: delta,
        label: storedEntryLabel('earn', reason),
        sourceId: args.postId,
        createdAt: Date.now(),
      })

      next = claimBonus(next, 'first-post', args.postId)
      return next
    })
  }

  const amount = earnAmountForReason(reason)
  if (amount <= 0) return null

  return mutateAccount(args.uid, (account) => {
    if (hasEarnForSource(account, reason, args.postId)) return account

    let next = appendEntry(account, {
      id: newEntryId('earn'),
      kind: 'earn',
      reason,
      amount,
      label: storedEntryLabel('earn', reason),
      sourceId: args.postId,
      createdAt: Date.now(),
    })

    next = claimBonus(next, 'first-post', args.postId)
    return next
  })
}

export async function awardCommentCredit(args: {
  uid: string
  commentId: string
  postId: string
  boardId: string | null
  postAuthorUid: string | null
  parentAuthorUid: string | null
}): Promise<CommunityCreditAccount | null> {
  if (args.boardId && isAnonymousBoard(args.boardId)) return null
  if (args.postAuthorUid && args.postAuthorUid === args.uid) return null
  if (args.parentAuthorUid && args.parentAuthorUid === args.uid) return null

  const amount = earnAmountForReason('comment')
  if (amount <= 0) return null

  return mutateAccount(args.uid, (account) => {
    if (hasEarnForSource(account, 'comment', args.commentId)) return account

    const todayEarned = commentEarnToday(account)
    if (todayEarned >= COMMUNITY_CREDIT_LIMITS.commentDailyCap) return account

    const remaining = COMMUNITY_CREDIT_LIMITS.commentDailyCap - todayEarned
    const granted = Math.min(amount, remaining)
    if (granted <= 0) return account

    return appendEntry(account, {
      id: newEntryId('earn'),
      kind: 'earn',
      reason: 'comment',
      amount: granted,
      label: storedEntryLabel('earn', 'comment'),
      sourceId: args.commentId,
      createdAt: Date.now(),
    })
  })
}

export async function awardSchoolVerifyCredit(
  uid: string,
): Promise<CommunityCreditAccount | null> {
  return mutateAccount(uid, (account) =>
    claimBonus(account, 'school-verify', 'school-verify'),
  )
}

/** 다른 사람이 추천 코드를 사용하면 추천인에게 +10 (1명당 1회, 최대 7명) */
export async function awardReferralBindCredit(args: {
  referrerUid: string
  referredUid: string
}): Promise<CommunityCreditAccount | null> {
  const referrerUid = String(args.referrerUid || '').trim()
  const referredUid = String(args.referredUid || '').trim()
  if (!referrerUid || !referredUid || referrerUid === referredUid) return null

  const amount = COMMUNITY_CREDIT_REFERRAL_POST
  if (amount <= 0) return null

  const sourceId = `referral:${referredUid}`
  return mutateAccount(referrerUid, (account) => {
    if (hasEarnForSource(account, 'referral', sourceId)) return account
    if (netEarnedForSource(account, 'referral', sourceId) > 0) return account

    return appendEntry(account, {
      id: newEntryId('referral'),
      kind: 'earn',
      reason: 'referral',
      amount,
      label: storedEntryLabel('earn', 'referral'),
      sourceId,
      createdAt: Date.now(),
    })
  })
}

/** 미생 팀 승인 후 최종 결과 리뷰 보너스 (+20) */
export async function awardReviewBonusCredit(args: {
  uid: string
  postId: string
}): Promise<CommunityCreditAccount | null> {
  const amount = COMMUNITY_CREDIT_REVIEW_BONUS
  if (amount <= 0) return null

  return mutateAccount(args.uid, (account) => {
    if (netEarnedForSource(account, 'review-bonus', args.postId) > 0) {
      return account
    }

    return appendEntry(account, {
      id: newEntryId('earn'),
      kind: 'earn',
      reason: 'review-bonus',
      amount,
      label: storedEntryLabel('earn', 'review-bonus'),
      sourceId: args.postId,
      createdAt: Date.now(),
    })
  })
}

export async function revokeSourceCredit(args: {
  uid: string
  sourceId: string
  reasons?: CommunityCreditEarnReason[]
}): Promise<CommunityCreditAccount | null> {
  const reasons = args.reasons ?? [
    'food',
    'status',
    'job-review',
    'comment',
    'first-post',
    'review-bonus',
  ]

  return mutateAccount(args.uid, (account) => {
    let next = account
    for (const reason of reasons) {
      if (hasOpenRevokeForSource(next, reason, args.sourceId)) continue

      const earned = next.entries
        .filter(
          (entry) =>
            entry.kind === 'earn' &&
            entry.reason === reason &&
            entry.sourceId === args.sourceId,
        )
        .reduce((sum, entry) => sum + entry.amount, 0)
      const revoked = next.entries
        .filter(
          (entry) =>
            entry.kind === 'revoke' &&
            entry.reason === reason &&
            entry.sourceId === args.sourceId,
        )
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
      const remaining = earned - revoked
      if (remaining <= 0) continue

      next = appendEntry(next, {
        id: newEntryId('revoke'),
        kind: 'revoke',
        reason,
        amount: -remaining,
        label: storedEntryLabel('revoke', reason),
        sourceId: args.sourceId,
        createdAt: Date.now(),
      })
    }
    return next
  })
}

/**
 * 기존 글·학교 인증 기준으로 소급 적립할 항목을 계산한다 (저장하지 않음).
 * ensureCreditBackfill과 포인트 전환 전 일괄 소급(src/lib/points/legacyBackfill.server.ts)이 같이 쓴다.
 */
export function planCreditBackfill(
  current: CommunityCreditAccount,
  posts: CommunityPost[],
  profile: SupabaseProfileRecord | null,
): { next: CommunityCreditAccount; changed: boolean } {
  let next = current
  let changed = false

  if (profile?.schoolEmailVerified && !next.bonusesClaimed.includes('school-verify')) {
    next = claimBonus(next, 'school-verify', 'school-verify')
    changed = true
  }

  const eligible = posts
    .filter((post) => post.status === 'open')
    .map((post) => ({
      post,
      reason: creditReasonForBoard(post.categoryId),
    }))
    .filter(
      (
        item,
      ): item is {
        post: (typeof posts)[number]
        reason: NonNullable<ReturnType<typeof creditReasonForBoard>>
      } => Boolean(item.reason),
    )
    .sort((a, b) => a.post.createdAt - b.post.createdAt)

  for (const { post, reason } of eligible) {
    if (isTimelineBoardReason(reason)) {
      const steps =
        reason === 'status'
          ? (post.cptOptTimeline?.length ?? 0)
          : (post.jobReviewTimeline?.length ?? 0)
      const target = Math.min(
        steps * COMMUNITY_CREDIT_TIMELINE_ENTRY,
        COMMUNITY_CREDIT_TIMELINE_POST_MAX,
      )
      const already = netEarnedForSource(next, reason, post.id)
      const delta = target - already
      if (delta <= 0) continue

      next = appendEntry(next, {
        id: newEntryId('earn'),
        kind: 'earn',
        reason,
        amount: delta,
        label: storedEntryLabel('earn', reason),
        sourceId: post.id,
        createdAt: post.createdAt,
      })
      next = claimBonus(next, 'first-post', post.id)
      changed = true
      continue
    }

    if (hasEarnForSource(next, reason, post.id)) continue
    const amount = earnAmountForReason(reason)
    if (amount <= 0) continue

    next = appendEntry(next, {
      id: newEntryId('earn'),
      kind: 'earn',
      reason,
      amount,
      label: storedEntryLabel('earn', reason),
      sourceId: post.id,
      createdAt: post.createdAt,
    })
    next = claimBonus(next, 'first-post', post.id)
    changed = true
  }

  return { next, changed }
}

/** 기존 글 기준 소급 + 타임라인 상한까지 추가 적립 동기화 */
export async function ensureCreditBackfill(
  uid: string,
): Promise<CommunityCreditAccount> {
  const userId = String(uid || '').trim()
  if (!userId || !isCommunityCreditStorageConfigured()) {
    return getStoredCommunityCreditAccount(userId || 'unknown')
  }

  const current = await getStoredCommunityCreditAccount(userId)

  try {
    const [posts, profile] = await Promise.all([
      listStoredCommunityPostsByAuthor(userId),
      getSupabaseProfile(userId),
    ])

    const planned = planCreditBackfill(current, posts, profile)
    let next = planned.next
    const changed = planned.changed

    if (!changed && current.backfilledAt) return current

    next = {
      ...next,
      backfilledAt: next.backfilledAt ?? Date.now(),
      updatedAt: Date.now(),
    }

    return await saveStoredCommunityCreditAccount(next)
  } catch (error) {
    console.error('Community credit backfill error:', error)
    return current
  }
}

function summarizeAccount(account: CommunityCreditAccount) {
  const computedBalance = account.entries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  )
  const integrityOk = computedBalance === account.balance

  const lifetimeEarned = account.entries
    .filter((entry) => entry.kind === 'earn')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const lifetimeRevoked = account.entries
    .filter((entry) => entry.kind === 'revoke')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
  const lifetimeSpent = account.entries
    .filter((entry) => entry.kind === 'spend')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)

  return {
    balance: integrityOk ? account.balance : computedBalance,
    lifetimeEarned,
    lifetimeRevoked,
    lifetimeSpent,
    entryCount: account.entries.length,
    integrityOk,
    updatedAt: account.updatedAt,
    computedBalance,
  }
}

async function loadVerifiedAccount(uid: string) {
  let account = await ensureCreditBackfill(uid)
  const summary = summarizeAccount(account)

  if (!summary.integrityOk) {
    console.error('Community credit balance mismatch', {
      uid,
      stored: account.balance,
      computed: summary.computedBalance,
    })
    try {
      account = await saveStoredCommunityCreditAccount({
        ...account,
        balance: summary.computedBalance,
        updatedAt: Date.now(),
      })
    } catch (error) {
      console.error('Community credit repair failed:', error)
      return { account, summary }
    }
    return { account, summary: summarizeAccount(account) }
  }

  return { account, summary }
}

export async function getCommunityCreditSummary(uid: string) {
  const { summary } = await loadVerifiedAccount(uid)
  return {
    balance: summary.balance,
    lifetimeEarned: summary.lifetimeEarned,
    lifetimeRevoked: summary.lifetimeRevoked,
    lifetimeSpent: summary.lifetimeSpent,
    entryCount: summary.entryCount,
    integrityOk: summary.integrityOk,
    updatedAt: summary.updatedAt,
  }
}

export async function getCommunityCreditLedger(
  uid: string,
  limit = 50,
) {
  const { account, summary } = await loadVerifiedAccount(uid)
  const entries = [...account.entries]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.min(Math.max(limit, 1), 100))

  return {
    balance: summary.balance,
    lifetimeEarned: summary.lifetimeEarned,
    lifetimeRevoked: summary.lifetimeRevoked,
    lifetimeSpent: summary.lifetimeSpent,
    entryCount: summary.entryCount,
    integrityOk: summary.integrityOk,
    updatedAt: summary.updatedAt,
    entries,
  }
}
