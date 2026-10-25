import type { Translate } from '@lib/i18n/translate'
import { compressImageForUpload } from '@lib/utils/compressImage'

/**
 * 커뮤니티 이미지 업로드 (기기 파일 → 압축 → Supabase public URL)
 * `t`는 community 네임스페이스 번역기 — 서버 에러가 없을 때 보여 줄 문구에 쓴다.
 */
export async function uploadCommunityImageFile(
  file: File,
  t: Translate,
): Promise<string> {
  const optimized = await compressImageForUpload(file)

  const form = new FormData()
  form.append('file', optimized)

  const res = await fetch('/api/community/upload', {
    method: 'POST',
    body: form,
  })
  const data = (await res.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null

  if (!res.ok || !data?.url) {
    throw new Error(
      data?.error || t('errors.uploadFailed'),
    )
  }
  return data.url
}
