#!/usr/bin/env node
/**
 * One source for the agent listing composer's fixed lists (owner 2026-11-27):
 *   - NYC (+ the NJ towns next to it) ZIP → area (borough / "New Jersey") + the neighborhoods in that ZIP
 *   - building amenities / included utilities / appliances, in the raw ERP wording staff listings use (the apps and the
 *     web translate them through housing.{amenities,utilities,appliances}.<featureKey>)
 * Writes:
 *   src/lib/agents/listingOptions.json                                  (server validation + toHousingListing)
 *   ../misaeng-app-messaging/ios/Misaeng/Features/Agents/AgentListingOptions.swift   (iOS composer mirror)
 * Run after editing the tables below: `node scripts/agent-listing-options.mjs`
 * Neighborhood names follow the Housing area filter (src/lib/constants/housingMock.ts HOUSING_NEIGHBORHOODS):
 * "Long Island City", "Financial District", "Upper West Side" … so an agent listing in a ZIP lands on the same chip.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** area → { zip: neighborhoods (first = default) } */
const ZIPS = {
  Manhattan: {
    10001: ['Chelsea', 'Hudson Yards', 'Midtown'],
    10002: ['Lower East Side', 'Chinatown', 'Two Bridges'],
    10003: ['East Village', 'Gramercy', 'Union Square', 'Greenwich Village'],
    10004: ['Financial District', 'Battery Park City'],
    10005: ['Financial District'],
    10006: ['Financial District'],
    10007: ['Tribeca', 'Financial District'],
    10009: ['East Village', 'Alphabet City'],
    10010: ['Flatiron', 'Gramercy', 'Kips Bay'],
    10011: ['Chelsea', 'West Village', 'Flatiron'],
    10012: ['SoHo', 'Greenwich Village', 'NoHo', 'Nolita'],
    10013: ['Tribeca', 'SoHo', 'Chinatown', 'Little Italy'],
    10014: ['West Village', 'Meatpacking District'],
    10016: ['Murray Hill', 'Kips Bay', 'NoMad'],
    10017: ['Midtown', 'Murray Hill', 'Turtle Bay'],
    10018: ['Midtown', 'Hudson Yards'],
    10019: ["Hell's Kitchen", 'Midtown'],
    10020: ['Midtown'],
    10021: ['Upper East Side', 'Lenox Hill'],
    10022: ['Midtown', 'Sutton Place'],
    10023: ['Upper West Side', 'Lincoln Square'],
    10024: ['Upper West Side'],
    10025: ['Upper West Side', 'Manhattan Valley', 'Morningside Heights'],
    10026: ['Harlem'],
    10027: ['Harlem', 'Morningside Heights'],
    10028: ['Upper East Side', 'Yorkville'],
    10029: ['East Harlem'],
    10030: ['Harlem'],
    10031: ['Hamilton Heights', 'Harlem'],
    10032: ['Washington Heights', 'Hamilton Heights'],
    10033: ['Washington Heights'],
    10034: ['Inwood'],
    10035: ['East Harlem'],
    10036: ['Midtown', "Hell's Kitchen", 'Times Square'],
    10037: ['Harlem'],
    10038: ['Financial District', 'Seaport', 'Two Bridges'],
    10039: ['Harlem'],
    10040: ['Washington Heights', 'Inwood'],
    10044: ['Roosevelt Island'],
    10065: ['Upper East Side', 'Lenox Hill'],
    10069: ['Upper West Side'],
    10075: ['Upper East Side'],
    10128: ['Upper East Side', 'Carnegie Hill', 'Yorkville'],
    10280: ['Battery Park City'],
    10281: ['Battery Park City'],
    10282: ['Battery Park City', 'Tribeca'],
  },
  Brooklyn: {
    11201: ['Brooklyn Heights', 'Downtown Brooklyn', 'DUMBO', 'Cobble Hill', 'Boerum Hill'],
    11203: ['East Flatbush'],
    11204: ['Bensonhurst', 'Mapleton'],
    11205: ['Fort Greene', 'Clinton Hill'],
    11206: ['Williamsburg', 'Bushwick'],
    11207: ['East New York', 'Bushwick'],
    11208: ['East New York', 'Cypress Hills'],
    11209: ['Bay Ridge'],
    11210: ['Flatbush', 'Midwood'],
    11211: ['Williamsburg'],
    11212: ['Brownsville'],
    11213: ['Crown Heights'],
    11214: ['Bath Beach', 'Bensonhurst'],
    11215: ['Park Slope', 'Windsor Terrace'],
    11216: ['Bedford-Stuyvesant', 'Crown Heights'],
    11217: ['Park Slope', 'Boerum Hill', 'Prospect Heights'],
    11218: ['Kensington', 'Windsor Terrace'],
    11219: ['Borough Park'],
    11220: ['Sunset Park'],
    11221: ['Bushwick', 'Bedford-Stuyvesant'],
    11222: ['Greenpoint'],
    11223: ['Gravesend'],
    11224: ['Coney Island'],
    11225: ['Crown Heights', 'Prospect Lefferts Gardens'],
    11226: ['Flatbush'],
    11228: ['Dyker Heights'],
    11229: ['Sheepshead Bay', 'Homecrest'],
    11230: ['Midwood'],
    11231: ['Carroll Gardens', 'Red Hook', 'Cobble Hill'],
    11232: ['Sunset Park', 'Greenwood Heights'],
    11233: ['Bedford-Stuyvesant', 'Ocean Hill'],
    11234: ['Marine Park', 'Mill Basin', 'Canarsie'],
    11235: ['Brighton Beach', 'Sheepshead Bay', 'Manhattan Beach'],
    11236: ['Canarsie'],
    11237: ['Bushwick'],
    11238: ['Prospect Heights', 'Clinton Hill'],
    11239: ['East New York'],
    11249: ['Williamsburg'],
  },
  Queens: {
    11101: ['Long Island City'],
    11102: ['Astoria'],
    11103: ['Astoria'],
    11104: ['Sunnyside'],
    11105: ['Astoria'],
    11106: ['Astoria', 'Long Island City'],
    11109: ['Long Island City'],
    11354: ['Flushing'],
    11355: ['Flushing'],
    11356: ['College Point'],
    11357: ['Whitestone'],
    11358: ['Flushing', 'Auburndale'],
    11360: ['Bayside'],
    11361: ['Bayside'],
    11362: ['Little Neck', 'Douglaston'],
    11363: ['Little Neck', 'Douglaston'],
    11364: ['Oakland Gardens'],
    11365: ['Fresh Meadows'],
    11366: ['Fresh Meadows'],
    11367: ['Kew Gardens Hills'],
    11368: ['Corona'],
    11369: ['East Elmhurst'],
    11370: ['East Elmhurst', 'Jackson Heights'],
    11372: ['Jackson Heights'],
    11373: ['Elmhurst'],
    11374: ['Rego Park'],
    11375: ['Forest Hills'],
    11377: ['Woodside'],
    11378: ['Maspeth'],
    11379: ['Middle Village'],
    11385: ['Ridgewood', 'Glendale'],
    11411: ['Cambria Heights'],
    11412: ['St. Albans'],
    11413: ['Springfield Gardens'],
    11414: ['Howard Beach'],
    11415: ['Kew Gardens'],
    11416: ['Ozone Park'],
    11417: ['Ozone Park'],
    11418: ['Richmond Hill'],
    11419: ['South Richmond Hill'],
    11420: ['South Ozone Park'],
    11421: ['Woodhaven'],
    11422: ['Rosedale'],
    11423: ['Hollis'],
    11426: ['Bellerose'],
    11427: ['Queens Village'],
    11428: ['Queens Village'],
    11429: ['Queens Village'],
    11432: ['Jamaica', 'Jamaica Estates'],
    11433: ['Jamaica'],
    11434: ['Jamaica', 'Springfield Gardens'],
    11435: ['Jamaica', 'Briarwood'],
    11436: ['South Ozone Park'],
    11691: ['Far Rockaway'],
    11692: ['Arverne'],
    11693: ['Rockaway Beach', 'Broad Channel'],
    11694: ['Rockaway Park', 'Belle Harbor'],
    11697: ['Breezy Point'],
  },
  Bronx: {
    10451: ['Concourse', 'Mott Haven'],
    10452: ['Highbridge', 'Concourse'],
    10453: ['Morris Heights', 'University Heights'],
    10454: ['Mott Haven', 'Port Morris'],
    10455: ['Mott Haven', 'Longwood'],
    10456: ['Morrisania', 'Claremont'],
    10457: ['Tremont', 'Mount Hope'],
    10458: ['Fordham', 'Belmont'],
    10459: ['Longwood', 'Hunts Point'],
    10460: ['West Farms', 'Crotona Park'],
    10461: ['Morris Park', 'Westchester Square'],
    10462: ['Parkchester', 'Van Nest'],
    10463: ['Riverdale', 'Kingsbridge', 'Spuyten Duyvil'],
    10464: ['City Island'],
    10465: ['Throggs Neck'],
    10466: ['Wakefield'],
    10467: ['Norwood', 'Williamsbridge'],
    10468: ['Kingsbridge Heights', 'Fordham'],
    10469: ['Eastchester', 'Baychester'],
    10470: ['Woodlawn'],
    10471: ['Riverdale'],
    10472: ['Soundview'],
    10473: ['Castle Hill', 'Clason Point'],
    10474: ['Hunts Point'],
    10475: ['Co-op City'],
  },
  'Staten Island': {
    10301: ['St. George', 'Tompkinsville'],
    10302: ['Port Richmond'],
    10303: ['Mariners Harbor'],
    10304: ['Stapleton', 'Grasmere'],
    10305: ['Rosebank', 'South Beach'],
    10306: ['New Dorp', 'Midland Beach'],
    10307: ['Tottenville'],
    10308: ['Great Kills'],
    10309: ['Charleston', 'Rossville'],
    10310: ['West Brighton'],
    10312: ['Eltingville', 'Annadale'],
    10314: ['Willowbrook', 'New Springville', 'Bulls Head'],
  },
  // NJ towns next to the city (the Housing area filter groups these at the end: src/lib/housing/areas.ts OUTER_AREAS).
  'New Jersey': {
    '07030': ['Hoboken'],
    '07302': ['Jersey City - Downtown', 'Jersey City - Paulus Hook'],
    '07304': ['Jersey City - Bergen-Lafayette'],
    '07305': ['Jersey City - Greenville'],
    '07306': ['Jersey City - Journal Square'],
    '07307': ['Jersey City - The Heights'],
    '07310': ['Jersey City - Newport'],
    '07311': ['Jersey City - Exchange Place'],
    '07086': ['Weehawken'],
    '07087': ['Union City'],
    '07093': ['West New York'],
    '07047': ['North Bergen'],
    '07020': ['Edgewater'],
    '07024': ['Fort Lee'],
    '07010': ['Cliffside Park'],
    '07650': ['Palisades Park'],
    '07631': ['Englewood'],
    '07632': ['Englewood Cliffs'],
    '07094': ['Secaucus'],
    '07601': ['Hackensack'],
  },
}

