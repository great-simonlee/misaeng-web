'use client'

import type { RefObject } from 'react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'

import { TipTapEditor } from '@components'
import { cn } from '@lib'
import {
  JOB_REVIEW_FIELD_MAX,
  JOB_REVIEW_QUICK_STEPS,
  JOB_REVIEW_STAGE_REVIEW_MAX,
  JOB_REVIEW_TIMELINE_FIELDS,
  JOB_REVIEW_TIMELINE_MAX,
  createEmptyJobReviewTimelineEntry,
  formatJobReviewDate,
  isJobReviewTimelineEntryComplete,
  isJobReviewTimelineEntryFilled,
  sortJobReviewTimelineByDate,
  summarizeJobReviewTimelineEntry,
  type JobReviewTimelineEntry,
  type JobReviewTimelineFieldKey,
  type JobReviewTypeId,
} from '@lib/community/jobReview'
import { useLocale, useT } from '@lib/i18n/client'

type DraftMode = 'add' | 'edit'

const DEFAULT_TYPE: JobReviewTypeId = 'intern'

type JobReviewTimelineEditorProps = {
  value: JobReviewTimelineEntry[]
  onChange: (next: JobReviewTimelineEntry[]) => void
  jobReviewType?: JobReviewTypeId | null
  mode?: 'create' | 'update'
  existingEntryIds?: string[]
  /** 기록을 추가·수정·삭제한 직후 (자동 저장 시점) */
  onEntryCommit?: () => void
  className?: string
}

/**
 * 작성칸 안에 있던 포커스가 페이지의 다른 입력에 "도착"하면 onLeave.
 * blur 기준이면 리치 에디터 클릭·파일 선택창에서 목적지를 알 수 없어 focusin으로 판단한다.
 */
function useFocusLeave(rootRef: RefObject<HTMLElement | null>, onLeave: () => void) {
  const insideRef = useRef(false)
  const handleLeave = useEffectEvent(onLeave)

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const root = rootRef.current
      if (!root) return
      if (e.target instanceof Node && root.contains(e.target)) {
        insideRef.current = true
        return
      }
      if (!insideRef.current) return
      insideRef.current = false
      handleLeave()
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [rootRef])
}

export function JobReviewTimelineEditor({
  value,
  onChange,
  jobReviewType = null,
  mode = 'create',
  existingEntryIds = [],
  onEntryCommit,
  className,
}: JobReviewTimelineEditorProps) {
  const existingIdSet = useMemo(
    () => new Set(existingEntryIds),
    [existingEntryIds],
  )
  const isUpdateMode = mode === 'update' && existingIdSet.size > 0

  if (!isUpdateMode) {
    return (
      <CreateTimelineForm
        value={value}
        onChange={onChange}
        jobReviewType={jobReviewType}
        onEntryCommit={onEntryCommit}
        className={className}
      />
    )
  }

  return (
    <UpdateTimelineForm
      value={value}
      onChange={onChange}
      jobReviewType={jobReviewType}
      existingIdSet={existingIdSet}
      onEntryCommit={onEntryCommit}
      className={className}
    />
  )
}

