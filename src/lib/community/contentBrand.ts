import { BRAND_IDS, type BrandId } from '@lib/brand'

/**
 * Which site a community post / comment / report was written on (shared Storage and tables).
 * Contract shared with ellieo-erp and the apps:
 * - `brand: 'misaeng' | 'ellieo'` on community/{id}.json, each comment in community-comments/{postId}.json
 *   and community_reports rows. Missing = 'misaeng' (everything written before 2026-11-06).
 * - Set on the server from BRAND_CONFIG.id when the item is created, never from the request body.
 * - Edits keep the stored value.
 */
export type ContentBrandFields = { brand?: BrandId }

export const DEFAULT_CONTENT_BRAND: BrandId = 'misaeng'

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && (BRAND_IDS as readonly string[]).includes(value)
}

/** Keep a stored `brand` when normalizing (so a re-save does not drop it) */
export function pickContentBrand(raw: unknown): ContentBrandFields {
  const value = raw && typeof raw === 'object' ? (raw as { brand?: unknown }).brand : undefined
  return isBrandId(value) ? { brand: value } : {}
}

export function contentBrandOf(item: ContentBrandFields | null | undefined): BrandId {
  return isBrandId(item?.brand) ? item.brand : DEFAULT_CONTENT_BRAND
}
