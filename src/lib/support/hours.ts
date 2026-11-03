/**
 * Response-time clock (spec §6.2): only minutes inside the housing hours (New York time) count.
 * A message outside the hours starts counting when the next hours begin.
 */

export type SupportHours = { start: number; end: number; days: number[] }

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  hourCycle: 'h23',
  weekday: 'short',
})
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function nyHourAndDay(date: Date) {
  let hour = 0
  let day = 0
  for (const part of formatter.formatToParts(date)) {
    if (part.type === 'hour') hour = Number(part.value) % 24
    if (part.type === 'weekday') day = WEEKDAYS[part.value] ?? 0
  }
  return { hour, day }
}

export function isWithinHours(date: Date, hours: SupportHours) {
  const { hour, day } = nyHourAndDay(date)
  return hours.days.includes(day) && hour >= hours.start && hour < hours.end
}

/** Time when `minutes` business minutes have passed since `from`. */
export function addBusinessMinutes(from: Date, minutes: number, hours: SupportHours): Date {
  const step = 60_000
  let t = Math.floor(from.getTime() / step) * step
  let left = Math.max(0, Math.round(minutes))
  // An hour boundary check per minute is cheap; cap the walk at two weeks.
  const limit = t + 14 * 24 * 60 * step
  while (left > 0 && t < limit) {
    if (isWithinHours(new Date(t), hours)) left -= 1
    t += step
  }
  return new Date(t)
}
