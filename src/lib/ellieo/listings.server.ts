import { randomUUID } from 'node:crypto'

import { getSupabaseServiceClient } from '@lib/supabase/server'

import { activeLicense, licensedOwners } from './agentLicense.server'
import { creditsEnabled } from './creditsCore.server'
import { CreditsError, parsePlan, planFacts, promotePremium, purchase, type PlanFacts } from './listingPlans.server'

/**
 * Ellieo housing listings posted from the app (tables ellieo_listings / ellieo_files, made by
 * ellieo-app/shared/ellieo/db/retention.sql). The app shrinks photos before upload (≤1600 px + a 400 px thumb);
 * this side only checks and stores them. Windows (30 days live, 90 to repost, 7 after delete, 24 h for unposted
 * uploads) live in that SQL's daily job; this file never deletes by date itself.
 */

export const ELLIEO_LISTINGS_BUCKET = 'ellieo-listings'

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
  return `${base}/storage/v1/object/public/${ELLIEO_LISTINGS_BUCKET}/${path}`
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
    .storage.from(ELLIEO_LISTINGS_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (uploadError) throw new ListingError(`Upload failed: ${uploadError.message}`, 'UPLOAD_FAILED', 500)

  const { error: rowError } = await db()
    .from('ellieo_files')
    .insert({ path, owner_id: args.uid, role: args.role, bytes: bytes.length } as never)
  if (rowError) {
    await db().storage.from(ELLIEO_LISTINGS_BUCKET).remove([path])
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
  /** Brokered listing (Licensed Agents only): the brokerage comes from the approved license. */
  brokered?: boolean
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
  area: string
  neighborhood: string | null
  rent: number
  period: string
  move_in: string | null
  youtube_id: string | null
  details_html: string | null
  cover_thumb: string | null
  status: 'live' | 'expired' | 'archived' | 'deleted'
  posted_at: string
  expires_at: string
}

const LISTING_COLUMNS =
  'id, owner_id, kind, zip, area, neighborhood, rent, period, move_in, youtube_id, details_html, cover_thumb, status, posted_at, expires_at'

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
  if (input.brokered && input.brokerFee != null && (!Number.isInteger(input.brokerFee) || input.brokerFee < 0 || input.brokerFee > 100_000)) {
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
  if (input.brokered && !license) {
    throw new ListingError('Brokered listings are for verified Licensed Agents.', 'AGENT_REQUIRED', 403)
  }
  // Credits off (first release): brokered listings post free and live 30 days like personal ones; no plan.
  const paid = Boolean(input.brokered) && (await creditsEnabled().catch(() => false))
  const choice = paid ? parsePlan(input.listingPlan) : null
  if (paid && !choice) {
    throw new ListingError('Choose how long to show this listing (7, 14 or 28 days, or Premium).', 'PLAN_REQUIRED')
  }
  if (!input.brokered && license) {
    throw new ListingError(
      'Licensed Agents can post brokered listings only. Choose Brokered listing to post under your brokerage.',
      'AGENT_BROKERED_ONLY',
      403,
    )
  }
  const paths = [...input.photos.flatMap((photo) => [photo.path, photo.thumb]), ...(input.floorPlan ? [input.floorPlan] : [])]
  if (new Set(paths).size !== paths.length) throw new ListingError('The same photo was sent twice.', 'INVALID')

  // Every file must be this user's own, unposted upload.
  const { data: files, error: filesError } = await db()
    .from('ellieo_files')
    .select('path, role')
    .in('path', paths)
    .eq('owner_id', uid)
    .is('listing_id', null)
  if (filesError) throw new ListingError(filesError.message, 'SAVE_FAILED', 500)
  if ((files?.length ?? 0) !== paths.length) {
    throw new ListingError('Some photos expired or were not uploaded. Add them again.', 'PHOTO_MISSING')
  }

  const { data: listing, error } = await db()
    .from('ellieo_listings')
    .insert({
      owner_id: uid,
      kind: input.kind,
      zip: input.zip,
      area: input.area.trim(),
      neighborhood: input.neighborhood?.trim() || null,
      rent: input.rent,
      period: input.period ?? 'monthly',
      move_in: input.moveIn || null,
      youtube_id: input.youtubeId || null,
      details_html: cleanDetailsHtml(input.detailsHtml),
      cover_thumb: input.photos[0].thumb,
      ...(license
        ? {
            brokered: true,
            brokerage: license.brokerage,
            broker_fee: input.brokerFee || 0,
            license_id: license.id,
            // Hidden until the plan is paid (the board shows only expires_at > now); free → the default 30 days.
            ...(paid ? { expires_at: new Date().toISOString() } : {}),
          }
        : {}),
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
      .from('ellieo_files')
      .update({ listing_id: listing.id, purge_after: null, position: update.position } as never)
      .eq('path', update.path)
      .eq('owner_id', uid)
    if (claimError) throw new ListingError(claimError.message, 'SAVE_FAILED', 500)
  }
  if (license && paid) await payForNewListing(uid, listing.id, choice)
  const { data: fresh } = await db().from('ellieo_listings').select(LISTING_COLUMNS).eq('id', listing.id).single<ListingRow>()
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
    await db().from('ellieo_listings').update({ status: 'deleted', deleted_at: new Date().toISOString() } as never).eq('id', id)
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
    area: row.area,
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
      .from('ellieo_listings')
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
    return {
      ...listing,
      brokered: Boolean(extra?.brokered),
      brokerage: extra?.brokered ? extra.brokerage : null,
      brokerFee: extra?.brokered ? extra.broker_fee ?? 0 : null,
      licensedAgent: agents.has(owners.get(listing.id) ?? ''),
      premium: Boolean(plans.get(listing.id)?.premiumActive && listing.status === 'live'),
      planInfo: listing.mine ? plans.get(listing.id) ?? null : null,
    }
  })
}

