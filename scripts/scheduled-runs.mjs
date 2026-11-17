#!/usr/bin/env node
/**
 * Scheduled ERP runs (owner, 2026-11-17), driven from the misaeng.com server's crontab:
 *   postings   Mon–Fri — starts 10:00 New York time, app push at 11:00
 *   visa-news  Mon–Fri — starts 12:30 New York time; app push at 13:00 on Mon / Fri only (other days publish without a
 *              push, and the next push includes what they published)
 * The work itself is in ellieo-erp (lib/scheduledRuns.js): this script starts today's run and calls its next step
 * until it is done, waiting what the ERP asks between steps (5 s between careers-site / Google requests, 30 s while a
 * Claude batch is running). Nothing new → the ERP sends no push.
 *
 * Crontab (server clock is UTC; the script itself checks New York time, so DST needs no edit). The minute field
 * below is written `*\/15` so it does not end this comment; in the crontab drop the backslash:
 *   *\/15 13-19 * * 1-5 cd ~/misaeng-web-v2 && flock -n /tmp/misaeng-postings.lock node scripts/scheduled-runs.mjs postings >> ~/scheduled-runs.log 2>&1
 *   *\/15 16-21 * * 1-5 cd ~/misaeng-web-v2 && flock -n /tmp/misaeng-visa-news.lock node scripts/scheduled-runs.mjs visa-news >> ~/scheduled-runs.log 2>&1
 * A call outside the job's window does nothing; a call while today's run is open picks it up again (e.g. after a
 * reboot); a call after today's run ended does nothing.
 *
 * Env (read from the environment, else .env.local / .env.production / .env in this folder):
 *   ELLIEO_ERP_BASE_URL (e.g. https://erp.ellieo.com), INTERNAL_POINTS_SECRET (or INTERNAL_PUSH_SECRET) — the same
 *   secret the ERP uses for misaeng-web's internal routes.
 * Options:
 *   --now           ignore the day / time window, push right away (manual run)
 *   --any-day       ignore the day / time window but keep today's push time (a test run on another day; started after
 *                   the push time it pushes right away)
 *   --from=YYYY-MM-DD  do nothing before that New York date (crontab: start the schedule on a later day)
 */

import { existsSync, readFileSync } from 'node:fs'

const JOBS = {
  postings: { start: [10, 0], notify: [11, 0], until: [14, 0], pushDays: null },
  'visa-news': { start: [12, 30], notify: [13, 0], until: [16, 0], pushDays: new Set(['Mon', 'Fri']) },
}
const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
const MAX_RUN_MS = 3.5 * 3_600_000
const MAX_FAILURES = 10

const job = process.argv[2]
const now = process.argv.includes('--now')
const anyDay = process.argv.includes('--any-day')
const from = process.argv.find((a) => a.startsWith('--from='))?.slice(7) || ''
if (!JOBS[job]) {
  console.error(`Usage: node scripts/scheduled-runs.mjs <${Object.keys(JOBS).join('|')}> [--now]`)
  process.exit(2)
}

function loadEnv() {
  for (const file of ['.env.local', '.env.production', '.env']) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m || process.env[m[1]] !== undefined) continue
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
}

const log = (...args) => console.log(new Date().toISOString(), `[${job}]`, ...args)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** New York wall clock: { day: 'Mon', minutes: 600, date: '2026-11-18' } */
function newYork(at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  return { day: parts.weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute), date: `${parts.year}-${parts.month}-${parts.day}` }
}

/** Today's hh:mm in New York as an ISO instant (tries both UTC offsets: −4 in summer, −5 in winter). */
function newYorkTime(date, [hour, minute]) {
  for (const offset of [4, 5]) {
    const at = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`)
    at.setUTCHours(at.getUTCHours() + offset)
    const ny = newYork(at)
    if (ny.date === date && ny.minutes === hour * 60 + minute) return at.toISOString()
  }
  throw new Error(`Could not place ${hour}:${minute} New York time on ${date}`)
}

async function call(base, secret, method, body) {
  const res = await fetch(`${base}/api/misaeng-admin/scheduled`, {
    method,
    headers: { 'x-internal-secret': secret, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(320_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

async function main() {
  loadEnv()
  const base = process.env.ELLIEO_ERP_BASE_URL?.trim().replace(/\/+$/, '')
  const secret = (process.env.INTERNAL_POINTS_SECRET || process.env.INTERNAL_PUSH_SECRET || '').trim()
  if (!base || !secret) throw new Error('ELLIEO_ERP_BASE_URL and INTERNAL_POINTS_SECRET are required.')

  const plan = JOBS[job]
  const ny = newYork()
  const toMin = ([h, m]) => h * 60 + m
  if (from && ny.date < from) return
  if (!now && !anyDay && (!DAYS.has(ny.day) || ny.minutes < toMin(plan.start) || ny.minutes >= toMin(plan.until))) return

  const notifyAt = now ? new Date().toISOString() : newYorkTime(ny.date, plan.notify)
  // --now / --any-day test runs always push
  const push = now || anyDay || !plan.pushDays || plan.pushDays.has(ny.day)
  const started = await call(base, secret, 'POST', { action: 'start', job, notifyAt, push })
  if (!started.run) return // today's run already ended
  log(
    started.started
      ? `started ${started.run.id}, ${push ? `push not before ${notifyAt}` : 'no push today'}`
      : `continuing ${started.run.id} (${started.run.phase})`,
  )

  const begin = Date.now()
  let failures = 0
  let phase = started.run.phase
  while (Date.now() - begin < MAX_RUN_MS) {
    let result
    try {
      result = await call(base, secret, 'POST', { action: 'step', job })
      failures = 0
    } catch (error) {
      failures += 1
      log(`step failed (${failures}/${MAX_FAILURES}): ${error.message}`)
      if (failures >= MAX_FAILURES) throw new Error('Too many failed steps; the next cron call continues the run.')
      await sleep(30_000)
      continue
    }
    const run = result.run
    if (run && run.phase !== phase) {
      log(`→ ${run.phase}`)
      phase = run.phase
    }
    if (result.done) {
      log(`done: ${JSON.stringify(run?.counts || {})}${run?.pushed ? ` · push: ${run.pushed}` : ' · no push'}`)
      if (run?.log?.length) log(`problems: ${run.log.join(' | ')}`)
      return
    }
    await sleep(Math.max(1000, Math.min(Number(result.waitMs) || 0, 120_000)))
  }
  log('stopped: the script ran too long; the next cron call continues the run.')
}

main().catch((error) => {
  log(`error: ${error.message}`)
  process.exit(1)
})
