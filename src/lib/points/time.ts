/** Points days, months and review cycles are America/New_York (spec 2.5). */

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD in New York */
export function nyDate(ts: number | Date = Date.now()): string {
  return NY_DATE.format(typeof ts === 'number' ? new Date(ts) : ts)
}

/** YYYY-MM in New York */
export function nyMonth(ts: number | Date = Date.now()): string {
  return nyDate(ts).slice(0, 7)
}

/** The day before a YYYY-MM-DD date (calendar math, no time zone involved). */
export function previousDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() - 1)
  return utc.toISOString().slice(0, 10)
}

/**
 * UTC instant of New York midnight for a YYYY-MM-DD date (handles EST/EDT).
 * Used to query "today" / "this month" windows from Node.
 */
export function nyMidnightUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  // New York is UTC-4 or UTC-5: try both and keep the one that formats back to the same NY date at 00:xx
  for (const offset of [4, 5]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, offset, 0, 0))
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false,
    }).format(candidate)
    if (nyDate(candidate) === date && Number(parts) % 24 === 0) return candidate
  }
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0))
}

export function nyDayStart(ts: number = Date.now()): Date {
  return nyMidnightUtc(nyDate(ts))
}

export function nyMonthStart(ts: number = Date.now()): Date {
  return nyMidnightUtc(`${nyMonth(ts)}-01`)
}

export type Season = 'winter' | 'spring' | 'summer' | 'fall'

/** Application season by month: Dec–Feb winter (Dec counts toward the next year), Mar–May spring, Jun–Aug summer, Sep–Nov fall. */
export function cycleOf(date: string | number | null | undefined): string | null {
  let y: number
  let m: number
  if (typeof date === 'number') {
    const ny = nyDate(date)
    y = Number(ny.slice(0, 4))
    m = Number(ny.slice(5, 7))
  } else {
    const match = /^(\d{4})-(\d{1,2})/.exec(String(date || '').trim())
    if (!match) return null
    y = Number(match[1])
    m = Number(match[2])
  }
  if (!y || !m || m < 1 || m > 12) return null
  let season: Season
  if (m === 12) {
    season = 'winter'
    y += 1
  } else if (m <= 2) season = 'winter'
  else if (m <= 5) season = 'spring'
  else if (m <= 8) season = 'summer'
  else season = 'fall'
  return `${y}-${season}`
}
