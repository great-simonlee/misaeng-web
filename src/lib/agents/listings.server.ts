import { randomUUID } from 'node:crypto'

import { getSupabaseServiceClient } from '@lib/supabase/server'
import type { HousingListing, HousingRoomType } from '@/types/nyc'

import { activeLicense, licensedOwners, licenseTypeLabel } from './agentLicense.server'
import { creditsEnabled } from './creditsCore.server'
import { CreditsError, parsePlan, planFacts, promotePremium, purchase, type PlanFacts } from './listingPlans.server'

/**
 * Listings posted by Misaeng's verified Licensed Agents (owner 2026-11-26; ported from Ellieo's brokered listings).
 * Tables misaeng_listings / misaeng_files from supabase/agent_accounts.sql. Every row here is an agent listing: there
 * are no personal listings on Misaeng (Misaeng's own listings stay in the ERP → Storage flow,
 * src/lib/supabase/housing.server.ts), and the housing feed shows both (agentHousingListings below). The app shrinks
 * photos before upload (≤1600 px + a 400 px thumb); this side only checks and stores them. Windows (30 days live, 90
 * to repost, 7 after delete, 24 h for unposted uploads) live in misaeng_listings_daily; this file never deletes by date.
 */

export const AGENT_LISTINGS_BUCKET = 'misaeng-agent-listings'

export const LISTING_RULES = {
  photosMin: 4,
  photosMax: 12,
  rentMax: 30_000,
  detailsMax: 4_000,
  /** Per file, after the app shrinks it (a 1600 px JPEG is ~200–400 KB; a 2048 px floor plan a bit more). */
  fileMaxBytes: 3 * 1024 * 1024,
} as const

/** The app's listing types (ListingWriteView.Kind). */
const KINDS = ['privateRoom', 'sharedRoom', 'studio', 'apartment', 'sublet'] as const
const PERIODS = ['daily', 'weekly', 'monthly'] as const
const ROLES = ['photo', 'thumb', 'floor_plan'] as const
export type UploadRole = (typeof ROLES)[number]

