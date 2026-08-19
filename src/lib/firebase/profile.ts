import type { User } from 'firebase/auth'
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import type { NycUserProfile } from '@/types/nyc'
import { getFirebaseDb, getFirebaseStorage } from './client'

export const MIN_NICKNAME_LEN = 2
export const MAX_NICKNAME_LEN = 20

const USERS_COLLECTION = 'nycUsers'

function getUserProfileRef(uid: string) {
  return doc(getFirebaseDb(), USERS_COLLECTION, uid)
}

function toMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis()
  }

  return Date.now()
}

function buildDefaultProfile(user: User): NycUserProfile {
  const now = Date.now()

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? null,
    nickname: user.displayName ?? null,
    mbti: null,
    photoURL: user.photoURL ?? null,
    roommatePostId: null,
    schoolEmail: null,
    schoolEmailVerified: false,
    verifiedSchoolId: null,
    verifiedSchoolName: null,
    phone: user.phoneNumber ?? null,
    phoneVerified: false,
    instagramHandle: null,
    instagramVerified: false,
    otpQuota: null,
    createdAt: now,
    updatedAt: now,
  }
}

function mapProfile(uid: string, raw: DocumentData | undefined): NycUserProfile | null {
  if (!raw) return null

  return {
    uid,
    email: typeof raw.email === 'string' ? raw.email : '',
    displayName: typeof raw.displayName === 'string' ? raw.displayName : null,
    nickname: typeof raw.nickname === 'string' ? raw.nickname : null,
    mbti: typeof raw.mbti === 'string' ? raw.mbti : null,
    photoURL: typeof raw.photoURL === 'string' ? raw.photoURL : null,
    roommatePostId:
      typeof raw.roommatePostId === 'string' ? raw.roommatePostId : null,
    schoolEmail: typeof raw.schoolEmail === 'string' ? raw.schoolEmail : null,
    schoolEmailVerified: Boolean(raw.schoolEmailVerified),
    verifiedSchoolId:
      typeof raw.verifiedSchoolId === 'string' ? raw.verifiedSchoolId : null,
    verifiedSchoolName:
      typeof raw.verifiedSchoolName === 'string'
        ? raw.verifiedSchoolName
        : null,
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    phoneVerified: Boolean(raw.phoneVerified),
    instagramHandle:
      typeof raw.instagramHandle === 'string' ? raw.instagramHandle : null,
    instagramVerified: Boolean(raw.instagramVerified),
    otpQuota:
      raw.otpQuota &&
      typeof raw.otpQuota === 'object' &&
      typeof raw.otpQuota.dayKey === 'string'
        ? {
            dayKey: raw.otpQuota.dayKey,
            schoolSendCount: Number(raw.otpQuota.schoolSendCount ?? 0),
            phoneSendCount: Number(raw.otpQuota.phoneSendCount ?? 0),
            schoolLastSentAt: Number(raw.otpQuota.schoolLastSentAt ?? 0),
            phoneLastSentAt: Number(raw.otpQuota.phoneLastSentAt ?? 0),
          }
        : null,
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  }
}

export async function getUserProfile(
  uid: string,
): Promise<NycUserProfile | null> {
  const snapshot = await getDoc(getUserProfileRef(uid))
  return mapProfile(uid, snapshot.data())
}

