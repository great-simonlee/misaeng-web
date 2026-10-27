import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { getPointsConfig } from '@lib/points/config.server'
import { COFFEE_CHAT_DISCLAIMER, COFFEE_CHAT_DISCLAIMER_VERSION } from '@lib/points/defaults'
import { getPointsEngineState } from '@lib/points/engine.server'
import { POINTS_NAME_KEY } from '@lib/points/notify.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public points config for the web and the app (spec 2.1 / 6.5 / 7): enabled public rules, the display name,
 * paywall settings and the cutover. Works without the points tables (defaults, tablesReady=false).
 */
export async function GET(request: Request) {
  const t = await getRequestT(request)
  const [config, engine] = await Promise.all([getPointsConfig(), getPointsEngineState()])
  const rules = Object.values(config.rules)
    .filter((rule) => rule.enabled && rule.public)
    .map((rule) => ({ key: rule.key, value: rule.value }))
  return NextResponse.json(
    {
      engine: engine.engine,
      tablesReady: config.tablesReady,
      cutoverAt: config.settings['points.cutover_at'],
      displayNameKey: POINTS_NAME_KEY,
      displayName: t(POINTS_NAME_KEY),
      sharedNotice: t('points.sharedNotice'),
      rules,
      values: Object.fromEntries(rules.map((rule) => [rule.key, rule.value])),
      paywall: {
        enabled: config.settings['paywall.enabled'],
        startDate: config.settings['paywall.start_date'],
        noticeDays: config.settings['paywall.notice_days'],
      },
      coffeeChat: { disclaimer: COFFEE_CHAT_DISCLAIMER, disclaimerVersion: COFFEE_CHAT_DISCLAIMER_VERSION },
      loadedAt: new Date(config.loadedAt).toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  )
}
