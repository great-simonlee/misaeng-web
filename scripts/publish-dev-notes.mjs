#!/usr/bin/env node
/**
 * Dev log → "미생 멤버들과의 대화" drafts. Sends the notes in a JSON file to POST /api/internal/dev-notes; they arrive
 * UNPUBLISHED and the admin turns them on in the Misaeng ERP app (Developer Notes).
 *
 *   node scripts/publish-dev-notes.mjs notes.json [--base https://misaeng.com] [--env ~/Simon/misaeng-secrets.env]
 *
 * notes.json: [{ "section": "feedback", "status": "done", "title": "…", "titleEn": "…", "detail": "…", "detailEn": "…" }]
 * The secret is read from the env file (INTERNAL_POINTS_SECRET, else INTERNAL_PUSH_SECRET) and never printed.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!file) {
  console.error('Usage: node scripts/publish-dev-notes.mjs notes.json [--base URL] [--env FILE]')
  process.exit(1)
}
const base = option('--base', 'https://misaeng.com').replace(/\/+$/, '')
const envPath = option('--env', `${homedir()}/Simon/misaeng-secrets.env`).replace(/^~/, homedir())

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => {
      const [key, ...rest] = line.split('=')
      return [key, rest.join('=').trim().replace(/^["']|["']$/g, '')]
    }),
)
const secret = env.INTERNAL_POINTS_SECRET || env.INTERNAL_PUSH_SECRET
if (!secret) {
  console.error(`No INTERNAL_POINTS_SECRET / INTERNAL_PUSH_SECRET in ${envPath}`)
  process.exit(1)
}

const notes = JSON.parse(readFileSync(file, 'utf8'))
const res = await fetch(`${base}/api/internal/dev-notes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
  body: JSON.stringify({ notes }),
})
console.log(res.status, await res.text())
process.exit(res.ok ? 0 : 1)