function CreateTimelineForm({
  value,
  onChange,
  jobReviewType,
  onEntryCommit,
  className,
}: {
  value: JobReviewTimelineEntry[]
  onChange: (next: JobReviewTimelineEntry[]) => void
  jobReviewType: JobReviewTypeId | null
  onEntryCommit?: () => void
  className?: string
}) {
  const t = useT('reviews')
  const [draftMode, setDraftMode] = useState<DraftMode>('add')
  const [draft, setDraft] = useState(() => createEmptyJobReviewTimelineEntry())
  const [editSnapshot, setEditSnapshot] = useState<JobReviewTimelineEntry | null>(
    null,
  )
  const [committedIds, setCommittedIds] = useState<string[]>(() =>
    value.filter(isJobReviewTimelineEntryFilled).map((entry) => entry.id),
  )

  const committedIdSet = useMemo(() => new Set(committedIds), [committedIds])

  const savedEntries = useMemo(
    () =>
      sortJobReviewTimelineByDate(
        value.filter((entry) => committedIdSet.has(entry.id)),
      ),
    [value, committedIdSet],
  )

  const canAddMore = savedEntries.length < JOB_REVIEW_TIMELINE_MAX
  const isEditing = draftMode === 'edit'
  const draftComplete = isJobReviewTimelineEntryComplete(draft)

  function syncAddDraft(nextDraft: JobReviewTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      isJobReviewTimelineEntryFilled(nextDraft)
        ? [...savedEntries, nextDraft]
        : savedEntries,
    )
  }

  function syncEditDraft(nextDraft: JobReviewTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      value.map((entry) => (entry.id === nextDraft.id ? nextDraft : entry)),
    )
  }

  function startAdd() {
    setDraftMode('add')
    setEditSnapshot(null)
    setDraft(createEmptyJobReviewTimelineEntry())
    onChange(savedEntries)
  }

  function commitCurrentDraft() {
    if (!draftComplete) return
    if (!canAddMore && !isEditing) return

    const nextSaved = sortJobReviewTimelineByDate(
      savedEntries.some((entry) => entry.id === draft.id)
        ? savedEntries.map((entry) =>
            entry.id === draft.id ? draft : entry,
          )
        : [...savedEntries, draft],
    )
    setCommittedIds(nextSaved.map((entry) => entry.id))
    setDraftMode('add')
    setEditSnapshot(null)
    setDraft(createEmptyJobReviewTimelineEntry())
    onChange(nextSaved)
    onEntryCommit?.()
  }

  function startEdit(entry: JobReviewTimelineEntry) {
    // 작성 중이던 새 기록은 버리지 않고 목록에 먼저 올린다.
    const keepDraft =
      draftMode === 'add' && canAddMore && isJobReviewTimelineEntryFilled(draft)
    const nextSaved = keepDraft
      ? sortJobReviewTimelineByDate([...savedEntries, draft])
      : savedEntries
    if (keepDraft) setCommittedIds(nextSaved.map((item) => item.id))
    setDraftMode('edit')
    setEditSnapshot(entry)
    setDraft({ ...entry })
    onChange(nextSaved)
    if (keepDraft) onEntryCommit?.()
  }

  const rootRef = useRef<HTMLDivElement>(null)
  useFocusLeave(rootRef, () => {
    if (draftComplete && (isEditing || canAddMore)) commitCurrentDraft()
  })

  function cancelDraft() {
    if (draftMode === 'edit' && editSnapshot) {
      onChange(
        value.map((entry) =>
          entry.id === editSnapshot.id ? editSnapshot : entry,
        ),
      )
    } else {
      onChange(savedEntries)
    }
    startAdd()
  }

  function removeSaved(id: string) {
    const nextSaved = savedEntries.filter((entry) => entry.id !== id)
    setCommittedIds(nextSaved.map((entry) => entry.id))

    if (draftMode === 'edit' && draft.id === id) {
      setDraftMode('add')
      setEditSnapshot(null)
      setDraft(createEmptyJobReviewTimelineEntry())
      onChange(nextSaved)
      onEntryCommit?.()
      return
    }

    onChange(
      draftMode === 'add' && isJobReviewTimelineEntryFilled(draft)
        ? [...nextSaved, draft]
        : nextSaved,
    )
    onEntryCommit?.()
  }

  function handleDraftChange(patch: Partial<JobReviewTimelineEntry>) {
    const nextDraft = { ...draft, ...patch }
    if (draftMode === 'add') syncAddDraft(nextDraft)
    else syncEditDraft(nextDraft)
  }

  return (
    <div ref={rootRef} className={cn('space-y-4', className)}>
      {savedEntries.length > 0 ? (
        <section className='space-y-2 rounded-2xl bg-[#f8f8f9] p-3 ring-1 ring-black/[0.04] sm:p-3.5'>
          <SectionHeading
            title={t('timeline.addedTitle', { count: savedEntries.length })}
            description={t('timeline.savedDescription')}
          />
          {savedEntries.map((entry, index) => {
            const isActiveEdit = draftMode === 'edit' && draft.id === entry.id
            return (
              <SavedEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                active={isActiveEdit}
                onEdit={() => startEdit(entry)}
                onRemove={() => removeSaved(entry.id)}
              />
            )
          })}
        </section>
      ) : null}

      <section className='space-y-2.5'>
        {isEditing ? (
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[14px] font-semibold text-[var(--foreground)]'>
              {t('timeline.editingSelected')}
            </p>
            <button
              type='button'
              onClick={cancelDraft}
              className='shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] ring-1 ring-black/[0.08] touch-manipulation hover:text-[var(--foreground)]'
            >
              {t('timeline.cancel')}
            </button>
          </div>
        ) : null}

        {(!isEditing && canAddMore) || isEditing ? (
          <>
            <SingleEntryForm
              key={draft.id}
              entry={draft}
              jobReviewType={jobReviewType}
              highlight
              showQuickSteps={!isEditing}
              onChange={handleDraftChange}
            />

            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                disabled={!draftComplete || (!isEditing && !canAddMore)}
                onClick={commitCurrentDraft}
                className='inline-flex h-10 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-40'
              >
                {isEditing ? t('timeline.finishEdit') : t('timeline.addEntry')}
              </button>
              {!isEditing && isJobReviewTimelineEntryFilled(draft) ? (
                <button
                  type='button'
                  onClick={startAdd}
                  className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                >
                  {t('timeline.clearDraft')}
                </button>
              ) : null}
            </div>
            <AutoCommitHint />
          </>
        ) : (
          <p className='rounded-xl bg-[#f8f8f9] px-3.5 py-3 text-[12px] text-[var(--muted)] ring-1 ring-black/[0.04]'>
            {t('timeline.limitReached')}
          </p>
        )}
      </section>
    </div>
  )
}

