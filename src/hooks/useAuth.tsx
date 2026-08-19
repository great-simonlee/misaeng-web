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
import type { User } from 'firebase/auth'

// 임시: 파이어베이스 Auth/Profile 연동 비활성화
// import {
//   signInWithEmail,
//   signInWithGoogle,
//   signOutUser,
//   signUpWithEmail,
//   sendPasswordReset,
//   subscribeToAuth,
// } from '@lib/firebase/auth'
import { isFirebaseConfigured } from '@lib/firebase/client'
import { isMisaengEmail } from '@lib/constants/nyc'
// import {
//   ensureUserProfile,
//   subscribeUserProfile,
//   updateNickname,
//   updateMbti,
//   uploadProfilePhoto,
// } from '@lib/firebase/profile'
import type { NycUserProfile } from '@/types/nyc'

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

interface AuthContextValue {
  user: User | null
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
  signInGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  saveNickname: (nickname: string) => Promise<string>
  saveMbti: (mbti: string | null) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<NycUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = isFirebaseConfigured()

  useEffect(() => {
    // 임시: 파이어베이스 Auth 구독 비활성화
    setUser(null)
    setProfile(null)
    setLoading(false)
    /*
    if (!configured) {
      setLoading(false)
      return
    }
    const unsub = subscribeToAuth((next) => {
      setUser(next)
      if (!next) {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsub
    */
  }, [configured])

  useEffect(() => {
    // 임시: 파이어베이스 프로필 구독 비활성화
    return
    /*
    if (!configured || !user) return

    let unsubProfile: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      try {
        await ensureUserProfile(user)
        if (cancelled) return
        unsubProfile = subscribeUserProfile(user.uid, (next) => {
          setProfile(next)
          setLoading(false)
        })
      } catch {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      unsubProfile?.()
    }
    */
  }, [configured, user])

  const signInEmailFn = useCallback(async (_email: string, _password: string) => {
    throw new Error(DISABLED_MESSAGE)
    // await signInWithEmail(email, password)
  }, [])

  const signUpEmailFn = useCallback(async (_email: string, _password: string) => {
    throw new Error(DISABLED_MESSAGE)
    // await signUpWithEmail(email, password)
  }, [])

  const signInGoogleFn = useCallback(async () => {
    throw new Error(DISABLED_MESSAGE)
    // await signInWithGoogle()
  }, [])

  const resetPasswordFn = useCallback(async (_email: string) => {
    throw new Error(DISABLED_MESSAGE)
    // await sendPasswordReset(email)
  }, [])

  const logout = useCallback(async () => {
    // await signOutUser()
    setProfile(null)
  }, [])

  const uploadAvatar = useCallback(
    async (_file: File) => {
      if (!user) throw new Error('로그인이 필요해요')
      throw new Error(DISABLED_MESSAGE)
      // return uploadProfilePhoto(user, file)
    },
    [user],
  )

  const saveNickname = useCallback(
    async (_nickname: string) => {
      if (!user) throw new Error('로그인이 필요해요')
      throw new Error(DISABLED_MESSAGE)
      // return updateNickname(user, nickname)
    },
    [user],
  )

  const saveMbti = useCallback(
    async (_mbti: string | null) => {
      if (!user) throw new Error('로그인이 필요해요')
      throw new Error(DISABLED_MESSAGE)
      // return updateMbti(user, mbti)
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
