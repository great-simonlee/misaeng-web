#!/usr/bin/env node
/**
 * READ-ONLY: how many members have a nickname that breaks the English-only rule (2026-11-25) and will see the
 * "Choose a new nickname" modal. Members are shared by Misaeng and Ellieo (profiles in Storage `{uid}/profile.json`).
 *
 *   node scripts/nickname-audit.mjs                 # uses .env.local (local dev = staging)
 *   node scripts/nickname-audit.mjs --env prod.env  # any env file with the prod values
 *   node scripts/nickname-audit.mjs --list          # also print uid + nickname of each affected member
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_AVATAR_BUCKET (default avatars).
 * Nothing is written.
 */
import { existsSync, readFileSync } from 'node:fs'

const envIndex = process.argv.indexOf('--env')
const envFile = envIndex > -1 ? process.argv[envIndex + 1] : '.env.local'
if (envFile && existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const AVATARS = process.env.SUPABASE_AVATAR_BUCKET?.trim() || 'avatars'
const LIST = process.argv.includes('--list')
if (!URL_BASE || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Same rule as src/lib/constants/profile.ts getNicknameValidationIssue
function issueOf(value) {
  const nickname = value.trim()
  if (nickname.length < 3) return 'tooShort'
  if (nickname.length > 20) return 'tooLong'
  if (!/^[A-Za-z.]+$/.test(nickname)) return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(nickname) ? 'hangul' : 'invalidChars'
  if (nickname.startsWith('.') || nickname.endsWith('.')) return 'dotEdge'
  if (nickname.includes('..')) return 'doubleDot'
  return null
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function listFolders() {
  const folders = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${AVATARS}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: 1000, offset }),
    })
    if (!res.ok) throw new Error(`list failed: HTTP ${res.status}`)
    const items = await res.json()
    for (const item of items) if (item.id == null && item.name && item.name !== 'community-nicknames') folders.push(item.name)
    if (items.length < 1000) break
  }
  return folders
}

async function readNickname(uid) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${AVATARS}/${uid}/profile.json`, { headers })
  if (!res.ok) return undefined
  const data = await res.json().catch(() => null)
  return typeof data?.nickname === 'string' ? data.nickname : null
}

const uids = await listFolders()
const counts = { profiles: 0, withNickname: 0, ok: 0 }
const byIssue = {}
const affected = []
for (let i = 0; i < uids.length; i += 10) {
  await Promise.all(
    uids.slice(i, i + 10).map(async (uid) => {
      const nickname = await readNickname(uid)
      if (nickname === undefined) return
      counts.profiles += 1
      if (!nickname?.trim()) return
      counts.withNickname += 1
      const issue = issueOf(nickname)
      if (!issue) return void (counts.ok += 1)
      byIssue[issue] = (byIssue[issue] || 0) + 1
      affected.push({ uid, nickname, issue })
    }),
  )
}

console.log(`Supabase: ${new URL(URL_BASE).host}`)
console.log(`Profiles: ${counts.profiles}  with a nickname: ${counts.withNickname}  already valid: ${counts.ok}`)
console.log(`Will see the reset modal: ${affected.length}`, byIssue)
if (LIST) for (const row of affected) console.log(`${row.uid}\t${row.issue}\t${row.nickname}`)
