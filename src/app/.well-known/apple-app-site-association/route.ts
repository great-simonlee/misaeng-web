import { BRAND_CONFIG } from '@lib/brand'

/**
 * iOS universal links: misaeng.com links shared from the app (housing, roommate, boards, reviews, companies)
 * open the Misaeng app when it is installed, and the web page otherwise.
 * Paths match `/<city>/<board>/<id>` and `/<locale>/<city>/<board>/<id>`; the app maps them in AppRouter.appURL(forWebLink:).
 */
const BOARDS = ['housing', 'roommate', 'sublet', 'food', 'anonymous', 'status', 'job-review', 'companies']

const body = {
  applinks: {
    details: [
      {
        appIDs: ['K75A78VM5H.com.misaeng.nyc'],
        components: BOARDS.flatMap((board) => [{ '/': `/*/${board}/*` }, { '/': `/*/*/${board}/*` }]),
      },
    ],
  },
}

export const dynamic = 'force-static'

export function GET() {
  // Misaeng app only: ellieo.com has no app yet and must never open the Misaeng app
  if (BRAND_CONFIG.id !== 'misaeng') return new Response('Not found', { status: 404 })
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
