import { after } from 'next/server'

import { getEllieoBaseUrl } from '@/app/api/agent-auth/lib/ellieoServer'
import { forgetReporterEmail } from '@lib/community/reports.server'
import { deleteNotificationsForUser } from '@lib/push/inbox.server'
import { deletePushDataForUser } from '@lib/push/store.server'
import { isSupabaseStorageConfigured } from '@lib/supabase/avatar.server'
import { deletePostSavesForUser } from '@lib/supabase/postSaves.server'
import {
  deleteStoredCommunityPost,
  listAllStoredCommunityPostIds,
  listStoredCommunityPostsByAuthor,
  patchStoredCommunityPost,
} from '@lib/supabase/community.server'
import {
  listStoredCommunityComments,
  saveStoredCommunityComments,
} from '@lib/supabase/communityComments.server'
import { invalidateListProfile } from '@lib/supabase/listCache.server'
import { releaseNickname } from '@lib/supabase/nicknameIndex.server'
import { getSupabaseProfile, upsertSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'
import { getReferralIndex } from '@lib/supabase/referral.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import { deleteAllVerificationFilesForUser } from '@lib/verification/reviewDocsService.server'
import type { CommunityPost } from '@/types/nyc'

import { revokeAppleTokens, type AppleRevokeOutcome } from './appleRevoke.server'

/*
 * Account deletion (App Store guideline 5.1.1(v)) — DELETE /api/app/me (app Bearer token or web cookie session).
 *
 * Misaeng accounts are Ellieo backend accounts. Ellieo lists `POST user/deletion` ("회원 탈퇴") in its API catalog
 * (ellieo-erp src/app/util/ellieoApiCatalog.js); its request body is not documented, so it is called with the user's
 * token and `{ reason }` and the result is logged. Whatever Ellieo answers, the Misaeng side is deleted here:
 *
 *  1. profile.json → tombstone { status: 'deleted', deletedAt } with every personal field cleared (first, so sign-in
 *     is refused from now on even if a later step fails; a repeated call is a no-op re-run of the cleanup)
 *  2. nickname index, referral code index, avatar files
 *  3. verification documents (deleteAllVerificationFilesForUser), push devices / preferences / company follows,
 *     in-app notifications, saved posts, open coffee chats + coffee chat mentor card (points tables only), reporter email on reports they made
 *  4. roommate/sublet posts (personal housing info) are deleted with their uploaded photos; other posts and every
 *     comment are kept for the threads but anonymized ("Deleted user", no photo/badges — render-time too)
 *  5. Sign in with Apple tokens revoked (when Apple keys are configured), Ellieo user/deletion + auth/logout
 * Every step is best effort and logged; only step 1 failing fails the request.
 */

/** Stored author name of a deleted account. Responses show it in the viewer's language (localize.server.ts). */
export const DELETED_AUTHOR_NAME = '탈퇴한 회원'

/** Housing boards: personal housing info, deleted instead of anonymized */
const DELETE_BOARDS = new Set(['roommate'])

/** Profile fields kept on the tombstone (legal consent record + state). Everything else is cleared. */
const KEEP_PROFILE_KEYS = new Set([
  'uid',
  'status',
  'deletedAt',
  'deletionReason',
  'termsVersion',
  'privacyVersion',
  'consentedAt',
  'consentUiLanguage',
  'updatedAt',
])

type KeptProfileKey =
  | 'uid'
  | 'status'
  | 'deletedAt'
  | 'deletionReason'
  | 'termsVersion'
  | 'privacyVersion'
  | 'consentedAt'
  | 'consentUiLanguage'
  | 'updatedAt'

/**
 * Every personal profile field, cleared on the tombstone even when the profile read failed (upsert merges onto what is
 * stored, so clearing only the keys we managed to read could leave personal data behind). Typed as a full record so a
 * new SupabaseProfileRecord field fails type-checking until it is listed here.
 */
const PERSONAL_PROFILE_FIELDS: Record<Exclude<keyof SupabaseProfileRecord, KeptProfileKey>, true> = {
  email: true,
  nickname: true,
  firstName: true,
  lastName: true,
  mbti: true,
  photoURL: true,
  gender: true,
  occupationType: true,
  schoolEmail: true,
  schoolEmailVerified: true,
  verifiedSchoolId: true,
  verifiedSchoolName: true,
  verifiedSchools: true,
  workEmail: true,
  workEmailVerified: true,
  workplaceCompanyName: true,
  workplaceStatus: true,
  workplaceRequestId: true,
  workplaceRejectReason: true,
  workplaceReviewedAt: true,
  workplaceReviewedByEmail: true,
  phone: true,
  phoneVerified: true,
  instagramHandle: true,
  instagramVerified: true,
  instagramStatus: true,
  instagramRequestId: true,
  instagramRejectReasonCode: true,
  instagramRejectReason: true,
  instagramReviewedAt: true,
  instagramReviewedByEmail: true,
  instagramPendingHandle: true,
  instagramPendingCode: true,
  instagramPendingExpiresAt: true,
  instagramPendingSentAt: true,
  writeGuidelinesVersion: true,
  writeGuidelinesConsentedAt: true,
  writeGuidelinesSource: true,
  preferredLocale: true,
  referralCode: true,
  referredByUid: true,
  referredByCode: true,
  referredAt: true,
  blockedUsers: true,
}

/** Older / untyped keys that may still be in stored profile.json files. */
const LEGACY_PERSONAL_KEYS = ['bio', 'avatarUrl', 'avatarURL', 'photoUrl', 'displayName', 'schoolId', 'schoolName']

export type StepOutcome = 'ok' | 'skipped' | 'failed'

export type DeleteAccountReport = {
  steps: Record<string, StepOutcome | string>
  ellieo: 'deleted' | 'unsupported' | 'failed' | 'skipped'
  apple: AppleRevokeOutcome
}

const ANONYMIZED_AUTHOR = {
  authorDeleted: true,
  authorNickname: DELETED_AUTHOR_NAME,
  authorPhotoURL: null,
  authorEmail: '',
  authorSchoolId: null,
} as const

function storageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

async function storageDelete(bucket: string, paths: string[]) {
  const c = storageConfig()
  if (!c || paths.length === 0) return
  for (let i = 0; i < paths.length; i += 100) {
    const res = await fetch(`${c.url}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Storage delete failed (${res.status})`)
  }
}

async function storageList(bucket: string, prefix: string): Promise<string[]> {
  const c = storageConfig()
  if (!c) return []
  const res = await fetch(`${c.url}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const items = (await res.json().catch(() => null)) as Array<{ name?: string; id?: string | null }> | null
  // folders come back with id null
  return (items ?? []).filter((item) => item.name && item.id !== null).map((item) => `${prefix}${item.name}`)
}

async function step(report: DeleteAccountReport, name: string, run: () => Promise<StepOutcome | string | void>) {
  try {
    report.steps[name] = (await run()) || 'ok'
  } catch (error) {
    report.steps[name] = 'failed'
    console.error(`Account deletion step "${name}" failed:`, error)
  }
}

/** Tombstone: keeps consent + state, sets every personal field (fixed list + whatever was read) to null. */
async function writeTombstone(uid: string, existing: SupabaseProfileRecord | null, reason: string | null) {
  const cleared: Record<string, null> = {}
  for (const key of [...Object.keys(PERSONAL_PROFILE_FIELDS), ...LEGACY_PERSONAL_KEYS, ...Object.keys(existing ?? {})]) {
    if (!KEEP_PROFILE_KEYS.has(key)) cleared[key] = null
  }
  await upsertSupabaseProfile(uid, {
    ...(cleared as Partial<SupabaseProfileRecord>),
    status: 'deleted',
    deletedAt: existing?.deletedAt || Date.now(),
    deletionReason: reason ?? existing?.deletionReason ?? null,
  })
}

/** Photos uploaded by this user (<bucket>/community-images/<uid>/…) used in a post, grouped by bucket. */
function ownUploadPaths(post: CommunityPost, uid: string): Map<string, string[]> {
  const escapedUid = uid.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&')
  const pattern = new RegExp(`/storage/v1/object/public/([^/]+)/(community-images/${escapedUid}/[^?#"]+)`)
  const byBucket = new Map<string, string[]>()
  const add = (value: unknown) => {
    const match = typeof value === 'string' ? value.match(pattern) : null
    if (!match) return
    const list = byBucket.get(match[1]) ?? []
    if (!list.includes(match[2])) list.push(match[2])
    byBucket.set(match[1], list)
  }
  add(post.thumbnailUrl)
  for (const photo of post.galleryPhotos ?? []) add(photo.imageUrl)
  for (const item of post.menuItems ?? []) add(item.imageUrl)
  for (const match of post.contentHtml.matchAll(/src="([^"]+)"/g)) add(match[1])
  return byBucket
}

async function anonymizeAllComments(uid: string): Promise<string> {
  const postIds = await listAllStoredCommunityPostIds()
  let changedPosts = 0
  for (let i = 0; i < postIds.length; i += 8) {
    await Promise.all(
      postIds.slice(i, i + 8).map(async (postId) => {
        const comments = await listStoredCommunityComments(postId)
        if (!comments.some((item) => item.authorUid === uid && !item.authorDeleted)) return
        await saveStoredCommunityComments(
          postId,
          comments.map((item) => (item.authorUid === uid ? { ...item, ...ANONYMIZED_AUTHOR } : item)),
        )
        changedPosts += 1
      }),
    )
  }
  return `ok (${changedPosts} threads)`
}

/** Ellieo account: user/deletion with the user's own token, then auth/logout. */
async function deleteEllieoAccount(accessToken: string | null, reason: string | null): Promise<DeleteAccountReport['ellieo']> {
  const baseUrl = getEllieoBaseUrl()
  if (!baseUrl || !accessToken) return 'skipped'
  const call = (path: string, body: unknown) =>
    fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
  let outcome: DeleteAccountReport['ellieo'] = 'failed'
  try {
    let res = await call('user/deletion', reason ? { reason } : {})
    // unknown body contract: retry once without fields on a validation error
    if (res.status === 400 && reason) res = await call('user/deletion', {})
    const text = await res.text().catch(() => '')
    if (res.ok) outcome = 'deleted'
    else if (res.status === 404 || res.status === 405 || res.status === 501) outcome = 'unsupported'
    console.info(`Ellieo user/deletion → ${res.status} ${text.slice(0, 200)}`)
  } catch (error) {
    console.error('Ellieo user/deletion error:', error)
  }
  // forget the session (refresh tokens) — after a successful deletion the token may already be rejected
  await call('auth/logout', {}).catch(() => null)
  return outcome
}

export async function deleteMisaengAccount(input: {
  uid: string
  reason?: string | null
  /** The user's Ellieo access token (app Bearer or web cookie). Used only for Ellieo user/deletion + logout. */
  accessToken: string | null
  /** Optional fresh Sign in with Apple authorization code (lets the server revoke without a stored token). */
  appleAuthorizationCode?: string | null
}): Promise<DeleteAccountReport> {
  const { uid } = input
  const reason = input.reason?.trim().slice(0, 500) || null
  const report: DeleteAccountReport = { steps: {}, ellieo: 'skipped', apple: 'not_configured' }

  // 1. tombstone first (throws → the route answers 500 and nothing else was touched)
  const existing = await getSupabaseProfile(uid)
  if (!isSupabaseStorageConfigured()) throw new Error('Supabase storage is not configured.')
  await writeTombstone(uid, existing, reason)
  report.steps.profile = 'ok'

  // 2. indexes and files
  await step(report, 'nickname', async () => {
    if (!existing?.nickname) return 'skipped'
    await releaseNickname(uid, existing.nickname)
  })
  await step(report, 'referral', async () => {
    const code = existing?.referralCode?.trim()
    if (!code) return 'skipped'
    const index = await getReferralIndex(code)
    if (index?.uid !== uid) return 'skipped'
    await storageDelete(getSupabaseAvatarBucket(), [`community-referrals/${code}.json`])
  })
  await step(report, 'avatar', async () => {
    const files = (await storageList(getSupabaseAvatarBucket(), `${uid}/`)).filter((path) => !path.endsWith('/profile.json'))
    if (files.length === 0) return 'skipped'
    await storageDelete(getSupabaseAvatarBucket(), files)
  })

  // 3. verification documents, push, notifications, points, reports
  await step(report, 'verificationFiles', async () => {
    const result = await deleteAllVerificationFilesForUser(uid)
    return result.failed > 0 ? `failed (${result.failed} of ${result.deleted + result.failed})` : 'ok'
  })
  await step(report, 'push', () => deletePushDataForUser(uid))
  await step(report, 'notifications', () => deleteNotificationsForUser(uid))
  await step(report, 'saves', () => deletePostSavesForUser(uid))
  await step(report, 'coffeeChats', async () => {
    const { getPointsEngineState } = await import('@lib/points/engine.server')
    if (!(await getPointsEngineState()).tablesReady) return 'skipped'
    // open chats as requester or mentor are cancelled (holds released, the other side told); mentor card deleted
    const { cleanupCoffeeChatsForDeletedUser } = await import('@lib/points/coffeeChatMentors.server')
    return cleanupCoffeeChatsForDeletedUser(uid)
  })
  await step(report, 'reports', () => forgetReporterEmail(uid))

  // 4. community: delete housing posts, anonymize the rest (comments in the background — render-time hiding covers the gap)
  await step(report, 'posts', async () => {
    const posts = await listStoredCommunityPostsByAuthor(uid)
    let deleted = 0
    let anonymized = 0
    for (const post of posts) {
      if (DELETE_BOARDS.has(post.categoryId)) {
        await deleteStoredCommunityPost(post.id)
        for (const [bucket, paths] of ownUploadPaths(post, uid)) {
          await storageDelete(bucket, paths).catch((error) =>
            console.error('Account deletion: post photo delete failed', error),
          )
        }
        try {
          const { onPostDeleted } = await import('@lib/points/facade.server')
          await onPostDeleted({ uid, postId: post.id })
        } catch {
          // points are best effort
        }
        deleted += 1
      } else if (!post.authorDeleted) {
        await patchStoredCommunityPost(post.id, { ...ANONYMIZED_AUTHOR, authorSchoolName: null, guestAuthor: null })
        anonymized += 1
      }
    }
    return `ok (${deleted} deleted, ${anonymized} anonymized)`
  })
  after(async () => {
    try {
      const result = await anonymizeAllComments(uid)
      console.info(`Account deletion ${uid}: comments ${result}`)
    } catch (error) {
      console.error('Account deletion: comment anonymization failed', error)
    }
  })

  // 5. Apple + Ellieo
  report.apple = await revokeAppleTokens(uid, input.appleAuthorizationCode)
  report.ellieo = await deleteEllieoAccount(input.accessToken, reason)

  invalidateListProfile(uid)
  console.info(`Account deletion ${uid}:`, JSON.stringify(report))
  return report
}
