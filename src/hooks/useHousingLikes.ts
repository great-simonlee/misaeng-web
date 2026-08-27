'use client'

import { useMemo } from 'react'

import { usePostLikes } from '@hooks/usePostLikes'

export function useHousingLikes() {
  const { likedEntries, isLiked, toggleLike } = usePostLikes()
  const likedIds = useMemo(
    () =>
      likedEntries
        .filter((entry) => entry.kind === 'housing')
        .map((entry) => entry.id),
    [likedEntries],
  )

  return {
    likedIds,
    isLiked: (postId: string) => isLiked({ kind: 'housing', id: postId }),
    toggleLike: (postId: string) =>
      toggleLike({ kind: 'housing', id: postId }),
  }
}

export function useHousingLike(postId: string) {
  const { isLiked, toggleLike } = useHousingLikes()

  return {
    liked: isLiked(postId),
    toggle: () => {
      toggleLike(postId)
    },
  }
}