export async function ensureUserProfile(
  user: User,
): Promise<NycUserProfile> {
  const profileRef = getUserProfileRef(user.uid)
  const snapshot = await getDoc(profileRef)
  const existing = mapProfile(user.uid, snapshot.data())

  if (existing) {
    const patch: Record<string, unknown> = {}

    if (!existing.email && user.email) patch.email = user.email
    if (!existing.displayName && user.displayName) patch.displayName = user.displayName
    if (!existing.photoURL && user.photoURL) patch.photoURL = user.photoURL
    if (!existing.phone && user.phoneNumber) patch.phone = user.phoneNumber

    if (Object.keys(patch).length > 0) {
      await updateDoc(profileRef, {
        ...patch,
        updatedAt: serverTimestamp(),
      })
      return (await getUserProfile(user.uid)) ?? {
        ...existing,
        ...patch,
      }
    }

    return existing
  }

  const nextProfile = buildDefaultProfile(user)

  await setDoc(profileRef, {
    ...nextProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return (await getUserProfile(user.uid)) ?? nextProfile
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: NycUserProfile | null) => void,
): () => void {
  return onSnapshot(getUserProfileRef(uid), (snapshot) => {
    onChange(mapProfile(uid, snapshot.data()))
  })
}

export async function uploadProfilePhoto(
  user: User,
  file: File,
): Promise<string> {
  const fileRef = ref(getFirebaseStorage(), `nyc-users/${user.uid}/avatar`)
  await uploadBytes(fileRef, file, {
    contentType: file.type || 'application/octet-stream',
  })

  const photoURL = await getDownloadURL(fileRef)

  await updateDoc(getUserProfileRef(user.uid), {
    photoURL,
    updatedAt: serverTimestamp(),
  })

  return photoURL
}

export async function updateNickname(
  user: User,
  nickname: string,
): Promise<string> {
  const trimmed = nickname.trim()

  if (trimmed.length < MIN_NICKNAME_LEN) {
    throw new Error(`닉네임은 ${MIN_NICKNAME_LEN}자 이상이어야 해요`)
  }

  if (trimmed.length > MAX_NICKNAME_LEN) {
    throw new Error(`닉네임은 ${MAX_NICKNAME_LEN}자 이하여야 해요`)
  }

  await updateDoc(getUserProfileRef(user.uid), {
    nickname: trimmed,
    updatedAt: serverTimestamp(),
  })

  return trimmed
}

export async function updateMbti(
  user: User,
  mbti: string | null,
): Promise<string | null> {
  const normalized = mbti?.trim().toUpperCase() || null

  await updateDoc(getUserProfileRef(user.uid), {
    mbti: normalized,
    updatedAt: serverTimestamp(),
  })

  return normalized
}

export async function updateDisplayName(
  user: User,
  displayName: string,
): Promise<void> {
  await updateNickname(user, displayName)
}

export async function setSchoolEmailVerified(
  user: User,
  schoolEmail: string,
): Promise<void> {
  await updateDoc(getUserProfileRef(user.uid), {
    schoolEmail,
    schoolEmailVerified: true,
    updatedAt: serverTimestamp(),
  })
}

export async function clearSchoolEmailVerification(user: User): Promise<void> {
  await updateDoc(getUserProfileRef(user.uid), {
    schoolEmail: null,
    schoolEmailVerified: false,
    verifiedSchoolId: null,
    verifiedSchoolName: null,
    updatedAt: serverTimestamp(),
  })
}

export async function setPhoneVerified(
  user: User,
  phone: string,
): Promise<void> {
  await updateDoc(getUserProfileRef(user.uid), {
    phone,
    phoneVerified: true,
    updatedAt: serverTimestamp(),
  })
}

export async function clearPhoneVerification(user: User): Promise<void> {
  await updateDoc(getUserProfileRef(user.uid), {
    phone: null,
    phoneVerified: false,
    updatedAt: serverTimestamp(),
  })
}

type OtpChannel = 'school' | 'phone'

export async function reserveOtpSend(
  user: User,
  channel: OtpChannel,
  opts: {
    dailyMax: number
    cooldownMs: number
  },
): Promise<{ remainingToday: number }> {
  const profile = await ensureUserProfile(user)
  const now = Date.now()
  const dayKey = new Date(now).toISOString().slice(0, 10)
  const quota = profile.otpQuota ?? {
    dayKey,
    schoolSendCount: 0,
    phoneSendCount: 0,
    schoolLastSentAt: 0,
    phoneLastSentAt: 0,
  }

  const nextQuota =
    quota.dayKey === dayKey
      ? { ...quota }
      : {
          dayKey,
          schoolSendCount: 0,
          phoneSendCount: 0,
          schoolLastSentAt: 0,
          phoneLastSentAt: 0,
        }

  const countKey =
    channel === 'school' ? 'schoolSendCount' : 'phoneSendCount'
  const lastSentKey =
    channel === 'school' ? 'schoolLastSentAt' : 'phoneLastSentAt'

  const lastSentAt = nextQuota[lastSentKey]
  if (lastSentAt && now - lastSentAt < opts.cooldownMs) {
    const remainSec = Math.ceil((opts.cooldownMs - (now - lastSentAt)) / 1000)
    throw new Error(`${remainSec}초 후에 다시 시도해 주세요`)
  }

  if (nextQuota[countKey] >= opts.dailyMax) {
    throw new Error('오늘 인증 요청 횟수를 모두 사용했어요')
  }

  nextQuota[countKey] += 1
  nextQuota[lastSentKey] = now

  await updateDoc(getUserProfileRef(user.uid), {
    otpQuota: nextQuota,
    updatedAt: serverTimestamp(),
  })

  return {
    remainingToday: Math.max(0, opts.dailyMax - nextQuota[countKey]),
  }
}

export async function rollbackOtpSend(
  user: User,
  channel: OtpChannel,
): Promise<void> {
  const profile = await getUserProfile(user.uid)
  if (!profile?.otpQuota) return

  const nextQuota = { ...profile.otpQuota }
  const countKey =
    channel === 'school' ? 'schoolSendCount' : 'phoneSendCount'

  nextQuota[countKey] = Math.max(0, nextQuota[countKey] - 1)

  await updateDoc(getUserProfileRef(user.uid), {
    otpQuota: nextQuota,
    updatedAt: serverTimestamp(),
  })
}
