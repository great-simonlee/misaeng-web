#!/usr/bin/env node
/**
 * Analytics backfill, phase 1 (supabase/analytics.sql must be applied first).
 * Turns what Supabase already records into analytics_events with props.backfilled = true, so the dashboards have a
 * past (actions only — page views and where people came from were never recorded and cannot be rebuilt).
 *
 *   node scripts/analytics/backfill-phase1.mjs --env .env.local [--dry-run]
 *
 * Sources: point_ledger (points_earned / points_spent), content_unlocks (review_unlocked), coffee_chat_requests,
 * marketplace_inquiries + housing support_conversations (listing_inquiry_sent), premium_entitlements
 * (purchase_completed), auth_accounts created as new accounts (signup_completed).
 * Idempotent: event ids are UUID v5 of the source row, inserted with "on conflict do nothing".
 * Phase 2 (old API server: posts, comments, member sign-up dates; ERP Firestore) is not here.
 * Refuses the production project unless --allow-prod is passed.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const envFile = opt('--env')
if (envFile) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!URL_BASE || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (--env <file>).')
  process.exit(1)
}
if (URL_BASE.includes('nibpfpeovmfpufyzpatk') && !flag('--allow-prod')) {
  console.error('This is the production project. Re-run with --allow-prod only when the owner asks for it.')
  process.exit(1)
}
const DRY = flag('--dry-run')

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path.split('?')[0]} → ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

/** Every row of a table, 1,000 at a time. */
async function* rows(table, select, filter = '') {
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(`${table}?select=${select}${filter}&order=created_at.asc&limit=1000&offset=${offset}`)
    yield* page
    if (page.length < 1000) return
  }
}

// RFC 4122 v5 (SHA-1, URL namespace) so the same source row always gives the same event id
const NS = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex')
function uuidV5(name) {
  const h = createHash('sha1').update(Buffer.concat([NS, Buffer.from(name)])).digest()
  h[6] = (h[6] & 0x0f) | 0x50
  h[8] = (h[8] & 0x3f) | 0x80
  const x = h.subarray(0, 16).toString('hex')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
}

const event = (key, ts, name, userId, props) => ({
  event_id: uuidV5(`misaeng-backfill:${key}`),
  ts,
  event: name,
  user_id: userId,
  anonymous_id: 'backfill',
  session_id: null,
  brand: 'misaeng',
  platform: 'server',
  props: { ...props, backfilled: true },
})

let buffer = []
const counts = {}
async function push(e) {
  counts[e.event] = (counts[e.event] || 0) + 1
  buffer.push(e)
  if (buffer.length >= 500) await flush()
}
async function flush() {
  if (!buffer.length) return
  if (!DRY) {
    await rest('analytics_events?on_conflict=event_id,ts', {
      method: 'POST',
      body: JSON.stringify(buffer),
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    })
  }
  buffer = []
}

async function source(name, fn) {
  try {
    await fn()
  } catch (error) {
    console.warn(`skipped ${name}: ${error.message}`)
  }
}

await source('point_ledger', async () => {
  for await (const r of rows('point_ledger', 'id,user_id,entry_type,amount,reason,created_at', '&entry_type=in.(earn,spend)')) {
    if (!r.user_id || !r.amount) continue
    await push(event(`point_ledger:${r.id}`, r.created_at, r.entry_type === 'earn' ? 'points_earned' : 'points_spent', r.user_id,
      { reason: r.reason, amount: Math.abs(r.amount) }))
  }
})
await source('content_unlocks', async () => {
  for await (const r of rows('content_unlocks', 'user_id,post_id,method,created_at', '&method=eq.points')) {
    await push(event(`content_unlocks:${r.user_id}:${r.post_id}`, r.created_at, 'review_unlocked', r.user_id, { review_id: r.post_id }))
  }
})
await source('coffee_chat_requests', async () => {
  for await (const r of rows('coffee_chat_requests', 'id,user_id,mentor_id,created_at')) {
    await push(event(`coffee_chat_requests:${r.id}`, r.created_at, 'coffee_chat_requested', r.user_id, { mentor_id: r.mentor_id || 'unassigned' }))
  }
})
await source('marketplace_inquiries', async () => {
  for await (const r of rows('marketplace_inquiries', 'id,post_id,buyer_id,created_at')) {
    await push(event(`marketplace_inquiries:${r.id}`, r.created_at, 'listing_inquiry_sent', r.buyer_id, { listing_id: r.post_id, listing_type: 'market' }))
  }
})
await source('support_conversations', async () => {
  for await (const r of rows('support_conversations', 'id,user_uid,listing_id,created_at', '&kind=eq.housing&brand=eq.misaeng')) {
    await push(event(`support_conversations:${r.id}`, r.created_at, 'listing_inquiry_sent', r.user_uid, { listing_id: r.listing_id || r.id, listing_type: 'housing' }))
  }
})
await source('premium_entitlements', async () => {
  for await (const r of rows('premium_entitlements', 'id,user_uid,source,plan,environment,created_at', '&source=in.(stripe,apple,google)')) {
    if (r.environment && !['live', 'Production'].includes(r.environment)) continue
    await push(event(`premium_entitlements:${r.id}`, r.created_at, 'purchase_completed', r.user_uid, { product: 'premium', plan: r.plan, source: r.source }))
  }
})
await source('auth_accounts', async () => {
  for await (const r of rows('auth_accounts', 'uid,linked_via,created_at', '&linked_via=eq.new')) {
    await push(event(`auth_accounts:${r.uid}`, r.created_at, 'signup_completed', r.uid, {}))
  }
})
await flush()

console.log(`${DRY ? '[dry run] would insert' : 'inserted (duplicates ignored)'}:`, counts)
if (!DRY) console.log('Next: rebuild the daily tables for the past, e.g. in the SQL Editor:\n  select public.analytics_rollup(d::date) from generate_series(current_date - 120, current_date, interval \'1 day\') d;')
