#!/usr/bin/env node
/*
 * Builds public.legacy_users (supabase/misaeng_auth.sql): every Ellieo-era member's uid + profile email, so that
 * a verified sign-in on Misaeng's own login (Supabase Auth) gets the same uid back — posts, points and profile stay.
 *
 * Sources: avatars/<uid>/profile.json (email, nickname, status), community posts' authors (housing or avatars
 * bucket, community/*.json), and point_ledger user ids. Nothing is changed unless --apply is passed.
 *
 *   node scripts/backfill-legacy-users.mjs            # dry run: report only
 *   node scripts/backfill-legacy-users.mjs --apply    # upsert into legacy_users
 *
 * Env (from .env.local or the shell): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SUPABASE_AVATAR_BUCKET (default avatars), SUPABASE_HOUSING_BUCKET (default housing).
 */
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const AVATARS = process.env.SUPABASE_AVATAR_BUCKET?.trim() || 'avatars'
const HOUSING = process.env.SUPABASE_HOUSING_BUCKET?.trim() || 'housing'
const APPLY = process.argv.includes('--apply')
if (!URL_BASE || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function list(bucket, prefix) {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) {
      if (res.status === 400 || res.status === 404) return out // bucket missing
      throw new Error(`list ${bucket}/${prefix} → ${res.status}`)
    }
    const page = await res.json()
    out.push(...page)
    if (page.length < 1000) return out
  }
}

async function readJson(bucket, path) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers })
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function pool(items, size, fn) {
  let index = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (index < items.length) await fn(items[index++])
    }),
  )
}

const isPlaceholder = (email) => !email || /@ellieo\.user$/i.test(email) || !email.includes('@')
/** uid → { email, nickname, source, deleted } */
const members = new Map()
function add(uid, data) {
  if (!uid || typeof uid !== 'string') return
  const current = members.get(uid) ?? { email: null, nickname: null, source: data.source, deleted: false }
  if (!current.email && data.email && !isPlaceholder(data.email)) current.email = data.email.trim().toLowerCase()
  if (!current.nickname && data.nickname) current.nickname = data.nickname
  if (data.deleted) current.deleted = true
  if (data.source === 'profile') current.source = 'profile'
  members.set(uid, current)
}

// 1. profiles: top-level folders of the avatars bucket are uids
const folders = (await list(AVATARS, '')).filter((item) => item.id === null).map((item) => item.name)
const NON_UID = new Set(['community-credits', 'community-referrals', 'community-nicknames', 'community-reports', 'community-images',
  'community-credit-reviews', 'community-workplace-verifications', 'community-instagram-verifications', 'community',
  'community-comments', 'community-engagement'])
const uidFolders = folders.filter((name) => !NON_UID.has(name) && !name.startsWith('community'))
await pool(uidFolders, 12, async (uid) => {
  const profile = await readJson(AVATARS, `${uid}/profile.json`)
  add(uid, {
    source: 'profile',
    email: profile?.email ?? (uid.includes('@') ? uid : null),
    nickname: profile?.nickname ?? null,
    deleted: profile?.status === 'deleted',
  })
})
console.log(`profiles: ${uidFolders.length} folders`)

// 2. community post authors (posts live in the housing bucket, or avatars as a fallback)
let postCount = 0
for (const bucket of [HOUSING, AVATARS]) {
  const files = (await list(bucket, 'community/')).filter((item) => item.name.endsWith('.json'))
  postCount += files.length
  await pool(files, 12, async (file) => {
    const post = await readJson(bucket, `community/${file.name}`)
    if (post?.authorUid) add(String(post.authorUid), { source: 'post', email: post.authorEmail ?? null, nickname: post.authorNickname ?? null })
    if (post?.guestAuthor?.linkedUid) add(String(post.guestAuthor.linkedUid), { source: 'post', email: post.guestAuthor.email ?? null })
  })
}
console.log(`posts: ${postCount} files`)

// 3. points ledger user ids
try {
  const res = await fetch(`${URL_BASE}/rest/v1/point_ledger?select=user_id&limit=100000`, { headers })
  if (res.ok) for (const row of await res.json()) add(String(row.user_id), { source: 'points' })
} catch {
  // points tables not set up
}

// report
const rows = [...members.entries()].map(([uid, m]) => ({ uid, email: m.email, nickname: m.nickname, source: m.source, deleted: m.deleted }))
const byEmail = new Map()
for (const row of rows) if (row.email) byEmail.set(row.email, [...(byEmail.get(row.email) ?? []), row.uid])
const duplicates = [...byEmail.entries()].filter(([, uids]) => uids.length > 1)
const noEmail = rows.filter((row) => !row.email)
const uidIsEmail = rows.filter((row) => row.uid.includes('@'))
console.log(`
members found        ${rows.length}
  with an email      ${rows.length - noEmail.length}
  without an email   ${noEmail.length}   (can only come back through an Ellieo password / session during the switch-over)
  uid is an email    ${uidIsEmail.length}
  deleted accounts   ${rows.filter((row) => row.deleted).length}
emails on 2+ uids    ${duplicates.length}`)
for (const [email, uids] of duplicates.slice(0, 20)) console.log(`  ${email.replace(/^(.).*(@.*)$/, '$1***$2')}: ${uids.join(', ')}`)

if (!APPLY) {
  console.log('\nDry run — nothing written. Run with --apply to fill legacy_users.')
  process.exit(0)
}

let written = 0
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500).map(({ uid, email, nickname, source }) => ({ uid, email, nickname, source }))
  const res = await fetch(`${URL_BASE}/rest/v1/legacy_users?on_conflict=uid`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(batch),
  })
  if (!res.ok) {
    console.error(`legacy_users upsert failed (${res.status}): ${await res.text()}`)
    console.error('Did you run supabase/misaeng_auth.sql?')
    process.exit(1)
  }
  written += batch.length
}
console.log(`\nlegacy_users: ${written} rows upserted.`)
