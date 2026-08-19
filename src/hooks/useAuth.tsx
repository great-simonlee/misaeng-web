'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { isMisaengEmail } from '@lib/constants/nyc'
import type { AuthUser } from '@/types/auth'
import type { NycUserProfile } from '@/types/nyc'

interface AuthContextValue {
  user: AuthUser | null
  profile: NycUserProfile | null
  /** 미생에 등록한 사진 우선, 없으면 null(기본 아이콘) */
  avatarURL: string | null
  /** 닉네임 우선, 없으면 계정 이름 */
  displayName: string
  nickname: string | null
  loading: boolean
  configured: boolean
  isMisaengUser: boolean
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  signInGoogle: (params: {
    idToken: string
    email?: string | null
    name?: string | null
  }) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  saveNickname: (nickname: string) => Promise<string>
  saveMbti: (mbti: string | null) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface SessionResponse {
  configured: boolean
  connected: boolean
  user: AuthUser | null
  profile?: Record<string, unknown> | null
}

function mapProfile(uid: string, email: string, raw: Record<string, unknown> | null | undefined): NycUserProfile {
  const now = Date.now()

  return {
    uid,
    email,
    displayName: typeof raw?.name === 'string' ? raw.name : null,
    nickname: typeof raw?.nickname === 'string' ? raw.nickname : null,
    mbti: typeof raw?.mbti === 'string' ? raw.mbti : null,
    photoURL:
      typeof raw?.photoURL === 'string'
        ? raw.photoURL
        : typeof raw?.profileImage === 'string'
          ? raw.profileImage
          : null,
    roommatePostId: null,
    schoolEmail: typeof raw?.schoolEmail === 'string' ? raw.schoolEmail : null,
    schoolEmailVerified: Boolean(raw?.schoolEmailVerified),
    verifiedSchoolId:
      typeof raw?.verifiedSchoolId === 'string' ? raw.verifiedSchoolId : null,
    verifiedSchoolName:
      typeof raw?.verifiedSchoolName === 'string'
        ? raw.verifiedSchoolName
        : null,
    phone: typeof raw?.phone === 'string' ? raw.phone : null,
    phoneVerified: Boolean(raw?.phoneVerified),
    instagramHandle: null,
    instagramVerified: false,
    otpQuota: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<NycUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch('/api/agent-auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      const data = (await response.json().catch(() => null)) as
        | SessionResponse
        | null

      if (!data) {
        setConfigured(true)
        setUser(null)
        setProfile(null)
        return
      }

      setConfigured(Boolean(data.configured))
      setUser(data.user ?? null)

      if (data.user) {
        const rawProfile =
          data.profile &&
          typeof data.profile === 'object' &&
          'data' in data.profile
            ? (data.profile.data as Record<string, unknown>)
            : (data.profile as Record<string, unknown> | null | undefined)

        setProfile(mapProfile(data.user.uid, data.user.email, rawProfile ?? null))
      } else {
        setProfile(null)
      }
    } catch {
      setConfigured(true)
      setUser(null)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadSession])

  const signInEmailFn = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/agent-auth/email', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'login',
        email,
        password,
      }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      throw new Error(data?.error || '로그인에 실패했어요')
    }

    await loadSession()
  }, [loadSession])

  const signUpEmailFn = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/agent-auth/email', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'signup',
        email,
        password,
      }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      throw new Error(data?.error || '회원가입에 실패했어요')
    }

    await loadSession()
  }, [loadSession])

  const signInGoogleFn = useCallback(
    async (params: { idToken: string; email?: string | null; name?: string | null }) => {
      const response = await fetch('/api/agent-auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: params.idToken,
          email: params.email,
          name: params.name,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(data?.error || 'Google 로그인에 실패했어요')
      }

      await loadSession()
    },
    [loadSession],
  )

  const resetPasswordFn = useCallback(async (email: string) => {
    const response = await fetch('/api/agent-auth/email', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'reset',
        email,
      }),
    })
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      throw new Error(data?.error || '비밀번호 재설정 요청에 실패했어요')
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/agent-auth/session', {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null)
    setUser(null)
    setProfile(null)
  }, [])

  const uploadAvatar = useCallback(
    async (_file: File) => {
      if (!user) throw new Error('로그인이 필요해요')
      const formData = new FormData()
      formData.append('file', _file)

      const response = await fetch('/api/agent-auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = (await response.json().catch(() => null)) as
        | { error?: string; photoURL?: string }
        | null

      if (!response.ok || !data?.photoURL) {
        throw new Error(data?.error || '프로필 사진 업로드에 실패했어요')
      }

      setProfile((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          photoURL: data.photoURL ?? prev.photoURL,
          updatedAt: Date.now(),
        }
      })

      return data.photoURL
    },
    [user],
  )

  const saveNickname = useCallback(
    async (_nickname: string) => {
      if (!user) throw new Error('로그인이 필요해요')
      const response = await fetch('/api/agent-auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: _nickname }),
      })
      const data = (await response.json().catch(() => null)) as
        | { error?: string; profile?: Record<string, unknown> }
        | null
      if (!response.ok) {
        throw new Error(data?.error || '닉네임 저장에 실패했어요')
      }
      setProfile(mapProfile(user.uid, user.email, data?.profile ?? null))
      return _nickname.trim()
    },
    [user],
  )

  const saveMbti = useCallback(
    async (_mbti: string | null) => {
      if (!user) throw new Error('로그인이 필요해요')
      const response = await fetch('/api/agent-auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mbti: _mbti }),
      })
      const data = (await response.json().catch(() => null)) as
        | { error?: string; profile?: Record<string, unknown> }
        | null
      if (!response.ok) {
        throw new Error(data?.error || 'MBTI 저장에 실패했어요')
      }
      setProfile(mapProfile(user.uid, user.email, data?.profile ?? null))
      return _mbti?.trim().toUpperCase() || null
    },
    [user],
  )

  const displayName =
    profile?.nickname?.trim() ||
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    '회원'

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      avatarURL: profile?.photoURL ?? null,
      displayName,
      nickname: profile?.nickname ?? null,
      loading,
      configured,
      isMisaengUser: isMisaengEmail(user?.email),
      signInEmail: signInEmailFn,
      signUpEmail: signUpEmailFn,
      signInGoogle: signInGoogleFn,
      resetPassword: resetPasswordFn,
      logout,
      uploadAvatar,
      saveNickname,
      saveMbti,
    }),
    [
      user,
      profile,
      displayName,
      loading,
      configured,
      signInEmailFn,
      signUpEmailFn,
      signInGoogleFn,
      resetPasswordFn,
      logout,
      uploadAvatar,
      saveNickname,
      saveMbti,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다')
  }
  return ctx
}
