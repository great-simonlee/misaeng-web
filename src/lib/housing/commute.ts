/**
 * Ellieo "commute to my school": typical door-to-door subway time from a listing's neighborhood to a NYC campus.
 *
 * ESTIMATES, not live routing: the public listings API has no coordinates, so this is a hand-made table per
 * neighborhood (ERP `property.area`) and campus, rounded to 5 minutes, incl. the walk to the station.
 * The UI always says "about" and "estimate". Add a row when the housing team adds a new neighborhood;
 * a listing whose area isn't in the table simply shows no commute.
 */

export type CommuteSchool = {
  id: string
  short: string
  /** Main campus / station the time is measured to */
  campus: string
}

/** NYC campuses students commute to (upstate and Long Island schools are left out on purpose) */
export const COMMUTE_SCHOOLS: readonly CommuteSchool[] = [
  { id: 'nyu', short: 'NYU', campus: 'Washington Square' },
  { id: 'columbia', short: 'Columbia', campus: 'Morningside Heights' },
  { id: 'baruch', short: 'Baruch', campus: 'Lexington Ave & 24th St' },
  { id: 'pace', short: 'Pace', campus: 'One Pace Plaza' },
  { id: 'fit', short: 'FIT', campus: '7th Ave & 27th St' },
  { id: 'parsons', short: 'Parsons', campus: '5th Ave & 13th St' },
  { id: 'sva', short: 'SVA', campus: '23rd St & 3rd Ave' },
  { id: 'fordham', short: 'Fordham', campus: 'Lincoln Center' },
] as const

/** Neighborhood key → minutes per school id. Keys match the start of `property.area` */
const COMMUTE_MINUTES: Record<string, Record<string, number>> = {
  // Court Sq / Court House Sq (E, M, G, 7)
  LIC: { nyu: 20, columbia: 40, baruch: 20, pace: 30, fit: 20, parsons: 25, sva: 20, fordham: 25 },
  // Roosevelt Island (F) + ~12 min walk to the station
  'Roosevelt Island': { nyu: 30, columbia: 45, baruch: 35, pace: 40, fit: 30, parsons: 30, sva: 35, fordham: 35 },
}

export function estimateCommuteMinutes(area: string | null | undefined, schoolId: string | null): number | null {
  if (!area || !schoolId) return null
  const key = Object.keys(COMMUTE_MINUTES).find((prefix) => area.trim().startsWith(prefix))
  return key ? (COMMUTE_MINUTES[key][schoolId] ?? null) : null
}

export function commuteSchool(schoolId: string | null): CommuteSchool | null {
  return COMMUTE_SCHOOLS.find((school) => school.id === schoolId) ?? null
}
