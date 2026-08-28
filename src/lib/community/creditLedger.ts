import {
  COMMUNITY_CREDIT_BONUS_RULES,
  COMMUNITY_CREDIT_EARN_RULES,
  COMMUNITY_CREDIT_LIMITS,
  COMMUNITY_CREDIT_REVIEW_BONUS,
  COMMUNITY_CREDIT_TIMELINE_ENTRY,
  COMMUNITY_CREDIT_TIMELINE_POST_MAX,
  type CommunityCreditAccount,
  type CommunityCreditEarnReason,
  type CommunityCreditEntry,
} from '@lib/constants/communityCredit'
import { isAnonymousBoard, isStatusCommunityBoard } from '@lib/constants/nyc'
import { listStoredCommunityPostsByAuthor } from '@lib/supabase/community.server'
import {
  getStoredCommunityCreditAccount,
  isCommunityCreditStorageConfigured,
  saveStoredCommunityCreditAccount,
} from '@lib/supabase/communityCredit.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

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
  const rule = COMMUNITY_CREDIT_EARN_RULES.find((item) => item.id === reason)
  return rule?.amount ?? 0
}

function earnLabelForReason(reason: CommunityCreditEarnReason): string {
  if (reason === 'school-verify' || reason === 'first-post') {
    return (
      COMMUNITY_CREDIT_BONUS_RULES.find((item) => item.id === reason)?.label ??
      '보너스'
    )
  }
  if (reason === 'review-bonus') {
    return '최종 결과 리뷰 보너스'
  }
  return (
    COMMUNITY_CREDIT_EARN_RULES.find((item) => item.id === reason)?.label ??
    '적립'
  )
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
    return await saveStoredCommunityCreditAccount(next)
  } catch (error) {
    console.error('Community credit mutate error:', error)
    return null
  }
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
    label: earnLabelForReason(bonusId),
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
        label: `${earnLabelForReason(reason)} (타임라인)`,
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
      label: earnLabelForReason(reason),
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
      label: earnLabelForReason('comment'),
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
      label: earnLabelForReason('review-bonus'),
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
        label: `${earnLabelForReason(reason)} 회수`,
        sourceId: args.sourceId,
        createdAt: Date.now(),
      })
    }
    return next
  })
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
          label: `${earnLabelForReason(reason)} (타임라인)`,
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
        label: earnLabelForReason(reason),
        sourceId: post.id,
        createdAt: post.createdAt,
      })
      next = claimBonus(next, 'first-post', post.id)
      changed = true
    }

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
