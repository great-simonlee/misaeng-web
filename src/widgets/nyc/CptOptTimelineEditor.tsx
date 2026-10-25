'use client'

import { useMemo, useState } from 'react'

import { TipTapEditor } from '@components'
import { cn } from '@lib'
import {
  CPT_OPT_FIELD_MAX,
  CPT_OPT_QUICK_STEPS,
  CPT_OPT_STAGE_REVIEW_MAX,
  CPT_OPT_TIMELINE_FIELDS,
  CPT_OPT_TIMELINE_MAX,
  createEmptyTimelineEntry,
  formatCptOptDate,
  isTimelineEntryComplete,
  isTimelineEntryFilled,
  sortTimelineByDate,
  summarizeTimelineEntry,
  type CptOptTimelineEntry,
  type CptOptTimelineFieldKey,
  type CptOptTypeId,
} from '@lib/community/cptOpt'
import { useLocale, useT } from '@lib/i18n/client'

type DraftMode = 'add' | 'edit'

const DEFAULT_TYPE: CptOptTypeId = 'cpt'

type CptOptTimelineEditorProps = {
  value: CptOptTimelineEntry[]
  onChange: (next: CptOptTimelineEntry[]) => void
  cptOptType?: CptOptTypeId | null
  mode?: 'create' | 'update'
  existingEntryIds?: string[]
  className?: string
}

export function CptOptTimelineEditor({
  value,
  onChange,
  cptOptType = null,
  mode = 'create',
  existingEntryIds = [],
  className,
}: CptOptTimelineEditorProps) {
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
        cptOptType={cptOptType}
        className={className}
      />
    )
  }

  return (
    <UpdateTimelineForm
      value={value}
      onChange={onChange}
      cptOptType={cptOptType}
      existingIdSet={existingIdSet}
      className={className}
    />
  )
}

