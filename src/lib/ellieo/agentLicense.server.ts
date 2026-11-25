import { randomUUID } from 'node:crypto'

import { getSupabaseServiceClient } from '@lib/supabase/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { recordNotifications } from '@lib/push/inbox.server'

import { afterResponse, pushToMembers } from './messaging.server'

/**
 * "Licensed Agent" verification for New York real-estate agents (owner 11-25). Table ellieo_agent_licenses and the
 * private bucket ellieo-agent-licenses come from ellieo-app/shared/ellieo/db/agent_license.sql.
 *
 *   member: GET status / POST an application (fields + one JPEG of the license or pocket card)
 *   staff (ERP, through /api/internal/ellieo/agent-licenses): list, 60-second photo link, approve with the
 *   expiration date, reject with a reason → push + in-app notification to the member
 *
 * Status: none → pending → approved | rejected; an approved license past expires_on reads as "expired" (badge hidden,
 * the member applies again). Only `approved` and not expired counts as a Licensed Agent.
 *
 * Owner 11-25 (agent_license_2.sql): no license type (shown as "Licensed Professional · {brokerage}"); approval takes
 * down the member's personal listings (status 'removed', reason 'licensed_agent'); license photos are deleted 30 days
 * after the decision (purgeLicensePhotos, run by /api/internal/ellieo/purge-files).
 */

export const AGENT_LICENSE_BUCKET = 'ellieo-agent-licenses'
const TABLE = 'ellieo_agent_licenses'
const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_KEEP_DAYS = 30
export const PROFESSIONAL_LABEL = 'Licensed Professional'
export type AgentStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired'

export class AgentLicenseError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

function db() {
  return getSupabaseServiceClient()
}

type Row = {
  id: string
  user_id: string
  license_number: string
  license_type: string | null
  holder_name: string
  brokerage: string
  contact: string
  applicant_expires_on: string | null
  photo_path: string | null
  status: 'pending' | 'approved' | 'rejected'
  expires_on: string | null
  reject_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

const COLUMNS =
  'id, user_id, license_number, license_type, holder_name, brokerage, contact, applicant_expires_on, photo_path, status, expires_on, reject_reason, reviewed_by, reviewed_at, created_at'

/** Table not there yet (SQL not run): read as "never applied". */
function missingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message ?? '')))
}

/** yyyy-mm-dd in New York (a license is good through its expiration day). */
function todayNY() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
}

function statusOf(row: Row | null): AgentStatus {
  if (!row) return 'none'
  if (row.status === 'approved') return row.expires_on && row.expires_on >= todayNY() ? 'approved' : 'expired'
  return row.status
}

/** What the member's app sees. */
function toMember(row: Row | null) {
  const status = statusOf(row)
  return {
    status,
    brokerage: row?.brokerage ?? null,
    holderName: row?.holder_name ?? null,
    licenseNumber: row?.license_number ?? null,
    /** yyyy-mm-dd; approved / expired only. */
    expiresOn: status === 'approved' || status === 'expired' ? row?.expires_on ?? null : null,
    rejectReason: status === 'rejected' ? row?.reject_reason ?? null : null,
    appliedAt: row?.created_at ?? null,
    /** Approved: personal listings taken down when the license was approved (sheet note). */
    listingsTakenDown: 0,
  }
}

export type AgentLicenseState = ReturnType<typeof toMember>

async function latestRow(uid: string): Promise<Row | null> {
  const { data, error } = await db()
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Row>()
  if (missingTable(error)) return null
  if (error) throw new AgentLicenseError(error.message, 'LOAD_FAILED', 500)
  return data
}

export async function agentLicenseState(uid: string) {
  const row = await latestRow(uid)
  const state = toMember(row)
  if (state.status === 'approved') state.listingsTakenDown = await removedListingCount(uid)
  return state
}

async function removedListingCount(uid: string) {
  const { count, error } = await db()
    .from('ellieo_listings')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', uid)
    .eq('status', 'removed')
    .eq('removed_reason', 'licensed_agent')
  return error ? 0 : count ?? 0
}

/** Personal (non-brokered) listings that are up or repostable: what approval takes down. */
async function personalListingIds(uid: string) {
  const { data, error } = await db()
    .from('ellieo_listings')
    .select('id')
    .eq('owner_id', uid)
    .eq('brokered', false)
    .in('status', ['live', 'expired'])
    .returns<{ id: string }[]>()
  return error ? [] : (data ?? []).map((row) => row.id)
}

/** Never throws: for /api/app/me and listings (a missing table means "none"). */
export async function agentLicenseStateSafe(uid: string): Promise<AgentLicenseState> {
  try {
    return await agentLicenseState(uid)
  } catch (error) {
    console.error('Ellieo agent license status error:', error)
    return toMember(null)
  }
}

