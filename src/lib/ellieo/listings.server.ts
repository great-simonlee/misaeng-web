import { randomUUID } from 'node:crypto'

import { getSupabaseServiceClient } from '@lib/supabase/server'

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
  return toPublic(listing, uid)
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

export type PublicListing = ReturnType<typeof toPublic>

/** The board: live listings, newest first, plus the viewer's own expired one (for the repost bar). */
export async function listListings(viewer: string | null, limit = 50) {
  const { data, error } = await db()
    .from('ellieo_listings')
    .select(LISTING_COLUMNS)
    .eq('status', 'live')
    .gt('expires_at', new Date().toISOString())
    .order('posted_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100))
    .returns<ListingRow[]>()
  if (error) throw new ListingError(error.message, 'LOAD_FAILED', 500)
  const listings = (data ?? []).map((row) => toPublic(row, viewer))

  let mineExpired: PublicListing[] = []
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
  }
  return { listings, mineExpired }
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
  return { ...toPublic(row, viewer), photos, floorPlanUrl: publicFileUrl(floorPlan?.path) }
}

export async function renewListing(id: string, uid: string) {
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