function CreateTimelineForm({
  value,
  onChange,
  cptOptType,
  className,
}: {
  value: CptOptTimelineEntry[]
  onChange: (next: CptOptTimelineEntry[]) => void
  cptOptType: CptOptTypeId | null
  className?: string
}) {
  const t = useT('reviews')
  const [draftMode, setDraftMode] = useState<DraftMode>('add')
  const [draft, setDraft] = useState(() => createEmptyTimelineEntry())
  const [editSnapshot, setEditSnapshot] = useState<CptOptTimelineEntry | null>(
    null,
  )
  const [committedIds, setCommittedIds] = useState<string[]>(() =>
    value.filter(isTimelineEntryFilled).map((entry) => entry.id),
  )

  const committedIdSet = useMemo(
    () => new Set(committedIds),
    [committedIds],
  )

  const savedEntries = useMemo(
    () =>
      sortTimelineByDate(
        value.filter((entry) => committedIdSet.has(entry.id)),
      ),
    [value, committedIdSet],
  )

  const canAddMore = savedEntries.length < CPT_OPT_TIMELINE_MAX
  const isEditing = draftMode === 'edit'
  const draftComplete = isTimelineEntryComplete(draft)

  function syncAddDraft(nextDraft: CptOptTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      isTimelineEntryFilled(nextDraft)
        ? [...savedEntries, nextDraft]
        : savedEntries,
    )
  }

  function syncEditDraft(nextDraft: CptOptTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      value.map((entry) => (entry.id === nextDraft.id ? nextDraft : entry)),
    )
  }

  function startAdd() {
    setDraftMode('add')
    setEditSnapshot(null)
    setDraft(createEmptyTimelineEntry())
    onChange(savedEntries)
  }

  function commitCurrentDraft() {
    if (!draftComplete) return
    if (!canAddMore && !isEditing) return

    const nextSaved = sortTimelineByDate(
      savedEntries.some((entry) => entry.id === draft.id)
        ? savedEntries.map((entry) =>
            entry.id === draft.id ? draft : entry,
          )
        : [...savedEntries, draft],
    )
    setCommittedIds(nextSaved.map((entry) => entry.id))
    setDraftMode('add')
    setEditSnapshot(null)
    setDraft(createEmptyTimelineEntry())
    onChange(nextSaved)
  }

  function startEdit(entry: CptOptTimelineEntry) {
    setDraftMode('edit')
    setEditSnapshot(entry)
    setDraft({ ...entry })
    onChange(savedEntries)
  }

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
      setDraft(createEmptyTimelineEntry())
      onChange(nextSaved)
      return
    }

    onChange(
      draftMode === 'add' && isTimelineEntryFilled(draft)
        ? [...nextSaved, draft]
        : nextSaved,
    )
  }

  function handleDraftChange(patch: Partial<CptOptTimelineEntry>) {
    const nextDraft = { ...draft, ...patch }
    if (draftMode === 'add') syncAddDraft(nextDraft)
    else syncEditDraft(nextDraft)
  }

  return (
    <div className={cn('space-y-4', className)}>
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
              cptOptType={cptOptType}
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
              {!isEditing && isTimelineEntryFilled(draft) ? (
                <button
                  type='button'
                  onClick={startAdd}
                  className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                >
                  {t('timeline.clearDraft')}
                </button>
              ) : null}
            </div>
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
  cptOptType,
  existingIdSet,
  className,
}: {
  value: CptOptTimelineEntry[]
  onChange: (next: CptOptTimelineEntry[]) => void
  cptOptType: CptOptTypeId | null
  existingIdSet: Set<string>
  className?: string
}) {
  const t = useT('reviews')
  const [draftMode, setDraftMode] = useState<DraftMode>('add')
  const [draft, setDraft] = useState(() => createEmptyTimelineEntry())
  const [editSnapshot, setEditSnapshot] = useState<CptOptTimelineEntry | null>(
    null,
  )
  const [sessionCommittedIds, setSessionCommittedIds] = useState<string[]>([])

  const savedIdSet = useMemo(() => {
    const next = new Set(existingIdSet)
    for (const id of sessionCommittedIds) next.add(id)
    return next
  }, [existingIdSet, sessionCommittedIds])

  const savedEntries = useMemo(
    () =>
      sortTimelineByDate(value.filter((entry) => savedIdSet.has(entry.id))),
    [value, savedIdSet],
  )

  const canAddMore = savedEntries.length < CPT_OPT_TIMELINE_MAX
  const isEditing = draftMode === 'edit'
  const draftComplete = isTimelineEntryComplete(draft)

  function syncAddDraft(nextDraft: CptOptTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      isTimelineEntryFilled(nextDraft)
        ? [...savedEntries, nextDraft]
        : savedEntries,
    )
  }

  function syncEditDraft(nextDraft: CptOptTimelineEntry) {
    setDraft(nextDraft)
    onChange(
      value.map((entry) => (entry.id === nextDraft.id ? nextDraft : entry)),
    )
  }

  function startAdd() {
    setDraftMode('add')
    setEditSnapshot(null)
    const empty = createEmptyTimelineEntry()
    setDraft(empty)
    onChange(savedEntries)
  }

  function commitCurrentDraft() {
    if (!draftComplete) return
    if (!canAddMore && !isEditing) return

    const nextSaved = sortTimelineByDate(
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
    setDraft(createEmptyTimelineEntry())
    onChange(nextSaved)
  }

  function startEdit(entry: CptOptTimelineEntry) {
    setDraftMode('edit')
    setEditSnapshot(entry)
    setDraft({ ...entry })
    onChange(savedEntries)
  }

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
      setDraft(createEmptyTimelineEntry())
      onChange(nextSaved)
      return
    }

    onChange(
      draftMode === 'add' && isTimelineEntryFilled(draft)
        ? [...nextSaved, draft]
        : nextSaved,
    )
  }

  function handleDraftChange(patch: Partial<CptOptTimelineEntry>) {
    const nextDraft = { ...draft, ...patch }
    if (draftMode === 'add') syncAddDraft(nextDraft)
    else syncEditDraft(nextDraft)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <GuideBox
        tone='update'
        title={isEditing ? t('timeline.updateGuide.editingTitle') : t('timeline.updateGuide.addTitle')}
        description={
          isEditing
            ? t('cptOpt.timeline.editingDescription')
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
                  savedEntries.length > 1 || isTimelineEntryFilled(draft)
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
                  ? t('timeline.maxCanAdd', { max: CPT_OPT_TIMELINE_MAX })
                  : t('timeline.maxReached', { max: CPT_OPT_TIMELINE_MAX })}
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
              cptOptType={cptOptType}
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
              {!isEditing && isTimelineEntryFilled(draft) ? (
                <button
                  type='button'
                  onClick={startAdd}
                  className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                >
                  {t('timeline.clearDraft')}
                </button>
              ) : null}
            </div>
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

function SavedEntryRow({
  entry,
  index,
  active,
  onEdit,
  onRemove,
}: {
  entry: CptOptTimelineEntry
  index: number
  active: boolean
  onEdit: () => void
  onRemove?: () => void
}) {
  const t = useT('reviews')
  const locale = useLocale()
  const summary = summarizeTimelineEntry(entry)

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
          {entry.date ? formatCptOptDate(entry.date, { locale }) : t('timeline.noDate')}
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
  cptOptType,
  highlight = false,
  showQuickSteps = false,
  onChange,
}: {
  entry: CptOptTimelineEntry
  cptOptType: CptOptTypeId | null
  highlight?: boolean
  showQuickSteps?: boolean
  onChange: (patch: Partial<CptOptTimelineEntry>) => void
}) {
  const t = useT('reviews')
  const [selectedKeys, setSelectedKeys] = useState<Set<CptOptTimelineFieldKey>>(
    () =>
      new Set(
        CPT_OPT_TIMELINE_FIELDS.filter((field) => entry[field.key].trim()).map(
          (field) => field.key,
        ),
      ),
  )

  function selectField(key: CptOptTimelineFieldKey) {
    setSelectedKeys((prev) => {
      if (prev.has(key)) return prev
      return new Set(prev).add(key)
    })
  }

  function deselectField(key: CptOptTimelineFieldKey) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    onChange({ [key]: '' })
  }

  function toggleField(key: CptOptTimelineFieldKey) {
    if (selectedKeys.has(key)) deselectField(key)
    else selectField(key)
  }

  function handleFieldChange(key: CptOptTimelineFieldKey, next: string) {
    // 내용을 백스페이스로 비워도 선택한 카테고리는 유지
    selectField(key)
    onChange({ [key]: next })
  }

  function applyQuickStep(patch: Partial<CptOptTimelineEntry>) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const field of CPT_OPT_TIMELINE_FIELDS) {
        const value = patch[field.key]
        if (typeof value === 'string' && value.trim()) next.add(field.key)
      }
      return next
    })
    onChange(patch)
  }

  const visibleFields = CPT_OPT_TIMELINE_FIELDS.filter((field) =>
    selectedKeys.has(field.key),
  )

  return (
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

        {showQuickSteps ? (
          <div className='mt-3'>
            <QuickStepButtons cptOptType={cptOptType} onApply={applyQuickStep} />
          </div>
        ) : null}

        <div className='mt-3'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            {t('timeline.selectFields')}
          </p>
          <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
            {t('timeline.selectFieldsHint')}
          </p>
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {CPT_OPT_TIMELINE_FIELDS.map((field) => {
              const active = selectedKeys.has(field.key)
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
                  {t(`cptOpt.fields.${field.key}.shortLabel`)}
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
            placeholder={t(`cptOpt.placeholders.${cptOptType ?? DEFAULT_TYPE}.${field.key}`)}
            onChange={(next) => handleFieldChange(field.key, next)}
            onRemove={() => deselectField(field.key)}
          />
        ))}

        <div className='rounded-xl border border-black/[0.06] bg-[#fafbfc] px-3 py-3 sm:px-3.5 sm:py-3.5'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            {t('detail.stageReview')}
          </p>
          <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
            {t('cptOpt.timeline.stageReviewHint')}
          </p>
          <div className='mt-2.5'>
            <TipTapEditor
              value={entry.stageReviewHtml}
              onChange={(html) => onChange({ stageReviewHtml: html })}
              placeholder={t('cptOpt.timeline.stageReviewPlaceholder')}
              minHeightClassName='min-h-[160px]'
              contentClassName='!text-[13px] !leading-[1.65]'
              simpleToolbar
              maxLength={CPT_OPT_STAGE_REVIEW_MAX}
            />
          </div>
        </div>
      </div>

      {!isTimelineEntryFilled(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-[var(--muted)] sm:px-4'>
          {t('timeline.incompleteEmpty')}
        </p>
      ) : !isTimelineEntryComplete(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-amber-700 sm:px-4'>
          {t('timeline.incompleteDate')}
        </p>
      ) : null}
    </div>
  )
}