/** The member's approved, unexpired license (brokered listings need it), else null. */
export async function activeLicense(uid: string) {
  const row = await latestRow(uid)
  return statusOf(row) === 'approved' ? row : null
}

/** Licensed Agent badge for many owners at once (listing board). Missing table → nobody. */
export async function licensedOwners(uids: string[]) {
  const out = new Map<string, { brokerage: string }>()
  if (uids.length === 0) return out
  const { data, error } = await db()
    .from(TABLE)
    .select('user_id, brokerage, expires_on')
    .in('user_id', [...new Set(uids)].slice(0, 200))
    .eq('status', 'approved')
    .gte('expires_on', todayNY())
    .returns<{ user_id: string; brokerage: string; expires_on: string }[]>()
  if (error) return out
  for (const row of data ?? []) out.set(row.user_id, { brokerage: row.brokerage })
  return out
}

export type AgentApplication = {
  licenseNumber: string
  holderName: string
  brokerage: string
  contact: string
  /** yyyy-mm-dd, optional. */
  expiresOn?: string | null
}

const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ')

function validate(input: AgentApplication) {
  const fail = (message: string) => {
    throw new AgentLicenseError(message, 'INVALID')
  }
  const number = clean(input.licenseNumber).toUpperCase().replace(/\s/g, '')
  if (!/^[A-Z0-9-]{4,20}$/.test(number)) fail('Enter your NY license number (letters and numbers, as on the license).')
  const holderName = clean(input.holderName)
  if (holderName.length < 2 || holderName.length > 80) fail('Enter your full name as it appears on the license.')
  const brokerage = clean(input.brokerage)
  if (brokerage.length < 2 || brokerage.length > 80) fail('Enter your brokerage name.')
  const contact = clean(input.contact)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  const isPhone = contact.replace(/\D/g, '').length >= 10 && /^[+\d\s().-]+$/.test(contact)
  if (contact.length > 120 || !(isEmail || isPhone)) fail('Enter a business phone number or email.')
  const expiresOn = input.expiresOn ? clean(input.expiresOn) : null
  if (expiresOn && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || Number.isNaN(Date.parse(expiresOn)))) {
    fail('Expiration date is not valid.')
  }
  if (expiresOn && expiresOn < todayNY()) fail('This license has expired. Renew it with NY DOS first.')
  return { number, holderName, brokerage, contact, expiresOn }
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function safeFolder(uid: string) {
  return uid.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'user'
}

/** New application (after none, rejected or expired). The photo goes to the private bucket first. */
export async function applyAgentLicense(uid: string, input: AgentApplication, photo: File | null) {
  const fields = validate(input)
  if (!photo) throw new AgentLicenseError('Add a photo of your license or pocket card.', 'PHOTO_REQUIRED')
  if (photo.size > PHOTO_MAX_BYTES) throw new AgentLicenseError('Photo is too large (max 5 MB).', 'FILE_TOO_LARGE', 413)
  const bytes = new Uint8Array(await photo.arrayBuffer())
  if (!isJpeg(bytes)) throw new AgentLicenseError('The photo must be a JPEG.', 'FILE_TYPE')

  const current = statusOf(await latestRow(uid))
  if (current === 'pending') throw new AgentLicenseError('Your application is already in review.', 'ALREADY_PENDING', 409)
  if (current === 'approved') throw new AgentLicenseError('You are already a verified Licensed Agent.', 'ALREADY_APPROVED', 409)

  const path = `${safeFolder(uid)}/${randomUUID()}.jpg`
  const { error: uploadError } = await db()
    .storage.from(AGENT_LICENSE_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) throw new AgentLicenseError(`Upload failed: ${uploadError.message}`, 'UPLOAD_FAILED', 500)

  const insert = (extra: Record<string, unknown>) =>
    db()
      .from(TABLE)
      .insert({
        user_id: uid,
        license_number: fields.number,
        holder_name: fields.holderName,
        brokerage: fields.brokerage,
        contact: fields.contact,
        applicant_expires_on: fields.expiresOn,
        photo_path: path,
        ...extra,
      } as never)
      .select(COLUMNS)
      .single<Row>()
  let { data, error } = await insert({})
  // Before agent_license_2.sql license_type is still required: store the old placeholder (never shown).
  if (error?.code === '23502') ({ data, error } = await insert({ license_type: 'broker' }))
  if (error || !data) {
    await db().storage.from(AGENT_LICENSE_BUCKET).remove([path])
    if (error?.code === '23505') throw new AgentLicenseError('Your application is already in review.', 'ALREADY_PENDING', 409)
    if (missingTable(error)) throw new AgentLicenseError('Agent verification is not set up yet.', 'SETUP_REQUIRED', 503)
    throw new AgentLicenseError(error?.message ?? 'Save failed', 'SAVE_FAILED', 500)
  }
  return toMember(data)
}

