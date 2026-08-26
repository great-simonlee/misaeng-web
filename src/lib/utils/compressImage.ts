/**
 * 커뮤니티 이미지 업로드 전 클라이언트 리사이즈·압축.
 * 휴대폰 원본(수 MB)을 빠르게 올리도록 화질보다 용량·로딩을 우선한다.
 * 실패 시 원본을 반환한다.
 */

/** 휴대폰 사진 기준: 카드·상세에 충분한 해상도 */
export const IMAGE_COMPRESS_MAX_EDGE = 1280
/** 모바일 화면에서 체감 화질은 유지하되 용량을 크게 줄임 */
export const IMAGE_COMPRESS_QUALITY = 0.65
/** 이보다 작으면 재인코딩 스킵 (이미 가벼운 파일) */
export const IMAGE_COMPRESS_SKIP_BYTES = 180 * 1024
/** 목표 상한 — 넘으면 품질을 더 낮춰 재압축 */
export const IMAGE_COMPRESS_TARGET_MAX_BYTES = 420 * 1024

const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml'])

function canUseCanvas() {
  return typeof document !== 'undefined' && typeof createImageBitmap === 'function'
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, {
      imageOrientation: 'from-image',
    } as ImageBitmapOptions)
  } catch {
    return await createImageBitmap(file)
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function replaceExtension(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}.${ext}`
}

/**
 * 긴 변을 maxEdge 이하로 맞추고 JPEG로 압축한 File을 반환.
 * GIF/SVG·디코드 실패·이미 작은 파일은 원본을 그대로 반환.
 */
export async function compressImageForUpload(
  file: File,
  options?: {
    maxEdge?: number
    quality?: number
    skipBelowBytes?: number
    targetMaxBytes?: number
  },
): Promise<File> {
  if (!canUseCanvas()) return file
  if (!file.type.startsWith('image/')) return file
  if (SKIP_TYPES.has(file.type.toLowerCase())) return file

  const maxEdge = options?.maxEdge ?? IMAGE_COMPRESS_MAX_EDGE
  const quality = options?.quality ?? IMAGE_COMPRESS_QUALITY
  const skipBelow = options?.skipBelowBytes ?? IMAGE_COMPRESS_SKIP_BYTES
  const targetMaxBytes =
    options?.targetMaxBytes ?? IMAGE_COMPRESS_TARGET_MAX_BYTES

  let bitmap: ImageBitmap
  try {
    bitmap = await decodeImage(file)
  } catch {
    return file
  }

  try {
    const { width, height } = bitmap
    if (!width || !height) return file

    const longest = Math.max(width, height)
    const needsResize = longest > maxEdge
    const needsReencode =
      needsResize ||
      file.size > skipBelow ||
      !['image/jpeg', 'image/jpg', 'image/webp'].includes(
        file.type.toLowerCase(),
      )

    if (!needsReencode) return file

    const scale = needsResize ? maxEdge / longest : 1
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // JPEG는 알파 없음 → 흰 배경으로 PNG/투명 영역 처리
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)

    // 품질을 단계적으로 낮춰 목표 용량에 맞춤 (휴대폰 대용량 대응)
    const qualitySteps = [
      quality,
      Math.min(quality, 0.58),
      0.5,
      0.42,
    ]
    let bestBlob: Blob | null = null

    for (const q of qualitySteps) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', q)
      if (!blob || blob.size === 0) continue
      bestBlob = blob
      if (blob.size <= targetMaxBytes) break
    }

    if (!bestBlob) return file

    // 리사이즈도 안 했는데 결과가 더 크면 원본 유지
    if (bestBlob.size >= file.size && !needsResize) return file

    return new File([bestBlob], replaceExtension(file.name || 'photo', 'jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close()
  }
}