export class ListingError extends Error {
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

export function publicFileUrl(path: string | null | undefined) {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${AGENT_LISTINGS_BUCKET}/${path}`
}

export function isUploadRole(value: unknown): value is UploadRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** JPEG magic bytes: the app always sends JPEG, so anything else is refused. */
function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

/**
 * Stores one shrunk photo under the owner's folder. The file row starts with purge_after = +24 h; posting the
 * listing claims it (purge_after = null), so photos from a composer that was closed delete themselves.
 */
export async function uploadListingFile(args: { uid: string; file: File; role: UploadRole }) {
  if (args.file.size > LISTING_RULES.fileMaxBytes) {
    throw new ListingError('Photo is too large (max 3 MB).', 'FILE_TOO_LARGE', 413)
  }
  const bytes = new Uint8Array(await args.file.arrayBuffer())
  if (!isJpeg(bytes)) throw new ListingError('Photos must be JPEG.', 'FILE_TYPE')

  const path = `${safeFolder(args.uid)}/${randomUUID()}${args.role === 'thumb' ? '-t' : ''}.jpg`
  const { error: uploadError } = await db()
    .storage.from(AGENT_LISTINGS_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (uploadError) throw new ListingError(`Upload failed: ${uploadError.message}`, 'UPLOAD_FAILED', 500)

  const { error: rowError } = await db()
    .from('misaeng_files')
    .insert({ path, owner_id: args.uid, role: args.role, bytes: bytes.length } as never)
  if (rowError) {
    await db().storage.from(AGENT_LISTINGS_BUCKET).remove([path])
    throw new ListingError(`Upload failed: ${rowError.message}`, 'UPLOAD_FAILED', 500)
  }
  return { path, url: publicFileUrl(path)! }
}

/** Storage folder from the uid (uids are text; keep the path to safe characters). */
function safeFolder(uid: string) {
  return uid.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'user'
}

export type ListingInput = {
  kind: string
  zip: string
  area: string
  neighborhood?: string | null
  rent: number
  period?: string
  /** yyyy-mm-dd; null = available now. */
  moveIn?: string | null
  youtubeId?: string | null
  detailsHtml?: string | null
  /** In order; the first is the cover. */
  photos: { path: string; thumb: string }[]
  floorPlan?: string | null
  /** Always true on Misaeng (agents only); kept for the shared app payload. */
  brokered?: boolean
  city?: string | null
  beds?: number | null
  baths?: number | null
  /** Dollars the tenant pays the agent; 0 / null = no fee (NYC FARE Act: never the landlord's agent fee). */
  brokerFee?: number | null
  /** Brokered, not in-house: { plan: 'regular', days: 7|14|28 } or { plan: 'premium', reserve? } — never a price. */
  listingPlan?: unknown
}

type ListingRow = {
  id: string
  owner_id: string
  kind: string
  zip: string
  city: string
  area: string
  neighborhood: string | null
  beds: number | null
  baths: number | null
  rent: number
  period: string
  move_in: string | null
  youtube_id: string | null
  details_html: string | null
  cover_thumb: string | null
  status: 'live' | 'expired' | 'archived' | 'deleted' | 'removed'
  posted_at: string
  expires_at: string
}

const LISTING_COLUMNS =
  'id, owner_id, kind, zip, city, area, neighborhood, beds, baths, rent, period, move_in, youtube_id, details_html, cover_thumb, status, posted_at, expires_at'

function validate(input: ListingInput) {
  const fail = (message: string, code = 'INVALID') => {
    throw new ListingError(message, code)
  }
  if (!(KINDS as readonly string[]).includes(input.kind)) fail('Pick a listing type.')
  if (!/^\d{5}$/.test(input.zip ?? '')) fail('Enter a 5-digit ZIP code.')
  if (!input.area?.trim() || input.area.length > 60) fail('Pick an area.')
  if ((input.neighborhood?.length ?? 0) > 60) fail('Neighborhood is too long.')
  if (!Number.isInteger(input.rent) || input.rent < 1 || input.rent > LISTING_RULES.rentMax) {
    fail(`Rent must be between $1 and $${LISTING_RULES.rentMax.toLocaleString('en-US')}.`)
  }
  if (input.period && !(PERIODS as readonly string[]).includes(input.period)) fail('Pick daily, weekly or monthly.')
  if (input.moveIn && !/^\d{4}-\d{2}-\d{2}$/.test(input.moveIn)) fail('Move-in date is not valid.')
  if (input.youtubeId && !/^[A-Za-z0-9_-]{11}$/.test(input.youtubeId)) fail('YouTube link is not valid.')
  if ((input.detailsHtml?.length ?? 0) > LISTING_RULES.detailsMax) fail('Details are too long.')
  const count = input.photos?.length ?? 0
  if (count < LISTING_RULES.photosMin || count > LISTING_RULES.photosMax) {
    fail(`Add ${LISTING_RULES.photosMin}–${LISTING_RULES.photosMax} photos.`, 'PHOTO_COUNT')
  }
  if (input.city != null && !['nyc', 'boston', 'dc'].includes(input.city)) fail('Pick a city.')
  if (input.beds != null && (!Number.isInteger(input.beds) || input.beds < 0 || input.beds > 10)) fail('Bedrooms must be 0–10.')
  if (input.baths != null && (!Number.isFinite(input.baths) || input.baths < 0 || input.baths > 10 || (input.baths * 2) % 1 !== 0)) {
    fail('Bathrooms must be 0–10 (halves allowed).')
  }
  if (input.brokerFee != null && (!Number.isInteger(input.brokerFee) || input.brokerFee < 0 || input.brokerFee > 100_000)) {
    fail('Broker fee must be between $0 and $100,000.')
  }
}

/** Only <b>, <u> and <br> survive (what the app's editor makes); everything else becomes plain text. */
export function cleanDetailsHtml(html: string | null | undefined) {
  if (!html) return null
  const escaped = html.replace(/&(?!(amp|lt|gt|quot|#39);)/g, '&amp;')
  const kept = escaped.replace(/<(\/?)(b|u|br)\s*\/?>/gi, '\u0000$1$2\u0001')
  const text = kept.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return text.replace(/\u0000(\/?)(b|u|br)\u0001/gi, (_, slash, tag) => `<${slash}${tag.toLowerCase()}>`).trim() || null
}

export async function createListing(uid: string, input: ListingInput) {
  validate(input)
  // Owner 11-25: a verified Licensed Agent posts brokered listings only (no personal room / sublet listings);
  // pending applicants still post personal ones until they're approved.
  const license = await activeLicense(uid)
  if (!license) throw new ListingError('Listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
  // Credits off: agent listings post free for 30 days; no plan.
  const paid = await creditsEnabled().catch(() => false)
  const choice = paid ? parsePlan(input.listingPlan) : null
  if (paid && !choice) {
    throw new ListingError('Choose how long to show this listing (7, 14 or 28 days, or Premium).', 'PLAN_REQUIRED')
  }
  const paths = [...input.photos.flatMap((photo) => [photo.path, photo.thumb]), ...(input.floorPlan ? [input.floorPlan] : [])]
  if (new Set(paths).size !== paths.length) throw new ListingError('The same photo was sent twice.', 'INVALID')

  // Every file must be this user's own, unposted upload.
  const { data: files, error: filesError } = await db()
    .from('misaeng_files')
    .select('path, role')
    .in('path', paths)
    .eq('owner_id', uid)
    .is('listing_id', null)
  if (filesError) throw new ListingError(filesError.message, 'SAVE_FAILED', 500)
  if ((files?.length ?? 0) !== paths.length) {
    throw new ListingError('Some photos expired or were not uploaded. Add them again.', 'PHOTO_MISSING')
  }

  const { data: listing, error } = await db()
    .from('misaeng_listings')
    .insert({
      owner_id: uid,
      kind: input.kind,
      zip: input.zip,
      city: input.city ?? 'nyc',
      beds: input.beds ?? null,
      baths: input.baths ?? null,
      area: input.area.trim(),
      neighborhood: input.neighborhood?.trim() || null,
      rent: input.rent,
      period: input.period ?? 'monthly',
      move_in: input.moveIn || null,
      youtube_id: input.youtubeId || null,
      details_html: cleanDetailsHtml(input.detailsHtml),
      cover_thumb: input.photos[0].thumb,
      brokered: true,
      brokerage: license.brokerage,
      broker_fee: input.brokerFee || 0,
      license_id: license.id,
      // Hidden until the plan is paid (the board shows only expires_at > now); free → the default 30 days.
      ...(paid ? { expires_at: new Date().toISOString() } : {}),
    } as never)
    .select(LISTING_COLUMNS)
    .single<ListingRow>()
  if (error || !listing) throw new ListingError(error?.message ?? 'Save failed', 'SAVE_FAILED', 500)

  // Claim the files in order (photo + its thumb share a position).
  const updates = [
    ...input.photos.flatMap((photo, position) => [
      { path: photo.path, position },
      { path: photo.thumb, position },
    ]),
    ...(input.floorPlan ? [{ path: input.floorPlan, position: null }] : []),
  ]
  for (const update of updates) {
    const { error: claimError } = await db()
      .from('misaeng_files')
      .update({ listing_id: listing.id, purge_after: null, position: update.position } as never)
      .eq('path', update.path)
      .eq('owner_id', uid)
    if (claimError) throw new ListingError(claimError.message, 'SAVE_FAILED', 500)
  }
  if (paid) await payForNewListing(uid, listing.id, choice)
  const { data: fresh } = await db().from('misaeng_listings').select(LISTING_COLUMNS).eq('id', listing.id).single<ListingRow>()
  const [out] = await withBroker([toPublic(fresh ?? listing, uid)], [fresh ?? listing], uid)
  return out
}

/**
 * Brokered: the chosen plan is paid now (Premium with every spot taken → a paid reservation; the listing shows as a
 * regular 28-day listing meanwhile). A failed payment soft-deletes the listing.
 */
async function payForNewListing(uid: string, id: string, choice: ReturnType<typeof parsePlan>) {
  try {
    if (choice?.plan === 'regular') await purchase(uid, id, 'regular', choice.days)
    // Boost spots full: shown as a regular 28-day listing now, Boost starts when a spot frees.
    else if (choice?.plan === 'premium' && choice.reserve) await purchase(uid, id, 'reserve', 0, true)
    else await purchase(uid, id, 'premium')
  } catch (error) {
    await db().from('misaeng_listings').update({ status: 'deleted', deleted_at: new Date().toISOString() } as never).eq('id', id)
    if (error instanceof CreditsError) throw new ListingError(error.message, error.code, error.status)
    throw error
  }
}

const DAY = 86_400_000
const REPOST_DAYS = 90

function toPublic(row: ListingRow, viewer?: string | null) {
  const expires = new Date(row.expires_at).getTime()
  const now = Date.now()
  const mine = Boolean(viewer && row.owner_id === viewer)
  return {
    id: row.id,
    kind: row.kind,
    zip: row.zip,
    city: row.city,
    area: row.area,
    beds: row.beds,
    baths: row.baths == null ? null : Number(row.baths),
    neighborhood: row.neighborhood,
    rent: row.rent,
    period: row.period,
    moveIn: row.move_in,
    youtubeId: row.youtube_id,
    detailsHtml: row.details_html,
    coverUrl: publicFileUrl(row.cover_thumb),
    status: row.status,
    postedAt: row.posted_at,
    mine,
    /** Live: whole days left (at least 1). */
    expiresInDays: row.status === 'live' ? Math.max(1, Math.ceil((expires - now) / DAY)) : null,
    /** Expired (mine): days left to repost with the photos. */
    repostDaysLeft:
      mine && row.status === 'expired' ? Math.max(0, REPOST_DAYS - Math.floor((now - expires) / DAY)) : null,
  }
}

export type PublicListing = ReturnType<typeof toPublic> & {
  /** Premium slot right now (top of Housing, highlighted). */
  premium?: boolean
  /** Owner only: plan, days left in Premium, extension used, place in the Premium line. */
  planInfo?: PlanFacts | null
  brokered?: boolean
  brokerage?: string | null
  brokerFee?: number | null
  /** The poster is a verified Licensed Agent right now (badge). */
  licensedAgent?: boolean
  /** NY advertising disclosure: who lists it (agent name, license type words, brokerage, contact). */
  listedBy?: ListingDisclosure | null
}

export type ListingDisclosure = {
  brokerage: string
  agentName: string | null
  licenseType: string | null
  /** "Licensed Real Estate Salesperson" … */
  licenseLabel: string | null
  phone: string | null
  email: string | null
  /** Misaeng's own (ERP) listings: the responsible broker and office of the brokerage. */
  responsibleBroker?: string | null
  officeAddress?: string | null
  source: 'agent' | 'misaeng'
}

function contactParts(contact: string | null | undefined) {
  const value = (contact ?? '').trim()
  if (!value) return { phone: null, email: null }
  return /@/.test(value) ? { phone: null, email: value } : { phone: value, email: null }
}

/**
 * Brokered fields + the Licensed Agent badge, read apart from LISTING_COLUMNS so the board keeps working before
 * agent_license.sql is run (then everything reads as not brokered).
 */
async function withBroker<T extends ReturnType<typeof toPublic>>(
  listings: T[],
  rows: Pick<ListingRow, 'id' | 'owner_id'>[],
  viewer: string | null = null,
) {
  if (listings.length === 0) return listings as (T & PublicListing)[]
  const [extras, agents] = await Promise.all([
    db()
      .from('misaeng_listings')
      .select('id, brokered, brokerage, broker_fee')
      .in('id', rows.map((row) => row.id))
      .returns<{ id: string; brokered: boolean; brokerage: string | null; broker_fee: number | null }[]>()
      .then(({ data, error }) => (error ? [] : data ?? [])),
    licensedOwners(rows.map((row) => row.owner_id)).catch(() => new Map()),
  ])
  const plans = (await creditsEnabled().catch(() => false))
    ? await planFacts(rows, viewer).catch(() => new Map<string, PlanFacts>())
    : new Map<string, PlanFacts>()
  const byId = new Map(extras.map((extra) => [extra.id, extra]))
  const owners = new Map(rows.map((row) => [row.id, row.owner_id]))
  return listings.map((listing) => {
    const extra = byId.get(listing.id)
    const agent = agents.get(owners.get(listing.id) ?? '')
    return {
      ...listing,
      brokered: Boolean(extra?.brokered),
      brokerage: extra?.brokered ? extra.brokerage : null,
      brokerFee: extra?.brokered ? extra.broker_fee ?? 0 : null,
      licensedAgent: Boolean(agent),
      listedBy: agent
        ? {
            brokerage: extra?.brokerage || agent.brokerage,
            agentName: agent.holderName,
            licenseType: agent.licenseType,
            licenseLabel: licenseTypeLabel(agent.licenseType),
            ...contactParts(agent.contact),
            source: 'agent' as const,
          }
        : null,
      premium: Boolean(plans.get(listing.id)?.premiumActive && listing.status === 'live'),
      planInfo: listing.mine ? plans.get(listing.id) ?? null : null,
    }
  })
}

/** The board: live listings, newest first, plus the viewer's own expired one (for the repost bar). */
export async function listListings(viewer: string | null, limit = 50) {
  await promotePremium()
  const { data, error } = await db()
    .from('misaeng_listings')
    .select(LISTING_COLUMNS)
    .eq('status', 'live')
    .gt('expires_at', new Date().toISOString())
    .order('posted_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100))
    .returns<ListingRow[]>()
  if (error) throw new ListingError(error.message, 'LOAD_FAILED', 500)
  const listed = await withBroker((data ?? []).map((row) => toPublic(row, viewer)), data ?? [], viewer)
  // Premium spots first, then newest.
  const listings = [...listed.filter((l) => l.premium), ...listed.filter((l) => !l.premium)]

  let mineExpired: PublicListing[] = []
  let mineBrokered: PublicListing[] = []
  if (viewer) {
    const { data: expired } = await db()
      .from('misaeng_listings')
      .select(LISTING_COLUMNS)
      .eq('owner_id', viewer)
      .eq('status', 'expired')
      .order('expires_at', { ascending: false })
      .limit(5)
      .returns<ListingRow[]>()
    mineExpired = (expired ?? []).map((row) => toPublic(row, viewer))
    // My brokered listings in every state I can still act on (renew, Premium, reservation, rented).
    const { data: mine } = await db()
      .from('misaeng_listings')
      .select(LISTING_COLUMNS)
      .eq('owner_id', viewer)
      .eq('brokered', true)
      .in('status', ['live', 'expired'])
      .order('posted_at', { ascending: false })
      .limit(20)
      .returns<ListingRow[]>()
    const waitingOrOpen = mine ?? []
    mineBrokered = await withBroker(waitingOrOpen.map((row) => toPublic(row, viewer)), waitingOrOpen, viewer)
  }
  return { listings, mineExpired, mineBrokered }
}

/** One listing with all its photos (large + thumb, in order). Expired ones only for their owner. */
export async function getListing(id: string, viewer: string | null) {
  const { data: row } = await db().from('misaeng_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle<ListingRow>()
  if (!row) return null
  if (row.status !== 'live' && row.owner_id !== viewer) return null
  if (row.status === 'deleted' || row.status === 'archived') return null
  const { data: files } = await db()
    .from('misaeng_files')
    .select('path, role, position')
    .eq('listing_id', id)
    .order('position', { ascending: true })
    .returns<{ path: string; role: string; position: number | null }[]>()
  const photos: { url: string; thumbUrl: string | null }[] = []
  for (const file of files ?? []) {
    if (file.role !== 'photo') continue
    const thumb = files?.find((other) => other.role === 'thumb' && other.position === file.position)
    photos.push({ url: publicFileUrl(file.path)!, thumbUrl: publicFileUrl(thumb?.path) })
  }
  const floorPlan = files?.find((file) => file.role === 'floor_plan')
  const [listing] = await withBroker([toPublic(row, viewer)], [row], viewer)
  return { ...listing, photos, floorPlanUrl: publicFileUrl(floorPlan?.path) }
}

export async function renewListing(id: string, uid: string) {
  const { data: row } = await db().from('misaeng_listings').select('brokered').eq('id', id).maybeSingle<{ brokered: boolean }>()
  const license = await activeLicense(uid)
  if (!license) throw new ListingError('Listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
  // Agent listings are renewed by buying a plan again (credits on); free renewals while credits are off.
  if (row?.brokered && (await creditsEnabled().catch(() => false))) {
    throw new ListingError('Renew a brokered listing by choosing a plan (7, 14 or 28 days, or Premium).', 'PLAN_REQUIRED', 402)
  }
  const { data, error } = await db().rpc('misaeng_renew_listing', { p_listing: id, p_owner: uid } as never)
  if (error) throw new ListingError(error.message, 'SAVE_FAILED', 500)
  if (!data) throw new ListingError('This listing can no longer be reposted.', 'NOT_RENEWABLE', 404)
}

/** Hidden at once; the daily job deletes it and its photos after 7 days. */
export async function deleteListing(id: string, uid: string) {
  const { data, error } = await db()
    .from('misaeng_listings')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() } as never)
    .eq('id', id)
    .eq('owner_id', uid)
    .neq('status', 'deleted')
    .select('id')
  if (error) throw new ListingError(error.message, 'SAVE_FAILED', 500)
  if (!data?.length) throw new ListingError('Listing not found.', 'NOT_FOUND', 404)
}

/**
 * Deletes files whose purge_after has passed (the daily SQL job only marks them): from storage first, then the
 * rows. Called by the internal purge route; at most `batch` files per call.
 */
export async function purgeDueFiles(batch = 500) {
  const { data, error } = await db()
    .from('misaeng_files')
    .select('path')
    .lte('purge_after', new Date().toISOString())
    .limit(batch)
    .returns<{ path: string }[]>()
  if (error) throw new ListingError(error.message, 'PURGE_FAILED', 500)
  const paths = (data ?? []).map((row) => row.path)
  if (!paths.length) return { deleted: 0 }
  const { error: removeError } = await db().storage.from(AGENT_LISTINGS_BUCKET).remove(paths)
  if (removeError) throw new ListingError(removeError.message, 'PURGE_FAILED', 500)
  const { error: rowError } = await db().from('misaeng_files').delete().in('path', paths)
  if (rowError) throw new ListingError(rowError.message, 'PURGE_FAILED', 500)
  return { deleted: paths.length }
}

// MARK: - Misaeng housing feed (agent listings next to Misaeng's own ERP listings)

const KIND_UNIT: Record<string, { unitType: string; room: HousingRoomType | null }> = {
  privateRoom: { unitType: 'room', room: 'regular-bedroom' },
  sharedRoom: { unitType: 'room', room: 'regular-bedroom' },
  studio: { unitType: 'studio', room: 'studio' },
  apartment: { unitType: 'entire', room: 'entire' },
  sublet: { unitType: 'sublet', room: null },
}

function plainDetails(html: string | null) {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

/** One agent listing in Misaeng's HousingListing shape (id prefixed `agent-`, so it never collides with ERP ids). */
function toHousingListing(
  row: ListingRow,
  photos: string[],
  extra: { brokerFee: number | null; listedBy: ListingDisclosure | null; premium: boolean },
): HousingListing {
  const unit = KIND_UNIT[row.kind] ?? KIND_UNIT.apartment
  const beds = row.beds ?? (row.kind === 'studio' ? 0 : 1)
  const posted = new Date(row.posted_at).getTime()
  return {
    id: `agent-${row.id}`,
    city: (row.city as HousingListing['city']) ?? 'nyc',
    property: {
      address: '',
      displayedAddress: [row.neighborhood, row.area].filter(Boolean).join(', ') || row.area,
      buildingName: null,
      area: row.area,
      zipcode: row.zip,
      latitude: null,
      longitude: null,
      subway: [],
      amenities: [],
      appliances: [],
    },
    unit: {
      unitNumber: null,
      bedrooms: beds,
      bathrooms: row.baths == null ? 1 : Number(row.baths),
      price: row.rent,
      availableDate: row.move_in,
      available: true,
      rooms: unit.room ? [{ type: unit.room, price: row.rent }] : [],
      promotions: [],
      images: photos,
      youtubeUrl: row.youtube_id ? `https://www.youtube.com/watch?v=${row.youtube_id}` : null,
      unitType: (unit.unitType as HousingListing['unit']['unitType']) ?? null,
    },
    description: plainDetails(row.details_html),
    roommateWaiting: null,
    contactEmail: extra.listedBy?.email ?? '',
    authorUid: row.owner_id,
    authorEmail: '',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: posted,
    updatedAt: posted,
    status: 'open',
    listedBy: extra.listedBy,
    tenantFees: { brokerFee: extra.brokerFee ?? 0 },
    agentListing: { id: row.id, premium: extra.premium, expiresAt: row.expires_at, period: row.period },
  } as HousingListing
}

