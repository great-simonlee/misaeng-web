'use client'

import type { ReviewDocKind, ReviewDocListResponse, ReviewDocSubmission } from './reviewDocs'
import {
  REVIEW_DOC_CONSENT_VERSION,
  REVIEW_DOC_RENDER_MAX_SIDE,
  REVIEW_DOC_UPLOAD_TARGET_BYTES,
} from './reviewDocs'

/** Browser helpers for review verification documents (API calls + masking render). */

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok) throw new Error(data?.error || fallback)
  return data as T
}

export async function fetchReviewDocs(postId?: string, fallbackError = 'Failed'): Promise<ReviewDocListResponse> {
  const query = postId ? `?postId=${encodeURIComponent(postId)}` : ''
  const res = await fetch(`/api/verifications${query}`, { credentials: 'include', cache: 'no-store' })
  return readJson<ReviewDocListResponse>(res, fallbackError)
}

export async function submitReviewDocs(
  input: { postId: string; kind: ReviewDocKind; files: { blob: Blob; name: string }[] },
  fallbackError = 'Failed',
): Promise<ReviewDocSubmission | null> {
  const form = new FormData()
  form.set('postId', input.postId)
  form.set('kind', input.kind)
  form.set('consent', 'true')
  form.set('consentVersion', REVIEW_DOC_CONSENT_VERSION)
  form.set('source', 'web')
  for (const file of input.files) form.append('files', file.blob, file.name)
  const res = await fetch('/api/verifications', { method: 'POST', body: form, credentials: 'include' })
  return (await readJson<{ submission: ReviewDocSubmission | null }>(res, fallbackError)).submission
}

export async function deleteReviewDoc(id: string, fallbackError = 'Failed'): Promise<ReviewDocSubmission | null> {
  const res = await fetch(`/api/verifications/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
  return (await readJson<{ submission: ReviewDocSubmission | null }>(res, fallbackError)).submission
}

// MARK: images

export type MaskBox = { x: number; y: number; w: number; h: number }
export type LoadedImage = { source: CanvasImageSource; width: number; height: number; close: () => void }

/** Decodes a picked file (orientation applied by the browser). HEIC works where the browser can decode it (Safari). */
export async function loadImageFile(file: Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const MAX_SIDE = REVIEW_DOC_RENDER_MAX_SIDE

/**
 * Flattens the image with the black boxes burned in and returns a JPEG. A canvas export carries no EXIF/GPS, so the
 * masked pixels and nothing else leave the browser. Boxes are in image pixels.
 */
export async function renderMaskedJpeg(image: LoadedImage, boxes: MaskBox[]): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image.source, 0, 0, width, height)
  ctx.fillStyle = '#000000'
  for (const box of boxes) {
    // a pixel of overlap on every side so anti-aliased edges never leak
    ctx.fillRect(
      Math.floor(box.x * scale) - 1,
      Math.floor(box.y * scale) - 1,
      Math.ceil(box.w * scale) + 2,
      Math.ceil(box.h * scale) + 2,
    )
  }
  // Text must stay readable for the reviewer, so quality only steps down until the render fits the target.
  let blob: Blob | null = null
  for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= REVIEW_DOC_UPLOAD_TARGET_BYTES) break
  }
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('tooLarge')
  return blob
}
