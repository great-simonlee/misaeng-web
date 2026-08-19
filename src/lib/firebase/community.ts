import type {
  CommunityBoardId,
  CommunityPost,
  CommunityPostInput,
} from '@/types/nyc'

// 임시: 파이어베이스 Community 연동 비활성화
// import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore'
// import { getFirebaseDb } from './client'

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export async function listCommunityPosts(
  _categoryId: CommunityBoardId,
): Promise<CommunityPost[]> {
  return []
}

export async function listCommunityPostsByAuthor(
  _authorUid: string,
): Promise<CommunityPost[]> {
  return []
}

export async function getCommunityPost(
  _id: string,
): Promise<CommunityPost | null> {
  return null
}

export async function createCommunityPost(
  _input: CommunityPostInput,
  _authorUid: string,
  _authorEmail: string,
  _authorSchool?: { id: string | null; name: string | null },
): Promise<string> {
  throw new Error(DISABLED_MESSAGE)
}

export async function closeCommunityPost(_id: string): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}