/** Raw ERP wording (featureKey → housing.amenities.* in the web messages). */
const AMENITIES = [
  '24-Hour Attended Lobby', 'Concierge Service', 'Elevator', 'Fitness Center', 'Mail Room', 'Laundry Room',
  'Resident Lounge', 'Rooftop Outdoor Space', 'Rooftop Lounge', 'Pet Friendly', 'Garage Parking', 'Bike Room',
  'Storage Space', 'Working Space', 'Business Meeting Room', 'Indoor Pool', 'Outdoor Pool', 'Sauna', 'Sundeck',
  'BBQ Grills', 'Garden', 'Dog Run', "Children's Playroom", 'Media Room', 'Pilates Studio', 'Yoga Studio',
  'Recovery Room', 'Indoor Basketball Court', 'Indoor Pickleball Court', 'Indoor Squash Court', 'Tennis Courts',
  'Indoor Golf Simulator', 'Bowling Alley', 'Billiards Room', 'Poker Room', 'Arcade Room', 'Ping Pong Table',
  'Valet Service', 'Live-in Super', 'Wheelchair Access',
]
const UTILITIES = ['Heat', 'Hot Water', 'Gas', 'Electricity', 'Water', 'Sewer']
const APPLIANCES = ['Dishwasher', 'Microwave', 'Oven', 'Refrigerator', 'Washer', 'Dryer', 'Air Conditioning']
/** The composer's room kinds (labels: housing.roomTypes.*). */
const ROOM_TYPES = ['master-w-bath', 'master-wo-bath', 'regular-bedroom', 'flexroom', 'other']
const PART_WALLS = ['Full wall', 'Regular wall', 'Curtain only']

