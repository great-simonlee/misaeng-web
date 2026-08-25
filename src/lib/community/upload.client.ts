/** 커뮤니티 이미지 업로드 (기기 파일 → Supabase public URL) */
export async function uploadCommunityImageFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/community/upload', {
    method: 'POST',
    body: form,
  })
  const data = (await res.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null

  if (!res.ok || !data?.url) {
    throw new Error(data?.error || '이미지 업로드에 실패했어요')
  }
  return data.url
}
