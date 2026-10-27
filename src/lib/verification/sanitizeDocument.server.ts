import { createHash } from 'node:crypto'

import type { ReviewDocMimeType } from './reviewDocs'

/**
 * Server-side clean-up of an uploaded verification file before it is stored (spec 5.2: remove EXIF incl. location).
 *
 * Images are re-encoded with `sharp` (bundled with Next.js for image optimization): orientation is applied, then a
 * fresh JPEG/PNG is written without EXIF, XMP, IPTC, ICC or text chunks (sharp drops metadata unless asked to keep it).
 * If sharp can't be loaded in the runtime, a byte-level stripper removes the metadata segments instead (JPEG APPn/COM
 * segments, PNG ancillary text/EXIF/time chunks) — no pixels change, nothing else is kept.
 * The output is stripped once more byte-level either way, so a metadata segment can never survive.
 *
 * PDFs are stored as uploaded (they carry no EXIF; the UI asks for screenshots and requires a mask confirmation for
 * PDFs). The type is detected from the bytes, never from the file name or the client's Content-Type.
 */

export class DocumentRejectedError extends Error {
  constructor(readonly code: 'unsupportedType' | 'heic' | 'invalidImage' | 'tooLarge' | 'empty') {
    super(code)
  }
}

export type SanitizedDocument = {
  bytes: Buffer
  mimeType: ReviewDocMimeType
  extension: 'jpg' | 'png' | 'pdf'
  sha256: string
  /** how metadata was removed: 'reencoded' (sharp), 'stripped' (byte-level), 'none' (pdf) */
  method: 'reencoded' | 'stripped' | 'none'
}

export function sniffDocumentType(bytes: Buffer): ReviewDocMimeType | 'heic' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png'
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = bytes.subarray(8, 12).toString('latin1')
    if (/^(heic|heix|hevc|heim|heis|mif1|msf1|avif)$/.test(brand)) return 'heic'
  }
  return null
}

export async function sanitizeDocument(input: Buffer, maxBytes: number): Promise<SanitizedDocument> {
  if (input.length === 0) throw new DocumentRejectedError('empty')
  if (input.length > maxBytes) throw new DocumentRejectedError('tooLarge')
  const type = sniffDocumentType(input)
  if (type === 'heic') throw new DocumentRejectedError('heic')
  if (!type) throw new DocumentRejectedError('unsupportedType')

  if (type === 'application/pdf') {
    return { bytes: input, mimeType: type, extension: 'pdf', sha256: sha256(input), method: 'none' }
  }

  let bytes: Buffer | null = await reencodeWithSharp(input, type)
  const method: SanitizedDocument['method'] = bytes ? 'reencoded' : 'stripped'
  if (!bytes) bytes = input
  bytes = type === 'image/jpeg' ? stripJpegMetadata(bytes) : stripPngMetadata(bytes)
  if (bytes.length > maxBytes) throw new DocumentRejectedError('tooLarge')
  return {
    bytes,
    mimeType: type,
    extension: type === 'image/jpeg' ? 'jpg' : 'png',
    sha256: sha256(bytes),
    method,
  }
}

export function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

type SharpFactory = (input: Buffer, options?: Record<string, unknown>) => {
  rotate: () => SharpPipeline
}
type SharpPipeline = {
  jpeg: (options: Record<string, unknown>) => SharpPipeline
  png: (options: Record<string, unknown>) => SharpPipeline
  toBuffer: () => Promise<Buffer>
}

let sharpLoader: Promise<SharpFactory | null> | null = null

function loadSharp() {
  sharpLoader ??= import('sharp')
    .then((mod) => ((mod as { default?: unknown }).default ?? mod) as SharpFactory)
    .catch((error) => {
      console.warn('sharp unavailable, verification images are stripped byte-level:', error?.message || error)
      return null
    })
  return sharpLoader
}

async function reencodeWithSharp(input: Buffer, type: 'image/jpeg' | 'image/png'): Promise<Buffer | null> {
  const sharp = await loadSharp()
  if (!sharp) return null
  try {
    // failOn 'error': truncated/corrupt images are refused; 100 MP is far above any screenshot or phone photo.
    const pipeline = sharp(input, { failOn: 'error', limitInputPixels: 100_000_000 }).rotate()
    return await (type === 'image/jpeg'
      ? pipeline.jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      : pipeline.png({ compressionLevel: 9 })
    ).toBuffer()
  } catch {
    throw new DocumentRejectedError('invalidImage')
  }
}

// MARK: byte-level stripping

/**
 * Removes every APPn segment except APP0 (JFIF) and APP14 (Adobe colour transform, needed to decode some files),
 * plus COM comments. APP1 = EXIF (incl. GPS) / XMP, APP2 = ICC / FlashPix, APP13 = IPTC/Photoshop.
 * Everything from SOS (start of scan) on is copied as-is.
 */
export function stripJpegMetadata(input: Buffer): Buffer {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) throw new DocumentRejectedError('invalidImage')
  const parts: Buffer[] = [input.subarray(0, 2)]
  let offset = 2
  while (offset < input.length) {
    if (input[offset] !== 0xff) throw new DocumentRejectedError('invalidImage')
    // fill bytes
    let markerAt = offset
    while (markerAt + 1 < input.length && input[markerAt + 1] === 0xff) markerAt += 1
    const marker = input[markerAt + 1]
    if (marker === undefined) throw new DocumentRejectedError('invalidImage')
    if (marker === 0xd9) {
      parts.push(input.subarray(markerAt, markerAt + 2))
      break
    }
    // standalone markers (no length)
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(markerAt, markerAt + 2))
      offset = markerAt + 2
      continue
    }
    if (markerAt + 4 > input.length) throw new DocumentRejectedError('invalidImage')
    const length = input.readUInt16BE(markerAt + 2)
    if (length < 2) throw new DocumentRejectedError('invalidImage')
    const end = markerAt + 2 + length
    if (end > input.length) throw new DocumentRejectedError('invalidImage')
    if (marker === 0xda) {
      // start of scan: the compressed image data follows; keep the rest of the file
      parts.push(input.subarray(markerAt))
      break
    }
    const isApp = marker >= 0xe0 && marker <= 0xef
    const keep = !(isApp && marker !== 0xe0 && marker !== 0xee) && marker !== 0xfe
    if (keep) parts.push(input.subarray(markerAt, end))
    offset = end
  }
  return Buffer.concat(parts)
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
/** Chunks needed to draw the image. Text (tEXt/zTXt/iTXt), eXIf, tIME, iCCP and private chunks are dropped. */
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'sBIT', 'bKGD', 'pHYs'])

export function stripPngMetadata(input: Buffer): Buffer {
  if (input.length < 8 || !input.subarray(0, 8).equals(PNG_SIGNATURE)) throw new DocumentRejectedError('invalidImage')
  const parts: Buffer[] = [PNG_SIGNATURE]
  let offset = 8
  let sawEnd = false
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset)
    const type = input.subarray(offset + 4, offset + 8).toString('latin1')
    const end = offset + 12 + length
    if (end > input.length) throw new DocumentRejectedError('invalidImage')
    if (PNG_KEEP.has(type)) parts.push(input.subarray(offset, end))
    offset = end
    if (type === 'IEND') {
      sawEnd = true
      break
    }
  }
  if (!sawEnd) throw new DocumentRejectedError('invalidImage')
  return Buffer.concat(parts)
}
