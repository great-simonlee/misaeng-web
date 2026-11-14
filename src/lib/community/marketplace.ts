/** 중고거래 (marketplace board): categories, price and trade status. Same values in the apps. */

export const MARKET_CATEGORIES = ['furniture', 'electronics', 'home', 'clothing', 'books', 'tickets', 'other'] as const
export type MarketCategory = (typeof MARKET_CATEGORIES)[number]

export const MARKET_STATUSES = ['selling', 'reserved', 'sold'] as const
export type MarketStatus = (typeof MARKET_STATUSES)[number]

export const MARKET_PRICE_MAX = 100_000

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
