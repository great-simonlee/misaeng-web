/** 중고거래 (marketplace board): categories, price and trade status. Same values in the apps. */

export const MARKET_CATEGORIES = ['moving', 'furniture', 'electronics', 'home', 'clothing', 'books', 'tickets', 'other'] as const
export type MarketCategory = (typeof MARKET_CATEGORIES)[number]

export const MARKET_STATUSES = ['selling', 'reserved', 'sold'] as const
export type MarketStatus = (typeof MARKET_STATUSES)[number]

export const MARKET_PRICE_MAX = 100_000

/** 사진은 최대 6장 (앱도 6장까지만 고르게 한다) */
export const MARKET_PHOTO_MAX = 6

/** 거래 지역은 정확한 주소 대신 ZIP 코드 5자리만 저장한다 (12345 또는 12345-6789 → 12345). 아니면 null. */
export function normalizeMarketZip(value: unknown): string | null {
  const match = String(value ?? '').trim().match(/^(\d{5})(?:-\d{4})?$/)
  return match ? match[1] : null
}

export function normalizeMarketCategory(value: unknown): MarketCategory {
  return MARKET_CATEGORIES.includes(value as MarketCategory) ? (value as MarketCategory) : 'other'
}

export function normalizeMarketStatus(value: unknown): MarketStatus | null {
  return MARKET_STATUSES.includes(value as MarketStatus) ? (value as MarketStatus) : null
}

/** Whole dollars; 0 = free (나눔). null when not a number. */
export function normalizeMarketPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Math.round(Number(String(value).replace(/[$,\s]/g, '')))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(n, MARKET_PRICE_MAX)
}
