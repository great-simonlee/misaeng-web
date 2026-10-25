import { createClient } from '@supabase/supabase-js'

import { ApiMessageError } from '@lib/i18n/apiError'

let serviceClient: ReturnType<typeof createClient> | null = null

export function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceRoleKey) {
    throw new ApiMessageError(
      'Supabase server client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'common.supabaseNotConfiguredDetail',
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
