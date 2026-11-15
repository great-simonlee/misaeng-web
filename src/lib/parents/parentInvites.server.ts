import { randomInt } from 'node:crypto'

import { isIdentityVerified, isParentAccount } from '@lib/community/schoolGate'
import { DEFAULT_CITY_ID, parseCityId } from '@lib/constants/cities'
import { getPointsConfig, ruleAmount, ruleCap, ruleThreshold } from '@lib/points/config.server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { earnPoints } from '@lib/points/ledger.server'
import { notifyPointsEarned } from '@lib/points/notify.server'
import { enc, pointsRest, PointsStoreError } from '@lib/points/rest.server'
import { notifyUsers } from '@lib/push/notify.server'
import { getSupabaseProfile, upsertSupabaseProfile } from '@lib/supabase/profile.server'

/**
 * 학부모 초대 (1.0.7, supabase/release_1_0_7.sql `parent_invites`).
 *   * 인증한 학생(학교 인증 또는 직장 승인, 학부모 아님)만 링크를 만든다. 링크 하나 = 학부모 한 명, 14일 유효.
 *     학생 한 명당 학부모 최대 cap.parent_invites(2)명 — 가입한 학부모 + 아직 열린 링크를 센다 (평생).
 *   * 링크로 가입(또는 가입 직후 연결)한 계정은 accountType 'parent', invitedByUid = 학생.
 *   * 학생 보상: earn.parent_invite(30P), 가입 rule.parent_invite_delay_days(3)일 뒤, 그때 학부모 계정이 정지·탈퇴·전환이
 *     아니면 지급. 정산은 lazy (학생이 초대 카드·/api/app/me를 읽을 때) + /api/internal/parent-invites/settle.
 * 테이블이 없으면 ParentInviteError('SETUP_REQUIRED', 503) — 읽기 화면은 null로 넘어간다.
 */

const DAY = 24 * 60 * 60 * 1000
export const PARENT_INVITE_TTL_DAYS = 14
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type ParentInviteStatus = 'open' | 'joined' | 'revoked' | 'converted'
export type ParentRewardStatus = 'none' | 'scheduled' | 'paid' | 'forfeited'

type Row = {
  code: string
  student_uid: string
  student_nickname: string | null
  city: string | null
  status: ParentInviteStatus
  parent_uid: string | null
  created_at: string
  expires_at: string
  joined_at: string | null
  reward_status: ParentRewardStatus
  reward_due_at: string | null
  reward_paid_at: string | null
  reward_amount: number | null
  forfeit_reason: string | null
}

const SELECT =
  'code,student_uid,student_nickname,city,status,parent_uid,created_at,expires_at,joined_at,reward_status,reward_due_at,reward_paid_at,reward_amount,forfeit_reason'

/** 화면에 보이는 상태: 가입 대기 / 3일 후 지급 예정 / 지급 완료 / 지급 안 됨 / 만료 / 취소 */
export type ParentInviteState = 'waiting' | 'scheduled' | 'paid' | 'forfeited' | 'expired' | 'revoked'

export type ParentInviteView = {
  code: string
  url: string
  state: ParentInviteState
  status: ParentInviteStatus
  parentNickname: string | null
  createdAt: string
  expiresAt: string
  joinedAt: string | null
  rewardDueAt: string | null
  rewardPaidAt: string | null
  rewardAmount: number
}

export class ParentInviteError extends Error {
  constructor(
    readonly code: string,
    readonly key: string,
    readonly status = 400,
    readonly params?: Record<string, string | number>,
  ) {
    super(code)
    this.name = 'ParentInviteError'
  }
}

const setupError = () => new ParentInviteError('SETUP_REQUIRED', 'parents.notReady', 503)

async function rest<T>(path: string, init: Parameters<typeof pointsRest>[1] = {}) {
  try {
    return await pointsRest<T>(path, init)
  } catch (error) {
    if (error instanceof PointsStoreError && error.setupRequired) throw setupError()
    throw error
  }
}

