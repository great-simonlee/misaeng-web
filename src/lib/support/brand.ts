import { BRAND_CONFIG, brandConfig } from '@lib/brand'

import type { SupportBrand } from './types'

/**
 * Support conversations carry the brand of the site/app they started on. It is set on the server from this
 * deployment's brand (NEXT_PUBLIC_BRAND), never from a request body.
 */
export const SERVER_SUPPORT_BRAND: SupportBrand = BRAND_CONFIG.id

/** Row / unknown value → brand (anything but 'ellieo' is Misaeng, same as the column default). */
export const supportBrand = (value: unknown): SupportBrand => (value === 'ellieo' ? 'ellieo' : 'misaeng')

/** Staff-facing label prefix: Ellieo conversations are marked, Misaeng ones are not (unchanged). */
export const staffBrandPrefix = (brand: unknown) => (supportBrand(brand) === 'ellieo' ? '[Ellieo] ' : '')

/** The brand's public site (always its production domain, not NEXT_PUBLIC_SITE_URL: misaeng.com mails for both). */
export const brandProductionUrl = (brand: SupportBrand) => brandConfig(brand).productionUrl
