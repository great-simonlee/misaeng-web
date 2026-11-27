import { randomUUID } from 'node:crypto'

import { getSupabaseServiceClient } from '@lib/supabase/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { notifyUsers } from '@lib/push/notify.server'

/**
 * Misaeng "Licensed Agent" accounts for New York real-estate agents (owner 2026-11-26, ported from Ellieo). Table
 * misaeng_agent_licenses and the private bucket misaeng-agent-licenses come from supabase/agent_accounts.sql.
 * Approval is per app: Ellieo's approvals (ellieo_agent_licenses) never count here, and the other way round.
 *
 *   member: GET status / POST an application (fields + three JPEGs: license or pocket card, government ID, selfie)
 *           after agreeing to the ID / face image notice (manual review only, no face templates, deleted 30 days
 *           after the decision)
 *   staff (ERP Misaeng → Licensed Agents, through /api/internal/agents/agent-licenses): list, 60-second photo
 *           links, approve with the expiration date, reject with a reason → push + in-app notice; edit the display
 *           details (holder name, brokerage, contact, license type) of a pending or approved agent (owner 11-26)
 *
 * In-house agents (misaeng_in_house active, e.g. @misaeng.com) always list under the configured brokerage
 * (misaeng_settings 'brokerage' → Fact Real Estate): the application, the approval and staff edits store that name,
 * and the listing disclosure (listings.server.ts) shows it whatever the row says.
 *
 * Status: none → pending → approved | rejected; an approved license past expires_on reads as "expired" (badge hidden,
 * the member applies again). Only `approved` and not expired counts as a Licensed Agent.
 */

export const AGENT_LICENSE_BUCKET = 'misaeng-agent-licenses'
const TABLE = 'misaeng_agent_licenses'
const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_KEEP_DAYS = 30
/** Consent text version the app shows before the photos (bump when the wording changes). */
export const PHOTO_CONSENT_VERSION = '2026-11-26'
export const LICENSE_TYPES = ['salesperson', 'associate_broker', 'broker'] as const
export type LicenseType = (typeof LICENSE_TYPES)[number]
/** "Licensed Real Estate Salesperson" etc. — the words NY advertising rules expect next to the agent's name. */
export function licenseTypeLabel(type: string | null | undefined) {
  if (type === 'broker') return 'Licensed Real Estate Broker'
  if (type === 'associate_broker') return 'Licensed Associate Real Estate Broker'
  return 'Licensed Real Estate Salesperson'
}
export type AgentPhotoKind = 'license' | 'id' | 'selfie'
const PHOTO_COLUMN: Record<AgentPhotoKind, 'photo_path' | 'id_photo_path' | 'selfie_path'> = {
  license: 'photo_path',
  id: 'id_photo_path',
  selfie: 'selfie_path',
}
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
  id_photo_path: string | null
  selfie_path: string | null
  status: 'pending' | 'approved' | 'rejected'
  expires_on: string | null
  reject_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

const COLUMNS =
  'id, user_id, license_number, license_type, holder_name, brokerage, contact, applicant_expires_on, photo_path, id_photo_path, selfie_path, status, expires_on, reject_reason, reviewed_by, reviewed_at, created_at'

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
    licenseType: row?.license_type ?? null,
    contact: row?.contact ?? null,
    /** yyyy-mm-dd; approved / expired only. */
    expiresOn: status === 'approved' || status === 'expired' ? row?.expires_on ?? null : null,
    rejectReason: status === 'rejected' ? row?.reject_reason ?? null : null,
    appliedAt: row?.created_at ?? null,
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
  return toMember(await latestRow(uid))
}

