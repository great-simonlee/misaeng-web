'use client'

import { useMemo, useState } from 'react'

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
  getJobReviewTimelinePlaceholder,
  isJobReviewTimelineEntryComplete,
  isJobReviewTimelineEntryFilled,
  sortJobReviewTimelineByDate,
  summarizeJobReviewTimelineEntry,
  type JobReviewTimelineEntry,
  type JobReviewTimelineFieldKey,
  type JobReviewTypeId,
} from '@lib/community/jobReview'

type DraftMode = 'add' | 'edit'

type JobReviewTimelineEditorProps = {
  value: JobReviewTimelineEntry[]
  onChange: (next: JobReviewTimelineEntry[]) => void
  jobReviewType?: JobReviewTypeId | null
  mode?: 'create' | 'update'
  existingEntryIds?: string[]
  className?: string
}

export function JobReviewTimelineEditor({
  value,
  onChange,
  jobReviewType = null,
  mode = 'create',
  existingEntryIds = [],
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
      className={className}
    />
  )
}

function CreateTimelineForm({
  value,
  onChange,
  jobReviewType,
  className,
}: {
  value: JobReviewTimelineEntry[]
  onChange: (next: JobReviewTimelineEntry[]) => void
  jobReviewType: JobReviewTypeId | null
  className?: string
}) {
  const entry = value[0] ?? createEmptyJobReviewTimelineEntry()

  function updateEntry(patch: Partial<JobReviewTimelineEntry>) {
    onChange([{ ...entry, ...patch }])
  }

  return (
    <div className={cn('space-y-3', className)}>
      <GuideBox
        tone='create'
        title='첫 채용 단계만 남겨 주세요'
        description='날짜를 고른 뒤, 단계·플랫폼·서류·면접·결과 중 해당하는 항목을 선택하고, 아래 에디터에 이 단계 후기를 자유롭게 적어 주세요. 나중에 업데이트로 이어서 추가할 수 있어요.'
      />
      <QuickStepButtons
        jobReviewType={jobReviewType}
        onApply={(patch) => updateEntry(patch)}
      />
      <SingleEntryForm
        entry={entry}
        jobReviewType={jobReviewType}
        onChange={updateEntry}
      />
    </div>
  )
}

