'use client'

import { useMemo, useState } from 'react'

import { cn } from '@lib'
import {
  CPT_OPT_FIELD_MAX,
  CPT_OPT_QUICK_STEPS,
  CPT_OPT_TIMELINE_FIELDS,
  CPT_OPT_TIMELINE_MAX,
  createEmptyTimelineEntry,
  formatCptOptDate,
  getCptOptTimelinePlaceholder,
  isTimelineEntryComplete,
  isTimelineEntryFilled,
  sortTimelineByDate,
  summarizeTimelineEntry,
  type CptOptTimelineEntry,
  type CptOptTimelineFieldKey,
  type CptOptTypeId,
} from '@lib/community/cptOpt'

type DraftMode = 'add' | 'edit'

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
  const entry = value[0] ?? createEmptyTimelineEntry()

  function updateEntry(patch: Partial<CptOptTimelineEntry>) {
    onChange([{ ...entry, ...patch }])
  }

  return (
    <div className={cn('space-y-3', className)}>
      <GuideBox
        tone='create'
        title='신분 서류 시작점만 남겨 주세요'
        description='날짜를 고른 뒤, 준비·제출·결과·다음 스텝 중 해당하는 항목만 선택해서 적으면 됩니다. 나중에 업데이트로 이어서 추가할 수 있어요.'
      />
      <QuickStepButtons
        cptOptType={cptOptType}
        onApply={(patch) => updateEntry(patch)}
      />
      <SingleEntryForm
        entry={entry}
        cptOptType={cptOptType}
        onChange={updateEntry}
      />
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
  const savedEntries = useMemo(
    () =>
      sortTimelineByDate(
        value.filter((entry) => existingIdSet.has(entry.id)),
      ),
    [value, existingIdSet],
  )

  const [draftMode, setDraftMode] = useState<DraftMode>('add')
  const [draft, setDraft] = useState(() => createEmptyTimelineEntry())
  const [editSnapshot, setEditSnapshot] = useState<CptOptTimelineEntry | null>(
    null,
  )

  const canAddMore = value.length < CPT_OPT_TIMELINE_MAX

  function syncAddDraft(nextDraft: CptOptTimelineEntry) {
    setDraft(nextDraft)
    const withoutDraft = value.filter((entry) => existingIdSet.has(entry.id))
    onChange(
      isTimelineEntryFilled(nextDraft)
        ? [...withoutDraft, nextDraft]
        : withoutDraft,
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

  function startEdit(entry: CptOptTimelineEntry) {
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

  function handleDraftChange(patch: Partial<CptOptTimelineEntry>) {
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
            ? '준비·제출·결과 수령·다음 스텝을 고친 뒤, 아래 업데이트 버튼으로 저장해 주세요.'
            : '새 날짜를 고르고, 준비·제출·결과·다음 스텝 중 필요한 항목만 선택해 적어 주세요.'
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
            cptOptType={cptOptType}
            onApply={(patch) => handleDraftChange(patch)}
          />
        ) : null}

        <SingleEntryForm
          entry={draft}
          cptOptType={cptOptType}
          highlight
          onChange={handleDraftChange}
        />

        {!isEditing && isTimelineEntryFilled(draft) ? (
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
                  savedEntries.length > 1 || isTimelineEntryFilled(draft)
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
  entry: CptOptTimelineEntry
  index: number
  active: boolean
  onEdit: () => void
  onRemove?: () => void
}) {
  const summary = summarizeTimelineEntry(entry)

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
          {entry.date ? formatCptOptDate(entry.date) : '날짜 없음'}
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
  cptOptType,
  highlight = false,
  onChange,
}: {
  entry: CptOptTimelineEntry
  cptOptType: CptOptTypeId | null
  highlight?: boolean
  onChange: (patch: Partial<CptOptTimelineEntry>) => void
}) {
  const contentKeys = useMemo(
    () =>
      CPT_OPT_TIMELINE_FIELDS.filter((field) => entry[field.key].trim()).map(
        (field) => field.key,
      ),
    [entry],
  )
  const [entryId, setEntryId] = useState(entry.id)
  const [selectedKeys, setSelectedKeys] = useState<Set<CptOptTimelineFieldKey>>(
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

  function toggleField(key: CptOptTimelineFieldKey) {
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

  const visibleFields = CPT_OPT_TIMELINE_FIELDS.filter((field) =>
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
            {CPT_OPT_TIMELINE_FIELDS.map((field) => {
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
            위에서 준비 · 제출 · 결과 · 다음 스텝 중 필요한 항목을 선택해 주세요
          </p>
        ) : (
          visibleFields.map((field) => (
            <TimelineField
              key={field.key}
              field={field}
              value={entry[field.key]}
              placeholder={getCptOptTimelinePlaceholder(cptOptType, field.key)}
              onChange={(next) => onChange({ [field.key]: next })}
              onRemove={() => toggleField(field.key)}
            />
          ))
        )}
      </div>

      {!isTimelineEntryFilled(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-[var(--muted)] sm:px-4'>
          날짜와 선택한 항목의 내용을 입력해 주세요
        </p>
      ) : !isTimelineEntryComplete(entry) ? (
        <p className='border-t border-black/[0.04] px-3.5 py-2 text-[11px] text-amber-700 sm:px-4'>
          날짜와 내용을 함께 입력해 주세요
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
  const quickSteps = cptOptType ? CPT_OPT_QUICK_STEPS[cptOptType] : []
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
  field: (typeof CPT_OPT_TIMELINE_FIELDS)[number]
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