const zips = {}
for (const [area, list] of Object.entries(ZIPS)) {
  for (const [zip, neighborhoods] of Object.entries(list)) {
    const key = String(zip).padStart(5, '0')
    if (zips[key]) throw new Error(`ZIP ${key} listed twice`)
    zips[key] = { area, neighborhoods }
  }
}
const sorted = Object.fromEntries(Object.entries(zips).sort(([a], [b]) => a.localeCompare(b)))
const options = {
  areas: Object.keys(ZIPS),
  zips: sorted,
  amenities: AMENITIES,
  utilities: UTILITIES,
  appliances: APPLIANCES,
  roomTypes: ROOM_TYPES,
  partWalls: PART_WALLS,
}

const jsonPath = join(root, 'src', 'lib', 'agents', 'listingOptions.json')
writeFileSync(jsonPath, `${JSON.stringify(options, null, 2)}\n`)
console.log(`wrote ${jsonPath} (${Object.keys(sorted).length} ZIPs)`)

const appDir = process.env.MISAENG_APP_DIR ?? join(root, '..', 'misaeng-app-messaging')
const swiftPath = join(appDir, 'ios', 'Misaeng', 'Features', 'Agents', 'AgentListingOptions.swift')
if (existsSync(dirname(swiftPath))) {
  const swift = `// Generated by misaeng-web scripts/agent-listing-options.mjs — do not edit by hand (edit the script, run it again).
import Foundation

/// The agent listing composer's fixed lists: ZIP → area + neighborhoods, building amenities / utilities / appliances
/// (raw ERP wording, translated through housing.{amenities,utilities,appliances}.*), room kinds and part walls.
/// The server validates against the same table (misaeng-web src/lib/agents/listingOptions.json).
enum AgentListingOptions {
    struct Zip: Decodable, Hashable { let area: String; let neighborhoods: [String] }
    struct Table: Decodable {
        let areas: [String]
        let zips: [String: Zip]
        let amenities: [String]
        let utilities: [String]
        let appliances: [String]
        let roomTypes: [String]
        let partWalls: [String]
    }

    static let table: Table = {
        // Decoded once from the embedded JSON (a literal dictionary this size slows the Swift compiler down).
        (try? JSONDecoder().decode(Table.self, from: Data(json.utf8)))
            ?? Table(areas: [], zips: [:], amenities: [], utilities: [], appliances: [], roomTypes: [], partWalls: [])
    }()

    /// ZIPs of one area, in order.
    static func zips(in area: String) -> [String] {
        table.zips.filter { $0.value.area == area }.keys.sorted()
    }

    private static let json = #"""
${JSON.stringify(options)}
"""#
}
`
  writeFileSync(swiftPath, swift)
  console.log(`wrote ${swiftPath}`)
}