/** The board: live listings, newest first, plus the viewer's own expired one (for the repost bar). */
export async function listListings(viewer: string | null, limit = 50) {
  await promotePremium()
  const { data, error } = await db()
    .from('ellieo_listings')
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
      .from('ellieo_listings')
      .select(LISTING_COLUMNS)
      .eq('owner_id', viewer)
      .eq('status', 'expired')
      .order('expires_at', { ascending: false })
      .limit(5)
      .returns<ListingRow[]>()
    mineExpired = (expired ?? []).map((row) => toPublic(row, viewer))
    // My brokered listings in every state I can still act on (renew, Premium, reservation, rented).
    const { data: mine } = await db()
      .from('ellieo_listings')
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
  const { data: row } = await db().from('ellieo_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle<ListingRow>()
  if (!row) return null
  if (row.status !== 'live' && row.owner_id !== viewer) return null
  if (row.status === 'deleted' || row.status === 'archived') return null
  const { data: files } = await db()
    .from('ellieo_files')
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
  const { data: row } = await db().from('ellieo_listings').select('brokered').eq('id', id).maybeSingle<{ brokered: boolean }>()
  const license = await activeLicense(uid)
  // A Licensed Agent can't bring a personal listing back (brokered only, owner 11-25).
  if (license && row && !row.brokered) {
    throw new ListingError('Licensed Agents can post brokered listings only. This personal listing can’t be reposted.', 'AGENT_BROKERED_ONLY', 403)
  }
  // Brokered listings are renewed by buying a plan again (credits on); free renewals while credits are off.
  if (row?.brokered && (await creditsEnabled().catch(() => false))) {
    throw new ListingError('Renew a brokered listing by choosing a plan (7, 14 or 28 days, or Premium).', 'PLAN_REQUIRED', 402)
  }
  const { data, error } = await db().rpc('ellieo_renew_listing', { p_listing: id, p_owner: uid } as never)
  if (error) throw new ListingError(error.message, 'SAVE_FAILED', 500)
  if (!data) throw new ListingError('This listing can no longer be reposted.', 'NOT_RENEWABLE', 404)
}

/** Hidden at once; the daily job deletes it and its photos after 7 days. */
export async function deleteListing(id: string, uid: string) {
  const { data, error } = await db()
    .from('ellieo_listings')
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
    .from('ellieo_files')
    .select('path')
    .lte('purge_after', new Date().toISOString())
    .limit(batch)
    .returns<{ path: string }[]>()
  if (error) throw new ListingError(error.message, 'PURGE_FAILED', 500)
  const paths = (data ?? []).map((row) => row.path)
  if (!paths.length) return { deleted: 0 }
  const { error: removeError } = await db().storage.from(ELLIEO_LISTINGS_BUCKET).remove(paths)
  if (removeError) throw new ListingError(removeError.message, 'PURGE_FAILED', 500)
  const { error: rowError } = await db().from('ellieo_files').delete().in('path', paths)
  if (rowError) throw new ListingError(rowError.message, 'PURGE_FAILED', 500)
  return { deleted: paths.length }
}
