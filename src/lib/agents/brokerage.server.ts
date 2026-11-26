import { getSupabaseServiceClient } from '@lib/supabase/server'
import type { HousingListedBy, HousingListing } from '@/types/nyc'

import { licenseTypeLabel } from './agentLicense.server'

/**
 * Misaeng's own (ERP) listings are advertised by its brokerage, so every one shows who lists it (NY 19 NYCRR 175.25):
 * brokerage name, the responsible agent's name and license type (picked per listing in the ERP), and contact. The
 * brokerage, responsible broker and office come from misaeng_settings 'brokerage' (ERP → Misaeng → Agent settings);
 * owner 2026-11-26: the brokerage is Fact Real Estate. Agent listings carry their own block (listings.server.ts).
 */
export type BrokerageSettings = {
  name: string
  /** Words shown after the brokerage ("Licensed Real Estate Broker"). */
  licenseType: string
  responsibleBroker: string
  officePhone: string
  officeEmail: string
  officeAddress: string
  fairHousingNoticeUrl: string
  housingDisclosureUrl: string
}

export const DEFAULT_BROKERAGE: BrokerageSettings = {
  name: 'Fact Real Estate',
  licenseType: 'Licensed Real Estate Broker',
  responsibleBroker: '',
  officePhone: '',
  officeEmail: '',
  officeAddress: '',
  fairHousingNoticeUrl: 'https://dos.ny.gov/system/files/documents/2024/03/fair-housing-notice.pdf',
  housingDisclosureUrl:
    'https://dos.ny.gov/system/files/documents/2024/03/nys-housing-and-anti-discrimination-disclosure-form.pdf',
}

let cached: { at: number; value: BrokerageSettings } | null = null

/** misaeng_settings 'brokerage' merged over the defaults; 60 s cache; never throws (no table → defaults). */
export async function getBrokerageSettings(): Promise<BrokerageSettings> {
  if (cached && Date.now() - cached.at < 60_000) return cached.value
  let value = DEFAULT_BROKERAGE
  try {
    const { data } = await getSupabaseServiceClient()
      .from('misaeng_settings')
      .select('value')
      .eq('key', 'brokerage')
      .maybeSingle<{ value: Partial<BrokerageSettings> | null }>()
    if (data?.value && typeof data.value === 'object') {
      const merged = { ...DEFAULT_BROKERAGE }
      for (const key of Object.keys(DEFAULT_BROKERAGE) as (keyof BrokerageSettings)[]) {
        const next = data.value[key]
        if (typeof next === 'string' && next.trim()) merged[key] = next.trim()
      }
      value = merged
    }
  } catch {
    value = DEFAULT_BROKERAGE
  }
  cached = { at: Date.now(), value }
  return value
}

export async function saveBrokerageSettings(input: Partial<BrokerageSettings>, by: string) {
  const current = await getBrokerageSettings()
  const next = { ...current }
  for (const key of Object.keys(DEFAULT_BROKERAGE) as (keyof BrokerageSettings)[]) {
    const value = input[key]
    if (typeof value === 'string') next[key] = value.trim().slice(0, key.endsWith('Url') ? 300 : 120)
  }
  if (!next.name) next.name = DEFAULT_BROKERAGE.name
  const { error } = await getSupabaseServiceClient()
    .from('misaeng_settings')
    .upsert({ key: 'brokerage', value: next, updated_at: new Date().toISOString(), updated_by: by.slice(0, 200) } as never)
  if (error) throw new Error(error.message)
  cached = { at: Date.now(), value: next }
  return next
}

/**
 * The disclosure for one of Misaeng's own listings: the ERP's per-listing agent (listedBy.agentName / licenseType /
 * phone / email, published with the listing) under the brokerage from settings. Without an ERP agent the responsible
 * broker is named. Agent listings (source 'agent') are returned as they are.
 */
export function misaengDisclosure(listing: HousingListing, brokerage: BrokerageSettings): HousingListedBy {
  const erp = listing.listedBy
  if (erp?.source === 'agent') return erp
  const agentName = erp?.agentName || brokerage.responsibleBroker || null
  const licenseType = erp?.agentName ? erp.licenseType : erp?.licenseType || (brokerage.responsibleBroker ? 'broker' : null)
  return {
    brokerage: brokerage.name,
    agentName,
    licenseType,
    licenseLabel: agentName ? erp?.licenseLabel || licenseTypeLabel(licenseType) : null,
    phone: erp?.phone || brokerage.officePhone || null,
    email: erp?.email || listing.contactEmail || brokerage.officeEmail || null,
    responsibleBroker: brokerage.responsibleBroker || null,
    officeAddress: brokerage.officeAddress || null,
    source: 'misaeng',
  }
}

export function withMisaengDisclosure<T extends HousingListing>(listings: T[], brokerage: BrokerageSettings): T[] {
  return listings.map((listing) =>
    listing.listedBy?.source === 'agent'
      ? listing
      : { ...listing, listedBy: misaengDisclosure(listing, brokerage), tenantFees: listing.tenantFees ?? { brokerFee: 0 } },
  )
}
