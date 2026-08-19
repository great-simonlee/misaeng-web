import type { User } from 'firebase/auth'

// 임시: 파이어베이스 Verification 연동 비활성화
// import { send } from '@emailjs/browser'
// import { PhoneAuthProvider, RecaptchaVerifier, linkWithCredential, linkWithPhoneNumber, type ConfirmationResult, type User } from 'firebase/auth'
// import { getFirebaseAuth } from './client'
// import { getUserProfile, reserveOtpSend, rollbackOtpSend, setPhoneVerified, setSchoolEmailVerified } from './profile'

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export async function sendSchoolEmailOtp(
  _user: User,
  _schoolEmail: string,
): Promise<{ devCode?: string }> {
  throw new Error(DISABLED_MESSAGE)
}

export async function confirmSchoolEmailOtp(
  _user: User,
  _code: string,
): Promise<{
  email: string
  schoolId: string | null
  schoolName: string | null
}> {
  throw new Error(DISABLED_MESSAGE)
}

export function clearPendingSchoolOtp() {
  return
}

export async function sendPhoneOtp(
  _user: User,
  _phoneE164: string,
  _recaptchaContainerId = 'nyc-phone-recaptcha',
): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}

export async function confirmPhoneOtp(
  _user: User,
  _smsCode: string,
  _phoneE164: string,
): Promise<string> {
  throw new Error(DISABLED_MESSAGE)
}

export function resetPhoneVerification() {
  return
}