export function normalizeParentInviteCode(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

function newCode() {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
}

/** https://misaeng.com/{city}/invite/parent/{code} — 앱은 같은 링크(universal link) 또는 misaeng://invite/parent/{code} */
export function parentInviteUrl(origin: string, city: string | null, code: string) {
  return `${origin.replace(/\/+$/, '')}/${parseCityId(city) ?? DEFAULT_CITY_ID}/invite/parent/${code}`
}

async function rules() {
  const config = await getPointsConfig()
  return {
    reward: ruleAmount(config, 'earn.parent_invite'),
    max: ruleCap(config, 'cap.parent_invites') ?? 2,
    delayDays: ruleThreshold(config, 'rule.parent_invite_delay_days') ?? 3,
  }
}

function isExpired(row: Row, now = Date.now()) {
  return row.status === 'open' && Date.parse(row.expires_at) <= now
}

function stateOf(row: Row, now = Date.now()): ParentInviteState {
  if (row.status === 'revoked') return 'revoked'
  if (row.status === 'open') return isExpired(row, now) ? 'expired' : 'waiting'
  if (row.reward_status === 'paid') return 'paid'
  if (row.reward_status === 'forfeited' || row.status === 'converted') return 'forfeited'
  return 'scheduled'
}

async function shape(rows: Row[], origin: string, reward: number): Promise<ParentInviteView[]> {
  const names = new Map<string, string | null>()
  await Promise.all(
    [...new Set(rows.map((r) => r.parent_uid).filter((v): v is string => Boolean(v)))].map(async (uid) => {
      const profile = await getSupabaseProfile(uid).catch(() => null)
      names.set(uid, profile?.status === 'deleted' ? null : profile?.nickname?.trim() || null)
    }),
  )
  const now = Date.now()
  return rows.map((row) => ({
    code: row.code,
    url: parentInviteUrl(origin, row.city, row.code),
    state: stateOf(row, now),
    status: row.status,
    parentNickname: row.parent_uid ? (names.get(row.parent_uid) ?? null) : null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    joinedAt: row.joined_at,
    rewardDueAt: row.reward_due_at,
    rewardPaidAt: row.reward_paid_at,
    rewardAmount: row.reward_amount ?? reward,
  }))
}

async function rowsForStudent(uid: string) {
  return rest<Row[]>(`parent_invites?student_uid=eq.${enc(uid)}&select=${SELECT}&order=created_at.asc`)
}

async function getRow(code: string) {
  const normalized = normalizeParentInviteCode(code)
  if (!normalized) return null
  const rows = await rest<Row[]>(`parent_invites?code=eq.${enc(normalized)}&select=${SELECT}`)
  return rows[0] ?? null
}

/** 학부모 슬롯을 차지하는 초대: 가입함(전환 제외) + 아직 유효한 링크 */
function usedSlots(rows: Row[], now = Date.now()) {
  return rows.filter((r) => r.status === 'joined' || (r.status === 'open' && !isExpired(r, now))).length
}

export type ParentInviteEligibility = { eligible: boolean; reason: 'not_verified' | 'parent' | 'suspended' | null }

export function parentInviteEligibility(
  profile: Awaited<ReturnType<typeof getSupabaseProfile>>,
): ParentInviteEligibility {
  if (isParentAccount(profile)) return { eligible: false, reason: 'parent' }
  if (profile?.status === 'suspended') return { eligible: false, reason: 'suspended' }
  if (!isIdentityVerified(profile)) return { eligible: false, reason: 'not_verified' }
  return { eligible: true, reason: null }
}

export type ParentInviteSummary = ParentInviteEligibility & {
  max: number
  remaining: number
  rewardPoints: number
  delayDays: number
  invites: ParentInviteView[]
}

/** 마이페이지 초대 카드 (학생). 지급일이 지난 보상은 여기서 정산한다. */
export async function getParentInviteSummary(uid: string, origin: string): Promise<ParentInviteSummary> {
  const profile = await getSupabaseProfile(uid)
  const eligibility = parentInviteEligibility(profile)
  const { reward, max, delayDays } = await rules()
  if (eligibility.reason === 'parent') {
    return { ...eligibility, max, remaining: 0, rewardPoints: reward, delayDays, invites: [] }
  }
  await settleParentRewards({ studentUid: uid }).catch((error) => console.error('Parent reward settle error:', error))
  const rows = await rowsForStudent(uid)
  const visible = rows.filter((r) => r.status !== 'revoked')
  return {
    ...eligibility,
    max,
    remaining: eligibility.eligible ? Math.max(0, max - usedSlots(rows)) : 0,
    rewardPoints: reward,
    delayDays,
    invites: await shape(visible, origin, reward),
  }
}

export async function createParentInvite(uid: string, input: { city?: string | null; origin: string }) {
  const profile = await getSupabaseProfile(uid)
  const eligibility = parentInviteEligibility(profile)
  if (eligibility.reason === 'parent') throw new ParentInviteError('PARENT_NOT_ALLOWED', 'parents.parentCannotInvite', 403)
  if (eligibility.reason === 'suspended') throw new ParentInviteError('ACCOUNT_SUSPENDED', 'common.accountSuspended', 403)
  if (!eligibility.eligible) throw new ParentInviteError('VERIFICATION_REQUIRED', 'parents.verifyFirst', 403)
  const { reward, max } = await rules()
  const rows = await rowsForStudent(uid)
  if (usedSlots(rows) >= max) throw new ParentInviteError('PARENT_INVITE_LIMIT', 'parents.limit', 409, { max })

  const now = Date.now()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const inserted = await rest<Row[]>('parent_invites', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          code: newCode(),
          student_uid: uid,
          student_nickname: profile?.nickname?.trim() || null,
          city: parseCityId(input.city) ?? DEFAULT_CITY_ID,
          status: 'open',
          created_at: new Date(now).toISOString(),
          expires_at: new Date(now + PARENT_INVITE_TTL_DAYS * DAY).toISOString(),
          reward_status: 'none',
        }),
      })
      const [view] = await shape(inserted, input.origin, reward)
      return view
    } catch (error) {
      // 코드 충돌(23505)만 다시 시도
      if (error instanceof PointsStoreError && error.code === '23505') continue
      throw error
    }
  }
  throw new Error('Could not allocate a parent invite code')
}

