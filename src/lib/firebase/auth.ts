import type { User } from 'firebase/auth'

// 임시: 파이어베이스 Auth 연동 비활성화
// import {
//   GoogleAuthProvider,
//   createUserWithEmailAndPassword,
//   onAuthStateChanged,
//   sendPasswordResetEmail,
//   signInWithEmailAndPassword,
//   signInWithPopup,
//   signOut,
//   type User,
// } from 'firebase/auth'
// import { getFirebaseAuth, isFirebaseConfigured } from './client'
//
// const googleProvider = new GoogleAuthProvider()

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export function subscribeToAuth(callback: (user: User | null) => void) {
  callback(null)
  return () => {}
}

export async function signUpWithEmail(_email: string, _password: string) {
  throw new Error(DISABLED_MESSAGE)
}

export async function signInWithEmail(_email: string, _password: string) {
  throw new Error(DISABLED_MESSAGE)
}

export async function signInWithGoogle() {
  throw new Error(DISABLED_MESSAGE)
}

export async function sendPasswordReset(_email: string) {
  throw new Error(DISABLED_MESSAGE)
}

export async function signOutUser() {
  return
}

/*
export function subscribeToAuth(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured()) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(getFirebaseAuth(), callback)
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function signInWithGoogle() {
  return signInWithPopup(getFirebaseAuth(), googleProvider)
}

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(getFirebaseAuth(), email)
}

export async function signOutUser() {
  return signOut(getFirebaseAuth())
}
*/
