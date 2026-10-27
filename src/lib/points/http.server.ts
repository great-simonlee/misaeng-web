import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import type { Translate } from '@lib/i18n/translate'

import { PointsError } from './errors'
import { PointsStoreError } from './rest.server'

/** Shared response helpers for /api/points/*, /api/community/[id]/unlock|boost and /api/internal/points/*. */

export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
} as const

export function pointsJson(body: unknown, status = 200, headers: Record<string, string> = PRIVATE_HEADERS) {
  return NextResponse.json(body, { status, headers })
}

/**
 * Error → user-facing response. `t` is the `api` namespace translator.
 * Missing tables → 503 POINTS_NOT_CONFIGURED (never crashes; the legacy system is untouched).
 */
export function pointsErrorResponse(t: Translate, error: unknown, fallbackKey = 'points.requestFailed') {
  if (error instanceof PointsError) {
    return pointsJson({ error: t(error.key, error.params), code: error.code }, error.status)
  }
  if (error instanceof PointsStoreError && error.setupRequired) {
    return pointsJson({ error: t('points.notConfigured'), code: 'POINTS_NOT_CONFIGURED' }, 503)
  }
  console.error('Points API error:', error)
  return pointsJson({ error: t(fallbackKey), code: 'POINTS_ERROR' }, 500)
}

/**
 * Server-to-server auth for ellieo-erp: header `x-internal-secret: $INTERNAL_POINTS_SECRET`
 * (falls back to INTERNAL_PUSH_SECRET, the secret /api/internal/push already uses).
 */
export function isInternalAuthorized(request: Request) {
  const secret = (process.env.INTERNAL_POINTS_SECRET || process.env.INTERNAL_PUSH_SECRET || '').trim()
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  if (!secret || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

/** Admin id recorded as reviewed_by / created_by (header `x-admin-id`, or body.actor). */
export function internalActor(request: Request, body?: Record<string, unknown> | null): string {
  const fromHeader = request.headers.get('x-admin-id')?.trim()
  const fromBody = typeof body?.actor === 'string' ? body.actor.trim() : ''
  return (fromHeader || fromBody || 'erp').slice(0, 200)
}

/** Internal errors are for the ERP (English, with codes). */
export function internalErrorResponse(error: unknown) {
  if (error instanceof PointsError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  if (error instanceof PointsStoreError && error.setupRequired) {
    return NextResponse.json({ error: 'Points tables are not set up (run supabase/points.sql).', code: 'POINTS_NOT_CONFIGURED' }, { status: 503 })
  }
  console.error('Internal points API error:', error)
  return NextResponse.json({ error: (error as Error)?.message || 'Internal error', code: 'POINTS_ERROR' }, { status: 500 })
}

export const UNAUTHORIZED_INTERNAL = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