export async function revokeParentInvite(uid: string, code: string) {
  const row = await getRow(code)
  if (!row || row.student_uid !== uid) throw new ParentInviteError('NOT_FOUND', 'parents.inviteNotFound', 404)
  if (row.status !== 'open') throw new ParentInviteError('ALREADY_USED', 'parents.inviteUsed', 409)
  await rest(`parent_invites?code=eq.${enc(row.code)}&status=eq.open`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'revoked' }),
  })
  return { ok: true as const }
}

export type PublicParentInvite = {
  code: string
  /** valid = 가입·연결 가능 */
  status: 'valid' | 'used' | 'expired' | 'revoked'
  inviterName: string | null
  city: string
}

/** 초대 랜딩 페이지 (로그인 없이). 학생 닉네임만 보인다 */
export async function getPublicParentInvite(code: string): Promise<PublicParentInvite | null> {
  const row = await getRow(code)
  if (!row) return null
  const student = await getSupabaseProfile(row.student_uid).catch(() => null)
  const gone = student?.status === 'deleted' || student?.status === 'suspended'
  return {
    code: row.code,
    status:
      row.status === 'revoked' || gone
        ? 'revoked'
        : row.status !== 'open'
          ? 'used'
          : isExpired(row)
            ? 'expired'
            : 'valid',
    inviterName: gone ? null : student?.nickname?.trim() || row.student_nickname || null,
    city: parseCityId(row.city) ?? DEFAULT_CITY_ID,
  }
}

/**
 * 로그인한 계정을 학부모로 연결 (링크로 가입한 직후). 학교·직장 인증을 했거나 이미 연결된 계정, 학부모를 초대한 학생은 안 된다.
 * 같은 학생·같은 코드로 다시 부르면 그대로 성공 (앱이 재시도해도 안전).
 */