function QuickStepButtons({
  cptOptType,
  onApply,
}: {
  cptOptType: CptOptTypeId | null
  onApply: (patch: Partial<CptOptTimelineEntry>) => void
}) {
  const t = useT('reviews')
  const type = cptOptType
  const quickSteps = type ? CPT_OPT_QUICK_STEPS[type] : []
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
                  t(`cptOpt.quickSteps.${type}.${step.id}.${field}`),
                ]),
              ),
            )
          }
          className='rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:bg-brand-soft hover:ring-[var(--brand)]/25'
        >
          {t(`cptOpt.quickSteps.${type}.${step.id}.label`)}
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
  field: (typeof CPT_OPT_TIMELINE_FIELDS)[number]
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
            {t(`cptOpt.fields.${field.key}.label`)}
          </p>
          <p className='mt-0.5 text-[10px] text-[var(--muted)]'>{t(`cptOpt.fields.${field.key}.hint`)}</p>
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
          onChange(e.target.value.slice(0, CPT_OPT_FIELD_MAX))
        }
        maxLength={CPT_OPT_FIELD_MAX}
        rows={value.trim() ? 2 : 2}
        placeholder={placeholder}
        className='mt-2 w-full resize-none rounded-lg bg-white/80 px-2.5 py-2 text-[13px] leading-relaxed outline-none ring-1 ring-black/[0.05] transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30 sm:text-[14px]'
      />
    </div>
  )
}

const dateInputClass =
  'h-10 w-full rounded-lg bg-white px-2.5 text-[13px] font-semibold outline-none ring-1 ring-black/[0.08] transition focus:ring-[var(--brand)]/35 sm:text-[14px]'