function UpdateTimelineForm({
  value,
  onChange,
  jobReviewType,
  existingIdSet,
  onEntryCommit,
  className,
}: {
  value: JobReviewTimelineEntry[]
  onChange: (next: JobReviewTimelineEntry[]) => void
  jobReviewType: JobReviewTypeId | null
  existingIdSet: Set<string>
  onEntryCommit?: () => void
  className?: string
}) {
  const t = useT('reviews')
  const [draftMode, setDraftMode] = useState<DraftMode>('add')
  const [draft, setDraft] = useState(() => createEmptyJobReviewTimelineEntry())
  const [editSnapshot, setEditSnapshot] = useState<JobReviewTimelineEntry | null>(
    null,
  )
  // 자동 저장본에서 복원된 새 기록도 목록에 보이도록 처음부터 포함
  const [sessionCommittedIds, setSessionCommittedIds] = useState<string[]>(() =>
    value
      .filter(
        (entry) =>
          !existingIdSet.has(entry.id) && isJobReviewTimelineEntryFilled(entry),
      )
      .map((entry) => entry.id),
  )

  const savedIdSet = useMemo(() => {
    const next = new Set(existingIdSet)
    for (const id of sessionCommittedIds) next.add(id)
    return next
  }, [existingIdSet, sessionCommittedIds])

  const savedEntries = useMemo(
    () =>
      sortJobReviewTimelineByDate(
        value.filter((entry) => savedIdSet.has(entry.id)),
      ),
    [value, savedIdSet],
  )

  const canAddMore = savedEntries.length < JOB_REVIEW_TIMELINE_MAX
  const isEditing = draftMode === 'edit'
  const draftComplete = isJobReviewTimelineEntryComplete(draft)

  function syncAddDraft(nextDraft: JobReviewTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      isJobReviewTimelineEntryFilled(nextDraft)
        ? [...savedEntries, nextDraft]
        : savedEntries,
    )
  }

  function syncEditDraft(nextDraft: JobReviewTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      value.map((entry) => (entry.id === nextDraft.id ? nextDraft : entry)),
    )
  }

  function startAdd() {
    setDraftMode('add')
    setEditSnapshot(null)
    const empty = createEmptyJobReviewTimelineEntry()
    setDraft(empty)
    onChange(savedEntries)
  }

  function commitCurrentDraft() {
    if (!draftComplete) return
    if (!canAddMore && !isEditing) return

    const nextSaved = sortJobReviewTimelineByDate(
      savedEntries.some((entry) => entry.id === draft.id)
        ? savedEntries.map((entry) =>
            entry.id === draft.id ? draft : entry,
          )
        : [...savedEntries, draft],
    )
    setSessionCommittedIds(
      nextSaved
        .map((entry) => entry.id)
        .filter((id) => !existingIdSet.has(id)),
    )
    setDraftMode('add')
    setEditSnapshot(null)
    setDraft(createEmptyJobReviewTimelineEntry())
    onChange(nextSaved)
    onEntryCommit?.()
  }

  function startEdit(entry: JobReviewTimelineEntry) {
    // 작성 중이던 새 기록은 버리지 않고 목록에 먼저 올린다.
    const keepDraft =
      draftMode === 'add' && canAddMore && isJobReviewTimelineEntryFilled(draft)
    const nextSaved = keepDraft
      ? sortJobReviewTimelineByDate([...savedEntries, draft])
      : savedEntries
    if (keepDraft) {
      setSessionCommittedIds(
        nextSaved
          .map((item) => item.id)
          .filter((id) => !existingIdSet.has(id)),
      )
    }
    setDraftMode('edit')
    setEditSnapshot(entry)
    setDraft({ ...entry })
    onChange(nextSaved)
    if (keepDraft) onEntryCommit?.()
  }

  const rootRef = useRef<HTMLDivElement>(null)
  useFocusLeave(rootRef, () => {
    if (draftComplete && (isEditing || canAddMore)) commitCurrentDraft()
  })

  function cancelDraft() {
    if (draftMode === 'edit' && editSnapshot) {
      onChange(
        value.map((entry) =>
          entry.id === editSnapshot.id ? editSnapshot : entry,
        ),
      )
    } else {
      onChange(savedEntries)
    }
    startAdd()
  }

  function removeSaved(id: string) {
    const nextSaved = savedEntries.filter((entry) => entry.id !== id)
    setSessionCommittedIds(
      nextSaved
        .map((entry) => entry.id)
        .filter((entryId) => !existingIdSet.has(entryId)),
    )

    if (draftMode === 'edit' && draft.id === id) {
      setDraftMode('add')
      setEditSnapshot(null)
      setDraft(createEmptyJobReviewTimelineEntry())
      onChange(nextSaved)
      onEntryCommit?.()
      return
    }

    onChange(
      draftMode === 'add' && isJobReviewTimelineEntryFilled(draft)
        ? [...nextSaved, draft]
        : nextSaved,
    )
    onEntryCommit?.()
  }

  function handleDraftChange(patch: Partial<JobReviewTimelineEntry>) {
    const nextDraft = { ...draft, ...patch }
    if (draftMode === 'add') syncAddDraft(nextDraft)
    else syncEditDraft(nextDraft)
  }

  return (
    <div ref={rootRef} className={cn('space-y-4', className)}>
      <GuideBox
        tone='update'
        title={isEditing ? t('timeline.updateGuide.editingTitle') : t('timeline.updateGuide.addTitle')}
        description={
          isEditing
            ? t('jobReview.timeline.editingDescription')
            : t('timeline.updateGuide.addDescription')
        }
      />

      {savedEntries.length > 0 ? (
        <section className='space-y-2 rounded-2xl bg-[#f8f8f9] p-3 ring-1 ring-black/[0.04] sm:p-3.5'>
          <SectionHeading
            title={t('timeline.savedTitle', { count: savedEntries.length })}
            description={t('timeline.savedDescription')}
          />
          {savedEntries.map((entry, index) => {
            const isActiveEdit = draftMode === 'edit' && draft.id === entry.id
            return (
              <SavedEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                active={isActiveEdit}
                onEdit={() => startEdit(entry)}
                onRemove={
                  savedEntries.length > 1 ||
                  isJobReviewTimelineEntryFilled(draft)
                    ? () => removeSaved(entry.id)
                    : undefined
                }
              />
            )
          })}
        </section>
      ) : null}

      <section className='space-y-2.5'>
        <div className='flex items-center justify-between gap-2'>
          <div>
            <p className='text-[14px] font-semibold text-[var(--brand)]'>
              {isEditing ? t('timeline.editingSelected') : t('timeline.newEntry')}
            </p>
            <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
              {isEditing
                ? t('timeline.editHint')
                : canAddMore
                  ? t('timeline.maxCanAdd', { max: JOB_REVIEW_TIMELINE_MAX })
                  : t('timeline.maxReached', { max: JOB_REVIEW_TIMELINE_MAX })}
            </p>
          </div>
          {isEditing ? (
            <button
              type='button'
              onClick={cancelDraft}
              className='shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] ring-1 ring-black/[0.08] touch-manipulation hover:text-[var(--foreground)]'
            >
              {t('timeline.cancel')}
            </button>
          ) : null}
        </div>

        {(!isEditing && canAddMore) || isEditing ? (
          <>
            <SingleEntryForm
              key={draft.id}
              entry={draft}
              jobReviewType={jobReviewType}
              highlight
              showQuickSteps={!isEditing}
              onChange={handleDraftChange}
            />

            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                disabled={!draftComplete || (!isEditing && !canAddMore)}
                onClick={commitCurrentDraft}
                className='inline-flex h-10 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-40'
              >
                {isEditing ? t('timeline.finishEdit') : t('timeline.addEntry')}
              </button>
              {!isEditing && isJobReviewTimelineEntryFilled(draft) ? (
                <button
                  type='button'
                  onClick={startAdd}
                  className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                >
                  {t('timeline.clearDraft')}
                </button>
              ) : null}
            </div>
            <AutoCommitHint />
          </>
        ) : (
          <p className='rounded-xl bg-[#f8f8f9] px-3.5 py-3 text-[12px] text-[var(--muted)] ring-1 ring-black/[0.04]'>
            {t('timeline.limitReached')}
          </p>
        )}
      </section>
    </div>
  )
}