// MARK: - Staff (ERP)

export type ReviewFilter = 'pending' | 'approved' | 'rejected' | 'expired' | 'all'

export async function listForReview(filter: ReviewFilter, limit = 200) {
  let query = db().from(TABLE).select(COLUMNS).order('created_at', { ascending: filter !== 'pending' ? false : true })
  const today = todayNY()
  if (filter === 'pending' || filter === 'rejected') query = query.eq('status', filter)
  if (filter === 'approved') query = query.eq('status', 'approved').gte('expires_on', today)
  if (filter === 'expired') query = query.eq('status', 'approved').lt('expires_on', today)
  const { data, error } = await query.limit(Math.min(Math.max(limit, 1), 500)).returns<Row[]>()
  if (missingTable(error)) return { applications: [], counts: { pending: 0 }, setupRequired: true }
  if (error) throw new AgentLicenseError(error.message, 'LOAD_FAILED', 500)

  const rows = data ?? []
  const profiles = new Map<string, { email: string | null; nickname: string | null; name: string | null }>()
  await Promise.all(
    [...new Set(rows.map((row) => row.user_id))].map(async (uid) => {
      const profile = await getSupabaseProfile(uid).catch(() => null)
      const name = [profile?.firstName, profile?.lastName].map((part) => part?.trim()).filter(Boolean).join(' ')
      profiles.set(uid, { email: profile?.email ?? null, nickname: profile?.nickname ?? null, name: name || null })
    }),
  )
  const personal = new Map<string, number>()
  await Promise.all(
    [...new Set(rows.filter((row) => row.status === 'pending').map((row) => row.user_id))].map(async (uid) => {
      personal.set(uid, (await personalListingIds(uid)).length)
    }),
  )
  const { count } = await db().from(TABLE).select('id', { count: 'exact', head: true }).eq('status', 'pending')
  return {
    applications: rows.map((row) => ({
      id: row.id,
      uid: row.user_id,
      member: profiles.get(row.user_id) ?? null,
      status: statusOf(row),
      licenseNumber: row.license_number,
      holderName: row.holder_name,
      brokerage: row.brokerage,
      contact: row.contact,
      applicantExpiresOn: row.applicant_expires_on,
      expiresOn: row.expires_on,
      rejectReason: row.reject_reason,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      hasPhoto: Boolean(row.photo_path),
      /** Decided and the photo is gone (30-day retention). */
      photoDeleted: !row.photo_path && row.status !== 'pending',
      /** Pending: personal listings approval would take down. */
      personalListings: personal.get(row.user_id) ?? 0,
    })),
    counts: { pending: count ?? 0 },
    setupRequired: false,
  }
}

/** 60-second signed link to the license photo (private bucket). */
export async function licensePhotoUrl(id: string) {
  const { data: row, error } = await db().from(TABLE).select('photo_path').eq('id', id).maybeSingle<{ photo_path: string | null }>()
  if (error) throw new AgentLicenseError(error.message, 'LOAD_FAILED', 500)
  if (!row?.photo_path) throw new AgentLicenseError('Photo not found.', 'NOT_FOUND', 404)
  const { data, error: signError } = await db().storage.from(AGENT_LICENSE_BUCKET).createSignedUrl(row.photo_path, 60)
  if (signError || !data?.signedUrl) throw new AgentLicenseError(signError?.message ?? 'Could not open the photo.', 'SIGN_FAILED', 500)
  return { url: data.signedUrl, expiresIn: 60, mimeType: 'image/jpeg' }
}

export async function decideAgentLicense(input: {
  id: string
  action: 'approve' | 'reject'
  expiresOn?: string | null
  rejectReason?: string | null
  reviewer: string
}) {
  const patch: Record<string, unknown> = {
    reviewed_by: input.reviewer.slice(0, 200),
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (input.action === 'approve') {
    const expiresOn = clean(input.expiresOn)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || Number.isNaN(Date.parse(expiresOn))) {
      throw new AgentLicenseError('Enter the license expiration date (yyyy-mm-dd).', 'INVALID')
    }
    if (expiresOn < todayNY()) throw new AgentLicenseError('That expiration date has passed: reject instead.', 'INVALID')
    Object.assign(patch, { status: 'approved', expires_on: expiresOn, reject_reason: null })
  } else {
    const reason = clean(input.rejectReason)
    if (reason.length < 3) throw new AgentLicenseError('Enter a reject reason (the member sees it).', 'INVALID')
    Object.assign(patch, { status: 'rejected', reject_reason: reason.slice(0, 300) })
  }
  const { data, error } = await db()
    .from(TABLE)
    .update(patch as never)
    .eq('id', input.id)
    .eq('status', 'pending')
    .select(COLUMNS)
    .maybeSingle<Row>()
  if (error) throw new AgentLicenseError(error.message, 'SAVE_FAILED', 500)
  if (!data) throw new AgentLicenseError('Application not found or already reviewed.', 'ALREADY_DECIDED', 409)
  const takenDown = data.status === 'approved' ? await takeDownPersonalListings(data.user_id) : 0
  notifyDecision(data, takenDown)
  return { ...toMember(data), listingsTakenDown: takenDown }
}

