import { NextResponse } from 'next/server'

import { supportRest } from '@lib/support/rest.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DevNoteRow = {
  id: string
  section: 'feedback' | 'roadmap'
  status: 'received' | 'planned' | 'in_progress' | 'done'
  title: string
  title_en: string | null
  detail: string | null
  detail_en: string | null
  updated_at: string
}

/**
 * 개발자 노트 (published rows only, written by admins in the Misaeng ERP staff app). No login needed.
 * Both languages go out; the client picks (title_en / detail_en fall back to Korean).
 */
export async function GET() {
  try {
    const rows = await supportRest<DevNoteRow[]>(
      'dev_notes?published=is.true&select=id,section,status,title,title_en,detail,detail_en,updated_at&order=section.asc,sort.asc,updated_at.desc&limit=100',
    )
    const notes = (rows ?? []).map((r) => ({
      id: r.id,
      section: r.section,
      status: r.status,
      title: r.title,
      titleEn: r.title_en || null,
      detail: r.detail || null,
      detailEn: r.detail_en || null,
      updatedAt: r.updated_at,
    }))
    const updatedAt = notes.reduce<string | null>((max, n) => (!max || n.updatedAt > max ? n.updatedAt : max), null)
    return NextResponse.json({ notes, updatedAt }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
  } catch (error) {
    // Table not created yet (dev_notes.sql) or Supabase down: an empty note, never an error page
    console.error('Dev notes error:', (error as Error)?.message || error)
    return NextResponse.json({ notes: [], updatedAt: null })
  }
}