/** Never throws: for /api/app/me and listings (a missing table means "none"). */
export async function agentLicenseStateSafe(uid: string): Promise<AgentLicenseState> {
  try {
    return await agentLicenseState(uid)
  } catch (error) {
    console.error('Misaeng agent license status error:', error)
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
  const out = new Map<string, { brokerage: string; holderName: string; licenseType: string | null; contact: string; inHouse: boolean }>()
  if (uids.length === 0) return out
  const { data, error } = await db()
    .from(TABLE)
    .select('user_id, brokerage, holder_name, license_type, contact, expires_on')
    .in('user_id', [...new Set(uids)].slice(0, 200))
    .eq('status', 'approved')
    .gte('expires_on', todayNY())
    .returns<{ user_id: string; brokerage: string; holder_name: string; license_type: string | null; contact: string; expires_on: string }[]>()
  if (error) return out
  const inHouse = await activeInHouse((data ?? []).map((row) => row.user_id))
  for (const row of data ?? []) {
    out.set(row.user_id, {
      brokerage: row.brokerage,
      holderName: row.holder_name,
      licenseType: row.license_type,
      contact: row.contact,
      inHouse: inHouse.has(row.user_id),
    })
  }
  return out
}

// MARK: - In-house brokerage

/**
 * Active in-house members among these uids, from misaeng_in_house only (cheap, for the listing board). A qualifying
 * member is put in that table the first time isInHouse() sees them, which the application and approval below do.
 */
async function activeInHouse(uids: string[]) {
  const out = new Set<string>()
  if (uids.length === 0) return out
  const { data, error } = await db()
    .from('misaeng_in_house')
    .select('user_id')
    .in('user_id', [...new Set(uids)].slice(0, 200))
    .eq('status', 'active')
    .returns<{ user_id: string }[]>()
  if (error) return out
  for (const row of data ?? []) out.add(row.user_id)
  return out
}

/** Is this member in-house right now (adds a qualifying member, see inHouse.server.ts)? Never throws. */
export async function isInHouseAgent(uid: string) {
  const { isInHouse } = await import('./inHouse.server')
  return isInHouse(uid).catch(() => false)
}

/** The configured brokerage name (misaeng_settings 'brokerage' → Fact Real Estate). */
export async function inHouseBrokerageName() {
  const { getBrokerageSettings } = await import('./brokerage.server')
  return (await getBrokerageSettings()).name
}

export type AgentApplication = {
  licenseNumber: string
  /** salesperson | associate_broker | broker (optional; staff confirm it against NY DOS). */
  licenseType?: string | null
  /** The member agreed to the ID / face image notice (required). */
  photoConsent?: boolean
  holderName: string
  brokerage: string
  contact: string
  /** yyyy-mm-dd, optional. */
  expiresOn?: string | null
}

const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ')

function validate(input: AgentApplication, forcedBrokerage: string | null = null) {
  const fail = (message: string) => {
    throw new AgentLicenseError(message, 'INVALID')
  }
  const number = clean(input.licenseNumber).toUpperCase().replace(/\s/g, '')
  if (!/^[A-Z0-9-]{4,20}$/.test(number)) fail('Enter your NY license number (letters and numbers, as on the license).')
  const holderName = clean(input.holderName)
  if (holderName.length < 2 || holderName.length > 80) fail('Enter your full name as it appears on the license.')
  const brokerage = forcedBrokerage ?? clean(input.brokerage)
  if (brokerage.length < 2 || brokerage.length > 80) fail('Enter your brokerage name.')
  const contact = clean(input.contact)
  if (!validContact(contact)) fail('Enter a business phone number or email.')
  const expiresOn = input.expiresOn ? clean(input.expiresOn) : null
  if (expiresOn && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || Number.isNaN(Date.parse(expiresOn)))) {
    fail('Expiration date is not valid.')
  }
  if (expiresOn && expiresOn < todayNY()) fail('This license has expired. Renew it with NY DOS first.')
  const licenseType = input.licenseType ? clean(input.licenseType) : null
  if (licenseType && !(LICENSE_TYPES as readonly string[]).includes(licenseType)) fail('Pick a license type.')
  if (!input.photoConsent) {
    throw new AgentLicenseError('Agree to the ID and selfie notice to continue.', 'CONSENT_REQUIRED')
  }
  return { number, holderName, brokerage, contact, expiresOn, licenseType }
}

/** Business phone (10+ digits) or email, 5–120 characters (the table's check). */
function validContact(contact: string) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  const isPhone = contact.replace(/\D/g, '').length >= 10 && /^[+\d\s().-]+$/.test(contact)
  return contact.length >= 5 && contact.length <= 120 && (isEmail || isPhone)
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function safeFolder(uid: string) {
  return uid.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'user'
}

async function readJpeg(file: File | null, missing: string) {
  if (!file) throw new AgentLicenseError(missing, 'PHOTO_REQUIRED')
  if (file.size > PHOTO_MAX_BYTES) throw new AgentLicenseError('Photo is too large (max 5 MB).', 'FILE_TOO_LARGE', 413)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isJpeg(bytes)) throw new AgentLicenseError('Photos must be JPEG.', 'FILE_TYPE')
  return bytes
}

/**
 * New application (after none, rejected or expired). The three photos go to the private bucket first; a failed
 * insert removes them again.
 */