function AutoCommitHint() {
  const t = useT('reviews')
  return (
    <p className='text-[11px] leading-relaxed text-[var(--muted)]'>
      {t('jobReview.timeline.autoCommitHint')}
    </p>
  )
}

function SavedEntryRow({
  entry,
  index,
  active,
  onEdit,
  onRemove,
}: {
  entry: JobReviewTimelineEntry
  index: number
  active: boolean
  onEdit: () => void
  onRemove?: () => void
}) {
  const t = useT('reviews')
  const locale = useLocale()
  const summary = summarizeJobReviewTimelineEntry(entry)

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-2xl px-3.5 py-3 ring-1 sm:px-4',
        active
          ? 'bg-brand-soft ring-[var(--brand)]/30'
          : 'bg-white ring-black/[0.06]',
      )}
    >
      <span className='inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[11px] font-bold text-[var(--muted)]'>
        {index + 1}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-[13px] font-semibold text-[var(--foreground)]'>
          {entry.date ? formatJobReviewDate(entry.date, { locale }) : t('timeline.noDate')}
        </p>
        {summary ? (
          <p className='mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted)]'>
            {summary}
          </p>
        ) : null}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {!active ? (
          <button
            type='button'
            onClick={onEdit}
            className='text-[11px] font-semibold text-[var(--brand)] touch-manipulation hover:underline'
          >
            {t('timeline.edit')}
          </button>
        ) : (
          <span className='text-[11px] font-semibold text-[var(--brand)]'>
            {t('timeline.editing')}
          </span>
        )}
        {onRemove ? (
          <button
            type='button'
            onClick={onRemove}
            className='text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
          >
            {t('timeline.delete')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function SingleEntryForm({
  entry,
  jobReviewType,
  highlight = false,
  showQuickSteps = false,
  onChange,
}: {
  entry: JobReviewTimelineEntry
  jobReviewType: JobReviewTypeId | null
  highlight?: boolean
  showQuickSteps?: boolean
  onChange: (patch: Partial<JobReviewTimelineEntry>) => void
}) {
  const t = useT('reviews')
  const contentKeys = useMemo(
    () =>
      JOB_REVIEW_TIMELINE_FIELDS.filter((field) => entry[field.key].trim()).map(
        (field) => field.key,
      ),
    [entry],
  )
  const [entryId, setEntryId] = useState(entry.id)
  const [selectedKeys, setSelectedKeys] = useState<Set<JobReviewTimelineFieldKey>>(
    () => new Set(contentKeys),
  )

  if (entryId !== entry.id) {
    setEntryId(entry.id)
    setSelectedKeys(new Set(contentKeys))
  }

  const visibleKeySet = useMemo(() => {
    const next = new Set(selectedKeys)
    for (const key of contentKeys) next.add(key)
    return next
  }, [selectedKeys, contentKeys])

  function toggleField(key: JobReviewTimelineFieldKey) {
    const active = visibleKeySet.has(key)
    if (active) {
      const next = new Set(selectedKeys)
      next.delete(key)
      setSelectedKeys(next)
      onChange({ [key]: '' })
      return
    }
    setSelectedKeys(new Set(selectedKeys).add(key))
  }

  const visibleFields = JOB_REVIEW_TIMELINE_FIELDS.filter((field) =>
    visibleKeySet.has(field.key),
  )

  return (
    <div className='space-y-2.5'>
      {showQuickSteps ? (
        <QuickStepButtons
          jobReviewType={jobReviewType}
          onApply={(patch) => onChange(patch)}
        />
      ) : null}
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white ring-1',
        highlight
          ? 'ring-[var(--brand)]/35 shadow-[0_0_0_1px_rgb(var(--brand-rgb)/0.06)]'
          : 'ring-black/[0.06]',
      )}
    >
      <div
        className={cn(
          'border-b border-black/[0.04] px-3.5 py-3 sm:px-4',
          highlight ? 'bg-brand-soft' : 'bg-[#fafafa]',
        )}
      >
        <label className='block'>
          <span className='text-[12px] font-semibold text-[var(--foreground)]'>
            {t('timeline.date')}
          </span>
          <input
            type='date'
            value={entry.date}
            onChange={(e) => onChange({ date: e.target.value })}
            className={cn(dateInputClass, 'mt-1.5')}
          />
        </label>

        <div className='mt-3'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            {t('timeline.selectFields')}
          </p>
          <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
            {t('timeline.selectFieldsHint')}
          </p>
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {JOB_REVIEW_TIMELINE_FIELDS.map((field) => {
              const active = visibleKeySet.has(field.key)
              return (
                <button
                  key={field.key}
                  type='button'
                  onClick={() => toggleField(field.key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ring-1 touch-manipulation transition',
                    active
                      ? cn(field.labelClass, field.rowClass, 'ring-black/10')
                      : 'bg-white text-[var(--muted)] ring-black/[0.08] hover:bg-[#f8f8f9]',
                  )}
                >
                  <span aria-hidden>{active ? '✓' : '+'}</span>
                  {t(`jobReview.fields.${field.key}.shortLabel`)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className='space-y-2 p-3 sm:p-3.5'>
        {visibleFields.map((field) => (
          <TimelineField
            key={field.key}
            field={field}
            value={entry[field.key]}
            placeholder={t(`jobReview.placeholders.${jobReviewType ?? DEFAULT_TYPE}.${field.key}`)}
            onChange={(next) => onChange({ [field.key]: next })}
            onRemove={() => toggleField(field.key)}
          />
        ))}

        <div className='rounded-xl border border-black/[0.06] bg-[#fafbfc] px-3 py-3 sm:px-3.5 sm:py-3.5'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            {t('detail.stageReview')}
          </p>
          <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
            {t('jobReview.timeline.stageReviewHint')}
          </p>
          <div className='mt-2.5'>
            <TipTapEditor
              value={entry.stageReviewHtml}
              onChange={(html) => onChange({ stageReviewHtml: html })}
              placeholder={t('jobReview.timeline.stageReviewPlaceholder')}
              minHeightClassName='min-h-[160px]'
              contentClassName='!text-[13px] !leading-[1.65]'
              simpleToolbar
              maxLength={JOB_REVIEW_STAGE_REVIEW_MAX}
            />
          </div>
        </div>
      </div>

      {!isJobReviewTimelineEntryFilled(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-[var(--muted)] sm:px-4'>
          {t('timeline.incompleteEmpty')}
        </p>
      ) : !isJobReviewTimelineEntryComplete(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-amber-700 sm:px-4'>
          {t('timeline.incompleteDate')}
        </p>
      ) : null}
    </div>
    </div>
  )
}

function QuickStepButtons({
  jobReviewType,
  onApply,
}: {
  jobReviewType: JobReviewTypeId | null
  onApply: (patch: Partial<JobReviewTimelineEntry>) => void
}) {
  const t = useT('reviews')
  const type = jobReviewType
  const quickSteps = type ? JOB_REVIEW_QUICK_STEPS[type] : []
  if (!type || quickSteps.length === 0) return null

  return (
    <div className='flex flex-wrap gap-1.5'>
      <span className='mr-0.5 self-center text-[11px] font-medium text-[var(--muted)]'>
        {t('timeline.quickInput')}
      </span>
      {quickSteps.map((step) => (
        <button
          key={step.id}
          type='button'
          onClick={() =>
            onApply(
              Object.fromEntries(
                step.fields.map((field) => [
                  field,
                  t(`jobReview.quickSteps.${type}.${step.id}.${field}`),
                ]),
              ),
            )
          }
          className='rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:bg-brand-soft hover:ring-[var(--brand)]/25'
        >
          {t(`jobReview.quickSteps.${type}.${step.id}.label`)}
        </button>
      ))}
    </div>
  )
}

function GuideBox({
  title,
  description,
  tone = 'create',
}: {
  title: string
  description: string
  tone?: 'create' | 'update'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl px-3.5 py-3 ring-1',
        tone === 'update'
          ? 'bg-brand-soft ring-[var(--brand)]/15'
          : 'bg-[#f8f8f9] ring-black/[0.04]',
      )}
    >
      <p
        className={cn(
          'text-[12px] font-semibold',
          tone === 'update' ? 'text-[var(--brand)]' : 'text-[var(--foreground)]',
        )}
      >
        {title}
      </p>
      <p className='mt-1 text-[11px] leading-relaxed text-[var(--muted)]'>
        {description}
      </p>
    </div>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h3 className='text-[14px] font-semibold text-[var(--foreground)]'>
        {title}
      </h3>
      <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
        {description}
      </p>
    </div>
  )
}

function TimelineField({
  field,
  value,
  placeholder,
  onChange,
  onRemove,
}: {
  field: (typeof JOB_REVIEW_TIMELINE_FIELDS)[number]
  value: string
  placeholder: string
  onChange: (value: string) => void
  onRemove?: () => void
}) {
  const t = useT('reviews')
  return (
    <div className={cn('rounded-xl px-3 py-2.5', field.rowClass)}>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <p className={cn('text-[12px] font-semibold', field.labelClass)}>
            {t(`jobReview.fields.${field.key}.label`)}
          </p>
          <p className='mt-0.5 text-[10px] text-[var(--muted)]'>{t(`jobReview.fields.${field.key}.hint`)}</p>
          {field.hasGuide ? (
            <p className='mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]'>
              {t(`jobReview.fields.${field.key}.guide`)}
            </p>
          ) : null}
        </div>
        {onRemove ? (
          <button
            type='button'
            onClick={onRemove}
            className='shrink-0 text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
          >
            {t('timeline.removeField')}
          </button>
        ) : null}
      </div>
      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, JOB_REVIEW_FIELD_MAX))
        }
        maxLength={JOB_REVIEW_FIELD_MAX}
        rows={field.key === 'interviewRound' ? 4 : value.trim() ? 2 : 2}
        placeholder={placeholder}
        className='mt-2 w-full resize-none rounded-lg bg-white/80 px-2.5 py-2 text-[13px] leading-relaxed outline-none ring-1 ring-black/[0.05] transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30 sm:text-[14px]'
      />
    </div>
  )
}

const dateInputClass =
  'h-10 w-full rounded-lg bg-white px-2.5 text-[13px] font-semibold outline-none ring-1 ring-black/[0.08] transition focus:ring-[var(--brand)]/35 sm:text-[14px]'
