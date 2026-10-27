import {
  isCommunityEngagementStorageConfigured,
  listStoredReports,
  saveStoredReports,
} from '@lib/supabase/communityEngagement.server'
import { TtlCache } from '@lib/supabase/listCache.server'
import type {
  CommunityEngagementTargetType,
  CommunityReport,
  CommunityReportReason,
  CommunityReportStatus,
} from '@/types/nyc'

import { reportKey } from './moderation'

/*
 * Community reports (supabase/community_reports.sql, table community_reports) through PostgREST with the service role key.
 * Until the SQL runs (table missing), everything falls back to the old Storage JSON (community-reports/index.json), so
 * reporting never breaks. Counting reporters and "what did this viewer report" read both, so reports made before the
 * migration still count.
 */

const TABLE = 'community_reports'
const SETUP_CODES = new Set(['PGRST205', '42P01', '42501', 'PGRST204'])

type ReportRow = {
  id: string
  target_type: CommunityEngagementTargetType
  target_id: string
  post_id: string
  board: string
  reporter_uid: string
  reporter_email: string | null
  author_uid: string | null
  reason: string
  detail: string | null
  status: CommunityReportStatus
  resolution_note: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolved_by: string | null
}

class ReportsTableMissing extends Error {}
class ReportDuplicate extends Error {}

let warnedMissing = false

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const c = config()
  if (!c) throw new ReportsTableMissing('Supabase is not configured.')
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? (JSON.parse(text) as unknown) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code ?? ''
    if (SETUP_CODES.has(code)) {
      if (!warnedMissing) {
        warnedMissing = true
        console.warn('Community reports: run supabase/community_reports.sql (falling back to Storage JSON).')
      }
      throw new ReportsTableMissing(code)
    }
    if (res.status === 409 || code === '23505') throw new ReportDuplicate(code)
    throw new Error(`Community reports request failed (${res.status} ${code})`)
  }
  return data as T
}

const enc = encodeURIComponent

function rowToReport(row: ReportRow): CommunityReport {
  return {
    id: row.id,
    targetType: row.target_type === 'comment' ? 'comment' : 'post',
    targetId: row.target_id,
    postId: row.post_id,
    boardId: row.board || '',
    reason: row.reason as CommunityReportReason,
    detail: row.detail,
    reporterUid: row.reporter_uid,
    reporterEmail: row.reporter_email || '',
    status: row.status,
    createdAt: Date.parse(row.created_at) || Date.now(),
    updatedAt: Date.parse(row.updated_at) || Date.now(),
    reviewedAt: row.resolved_at ? Date.parse(row.resolved_at) || null : null,
    reviewedBy: row.resolved_by,
    resolutionNote: row.resolution_note,
  }
}

/** The old JSON list, cached briefly (it is read on list requests for "what did I report"). */
const jsonReportsCache = new TtlCache<CommunityReport[]>(60_000, 1)
function listJsonReports(): Promise<CommunityReport[]> {
  if (!isCommunityEngagementStorageConfigured()) return Promise.resolve([])
  return jsonReportsCache.get('all', () => listStoredReports()).catch(() => [])
}

export type CreateReportInput = {
  targetType: CommunityEngagementTargetType
  targetId: string
  postId: string
  boardId: string
  reason: CommunityReportReason
  detail: string | null
  reporterUid: string
  reporterEmail: string
  authorUid: string | null
}

export type CreateReportResult =
  | { ok: true; report: CommunityReport; storage: 'table' | 'json' }
  | { ok: false; duplicate: true }

