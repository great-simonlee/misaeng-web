// 임시: 파이어베이스 연동 비활성화
// import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
// import { getAuth, type Auth } from 'firebase/auth'
// import { getFirestore, type Firestore } from 'firebase/firestore'
// import { getStorage, type FirebaseStorage } from 'firebase/storage'

const FIREBASE_ENABLED = false

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  if (!FIREBASE_ENABLED) return false
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  )
}

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export function getFirebaseApp(): never {
  throw new Error(DISABLED_MESSAGE)
}

export function getFirebaseAuth(): never {
  throw new Error(DISABLED_MESSAGE)
}

export function getFirebaseDb(): never {
  throw new Error(DISABLED_MESSAGE)
}

export function getFirebaseStorage(): never {
  throw new Error(DISABLED_MESSAGE)
}

/*
let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_FIREBASE_* 값을 넣어 주세요.',
    )
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }
  return db
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp())
  }
  return storage
}
*/
