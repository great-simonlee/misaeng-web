import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

/**
 * Ellieo AppConnect와 동일한 Firebase 프로젝트(ellieo-resource-management)로
 * Google 로그인 → getIdToken() → auth/login/google 연동
 */
const ellieoFirebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_ELLIEO_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_ELLIEO_FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_ELLIEO_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_ELLIEO_FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_ELLIEO_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    process.env.NEXT_PUBLIC_ELLIEO_FIREBASE_APP_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const ELLIEO_FIREBASE_APP_NAME = 'ellieo-auth'

export function isEllieoFirebaseConfigured(): boolean {
  return Boolean(
    ellieoFirebaseConfig.apiKey &&
      ellieoFirebaseConfig.authDomain &&
      ellieoFirebaseConfig.projectId &&
      ellieoFirebaseConfig.appId,
  )
}

let ellieoApp: FirebaseApp | undefined
let ellieoAuth: Auth | undefined

export function getEllieoFirebaseApp(): FirebaseApp {
  if (!isEllieoFirebaseConfigured()) {
    throw new Error(
      'Ellieo Firebase가 설정되지 않았습니다. ellieo-erp와 동일한 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_ELLIEO_FIREBASE_* 값을 넣어 주세요.',
    )
  }

  const existing = getApps().find((app) => app.name === ELLIEO_FIREBASE_APP_NAME)
  if (existing) {
    ellieoApp = existing
    return existing
  }

  if (!ellieoApp) {
    ellieoApp = initializeApp(ellieoFirebaseConfig, ELLIEO_FIREBASE_APP_NAME)
  }

  return ellieoApp
}

export function getEllieoFirebaseAuth(): Auth {
  if (!ellieoAuth) {
    ellieoAuth = getAuth(getEllieoFirebaseApp())
  }

  return ellieoAuth
}

export function createEllieoGoogleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}