/** Saves one report. Duplicate (same reporter, same target) → { ok: false, duplicate: true }. */
export async function createCommunityReport(input: CreateReportInput): Promise<CreateReportResult> {
  // A report already in the old JSON (made before the migration) is a duplicate too.
  const json = await listJsonReports()
  const inJson = json.some(
    (item) =>
      item.targetType === input.targetType &&
      item.targetId === input.targetId &&
      item.reporterUid === input.reporterUid &&
      item.status !== 'dismissed',
  )
  if (inJson) return { ok: false, duplicate: true }

  try {
    const rows = await rest<ReportRow[]>(TABLE, {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        target_type: input.targetType,
        target_id: input.targetId,
        post_id: input.postId,
        board: input.boardId,
        reporter_uid: input.reporterUid,
        reporter_email: input.reporterEmail || null,
        author_uid: input.authorUid || null,
        reason: input.reason,
        detail: input.detail,
        status: 'open',
      }),
    })
    viewerReportsCache.delete(input.reporterUid)
    const row = Array.isArray(rows) ? rows[0] : null
    if (!row) throw new Error('Report insert returned no row')
    return { ok: true, report: rowToReport(row), storage: 'table' }
  } catch (error) {
    if (error instanceof ReportDuplicate) return { ok: false, duplicate: true }
    if (!(error instanceof ReportsTableMissing)) throw error
  }

  // Fallback: the old JSON file (before supabase/community_reports.sql runs)
  const existing = await listStoredReports()
  const duplicated = existing.some(
    (item) =>
      item.targetType === input.targetType &&
      item.targetId === input.targetId &&
      item.reporterUid === input.reporterUid &&
      item.status !== 'dismissed',
  )
  if (duplicated) return { ok: false, duplicate: true }
  const now = Date.now()
  const report: CommunityReport = {
    id: `rpt_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    targetType: input.targetType,
    targetId: input.targetId,
    postId: input.postId,
    boardId: input.boardId,
    reason: input.reason,
    detail: input.detail,
    reporterUid: input.reporterUid,
    reporterEmail: input.reporterEmail,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    resolutionNote: null,
  }
  await saveStoredReports([report, ...existing])
  jsonReportsCache.delete('all')
  viewerReportsCache.delete(input.reporterUid)
  return { ok: true, report, storage: 'json' }
}

/**
 * Distinct reporters of one post/comment (dismissed reports do not count). Table + old JSON.
 * `since` (ms, the target's moderation.restoredAt): only reports made after the team restored it count, so a restore
 * is not undone by the next single report.
 */
export async function countDistinctReporters(
  targetType: CommunityEngagementTargetType,
  targetId: string,
  since?: number | null,
): Promise<number> {
  const cutoff = typeof since === 'number' && since > 0 ? since : 0
  const reporters = new Set<string>()
  try {
    const sinceFilter = cutoff ? `&created_at=gt.${enc(new Date(cutoff).toISOString())}` : ''
    const rows = await rest<{ reporter_uid: string }[]>(
      `${TABLE}?target_type=eq.${enc(targetType)}&target_id=eq.${enc(targetId)}&status=neq.dismissed${sinceFilter}&select=reporter_uid&limit=1000`,
    )
    for (const row of rows ?? []) reporters.add(row.reporter_uid)
  } catch (error) {
    if (!(error instanceof ReportsTableMissing)) console.error('Report count error:', error)
  }
  for (const item of await listJsonReports()) {
    if (
      item.targetType === targetType &&
      item.targetId === targetId &&
      item.status !== 'dismissed' &&
      item.createdAt > cutoff
    ) {
      reporters.add(item.reporterUid)
    }
  }
  return reporters.size
}

const viewerReportsCache = new TtlCache<Set<string>>(30_000, 2000)

/**
 * `post:<id>` / `comment:<id>` the viewer reported. Their lists, detail and comments leave these out right away
 * (like blocks). Empty for signed-out viewers. Never throws.
 */
export async function getViewerReportedKeys(viewerUid: string | null | undefined): Promise<Set<string>> {
  const uid = String(viewerUid || '').trim()
  if (!uid) return new Set()
  return viewerReportsCache
    .get(uid, async () => {
      const keys = new Set<string>()
      try {
        const rows = await rest<{ target_type: CommunityEngagementTargetType; target_id: string }[]>(
          `${TABLE}?reporter_uid=eq.${enc(uid)}&select=target_type,target_id&limit=2000`,
        )
        for (const row of rows ?? []) keys.add(reportKey(row.target_type, row.target_id))
      } catch (error) {
        if (!(error instanceof ReportsTableMissing)) console.error('Viewer reports load error:', error)
      }
      for (const item of await listJsonReports()) {
        if (item.reporterUid === uid) keys.add(reportKey(item.targetType, item.targetId))
      }
      return keys
    })
    .catch(() => new Set<string>())
}

/** Account deletion: the reports a user made stay (moderation history) but lose the reporter's email. */
export async function forgetReporterEmail(uid: string): Promise<void> {
  if (!uid) return
  try {
    await rest(`${TABLE}?reporter_uid=eq.${enc(uid)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ reporter_email: null }),
    })
  } catch (error) {
    if (!(error instanceof ReportsTableMissing)) throw error
  }
  viewerReportsCache.delete(uid)
}