export async function acceptParentInvite(uid: string, code: string) {
  const row = await getRow(code)
  if (!row) throw new ParentInviteError('NOT_FOUND', 'parents.inviteNotFound', 404)
  const profile = await getSupabaseProfile(uid)
  if (row.status === 'joined' && row.parent_uid === uid && profile?.accountType === 'parent') {
    return { ok: true as const, studentUid: row.student_uid, already: true }
  }
  if (row.status === 'revoked') throw new ParentInviteError('REVOKED', 'parents.inviteRevoked', 410)
  if (row.status !== 'open') throw new ParentInviteError('ALREADY_USED', 'parents.inviteUsed', 409)
  if (isExpired(row)) throw new ParentInviteError('EXPIRED', 'parents.inviteExpired', 410)
  if (row.student_uid === uid) throw new ParentInviteError('OWN_INVITE', 'parents.ownInvite', 400)
  if (profile?.status === 'suspended') throw new ParentInviteError('ACCOUNT_SUSPENDED', 'common.accountSuspended', 403)
  if (isParentAccount(profile)) throw new ParentInviteError('ALREADY_PARENT', 'parents.alreadyParent', 409)
  const ownInvites = await rowsForStudent(uid)
  if (
    profile?.schoolEmailVerified ||
    (profile?.workplaceStatus && profile.workplaceStatus !== 'none') ||
    ownInvites.some((r) => r.status !== 'revoked')
  ) {
    throw new ParentInviteError('PARENT_ACCOUNT_INELIGIBLE', 'parents.accountIneligible', 409)
  }
  const student = await getSupabaseProfile(row.student_uid).catch(() => null)
  if (!student || student.status === 'deleted' || student.status === 'suspended') {
    throw new ParentInviteError('REVOKED', 'parents.inviteRevoked', 410)
  }

  const { delayDays, reward } = await rules()
  const now = Date.now()
  const updated = await rest<Row[]>(`parent_invites?code=eq.${enc(row.code)}&status=eq.open`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({
      status: 'joined',
      parent_uid: uid,
      joined_at: new Date(now).toISOString(),
      reward_status: reward > 0 ? 'scheduled' : 'none',
      reward_due_at: new Date(now + delayDays * DAY).toISOString(),
      reward_amount: reward,
    }),
  }).catch((error) => {
    // parent_uid unique: 다른 초대로 이미 연결된 계정
    if (error instanceof PointsStoreError && error.code === '23505') {
      throw new ParentInviteError('ALREADY_PARENT', 'parents.alreadyParent', 409)
    }
    throw error
  })
  if (!updated.length) throw new ParentInviteError('ALREADY_USED', 'parents.inviteUsed', 409)

  await upsertSupabaseProfile(uid, {
    accountType: 'parent',
    invitedByUid: row.student_uid,
    parentInviteCode: row.code,
    parentLinkedAt: now,
  })

  // 학생에게: "부모님이 가입했어요 · 3일 후 30P"
  notifyUsers({
    type: 'account',
    userIds: [row.student_uid],
    build: (t) => ({
      title: t('api.push.parents.joined.title'),
      body: t('api.push.parents.joined.body', { days: delayDays, amount: reward }),
      data: { type: 'parent_joined', code: row.code },
      threadId: 'parent-invite',
    }),
  })
  return { ok: true as const, studentUid: row.student_uid, already: false }
}

/**
 * 지급일이 지난 학부모 초대 보상 정산. 학부모 계정이 정지·탈퇴·일반 전환이면 지급하지 않는다(forfeited).
 * 포인트 원장이 아직 꺼져 있으면 그대로 둔다 (켜진 뒤 정산). 반환: 처리 건수.
 */
export async function settleParentRewards(input: { studentUid?: string; now?: number } = {}) {
  const now = input.now ?? Date.now()
  const filter = input.studentUid ? `&student_uid=eq.${enc(input.studentUid)}` : ''
  const due = await rest<Row[]>(
    `parent_invites?reward_status=eq.scheduled&reward_due_at=lte.${enc(new Date(now).toISOString())}${filter}&select=${SELECT}&limit=200`,
  )
  if (due.length === 0) return { paid: 0, forfeited: 0 }
  const ledger = await isPointsLedgerActive().catch(() => false)
  let paid = 0
  let forfeited = 0
  for (const row of due) {
    const parent = row.parent_uid ? await getSupabaseProfile(row.parent_uid).catch(() => null) : null
    const student = await getSupabaseProfile(row.student_uid).catch(() => null)
    const forfeit =
      !parent || parent.status === 'suspended' || parent.status === 'deleted' || parent.accountType !== 'parent'
        ? 'parent_unavailable'
        : !student || student.status === 'deleted' || student.status === 'suspended'
          ? 'student_unavailable'
          : null
    if (forfeit) {
      await rest(`parent_invites?code=eq.${enc(row.code)}&reward_status=eq.scheduled`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ reward_status: 'forfeited', forfeit_reason: forfeit }),
      })
      forfeited += 1
      continue
    }
    if (!ledger) continue
    const amount = Math.max(0, Math.trunc(row.reward_amount ?? 0))
    if (amount > 0) {
      const result = await earnPoints({
        uid: row.student_uid,
        amount,
        reason: 'parent_invite',
        sourceType: 'parent_invite',
        sourceId: row.parent_uid ?? row.code,
        key: `earn:parent_invite:${row.parent_uid ?? row.code}`,
        note: `invite ${row.code}`,
      })
      if (!result.ok) continue
      if (!result.duplicate) notifyPointsEarned(row.student_uid, result.amount, 'parent_invite', result.balance)
    }
    await rest(`parent_invites?code=eq.${enc(row.code)}&reward_status=eq.scheduled`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ reward_status: 'paid', reward_paid_at: new Date(now).toISOString() }),
    })
    paid += 1
  }
  return { paid, forfeited }
}

