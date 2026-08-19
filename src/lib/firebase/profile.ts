import type { User } from 'firebase/auth'

import type { NycUserProfile } from '@/types/nyc'

// 임시: 파이어베이스 Profile 연동 비활성화
// import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Timestamp, type Unsubscribe } from 'firebase/firestore'
// import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
// import { getFirebaseDb, getFirebaseStorage } from './client'

export const MIN_NICKNAME_LEN = 2
export const MAX_NICKNAME_LEN = 20

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export async function getUserProfile(
  _uid: string,
): Promise<NycUserProfile | null> {
  return null
}

export async function ensureUserProfile(
  _user: User,
): Promise<NycUserProfile> {
  throw new Error(DISABLED_MESSAGE)
}

export function subscribeUserProfile(
  _uid: string,
  onChange: (profile: NycUserProfile | null) => void,
): () => void {
  onChange(null)
  return () => {}
}

export async function uploadProfilePhoto(
  _user: User,
  _file: File,
): Promise<string> {
  throw new Error(DISABLED_MESSAGE)
}

export async function updateNickname(
  _user: User,
  _nickname: string,
): Promise<string> {
  throw new Error(DISABLED_MESSAGE)
}

export async function updateMbti(
  _user: User,
  _mbti: string | null,
): Promise<string | null> {
  throw new Error(DISABLED_MESSAGE)
}

export async function updateDisplayName(
  user: User,
  displayName: string,
): Promise<void> {
  await updateNickname(user, displayName)
}

export async function setSchoolEmailVerified(
  _user: User,
  _schoolEmail: string,
): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}

export async function clearSchoolEmailVerification(_user: User): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}

export async function setPhoneVerified(
  _user: User,
  _phone: string,
): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}

export async function clearPhoneVerification(_user: User): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}

type OtpChannel = 'school' | 'phone'

export async function reserveOtpSend(
  _user: User,
  _channel: OtpChannel,
  _opts: {
    dailyMax: number
    cooldownMs: number
  },
): Promise<{ remainingToday: number }> {
  throw new Error(DISABLED_MESSAGE)
}

export async function rollbackOtpSend(
  _user: User,
  _channel: OtpChannel,
): Promise<void> {
  return
}
