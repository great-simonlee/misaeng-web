import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { eq, supportRest } from '@lib/support/rest.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Draft = {
  section?: string
  status?: string
  title?: string
  titleEn?: string
  detail?: string
  detailEn?: string
}

const SECTIONS = ['feedback', 'roadmap'] as const
const STATUSES = ['received', 'planned', 'in_progress', 'done'] as const
const text = (value: unknown, max: number) => {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  return s || null
}

/**
 * Dev log → "미생 멤버들과의 대화" drafts (x-internal-secret). Each note is saved UNPUBLISHED: the admin reviews it in the
 * Misaeng ERP app (Developer Notes) and turns it on. A note whose Korean title already exists is updated instead of
 * duplicated, and keeps its published state.
 * POST { notes: [{ section, status, title, titleEn?, detail?, detailEn? }] } → { created, updated }
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = (await request.json().catch(() => null)) as { notes?: Draft[] } | null
  const notes = Array.isArray(body?.notes) ? body.notes.slice(0, 30) : []
  if (notes.length === 0) return NextResponse.json({ error: 'No notes' }, { status: 400 })
  let created = 0
  let updated = 0
  try {
    for (const [index, note] of notes.entries()) {
      const title = text(note.title, 120)
      if (!title) continue
      const fields = {
        section: (SECTIONS as readonly string[]).includes(String(note.section)) ? note.section : 'feedback',
        status: (STATUSES as readonly string[]).includes(String(note.status)) ? note.status : 'done',
        title,
        title_en: text(note.titleEn, 120),
        detail: text(note.detail, 500),
        detail_en: text(note.detailEn, 500),
        updated_at: new Date().toISOString(),
        updated_by: 'dev-log',
      }
      const existing = await supportRest<{ id: string }[]>(`dev_notes?title=${eq(title)}&select=id&limit=1`)
      if (existing?.[0]) {
        await supportRest(`dev_notes?id=${eq(existing[0].id)}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify(fields) })
        updated += 1
      } else {
        await supportRest('dev_notes', {
          method: 'POST',
          prefer: 'return=minimal',
          body: JSON.stringify({ ...fields, published: false, sort: index + 1 }),
        })
        created += 1
      }
    }
    return NextResponse.json({ created, updated })
  } catch (error) {
    console.error('Dev notes (internal) error:', error)
    return NextResponse.json({ error: (error as Error)?.message || 'Internal error', created, updated }, { status: 500 })
  }
}
