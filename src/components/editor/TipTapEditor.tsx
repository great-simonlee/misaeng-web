'use client'

import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'

import { uploadCommunityImageFile } from '@lib/community/upload.client'
import { cn } from '@lib'

type TipTapEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeightClassName?: string
  /** 플레인 텍스트 기준 최대 글자 수 */
  maxLength?: number
}

export function TipTapEditor({
  value,
  onChange,
  placeholder = '내용을 입력해 주세요',
  className,
  minHeightClassName = 'min-h-[220px]',
  maxLength,
}: TipTapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const maxLengthRef = useRef(maxLength)
  const [uploading, setUploading] = useState(false)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    maxLengthRef.current = maxLength
  }, [maxLength])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#F64310] underline underline-offset-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-xl',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose-community outline-none',
          minHeightClassName,
          'px-3 py-3',
        ),
      },
      handleTextInput(view, from, to, text) {
        const limit = maxLengthRef.current
        if (limit == null) return false
        const size = view.state.doc.textContent.length
        const deleted = view.state.doc.textBetween(from, to).length
        if (size - deleted + text.length > limit) return true
        return false
      },
      handlePaste(view, event, _slice) {
        const limit = maxLengthRef.current
        if (limit == null) return false
        const pasted = event.clipboardData?.getData('text/plain') ?? ''
        if (!pasted) return false
        const size = view.state.doc.textContent.length
        const { from, to } = view.state.selection
        const deleted = view.state.doc.textBetween(from, to).length
        const remaining = limit - (size - deleted)
        if (remaining <= 0) {
          event.preventDefault()
          return true
        }
        if (pasted.length <= remaining) return false
        event.preventDefault()
        view.dispatch(view.state.tr.insertText(pasted.slice(0, remaining)))
        return true
      },
    },
    onUpdate: ({ editor: next }) => {
      setCharCount(next.state.doc.textContent.length)
      onChange(next.getHTML())
    },
    onCreate: ({ editor: next }) => {
      setCharCount(next.state.doc.textContent.length)
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', { emitUpdate: false })
      setCharCount(editor.state.doc.textContent.length)
    }
  }, [editor, value])

  async function handleImageFiles(files: FileList | null) {
    if (!editor || !files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const url = await uploadCommunityImageFile(file)
        editor.chain().focus().setImage({ src: url }).run()
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : '이미지 업로드에 실패했어요',
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-2xl bg-white ring-1 ring-black/[0.06]',
          minHeightClassName,
          className,
        )}
      />
    )
  }

  const atLimit = maxLength != null && charCount >= maxLength

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] focus-within:ring-[var(--brand)]/30',
        className,
      )}
    >
      <div className='flex flex-wrap gap-1 border-b border-black/[0.05] bg-[#f8f8f9] px-2.5 py-2'>
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label='굵게'
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label='기울임'
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label='제목'
        />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label='목록'
        />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label='인용'
        />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('링크 URL을 입력하세요')
            if (!url) return
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run()
          }}
          label='링크'
        />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          label={uploading ? '업로드 중…' : '사진'}
          disabled={uploading}
        />
      </div>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        onChange={(e) => void handleImageFiles(e.target.files)}
      />
      <EditorContent editor={editor} />
      {maxLength != null ? (
        <div className='flex items-center justify-between border-t border-black/[0.04] px-3 py-2'>
          <p className='text-[11px] text-[var(--muted)]'>
            {atLimit ? '최대 글자 수에 도달했어요' : '텍스트 기준 글자 수'}
          </p>
          <p
            className={cn(
              'text-[11px] font-medium tabular-nums',
              atLimit ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
            )}
          >
            {charCount.toLocaleString('en-US')}/
            {maxLength.toLocaleString('en-US')}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-[12px] font-medium touch-manipulation transition disabled:opacity-50',
        active
          ? 'bg-[var(--foreground)] text-white'
          : 'text-[var(--muted-foreground)] hover:bg-black/[0.05] hover:text-[var(--foreground)]',
      )}
    >
      {label}
    </button>
  )
}