/** 학부모 쪽에서 보는 연결 정보 (/api/app/me `parent`) */
export async function getParentLink(uid: string) {
  const profile = await getSupabaseProfile(uid)
  if (!isParentAccount(profile) || !profile?.invitedByUid) return null
  const student = await getSupabaseProfile(profile.invitedByUid).catch(() => null)
  return {
    invitedByUid: profile.invitedByUid,
    invitedByNickname: student?.status === 'deleted' ? null : student?.nickname?.trim() || null,
    linkedAt: profile.parentLinkedAt ? new Date(profile.parentLinkedAt).toISOString() : null,
  }
}

/** ERP 회원 화면: 이 회원을 초대한 학생 / 이 회원이 초대한 학부모 */
export async function getParentLinksForAdmin(uid: string) {
  const profile = await getSupabaseProfile(uid)
  const [asStudent, asParent] = await Promise.all([
    rowsForStudent(uid).catch(() => [] as Row[]),
    rest<Row[]>(`parent_invites?parent_uid=eq.${enc(uid)}&select=${SELECT}`).catch(() => [] as Row[]),
  ])
  const nickname = async (id: string | null) =>
    id ? (await getSupabaseProfile(id).catch(() => null))?.nickname?.trim() || null : null
  const parentRow = asParent[0] ?? null
  return {
    accountType: profile?.accountType === 'parent' ? 'parent' : 'member',
    invitedBy: profile?.invitedByUid
      ? { uid: profile.invitedByUid, nickname: await nickname(profile.invitedByUid), code: parentRow?.code ?? profile.parentInviteCode ?? null, joinedAt: parentRow?.joined_at ?? null }
      : null,
    convertedAt: profile?.parentConvertedAt ? new Date(profile.parentConvertedAt).toISOString() : null,
    invitedParents: await Promise.all(
      asStudent.map(async (row) => ({
        code: row.code,
        status: row.status,
        state: stateOf(row),
        parentUid: row.parent_uid,
        parentNickname: await nickname(row.parent_uid),
        createdAt: row.created_at,
        joinedAt: row.joined_at,
        rewardStatus: row.reward_status,
        rewardDueAt: row.reward_due_at,
        rewardPaidAt: row.reward_paid_at,
      })),
    ),
  }
}

/** ERP: 학생이 실수로 학부모 링크로 가입한 경우 일반 계정으로. 아직 지급 전이면 학생 보상은 취소. */
export async function convertParentToMember(uid: string) {
  const profile = await getSupabaseProfile(uid)
  if (!isParentAccount(profile)) throw new ParentInviteError('NOT_PARENT', 'parents.notParent', 409)
  await rest(`parent_invites?parent_uid=eq.${enc(uid)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'converted' }),
  }).catch((error) => {
    if (!(error instanceof ParentInviteError)) throw error
  })
  await rest(`parent_invites?parent_uid=eq.${enc(uid)}&reward_status=eq.scheduled`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ reward_status: 'forfeited', forfeit_reason: 'converted' }),
  }).catch((error) => {
    if (!(error instanceof ParentInviteError)) throw error
  })
  // invitedByUid는 기록으로 남긴다 (ERP에서 누가 초대했는지 보인다)
  await upsertSupabaseProfile(uid, { accountType: 'member', parentConvertedAt: Date.now() })
  return { ok: true as const }
}
