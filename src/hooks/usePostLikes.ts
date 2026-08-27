'use client'

import { useMemo, useSyncExternalStore } from 'react'

import {
  getLikedEntries,
  subscribePostLikes,
  togglePostLike,
  type PostLikeEntry,
  type PostLikeKind,
} from '@lib/utils/postLikes'

function getSnapshot() {
  return JSON.stringify(getLikedEntries())
}

function getServerSnapshot() {
  return '[]'
}

export function usePostLikes() {
  const snapshot = useSyncExternalStore(
    subscribePostLikes,
    getSnapshot,
    getServerSnapshot,
  )
  const likedEntries = useMemo(() => {
    try {
      const parsed = JSON.parse(snapshot) as PostLikeEntry[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [snapshot])

  return {
    likedEntries,
    isLiked: (target: Pick<PostLikeEntry, 'kind' | 'id'>) =>
      likedEntries.some(
        (entry) => entry.kind === target.kind && entry.id === target.id,
      ),
    toggleLike: (entry: PostLikeEntry) => togglePostLike(entry),
  }
}

export function usePostLike(target: {
  kind: PostLikeKind
  id: string
  boardId?: string
}) {
  const { isLiked, toggleLike } = usePostLikes()

  return {
    liked: isLiked(target),
    toggle: () => {
      toggleLike({
        kind: target.kind,
        id: target.id,
        boardId: target.boardId,
      })
    },
  }
}