/** Live agent listings as HousingListings for /api/housing (Premium first). Never throws: no table → []. */
export async function agentHousingListings(city?: string | null): Promise<HousingListing[]> {
  try {
    await promotePremium().catch(() => null)
    let query = db()
      .from('misaeng_listings')
      .select(LISTING_COLUMNS)
      .eq('status', 'live')
      .gt('expires_at', new Date().toISOString())
      .order('posted_at', { ascending: false })
      .limit(200)
    if (city) query = query.eq('city', city)
    const { data, error } = await query.returns<ListingRow[]>()
    if (error || !data?.length) return []
    const enriched = await withBroker(data.map((row) => toPublic(row, null)), data, null)
    const { data: files } = await db()
      .from('misaeng_files')
      .select('path, role, position, listing_id')
      .in('listing_id', data.map((row) => row.id))
      .eq('role', 'photo')
      .order('position', { ascending: true })
      .returns<{ path: string; role: string; position: number | null; listing_id: string }[]>()
    const photos = new Map<string, string[]>()
    for (const file of files ?? []) {
      const list = photos.get(file.listing_id) ?? []
      list.push(publicFileUrl(file.path)!)
      photos.set(file.listing_id, list)
    }
    const out = data.map((row, index) =>
      toHousingListing(row, photos.get(row.id) ?? [publicFileUrl(row.cover_thumb)].filter((u): u is string => Boolean(u)), {
        brokerFee: enriched[index].brokerFee ?? 0,
        listedBy: enriched[index].listedBy ?? null,
        premium: Boolean(enriched[index].premium),
      }),
    )
    return [...out.filter((l) => l.agentListing?.premium), ...out.filter((l) => !l.agentListing?.premium)]
  } catch (error) {
    console.error('Agent housing listings error:', error)
    return []
  }
}