/**
 * Owner 11-25: Licensed Agents post brokered listings only, so approval takes down their personal listings —
 * hidden with a reason, not deleted (status 'removed'; before agent_license_2.sql: 'expired', and renew refuses them).
 */
async function takeDownPersonalListings(uid: string) {
  const ids = await personalListingIds(uid)
  if (ids.length === 0) return 0
  const now = new Date().toISOString()
  let { error } = await db()
    .from('ellieo_listings')
    .update({ status: 'removed', removed_at: now, removed_reason: 'licensed_agent' } as never)
    .in('id', ids)
  if (error) ({ error } = await db().from('ellieo_listings').update({ status: 'expired', expires_at: now } as never).in('id', ids))
  if (error) console.error('Ellieo agent listing takedown failed:', error.message)
  return error ? 0 : ids.length
}

/**
 * Deletes license photos 30 days after the decision (approved or rejected): the file first, then photo_path.
 * Called by /api/internal/ellieo/purge-files. Missing table → nothing to do.
 */
export async function purgeLicensePhotos(batch = 200) {
  const cutoff = new Date(Date.now() - PHOTO_KEEP_DAYS * 86_400_000).toISOString()
  const { data, error } = await db()
    .from(TABLE)
    .select('id, photo_path')
    .neq('status', 'pending')
    .not('photo_path', 'is', null)
    .lte('reviewed_at', cutoff)
    .limit(batch)
    .returns<{ id: string; photo_path: string }[]>()
  if (missingTable(error)) return { deleted: 0 }
  if (error) throw new AgentLicenseError(error.message, 'PURGE_FAILED', 500)
  const rows = (data ?? []) as { id: string; photo_path: string }[]
  if (rows.length === 0) return { deleted: 0 }
  const { error: removeError } = await db().storage.from(AGENT_LICENSE_BUCKET).remove(rows.map((row) => row.photo_path))
  if (removeError) throw new AgentLicenseError(removeError.message, 'PURGE_FAILED', 500)
  const ids = rows.map((row) => row.id)
  let { error: rowError } = await db()
    .from(TABLE)
    .update({ photo_path: null, photo_deleted_at: new Date().toISOString() } as never)
    .in('id', ids)
  if (rowError) ({ error: rowError } = await db().from(TABLE).update({ photo_path: null } as never).in('id', ids))
  if (rowError) throw new AgentLicenseError(rowError.message, 'PURGE_FAILED', 500)
  return { deleted: rows.length }
}

// MARK: - Push + in-app notification

const MONTHS_VI = (date: Date) => `tháng ${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`

function decisionText(row: Row, locale: string, takenDown: number) {
  const until = row.expires_on ? new Date(`${row.expires_on}T00:00:00Z`) : null
  if (locale === 'vi') {
    return row.status === 'approved'
      ? {
          title: 'Bạn đã có huy hiệu Licensed Agent',
          body: `Đã xác minh giấy phép NY${until ? ` (đến ${MONTHS_VI(until)})` : ''}. Giờ bạn có thể đăng tin qua môi giới.${
            takenDown > 0 ? ' Các tin cá nhân trước đây của bạn đã được gỡ — Licensed Agent chỉ đăng tin qua môi giới.' : ''
          }`,
        }
      : { title: 'Chưa thể xác minh giấy phép', body: row.reject_reason || 'Xem lý do và gửi lại trong Tôi.' }
  }
  return row.status === 'approved'
    ? {
        title: 'You’re a verified Licensed Agent',
        body: `Your NY license is verified${
          until ? ` until ${until.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}` : ''
        }. You can now post brokered listings.${
          takenDown > 0 ? ' Your earlier personal listings were taken down — Licensed Agents post brokered listings only.' : ''
        }`,
      }
    : { title: 'License not verified', body: row.reject_reason || 'See why and apply again in Me.' }
}

function notifyDecision(row: Row, takenDown: number) {
  afterResponse(async () => {
    const data = { type: 'ellieo_agent_license', status: row.status }
    await recordNotifications({
      type: 'ellieo_agent_license',
      userIds: [row.user_id],
      build: (_t, locale) => ({ ...decisionText(row, locale, takenDown), data, threadId: `ellieo-agent-${row.id}` }),
    })
    await pushToMembers([{ uid: row.user_id, preview: true }], (locale) => ({
      ...decisionText(row, locale, takenDown),
      threadId: 'ellieo-agent-license',
      data,
    }))
  })
}