export async function applyAgentLicense(
  uid: string,
  input: AgentApplication,
  photos: { license: File | null; id: File | null; selfie: File | null },
) {
  // In-house agents list under the configured brokerage, whatever they typed.
  const fields = validate(input, (await isInHouseAgent(uid)) ? (await inHouseBrokerageName()).slice(0, 80) : null)
  const files = {
    license: await readJpeg(photos.license, 'Add a photo of your license or pocket card.'),
    id: await readJpeg(photos.id, 'Add a photo of your government ID.'),
    selfie: await readJpeg(photos.selfie, 'Take a selfie.'),
  }

  const current = statusOf(await latestRow(uid))
  if (current === 'pending') throw new AgentLicenseError('Your application is already in review.', 'ALREADY_PENDING', 409)
  if (current === 'approved') throw new AgentLicenseError('You are already a verified Licensed Agent.', 'ALREADY_APPROVED', 409)

  const folder = safeFolder(uid)
  const paths = {
    license: `${folder}/${randomUUID()}-license.jpg`,
    id: `${folder}/${randomUUID()}-id.jpg`,
    selfie: `${folder}/${randomUUID()}-selfie.jpg`,
  }
  const uploaded: string[] = []
  const cleanup = () => (uploaded.length ? db().storage.from(AGENT_LICENSE_BUCKET).remove(uploaded) : null)
  for (const kind of ['license', 'id', 'selfie'] as const) {
    const { error } = await db()
      .storage.from(AGENT_LICENSE_BUCKET)
      .upload(paths[kind], files[kind], { contentType: 'image/jpeg', upsert: false })
    if (error) {
      await cleanup()
      throw new AgentLicenseError(`Upload failed: ${error.message}`, 'UPLOAD_FAILED', 500)
    }
    uploaded.push(paths[kind])
  }

  const { data, error } = await db()
    .from(TABLE)
    .insert({
      user_id: uid,
      license_number: fields.number,
      license_type: fields.licenseType,
      holder_name: fields.holderName,
      brokerage: fields.brokerage,
      contact: fields.contact,
      applicant_expires_on: fields.expiresOn,
      photo_path: paths.license,
      id_photo_path: paths.id,
      selfie_path: paths.selfie,
      consent_at: new Date().toISOString(),
      consent_version: PHOTO_CONSENT_VERSION,
    } as never)
    .select(COLUMNS)
    .single<Row>()
  if (error || !data) {
    await cleanup()
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
  const { count } = await db().from(TABLE).select('id', { count: 'exact', head: true }).eq('status', 'pending')
  // In-house (brokerage locked) for open applications and approved agents; staff edit history per license.
  const openUids = [...new Set(rows.filter((row) => row.status !== 'rejected').map((row) => row.user_id))]
  const inHouse = new Set(
    (await Promise.all(openUids.map(async (uid) => ((await isInHouseAgent(uid)) ? uid : null)))).filter(Boolean) as string[],
  )
  const lockedBrokerage = inHouse.size > 0 ? await inHouseBrokerageName() : null
  const edits = await editHistories(rows.map((row) => row.id))
  return {
    applications: rows.map((row) => ({
      id: row.id,
      uid: row.user_id,
      member: profiles.get(row.user_id) ?? null,
      status: statusOf(row),
      licenseNumber: row.license_number,
      licenseType: row.license_type,
      licenseTypeLabel: row.license_type ? licenseTypeLabel(row.license_type) : null,
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
      photos: { license: Boolean(row.photo_path), id: Boolean(row.id_photo_path), selfie: Boolean(row.selfie_path) },
      /** Decided and the photos are gone (30-day retention). */
      photoDeleted: !row.photo_path && !row.id_photo_path && !row.selfie_path && row.status !== 'pending',
      /** In-house: the brokerage is always the configured one (shown locked in the ERP). */
      inHouse: inHouse.has(row.user_id),
      lockedBrokerage: inHouse.has(row.user_id) ? lockedBrokerage : null,
      /** Staff edits of the details, newest first. */
      edits: edits.get(row.id) ?? [],
    })),
    counts: { pending: count ?? 0 },
    setupRequired: false,
  }
}

/** 60-second signed link to one of the three photos (private bucket; staff only). */
export async function licensePhotoUrl(id: string, kind: AgentPhotoKind = 'license') {
  const column = PHOTO_COLUMN[kind] ?? 'photo_path'
  const { data: row, error } = await db().from(TABLE).select(column).eq('id', id).maybeSingle<Record<string, string | null>>()
  if (error) throw new AgentLicenseError(error.message, 'LOAD_FAILED', 500)
  const path = row?.[column]
  if (!path) throw new AgentLicenseError('Photo not found.', 'NOT_FOUND', 404)
  const { data, error: signError } = await db().storage.from(AGENT_LICENSE_BUCKET).createSignedUrl(path, 60)
  if (signError || !data?.signedUrl) throw new AgentLicenseError(signError?.message ?? 'Could not open the photo.', 'SIGN_FAILED', 500)
  return { url: data.signedUrl, expiresIn: 60, mimeType: 'image/jpeg' }
}

export async function decideAgentLicense(input: {
  id: string
  action: 'approve' | 'reject'
  expiresOn?: string | null
  /** Staff confirm the type shown on NY DOS (salesperson | associate_broker | broker). */
  licenseType?: string | null
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
    const type = clean(input.licenseType)
    if (type) {
      if (!(LICENSE_TYPES as readonly string[]).includes(type)) throw new AgentLicenseError('Pick a license type.', 'INVALID')
      patch.license_type = type
    }
  } else {
    const reason = clean(input.rejectReason)
    if (reason.length < 3) throw new AgentLicenseError('Enter a reject reason (the member sees it).', 'INVALID')
    Object.assign(patch, { status: 'rejected', reject_reason: reason.slice(0, 300) })
  }
  if (input.action === 'approve') {
    const { data: pending } = await db().from(TABLE).select('user_id').eq('id', input.id).maybeSingle<{ user_id: string }>()
    if (pending && (await isInHouseAgent(pending.user_id))) patch.brokerage = (await inHouseBrokerageName()).slice(0, 80)
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
  notifyDecision(data)
  return toMember(data)
}

// MARK: - Staff edits (details shown on the listing disclosure)

export type AgentLicenseEdit = {
  at: string
  by: string
  changes: Record<string, { from: string | null; to: string | null }>
}

/**
 * Edit history lives in misaeng_settings 'agent_license_edits:<license id>' → { history: [...] } (newest first, last
 * 50), so no table change is needed; updated_by / updated_at there are the latest edit.
 */
const EDITS_KEY = 'agent_license_edits:'

async function editHistories(ids: string[]) {
  const out = new Map<string, AgentLicenseEdit[]>()
  if (ids.length === 0) return out
  const { data, error } = await db()
    .from('misaeng_settings')
    .select('key, value')
    .in('key', ids.map((id) => EDITS_KEY + id))
    .returns<{ key: string; value: { history?: AgentLicenseEdit[] } | null }[]>()
  if (error) return out
  for (const row of data ?? []) {
    if (Array.isArray(row.value?.history)) out.set(row.key.slice(EDITS_KEY.length), row.value.history)
  }
  return out
}

export type AgentLicenseEditInput = {
  id: string
  holderName?: string | null
  brokerage?: string | null
  contact?: string | null
  licenseType?: string | null
  editor: string
}

/**
 * ERP: change the display details of a pending or approved (incl. expired) license — holder name, brokerage, contact,
 * license type. Omitted fields stay. In-house agents always get the configured brokerage. The listing disclosure
 * reads the license row on every request, so /api/housing and listing detail change at once.
 */
export async function editAgentLicense(input: AgentLicenseEditInput) {
  const fail = (message: string): never => {
    throw new AgentLicenseError(message, 'INVALID')
  }
  const { data: row, error } = await db().from(TABLE).select(COLUMNS).eq('id', input.id).maybeSingle<Row>()
  if (missingTable(error)) throw new AgentLicenseError('Agent verification is not set up yet.', 'SETUP_REQUIRED', 503)
  if (error) throw new AgentLicenseError(error.message, 'LOAD_FAILED', 500)
  if (!row) throw new AgentLicenseError('License not found.', 'NOT_FOUND', 404)
  if (row.status === 'rejected') throw new AgentLicenseError('A rejected application cannot be edited.', 'NOT_EDITABLE', 409)

  const next = { holder_name: row.holder_name, brokerage: row.brokerage, contact: row.contact, license_type: row.license_type }
  if (input.holderName != null) {
    const holderName = clean(input.holderName)
    if (holderName.length < 2 || holderName.length > 80) fail('Name must be 2–80 characters.')
    next.holder_name = holderName
  }
  if (input.brokerage != null) {
    const brokerage = clean(input.brokerage)
    if (brokerage.length < 2 || brokerage.length > 80) fail('Brokerage must be 2–80 characters.')
    next.brokerage = brokerage
  }
  if (input.contact != null) {
    const contact = clean(input.contact)
    if (!validContact(contact)) fail('Contact must be a business phone number (10+ digits) or an email, up to 120 characters.')
    next.contact = contact
  }
  if (input.licenseType != null) {
    const licenseType = clean(input.licenseType)
    if (!(LICENSE_TYPES as readonly string[]).includes(licenseType)) fail('Pick a license type: salesperson, associate_broker or broker.')
    next.license_type = licenseType
  }
  const inHouse = await isInHouseAgent(row.user_id)
  if (inHouse) next.brokerage = (await inHouseBrokerageName()).slice(0, 80)

  const changes: AgentLicenseEdit['changes'] = {}
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if ((next[key] ?? null) !== (row[key] ?? null)) changes[key] = { from: row[key] ?? null, to: next[key] ?? null }
  }
  if (Object.keys(changes).length === 0) return { application: toMember(row), changed: false, inHouse }

  const now = new Date().toISOString()
  const by = input.editor.slice(0, 200)
  const { data: saved, error: saveError } = await db()
    .from(TABLE)
    .update({ ...next, updated_at: now } as never)
    .eq('id', row.id)
    .neq('status', 'rejected')
    .select(COLUMNS)
    .maybeSingle<Row>()
  if (saveError) throw new AgentLicenseError(saveError.message, 'SAVE_FAILED', 500)
  if (!saved) throw new AgentLicenseError('License not found or no longer editable.', 'NOT_EDITABLE', 409)

  // Audit (best effort after the save: a failed log is reported, not rolled back).
  const history = (await editHistories([row.id])).get(row.id) ?? []
  const { error: logError } = await db()
    .from('misaeng_settings')
    .upsert(
      { key: EDITS_KEY + row.id, value: { history: [{ at: now, by, changes }, ...history].slice(0, 50) }, updated_at: now, updated_by: by } as never,
      { onConflict: 'key' },
    )
  if (logError) console.error('Misaeng agent license edit log error:', logError.message)
  return { application: toMember(saved), changed: true, inHouse }
}

/**
 * Deletes license photos 30 days after the decision (approved or rejected): the file first, then photo_path.
 * Called by /api/internal/agents/purge-files. Missing table → nothing to do.
 */
export async function purgeLicensePhotos(batch = 200) {
  const cutoff = new Date(Date.now() - PHOTO_KEEP_DAYS * 86_400_000).toISOString()
  const { data, error } = await db()
    .from(TABLE)
    .select('id, photo_path, id_photo_path, selfie_path')
    .neq('status', 'pending')
    .or('photo_path.not.is.null,id_photo_path.not.is.null,selfie_path.not.is.null')
    .lte('reviewed_at', cutoff)
    .limit(batch)
    .returns<{ id: string; photo_path: string | null; id_photo_path: string | null; selfie_path: string | null }[]>()
  if (missingTable(error)) return { deleted: 0 }
  if (error) throw new AgentLicenseError(error.message, 'PURGE_FAILED', 500)
  const rows = data ?? []
  if (rows.length === 0) return { deleted: 0 }
  const paths = rows.flatMap((row) => [row.photo_path, row.id_photo_path, row.selfie_path]).filter((p): p is string => Boolean(p))
  const { error: removeError } = await db().storage.from(AGENT_LICENSE_BUCKET).remove(paths)
  if (removeError) throw new AgentLicenseError(removeError.message, 'PURGE_FAILED', 500)
  const { error: rowError } = await db()
    .from(TABLE)
    .update({ photo_path: null, id_photo_path: null, selfie_path: null, photo_deleted_at: new Date().toISOString() } as never)
    .in('id', rows.map((row) => row.id))
  if (rowError) throw new AgentLicenseError(rowError.message, 'PURGE_FAILED', 500)
  return { deleted: paths.length }
}

// MARK: - Push + in-app notification

function notifyDecision(row: Row) {
  const until = row.expires_on ?? ''
  notifyUsers({
    type: 'account',
    userIds: [row.user_id],
    build: (t) =>
      row.status === 'approved'
        ? {
            title: t('api.push.agentLicense.approved.title'),
            body: t('api.push.agentLicense.approved.body', { until }),
            data: { type: 'agent_license', status: 'approved' },
            threadId: `agent-license-${row.id}`,
          }
        : {
            title: t('api.push.agentLicense.rejected.title'),
            body: row.reject_reason || t('api.push.agentLicense.rejected.body'),
            data: { type: 'agent_license', status: 'rejected' },
            threadId: `agent-license-${row.id}`,
          },
  })
}