/** One agent listing for /api/housing/[id] (`agent-<uuid>`), live only. */
export async function agentHousingListing(id: string): Promise<HousingListing | null> {
  const uuid = id.replace(/^agent-/, '')
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) return null
  const listing = await getListing(uuid, null).catch(() => null)
  if (!listing || listing.status !== 'live') return null
  const { data: row } = await db().from('misaeng_listings').select(LISTING_COLUMNS).eq('id', uuid).maybeSingle<ListingRow>()
  if (!row) return null
  return toHousingListing(row, listing.photos.map((photo) => photo.url), {
    brokerFee: listing.brokerFee ?? 0,
    listedBy: listing.listedBy ?? null,
    premium: Boolean(listing.premium),
  })
}

const REPORT_REASONS = ['scam', 'wrong_info', 'unavailable', 'discrimination', 'fee', 'other'] as const

/** A member reports an agent listing (one report per member per listing); staff see them in the ERP. */
export async function reportListing(input: { id: string; uid: string; reason: string; note?: string | null }) {
  const uuid = input.id.replace(/^agent-/, '')
  if (!(REPORT_REASONS as readonly string[]).includes(input.reason)) throw new ListingError('Pick a reason.', 'INVALID')
  const { error } = await db()
    .from('misaeng_listing_reports')
    .insert({ listing_id: uuid, reporter: input.uid, reason: input.reason, note: input.note?.slice(0, 500) || null } as never)
  if (error?.code === '23505') return { already: true }
  if (error) throw new ListingError(error.message, 'SAVE_FAILED', 500)
  const { data: row } = await db().from('misaeng_listings').select('reports').eq('id', uuid).maybeSingle<{ reports: number }>()
  await db().from('misaeng_listings').update({ reports: (row?.reports ?? 0) + 1 } as never).eq('id', uuid)
  return { already: false }
}

/** ERP: open reports, newest first. */
export async function listListingReports(limit = 200) {
  const { data, error } = await db()
    .from('misaeng_listing_reports')
    .select('id, listing_id, reporter, reason, note, created_at, closed_at')
    .is('closed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data ?? []
}

/** ERP: close a report; `remove` also takes the listing down (status 'removed', reason 'report'). */
export async function closeListingReport(input: { id: string; by: string; remove: boolean }) {
  const { data, error } = await db()
    .from('misaeng_listing_reports')
    .update({ closed_at: new Date().toISOString(), closed_by: input.by.slice(0, 200) } as never)
    .eq('id', input.id)
    .select('listing_id')
    .maybeSingle<{ listing_id: string }>()
  if (error) throw new ListingError(error.message, 'SAVE_FAILED', 500)
  if (data && input.remove) {
    await db()
      .from('misaeng_listings')
      .update({ status: 'removed', removed_at: new Date().toISOString(), removed_reason: 'report' } as never)
      .eq('id', data.listing_id)
  }
  return { ok: true }
}
