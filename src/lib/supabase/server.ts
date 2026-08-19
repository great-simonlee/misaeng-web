import { createClient } from '@supabase/supabase-js'

let serviceClient: ReturnType<typeof createClient> | null = null

export function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase 서버 클라이언트 설정이 없습니다. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  serviceClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })

  return serviceClient
}

export function getSupabaseAvatarBucket() {
  return process.env.SUPABASE_AVATAR_BUCKET?.trim() || 'avatars'
}