function UpdateTimelineForm({
  value,
  onChange,
  jobReviewType,
  existingIdSet,
  className,
}: {
  value: JobReviewTimelineEntry[]
  onChange: (next: JobReviewTimelineEntry[]) => void
  jobReviewType: JobReviewTypeId | null
  existingIdSet: Set<string>
  className?: string
}) {
  const savedEntries = useMemo(
    () =>
      sortJobReviewTimelineByDate(
        value.filter((entry) => existingIdSet.has(entry.id)),
      ),
    [value, existingIdSet],
  )

  const [draftMode, setDraftMode] = useState<DraftMode>('add')
  const [draft, setDraft] = useState(() => createEmptyJobReviewTimelineEntry())
  const [editSnapshot, setEditSnapshot] = useState<JobReviewTimelineEntry | null>(
    null,
  )

  const canAddMore = value.length < JOB_REVIEW_TIMELINE_MAX

  function syncAddDraft(nextDraft: JobReviewTimelineEntry) {
    setDraft(nextDraft)
    const withoutDraft = value.filter((entry) => existingIdSet.has(entry.id))
    onChange(
      isJobReviewTimelineEntryFilled(nextDraft)
        ? [...withoutDraft, nextDraft]
        : withoutDraft,
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

  function startEdit(entry: JobReviewTimelineEntry) {
    setDraftMode('edit')
    setEditSnapshot(entry)
    setDraft({ ...entry })
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
    if (draftMode === 'edit' && draft.id === id) {
      startAdd()
    }
    onChange(value.filter((entry) => entry.id !== id))
  }

  function handleDraftChange(patch: Partial<JobReviewTimelineEntry>) {
    const nextDraft = { ...draft, ...patch }
    if (draftMode === 'add') syncAddDraft(nextDraft)
    else syncEditDraft(nextDraft)
  }

  const isEditing = draftMode === 'edit'

  return (
    <div className={cn('space-y-4', className)}>
      <GuideBox
        tone='update'
        title={isEditing ? '기존 기록 수정 중' : '이번에 추가할 1건'}
        description={
          isEditing
            ? '단계·플랫폼·서류·면접 기록을 고친 뒤, 아래 업데이트 버튼으로 저장해 주세요.'
            : '새 날짜를 고르고, 단계·플랫폼·서류·면접 중 필요한 항목만 선택해 적어 주세요.'
        }
      />

      <section className='space-y-2.5'>
        <div className='flex items-center justify-between gap-2'>
          <div>
            <p className='text-[14px] font-semibold text-[var(--brand)]'>
              {isEditing ? '선택한 기록 수정' : '새 진행 기록'}
            </p>
            <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
              {isEditing
                ? '수정이 끝나면 아래 업데이트 버튼으로 저장하세요'
                : '한 번에 한 건만 작성할 수 있어요'}
            </p>
          </div>
          {isEditing ? (
            <button
              type='button'
              onClick={cancelDraft}
              className='shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] ring-1 ring-black/[0.08] touch-manipulation hover:text-[var(--foreground)]'
            >
              추가 모드로
            </button>
          ) : null}
        </div>

        {!isEditing && canAddMore ? (
          <QuickStepButtons
            jobReviewType={jobReviewType}
            onApply={(patch) => handleDraftChange(patch)}
          />
        ) : null}

        <SingleEntryForm
          entry={draft}
          jobReviewType={jobReviewType}
          highlight
          onChange={handleDraftChange}
        />

        {!isEditing && isJobReviewTimelineEntryFilled(draft) ? (
          <button
            type='button'
            onClick={startAdd}
            className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
          >
            작성 내용 비우기
          </button>
        ) : null}
      </section>

      {savedEntries.length > 0 ? (
        <section className='space-y-2 rounded-2xl bg-[#f8f8f9] p-3 ring-1 ring-black/[0.04] sm:p-3.5'>
          <SectionHeading
            title={`이전 기록 ${savedEntries.length}건`}
            description='참고용이에요. 고칠 항목만 선택해 수정할 수 있습니다'
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
                  savedEntries.length > 1 || isJobReviewTimelineEntryFilled(draft)
                    ? () => removeSaved(entry.id)
                    : undefined
                }
              />
            )
          })}
        </section>
      ) : null}
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
  entry: JobReviewTimelineEntry
  index: number
  active: boolean
  onEdit: () => void
  onRemove?: () => void
}) {
  const summary = summarizeJobReviewTimelineEntry(entry)

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-2xl px-3.5 py-3 ring-1 sm:px-4',
        active
          ? 'bg-[#fff8f5] ring-[var(--brand)]/30'
          : 'bg-white ring-black/[0.06]',
      )}
    >
      <span className='inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[11px] font-bold text-[var(--muted)]'>
        {index + 1}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-[13px] font-semibold text-[var(--foreground)]'>
          {entry.date ? formatJobReviewDate(entry.date) : '날짜 없음'}
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
            수정
          </button>
        ) : (
          <span className='text-[11px] font-semibold text-[var(--brand)]'>
            수정 중
          </span>
        )}
        {onRemove ? (
          <button
            type='button'
            onClick={onRemove}
            className='text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
          >
            삭제
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
  onChange,
}: {
  entry: JobReviewTimelineEntry
  jobReviewType: JobReviewTypeId | null
  highlight?: boolean
  onChange: (patch: Partial<JobReviewTimelineEntry>) => void
}) {
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
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white ring-1',
        highlight
          ? 'ring-[var(--brand)]/35 shadow-[0_0_0_1px_rgba(246,67,16,0.06)]'
          : 'ring-black/[0.06]',
      )}
    >
      <div
        className={cn(
          'border-b border-black/[0.04] px-3.5 py-3 sm:px-4',
          highlight ? 'bg-[#fff8f5]' : 'bg-[#fafafa]',
        )}
      >
        <label className='block'>
          <span className='text-[12px] font-semibold text-[var(--foreground)]'>
            날짜
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
            기록할 항목 선택
          </p>
          <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
            해당하는 것만 골라 작성하세요. 여러 개 선택해도 됩니다.
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
                  {field.shortLabel}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className='space-y-2 p-3 sm:p-3.5'>
        {visibleFields.length === 0 ? (
          <p className='rounded-xl bg-[#f8f8f9] px-3.5 py-4 text-center text-[12px] leading-relaxed text-[var(--muted)]'>
            위에서 단계 · 플랫폼 · 서류 · 면접 · 결과 중 필요한 항목을 선택하거나, 아래 단계 후기만 작성해도 됩니다
          </p>
        ) : (
          visibleFields.map((field) => (
            <TimelineField
              key={field.key}
              field={field}
              value={entry[field.key]}
              placeholder={getJobReviewTimelinePlaceholder(jobReviewType, field.key)}
              onChange={(next) => onChange({ [field.key]: next })}
              onRemove={() => toggleField(field.key)}
            />
          ))
        )}

        <div className='rounded-xl border border-black/[0.06] bg-[#fafbfc] px-3 py-3 sm:px-3.5 sm:py-3.5'>
          <p className='text-[12px] font-semibold text-[var(--foreground)]'>
            단계 후기
          </p>
          <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
            질문, 분위기, 준비 팁, 피드백 등 이 단계에서 겪은 내용을 자유롭게
            적어 주세요.
          </p>
          <div className='mt-2.5'>
            <TipTapEditor
              value={entry.stageReviewHtml}
              onChange={(html) => onChange({ stageReviewHtml: html })}
              placeholder='예: OA는 LC medium 2문제, 90분이었어요. Phone은 resume deep dive + behavioral 위주였습니다.'
              minHeightClassName='min-h-[160px]'
              maxLength={JOB_REVIEW_STAGE_REVIEW_MAX}
            />
          </div>
        </div>
      </div>

      {!isJobReviewTimelineEntryFilled(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-[var(--muted)] sm:px-4'>
          날짜와 선택한 항목 또는 단계 후기를 입력해 주세요
        </p>
      ) : !isJobReviewTimelineEntryComplete(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-amber-700 sm:px-4'>
          날짜와 내용을 함께 입력해 주세요
        </p>
      ) : null}
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
  const quickSteps = jobReviewType ? JOB_REVIEW_QUICK_STEPS[jobReviewType] : []
  if (quickSteps.length === 0) return null

  return (
    <div className='flex flex-wrap gap-1.5'>
      <span className='mr-0.5 self-center text-[11px] font-medium text-[var(--muted)]'>
        빠른 입력
      </span>
      {quickSteps.map((step) => (
        <button
          key={step.label}
          type='button'
          onClick={() => onApply(step.patch)}
          className='rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:bg-[#fff8f5] hover:ring-[var(--brand)]/25'
        >
          {step.label}
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
          ? 'bg-[#fff8f5] ring-[var(--brand)]/15'
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
  return (
    <div className={cn('rounded-xl px-3 py-2.5', field.rowClass)}>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <p className={cn('text-[12px] font-semibold', field.labelClass)}>
            {field.label}
          </p>
          <p className='mt-0.5 text-[10px] text-[var(--muted)]'>{field.hint}</p>
        </div>
        {onRemove ? (
          <button
            type='button'
            onClick={onRemove}
            className='shrink-0 text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
          >
            빼기
          </button>
        ) : null}
      </div>
      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, JOB_REVIEW_FIELD_MAX))
        }
        maxLength={JOB_REVIEW_FIELD_MAX}
        rows={value.trim() ? 2 : 2}
        placeholder={placeholder}
        className='mt-2 w-full resize-none rounded-lg bg-white/80 px-2.5 py-2 text-[13px] leading-relaxed outline-none ring-1 ring-black/[0.05] transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30 sm:text-[14px]'
      />
    </div>
  )
}

const dateInputClass =
  'h-10 w-full rounded-lg bg-white px-2.5 text-[13px] font-semibold outline-none ring-1 ring-black/[0.08] transition focus:ring-[var(--brand)]/35 sm:text-[14px]'
